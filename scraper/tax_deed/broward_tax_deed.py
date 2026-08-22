#!/usr/bin/env python3
"""Fetch upcoming Broward County tax deed parcels from official public reports."""

from __future__ import annotations

import argparse
import json
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

from shared import HEADERS, base_property, centroid, money, property_type

OFFICIAL_URL = "https://county-taxes.net/broward/reports/real-estate"
AUCTION_URL = "https://broward.realtaxdeed.com"
PARCEL_LAYER = "https://gisweb-adapters.bcpa.net/arcgis/rest/services/BCPA_EXTERNAL_JAN26/MapServer/16"
REPORT_TITLE = re.compile(
    r"\b([A-Z]+)\s+(\d{1,2}),?\s+(\d{4}),?\s+TAX\s+DEED\s+AUCTION\b",
    re.IGNORECASE,
)


def report_sale_date(title: str) -> date | None:
    """Read the sale date from a named Broward Tax Collector report."""
    match = REPORT_TITLE.search(re.sub(r"\s+", " ", title).strip())
    if not match:
        return None
    try:
        return datetime.strptime(
            f"{match.group(1).title()} {match.group(2)} {match.group(3)}",
            "%B %d %Y",
        ).date()
    except ValueError:
        return None


def _report_listing(row: dict[str, str]) -> dict[str, Any] | None:
    application_number = row.get("Deed Application #", "").strip()
    parcel_id = row.get("Account Number", "").strip()
    raw_sale_date = row.get("Deed Sale Date", "").strip()
    if not application_number or not parcel_id or not raw_sale_date:
        return None
    if row.get("Deed Status", "").strip().lower() != "certified":
        return None
    try:
        auction_date = datetime.strptime(raw_sale_date, "%m/%d/%Y").date().isoformat()
    except ValueError:
        return None

    tax_year = row.get("Tax Yr", "").strip()
    owner_name = row.get("Owner Name", "").strip()
    listing = base_property(
        property_id=f"broward-tax-deed-{application_number.lower()}",
        address=f"Parcel {parcel_id}",
        city="Broward County",
        county="Broward",
        price=0,
        auction_date=auction_date,
        source="Broward Tax Collector Tax Deed Report",
        source_url=OFFICIAL_URL,
        description=(
            f"Official certified Broward Tax Deed application {application_number}"
            f"{f' for tax year {tax_year}' if tax_year else ''}. "
            f"Bid through the county auction portal at {AUCTION_URL}. "
            "The opening bid is not published in this report; verify it before bidding."
        ),
        case_number=application_number,
        parcel_id=parcel_id,
        owner_name=owner_name,
        deposit_required=0,
    )
    listing.update({
        "openingBid": None,
        "depositRequired": None,
        "taxAmount": 0,
    })
    return listing


def _future_report_rows(today: date) -> list[dict[str, str]]:
    """Render Grant Street's public report app and return every future certified row."""
    rows: list[dict[str, str]] = []
    with sync_playwright() as playwright:
        # Grant Street's public report is protected by a browser integrity check.
        # CI supplies a private virtual display so this remains fully unattended.
        browser = playwright.chromium.launch(channel="chrome", headless=False)
        context = browser.new_context(
            locale="en-US",
            viewport={"width": 1440, "height": 1000},
        )
        page = context.new_page()
        try:
            page.goto(OFFICIAL_URL, wait_until="domcontentloaded", timeout=90_000)
            page.wait_for_selector('iframe[src*="iframe-taxsys"]', timeout=90_000)
            frame = page.frame(url=re.compile(r"/iframe-taxsys/"))
            if frame is None:
                raise RuntimeError("Broward public report frame did not load")
            frame.wait_for_selector(
                "#selected-report-filter-menu .dropdown-item",
                state="attached",
                timeout=90_000,
            )
            reports = frame.locator("#selected-report-filter-menu .dropdown-item").evaluate_all(
                """elements => elements.map(element => ({
                    id: element.id,
                    title: element.textContent.trim()
                }))"""
            )
            future_reports = sorted(
                (
                    (sale_date, str(report["id"]), str(report["title"]))
                    for report in reports
                    if (sale_date := report_sale_date(str(report["title"]))) is not None
                    and sale_date >= today
                ),
                key=lambda item: (item[0], item[1]),
            )
            if not future_reports:
                raise RuntimeError("Broward published no future Tax Deed Auction reports")

            for sale_date, report_id, title in future_reports:
                frame.evaluate(
                    """({ reportId, title }) => {
                        const report = document.getElementById(reportId);
                        if (!report) throw new Error(`Report ${reportId} is unavailable`);
                        document.querySelectorAll('#selected-report-filter-menu .dropdown-item')
                            .forEach(element => element.classList.remove('active'));
                        report.classList.add('active');
                        document.querySelector('#selected_report').value = reportId;
                        document.querySelector('#selected-report-filter').value = title;
                        window.view_report();
                    }""",
                    {"reportId": report_id, "title": title},
                )
                expected_dates = [
                    f"{sale_date.month}/{sale_date.day}/{str(sale_date.year)[2:]}",
                    f"{sale_date.month}/{sale_date.day}/{sale_date.year}",
                ]
                frame.wait_for_function(
                    "expected => expected.includes(document.querySelector('#deed_sale_date')?.value)",
                    arg=expected_dates,
                    timeout=60_000,
                )
                frame.locator("#rows_per_page").evaluate("element => { element.value = '1000'; }")
                with page.expect_response(
                    lambda response: response.url.endswith("/report_results")
                    and response.request.method == "POST",
                    timeout=90_000,
                ) as response_info:
                    frame.locator("#run-search").click()
                if not response_info.value.ok:
                    raise RuntimeError(f"Broward report {report_id} search failed")
                frame.wait_for_function(
                    """() => {
                        const results = document.querySelector('#report_results__results');
                        const hasRows = results && [...results.querySelectorAll('tr')]
                            .some(row => row.querySelectorAll('td').length > 3);
                        return hasRows || document.body.innerText.includes('0 search results found');
                    }""",
                    timeout=90_000,
                )
                result_body = frame.locator("#report_results__results")
                if result_body.count() == 0:
                    continue
                table = result_body.locator("xpath=ancestor::table")
                headers = table.locator("thead th").evaluate_all(
                    "elements => elements.map(element => element.textContent.trim())"
                )
                for values in result_body.locator("tr").evaluate_all(
                    "rows => rows.map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent.trim()))"
                ):
                    rows.append(dict(zip(headers, values)))
        finally:
            context.close()
            browser.close()
    return rows


def _field_after_label(soup: BeautifulSoup, label: str) -> str:
    normalized_label = re.sub(r"[^a-z0-9]", "", label.lower())
    for cell in soup.find_all("td"):
        cell_label = re.sub(r"[^a-z0-9]", "", cell.get_text(" ", strip=True).lower())
        if cell_label != normalized_label:
            continue
        value_cell = cell.find_next_sibling("td")
        if value_cell:
            return re.sub(r"\s+", " ", value_cell.get_text(" ", strip=True)).strip()
    return ""


def parse_appraiser_record(html: str) -> dict[str, Any]:
    """Extract stable public assessor fields without depending on visual layout."""
    soup = BeautifulSoup(html, "html.parser")
    raw_address = _field_after_label(soup, "Property Address")
    legal = _field_after_label(soup, "Abbreviated Legal Description")
    address = raw_address
    city = "Broward County"
    zip_code = ""
    match = re.match(r"^(.*?),\s*([^,]+?)\s+FL\s+(\d{5}(?:-\d{4})?)$", raw_address, re.I)
    if match:
        address, city, zip_code = (value.strip() for value in match.groups())

    market_value = 0.0
    assessed_value = 0.0
    for table in soup.find_all("table"):
        if "Property Assessment Values" not in table.get_text(" ", strip=True):
            continue
        for row in table.find_all("tr"):
            values = [
                re.sub(r"\s+", " ", cell.get_text(" ", strip=True))
                for cell in row.find_all("td", recursive=False)
            ]
            if len(values) >= 5 and re.fullmatch(r"20\d{2}", values[0]):
                market_value = money(values[3])
                assessed_value = money(values[4])
                break
        if market_value or assessed_value:
            break
    return {
        "address": address,
        "city": city,
        "zip": zip_code,
        "legal": legal,
        "marketValue": market_value,
        "assessedValue": assessed_value,
    }


def _enrich_from_appraiser(session: requests.Session, properties: list[dict[str, Any]]) -> None:
    searchable_folios = {
        str(listing["parcelId"]).replace("-", ""): listing
        for listing in properties
        if str(listing["parcelId"]).replace("-", "").isalnum()
    }
    folios = list(searchable_folios)
    for start in range(0, len(folios), 25):
        batch = folios[start:start + 25]
        try:
            response = session.post(
                f"{PARCEL_LAYER}/query",
                data={
                    "f": "json",
                    "where": "FOLIO IN ({})".format(",".join(f"'{folio}'" for folio in batch)),
                    "outFields": "FOLIO",
                    "returnGeometry": "true",
                    "outSR": "4326",
                },
                timeout=60,
            )
            response.raise_for_status()
            for feature in response.json().get("features", []):
                folio = str(feature.get("attributes", {}).get("FOLIO", ""))
                listing = searchable_folios.get(folio)
                if listing:
                    listing["latitude"], listing["longitude"] = centroid(feature.get("geometry"))
        except (requests.RequestException, ValueError):
            print("Broward parcel map enrichment failed; address links remain available.")

    for folio, listing in searchable_folios.items():
        try:
            session.cookies.clear()
            record = session.get(f"https://bcpa.net/RecInfo.asp?URL_Folio={folio}", timeout=30)
            record.raise_for_status()
            details = parse_appraiser_record(record.text)
            if details["address"]:
                listing["address"] = details["address"]
                listing["city"] = details["city"]
                listing["zip"] = details["zip"]
            listing["propertyType"] = property_type(str(details["legal"]))
            listing["assessedValue"] = details["assessedValue"]
            listing["estimatedValue"] = details["marketValue"]
            listing["valuationVerified"] = bool(details["marketValue"] or details["assessedValue"])

            photographs = session.get(f"https://bcpa.net/Photographs.asp?Folio={folio}", timeout=30)
            photographs.raise_for_status()
            photograph_soup = BeautifulSoup(photographs.text, "html.parser")
            images = [
                urljoin(photographs.url, image.get("src", ""))
                for image in photograph_soup.select('img[src*="/Photographs/"]')
            ]
            if images:
                listing["imageUrl"] = images[0]
                listing["images"] = images
        except requests.RequestException as exc:
            print(f"Broward appraiser enrichment failed for folio {folio}: {exc}")


def fetch_upcoming(today: date | None = None) -> list[dict[str, Any]]:
    today = today or date.today()
    properties: dict[str, dict[str, Any]] = {}
    for row in _future_report_rows(today):
        listing = _report_listing(row)
        if listing and listing["auctionDate"] >= today.isoformat():
            properties[listing["id"]] = listing
    if not properties:
        raise RuntimeError("Broward public reports returned no certified future parcels")

    session = requests.Session()
    session.headers.update(HEADERS)
    records = list(properties.values())
    _enrich_from_appraiser(session, records)
    return sorted(records, key=lambda item: (item["auctionDate"], item["id"]))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="src/data/tax_deed_properties.json")
    args = parser.parse_args()
    properties = fetch_upcoming()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(properties, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(properties)} upcoming Broward tax deed parcels to {output}")


if __name__ == "__main__":
    main()

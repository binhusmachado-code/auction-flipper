#!/usr/bin/env python3
"""Fetch New Mexico Property Tax Division delinquent-property auction notices."""

from __future__ import annotations

import io
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta
from typing import Any

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

from shared import HEADERS, base_property, money


AUCTIONS_URL = "https://www.tax.newmexico.gov/businesses/property-tax-overview/delinquent-property-tax-auctions/"
SOURCE_NAME = "New Mexico Property Tax Division Delinquent Property Auction"
NEW_MEXICO_WARNING = (
    " New Mexico warrants no title. Other liens may survive, a property may be withdrawn or "
    "re-offered, and some properties may be subject to a 120-day federal redemption period. "
    "Successful bidders must pay in full before the auction concludes."
)


class NewMexicoAuctionError(RuntimeError):
    """Raised when the official statewide notice set cannot be refreshed completely."""


def parse_auction_links(
    html: str,
    today: date | None = None,
    horizon_days: int = 370,
) -> list[tuple[str, str, str]]:
    """Return county, ISO date, and official PDF for future auction notices."""
    today = today or date.today()
    last_day = today + timedelta(days=horizon_days)
    soup = BeautifulSoup(html, "html.parser")
    notices: dict[tuple[str, str], str] = {}
    for link in soup.find_all("a", href=True):
        href = str(link["href"])
        if ".pdf" not in href.lower() or "tax.newmexico.gov" not in href:
            continue
        county_match = re.fullmatch(r"([A-Za-z][A-Za-z ]+ County)", link.get_text(" ", strip=True))
        if not county_match:
            continue
        date_match = None
        container = link
        for _ in range(4):
            container = container.parent
            if container is None:
                break
            text = re.sub(r"\s+", " ", container.get_text(" ", strip=True))
            date_match = re.search(r"\d{1,2}/\d{1,2}/\d{4}", text)
            if date_match:
                break
        if not date_match:
            continue
        sale_date = datetime.strptime(date_match.group(0), "%m/%d/%Y").date()
        if not today <= sale_date <= last_day:
            continue
        county = county_match.group(1).removesuffix(" County").strip().title()
        notices[(sale_date.isoformat(), county)] = href
    return [
        (county, sale_date, notices[(sale_date, county)])
        for sale_date, county in sorted(notices)
    ]


def _clean_field(value: str) -> str:
    value = re.sub(r"\bItem #\d+\b.*?Amount\s*\$[_\s]+", " ", value, flags=re.DOTALL)
    return re.sub(r"\s+", " ", value).strip(" .")


def parse_notice_text(
    text: str,
    *,
    county: str,
    auction_date: str,
    source_url: str,
) -> list[dict[str, Any]]:
    """Normalize the labeled case blocks extracted from one official auction PDF."""
    pattern = re.compile(
        r"Case:\s*(?P<case>\d+)(?P<status>[^\n]*)\s+"
        r"UPC:\s*(?P<upc>[^\n]+)\s+"
        r"Account:\s*(?P<account>[^\n]+)\s+"
        r"Delinquent Owner:\s*(?P<owner>.*?)\s+"
        r"Simple Description:\s*(?P<simple>.*?)\s+"
        r"Minimum Bid:\s*\$(?P<bid>[\d,]+(?:\.\d{2})?)\s+"
        r"Property Description:\s*(?P<legal>.*?)(?=\s+Case:\s*\d+|\Z)",
        re.DOTALL,
    )
    records: list[dict[str, Any]] = []
    for match in pattern.finditer(text):
        if "REMOVED" in match.group("status").upper():
            continue
        case_number = match.group("case")
        upc = _clean_field(match.group("upc"))
        account = _clean_field(match.group("account"))
        owner_name = _clean_field(match.group("owner"))
        simple_description = _clean_field(match.group("simple"))
        legal_description = _clean_field(match.group("legal"))
        minimum_bid = money(match.group("bid"))
        if not upc or minimum_bid <= 0:
            continue

        county_slug = re.sub(r"[^a-z0-9]+", "-", county.lower()).strip("-")
        description = (
            f"Official New Mexico delinquent-property auction case {case_number}. "
            f"Minimum bid: ${minimum_bid:,.2f}. Account: {account or 'Not listed.'} "
            f"Location description: {simple_description or 'Not listed.'} "
            f"Property description: {legal_description or 'Not listed.'}"
        )
        record = base_property(
            property_id=f"new-mexico-tax-deed-{county_slug}-{case_number}",
            address="",
            city=f"{county} County",
            county=county,
            price=minimum_bid,
            auction_date=auction_date,
            source=SOURCE_NAME,
            source_url=source_url,
            description=description,
            case_number=case_number,
            parcel_id=upc,
            owner_name=owner_name,
            deposit_required=0,
            state="NM",
        )
        record["notes"] += NEW_MEXICO_WARNING
        records.append(record)
    return records


def _fetch_notice(county: str, auction_date: str, source_url: str) -> list[dict[str, Any]]:
    response = requests.get(source_url, headers=HEADERS, timeout=60)
    response.raise_for_status()
    reader = PdfReader(io.BytesIO(response.content))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    if "Case:" not in text or "Minimum Bid:" not in text:
        raise NewMexicoAuctionError(f"{county} returned an unrecognized auction notice")
    records = parse_notice_text(
        text,
        county=county,
        auction_date=auction_date,
        source_url=source_url,
    )
    return records


def fetch_upcoming(today: date | None = None) -> list[dict[str, Any]]:
    """Fetch every future New Mexico county notice currently posted by the state."""
    today = today or date.today()
    response = requests.get(AUCTIONS_URL, headers=HEADERS, timeout=45)
    response.raise_for_status()
    notices = parse_auction_links(response.text, today=today)
    if not notices:
        raise NewMexicoAuctionError("New Mexico returned no future auction notices")

    records: list[dict[str, Any]] = []
    failures: list[str] = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(_fetch_notice, county, sale_date, url): county
            for county, sale_date, url in notices
        }
        for future in as_completed(futures):
            county = futures[future]
            try:
                records.extend(future.result())
            except (requests.RequestException, ValueError, NewMexicoAuctionError) as exc:
                failures.append(f"{county}: {exc}")
    if failures:
        raise NewMexicoAuctionError("; ".join(sorted(failures)))
    if len(records) != len({record["id"] for record in records}):
        raise NewMexicoAuctionError("New Mexico returned duplicate case IDs")
    return sorted(records, key=lambda item: (item["auctionDate"], item["county"], item["id"]))

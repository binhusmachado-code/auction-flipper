from __future__ import annotations

import unittest

from adams_county import build_listing, discover_county_held_pdf, parse_county_held_lien_text
from refresh_tax_liens import merge_existing_enrichment


class AdamsCountyTaxLienTests(unittest.TestCase):
    def test_official_pdf_rows_are_parsed_without_non_real_accounts(self) -> None:
        text = """
        AccountId TaxYear Balance AccountId TaxYear Balance
        R0151839 2021 $34.00 M0002958 2022 $215.45
        R0207373 2021 $27,924.83 R0151839 2021 $34.00
        """
        self.assertEqual(parse_county_held_lien_text(text), [
            {"accountId": "R0151839", "taxYear": 2021, "balance": 34.0},
            {"accountId": "R0207373", "taxYear": 2021, "balance": 27924.83},
        ])

    def test_current_document_link_is_discovered_from_county_page(self) -> None:
        html = '<a href="/documents/current.pdf">County Held Lien List</a>'
        self.assertEqual(
            discover_county_held_pdf(html),
            "https://adamscountyco.gov/documents/current.pdf",
        )

    def test_listing_uses_only_official_balance_and_assessor_values(self) -> None:
        listing = build_listing(
            {"accountId": "R0008422", "taxYear": 2023, "balance": 110.78},
            {
                "parcelnb": "0157110014001", "acttotalval": 196541,
                "asdtotalval": 51100, "lotsize": 6.742, "accttype": "Exempt", "vacimp": "I",
            },
            {
                "attributes": {
                    "PARCELNB": "0157110014001", "concataddr1": "9910 E 157TH AVE",
                    "concataddr2": "BRIGHTON CO 80601", "loccity": "BRIGHTON", "loczip": "80601",
                    "ownernamefull": "EXAMPLE OWNER", "legal": "EXAMPLE LEGAL",
                },
                "centroid": {"x": -104.8714, "y": 39.98},
            },
            "2026-07-23",
        )
        self.assertEqual(listing["price"], 110.78)
        self.assertEqual(listing["estimatedValue"], 196541)
        self.assertEqual(listing["assessedValue"], 51100)
        self.assertEqual(listing["interestRate"], 0)
        self.assertEqual(listing["redemptionPeriod"], 0)
        self.assertIn("Confirm availability", listing["notes"])

    def test_last_verified_enrichment_is_kept_when_assessor_is_unavailable(self) -> None:
        fresh = {
            "address": "Account R0008422", "city": "Adams County", "zip": "", "parcelId": "",
            "ownerName": "", "imageUrl": "", "images": [], "latitude": 0, "longitude": 0,
            "lotSize": None, "propertyType": "Unknown", "assessedValue": 0, "estimatedValue": 0,
            "arv": 0, "valuationVerified": False, "description": "Current balance is $110.78.",
        }
        existing = {
            "address": "9910 E 157TH AVE", "city": "Brighton", "zip": "80601",
            "parcelId": "0157110014001", "latitude": 39.98, "longitude": -104.87,
            "assessedValue": 51100, "estimatedValue": 196541, "valuationVerified": True,
            "description": "Old balance. Legal description: EXAMPLE LEGAL.",
        }
        merged = merge_existing_enrichment(fresh, existing)
        self.assertEqual(merged["address"], "9910 E 157TH AVE")
        self.assertEqual(merged["parcelId"], "0157110014001")
        self.assertEqual(merged["estimatedValue"], 196541)
        self.assertIn("EXAMPLE LEGAL", merged["description"])


if __name__ == "__main__":
    unittest.main()

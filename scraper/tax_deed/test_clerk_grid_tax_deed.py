from __future__ import annotations

import unittest
from datetime import date

from clerk_grid_tax_deed import parse_detail, parse_grid_rows, parse_palm_beach_appraiser, parse_sale_dates


class ClerkGridTaxDeedTests(unittest.TestCase):
    def test_sale_dates_are_future_and_inside_refresh_window(self) -> None:
        html = """
        <select id="SearchSaleDateFrom">
          <option value="Wednesday, April 14, 2027 9:00 AM">04/14/2027</option>
          <option value="Wednesday, September 16, 2026 9:00 AM">09/16/2026</option>
          <option value="Wednesday, July 15, 2026 9:00 AM">07/15/2026</option>
        </select>
        """

        dates = parse_sale_dates(html, today=date(2026, 8, 21), horizon_days=180)

        self.assertEqual(
            dates,
            [("Wednesday, September 16, 2026 9:00 AM", "2026-09-16")],
        )

    def test_grid_rows_keep_only_open_sales(self) -> None:
        payload = {
            "rows": [
                {
                    "id": "5197",
                    "cell": [
                        "Applicant LLC", "2026-TD-0001", "2024/100", "012345-0000",
                        "09/16/2026", "SALE", "$35,705.11", "", "", "Owner Name",
                    ],
                },
                {
                    "id": "5198",
                    "cell": [
                        "Applicant LLC", "2026-TD-0002", "2024/101", "012345-0001",
                        "09/16/2026", "REDEEMED", "$8,000.00", "", "", "Other Owner",
                    ],
                },
            ]
        }

        rows = parse_grid_rows(payload)

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["detail_id"], "5197")
        self.assertEqual(rows[0]["case_number"], "2026-TD-0001")
        self.assertEqual(rows[0]["parcel_id"], "012345-0000")
        self.assertEqual(rows[0]["opening_bid"], 35705.11)

    def test_detail_page_extracts_official_property_fields(self) -> None:
        html = """
        <table>
          <tr><th>Case Number</th><td>2026-TD-0001</td></tr>
          <tr><th>Certificate Number</th><td>2024/100</td></tr>
          <tr><th>Parcel ID</th><td>012345-0000</td></tr>
          <tr><th>Legal Description</th><td>LOT 7 TEST SUBDIVISION</td></tr>
          <tr><th>Property Owners</th><td>Owner Name</td></tr>
          <tr><th>Property Address</th><td>101 MAIN ST, JACKSONVILLE, FL 32202</td></tr>
          <tr><th>Assessed As</th><td>SINGLE FAMILY</td></tr>
          <tr><th>Opening Bid</th><td>$35,705.11</td></tr>
        </table>
        """

        detail = parse_detail(html)

        self.assertEqual(detail["address"], "101 MAIN ST, JACKSONVILLE, FL 32202")
        self.assertEqual(detail["legal_description"], "LOT 7 TEST SUBDIVISION")
        self.assertEqual(detail["owner_name"], "Owner Name")
        self.assertEqual(detail["assessed_as"], "SINGLE FAMILY")
        self.assertEqual(detail["opening_bid"], 35705.11)

    def test_palm_beach_appraiser_enriches_missing_auction_fields(self) -> None:
        html = """
        <table>
          <tr><td class="label">Location Address</td><td>1400 N TAMARIND AVE</td></tr>
          <tr><td class="label">Municipality</td><td>WEST PALM BEACH</td></tr>
          <tr><td class="label">Property Use Code</td><td>0000—VACANT</td></tr>
          <tr><td class="label">Total Square Feet*</td><td>1,250</td></tr>
          <tr><td class="label">Acres</td><td>.14</td></tr>
          <tr><td>Assessed Value</td><td>$47,077</td><td>$42,797</td></tr>
        </table>
        """

        detail = parse_palm_beach_appraiser(html)

        self.assertEqual(detail["appraiser_address"], "1400 N TAMARIND AVE")
        self.assertEqual(detail["appraiser_city"], "WEST PALM BEACH")
        self.assertEqual(detail["appraiser_use"], "0000—VACANT")
        self.assertEqual(detail["sqft"], 1250)
        self.assertEqual(detail["lot_size"], 0.14)
        self.assertEqual(detail["assessed_value"], 47077)


if __name__ == "__main__":
    unittest.main()

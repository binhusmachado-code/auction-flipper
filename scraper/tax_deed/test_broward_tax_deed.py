from __future__ import annotations

import unittest
from datetime import date

from broward_tax_deed import _report_listing, parse_appraiser_record, report_sale_date


class BrowardTaxDeedTests(unittest.TestCase):
    def test_report_title_identifies_future_auction_date(self) -> None:
        self.assertEqual(
            report_sale_date("OCTOBER 26, 2026 TAX DEED AUCTION"),
            date(2026, 10, 26),
        )
        self.assertEqual(
            report_sale_date("NOVEMBER 19, 2025, TAX DEED AUCTION"),
            date(2025, 11, 19),
        )
        self.assertIsNone(report_sale_date("PUBLIC: CURRENT LAFT PROPERTIES"))

    def test_certified_report_row_is_normalized_without_inventing_a_bid(self) -> None:
        listing = _report_listing({
            "Deed Application #": "53487",
            "Deed Sale Date": "10/26/2026",
            "Deed Status": "Certified",
            "Tax Yr": "2017",
            "Account Number": "514116-02-0110",
            "Owner Name": "CRESTVIEW MGMT LLC",
        })

        self.assertIsNotNone(listing)
        assert listing is not None
        self.assertEqual(listing["id"], "broward-tax-deed-53487")
        self.assertEqual(listing["auctionDate"], "2026-10-26")
        self.assertEqual(listing["parcelId"], "514116-02-0110")
        self.assertEqual(listing["ownerName"], "CRESTVIEW MGMT LLC")
        self.assertIsNone(listing["openingBid"])
        self.assertIsNone(listing["depositRequired"])
        self.assertIn("not published", listing["description"])

    def test_noncertified_or_incomplete_report_row_is_ignored(self) -> None:
        self.assertIsNone(_report_listing({
            "Deed Application #": "1",
            "Deed Sale Date": "10/26/2026",
            "Deed Status": "Cancelled",
            "Account Number": "123",
        }))
        self.assertIsNone(_report_listing({"Deed Application #": "1"}))

    def test_property_appraiser_fields_are_extracted(self) -> None:
        html = """
        <table>
          <tr><td>Property Address</td><td>100 MAIN STREET, FORT LAUDERDALE FL 33301</td></tr>
          <tr><td>Property Owner</td><td>EXAMPLE OWNER</td></tr>
        </table>
        <table>
          <tr><td>Abbr<span>eviated</span> Legal Description</td><td>EXAMPLE CONDO UNIT 4</td></tr>
        </table>
        <table>
          <tr><td colspan="6">Property Assessment Values</td></tr>
          <tr><td>Year</td><td>Land</td><td>Building</td><td>Just / Market Value</td><td>Assessed</td></tr>
          <tr><td>2026</td><td>$50,000</td><td>$100,000</td><td>$150,000</td><td>$125,000</td></tr>
        </table>
        """

        details = parse_appraiser_record(html)

        self.assertEqual(details["address"], "100 MAIN STREET")
        self.assertEqual(details["city"], "FORT LAUDERDALE")
        self.assertEqual(details["zip"], "33301")
        self.assertEqual(details["legal"], "EXAMPLE CONDO UNIT 4")
        self.assertEqual(details["marketValue"], 150000)
        self.assertEqual(details["assessedValue"], 125000)


if __name__ == "__main__":
    unittest.main()

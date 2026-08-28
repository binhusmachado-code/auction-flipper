import unittest
from datetime import date

from new_mexico_tax_deed import parse_auction_links, parse_notice_text


AUCTION_PAGE = """
<p>Sandoval County 09/02/2026 @ 10:00AM <strong>
  <a href="https://www.tax.newmexico.gov/files/sandoval.pdf">Sandoval County</a>
</strong></p>
<strong>
  Catron County 08/27/2026 @ 10:00AM
  <a href="https://www.tax.newmexico.gov/files/catron.pdf">Catron County</a>
</strong>
"""

NOTICE_TEXT = """
Case: 31568 REMOVED
UPC: 1011073473496
Account: R010501
Delinquent Owner: OLGA J WOHLGEMUTH TRUST
Simple Description: IN RIO RANCHO OFF CAMPUS BLVD NE
Minimum Bid: $3,900.00
Property Description: Legal: Block 17 Lot 11
Case: 31574
UPC: 1013076431231
Account: R011328
Delinquent Owner: ANNE CLIFFORD, MICHAEL AMBROSIO
Simple Description: IN RIO RANCHO OFF VISALIA CT NE
Minimum Bid: $700.00
Property Description: Legal: Subd: RIO RANCHO ESTATES Block: 138 Lot: 3 Unit: 25
"""


class NewMexicoTaxDeedTests(unittest.TestCase):
    def test_auction_links_only_include_future_official_pdfs(self):
        links = parse_auction_links(AUCTION_PAGE, today=date(2026, 8, 28))

        self.assertEqual(links, [(
            "Sandoval",
            "2026-09-02",
            "https://www.tax.newmexico.gov/files/sandoval.pdf",
        )])

    def test_notice_parser_skips_removed_cases_and_preserves_minimum_bid(self):
        records = parse_notice_text(
            NOTICE_TEXT,
            county="Sandoval",
            auction_date="2026-09-02",
            source_url="https://www.tax.newmexico.gov/files/sandoval.pdf",
        )

        self.assertEqual(len(records), 1)
        record = records[0]
        self.assertEqual(record["id"], "new-mexico-tax-deed-sandoval-31574")
        self.assertEqual(record["state"], "NM")
        self.assertEqual(record["address"], "Parcel 1013076431231")
        self.assertEqual(record["openingBid"], 700)
        self.assertEqual(record["depositRequired"], 0)
        self.assertEqual(record["ownerName"], "ANNE CLIFFORD, MICHAEL AMBROSIO")
        self.assertIn("VISALIA CT NE", record["description"])
        self.assertIn("warrants no title", record["notes"])


if __name__ == "__main__":
    unittest.main()

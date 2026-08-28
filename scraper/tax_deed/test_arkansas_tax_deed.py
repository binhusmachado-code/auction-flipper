import unittest
from datetime import date

from arkansas_tax_deed import parse_catalog, parse_catalog_links


CONTENTS_HTML = """
<a aria-label="View Catalog for SALINE on 9/1/2026"
   href="/Home/CatalogView?county=SALI&amp;saledate=9%2F1%2F2026%2010%3A00%3A00%20AM">View Catalog</a>
<a aria-label="View Catalog for PULASKI on 7/9/2026"
   href="/Home/CatalogView?county=PULA&amp;saledate=7%2F9%2F2026%2010%3A00%3A00%20AM">View Catalog</a>
"""

CATALOG_HTML = """
<table id="tableAllCertifications">
  <thead><tr><th>Sale #</th><th>Name</th><th>Legal Description</th><th>Interested Parties</th><th>Parcel #</th><th>Taxes</th><th>Actions</th></tr></thead>
  <tbody>
    <tr><td>5407</td><td>PROPERTIES GROUP LLC</td><td>LOT 38 BLOCK RIVERSIDE HILLS</td><td>CROWS FIRE DISTRICT</td><td>272-00538-000</td><td>$1,091.25</td><td>DataScoutPro</td></tr>
    <tr><td>5408</td><td>ENTRY CANCELLED</td><td></td><td></td><td></td><td></td><td></td></tr>
  </tbody>
</table>
"""


class ArkansasTaxDeedTests(unittest.TestCase):
    def test_catalog_links_only_include_future_official_catalogs(self):
        links = parse_catalog_links(CONTENTS_HTML, today=date(2026, 8, 28))

        self.assertEqual(len(links), 1)
        self.assertEqual(links[0][0], "Saline")
        self.assertEqual(links[0][1], "2026-09-01")
        self.assertTrue(links[0][2].startswith("https://cosl.org/Home/CatalogView"))

    def test_catalog_records_use_tax_due_as_minimum_bid_and_skip_cancellations(self):
        records = parse_catalog(
            CATALOG_HTML,
            county="Saline",
            auction_date="2026-09-01",
            source_url="https://cosl.org/Home/CatalogView?county=SALI",
        )

        self.assertEqual(len(records), 1)
        record = records[0]
        self.assertEqual(record["id"], "arkansas-tax-deed-saline-5407")
        self.assertEqual(record["state"], "AR")
        self.assertEqual(record["county"], "Saline")
        self.assertEqual(record["address"], "Parcel 272-00538-000")
        self.assertEqual(record["openingBid"], 1091.25)
        self.assertEqual(record["depositRequired"], 0)
        self.assertEqual(record["ownerName"], "PROPERTIES GROUP LLC")
        self.assertIn("CROWS FIRE DISTRICT", record["description"])
        self.assertIn("Limited Warranty Deed", record["notes"])


if __name__ == "__main__":
    unittest.main()

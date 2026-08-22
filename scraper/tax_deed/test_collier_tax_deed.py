from __future__ import annotations

import unittest
from datetime import date

from collier_tax_deed import parse_notice


class CollierTaxDeedTests(unittest.TestCase):
    def test_notice_is_normalized_without_inventing_an_opening_bid(self) -> None:
        text = """
        NOTICE OF APPLICATION FOR TAX DEED
        Tax Deed Application # 26109
        Certificate Number: 2024/4225
        Description of Property: VILLAGES OF MONTEREY UNIT TWO LOT 403
        Parcel ID# 80445100158
        Property Address: 1715 SAN BERNADINO WAY, NAPLES, FL 34109
        Name in Which Assessed: BOBBIE COLLINS EST
        Unless redeemed, the property will be sold to the highest bidder at 1:00 P.M.
        on Monday, October 5, 2026.
        """

        listing = parse_notice(
            text,
            source_url="https://notices.collierclerk.com/notice/example/",
            today=date(2026, 8, 21),
        )

        self.assertIsNotNone(listing)
        assert listing is not None
        self.assertEqual(listing["id"], "collier-tax-deed-26109")
        self.assertEqual(listing["auctionDate"], "2026-10-05")
        self.assertEqual(listing["address"], "1715 SAN BERNADINO WAY")
        self.assertEqual(listing["city"], "NAPLES")
        self.assertEqual(listing["zip"], "34109")
        self.assertIsNone(listing["openingBid"])
        self.assertIsNone(listing["depositRequired"])
        self.assertIn("not published", listing["description"])

    def test_past_or_incomplete_notice_is_ignored(self) -> None:
        past = """
        Tax Deed Application # 25001
        Parcel ID# 123
        Property Address: N/A
        Name in Which Assessed: Owner
        will be sold on Monday, July 6, 2026.
        """
        self.assertIsNone(parse_notice(past, "https://example.test/past", date(2026, 8, 21)))
        self.assertIsNone(parse_notice("Tax Deed Application # 26000", "https://example.test/missing", date(2026, 8, 21)))


if __name__ == "__main__":
    unittest.main()

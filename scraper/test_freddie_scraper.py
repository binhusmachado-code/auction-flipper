import json
import unittest
from unittest.mock import Mock, patch

from freddie_scraper import _extract_json_ld, _parse_location_from_url, fetch_listing_detail


def listing_html(listing_type):
    payload = {
        "@context": "https://schema.org",
        "@type": listing_type,
        "name": "111 Moschel St, East Peoria, IL 61611",
        "@location": {
            "address": {
                "streetAddress": "111 Moschel St",
                "addressLocality": "East Peoria",
                "addressRegion": "IL",
                "postalCode": "61611",
            }
        },
    }
    return f'<script type="application/ld+json">{json.dumps(payload)}</script>'


class FreddieScraperTests(unittest.TestCase):
    def test_extracts_string_listing_type(self):
        self.assertIsNotNone(_extract_json_ld(listing_html("RealEstateListing")))

    def test_extracts_list_listing_type(self):
        self.assertIsNotNone(_extract_json_ld(listing_html(["RealEstateListing"])))

    def test_recovers_unit_address_and_multi_word_city_from_url(self):
        location = _parse_location_from_url(
            "https://www.homesteps.com/listingdetails/"
            "2206-s-cypress-bend-dr-apt-801-pompano-beach-fl-33069"
        )
        self.assertEqual(location, {
            "address": "2206 S Cypress Bend Dr Apt 801",
            "city": "Pompano Beach",
            "state": "FL",
            "zip": "33069",
        })

    def test_recovers_direction_and_unit_from_url(self):
        location = _parse_location_from_url(
            "https://www.homesteps.com/listingdetails/"
            "3820-roswell-rd-ne-unit-902-atlanta-ga-30342"
        )
        self.assertEqual(location["address"], "3820 Roswell Rd NE Unit 902")
        self.assertEqual(location["city"], "Atlanta")

    def test_keeps_consecutive_street_suffixes_in_address(self):
        location = _parse_location_from_url(
            "https://www.homesteps.com/listingdetails/"
            "1310-ainsley-way-dr-pearland-tx-77581"
        )
        self.assertEqual(location["address"], "1310 Ainsley Way Dr")
        self.assertEqual(location["city"], "Pearland")

    @patch("freddie_scraper.time.sleep")
    def test_retries_incomplete_detail_response(self, _sleep):
        incomplete = Mock(text="<html></html>")
        incomplete.raise_for_status.return_value = None
        complete = Mock(text=listing_html("RealEstateListing"))
        complete.raise_for_status.return_value = None
        session = Mock()
        session.get.side_effect = [incomplete, complete]

        result = fetch_listing_detail("https://example.test/listing", session=session, delay=0)

        self.assertEqual(result["address"], "111 Moschel St")
        self.assertEqual(session.get.call_count, 2)

    @patch("freddie_scraper.time.sleep")
    def test_uses_url_location_after_retries_are_exhausted(self, _sleep):
        incomplete = Mock(text="<html></html>")
        incomplete.raise_for_status.return_value = None
        session = Mock()
        session.get.return_value = incomplete

        result = fetch_listing_detail(
            "https://www.homesteps.com/listingdetails/"
            "111-moschel-st-east-peoria-il-61611",
            session=session,
            delay=0,
        )

        self.assertEqual(result["address"], "111 Moschel St")
        self.assertEqual(result["city"], "East Peoria")
        self.assertEqual(session.get.call_count, 3)


if __name__ == "__main__":
    unittest.main()

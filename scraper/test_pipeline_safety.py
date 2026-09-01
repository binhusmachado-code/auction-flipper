import unittest

from run_all_scrapers import normalize_property


class PipelineSafetyTests(unittest.TestCase):
    def test_missing_financial_evidence_stays_unknown(self):
        row = normalize_property({
            "id": "one",
            "price": 100_000,
            "source": "County auction",
            "sourceUrl": "https://county.example/one",
        })

        self.assertEqual(row["estimated_value"], 0)
        self.assertEqual(row["arv"], 0)
        self.assertEqual(row["rehab_estimate"], 0)

    def test_official_listing_photo_is_unverified_without_asset_validation(self):
        row = normalize_property({
            "id": "two",
            "source": "Fannie Mae HomePath",
            "sourceUrl": "https://homepath.example/two",
            "imageUrl": "https://images.example/two.jpg",
        })

        self.assertEqual(row["photo_source"], "unverified")

    def test_legacy_pipeline_never_promotes_photo_provenance(self):
        row = normalize_property({
            "id": "verified-photo",
            "source": "Fannie Mae HomePath",
            "sourceUrl": "https://homepath.example/verified-photo",
            "imageUrl": "https://images.example/verified-photo.jpg",
            "photoAssetVerified": True,
            "photoVerifiedAt": "2026-08-31T12:00:00Z",
            "photoCapturedAt": "2026-08-30T12:00:00Z",
        })

        self.assertEqual(row["photo_source"], "unverified")
        self.assertIsNone(row["photo_source_name"])
        self.assertIsNone(row["photo_source_url"])

    def test_placeholder_photo_is_removed(self):
        row = normalize_property({
            "id": "placeholder",
            "source": "HUD Home Store",
            "imageUrl": "https://images.unsplash.com/photo-123",
        })

        self.assertEqual(row["image_url"], "")
        self.assertEqual(row["photo_source"], "unverified")

    def test_unknown_photo_is_not_promoted_to_verified(self):
        row = normalize_property({
            "id": "three",
            "source": "Unknown feed",
            "imageUrl": "https://images.example/three.jpg",
        })

        self.assertEqual(row["photo_source"], "unverified")


if __name__ == "__main__":
    unittest.main()

#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK_DIR="${HOME}/Library/Caches/AuctionFlipperRefresh"
LOCK_DIR="${WORK_DIR}/running.lock"
KEYCHAIN_SERVICE="auction-flipper-refresh"

mkdir -p "$WORK_DIR"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "Auction inventory refresh is already running."
  exit 0
fi
trap 'rmdir "$LOCK_DIR"' EXIT
umask 077

TOKEN="$(security find-generic-password -a "$(id -un)" -s "$KEYCHAIN_SERVICE" -w)"
if [[ -z "$TOKEN" ]]; then
  echo "Auction refresh credential is unavailable in macOS Keychain." >&2
  exit 1
fi

CURRENT_JSON="${WORK_DIR}/current.json"
RECORDS_JSON="${WORK_DIR}/records.json"
METADATA_JSON="${WORK_DIR}/metadata.json"
PAYLOAD_JSON="${WORK_DIR}/payload.json"
RESULT_JSON="${WORK_DIR}/result.json"
EDGE_URL="https://dlnurzizylroqchedfbf.supabase.co/functions/v1/refresh-tax-deeds"
LIEN_RECORDS_JSON="${WORK_DIR}/tax-liens.json"
LIEN_METADATA_JSON="${WORK_DIR}/tax-lien-metadata.json"
LIEN_PAYLOAD_JSON="${WORK_DIR}/tax-lien-payload.json"
LIEN_RESULT_JSON="${WORK_DIR}/tax-lien-result.json"
LIEN_EDGE_URL="https://dlnurzizylroqchedfbf.supabase.co/functions/v1/refresh-tax-liens"

curl --config <(printf 'header = "x-refresh-token: %s"\n' "$TOKEN") \
  --fail --silent --show-error \
  "$EDGE_URL" \
  > "$CURRENT_JSON"
jq -e '.records | type == "array" and length >= 100' "$CURRENT_JSON" >/dev/null
jq '.records' "$CURRENT_JSON" > "$RECORDS_JSON"

cd "$ROOT"
python3 scraper/tax_deed/refresh_tax_deeds.py \
  --output "$RECORDS_JSON" \
  --metadata-output "$METADATA_JSON"

TODAY="$(date +%F)"
jq -e --arg today "$TODAY" '
  length >= 100
  and length == ([.[].id] | unique | length)
  and all(.[]; (.sourceUrl | startswith("https://")) and .auctionDate >= $today)
' "$RECORDS_JSON" >/dev/null
jq -e '
  .sources | any(.county == "Broward" and .status == "verified" and .count > 0)
' "$METADATA_JSON" >/dev/null

jq -n \
  --slurpfile records "$RECORDS_JSON" \
  --slurpfile metadata "$METADATA_JSON" \
  '{records: $records[0], metadata: $metadata[0]}' \
  > "$PAYLOAD_JSON"
curl --config <(printf 'header = "x-refresh-token: %s"\n' "$TOKEN") \
  --fail --silent --show-error \
  -X POST \
  -H "Content-Type: application/json" \
  --data-binary "@${PAYLOAD_JSON}" \
  "$EDGE_URL" \
  > "$RESULT_JSON"
jq -e '.ok == true' "$RESULT_JSON" >/dev/null
jq '{ok, result}' "$RESULT_JSON"

python3 scraper/tax_lien/refresh_tax_liens.py \
  --output "$LIEN_RECORDS_JSON" \
  --metadata-output "$LIEN_METADATA_JSON"
jq -e '
  length >= 25
  and length == ([.[].id] | unique | length)
  and all(.[];
    .saleType == "Tax Lien"
    and .state == "CO"
    and .county == "Adams"
    and .price > 0
    and (.sourceUrl | startswith("https://adamscountyco.gov/"))
  )
' "$LIEN_RECORDS_JSON" >/dev/null
jq -e '
  .sources | any(.county == "Adams" and .status == "verified" and .count > 0)
' "$LIEN_METADATA_JSON" >/dev/null
jq -n \
  --slurpfile records "$LIEN_RECORDS_JSON" \
  --slurpfile metadata "$LIEN_METADATA_JSON" \
  '{records: $records[0], metadata: $metadata[0]}' \
  > "$LIEN_PAYLOAD_JSON"
curl --config <(printf 'header = "x-refresh-token: %s"\n' "$TOKEN") \
  --fail --silent --show-error \
  -X POST \
  -H "Content-Type: application/json" \
  --data-binary "@${LIEN_PAYLOAD_JSON}" \
  "$LIEN_EDGE_URL" \
  > "$LIEN_RESULT_JSON"
jq -e '.ok == true' "$LIEN_RESULT_JSON" >/dev/null
jq '{ok, result}' "$LIEN_RESULT_JSON"

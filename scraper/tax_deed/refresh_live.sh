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

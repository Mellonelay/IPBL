#!/usr/bin/env bash
set -Eeuo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
cat > "$TMP/curl" <<'CURL'
#!/usr/bin/env bash
cat "$MONITOR_FIXTURE"
CURL
chmod +x "$TMP/curl"
cat > "$TMP/failed.json" <<'JSON'
{"health":{"level":"FAILED","reasons":["source_reported_fail"],"freshness":{"lastCapturedAt":"2026-06-12T19:00:00Z"},"source":{"name":"bookmaker:melbet.com"},"alert":{"severity":"CRITICAL","code":"sustained_source_failure"},"recovery":{"state":"INCIDENT"}}}
JSON
cat > "$TMP/recovered.json" <<'JSON'
{"health":{"level":"DEGRADED","reasons":["fallback_source_active"],"freshness":{"lastCapturedAt":"2026-06-12T19:02:00Z"},"source":{"name":"bookmaker:melbet.com"},"alert":{"severity":"WARNING","code":"source_degraded"},"recovery":{"state":"RECOVERED"}}}
JSON
STATE="$TMP/state"
MONITOR_FIXTURE="$TMP/failed.json" IPBL_MONITOR_CURL_BIN="$TMP/curl" IPBL_MONITOR_STATE_FILE="$STATE" "$ROOT/ops/systemd/ipbl-recorder-monitor" > "$TMP/first"
grep -q 'sustained_source_failure' "$TMP/first"
MONITOR_FIXTURE="$TMP/failed.json" IPBL_MONITOR_CURL_BIN="$TMP/curl" IPBL_MONITOR_STATE_FILE="$STATE" "$ROOT/ops/systemd/ipbl-recorder-monitor" > "$TMP/same"
test ! -s "$TMP/same"
MONITOR_FIXTURE="$TMP/recovered.json" IPBL_MONITOR_CURL_BIN="$TMP/curl" IPBL_MONITOR_STATE_FILE="$STATE" "$ROOT/ops/systemd/ipbl-recorder-monitor" > "$TMP/recovered"
grep -q 'RECOVERED' "$TMP/recovered"
if RECORDER_HEALTH_URL=http://example.test MONITOR_FIXTURE="$TMP/failed.json" IPBL_MONITOR_CURL_BIN="$TMP/curl" IPBL_MONITOR_STATE_FILE="$STATE" "$ROOT/ops/systemd/ipbl-recorder-monitor" >/dev/null 2>"$TMP/insecure"; then exit 31; fi
grep -q 'must use https' "$TMP/insecure"
echo 'Phase C8 recorder monitor transition tests passed'

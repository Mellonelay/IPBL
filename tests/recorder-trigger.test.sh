#!/usr/bin/env bash
set -Eeuo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/bin"
cat > "$TMP/bin/curl" <<'CURL'
#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\n' "$@" >"$CAPTURE_ARGS"
cat >"$CAPTURE_CONFIG"
CURL
chmod +x "$TMP/bin/curl"
sed "s#/usr/bin/curl#$TMP/bin/curl#" "$ROOT/ops/systemd/ipbl-recorder-trigger" >"$TMP/trigger"
chmod +x "$TMP/trigger"
printf 'CRON_SECRET=%q\nRECORDER_URL=%q\n' 'phase-c-secret-value' 'https://example.test/api/cron/record-live' >"$TMP/env"
chmod 600 "$TMP/env"
CAPTURE_ARGS="$TMP/args" CAPTURE_CONFIG="$TMP/config" IPBL_RECORDER_ENV_FILE="$TMP/env" "$TMP/trigger"
! grep -q 'phase-c-secret-value' "$TMP/args"
grep -q 'Authorization: Bearer phase-c-secret-value' "$TMP/config"
grep -q 'url = "https://example.test/api/cron/record-live"' "$TMP/config"
printf 'CRON_SECRET=%q\nRECORDER_URL=%q\n' 'phase-c-secret-value' 'http://example.test/insecure' >"$TMP/env"
if CAPTURE_ARGS="$TMP/args2" CAPTURE_CONFIG="$TMP/config2" IPBL_RECORDER_ENV_FILE="$TMP/env" "$TMP/trigger" >"$TMP/insecure.out" 2>"$TMP/insecure.err"; then
  echo 'insecure URL unexpectedly accepted' >&2
  exit 31
fi
grep -q 'must use https' "$TMP/insecure.err"
echo 'Phase C recorder trigger security tests passed'

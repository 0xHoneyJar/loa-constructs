# Shared bats helper for construct-clew tests.
# Tests invoke scripts via `run bash <script>` (never source — the scripts set
# `set -euo pipefail`, which must not leak into the bats shell).

clew_setup() {
  CLEW_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  LEDGER_APPEND="${CLEW_DIR}/ledger-append.sh"
  CAPTURE_HOOK="${CLEW_DIR}/loa-clew-capture.sh"
  TEST_ROOT="$(mktemp -d)"
  export LOA_CLEW_LEDGER_ROOT="$TEST_ROOT"
  export LOA_CLEW_LOCK_TIMEOUT="${LOA_CLEW_LOCK_TIMEOUT:-2}"
  # Isolate the hook's trajectory writes into the temp root (no real-grimoire pollution).
  export LOA_GRIMOIRE_DIR="$TEST_ROOT/grimoires/loa"
}

clew_teardown() {
  [[ -n "${TEST_ROOT:-}" ]] && rm -rf "$TEST_ROOT"
}

# The SDD §3.2 worked-example seed line (the loop's first real datum).
seed_line() {
  printf '%s' '{"id":"lrn-20260530-smol-casing","tier":"construct","type":"correction","trigger":"operator: agents should use normal casing, not lowercase — lowercase is MY manual voice","solution":"AGENT writes normal sentence casing; lowercase is operator-only manual voice","target":{"skill_slug":"smol-comms-register","construct":"smol-comms-register","line_hint":"casing rule — the rule describing lowercase vs sentence casing","confirmed":true},"tags":["smol-comms-register"],"verified":false,"captured_by":"clew-marker","captured_at":"2026-05-30T00:00:00Z","distilled_at":null,"distill_status":"pending"}'
}

ledger_file() { printf '%s/%s/LEARNINGS.jsonl' "$TEST_ROOT" "$1"; }

#!/usr/bin/env bash
# scripts/clew/ledger-append.sh — construct-clew capture primitive (C3, SDD §5.2/§6.1)
#
# The SINGLE point that maps <slug> → ledger path (the Q1-reversibility hinge,
# SDD §10 Q1: keep this the only resolver so an external→in-repo switch is a
# one-function change). Validate-then-append under an advisory lock.
#
#   ledger_append <slug> <json-line>
#     → resolve ~/.loa/constructs/packs/<slug>/LEARNINGS.jsonl
#     → validate <json-line> against learnings-construct.schema.json
#     → flock { append compact-json\n }
#     → exit 0 ok | 2 schema-invalid (no append) | 3 lock timeout | 70 validator missing
#
# No `|| true` / `2>/dev/null` masking on the append mutation: capture failures
# are loud, never silent (SDD §6.1 — silent loss is the bug this system fixes).
set -euo pipefail

CLEW_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLEW_SCHEMA="${CLEW_LIB_DIR}/learnings-construct.schema.json"
CLEW_LOCK_TIMEOUT="${LOA_CLEW_LOCK_TIMEOUT:-5}"

# shellcheck source=scripts/clew/clew-lock.sh
source "${CLEW_LIB_DIR}/clew-lock.sh"

readonly CLEW_OK=0 CLEW_SCHEMA_INVALID=2 CLEW_LOCK_TIMEOUT_RC=3 CLEW_USAGE=64 CLEW_NO_VALIDATOR=70

# Ledger root. LOA_CLEW_LEDGER_ROOT overrides the default for tests/config.
_clew_ledger_root() { printf '%s\n' "${LOA_CLEW_LEDGER_ROOT:-$HOME/.loa/constructs/packs}"; }

# THE single slug→path resolver. Validates slug as a safe path component.
_clew_resolve_path() {
  local slug="$1"
  if [[ ! "$slug" =~ ^[a-z][a-z0-9-]*$ ]]; then
    echo "clew: invalid construct slug '$slug' (must match ^[a-z][a-z0-9-]*\$)" >&2
    return $CLEW_USAGE
  fi
  printf '%s/%s/LEARNINGS.jsonl\n' "$(_clew_ledger_root)" "$slug"
}

# Validate one line against the schema; print compact JSON on success.
# Exit 2 = invalid JSON or schema violation; 70 = validator unavailable.
_clew_validate_compact() {
  CLEW_SCHEMA="$CLEW_SCHEMA" python3 - "$1" <<'PY'
import json, os, sys
try:
    import jsonschema
except ImportError:
    sys.stderr.write("clew: python 'jsonschema' module not available\n"); sys.exit(70)
try:
    obj = json.loads(sys.argv[1])
except json.JSONDecodeError as e:
    sys.stderr.write(f"clew: not valid JSON: {e}\n"); sys.exit(2)
with open(os.environ["CLEW_SCHEMA"]) as fh:
    schema = json.load(fh)
try:
    jsonschema.validate(obj, schema)
except jsonschema.ValidationError as e:
    sys.stderr.write(f"clew: schema-invalid: {e.message}\n"); sys.exit(2)
sys.stdout.write(json.dumps(obj, separators=(",", ":"), ensure_ascii=False))
PY
}

ledger_append() {
  local slug="${1:-}" json="${2:-}"
  if [[ -z "$slug" || -z "$json" ]]; then
    echo "usage: ledger_append <slug> <json-line>" >&2; return $CLEW_USAGE
  fi

  local ledger; ledger="$(_clew_resolve_path "$slug")" || return $?
  local dir; dir="$(dirname "$ledger")"

  # validate-then-append: a malformed line is refused (exit 2) and never written.
  local compact rc
  set +e; compact="$(_clew_validate_compact "$json")"; rc=$?; set -e
  if (( rc != 0 )); then return "$rc"; fi

  mkdir -p "$dir"; chmod 0700 "$dir"
  [[ -f "$ledger" ]] || { : > "$ledger"; chmod 0600 "$ledger"; }

  # Append under the STABLE shared ledger lock (clew-lock.sh) — the same lock
  # populate-global-store.sh holds across its preserve→rm→restore, so a capture
  # during a re-populate can never be silently overwritten.
  local append_rc
  set +e
  clew_run_locked "$(_clew_ledger_root)" "$slug" "$CLEW_LOCK_TIMEOUT" -- \
    bash -c 'printf "%s\n" "$1" >> "$2"' _ "$compact" "$ledger"
  append_rc=$?
  set -e
  return "$append_rc"
}

# CLI shim for tests / direct invocation.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  ledger_append "$@"; exit $?
fi

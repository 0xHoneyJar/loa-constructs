#!/usr/bin/env bash
# =============================================================================
# audit-keys-preflight.sh — Sprint 1 (S1-T5) — audit-grade signing pre-flight
# =============================================================================
# Pre-execution gate that fires when a composition declares audit_signed: true
# (FR-6 / SDD §6.3). Verifies the cycle-098 audit-keys bootstrap state BEFORE
# any stage runs, so opt-in signing fails at flag-set time rather than mid-run.
#
# Usage:
#   audit-keys-preflight.sh <composition.yaml>            human report
#   audit-keys-preflight.sh <composition.yaml> --json     JSON report
#   audit-keys-preflight.sh --probe-only [--json]         probe state only
#
# Exit codes:
#   0   composition does not request audit_signed OR keys bootstrapped
#   78  composition requests audit_signed but keys are not bootstrapped
#       (EX_CONFIG per cycle-098 conventions; runbook path surfaced in error)
#   2   usage / parse error
#   3   environment problem (yq missing)
#
# State signals (any one is sufficient — operator chooses bootstrap shape):
#   1. .run/audit-keys/keypair.exists  (canonical sentinel)
#   2. LOA_AUDIT_PRIVATE_KEY_PATH env var → readable file
#   3. .claude/data/audit-keys/<key_id>.pub.json with matching private path
#
# Output payload:
#   {
#     "ok": bool,
#     "requested_audit_signed": bool,
#     "checks": {
#       "sentinel": "present" | "missing",
#       "env_path": "set" | "unset",
#       "private_key": "readable" | "missing" | "unreadable" | "skipped",
#       "public_key": "found" | "missing"
#     },
#     "errors": [{"code": "[AUDIT-KEYS-NOT-BOOTSTRAPPED]", "message": "..."}, ...],
#     "runbook": "grimoires/loa/runbooks/audit-keys-bootstrap.md"
#   }
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"
RUNBOOK_PATH="grimoires/loa/runbooks/audit-keys-bootstrap.md"

OUTPUT_JSON=0
PROBE_ONLY=0
COMPOSITION=""

usage() { sed -n '2,38p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)     usage; exit 0 ;;
    --json)        OUTPUT_JSON=1; shift ;;
    --probe-only)  PROBE_ONLY=1; shift ;;
    -*)            echo "[audit-keys-preflight] ERROR: unknown flag $1" >&2; exit 2 ;;
    *)
      if [[ -z "$COMPOSITION" ]]; then COMPOSITION="$1"
      else echo "[audit-keys-preflight] ERROR: unexpected positional: $1" >&2; exit 2; fi
      shift ;;
  esac
done

# ---- composition probe -------------------------------------------------------

requests_audit_signed() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "[audit-keys-preflight] ERROR: composition not found at $path" >&2
    exit 2
  fi
  if ! command -v yq >/dev/null 2>&1; then
    echo "[audit-keys-preflight] ERROR: yq v4+ required" >&2
    exit 3
  fi
  local val
  val=$(yq eval '.audit_signed // false' "$path" 2>/dev/null)
  [[ "$val" == "true" ]]
}

# ---- state probes ------------------------------------------------------------

probe_sentinel() {
  if [[ -f "$PROJECT_ROOT/.run/audit-keys/keypair.exists" ]]; then
    echo "present"
  else
    echo "missing"
  fi
}

probe_env_path() {
  if [[ -n "${LOA_AUDIT_PRIVATE_KEY_PATH:-}" ]]; then echo "set"; else echo "unset"; fi
}

probe_private_key() {
  local path="${LOA_AUDIT_PRIVATE_KEY_PATH:-}"
  if [[ -z "$path" ]]; then echo "skipped"; return; fi
  if [[ ! -e "$path" ]]; then echo "missing"; return; fi
  if [[ ! -r "$path" ]]; then echo "unreadable"; return; fi
  echo "readable"
}

probe_public_key() {
  local pub_dir="$PROJECT_ROOT/.claude/data/audit-keys"
  if [[ ! -d "$pub_dir" ]]; then echo "missing"; return; fi
  if compgen -G "$pub_dir/*.pub.json" >/dev/null 2>&1; then
    echo "found"
  else
    echo "missing"
  fi
}

# ---- main --------------------------------------------------------------------

requested_audit_signed=false
if (( PROBE_ONLY == 0 )); then
  if [[ -z "$COMPOSITION" ]]; then
    usage >&2
    exit 2
  fi
  if requests_audit_signed "$COMPOSITION"; then
    requested_audit_signed=true
  fi
fi

sentinel_state=$(probe_sentinel)
env_state=$(probe_env_path)
priv_state=$(probe_private_key)
pub_state=$(probe_public_key)

# Bootstrap is "complete" if EITHER:
#   (a) the sentinel file is present, AND a public key exists, OR
#   (b) the env var points to a readable private key, AND a public key exists.
errors=()
bootstrap_ok=false
if [[ "$sentinel_state" == "present" && "$pub_state" == "found" ]]; then
  bootstrap_ok=true
elif [[ "$priv_state" == "readable" && "$pub_state" == "found" ]]; then
  bootstrap_ok=true
fi

if [[ "$requested_audit_signed" == "true" || "$PROBE_ONLY" == "1" ]]; then
  if [[ "$bootstrap_ok" != "true" ]]; then
    if [[ "$sentinel_state" == "missing" && "$env_state" == "unset" ]]; then
      errors+=("audit-keys not bootstrapped: no sentinel at .run/audit-keys/keypair.exists and LOA_AUDIT_PRIVATE_KEY_PATH unset")
    fi
    if [[ "$priv_state" == "missing" ]]; then
      errors+=("LOA_AUDIT_PRIVATE_KEY_PATH points to '$LOA_AUDIT_PRIVATE_KEY_PATH' but file does not exist")
    fi
    if [[ "$priv_state" == "unreadable" ]]; then
      errors+=("LOA_AUDIT_PRIVATE_KEY_PATH file exists but is not readable by the current user")
    fi
    if [[ "$pub_state" == "missing" ]]; then
      errors+=("no public-key registry entry under .claude/data/audit-keys/*.pub.json")
    fi
    # If the only failure mode was an absent sentinel (and env was set), at
    # least surface that the env path exists but the registry doesn't.
    if (( ${#errors[@]} == 0 )); then
      errors+=("audit-keys bootstrap state is incomplete; see runbook")
    fi
  fi
fi

if (( OUTPUT_JSON == 1 )); then
  err_json="[]"
  if (( ${#errors[@]} > 0 )); then
    err_json=$(printf '%s\n' "${errors[@]}" | jq -R -s '
      split("\n")
      | map(select(length > 0))
      | map({code: "[AUDIT-KEYS-NOT-BOOTSTRAPPED]", message: .})
    ')
  fi
  jq -n \
    --argjson req "$([[ "$requested_audit_signed" == "true" ]] && echo true || echo false)" \
    --arg sentinel "$sentinel_state" \
    --arg env "$env_state" \
    --arg priv "$priv_state" \
    --arg pub "$pub_state" \
    --argjson errs "$err_json" \
    --arg runbook "$RUNBOOK_PATH" \
    '{
      ok: ($errs | length == 0),
      requested_audit_signed: $req,
      checks: {sentinel: $sentinel, env_path: $env, private_key: $priv, public_key: $pub},
      errors: $errs,
      runbook: $runbook
    }'
else
  echo "# audit-keys-preflight"
  echo "  requested_audit_signed: $requested_audit_signed"
  echo "  sentinel:    $sentinel_state"
  echo "  env_path:    $env_state"
  echo "  private_key: $priv_state"
  echo "  public_key:  $pub_state"
  if (( ${#errors[@]} > 0 )); then
    echo ""
    echo "  ERRORS:"
    for e in "${errors[@]}"; do printf "    [AUDIT-KEYS-NOT-BOOTSTRAPPED] %s\n" "$e"; done
    echo ""
    echo "  runbook: $RUNBOOK_PATH"
  fi
fi

if (( ${#errors[@]} > 0 )); then exit 78; fi
exit 0

#!/usr/bin/env bash
# =============================================================================
# strict-tier-prereq.sh — Sprint 1 (S1-T3) — strict-tier environment gate
# =============================================================================
# Pre-execution prerequisite check for compositions that request strict-tier
# isolation. Per FR-4.4 + SDD §6.5b, strict tier requires:
#
#   1. bwrap (Bubblewrap) on PATH                — kernel filesystem namespace
#   2. CAP_NET_ADMIN (root or capability set)    — kernel network namespace
#   3. cheval adapter library version with provider memory-disable flag support
#
# This gate fires at flag-set time (validator phase), not at first-use time
# (mid-stage). Opt-in features fail more usefully when they fail early.
#
# Usage:
#   strict-tier-prereq.sh <composition.yaml>            human report
#   strict-tier-prereq.sh <composition.yaml> --json     JSON report
#   strict-tier-prereq.sh --probe-only [--json]         env probe only (no composition)
#
# Exit codes:
#   0   composition does not request strict OR all prereqs met
#   78  composition requests strict but at least one prereq missing
#       (EX_CONFIG per cycle-098 conventions — operator must downgrade tier
#        in composition YAML or upgrade environment)
#   2   usage / parse error
#   3   environment problem (yq / python3 missing)
#
# Output payload:
#   {
#     "ok": bool,
#     "requested_strict": bool,
#     "checks": {
#       "bwrap": "found" | "missing",
#       "cap_net_admin": "root" | "capability" | "missing",
#       "cheval_memory_disable": "supported" | "missing" | "unknown"
#     },
#     "errors": [{"code": "[STRICT-TIER-PREREQ-MISSING]", "message": "..."}, ...],
#     "remediation": "..." | null
#   }
#
# Composition is parsed for any stage in chain[] with context_policy.isolation_tier
# == "strict". One occurrence is enough to require the full prereq stack.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"

OUTPUT_JSON=0
PROBE_ONLY=0
COMPOSITION=""

usage() { sed -n '2,38p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)     usage; exit 0 ;;
    --json)        OUTPUT_JSON=1; shift ;;
    --probe-only)  PROBE_ONLY=1; shift ;;
    -*)            echo "[strict-tier-prereq] ERROR: unknown flag $1" >&2; exit 2 ;;
    *)
      if [[ -z "$COMPOSITION" ]]; then COMPOSITION="$1"
      else echo "[strict-tier-prereq] ERROR: unexpected positional: $1" >&2; exit 2; fi
      shift ;;
  esac
done

# ---- environment probes ------------------------------------------------------

probe_bwrap() {
  if command -v bwrap >/dev/null 2>&1; then echo "found"; else echo "missing"; fi
}

probe_cap_net_admin() {
  # Effective UID 0 implies CAP_NET_ADMIN regardless of capability mask.
  if [[ "$(id -u 2>/dev/null || echo 1)" == "0" ]]; then
    echo "root"
    return
  fi
  # Linux capability check: getcap on /usr/bin/unshare or the bwrap binary
  # itself. macOS lacks getcap; report missing.
  if ! command -v getcap >/dev/null 2>&1; then
    echo "missing"
    return
  fi
  local target=""
  for cand in /usr/bin/bwrap /usr/local/bin/bwrap /usr/bin/unshare; do
    if [[ -x "$cand" ]]; then target="$cand"; break; fi
  done
  if [[ -z "$target" ]]; then echo "missing"; return; fi
  if getcap "$target" 2>/dev/null | grep -q "cap_net_admin"; then
    echo "capability"
  else
    echo "missing"
  fi
}

probe_cheval_memory_disable() {
  # The substrate uses .claude/adapters/loa_cheval as the verified adapter
  # library. Memory-disable flags are recognised when the providers package
  # exposes the SUPPORTS_MEMORY_DISABLE attribute on its base adapter — added
  # in cycle-098 Sprint 1A with the verified-disable runbook.
  local adapter_root="$PROJECT_ROOT/.claude/adapters/loa_cheval"
  if [[ ! -d "$adapter_root" ]]; then
    echo "unknown"
    return
  fi
  if ! command -v python3 >/dev/null 2>&1; then
    echo "unknown"
    return
  fi
  python3 - "$adapter_root" <<'PY' 2>/dev/null || echo "unknown"
import importlib
import sys
from pathlib import Path

adapter_root = Path(sys.argv[1])
sys.path.insert(0, str(adapter_root.parent))

try:
    base = importlib.import_module("loa_cheval.providers.base")
except Exception:
    print("unknown")
    sys.exit(0)

# Memory-disable flag support is signalled via either:
#   1. SUPPORTS_MEMORY_DISABLE attribute on BaseAdapter (cycle-098 Sprint 1A)
#   2. an explicit `provider_memory_disable` keyword on the adapter call signature
flag = getattr(base, "SUPPORTS_MEMORY_DISABLE", None)
if flag is True:
    print("supported")
    sys.exit(0)

import inspect
adapter_cls = getattr(base, "BaseAdapter", None)
if adapter_cls is not None:
    try:
        sig = inspect.signature(adapter_cls.__init__)
        if "provider_memory_disable" in sig.parameters:
            print("supported")
            sys.exit(0)
    except (TypeError, ValueError):
        pass

print("missing")
PY
}

# ---- composition tier discovery ---------------------------------------------

requests_strict_tier() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "[strict-tier-prereq] ERROR: composition not found at $path" >&2
    exit 2
  fi
  if ! command -v yq >/dev/null 2>&1; then
    echo "[strict-tier-prereq] ERROR: yq v4+ required for composition parsing" >&2
    exit 3
  fi
  # Any stage with context_policy.isolation_tier=="strict" or top-level
  # composition.isolation_tier=="strict" requires the full prereq stack.
  local hit
  hit=$(yq eval '
    [.isolation_tier // "",
     (.chain[]?.context_policy?.isolation_tier // "")]
    | .[] | select(. == "strict")
    | .' "$path" 2>/dev/null | head -n1)
  [[ -n "$hit" ]]
}

# ---- main --------------------------------------------------------------------

requested_strict=false
if (( PROBE_ONLY == 0 )); then
  if [[ -z "$COMPOSITION" ]]; then
    usage >&2
    exit 2
  fi
  if requests_strict_tier "$COMPOSITION"; then
    requested_strict=true
  fi
fi

bwrap_state=$(probe_bwrap)
cap_state=$(probe_cap_net_admin)
cheval_state=$(probe_cheval_memory_disable)

errors=()
remediation=""
if [[ "$requested_strict" == "true" || "$PROBE_ONLY" == "1" ]]; then
  if [[ "$bwrap_state" != "found" ]]; then
    errors+=("bwrap not found on PATH; install bubblewrap or downgrade tier to advisory")
  fi
  if [[ "$cap_state" == "missing" ]]; then
    errors+=("CAP_NET_ADMIN absent; run as root, set capability via 'setcap cap_net_admin+ep \$(command -v bwrap)', or downgrade tier to advisory")
  fi
  if [[ "$cheval_state" == "missing" ]]; then
    errors+=("cheval adapter library does not advertise memory-disable flag support; upgrade to cycle-098 Sprint 1A or later")
  fi
  if (( ${#errors[@]} > 0 )); then
    remediation="see grimoires/loa/sdd.md §6.5b. Either downgrade composition stages to isolation_tier: advisory or upgrade the environment."
  fi
fi

if (( OUTPUT_JSON == 1 )); then
  err_json="[]"
  if (( ${#errors[@]} > 0 )); then
    err_json=$(printf '%s\n' "${errors[@]}" | jq -R -s '
      split("\n")
      | map(select(length > 0))
      | map({code: "[STRICT-TIER-PREREQ-MISSING]", message: .})
    ')
  fi
  jq -n \
    --argjson req "$([[ "$requested_strict" == "true" ]] && echo true || echo false)" \
    --arg bwrap "$bwrap_state" \
    --arg cap "$cap_state" \
    --arg cheval "$cheval_state" \
    --argjson errs "$err_json" \
    --arg remediation "$remediation" \
    '{
      ok: ($errs | length == 0),
      requested_strict: $req,
      checks: {bwrap: $bwrap, cap_net_admin: $cap, cheval_memory_disable: $cheval},
      errors: $errs,
      remediation: (if ($remediation | length) > 0 then $remediation else null end)
    }'
else
  echo "# strict-tier-prereq"
  echo "  requested_strict: $requested_strict"
  echo "  bwrap:            $bwrap_state"
  echo "  cap_net_admin:    $cap_state"
  echo "  cheval_mem_dis:   $cheval_state"
  if (( ${#errors[@]} > 0 )); then
    echo ""
    echo "  ERRORS:"
    for e in "${errors[@]}"; do printf "    [STRICT-TIER-PREREQ-MISSING] %s\n" "$e"; done
    echo ""
    echo "  remediation: $remediation"
  fi
fi

if (( ${#errors[@]} > 0 )); then exit 78; fi
exit 0

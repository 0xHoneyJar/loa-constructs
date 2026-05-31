#!/usr/bin/env bash
# scripts/clew/ratify.sh — construct-clew human ratification gesture (Task 3.1, FR-4, SDD §4.1)
#
# The native logic behind `/skill-audit --approve <construct>-<skill>`. The operator-facing
# command wiring (`.claude/commands/skill-audit.md`) is the deferred System-Zone step — this
# repo keeps clew native (see scripts/clew/README.md), exactly as Sprint 1's hook and Sprint 2's
# distill skill were left documented-but-unregistered. This is the force-chain gate: a PROPOSAL.diff
# is INERT until an operator runs `approve` here.
#
#   ratify.sh approve --construct <slug> --skill <slug> [--dry-run]   → propagate (C5 PR helper)
#   ratify.sh reject  --construct <slug> --skill <slug>               → archived: re-surfaces silently
#   ratify.sh ignore  --construct <slug> --skill <slug>               → no-op (un-stamped; surface.sh
#                                                                        re-surfaces ≤once/session, no nag)
#
# approve → reject → ignore map 1:1 to the §3.4 state machine transitions out of `proposed`.
# This script NEVER applies the diff and NEVER sets verified:true (force chain); approve delegates
# the actual machine-boundary crossing to propose-construct-learning.sh (C5/C6).
set -euo pipefail

RAT_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAT_PROPOSE="${RAT_LIB_DIR}/propose-construct-learning.sh"
RAT_PENDING_DEFAULT="${LOA_GRIMOIRE_DIR:-grimoires/loa}/skills-pending"

readonly RAT_OK=0 RAT_USAGE=64 RAT_NO_PROPOSAL=2

_rat_parse() {
  RAT_CONSTRUCT=""; RAT_SKILL=""; RAT_DRY=false; RAT_PENDING="$RAT_PENDING_DEFAULT"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --construct) RAT_CONSTRUCT="$2"; shift 2;;
      --skill) RAT_SKILL="$2"; shift 2;;
      --dry-run) RAT_DRY=true; shift;;
      --pending-dir) RAT_PENDING="$2"; shift 2;;
      *) echo "unknown arg: $1" >&2; return $RAT_USAGE;;
    esac
  done
  [[ -n "$RAT_CONSTRUCT" && -n "$RAT_SKILL" ]] || {
    echo "usage: ratify.sh <approve|reject|ignore> --construct <slug> --skill <slug> [--dry-run]" >&2
    return $RAT_USAGE; }
}

# Content signature of the current PROPOSAL.diff — keeps a rejection tied to the diff it rejected
# (CRIT-3/DISS-003), NOT to the construct-skill dir name (which distill reuses for new proposals).
_rat_diff_hash() { shasum -a 256 "$1" 2>/dev/null | cut -c1-12; }

# True only when .rejected exists AND was written for the CURRENT diff. A re-distilled diff (new hash)
# is NOT suppressed; the stale marker is cleaned so the fresh proposal flows normally.
_rat_is_current_rejection() {
  local dir="$1"
  [[ -f "$dir/.rejected" ]] || return 1
  local stored cur
  stored="$(head -1 "$dir/.rejected" 2>/dev/null)"
  cur="$(_rat_diff_hash "$dir/PROPOSAL.diff")"
  if [[ -n "$stored" && "$stored" == "$cur" ]]; then return 0; fi
  rm -f "$dir/.rejected"   # stale: rejected an older diff that distill has since replaced
  return 1
}

rat_approve() {
  _rat_parse "$@" || return $?
  local dir="${RAT_PENDING}/${RAT_CONSTRUCT}-${RAT_SKILL}"
  [[ -f "$dir/PROPOSAL.diff" ]] || { echo "ratify: no proposal at $dir" >&2; return $RAT_NO_PROPOSAL; }
  if _rat_is_current_rejection "$dir"; then
    echo "ratify: ${RAT_CONSTRUCT}-${RAT_SKILL} (this exact diff) was rejected; not approving" >&2
    return $RAT_NO_PROPOSAL
  fi
  local fwd=(--construct "$RAT_CONSTRUCT" --skill "$RAT_SKILL" --pending-dir "$RAT_PENDING")
  [[ "$RAT_DRY" == true ]] && fwd+=(--dry-run)
  bash "$RAT_PROPOSE" "${fwd[@]}"
}

rat_reject() {
  _rat_parse "$@" || return $?
  local dir="${RAT_PENDING}/${RAT_CONSTRUCT}-${RAT_SKILL}"
  [[ -f "$dir/PROPOSAL.diff" ]] || { echo "ratify: no proposal at $dir" >&2; return $RAT_NO_PROPOSAL; }
  # Rejected → archived, but the rejection is bound to THIS diff's content hash (CRIT-3). surface.sh
  # and approve honor it only while the diff is unchanged; a re-distilled diff resurfaces normally.
  # We mark, never delete the artifacts — they stay for the audit trail.
  _rat_diff_hash "$dir/PROPOSAL.diff" > "$dir/.rejected"
  echo "REJECTED ${RAT_CONSTRUCT}-${RAT_SKILL}"
}

rat_ignore() {
  _rat_parse "$@" || return $?
  # Intentional no-op: the proposal stays un-stamped and re-surfaces at most once per session
  # (surface.sh session marker, §4.3). No escalation, no nag.
  echo "IGNORED ${RAT_CONSTRUCT}-${RAT_SKILL} (no-op; will re-surface ≤once/session)"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  cmd="${1:-}"; shift || true
  case "$cmd" in
    approve) rat_approve "$@";;
    reject)  rat_reject "$@";;
    ignore)  rat_ignore "$@";;
    *) echo "usage: ratify.sh <approve|reject|ignore> --construct <slug> --skill <slug> [--dry-run]" >&2; exit $RAT_USAGE;;
  esac
fi

#!/usr/bin/env bash
# scripts/clew/surface.sh — construct-clew SURFACE readers (C7, FR-7, SDD §1.4/§4.1/§4.3)
#
# Makes pending proposals + landed corrections + the FR-6 uninstall flags visible WITHOUT
# nagging. Three readers, each degrading to SILENCE when empty (anti-bureaucracy, §4.3):
#
#   surface.sh pending [--pending-dir D] [--handoffs-dir D]   → L6 handoff: "N proposals pending"
#                                                                + uninstall flags. ≤once/session.
#   surface.sh landed  [--pending-dir D]                      → SessionStart line: "corrections in flight"
#   surface.sh flags   [--pending-dir D]                      → the FR-6 uninstall-flag READER (the
#                                                                consumer that makes the flag non-dead)
#
# The L6 path reuses .claude/scripts/lib/structured-handoff-lib.sh (handoff_write) BEST-EFFORT;
# if the lib is unavailable it falls back to a native handoff markdown so surfacing never hard-fails.
# Registering a SessionStart hook that calls `surface.sh landed` is the deferred System-Zone step
# (documented in README) — the reader itself is native and testable here.
set -euo pipefail

SUR_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUR_PENDING_DEFAULT="${LOA_GRIMOIRE_DIR:-grimoires/loa}/skills-pending"
SUR_HANDOFF_LIB="${LOA_CLEW_HANDOFF_LIB:-${SUR_LIB_DIR}/../../.claude/scripts/lib/structured-handoff-lib.sh}"
readonly SUR_USAGE=64

_sur_now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
# Honor the SAME env overrides as the producer (propose-construct-learning.sh) so reader and writer
# stay in lock-step when an operator relocates the side-files (DISS-008 — overrides were write-only).
_sur_flags_file() { printf '%s' "${LOA_CLEW_FLAGS_FILE:-$1/.clew-uninstall-flags.jsonl}"; }
_sur_drafted_log() { printf '%s' "${LOA_CLEW_DRAFTED_LOG:-$1/.clew-drafted.jsonl}"; }
_sur_marker_file() { printf '%s/.clew-session-marker' "$1"; }

_sur_diff_hash() { shasum -a 256 "$1" 2>/dev/null | cut -c1-12; }

# Active proposal = dir with PROPOSAL.diff, NOT already drafted (CRIT-2), and NOT a CURRENT-diff
# rejection (CRIT-3 — a .rejected keyed to an older diff that distill has since replaced does NOT
# suppress the new one). Hidden dirs (.archived) skipped.
_sur_active_proposals() {
  local pending="$1"
  [[ -d "$pending" ]] || return 0
  local d
  for d in "$pending"/*/; do
    [[ -d "$d" ]] || continue
    local base; base="$(basename "$d")"
    [[ "$base" == .* ]] && continue
    [[ -f "${d}PROPOSAL.diff" ]] || continue
    local cur; cur="$(_sur_diff_hash "${d}PROPOSAL.diff")"
    # .drafted / .rejected suppress ONLY the diff they were written for (content-specific, DISS-006 /
    # CRIT-3). A re-distilled diff (new hash) is surfaced even if an older one was drafted/rejected.
    if [[ -f "${d}.drafted" ]]; then
      local dh; dh="$(sed -n 's/^hash=//p' "${d}.drafted" | head -1)"
      [[ -n "$dh" && "$dh" == "$cur" ]] && continue   # current diff already drafted
    fi
    if [[ -f "${d}.rejected" ]]; then
      local stored; stored="$(head -1 "${d}.rejected" 2>/dev/null)"
      [[ -n "$stored" && "$stored" == "$cur" ]] && continue   # current diff is the rejected one
    fi
    printf '%s\n' "$base"
  done
}

# --- pending: L6 handoff "N proposals pending" + uninstall flags; silent when both empty ---
sur_pending() {
  local pending="$SUR_PENDING_DEFAULT" handoffs_dir=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --pending-dir) pending="$2"; shift 2;;
      --handoffs-dir) handoffs_dir="$2"; shift 2;;
      *) echo "unknown arg: $1" >&2; return $SUR_USAGE;;
    esac
  done

  local proposals; proposals="$(_sur_active_proposals "$pending")"
  local n_prop=0; [[ -n "$proposals" ]] && n_prop="$(printf '%s\n' "$proposals" | grep -c .)"
  local flags_file; flags_file="$(_sur_flags_file "$pending")"
  local n_flags=0; [[ -f "$flags_file" ]] && n_flags="$(grep -c . "$flags_file" 2>/dev/null || echo 0)"

  # Degrade to SILENCE — empty ledger → no surfacing line (§4.3, FR-7).
  if (( n_prop == 0 && n_flags == 0 )); then
    return 0
  fi

  # Anti-nag (§4.3): re-surface the SAME set at most once per session. Key the marker on a content
  # hash of {proposals + flags}; an unchanged set is suppressed, a changed set surfaces again.
  local setsig marker session
  setsig="$(printf '%s\n%s' "$proposals" "$(cat "$flags_file" 2>/dev/null || true)" | shasum -a 256 2>/dev/null | cut -c1-16 || echo nohash)"
  session="${LOA_SESSION_ID:-$(date -u +%Y-%m-%d)}"
  marker="$(_sur_marker_file "$pending")"
  if [[ -f "$marker" ]] && grep -qxF "${session}:${setsig}" "$marker" 2>/dev/null; then
    return 0   # already surfaced this set this session — no nag
  fi

  # Compose the human-readable body.
  local body; body="$(
    printf 'construct-clew — %s construct proposal(s) pending ratification.\n\n' "$n_prop"
    if (( n_prop > 0 )); then
      printf 'Pending (run `ratify.sh approve --construct <c> --skill <s>`):\n'
      printf '%s\n' "$proposals" | sed 's/^/  - /'
      printf '\n'
    fi
    if (( n_flags > 0 )); then
      printf '%s archived-canonical flag(s) — operator decision needed (uninstall / route-to-mirror / discard):\n' "$n_flags"
      python3 - "$flags_file" <<'PY'
import json, sys
for ln in open(sys.argv[1], encoding="utf-8", errors="replace"):
    ln = ln.strip()
    if not ln: continue
    try: d = json.loads(ln)
    except Exception: continue
    print(f"  - {d.get('construct','?')} (skill {d.get('skill','?')}) → {d.get('canonical','?')} [{d.get('reason','')}]")
PY
    fi
  )"

  # Emit to stdout (the always-on surface) ...
  printf '%s\n' "$body"

  # ... and persist an L6 handoff (best-effort; native fallback).
  _sur_write_handoff "$pending" "$handoffs_dir" "$n_prop" "$body" || true

  # Record that we surfaced this set this session.
  printf '%s:%s\n' "$session" "$setsig" >> "$marker"
}

# Write the L6 handoff via the structured-handoff lib; fall back to a native markdown on any failure.
_sur_write_handoff() {
  local pending="$1" handoffs_dir="$2" n_prop="$3" body="$4"
  local doc; doc="$(umask 077 && mktemp)"
  {
    printf -- '---\n'
    printf 'schema_version: 1\n'
    printf 'from: construct-clew\n'
    printf 'to: operator\n'
    printf 'topic: construct-proposals-pending\n'
    printf 'ts_utc: %s\n' "$(_sur_now)"
    printf 'tags: [construct-clew, distillation]\n'
    printf -- '---\n\n'
    printf '%s\n' "$body"
  } > "$doc"

  local wrote=false
  if [[ -f "$SUR_HANDOFF_LIB" ]]; then
    local args=("$doc")
    [[ -n "$handoffs_dir" ]] && args+=(--handoffs-dir "$handoffs_dir")
    # verify-operators off: construct-clew↔operator is a machine-local self-handoff, not a
    # cross-operator routing event; OPERATORS.md verification would add friction with no signal.
    if LOA_HANDOFF_VERIFY_OPERATORS=0 bash -c '
        source "$1"; shift
        handoff_write "$@"' _ "$SUR_HANDOFF_LIB" "${args[@]}" >/dev/null 2>&1; then
      wrote=true
    fi
  fi

  if [[ "$wrote" != true ]]; then
    # Native fallback — never let surfacing hard-fail.
    local dest="${handoffs_dir:-${LOA_GRIMOIRE_DIR:-grimoires/loa}/handoffs}"
    mkdir -p "$dest"
    cp -f "$doc" "${dest}/construct-clew-pending-$(date -u +%Y%m%dT%H%M%SZ).md"
  fi
  rm -f "$doc"
}

# --- landed: SessionStart line "corrections in flight / landed"; silent when empty ---
sur_landed() {
  local pending="$SUR_PENDING_DEFAULT"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --pending-dir) pending="$2"; shift 2;;
      *) echo "unknown arg: $1" >&2; return $SUR_USAGE;;
    esac
  done
  local log; log="$(_sur_drafted_log "$pending")"
  [[ -f "$log" ]] || return 0
  local n; n="$(grep -c . "$log" 2>/dev/null || echo 0)"
  (( n == 0 )) && return 0
  printf 'construct-clew: %s construct correction(s) drafted (PR in flight → land at next re-sync).\n' "$n"
}

# --- flags: the FR-6 uninstall-flag READER (the explicit consumer; no unconsumed side-effect) ---
sur_flags() {
  local pending="$SUR_PENDING_DEFAULT"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --pending-dir) pending="$2"; shift 2;;
      *) echo "unknown arg: $1" >&2; return $SUR_USAGE;;
    esac
  done
  local flags_file; flags_file="$(_sur_flags_file "$pending")"
  [[ -f "$flags_file" ]] || return 0
  local n; n="$(grep -c . "$flags_file" 2>/dev/null || echo 0)"
  (( n == 0 )) && return 0
  printf '%s construct uninstall candidate(s) (archived canonical — no PR drafted):\n' "$n"
  python3 - "$flags_file" <<'PY'
import json, sys
for ln in open(sys.argv[1], encoding="utf-8", errors="replace"):
    ln = ln.strip()
    if not ln: continue
    try: d = json.loads(ln)
    except Exception: continue
    print(f"  - {d.get('construct','?')} → {d.get('canonical','?')} [{d.get('reason','')}]")
PY
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  cmd="${1:-}"; shift || true
  case "$cmd" in
    pending) sur_pending "$@";;
    landed)  sur_landed "$@";;
    flags)   sur_flags "$@";;
    *) echo "usage: surface.sh <pending|landed|flags> [--pending-dir D] [--handoffs-dir D]" >&2; exit $SUR_USAGE;;
  esac
fi

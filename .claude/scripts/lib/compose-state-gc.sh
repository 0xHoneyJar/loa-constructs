#!/usr/bin/env bash
# =============================================================================
# compose-state-gc.sh — Sprint 5 (S5-T3) — race-coordinated persistent state GC
# =============================================================================
# Walks the persistent state directory, reaps state files whose ttl_expires
# has passed. Race-coordinated against running compositions per SDD §4.5
# (closes Flatline HIGH on GC race):
#
#   For each candidate state file:
#     1. Acquire exclusive flock on `<file>.lock` with **0-second timeout**
#        (non-blocking). If another process holds it, skip and retry next cycle.
#     2. After acquiring lock, RE-READ ttl_expires (file may have been written
#        since the cron's directory walk).
#     3. Refuse deletion if `mtime` is within last 4 hours (heuristic
#        protection against long-running compositions matching L3's
#        max_cycle_seconds default).
#     4. If both checks still pass under lock, delete state.json AND
#        the lock file. Release lock.
#
# Usage:
#   compose-state-gc.sh [--dry-run] [--root <persistent-dir>] [--json]
#                       [--mtime-grace-hours N] [--ttl-clock-skew-seconds N]
#
# Cron integration: runs daily by default. Operator-configurable.
#
# Exit codes:
#   0   GC pass complete (some/all candidates may have been deleted; report
#       summarises by category: deleted / skipped_locked / skipped_mtime /
#       skipped_alive / errors)
#   2   usage / parse error
#   3   environment problem (jq missing / persistent root unreadable)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../../.." && pwd -P)}"

PERSISTENT_ROOT="${LOA_PERSISTENT_STATE_ROOT:-$PROJECT_ROOT/.run/compose/persistent}"
DRY_RUN=0
OUTPUT_JSON=0
MTIME_GRACE_HOURS=4
TTL_CLOCK_SKEW=0    # seconds; allow positive value to skew GC window for testing

usage() { sed -n '2,32p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)              usage; exit 0 ;;
    --dry-run)              DRY_RUN=1; shift ;;
    --json)                 OUTPUT_JSON=1; shift ;;
    --root)                 PERSISTENT_ROOT="$2"; shift 2 ;;
    --mtime-grace-hours)    MTIME_GRACE_HOURS="$2"; shift 2 ;;
    --ttl-clock-skew-seconds) TTL_CLOCK_SKEW="$2"; shift 2 ;;
    -*) echo "[compose-state-gc] ERROR: unknown flag $1" >&2; exit 2 ;;
    *)  echo "[compose-state-gc] ERROR: unexpected positional: $1" >&2; exit 2 ;;
  esac
done

command -v jq >/dev/null 2>&1 || { echo "[compose-state-gc] ERROR: jq required" >&2; exit 3; }

if [[ ! -d "$PERSISTENT_ROOT" ]]; then
  # No persistent state directory yet → nothing to GC. Exit 0 silently.
  if (( OUTPUT_JSON == 1 )); then
    jq -n --arg root "$PERSISTENT_ROOT" '{deleted: [], skipped_locked: [], skipped_mtime: [], skipped_alive: [], errors: [], root: $root, scanned: 0}'
  fi
  exit 0
fi

# ---- portable utilities ------------------------------------------------------

_iso_to_epoch() {
  python3 -c 'import sys, datetime; print(int(datetime.datetime.fromisoformat(sys.argv[1].replace("Z", "+00:00")).timestamp()))' "$1"
}

# Portable mtime in epoch seconds (macOS lacks GNU stat).
_mtime_epoch() {
  if stat -c '%Y' "$1" >/dev/null 2>&1; then
    stat -c '%Y' "$1"
  else
    stat -f '%m' "$1"
  fi
}

# Try to acquire an exclusive flock with 0-timeout. Returns 0 on success
# (lock held), 1 on failure (lock contended). We hold the lock by keeping
# the FD open via process substitution, then release on function return.
#
# NB: macOS without flock binary uses the mkdir-as-lock fallback here too.
# The 0-timeout semantic is preserved: mkdir is atomic on POSIX FS, so
# either we get the lock instantly or we don't (no waiting).
_try_lock_and_run() {
  # NB: must NOT use a subshell for the lock body — array updates inside
  # subshells don't reach the parent. We use `exec` to redirect FD 9 in the
  # current shell, run flock against that FD, then run the body in the same
  # shell. The lock is released when FD 9 is closed (via `exec 9>&-`).
  local lock_file="$1"
  shift
  if command -v flock >/dev/null 2>&1; then
    exec 9>"$lock_file"
    if flock -n -x 9 2>/dev/null; then
      "$@"
      local rc=$?
      exec 9>&-
      return $rc
    else
      exec 9>&-
      return 1
    fi
  else
    local lock_dir="${lock_file}.dir"
    if mkdir "$lock_dir" 2>/dev/null; then
      "$@"
      local rc=$?
      rmdir "$lock_dir" 2>/dev/null || true
      return $rc
    else
      return 1
    fi
  fi
}

# ---- GC pass -----------------------------------------------------------------

declare -a deleted=()
declare -a skipped_locked=()
declare -a skipped_mtime=()
declare -a skipped_alive=()
declare -a errors=()
scanned=0

now_epoch=$(date -u +%s)
mtime_grace_seconds=$((MTIME_GRACE_HOURS * 3600))

while IFS= read -r -d '' state_file; do
  scanned=$((scanned + 1))
  lock_file="${state_file}.lock"
  rel_path="${state_file#$PERSISTENT_ROOT/}"

  # Pre-lock TTL check (cheap; skip if not expired).
  if ! ttl_expires=$(jq -r '.ttl_expires // empty' "$state_file" 2>/dev/null); then
    errors+=("$rel_path: cannot read ttl_expires")
    continue
  fi
  if [[ -z "$ttl_expires" || "$ttl_expires" == "null" ]]; then
    errors+=("$rel_path: missing ttl_expires")
    continue
  fi
  if ! ttl_epoch=$(_iso_to_epoch "$ttl_expires" 2>/dev/null); then
    errors+=("$rel_path: malformed ttl_expires '$ttl_expires'")
    continue
  fi

  effective_now=$((now_epoch + TTL_CLOCK_SKEW))
  if (( ttl_epoch > effective_now )); then
    skipped_alive+=("$rel_path")
    continue
  fi

  # Pre-lock mtime grace check.
  if mtime_epoch=$(_mtime_epoch "$state_file" 2>/dev/null); then
    if (( now_epoch - mtime_epoch < mtime_grace_seconds )); then
      skipped_mtime+=("$rel_path")
      continue
    fi
  fi

  # Acquire exclusive lock (non-blocking). The reaper closure below runs
  # ONLY when the lock is held — protects against TOCTOU between this
  # GC's directory walk and a concurrent composition's atomic-rename write.
  reap_under_lock() {
    # RE-READ ttl_expires under lock (file may have been touched by a
    # concurrent writer between the directory walk and our lock acquisition).
    local ttl_expires_post ttl_epoch_post mtime_post
    ttl_expires_post=$(jq -r '.ttl_expires // empty' "$state_file" 2>/dev/null)
    if [[ -z "$ttl_expires_post" || "$ttl_expires_post" == "null" ]]; then
      errors+=("$rel_path: ttl_expires gone after lock")
      return 0
    fi
    ttl_epoch_post=$(_iso_to_epoch "$ttl_expires_post" 2>/dev/null) || {
      errors+=("$rel_path: malformed ttl_expires after lock")
      return 0
    }
    if (( ttl_epoch_post > effective_now )); then
      # A concurrent writer extended the TTL. Skip.
      skipped_alive+=("$rel_path")
      return 0
    fi

    # RE-READ mtime under lock.
    if mtime_post=$(_mtime_epoch "$state_file" 2>/dev/null); then
      if (( now_epoch - mtime_post < mtime_grace_seconds )); then
        skipped_mtime+=("$rel_path")
        return 0
      fi
    fi

    if (( DRY_RUN == 1 )); then
      deleted+=("$rel_path (dry-run)")
    else
      rm -f -- "$state_file"
      deleted+=("$rel_path")
    fi
  }

  if ! _try_lock_and_run "$lock_file" reap_under_lock; then
    skipped_locked+=("$rel_path")
    continue
  fi

  # If we deleted, also remove the lock file (only when state is gone).
  if (( DRY_RUN == 0 )) && [[ ! -f "$state_file" ]]; then
    rm -f -- "$lock_file" 2>/dev/null || true
    # Also try to remove the empty leaf directory; ignore errors if not empty.
    rmdir "$(dirname "$state_file")" 2>/dev/null || true
  fi
done < <(find "$PERSISTENT_ROOT" -type f -name "state.json" -print0 2>/dev/null)

# ---- output ------------------------------------------------------------------

_to_json_array() {
  if (( $# == 0 )); then
    echo "[]"
  else
    printf '%s\n' "$@" | jq -R . | jq -s .
  fi
}

if (( OUTPUT_JSON == 1 )); then
  jq -n \
    --arg root "$PERSISTENT_ROOT" \
    --argjson scanned "$scanned" \
    --argjson deleted "$(_to_json_array ${deleted[@]+"${deleted[@]}"})" \
    --argjson skipped_locked "$(_to_json_array ${skipped_locked[@]+"${skipped_locked[@]}"})" \
    --argjson skipped_mtime "$(_to_json_array ${skipped_mtime[@]+"${skipped_mtime[@]}"})" \
    --argjson skipped_alive "$(_to_json_array ${skipped_alive[@]+"${skipped_alive[@]}"})" \
    --argjson errors "$(_to_json_array ${errors[@]+"${errors[@]}"})" \
    --argjson dry "$DRY_RUN" \
    '{
      root: $root,
      scanned: $scanned,
      dry_run: ($dry == 1),
      deleted: $deleted,
      skipped_locked: $skipped_locked,
      skipped_mtime: $skipped_mtime,
      skipped_alive: $skipped_alive,
      errors: $errors,
      summary: {
        total_scanned: $scanned,
        total_deleted: ($deleted | length),
        total_skipped_locked: ($skipped_locked | length),
        total_skipped_mtime: ($skipped_mtime | length),
        total_skipped_alive: ($skipped_alive | length),
        total_errors: ($errors | length)
      }
    }'
else
  echo "# compose-state-gc"
  echo "  root: $PERSISTENT_ROOT"
  echo "  scanned: $scanned"
  printf "  deleted (%d):" "${#deleted[@]}"; for f in ${deleted[@]+"${deleted[@]}"}; do echo "    $f"; done
  printf "  skipped (locked, %d):\n" "${#skipped_locked[@]}"
  for f in ${skipped_locked[@]+"${skipped_locked[@]}"}; do echo "    $f"; done
  printf "  skipped (mtime grace, %d):\n" "${#skipped_mtime[@]}"
  for f in ${skipped_mtime[@]+"${skipped_mtime[@]}"}; do echo "    $f"; done
  printf "  skipped (alive, %d):\n" "${#skipped_alive[@]}"
  for f in ${skipped_alive[@]+"${skipped_alive[@]}"}; do echo "    $f"; done
  if (( ${#errors[@]} > 0 )); then
    echo "  ERRORS:"
    for e in ${errors[@]+"${errors[@]}"}; do echo "    $e"; done
  fi
fi

exit 0

#!/usr/bin/env bash
# scripts/clew/clew-lock.sh — shared advisory lock for the construct-clew ledger.
#
# The lock lives at a STABLE path (a hidden sibling of the pack dir, at the packs
# root) so it survives `rm -rf <pack>` during a re-populate. Both `ledger_append`
# (capture) and `populate-global-store.sh` (re-sync) take this lock, closing the
# preserve→rm→restore window where a concurrent capture could otherwise be silently
# lost — the cardinal sin this system exists to prevent (SDD §6.1).
#
# On the same machine both callers make the same flock-vs-mkdir choice, so they
# always coordinate on the same primitive at the same path.

# clew_lock_base <packs_root> <slug> → stable lock path stem (no extension).
clew_lock_base() { printf '%s/.clew-%s' "$1" "$2"; }

# Locate a flock binary (macOS ships none by default — util-linux via brew).
clew_flock_bin() {
  if command -v flock >/dev/null 2>&1; then command -v flock; return 0; fi
  local p
  for p in /opt/homebrew/opt/util-linux/bin/flock /usr/local/opt/util-linux/bin/flock /usr/bin/flock; do
    [[ -x "$p" ]] && { printf '%s\n' "$p"; return 0; }
  done
  return 1
}

# clew_run_locked <packs_root> <slug> <timeout_s> -- <cmd...>
# Run <cmd...> while holding the stable ledger lock. Returns the command's exit
# code, or 3 if the lock could not be acquired within <timeout_s>.
clew_run_locked() {
  local root="$1" slug="$2" timeout="$3"; shift 3
  [[ "${1:-}" == "--" ]] && shift
  local base; base="$(clew_lock_base "$root" "$slug")"
  mkdir -p "$root"
  local fb rc
  if fb="$(clew_flock_bin)"; then
    ( "$fb" -w "$timeout" 9 || exit 3; "$@" ) 9>"${base}.lock"
    rc=$?
  else
    local waited=0
    while ! mkdir "${base}.lock.d" 2>/dev/null; do
      if (( waited >= timeout )); then
        echo "clew: lock timeout for ${slug} after ${timeout}s" >&2
        return 3
      fi
      sleep 1; waited=$((waited + 1))
    done
    "$@"; rc=$?
    rmdir "${base}.lock.d" 2>/dev/null || true
  fi
  return "$rc"
}

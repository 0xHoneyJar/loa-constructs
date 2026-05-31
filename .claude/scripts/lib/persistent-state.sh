#!/usr/bin/env bash
# =============================================================================
# persistent-state.sh — Sprint 5 (S5-T1 + S5-T2) — persistent state manager
# =============================================================================
# Per-skill persistent state with collision-free composite key, atomic-rename
# writes (closes Flatline IMP-009 + HIGH on torn reads), flock-coordinated
# concurrent access, TTL policy (write vs access), and state-poisoning
# safeguard (closes Flatline HIGH on foreign-construct TTL extension).
#
# SDD §3.3 + §4.5. FR-5.
#
# Composite key (FR-5.1): each state file is keyed by SIX components — any
# collision risks state mixing, so the path encodes all of them:
#
#   .run/compose/persistent/
#     <project_id>/
#       <composition_id>/                  (FR-1.5 deterministic)
#         <construct_slug>/
#           <skill_slug>/
#             <stage_id>/                  (FR-5.1 — same skill at different stages)
#               <schema_version>/          (mismatch ⇒ fresh state, no auto-migrate)
#                 state.json
#                 state.json.lock          (flock target, never read directly)
#
# State envelope (state.json):
#   {
#     "schema_version": "v1",
#     "key": {project_id, composition_id, construct_slug, skill_slug, stage_id},
#     "created_at": ISO8601,
#     "last_updated": ISO8601,        # FR-5.4 TTL anchor for `write` policy
#     "last_accessed": ISO8601,       # tracked separately for `access` policy
#     "ttl_seconds": int,             # operator-configurable (default 30 days)
#     "ttl_expires": ISO8601,         # frozen at write time (audit-immutable)
#     "ttl_policy": "write" | "access",
#     "ownership": {
#       "owning_construct": "<slug>",
#       "owning_skill": "<slug>"
#     },
#     "audit_trail": [
#       {ts, op: "init|write|extend|read", actor: {construct, skill}}
#     ],
#     "payload": { ... }                # construct-defined opaque blob
#   }
#
# Subcommands:
#
#   persistent-state.sh init <key-args> [--ttl-seconds N] [--ttl-policy write|access]
#     Initialize a fresh state file. Sets owning_construct + owning_skill from
#     the calling key components. Refuses if file already exists (use `set` to
#     update). Audit-trail records "init" event.
#
#   persistent-state.sh set <key-args> --payload-json <json>
#     Update state. Merges --payload-json into payload field. Cross-checks
#     calling construct against owning_construct (foreign writers refused with
#     [STATE-OWNERSHIP-VIOLATION] exit 1). Refreshes last_updated; refreshes
#     ttl_expires per policy. Audit-trail records "write" event.
#
#   persistent-state.sh get <key-args>
#     Read state. Acquires shared flock during read. Updates last_accessed (for
#     `access` policy this also extends ttl_expires; for `write` policy it
#     only updates the timestamp without TTL extension). Audit-trail records
#     "read" event when LOA_PERSISTENT_STATE_AUDIT_READS=1 (off by default —
#     read traffic is high-frequency).
#
#   persistent-state.sh extend <key-args> --calling-construct <slug> --calling-skill <slug>
#     Explicit TTL extension. Cross-checks calling-construct against
#     owning_construct. Foreign extension → exit 1 + [STATE-OWNERSHIP-VIOLATION].
#     Audit-trail records "extend" event with caller identity.
#
#   persistent-state.sh path <key-args>
#     Print the canonical state file path; exit 0 whether or not it exists.
#     Useful for cron sweeps that walk the persistent
#     directory.
#
# Key-args (positional, in order):
#   --project-id <id>                  e.g. "loa-constructs"
#   --composition-id <id>              from envelope-chain.sh compose-id
#   --construct-slug <slug>
#   --skill-slug <slug>
#   --stage-id <id>                    e.g. "audit-feel.stage-1"
#   --schema-version <vN>              e.g. "v1"
#
# Error codes:
#   [STATE-OWNERSHIP-VIOLATION]  Foreign construct attempting write or extend
#   [STATE-SCHEMA-MIGRATION]     Schema version mismatch on read (state reset)
#   [STATE-LOCK-FAILED]          Could not acquire flock within timeout
#   [STATE-NOT-FOUND]            get/extend on missing state (init first)
#
# Exit codes:
#   0   operation succeeded
#   1   contract violation ([STATE-OWNERSHIP-VIOLATION] / [STATE-NOT-FOUND])
#   2   usage / parse error
#   3   environment problem (jq / flock missing — flock is Linux-only by name;
#       macOS provides via brew install flock OR we fall back to per-process
#       lock-by-symlink as documented inline)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../../.." && pwd -P)}"
PERSISTENT_ROOT="${LOA_PERSISTENT_STATE_ROOT:-$PROJECT_ROOT/.run/compose/persistent}"

DEFAULT_TTL_SECONDS=2592000     # 30 days per SDD §3.3
DEFAULT_TTL_POLICY="write"

usage() { sed -n '2,100p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

# ---- portable utilities ------------------------------------------------------

command -v jq >/dev/null 2>&1 || { echo "[persistent-state] ENV: jq required" >&2; exit 3; }

_now_iso() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

_iso_to_epoch() {
  # Portable ISO8601 → epoch seconds. macOS `date` rejects -d; we fall back
  # to python3 since Sprint 1 already requires it for other lib helpers.
  python3 -c 'import sys, datetime; print(int(datetime.datetime.fromisoformat(sys.argv[1].replace("Z", "+00:00")).timestamp()))' "$1"
}

_epoch_to_iso() {
  python3 -c 'import sys, datetime; print(datetime.datetime.fromtimestamp(int(sys.argv[1]), tz=datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))' "$1"
}

# Slug containment: each key component is joined into a filesystem path. Apply
# the same regex Sprint 6 hardening will share via lib/path-safety.py — for
# now, inline-check at the boundary (defense-in-depth even before Sprint 6 lands).
_validate_slug() {
  local field="$1" val="$2"
  # composition_id format is `<basename>@sha256:<hex>` so we allow @, :, and
  # alphanumerics + the standard slug separators (-_./). Length cap 256 chars
  # (composition_ids can include path components like `compositions/audit-feel.yaml`).
  if [[ ! "$val" =~ ^[A-Za-z0-9][A-Za-z0-9_./@:-]{0,255}$ ]]; then
    echo "[persistent-state] ERROR: $field='$val' contains illegal characters or exceeds 256 chars" >&2
    exit 2
  fi
  if [[ "$val" == *".."* ]]; then
    echo "[persistent-state] ERROR: $field='$val' contains '..' (path traversal vector)" >&2
    exit 2
  fi
}

# Portable flock: prefer real `flock` binary (Linux + Homebrew on macOS); fall
# back to mkdir-as-lock when unavailable. The mkdir lock is atomic on POSIX
# filesystems and serves as a poor-man's flock for single-host coordination.
_with_lock() {
  # _with_lock <lock_file> <mode: shared|exclusive> <command...>
  local lock_file="$1" mode="$2"
  shift 2
  local lock_dir="${lock_file}.dir"

  if command -v flock >/dev/null 2>&1; then
    local flag="-x"
    [[ "$mode" == "shared" ]] && flag="-s"
    # 30-second timeout for foreground writers; GC overrides via -n.
    ( flock -w 30 "$flag" 9 || { echo "[persistent-state] [STATE-LOCK-FAILED] flock timeout on $lock_file"; exit 3; }
      "$@"
    ) 9>"$lock_file"
  else
    # mkdir-based fallback. Both shared and exclusive use the same mkdir lock
    # since flock's shared semantics aren't expressible without flock(2).
    # This is a degraded fallback; production SHOULD have flock installed.
    local i=0
    while ! mkdir "$lock_dir" 2>/dev/null; do
      i=$((i + 1))
      if (( i > 60 )); then
        echo "[persistent-state] [STATE-LOCK-FAILED] mkdir-lock timeout on $lock_dir" >&2
        exit 3
      fi
      sleep 0.5
    done
    # shellcheck disable=SC2317  # cleanup runs via trap regardless
    cleanup() { rmdir "$lock_dir" 2>/dev/null || true; }
    trap cleanup EXIT
    "$@"
    cleanup
    trap - EXIT
  fi
}

# ---- key resolution ----------------------------------------------------------

declare -A KEY_PARTS=()

_parse_key_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project-id)       KEY_PARTS[project_id]="$2"; shift 2 ;;
      --composition-id)   KEY_PARTS[composition_id]="$2"; shift 2 ;;
      --construct-slug)   KEY_PARTS[construct_slug]="$2"; shift 2 ;;
      --skill-slug)       KEY_PARTS[skill_slug]="$2"; shift 2 ;;
      --stage-id)         KEY_PARTS[stage_id]="$2"; shift 2 ;;
      --schema-version)   KEY_PARTS[schema_version]="$2"; shift 2 ;;
      --ttl-seconds)      OPT_TTL_SECONDS="$2"; shift 2 ;;
      --ttl-policy)       OPT_TTL_POLICY="$2"; shift 2 ;;
      --payload-json)     OPT_PAYLOAD="$2"; shift 2 ;;
      --calling-construct) OPT_CALLING_CONSTRUCT="$2"; shift 2 ;;
      --calling-skill)    OPT_CALLING_SKILL="$2"; shift 2 ;;
      *) echo "[persistent-state] ERROR: unknown arg $1" >&2; exit 2 ;;
    esac
  done

  for required in project_id composition_id construct_slug skill_slug stage_id schema_version; do
    [[ -n "${KEY_PARTS[$required]:-}" ]] || { echo "[persistent-state] ERROR: missing --${required//_/-}" >&2; exit 2; }
    _validate_slug "$required" "${KEY_PARTS[$required]}"
  done
}

_state_path() {
  local p="$PERSISTENT_ROOT"
  for k in project_id composition_id construct_slug skill_slug stage_id schema_version; do
    p="$p/${KEY_PARTS[$k]}"
  done
  echo "$p/state.json"
}

_lock_path() {
  echo "$(_state_path).lock"
}

# ---- atomic-rename writer ----------------------------------------------------

_write_atomic() {
  # _write_atomic <path> <content>
  local target="$1" content="$2"
  local tmp="${target}.tmp.$$"
  mkdir -p "$(dirname "$target")"
  printf '%s' "$content" > "$tmp"
  # fsync via python3 (portable). The sync ensures the temp file's bytes hit
  # disk before the rename — without it, a power loss could leave us with an
  # empty target file after the rename completes.
  python3 -c "
import os, sys
fd = os.open(sys.argv[1], os.O_RDONLY)
os.fsync(fd)
os.close(fd)
" "$tmp" >/dev/null 2>&1 || true
  mv "$tmp" "$target"
}

# ---- subcommand: init --------------------------------------------------------

cmd_init() {
  _parse_key_args "$@"
  local state_path
  state_path=$(_state_path)
  local lock_path
  lock_path=$(_lock_path)

  if [[ -f "$state_path" ]]; then
    echo "[persistent-state] ERROR: state already exists at $state_path; use 'set' to update" >&2
    exit 1
  fi

  local ttl_seconds="${OPT_TTL_SECONDS:-$DEFAULT_TTL_SECONDS}"
  local ttl_policy="${OPT_TTL_POLICY:-$DEFAULT_TTL_POLICY}"
  if [[ "$ttl_policy" != "write" && "$ttl_policy" != "access" ]]; then
    echo "[persistent-state] ERROR: --ttl-policy must be 'write' or 'access', got '$ttl_policy'" >&2
    exit 2
  fi

  local now now_epoch expires_epoch expires_iso
  now=$(_now_iso)
  now_epoch=$(date -u +%s)
  expires_epoch=$((now_epoch + ttl_seconds))
  expires_iso=$(_epoch_to_iso "$expires_epoch")

  mkdir -p "$(dirname "$state_path")"

  # Build state envelope. payload is empty {} on init; constructs use `set`
  # to write actual payload.
  # NB: `${OPT_PAYLOAD:-{}}` is parsed weirdly (bash treats `{}` inside the
  # default as `{` + literal `}` outside). Use explicit conditional instead.
  local payload="${OPT_PAYLOAD:-}"
  [[ -z "$payload" ]] && payload='{}'
  if ! echo "$payload" | jq empty 2>/dev/null; then
    echo "[persistent-state] ERROR: --payload-json is not valid JSON" >&2
    exit 2
  fi

  local state_json
  state_json=$(jq -n \
    --arg sv "${KEY_PARTS[schema_version]}" \
    --arg pid "${KEY_PARTS[project_id]}" \
    --arg cid "${KEY_PARTS[composition_id]}" \
    --arg cs "${KEY_PARTS[construct_slug]}" \
    --arg sks "${KEY_PARTS[skill_slug]}" \
    --arg sid "${KEY_PARTS[stage_id]}" \
    --arg now "$now" \
    --argjson ttl "$ttl_seconds" \
    --arg expires "$expires_iso" \
    --arg policy "$ttl_policy" \
    --argjson payload "$payload" \
    '{
      schema_version: $sv,
      key: {
        project_id: $pid, composition_id: $cid,
        construct_slug: $cs, skill_slug: $sks, stage_id: $sid
      },
      created_at: $now,
      last_updated: $now,
      last_accessed: $now,
      ttl_seconds: $ttl,
      ttl_expires: $expires,
      ttl_policy: $policy,
      ownership: { owning_construct: $cs, owning_skill: $sks },
      audit_trail: [
        {ts: $now, op: "init", actor: {construct: $cs, skill: $sks}}
      ],
      payload: $payload
    }')

  _with_lock "$lock_path" "exclusive" _write_atomic "$state_path" "$state_json"
  echo "$state_path"
}

# ---- subcommand: set ---------------------------------------------------------

cmd_set() {
  _parse_key_args "$@"
  local state_path
  state_path=$(_state_path)
  local lock_path
  lock_path=$(_lock_path)

  [[ -f "$state_path" ]] || {
    echo "[persistent-state] [STATE-NOT-FOUND] no state at $state_path; init first" >&2
    exit 1
  }
  [[ -n "${OPT_PAYLOAD:-}" ]] || { echo "[persistent-state] ERROR: --payload-json required" >&2; exit 2; }
  if ! echo "$OPT_PAYLOAD" | jq empty 2>/dev/null; then
    echo "[persistent-state] ERROR: --payload-json is not valid JSON" >&2
    exit 2
  fi

  _do_set() {
    local prev
    prev=$(cat "$state_path")

    # Ownership cross-check (S5-T2 / closes Flatline HIGH on state poisoning).
    local owning_construct owning_skill
    owning_construct=$(echo "$prev" | jq -r '.ownership.owning_construct')
    owning_skill=$(echo "$prev" | jq -r '.ownership.owning_skill')
    if [[ "$owning_construct" != "${KEY_PARTS[construct_slug]}" ]]; then
      echo "[persistent-state] [STATE-OWNERSHIP-VIOLATION] writer construct '${KEY_PARTS[construct_slug]}' is not the owning construct '$owning_construct' of state at $state_path" >&2
      exit 1
    fi

    local now now_epoch
    now=$(_now_iso)
    now_epoch=$(date -u +%s)

    # ttl_expires policy: write policy refreshes; access doesn't (set IS a write).
    local ttl_policy ttl_seconds
    ttl_policy=$(echo "$prev" | jq -r '.ttl_policy')
    ttl_seconds=$(echo "$prev" | jq -r '.ttl_seconds')
    local expires_iso
    expires_iso=$(_epoch_to_iso $((now_epoch + ttl_seconds)))

    local merged
    merged=$(echo "$prev" | jq \
      --arg now "$now" \
      --arg expires "$expires_iso" \
      --argjson new_payload "$OPT_PAYLOAD" \
      --arg cs "${KEY_PARTS[construct_slug]}" \
      --arg sks "${KEY_PARTS[skill_slug]}" \
      '.last_updated = $now |
       .last_accessed = $now |
       .ttl_expires = $expires |
       .payload = (.payload * $new_payload) |
       .audit_trail += [{ts: $now, op: "write", actor: {construct: $cs, skill: $sks}}]
      ')

    _write_atomic "$state_path" "$merged"
  }

  _with_lock "$lock_path" "exclusive" _do_set
  echo "$state_path"
}

# ---- subcommand: get ---------------------------------------------------------

cmd_get() {
  _parse_key_args "$@"
  local state_path
  state_path=$(_state_path)
  local lock_path
  lock_path=$(_lock_path)

  [[ -f "$state_path" ]] || {
    echo "[persistent-state] [STATE-NOT-FOUND] no state at $state_path" >&2
    exit 1
  }

  _do_get() {
    local prev
    prev=$(cat "$state_path")

    # Schema version mismatch ⇒ fresh state, log [STATE-SCHEMA-MIGRATION].
    local stored_sv
    stored_sv=$(echo "$prev" | jq -r '.schema_version')
    if [[ "$stored_sv" != "${KEY_PARTS[schema_version]}" ]]; then
      echo "[persistent-state] [STATE-SCHEMA-MIGRATION] stored schema_version='$stored_sv' but caller requested '${KEY_PARTS[schema_version]}'; state must be re-initialized" >&2
      exit 1
    fi

    # Update last_accessed (always); for access policy, ALSO extend ttl_expires.
    local now now_epoch ttl_policy ttl_seconds expires_iso
    now=$(_now_iso)
    now_epoch=$(date -u +%s)
    ttl_policy=$(echo "$prev" | jq -r '.ttl_policy')
    ttl_seconds=$(echo "$prev" | jq -r '.ttl_seconds')

    local mutated
    if [[ "$ttl_policy" == "access" ]]; then
      expires_iso=$(_epoch_to_iso $((now_epoch + ttl_seconds)))
      mutated=$(echo "$prev" | jq \
        --arg now "$now" \
        --arg expires "$expires_iso" \
        '.last_accessed = $now | .ttl_expires = $expires')
    else
      mutated=$(echo "$prev" | jq --arg now "$now" '.last_accessed = $now')
    fi

    # Optional read auditing.
    if [[ "${LOA_PERSISTENT_STATE_AUDIT_READS:-0}" == "1" ]]; then
      mutated=$(echo "$mutated" | jq \
        --arg now "$now" \
        --arg cs "${KEY_PARTS[construct_slug]}" \
        --arg sks "${KEY_PARTS[skill_slug]}" \
        '.audit_trail += [{ts: $now, op: "read", actor: {construct: $cs, skill: $sks}}]')
    fi

    _write_atomic "$state_path" "$mutated"
    echo "$mutated"
  }

  # Get uses exclusive flock too because we mutate last_accessed; shared-flock
  # readers would race on the timestamp update. The performance cost is small
  # (state files are tiny); the simplicity wins.
  _with_lock "$lock_path" "exclusive" _do_get
}

# ---- subcommand: extend ------------------------------------------------------

cmd_extend() {
  _parse_key_args "$@"
  [[ -n "${OPT_CALLING_CONSTRUCT:-}" ]] || { echo "[persistent-state] ERROR: --calling-construct required for extend" >&2; exit 2; }
  [[ -n "${OPT_CALLING_SKILL:-}" ]] || { echo "[persistent-state] ERROR: --calling-skill required for extend" >&2; exit 2; }
  _validate_slug "calling_construct" "$OPT_CALLING_CONSTRUCT"
  _validate_slug "calling_skill" "$OPT_CALLING_SKILL"

  local state_path
  state_path=$(_state_path)
  local lock_path
  lock_path=$(_lock_path)

  [[ -f "$state_path" ]] || {
    echo "[persistent-state] [STATE-NOT-FOUND] no state at $state_path" >&2
    exit 1
  }

  _do_extend() {
    local prev
    prev=$(cat "$state_path")

    local owning_construct
    owning_construct=$(echo "$prev" | jq -r '.ownership.owning_construct')
    if [[ "$owning_construct" != "$OPT_CALLING_CONSTRUCT" ]]; then
      echo "[persistent-state] [STATE-OWNERSHIP-VIOLATION] caller construct '$OPT_CALLING_CONSTRUCT' is not the owning construct '$owning_construct' of state at $state_path" >&2
      exit 1
    fi

    local now now_epoch ttl_seconds expires_iso
    now=$(_now_iso)
    now_epoch=$(date -u +%s)
    ttl_seconds=$(echo "$prev" | jq -r '.ttl_seconds')
    expires_iso=$(_epoch_to_iso $((now_epoch + ttl_seconds)))

    local extended
    extended=$(echo "$prev" | jq \
      --arg now "$now" \
      --arg expires "$expires_iso" \
      --arg cs "$OPT_CALLING_CONSTRUCT" \
      --arg sks "$OPT_CALLING_SKILL" \
      '.ttl_expires = $expires |
       .last_accessed = $now |
       .audit_trail += [{ts: $now, op: "extend", actor: {construct: $cs, skill: $sks}}]')

    _write_atomic "$state_path" "$extended"
    echo "$extended"
  }

  _with_lock "$lock_path" "exclusive" _do_extend
}

# ---- subcommand: path --------------------------------------------------------

cmd_path() {
  _parse_key_args "$@"
  _state_path
}

# ---- entry point -------------------------------------------------------------

main() {
  local cmd="${1:-}"
  shift || true
  case "$cmd" in
    init)    cmd_init "$@" ;;
    set)     cmd_set "$@" ;;
    get)     cmd_get "$@" ;;
    extend)  cmd_extend "$@" ;;
    path)    cmd_path "$@" ;;
    -h|--help|"") usage; exit 0 ;;
    *) echo "[persistent-state] ERROR: unknown subcommand '$cmd'" >&2; exit 2 ;;
  esac
}

main "$@"

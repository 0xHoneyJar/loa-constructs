#!/usr/bin/env bash
# =============================================================================
# construct-handoff-lib.sh — Construct handoff packet library
# =============================================================================
# Cycle: simstim-20260509-aead9136 (Sprint 1, S1-bonus)
# PRD: FR-3 (handoff packets)
# SDD: §2.4 + §8.1 (parallel infrastructure to L6, with shared helper signatures)
#
# Mirrors L6's structured-handoff-lib.sh helper signatures where applicable —
# sets up future cycle's lib unification path (vision-025: handoff packets as
# causal-history DAG). When unification happens, helpers move to a parent
# `lib/handoff-common.sh` and both libs source it.
#
# Public API:
#   construct_handoff_compute_id <packet_path>   → echo sha256:...
#   construct_handoff_validate <packet_path>     → exit 0/1/2
#   construct_handoff_write <packet_path>         → write w/ atomic publish
#   construct_handoff_read <packet_path>          → cat (with validation)
#
# Internal helpers (mirror L6 signatures with construct_ prefix):
#   _construct_handoff_log                        ↔ _handoff_log
#   _construct_handoff_canonical_for_id           ↔ _handoff_canonical_for_id
#   _construct_handoff_atomic_publish             ↔ _handoff_atomic_publish
#   _construct_handoff_assert_same_machine        ↔ _handoff_assert_same_machine
#   _construct_handoff_save_shell_opts            ↔ _handoff_save_shell_opts
#   _construct_handoff_restore_shell_opts         ↔ _handoff_restore_shell_opts
#
# Status: Sprint 1 skeleton. Full implementation lands in Sprint 4 (headless
# parity) when compose-run.sh begins emitting packets through this lib.
# =============================================================================
set -euo pipefail

CONSTRUCT_HANDOFF_LIB_VERSION="0.1.0-sprint1-skeleton"
CONSTRUCT_HANDOFF_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# lib/ → scripts/ → .claude/ → project root: 3 levels up
CONSTRUCT_HANDOFF_PROJECT_ROOT="$(cd "$CONSTRUCT_HANDOFF_LIB_DIR/../../.." && pwd)"
CONSTRUCT_HANDOFF_SCHEMA="$CONSTRUCT_HANDOFF_PROJECT_ROOT/.claude/data/trajectory-schemas/construct-handoff.schema.json"
CONSTRUCT_HANDOFF_VALIDATOR="$CONSTRUCT_HANDOFF_PROJECT_ROOT/.claude/scripts/handoff-validate.sh"

# -----------------------------------------------------------------------------
# Logging helper (mirrors L6's _handoff_log)
# -----------------------------------------------------------------------------
_construct_handoff_log() {
    local msg="$*"
    echo "[construct-handoff] $msg" >&2
}

# -----------------------------------------------------------------------------
# Same-machine guardrail (mirrors L6's SKP-005 _handoff_assert_same_machine)
# -----------------------------------------------------------------------------
# L6 guards against cross-host writes that would corrupt the chain. Construct
# handoff packets follow the same hard-rule: the producer and the persister
# must run on the same machine (no NFS-mounted .run/ writes from a different
# host). For Sprint 1 skeleton this is a stub; Sprint 4 wires in real
# fingerprint-comparison logic identical to L6's.
_construct_handoff_assert_same_machine() {
    if [[ "${LOA_CONSTRUCT_HANDOFF_DISABLE_FINGERPRINT:-0}" == "1" ]]; then
        return 0
    fi
    # Sprint 1 stub: log and pass. Sprint 4 implements the real check.
    _construct_handoff_log "same-machine guardrail: stub (Sprint 4 implements full fingerprint check)"
    return 0
}

# -----------------------------------------------------------------------------
# Canonical form for content-addressable id derivation
# (mirrors L6's _handoff_canonical_for_id)
# -----------------------------------------------------------------------------
# Produces JCS-canonical (RFC 8785) JSON of the packet body, used for
# computing the sha256-based id. Reuses L6's lib/jcs.sh path when available;
# falls back to direct rfc8785 Python invocation.
_construct_handoff_canonical_for_id() {
    local packet_path="$1"
    if [[ ! -f "$packet_path" ]]; then
        _construct_handoff_log "_canonical_for_id: file not found: $packet_path"
        return 2
    fi

    python3 - "$packet_path" <<'PYEOF'
import json, sys
try:
    import rfc8785
except ImportError:
    print("ERROR: rfc8785 not installed (pip install rfc8785)", file=sys.stderr)
    sys.exit(3)
try:
    with open(sys.argv[1]) as f:
        packet = json.load(f)
except json.JSONDecodeError as e:
    print(f"ERROR: invalid JSON: {e}", file=sys.stderr)
    sys.exit(2)
sys.stdout.buffer.write(rfc8785.dumps(packet))
PYEOF
}

# -----------------------------------------------------------------------------
# Compute content-addressable id for a packet (public API)
# -----------------------------------------------------------------------------
# Output: sha256:<64 hex chars>
construct_handoff_compute_id() {
    local packet_path="$1"
    local canonical
    canonical="$(_construct_handoff_canonical_for_id "$packet_path")" || return $?
    echo -n "sha256:"
    echo -n "$canonical" | shasum -a 256 | awk '{print $1}'
}

# -----------------------------------------------------------------------------
# Validate a packet (public API; delegates to handoff-validate.sh)
# -----------------------------------------------------------------------------
# Exit codes: 0 OK, 1 FAIL (required missing or schema), 2 BLOCKER (recommended overage)
construct_handoff_validate() {
    local packet_path="$1"
    shift || true
    if [[ ! -x "$CONSTRUCT_HANDOFF_VALIDATOR" ]]; then
        _construct_handoff_log "validator not executable: $CONSTRUCT_HANDOFF_VALIDATOR"
        return 1
    fi
    "$CONSTRUCT_HANDOFF_VALIDATOR" "$packet_path" "$@"
}

# -----------------------------------------------------------------------------
# Atomic publish (mirrors L6's _handoff_atomic_publish)
# -----------------------------------------------------------------------------
# Writes packet via mktemp + rename pattern with flock guard. Sprint 1
# skeleton uses simple mktemp+rename; Sprint 4 adds flock + INDEX.md update
# semantics matching L6.
_construct_handoff_atomic_publish() {
    local source_path="$1"
    local dest_path="$2"

    if [[ ! -f "$source_path" ]]; then
        _construct_handoff_log "atomic_publish: source not found: $source_path"
        return 1
    fi

    local dest_dir
    dest_dir="$(dirname "$dest_path")"
    mkdir -p "$dest_dir"

    # Atomic rename via mktemp in the same dir (cross-fs safety).
    local tmp_path
    tmp_path="$(mktemp "$dest_dir/.tmp.XXXXXX")"
    cp "$source_path" "$tmp_path"
    chmod 0600 "$tmp_path"
    mv -f "$tmp_path" "$dest_path"

    _construct_handoff_log "atomic_publish: $dest_path"
    return 0
}

# -----------------------------------------------------------------------------
# Write a packet (public API)
# -----------------------------------------------------------------------------
# Validates first, then atomic-publishes to the destination. Returns the
# computed id on success.
construct_handoff_write() {
    local source_path="$1"
    local dest_path="${2:-}"

    _construct_handoff_assert_same_machine || return $?

    construct_handoff_validate "$source_path" >/dev/null
    local validate_exit=$?
    if [[ $validate_exit -eq 1 ]]; then
        _construct_handoff_log "write refused: validator exit 1 (required field missing or schema violation)"
        return 1
    fi
    # Exit 2 (BLOCKER recommended overage) is allowed for write — operator
    # may consciously emit a sparse packet. Validator emitted the warning;
    # this lib does not gate on it.

    if [[ -z "$dest_path" ]]; then
        # Default destination: derive from packet's composition_run_id +
        # stage_index + construct_slug. Sprint 4 implements full derivation.
        _construct_handoff_log "write: no dest_path supplied; Sprint 4 implements derivation"
        return 2
    fi

    _construct_handoff_atomic_publish "$source_path" "$dest_path" || return $?
    construct_handoff_compute_id "$dest_path"
}

# -----------------------------------------------------------------------------
# Read a packet (public API; validates before returning)
# -----------------------------------------------------------------------------
construct_handoff_read() {
    local packet_path="$1"
    construct_handoff_validate "$packet_path" >/dev/null || return $?
    cat "$packet_path"
}

# -----------------------------------------------------------------------------
# Lib version (public API)
# -----------------------------------------------------------------------------
construct_handoff_lib_version() {
    echo "$CONSTRUCT_HANDOFF_LIB_VERSION"
}

# When sourced, the lib defines functions but does not execute. When run as
# a script, dispatch to a public function based on argv.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    cmd="${1:-}"
    shift || true
    case "$cmd" in
        compute-id) construct_handoff_compute_id "$@" ;;
        validate) construct_handoff_validate "$@" ;;
        write) construct_handoff_write "$@" ;;
        read) construct_handoff_read "$@" ;;
        version) construct_handoff_lib_version ;;
        ""|-h|--help)
            cat <<EOF
Usage: construct-handoff-lib.sh <subcommand> [args...]

Subcommands:
  compute-id <packet>           Print sha256:... of JCS-canonical packet
  validate <packet> [--json]    Validate packet (exit 0/1/2)
  write <source> <dest>         Validate + atomic-publish source to dest
  read <packet>                 Validate + cat packet
  version                       Print lib version
EOF
            ;;
        *) _construct_handoff_log "unknown subcommand: $cmd"; exit 1 ;;
    esac
fi

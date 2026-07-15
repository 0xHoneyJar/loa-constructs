#!/usr/bin/env bash
# =============================================================================
# loa-l7-surface-soul.sh — SessionStart hook (cycle-098 Sprint 7B).
#
# At session start, read SOUL.md (project root, descriptive identity doc),
# validate against the L7 schema, and surface the body wrapped in
# sanitize_for_session_start("L7", body) into the session context. Always
# silent (exit 0 with no stdout) when:
#   - soul_identity_doc.enabled is not true in .loa.config.yaml
#   - SOUL.md is missing
#   - the config file is absent or malformed
#   - schema_mode=strict and validation fails (NFR-Sec3 prescriptive
#     rejection or required-section absence)
#
# Always emits a soul.surface audit event (when enabled) capturing the
# outcome (surfaced | schema-warning | schema-refused | file-missing).
#
# FR-L7-1 (load at session start), FR-L7-2 (warn|strict), FR-L7-4 (cap +
# reference path), FR-L7-5 (single-fire — re-source no-ops via LOA_L7_SURFACED
# env marker), FR-L7-6 (silent on disabled / missing / refused).
#
# Trust boundary: the SOUL.md body is OPERATOR-AUTHORED but UNTRUSTED at
# surfacing. soul_load wraps the body via sanitize_for_session_start("L7",
# body) before reaching session context — never interpret as instructions.
# =============================================================================

set -uo pipefail

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${HOOK_DIR}/../../.." && pwd)"
LIB="${REPO_ROOT}/.claude/scripts/lib/soul-identity-lib.sh"
REALPATH_LIB="${REPO_ROOT}/.claude/scripts/lib/portable-realpath.sh"
[[ -f "$LIB" ]] || exit 0
[[ -f "$REALPATH_LIB" ]] || exit 0
# shellcheck source=/dev/null
source "$REALPATH_LIB" 2>/dev/null || exit 0

# Cache scoped to session — re-source no-ops (FR-L7-5).
[[ "${LOA_L7_SURFACED:-0}" == "1" ]] && exit 0

# -----------------------------------------------------------------------------
# Test-mode env-gated path overrides (LOA_SOUL_TEST_CONFIG +
# LOA_SOUL_TEST_PATH). Honored ONLY under bats / LOA_SOUL_TEST_MODE=1 with a
# bats-detected ancestor. Mirrors L4/L6 cycle-098 patterns.
# -----------------------------------------------------------------------------
_l7_test_mode_active() {
    local test_file test_dir pid command_line depth=0
    # cycle-098 sprint-7 cypherpunk CRIT-1 remediation: require BOTH a
    # verified bats process AND opt-in `LOA_SOUL_TEST_MODE=1`. Mirrors the
    # lib-side gate at .claude/scripts/lib/soul-identity-lib.sh.
    [[ "${LOA_SOUL_TEST_MODE:-0}" == "1" ]] || return 1
    test_file="${BATS_TEST_FILENAME:-}"
    [[ -n "$test_file" && -f "$test_file" && "$test_file" == *.bats ]] || return 1
    test_dir="$(cd "$(dirname "$test_file")" 2>/dev/null && pwd -P)" || return 1
    case "${test_dir}/" in
        "${REPO_ROOT}/tests/"*) ;;
        *) return 1 ;;
    esac

    pid="${PPID:-}"
    while [[ "$pid" =~ ^[1-9][0-9]*$ ]] && (( depth < 12 )); do
        command_line="$(/bin/ps -o command= -p "$pid" 2>/dev/null || true)"
        case "$command_line" in
            *bats-exec-test*|*bats-exec-file*|*/bats-core/*|*/bin/bats\ *) return 0 ;;
        esac
        pid="$(/bin/ps -o ppid= -p "$pid" 2>/dev/null | tr -d '[:space:]')"
        depth=$((depth + 1))
    done
    return 1
}

config_path="${REPO_ROOT}/.loa.config.yaml"
if _l7_test_mode_active && [[ -n "${LOA_SOUL_TEST_CONFIG:-}" ]]; then
    config_path="$LOA_SOUL_TEST_CONFIG"
fi

# Gate on yq availability + config presence.
command -v yq >/dev/null 2>&1 || exit 0
[[ -f "$config_path" ]] || exit 0

# Read enable / mode / max-chars / path keys. Silent on malformed YAML
# (each yq returns the default).
enabled="$(yq '.soul_identity_doc.enabled // false' "$config_path" 2>/dev/null || echo false)"
[[ "$enabled" == "true" ]] || exit 0

schema_mode="$(yq '.soul_identity_doc.schema_mode // "warn"' "$config_path" 2>/dev/null || echo warn)"
case "$schema_mode" in
    strict|warn) ;;
    *) schema_mode="warn" ;;
esac

max_chars="$(yq '.soul_identity_doc.surface_max_chars // 2000' "$config_path" 2>/dev/null || echo 2000)"
case "$max_chars" in
    ''|*[!0-9]*) max_chars=2000 ;;
esac

# Resolve SOUL.md path:
#   1) LOA_SOUL_TEST_PATH (test-mode only)
#   2) .loa.config.yaml::soul_identity_doc.path (absolute or repo-relative)
#   3) ${REPO_ROOT}/SOUL.md
soul_path="${REPO_ROOT}/SOUL.md"
if _l7_test_mode_active && [[ -n "${LOA_SOUL_TEST_PATH:-}" ]]; then
    soul_path="$LOA_SOUL_TEST_PATH"
else
    cfg_path="$(yq '.soul_identity_doc.path // ""' "$config_path" 2>/dev/null || echo "")"
    if [[ -n "$cfg_path" && "$cfg_path" != "null" ]]; then
        # cycle-098 sprint-7 cypherpunk HIGH-1 remediation: reject `..`
        # substrings in the configured path before any resolution. The
        # intent of `path:` is repo-local override, never traversal.
        if [[ "$cfg_path" == *..* ]]; then
            exit 0
        fi
        if [[ "$cfg_path" == /* ]]; then
            soul_path="$cfg_path"
        else
            if _l7_test_mode_active; then
                # Relative path resolves relative to the test config's directory.
                soul_path="$(dirname "$config_path")/$cfg_path"
            else
                soul_path="${REPO_ROOT}/$cfg_path"
            fi
        fi
    fi
fi

# cycle-098 sprint-7 cypherpunk HIGH-1 remediation: enforce REPO_ROOT
# containment in production. A malicious `.loa.config.yaml::soul_identity_doc.
# path: /etc/passwd` (or symlink-into-repo pointing at /etc/...) would
# otherwise read attacker-chosen files into the LLM session as
# <untrusted-content>. Test-mode is exempt because tests legitimately use
# fixtures under TEST_DIR (mktemp outside REPO_ROOT). Mirrors the cycle-099
# sprint-1E.c.3.b allowlist-tree-restriction pattern.
canonical_root="$REPO_ROOT"
if ! _l7_test_mode_active; then
    canonical_root="$(resolve_path_portable "$REPO_ROOT" 2>/dev/null || echo "")"
    canonical_path="$(resolve_path_portable "$soul_path" 2>/dev/null || echo "")"
    if [[ -z "$canonical_root" || -z "$canonical_path" ]]; then
        exit 0
    fi
    case "$canonical_path" in
        "$canonical_root"|"$canonical_root"/*) ;;
        *) exit 0 ;;
    esac
fi

# Silent on missing file (FR-L7-6) — no audit event for "the file just
# wasn't there"; that's not an L7 lifecycle event worth chaining.
[[ -f "$soul_path" ]] || exit 0

# Cross-process single-fire. Environment exports cannot propagate from a hook
# child back to the runner, so use the host session id (env or hook JSON stdin)
# as the retry-boundary identity. The marker is local ephemeral state, owned by
# this user, and scoped by repository.
session_id="${LOA_L7_SESSION_ID:-}"
if ! _l7_test_mode_active && [[ -z "$session_id" ]]; then
    session_id="${CLAUDE_SESSION_ID:-${CODEX_SESSION_ID:-}}"
fi
if ! _l7_test_mode_active && [[ -z "$session_id" && ! -t 0 && -x "$(command -v jq 2>/dev/null)" ]]; then
    hook_input="$(cat 2>/dev/null || true)"
    session_id="$(printf '%s' "$hook_input" | jq -r '.session_id // empty' 2>/dev/null || true)"
fi
if [[ "$session_id" =~ ^[A-Za-z0-9._-]{1,128}$ ]]; then
    marker_base="${TMPDIR:-/tmp}/loa-l7-surface-${UID:-$(id -u)}"
    if [[ -e "$marker_base" && ( ! -d "$marker_base" || -L "$marker_base" || ! -O "$marker_base" ) ]]; then
        exit 0
    fi
    umask 077
    mkdir -p "$marker_base" 2>/dev/null || exit 0
    chmod 700 "$marker_base" 2>/dev/null || exit 0
    repo_scope="$(printf '%s' "$canonical_root" | cksum | awk '{print $1}')"
    marker="${marker_base}/${session_id}-${repo_scope}.done"
    mkdir "$marker" 2>/dev/null || exit 0
fi

# Source lib (after preflight gates pass — keeps no-op exit fast).
# shellcheck source=/dev/null
source "$LIB" 2>/dev/null || exit 0

# Lib uses `set -euo pipefail`. Disable -e for our error-tolerant flow.
set +e

# Validate (capture stdout+stderr together; status separately).
validate_out="$(soul_validate "$soul_path" --"$schema_mode" 2>&1)"
validate_status=$?

# Outcome resolution:
#   strict + non-zero → schema-refused (no surface; audit event recorded)
#   warn + SCHEMA-WARNING-marker present → schema-warning (surface with marker)
#   else → surfaced
outcome="surfaced"
if [[ "$schema_mode" == "strict" && "$validate_status" -ne 0 ]]; then
    outcome="schema-refused"
elif [[ "$schema_mode" == "warn" && "$validate_out" == *"SCHEMA-WARNING"* ]]; then
    outcome="schema-warning"
fi

# Build payload (best-effort; degrade to empty on lib error).
payload="$(soul_compute_surface_payload "$soul_path" "$schema_mode" "$outcome" 2>/dev/null)"
[[ -z "$payload" ]] && payload='{"file_path":"SOUL.md","schema_version":"1.0","schema_mode":"warn","identity_for":"this-repo","outcome":"surfaced"}'

# Emit audit event (silent — stderr/stdout suppressed; failures non-fatal).
soul_emit "soul.surface" "$payload" >/dev/null 2>&1 || true

# Surface body unless strict-refused.
if [[ "$outcome" != "schema-refused" ]]; then
    if [[ "$outcome" == "schema-warning" && -n "$validate_out" ]]; then
        # Print only the SCHEMA-WARNING lines; skip any noise.
        while IFS= read -r line; do
            [[ "$line" == *"SCHEMA-WARNING"* ]] && printf '%s\n' "$line"
        done <<<"$validate_out"
    fi
    soul_load "$soul_path" --max-chars "$max_chars" 2>/dev/null || true
fi

export LOA_L7_SURFACED=1
set -e
exit 0

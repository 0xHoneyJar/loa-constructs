#!/usr/bin/env bash
# =============================================================================
# session-cap-fanout.sh — translate session_cap config into L3 schedules +
# a marker-delimited crontab block.
#
# cycle-117 Wave-2 item B (bd-c117-b-fanout-5ggb). Takes each configured
# `session_cap.reset_windows` x `session_cap.post_reset_fanout.phases` pair
# and materializes:
#   (a) an L3 ScheduleConfig YAML at .run/schedules/session-cap-fanout-w<idx>-
#       <phase>.yaml, validated via `scheduled-cycle-lib.sh register` before
#       anything is installed (install aborts on any registration failure);
#   (b) a real, idempotent crontab entry with deterministic per-repo minute
#       jitter that never lands on :00 or :30.
#
# SCOPE NOTE (bd-fanout-real-dispatch-9jv6, Tranche 1): the `bridgebuilder`
# phase now dispatches a REAL review — its dispatch_contract points at the
# session-cap-bb reader/decider/dispatcher/awaiter/logger scripts under
# .claude/skills/scheduled-cycle-template/contracts/session-cap-bb/. The
# earlier claim that bridgebuilder-review "has no standalone CLI entrypoint"
# was FALSE: resources/entry.sh -> dist/main.js is a real headless entrypoint
# that spiral-harness.sh already fires unattended, and BB with no --pr
# self-discovers open PRs + dedups. The session-cap-bb decider is FAIL-CLOSED
# (dispatch only when the captured snapshot shows an interrupted sprint-plan or
# bridge lifecycle state), so a reset window where nothing was in flight is
# still a no-op.
# The `flatline` and `red_team` phases REMAIN shipped no-op example-*.sh
# placeholders (Tranche 2, deferred): unlike BB, both hard-require an explicit
# --doc <path> and cannot auto-resolve a target from the session-limit snapshot
# — wiring them needs an operator decision on current-state vs resume-exact
# doc-targeting semantics.
#
# Modeled on .claude/scripts/budget/budget-reconcile-install.sh and
# .claude/scripts/audit/audit-snapshot-install.sh (same subcommand shape,
# same marker-comment convention, same yq/python3-fallback config read).
#
# Subcommands:
#   install [--dry-run]   Generate YAMLs, register() each via the L3 lib,
#                          then install the crontab block. Refuses (exit 0)
#                          unless session_cap.post_reset_fanout.enabled is
#                          literally true. --dry-run generates into a scratch
#                          dir and prints the YAMLs + would-be crontab block
#                          with ZERO writes to .run/schedules/ or crontab.
#   uninstall | --off     Remove exactly the loa-cycle117-session-cap-fanout
#                          marker block from crontab. Runs regardless of the
#                          enabled flag so flipping to false can be cleaned up.
#   status                Print whether the crontab block is installed.
#   show                  Print the YAMLs + crontab block that WOULD install
#                          (side-effect free; ignores the enabled flag).
#
# Config (.loa.config.yaml — see .loa.config.yaml.example for full docs):
#   session_cap:
#     reset_windows: ["HH:MM <IANA-TZ>", ...]
#     post_reset_fanout:
#       enabled: false
#       phases: [flatline, bridgebuilder, red_team]
#       cron_jitter_min: 7                    # integer 1..59; else default 7
#
# Env overrides:
#   LOA_SESSION_CAP_CONFIG_FILE      override .loa.config.yaml path
#   LOA_SESSION_CAP_SCHEDULES_DIR    override .run/schedules output dir
#                                      (testability — production installs
#                                      write .run/schedules/ of the repo the
#                                      script lives in)
#
# Marker convention: `# loa-cycle117-session-cap-fanout BEGIN` / `... END`
# =============================================================================

set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_REPO_ROOT="$(cd "${_SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=/dev/null
source "${_SCRIPT_DIR}/compat-lib.sh"

_LIB="${_REPO_ROOT}/.claude/scripts/lib/scheduled-cycle-lib.sh"
_CONTRACTS_REL=".claude/skills/scheduled-cycle-template/contracts"
# Real bridgebuilder dispatch contract (bd-fanout-real-dispatch-9jv6 T1).
_CONTRACTS_BB_REL="${_CONTRACTS_REL}/session-cap-bb"
# Per-phase stagger (minutes) so multiple phases in ONE reset window fire at
# DISTINCT minutes rather than simultaneously. 7 is coprime to 60, so phase_idx
# * 7 (mod 60) is distinct for every realistic phase count, and the >1-minute
# spacing survives _final_minute's off-:00/:30 nudge without collisions.
_PHASE_STAGGER_MIN=7
# Real multi-model BB budget for the bridgebuilder schedule. Bounded by the L3
# projected-cycle guard (timeout_seconds x 5 phases must be <= max_cycle_seconds,
# default 14400), so 1800s (30m) is the generous-but-safe ceiling — raise both
# together if a real BB run needs longer.
_BB_TIMEOUT_SECONDS=1800
_LOG_PATH="${_REPO_ROOT}/.run/session-cap-fanout-cron.log"
MARKER_BEGIN="# loa-cycle117-session-cap-fanout BEGIN"
MARKER_END="# loa-cycle117-session-cap-fanout END"
PLACEHOLDER_BODY="with placeholder phases -- real dispatch: bd-fanout-real-dispatch-9jv6"
PLACEHOLDER_NOTE="ARMED ${PLACEHOLDER_BODY}"

_schedules_dir() {
    echo "${LOA_SESSION_CAP_SCHEDULES_DIR:-${_REPO_ROOT}/.run/schedules}"
}

usage() {
    sed -n '2,52p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'
    exit 0
}

_config_path() {
    echo "${LOA_SESSION_CAP_CONFIG_FILE:-${_REPO_ROOT}/.loa.config.yaml}"
}

# -----------------------------------------------------------------------------
# Config readers — yq preferred, python3+PyYAML fallback (house convention;
# see budget-reconcile-install.sh / audit-snapshot-install.sh).
# -----------------------------------------------------------------------------

read_reset_windows() {
    local config
    config="$(_config_path)"
    [[ -f "$config" ]] || return 0
    if command -v yq >/dev/null 2>&1; then
        yq -r '.session_cap.reset_windows[]' "$config" 2>/dev/null || true
        return 0
    fi
    python3 - "$config" <<'PY' 2>/dev/null || true
import sys
try:
    import yaml
except ImportError:
    sys.exit(0)
try:
    with open(sys.argv[1]) as f:
        doc = yaml.safe_load(f) or {}
except Exception:
    sys.exit(0)
for w in ((doc.get('session_cap') or {}).get('reset_windows') or []):
    print(w)
PY
}

read_fanout_enabled() {
    local config
    config="$(_config_path)"
    if [[ ! -f "$config" ]]; then echo "false"; return 0; fi
    if command -v yq >/dev/null 2>&1; then
        local v
        v="$(yq -r '.session_cap.post_reset_fanout.enabled // false' "$config" 2>/dev/null || echo false)"
        [[ -z "$v" || "$v" == "null" ]] && v="false"
        echo "$v"
        return 0
    fi
    python3 - "$config" <<'PY' 2>/dev/null || echo false
import sys
try:
    import yaml
except ImportError:
    print("false"); sys.exit(0)
try:
    with open(sys.argv[1]) as f:
        doc = yaml.safe_load(f) or {}
except Exception:
    print("false"); sys.exit(0)
v = ((doc.get('session_cap') or {}).get('post_reset_fanout') or {}).get('enabled', False)
print("true" if v else "false")
PY
}

read_fanout_phases() {
    local config default_phases
    config="$(_config_path)"
    default_phases="flatline
bridgebuilder
red_team"
    if [[ ! -f "$config" ]]; then printf '%s\n' "$default_phases"; return 0; fi
    if command -v yq >/dev/null 2>&1; then
        local out
        out="$(yq -r '.session_cap.post_reset_fanout.phases[]' "$config" 2>/dev/null || true)"
        if [[ -z "$out" ]]; then printf '%s\n' "$default_phases"; else printf '%s\n' "$out"; fi
        return 0
    fi
    python3 - "$config" <<'PY' 2>/dev/null || printf '%s\n' "$default_phases"
import sys
try:
    import yaml
except ImportError:
    sys.exit(1)
try:
    with open(sys.argv[1]) as f:
        doc = yaml.safe_load(f) or {}
except Exception:
    sys.exit(1)
phases = ((doc.get('session_cap') or {}).get('post_reset_fanout') or {}).get('phases')
if not phases:
    phases = ["flatline", "bridgebuilder", "red_team"]
for p in phases:
    print(p)
PY
}

# read_cron_jitter_min — default 7; validated integer in [1,59], else 7
# (division-by-zero guard for the jitter modulo below).
read_cron_jitter_min() {
    local config v
    config="$(_config_path)"
    v="7"
    if [[ -f "$config" ]]; then
        if command -v yq >/dev/null 2>&1; then
            v="$(yq -r '.session_cap.post_reset_fanout.cron_jitter_min // 7' "$config" 2>/dev/null || echo 7)"
        else
            v="$(python3 - "$config" <<'PY' 2>/dev/null || echo 7
import sys
try:
    import yaml
except ImportError:
    print(7); sys.exit(0)
try:
    with open(sys.argv[1]) as f:
        doc = yaml.safe_load(f) or {}
except Exception:
    print(7); sys.exit(0)
v = ((doc.get('session_cap') or {}).get('post_reset_fanout') or {}).get('cron_jitter_min', 7)
print(v if v is not None else 7)
PY
)"
        fi
    fi
    [[ -z "$v" || "$v" == "null" ]] && v=7
    if ! [[ "$v" =~ ^[0-9]+$ ]] || (( v < 1 || v > 59 )); then
        v=7
    fi
    echo "$v"
}

# -----------------------------------------------------------------------------
# Jitter — deterministic per-repo minute offset via sha256_portable (NEVER
# raw sha256sum; tools/check-no-raw-sha256sum.sh hard-fails CI on that).
# Offset is always in [1, jitter_min] (never 0), so the fire time is always
# strictly AFTER the configured reset. Final minute is nudged off :00/:30.
# -----------------------------------------------------------------------------

_jitter_offset() {
    local jitter_min="$1"
    local h dec
    h="$(printf '%s' "$_REPO_ROOT" | sha256_portable | awk '{print $1}' | cut -c1-8)"
    dec=$((16#$h))
    echo $(( (dec % jitter_min) + 1 ))
}

# _final_time <base_hour> <base_minute> <offset> — add the complete offset,
# including hour/day rollover, then nudge off :00/:30. Echoes "<hour> <minute>".
_final_time() {
    local base_hour="$1" base_minute="$2" offset="$3" total hour minute
    total=$(( (base_hour * 60 + base_minute + offset) % 1440 ))
    hour=$(( total / 60 ))
    minute=$(( total % 60 ))
    while (( minute == 0 || minute == 30 )); do
        total=$(( (total + 1) % 1440 ))
        hour=$(( total / 60 ))
        minute=$(( total % 60 ))
    done
    printf '%s %s\n' "$hour" "$minute"
}

# _available_final_time <base_hour> <base_minute> <offset> <used-set>
# Normalizes first, then re-checks uniqueness because the :00/:30 nudge can
# collapse two previously distinct candidates onto one final wall-clock time.
_available_final_time() {
    local base_hour="$1" base_minute="$2" offset="$3" used_times="$4"
    local hour minute time_key collision_steps=0
    read -r hour minute < <(_final_time "$base_hour" "$base_minute" "$offset")
    time_key="${hour}:${minute}"
    while [[ "$used_times" == *"|${time_key}|"* ]]; do
        read -r hour minute < <(_final_time "$hour" "$minute" 1)
        time_key="${hour}:${minute}"
        collision_steps=$((collision_steps + 1))
        (( collision_steps < 1440 )) || return 1
    done
    printf '%s %s\n' "$hour" "$minute"
}

_system_tz() {
    local tz
    tz="$(timedatectl show -p Timezone --value 2>/dev/null \
        || cat /etc/timezone 2>/dev/null \
        || echo UTC)"
    _valid_timezone "$tz" && printf '%s\n' "$tz" || printf 'UTC\n'
}

_valid_timezone() {
    local tz="$1"
    [[ "$tz" =~ ^[A-Za-z0-9_+-]+(/[A-Za-z0-9_+-]+)*$ ]] || return 1
    [[ "$tz" != *".."* ]] || return 1
    [[ "$tz" == "UTC" || -f "/usr/share/zoneinfo/${tz}" ]]
}

_validate_window() {
    local window="$1"
    [[ "$window" =~ ^([0-9]{2}):([0-9]{2})[[:space:]]+([^[:space:]]+)$ ]] || return 1
    local hour=$((10#${BASH_REMATCH[1]})) minute=$((10#${BASH_REMATCH[2]})) tz="${BASH_REMATCH[3]}"
    (( hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 )) || return 1
    _valid_timezone "$tz"
}

_validate_phase() {
    [[ "$1" =~ ^[a-z][a-z0-9_-]{0,63}$ ]]
}

# CRON_TZ changes scheduler interpretation; TZ alone only changes the command
# environment. Fail closed unless the installed implementation advertises the
# directive, with an explicit override for known managed fleet images/tests.
_cron_tz_supported() {
    case "${LOA_SESSION_CAP_CRON_TZ_SUPPORTED:-auto}" in
        true) return 0 ;;
        false) return 1 ;;
        auto) ;;
        *) return 1 ;;
    esac

    local candidate out
    for candidate in crond cron crontab; do
        command -v "$candidate" >/dev/null 2>&1 || continue
        out="$($candidate -V 2>&1 || $candidate --version 2>&1 || true)"
        [[ "${out,,}" == *"cronie"* ]] && return 0
    done
    if command -v man >/dev/null 2>&1; then
        out="$(MANPAGER=cat PAGER=cat man 5 crontab 2>/dev/null || true)"
        [[ "$out" == *"CRON_TZ"* ]] && return 0
    fi
    return 1
}

# -----------------------------------------------------------------------------
# YAML generation
# -----------------------------------------------------------------------------

_generate_yaml() {
    local schedule_id="$1" cron_minute="$2" cron_hour="$3" window_tz="$4" phase="$5"
    if [[ "$phase" == "bridgebuilder" ]]; then
        cat <<YAML
# GENERATED by session-cap-fanout.sh -- regenerated on every install, do not
# hand-edit. REAL bridgebuilder dispatch (bd-fanout-real-dispatch-9jv6 T1):
# dispatch_contract points at the session-cap-bb phase scripts. The decider is
# FAIL-CLOSED -- it only fires bridgebuilder-review's headless entrypoint
# (resources/entry.sh, the same one spiral-harness.sh already runs unattended)
# when the captured session-limit snapshot shows an interrupted active state;
# otherwise it is a no-op. Arming this posts LIVE PR review comments unattended
# on cron.
# window_tz: ${window_tz} (informational; the crontab CRON_TZ= line carries the
# actual timezone this schedule's hour/minute are LOCAL to)
schedule_id: ${schedule_id}
schedule: "${cron_minute} ${cron_hour} * * *"
dispatch_contract:
  reader:     "${_CONTRACTS_BB_REL}/reader.sh"
  decider:    "${_CONTRACTS_BB_REL}/decider.sh"
  dispatcher: "${_CONTRACTS_BB_REL}/dispatcher.sh"
  awaiter:    "${_CONTRACTS_BB_REL}/awaiter.sh"
  logger:     "${_CONTRACTS_BB_REL}/logger.sh"
  budget_estimate_usd: 0
  timeout_seconds: ${_BB_TIMEOUT_SECONDS}
YAML
    else
        cat <<YAML
# GENERATED by session-cap-fanout.sh -- regenerated on every install, do not
# hand-edit. PLACEHOLDER (Tranche 2, deferred): dispatch_contract points at the
# shipped no-op example-*.sh phase scripts. Real "${phase}" dispatch needs an
# operator decision on current-state vs resume-exact doc-targeting semantics
# (bd-fanout-real-dispatch-9jv6 Tranche 2) -- flatline/red_team hard-require an
# explicit --doc <path> that the session-limit snapshot does not carry.
# window_tz: ${window_tz} (informational; the crontab CRON_TZ= line carries the
# actual timezone this schedule's hour/minute are LOCAL to)
schedule_id: ${schedule_id}
schedule: "${cron_minute} ${cron_hour} * * *"
dispatch_contract:
  reader:     "${_CONTRACTS_REL}/example-reader.sh"
  decider:    "${_CONTRACTS_REL}/example-decider.sh"
  dispatcher: "${_CONTRACTS_REL}/example-dispatcher.sh"
  awaiter:    "${_CONTRACTS_REL}/example-awaiter.sh"
  logger:     "${_CONTRACTS_REL}/example-logger.sh"
  budget_estimate_usd: 0
  timeout_seconds: 300
YAML
    fi
}

# -----------------------------------------------------------------------------
# _plan <target_dir>
#
# Reads config, generates one YAML per (window x phase) into <target_dir>,
# registers each via the L3 lib (abort-on-first-failure), and populates the
# global CRON_LINES array ("tz|<cron line text>"). Returns 1 (target_dir left
# as-is for caller cleanup) if reset_windows is empty or any register fails.
# -----------------------------------------------------------------------------
CRON_LINES=()

_plan() {
    local target_dir="$1"
    CRON_LINES=()

    local windows=()
    local seen_windows="|"
    while IFS= read -r _w; do
        [[ -n "$_w" ]] || continue
        if [[ "$seen_windows" == *"|${_w}|"* ]]; then
            echo "ERROR: duplicate reset window: ${_w}" >&2
            return 1
        fi
        seen_windows="${seen_windows}${_w}|"
        windows+=("$_w")
    done < <(read_reset_windows)
    if [[ ${#windows[@]} -eq 0 ]]; then
        echo "session_cap.reset_windows is empty; nothing to plan." >&2
        return 2
    fi

    local phases=()
    local seen_phases="|"
    while IFS= read -r _p; do
        [[ -n "$_p" ]] || continue
        if ! _validate_phase "$_p"; then
            echo "ERROR: invalid fanout phase: ${_p}" >&2
            return 1
        fi
        if [[ "$seen_phases" == *"|${_p}|"* ]]; then
            echo "ERROR: duplicate fanout phase: ${_p}" >&2
            return 1
        fi
        seen_phases="${seen_phases}${_p}|"
        phases+=("$_p")
    done < <(read_fanout_phases)
    if [[ ${#phases[@]} -eq 0 ]]; then
        echo "ERROR: fanout phases are empty" >&2
        return 1
    fi

    local jitter_min offset
    jitter_min="$(read_cron_jitter_min)"
    offset="$(_jitter_offset "$jitter_min")"

    local schedules_dir
    schedules_dir="$(_schedules_dir)"

    local idx=0 window
    for window in "${windows[@]}"; do
        if ! _validate_window "$window"; then
            echo "ERROR: invalid reset window (expected HH:MM IANA/Timezone): ${window}" >&2
            return 1
        fi
        local time_part tz_part hour minute
        time_part="${window%% *}"
        tz_part="${window#* }"
        hour="${time_part%%:*}"
        minute="${time_part##*:}"
        hour=$((10#$hour))
        minute=$((10#$minute))

        local phase phase_idx=0 final_hour final_minute
        local used_times="|"
        for phase in "${phases[@]}"; do
            # Per-phase deterministic stagger: each phase in this window fires at
            # a DISTINCT minute (base per-repo jitter + phase_idx * stagger),
            # still nudged off :00/:30 by _final_time. Without this, every
            # phase in one reset window fired at the identical minute
            # (bd-fanout-real-dispatch-9jv6 T1).
            if ! read -r final_hour final_minute < <(_available_final_time \
                "$hour" "$minute" "$((offset + phase_idx * _PHASE_STAGGER_MIN))" "$used_times"); then
                echo "ERROR: no unique cron minute remains for window ${window}" >&2
                return 1
            fi
            local time_key="${final_hour}:${final_minute}"
            used_times="${used_times}${time_key}|"
            local schedule_id="session-cap-fanout-w${idx}-${phase}"
            local yaml_path="${target_dir}/${schedule_id}.yaml"
            _generate_yaml "$schedule_id" "$final_minute" "$final_hour" "$tz_part" "$phase" > "$yaml_path"

            if ! "$_LIB" register "$yaml_path" >/dev/null; then
                echo "ERROR: register failed for ${yaml_path}; aborting" >&2
                return 1
            fi

            local final_yaml_path="${schedules_dir}/${schedule_id}.yaml"
            local q_root q_lib q_yaml q_log invoke_cmd
            printf -v q_root '%q' "$_REPO_ROOT"
            printf -v q_lib '%q' "$_LIB"
            printf -v q_yaml '%q' "$final_yaml_path"
            printf -v q_log '%q' "$_LOG_PATH"
            invoke_cmd="cd ${q_root} && ${q_lib} invoke ${q_yaml} >> ${q_log} 2>&1"
            CRON_LINES+=("${tz_part}|${final_minute} ${final_hour} * * * ${invoke_cmd}  # loa-cycle117-session-cap-fanout w${idx}:${phase}")
            phase_idx=$((phase_idx + 1))
        done
        idx=$((idx + 1))
    done
    return 0
}

# -----------------------------------------------------------------------------
# Crontab block assembly (grouped by scheduler CRON_TZ and command-environment
# TZ, LC_ALL=C sort for determinism; final lines reset both to system default).
# -----------------------------------------------------------------------------

_build_crontab_block() {
    local -a tzs=()
    local seen="|" line tz
    for line in "${CRON_LINES[@]}"; do
        tz="${line%%|*}"
        case "$seen" in
            *"|${tz}|"*) ;;
            *) seen="${seen}${tz}|"; tzs+=("$tz") ;;
        esac
    done
    local sorted_tzs
    sorted_tzs="$(printf '%s\n' "${tzs[@]}" | LC_ALL=C sort)"

    echo "$MARKER_BEGIN"
    echo "# ${PLACEHOLDER_NOTE}"
    echo "# NOTE: CRON_TZ controls scheduler interpretation; TZ controls the"
    echo "# invoked command environment. Both persist, so this managed block"
    echo "# restores each to the system timezone before its end marker."
    local t
    while IFS= read -r t; do
        [[ -z "$t" ]] && continue
        echo "CRON_TZ=${t}"
        echo "TZ=${t}"
        for line in "${CRON_LINES[@]}"; do
            [[ "${line%%|*}" == "$t" ]] && echo "${line#*|}"
        done
    done <<<"$sorted_tzs"
    echo "CRON_TZ=$(_system_tz)"
    echo "TZ=$(_system_tz)"
    echo "$MARKER_END"
}

_restore_managed_schedules() {
    local live_dir="$1" backup_dir="$2" f
    for f in "$live_dir"/session-cap-fanout-w*.yaml; do
        [[ -e "$f" ]] && rm -f "$f"
    done
    for f in "$backup_dir"/*.yaml; do
        [[ -e "$f" ]] && mv "$f" "$live_dir/"
    done
}

_install_staged_schedules() {
    local staged_dir="$1" live_dir="$2" backup_dir="$3" f tmp
    mkdir -p "$live_dir" "$backup_dir" || return 1
    for f in "$live_dir"/session-cap-fanout-w*.yaml; do
        [[ -e "$f" ]] || continue
        if ! mv "$f" "$backup_dir/"; then
            _restore_managed_schedules "$live_dir" "$backup_dir"
            return 1
        fi
    done
    for f in "$staged_dir"/*.yaml; do
        [[ -e "$f" ]] || continue
        tmp="${live_dir}/.$(basename "$f").tmp.$$"
        if ! cp "$f" "$tmp" || ! mv -f "$tmp" "${live_dir}/$(basename "$f")"; then
            rm -f "$tmp"
            _restore_managed_schedules "$live_dir" "$backup_dir"
            return 1
        fi
    done
}

_strip_managed_block() {
    local existing="$1"
    awk -v b="$MARKER_BEGIN" -v e="$MARKER_END" '
        $0==b {skip=1; next}
        $0==e {skip=0; next}
        skip!=1 {print}
    ' <<<"$existing"
}

# -----------------------------------------------------------------------------
# Subcommands
# -----------------------------------------------------------------------------

cmd_install() {
    local dry_run=0
    while (( $# )); do
        case "$1" in
            --dry-run) dry_run=1; shift ;;
            *) echo "unknown install arg: $1" >&2; return 2 ;;
        esac
    done

    local enabled
    enabled="$(read_fanout_enabled)"
    if [[ "$enabled" != "true" ]]; then
        echo "session_cap.post_reset_fanout.enabled is not true; nothing to install."
        return 0
    fi

    local target_dir rc=0
    target_dir="$(mktemp -d)"

    if _plan "$target_dir"; then
        rc=0
    else
        rc=$?
    fi
    if (( rc != 0 )); then
        rm -rf "$target_dir"
        if (( rc == 2 )); then
            echo "Nothing to install."
            return 0
        fi
        return 1
    fi

    if (( dry_run )); then
        echo "WOULD ARM ${PLACEHOLDER_BODY} (dry-run: no writes to $(_schedules_dir), no crontab changes)"
        echo "--- Generated YAMLs (would be written to $(_schedules_dir)/) ---"
        local f
        for f in "$target_dir"/*.yaml; do
            echo "== $(_schedules_dir)/$(basename "$f") =="
            cat "$f"
        done
        echo "--- Would-be crontab block ---"
        _build_crontab_block
        rm -rf "$target_dir"
        return 0
    fi

    echo "$PLACEHOLDER_NOTE"
    if ! command -v crontab >/dev/null 2>&1; then
        rm -rf "$target_dir"
        echo "crontab not available on this system" >&2
        return 1
    fi
    if ! _cron_tz_supported; then
        rm -rf "$target_dir"
        echo "crontab does not advertise CRON_TZ support; refusing timezone-unsafe install" >&2
        echo "Set LOA_SESSION_CAP_CRON_TZ_SUPPORTED=true only for a verified implementation." >&2
        return 1
    fi
    local existing new_block
    existing="$(crontab -l 2>/dev/null || true)"
    new_block="$(_build_crontab_block)"
    local live_dir backup_dir
    live_dir="$(_schedules_dir)"
    backup_dir="$(mktemp -d)"
    if ! _install_staged_schedules "$target_dir" "$live_dir" "$backup_dir"; then
        rm -rf "$target_dir" "$backup_dir"
        echo "failed to install staged schedules; existing schedules restored" >&2
        return 1
    fi
    if ! printf '%s\n%s\n' "$(_strip_managed_block "$existing")" "$new_block" | crontab -; then
        _restore_managed_schedules "$live_dir" "$backup_dir"
        rm -rf "$target_dir" "$backup_dir"
        echo "failed to install crontab; existing schedules restored" >&2
        return 1
    fi
    rm -rf "$target_dir" "$backup_dir"
    echo "Installed ${#CRON_LINES[@]} session-cap-fanout crontab entries."
}

cmd_uninstall() {
    if ! command -v crontab >/dev/null 2>&1; then
        echo "crontab not available on this system" >&2
        return 1
    fi
    local existing
    existing="$(crontab -l 2>/dev/null || true)"
    if ! printf '%s\n' "$existing" | grep -qF "$MARKER_BEGIN"; then
        echo "Not installed; nothing to remove."
        return 0
    fi
    printf '%s\n' "$(_strip_managed_block "$existing")" | crontab -
    echo "Uninstalled session-cap-fanout crontab block."
}

cmd_status() {
    if ! command -v crontab >/dev/null 2>&1; then
        echo "crontab not available on this system"
        return 1
    fi
    local existing
    existing="$(crontab -l 2>/dev/null || true)"
    if printf '%s\n' "$existing" | grep -qF "$MARKER_BEGIN"; then
        echo "INSTALLED"
        awk -v b="$MARKER_BEGIN" -v e="$MARKER_END" '$0==b{f=1} f{print} $0==e{f=0}' <<<"$existing"
        return 0
    fi
    echo "NOT-INSTALLED"
    return 0
}

cmd_show() {
    local target_dir rc
    target_dir="$(mktemp -d)"
    if _plan "$target_dir"; then
        rc=0
    else
        rc=$?
    fi
    if (( rc != 0 )); then
        rm -rf "$target_dir"
        if (( rc == 2 )); then
            echo "Nothing to show."
            return 0
        fi
        return 1
    fi
    echo "--- Generated YAMLs (would be written to $(_schedules_dir)/) ---"
    local f
    for f in "$target_dir"/*.yaml; do
        echo "== $(_schedules_dir)/$(basename "$f") =="
        cat "$f"
    done
    echo "--- Would-be crontab block ---"
    _build_crontab_block
    rm -rf "$target_dir"
}

# -----------------------------------------------------------------------------
# CLI dispatcher — guarded so tests can `source` this file to reach internal
# functions (jitter math, YAML generation) without triggering a subcommand.
# -----------------------------------------------------------------------------
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    cmd="${1:-}"
    shift || true
    case "$cmd" in
        install)         cmd_install "$@" ;;
        uninstall|--off)  cmd_uninstall ;;
        status)           cmd_status ;;
        show)             cmd_show ;;
        --help|-h|"")     usage ;;
        *) echo "unknown subcommand: $cmd" >&2; exit 2 ;;
    esac
fi

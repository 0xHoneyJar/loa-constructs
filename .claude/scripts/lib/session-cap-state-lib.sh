#!/usr/bin/env bash
# Filesystem trust contract for session-cap authorization state.

_session_cap_state_owner() {
    if [[ "$(uname -s)" == "Darwin" ]]; then
        stat -f '%u' "$1" 2>/dev/null
    else
        stat -c '%u' "$1" 2>/dev/null
    fi
}

_session_cap_state_mode() {
    if [[ "$(uname -s)" == "Darwin" ]]; then
        stat -f '%Lp' "$1" 2>/dev/null
    else
        stat -c '%a' "$1" 2>/dev/null
    fi
}

session_cap_prepare_state_dir() {
    local dir="$1" owner
    [[ ! -L "$dir" ]] || return 1
    if [[ ! -e "$dir" ]]; then
        (umask 077 && mkdir "$dir") || return 1
    fi
    [[ -d "$dir" ]] || return 1
    owner="$(_session_cap_state_owner "$dir")" || return 1
    [[ "$owner" == "$(id -u)" ]] || return 1
    chmod 700 "$dir"
}

session_cap_state_file_is_secure() {
    local file="$1" owner mode
    [[ -f "$file" && ! -L "$file" ]] || return 1
    owner="$(_session_cap_state_owner "$file")" || return 1
    mode="$(_session_cap_state_mode "$file")" || return 1
    [[ "$owner" == "$(id -u)" && "$mode" =~ ^0?600$ ]]
}

#!/usr/bin/env bash
# Private, atomic cross-phase handoff helpers for the session-cap contract.

_session_cap_handoff_owner() {
    if [[ "$(uname -s)" == "Darwin" ]]; then
        stat -f '%u' "$1" 2>/dev/null
    else
        stat -c '%u' "$1" 2>/dev/null
    fi
}

_session_cap_handoff_mode() {
    if [[ "$(uname -s)" == "Darwin" ]]; then
        stat -f '%Lp' "$1" 2>/dev/null
    else
        stat -c '%a' "$1" 2>/dev/null
    fi
}

session_cap_handoff_validate() {
    local dir="$1" owner mode
    [[ -d "$dir" && ! -L "$dir" ]] || return 1
    owner="$(_session_cap_handoff_owner "$dir")" || return 1
    mode="$(_session_cap_handoff_mode "$dir")" || return 1
    [[ "$owner" == "$(id -u)" && "$mode" =~ ^[0-7]{3,4}$ ]] || return 1
    (( (8#$mode & 077) == 0 ))
}

session_cap_handoff_init() {
    local dir="$1"
    [[ ! -e "$dir" && ! -L "$dir" ]] || return 1
    (umask 077 && mkdir -m 700 "$dir") || return 1
    session_cap_handoff_validate "$dir"
}

session_cap_handoff_require() {
    local dir="$1"
    if ! session_cap_handoff_validate "$dir"; then
        echo "session-cap-bb: insecure or missing handoff directory: $dir" >&2
        return 1
    fi
}

session_cap_handoff_write() {
    local path="$1" payload="$2" dir tmp
    dir="$(dirname "$path")"
    session_cap_handoff_require "$dir" || return 1
    tmp="$(umask 077; mktemp "${dir}/.$(basename "$path").tmp.XXXXXX")" || return 1
    if ! printf '%s' "$payload" > "$tmp" || ! chmod 600 "$tmp" || ! mv -f "$tmp" "$path"; then
        rm -f "$tmp"
        return 1
    fi
    printf '%s' "$payload"
}

session_cap_handoff_cleanup() {
    local dir="$1"
    session_cap_handoff_require "$dir" || return 1
    [[ "$(basename "$dir")" == loa-session-cap-bb.* ]] || return 1
    rm -rf "$dir"
}

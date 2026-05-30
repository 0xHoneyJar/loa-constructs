#!/usr/bin/env bash
# scripts/clew/loa-clew-capture.sh — `>>clew` capture hook (C1, SDD §4.1/§4.2)
#
# Phase-1 capture surface. Detects an inline marker in operator input and appends
# a verbatim-preserving learning to the in-scope construct's ledger. Silent on the
# hot path (no stdout); diagnostics to stderr; one trajectory record per capture.
#
# Markers (Phase 1 — EXPLICIT construct only, no embodiment-detection gamble):
#   >>clew@<construct>: <why>            target skill defaults to <construct>
#   >>clew@<construct>/<skill>: <why>    explicit construct + skill
#   >>clew: <why>                        NO @slug → no capture, nudge to disambiguate
#
# Registration (DEFERRED System-Zone step, not done by this script): add to
# .claude/settings.json under hooks.UserPromptSubmit. See scripts/clew/README.md.
set -euo pipefail

CLEW_HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/clew/ledger-append.sh
source "${CLEW_HOOK_DIR}/ledger-append.sh"

CLEW_GRIMOIRE_DIR="${LOA_GRIMOIRE_DIR:-grimoires/loa}"

# Read the operator prompt: UserPromptSubmit pipes JSON {"prompt": "..."} on stdin;
# fall back to argv for direct/test invocation.
_clew_read_prompt() {
  if [[ -n "${1:-}" ]]; then printf '%s' "$*"; return; fi
  local stdin_data; stdin_data="$(cat)"
  if printf '%s' "$stdin_data" | python3 -c 'import json,sys
try:
    d=json.load(sys.stdin); sys.stdout.write(d.get("prompt","") if isinstance(d,dict) else "")
except Exception:
    sys.exit(1)' 2>/dev/null; then
    return
  fi
  printf '%s' "$stdin_data"
}

# Emit a trajectory record (best-effort, never blocks capture).
_clew_trajectory() {
  local action="$1" slug="$2" line_id="$3"
  local dir="${CLEW_GRIMOIRE_DIR}/a2a/trajectory"
  mkdir -p "$dir" 2>/dev/null || return 0
  local date; date="$(date -u +%Y-%m-%d)"
  CLEW_T_ACTION="$action" CLEW_T_SLUG="$slug" CLEW_T_LINE="$line_id" \
    python3 -c 'import json,os,sys,datetime
rec={"timestamp":datetime.datetime.now(datetime.timezone.utc).isoformat(),
     "agent":"construct-clew","action":os.environ["CLEW_T_ACTION"],
     "reasoning":"clew-marker capture","grounding":{"ledger":os.environ["CLEW_T_SLUG"],"line_id":os.environ["CLEW_T_LINE"]}}
sys.stdout.write(json.dumps(rec))' >> "${dir}/construct-clew-${date}.jsonl" 2>/dev/null || true
}

clew_capture() {
  local prompt; prompt="$(_clew_read_prompt "$@")"

  # Find the first line carrying the marker.
  local marker_line=""
  while IFS= read -r line; do
    if [[ "$line" == *">>clew"* ]]; then marker_line="$line"; break; fi
  done <<< "$prompt"
  [[ -n "$marker_line" ]] || return 0   # no marker → pass through silently

  local slugspec why
  if [[ "$marker_line" =~ \>\>clew@([a-z0-9/-]+):[[:space:]]*(.*)$ ]]; then
    slugspec="${BASH_REMATCH[1]}"
    why="${BASH_REMATCH[2]}"
  elif [[ "$marker_line" =~ \>\>clew:[[:space:]]*(.*)$ ]]; then
    # Bare marker — Phase 1 will not guess the construct (FR-2: no silent wrong-ledger write).
    echo "clew: '>>clew' needs an explicit construct in Phase 1 — use '>>clew@<construct>: <why>'." >&2
    return 0
  else
    return 0
  fi

  # Split construct[/skill]; default skill_slug to the construct.
  local construct="${slugspec%%/*}" skill="${slugspec#*/}"
  [[ "$skill" == "$slugspec" ]] && skill="$construct"

  # Trim a single trailing whitespace run from the verbatim quote; preserve the rest.
  why="${why%"${why##*[![:space:]]}"}"
  if [[ -z "$why" ]]; then
    echo "clew: empty capture reason after '>>clew@${slugspec}:' — nothing recorded." >&2
    return 0
  fi

  # Assemble the ledger line in python so the verbatim quote can contain any character.
  local json line_id
  json="$(CLEW_CONSTRUCT="$construct" CLEW_SKILL="$skill" CLEW_WHY="$why" python3 -c '
import json,os,sys,datetime,hashlib
now=datetime.datetime.now(datetime.timezone.utc)
construct=os.environ["CLEW_CONSTRUCT"]; skill=os.environ["CLEW_SKILL"]; why=os.environ["CLEW_WHY"]
h=hashlib.sha1((why+now.isoformat()).encode()).hexdigest()[:6]
line={"id":f"lrn-{now:%Y%m%d}-{construct}-{h}","tier":"construct","type":"correction",
      "trigger":why,
      "target":{"skill_slug":skill,"construct":construct,"confirmed":True},
      "tags":[construct],"verified":False,"captured_by":"clew-marker",
      "captured_at":now.isoformat(),"distilled_at":None,"distill_status":"pending"}
sys.stdout.write(json.dumps(line,separators=(",",":"),ensure_ascii=False))')"
  line_id="$(printf '%s' "$json" | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')"

  # Append (loud on failure — capture is lossy-but-never-silent, SDD §6.1).
  local rc
  set +e; ledger_append "$construct" "$json"; rc=$?; set -e
  if (( rc != 0 )); then
    echo "clew: capture FAILED for @${construct} (rc=$rc) — not recorded (loud, not silent)." >&2
    _clew_trajectory "capture_failed" "$construct" "$line_id"
    return 0   # never block the operator's prompt
  fi
  _clew_trajectory "capture" "$construct" "$line_id"
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  clew_capture "$@"
fi

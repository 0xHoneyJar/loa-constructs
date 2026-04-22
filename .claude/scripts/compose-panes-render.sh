#!/usr/bin/env bash
# =============================================================================
# compose-panes-render.sh — cycle-006 L-frontend pipe graph renderer
# =============================================================================
# Reads a composition YAML + tails its orchestrator.jsonl trajectory, rendering
# a live pipe graph with per-construct colors + emoji glyphs + stream activity.
# Honors doctrine §14.4 (emoji-as-object-refs) + §15.3 (vibe-coding surface).
#
# Swap-in surface: any alternative UI can consume the same orchestrator.jsonl
# stream and render however it prefers. Backend contract documented at
# docs/compose-trajectory-contract.md (cycle-006 L-threadpipe).
#
# Usage:
#   compose-panes-render.sh <composition-name> <run_id> [options]
#
# Options:
#   --compositions-dir DIR  Override grimoires/compositions
#   --one-shot              Render current state once, then exit (no tail)
#   -h, --help
#
# Keyboard:
#   q or Ctrl-C             Exit renderer (run continues in its own pane)
#
# Reads .run/compose/<run_id>/orchestrator.jsonl (created by compose-run.sh).
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
COMPOSITIONS_DIR="${LOA_COMPOSITIONS_DIR:-$PROJECT_ROOT/grimoires/compositions}"
ORCH_DIR_ROOT="${LOA_COMPOSE_ORCH_DIR:-$PROJECT_ROOT/.run/compose}"

COMPOSITION_NAME=""
RUN_ID=""
ONE_SHOT=0

usage() { sed -n '2,25p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)           usage; exit 0 ;;
    --compositions-dir)  COMPOSITIONS_DIR="$2"; shift 2 ;;
    --one-shot)          ONE_SHOT=1; shift ;;
    --) shift; break ;;
    -*) echo "[compose-render] ERROR: unknown flag: $1" >&2; exit 1 ;;
    *)
      if [[ -z "$COMPOSITION_NAME" ]]; then COMPOSITION_NAME="$1"
      elif [[ -z "$RUN_ID" ]]; then RUN_ID="$1"
      else echo "[compose-render] ERROR: unexpected positional: $1" >&2; exit 1
      fi
      shift
      ;;
  esac
done

[[ -n "$COMPOSITION_NAME" && -n "$RUN_ID" ]] || { usage >&2; exit 1; }

COMPOSITION_FILE="$COMPOSITIONS_DIR/$COMPOSITION_NAME.yaml"
[[ -f "$COMPOSITION_FILE" ]] || { echo "[compose-render] ERROR: composition not found: $COMPOSITION_FILE" >&2; exit 1; }

ORCH_DIR="$ORCH_DIR_ROOT/$RUN_ID"
ORCH_TRAJECTORY="$ORCH_DIR/orchestrator.jsonl"

# ---------------------------------------------------------------------------
# Construct → (color, emoji) mapping. ANSI 8-bit color palette.
# Doctrine §14.4: emoji-as-object-refs; handles are stable per construct.
# ---------------------------------------------------------------------------
construct_glyph() {
  case "$1" in
    artisan)      echo "🔨 ALEXANDER" ;;
    k-hole)       echo "🕳️  STAMETS" ;;
    the-easel)    echo "🎨 the-easel" ;;
    mint)         echo "🍯 mint" ;;
    the-arcade)   echo "🎮 BARTH" ;;
    observer)     echo "🐝 KEEPER" ;;
    kansei)       echo "🔮 kansei" ;;
    beehive)      echo "🐝 KEEPER" ;;
    mibera-codex) echo "📜 mibera" ;;
    protocol)     echo "⚙️  protocol" ;;
    noether)      echo "Σ  noether" ;;
    herald)       echo "📣 herald" ;;
    vocabulary-bank) echo "📚 vocab" ;;
    gtm-collective) echo "📊 LILY" ;;
    hivemind)     echo "🧠 hivemind" ;;
    *)            echo "◇  $1" ;;
  esac
}

# ANSI 256 colors — warm tones per construct taste direction
construct_color() {
  case "$1" in
    artisan)      echo "214" ;;  # warm amber
    k-hole)       echo "99"  ;;  # muted violet
    the-easel)    echo "108" ;;  # sage
    mint)         echo "220" ;;  # honey gold
    the-arcade)   echo "66"  ;;  # cool slate
    observer)     echo "30"  ;;  # deep teal
    beehive)      echo "30"  ;;
    kansei)       echo "141" ;;  # soft purple
    mibera-codex) echo "180" ;;  # warm tan
    protocol)     echo "244" ;;  # neutral grey
    noether)      echo "130" ;;  # burnt orange
    herald)       echo "173" ;;  # coral
    vocabulary-bank) echo "109" ;;
    gtm-collective) echo "168" ;; # rose
    hivemind)     echo "111" ;;  # sky
    *)            echo "247" ;;  # default grey
  esac
}

# Emit SGR color-on / reset
color_on()  { printf '\033[38;5;%sm' "$1"; }
color_off() { printf '\033[0m'; }
bold_on()   { printf '\033[1m'; }
dim_on()    { printf '\033[2m'; }

# ---------------------------------------------------------------------------
# Composition shape — parse once, reuse
# ---------------------------------------------------------------------------
COMPOSITION_JSON=$(yq -o=json '.' "$COMPOSITION_FILE" 2>/dev/null) \
  || { echo "[compose-render] ERROR: YAML parse failed" >&2; exit 1; }

STAGE_COUNT=$(echo "$COMPOSITION_JSON" | jq -r '.chain | length')

# Pre-extract stage info
declare -a STAGE_LABELS=()
declare -a STAGE_CONSTRUCTS=()
declare -a STAGE_SKILLS=()
declare -a STAGE_MODES=()
declare -a STAGE_WRITES=()

for (( i=0; i<STAGE_COUNT; i++ )); do
  stage_json=$(echo "$COMPOSITION_JSON" | jq -c ".chain[$i]")
  lbl=$(echo "$stage_json" | jq -r '.stage // empty')
  [[ -z "$lbl" ]] && lbl="$((i+1))"
  STAGE_LABELS+=("$lbl")
  STAGE_CONSTRUCTS+=("$(echo "$stage_json" | jq -r '.construct')")
  STAGE_SKILLS+=("$(echo "$stage_json" | jq -r '.skill // "<none>"')")
  STAGE_MODES+=("$(echo "$stage_json" | jq -r '.mode // "fresh"')")
  STAGE_WRITES+=("$(echo "$stage_json" | jq -r '(.writes // []) | join(",")')")
done

# Iteration pairs
declare -a ITERATE_PAIRS=()
ITERATE_COUNT=$(echo "$COMPOSITION_JSON" | jq -r '.iterate // [] | length')
for (( i=0; i<ITERATE_COUNT; i++ )); do
  pair=$(echo "$COMPOSITION_JSON" | jq -c ".iterate[$i]")
  ITERATE_PAIRS+=("$pair")
done

BACKEND=$(echo "$COMPOSITION_JSON" | jq -r '.backend // "headless-tmux"')

# ---------------------------------------------------------------------------
# Rendering state — updated as orchestrator events arrive
# ---------------------------------------------------------------------------
declare -a STAGE_STATE=()  # "pending" | "running" | "done" | "failed"
declare -a STAGE_DURATIONS=()
for (( i=0; i<STAGE_COUNT; i++ )); do
  STAGE_STATE+=("pending")
  STAGE_DURATIONS+=("")
done
CURRENT_PASS=""
RUN_OUTCOME="running"
LAST_EVENTS=()

stage_icon() {
  case "$1" in
    pending)  dim_on; printf '—'; color_off ;;
    running)  bold_on; printf '◉'; color_off ;;
    done)     printf '✓' ;;
    failed)   printf '✗' ;;
  esac
}

# Find stage index by label
find_stage_idx() {
  local lbl="$1"
  for (( i=0; i<STAGE_COUNT; i++ )); do
    [[ "${STAGE_LABELS[$i]}" == "$lbl" ]] && { echo "$i"; return 0; }
  done
  return 1
}

# ---------------------------------------------------------------------------
# Render frame
# ---------------------------------------------------------------------------
render() {
  # Clear + home
  printf '\033[2J\033[H'

  bold_on
  printf "compose-run  %s · run=%s · backend=%s\n" \
    "$COMPOSITION_NAME" "${RUN_ID:0:12}" "$BACKEND"
  color_off
  printf '═%.0s' {1..72}; printf '\n'

  # Stage rows
  for (( i=0; i<STAGE_COUNT; i++ )); do
    local lbl="${STAGE_LABELS[$i]}"
    local construct="${STAGE_CONSTRUCTS[$i]}"
    local skill="${STAGE_SKILLS[$i]}"
    local mode="${STAGE_MODES[$i]}"
    local writes="${STAGE_WRITES[$i]}"
    local state="${STAGE_STATE[$i]}"
    local dur="${STAGE_DURATIONS[$i]}"
    local color; color=$(construct_color "$construct")
    local glyph; glyph=$(construct_glyph "$construct")

    printf "  ["
    bold_on; printf "%s/%s" "$lbl" "$STAGE_COUNT"; color_off
    printf "] "
    stage_icon "$state"
    printf "  "
    color_on "$color"; printf "%-22s" "$glyph"; color_off
    printf " "
    dim_on; printf "%-22s" "${skill:0:22}"; color_off
    printf "  "
    dim_on
    case "$mode" in
      persistent) printf "⟳ persist" ;;
      fresh)      printf "⊘ fresh  " ;;
      *)          printf "? %s" "$mode" ;;
    esac
    color_off
    printf "  →  "
    color_on "$color"; printf "%s" "$writes"; color_off
    if [[ -n "$dur" ]]; then
      dim_on; printf "  %sms" "$dur"; color_off
    fi
    printf '\n'

    # Iteration marker between stages — show connector + iterate-pair note
    if (( i < STAGE_COUNT - 1 )); then
      local next_lbl="${STAGE_LABELS[$((i+1))]}"
      local iter_note=""
      for pair in "${ITERATE_PAIRS[@]+"${ITERATE_PAIRS[@]}"}"; do
        local a; a=$(echo "$pair" | jq -r '.[0]')
        local b; b=$(echo "$pair" | jq -r '.[1]')
        # If the pair endpoints wrap this gap
        if [[ "$lbl" == "$a" && ( "$next_lbl" == "$b" || $(( i+1 )) -le $b ) ]] \
           || [[ "$lbl" == "$b" && "$next_lbl" == "$a" ]]; then
          iter_note="  (iterate $a ↔ $b)"
          break
        fi
      done
      dim_on; printf "       ↓ %s\n" "$iter_note"; color_off
    fi
  done

  printf '═%.0s' {1..72}; printf '\n'

  # Recent stream activity (last 6 events)
  if [[ ${#LAST_EVENTS[@]} -gt 0 ]]; then
    bold_on; printf "Stream activity:\n"; color_off
    local start=$(( ${#LAST_EVENTS[@]} - 6 ))
    (( start < 0 )) && start=0
    for (( j=start; j<${#LAST_EVENTS[@]}; j++ )); do
      dim_on; printf "  %s\n" "${LAST_EVENTS[$j]}"; color_off
    done
  fi

  # Footer
  printf '\n'
  case "$RUN_OUTCOME" in
    running)
      dim_on; printf "· tailing %s\n" "$ORCH_TRAJECTORY"; color_off
      ;;
    completed)
      color_on 34; bold_on
      printf "✓ compose-run complete\n"
      color_off
      ;;
    failed)
      color_on 196; bold_on
      printf "✗ compose-run failed\n"
      color_off
      ;;
  esac
}

# ---------------------------------------------------------------------------
# Event ingest — updates state
# ---------------------------------------------------------------------------
handle_event() {
  local line="$1"
  local event_type stage_label construct ts iter_pass primary_type rc outcome
  event_type=$(echo "$line" | jq -r '.type // empty')
  stage_label=$(echo "$line" | jq -r '.stage // empty')
  construct=$(echo "$line" | jq -r '.construct // empty')
  ts=$(echo "$line" | jq -r '.ts // empty')
  iter_pass=$(echo "$line" | jq -r '.iter_pass // empty')
  primary_type=$(echo "$line" | jq -r '.primary_type // empty')

  case "$event_type" in
    run_start)
      RUN_OUTCOME="running"
      LAST_EVENTS+=("${ts:11:8}  run_start")
      ;;
    pass_start)
      CURRENT_PASS=$(echo "$line" | jq -r '.pass // empty')
      LAST_EVENTS+=("${ts:11:8}  pass_start  pass=$CURRENT_PASS")
      ;;
    stage_enter)
      local idx
      if idx=$(find_stage_idx "$stage_label"); then
        STAGE_STATE[$idx]="running"
      fi
      LAST_EVENTS+=("${ts:11:8}  stage_enter  $stage_label · $construct")
      ;;
    stage_exit)
      local idx
      if idx=$(find_stage_idx "$stage_label"); then
        STAGE_STATE[$idx]="done"
      fi
      LAST_EVENTS+=("${ts:11:8}  stage_exit   $stage_label · $primary_type")
      ;;
    stage_mock|stage_llm_call_start|stage_llm_call_end)
      : # don't render, just track
      ;;
    iterate_pass_start)
      LAST_EVENTS+=("${ts:11:8}  iterate      pair=$(echo "$line" | jq -r '.pair') iter=$(echo "$line" | jq -r '.iter')")
      # On iterate, reset paired stages to running
      local pair a b
      pair=$(echo "$line" | jq -r '.pair')
      a=$(echo "$pair" | jq -r '.[0]')
      b=$(echo "$pair" | jq -r '.[1]')
      local ia ib
      ia=$(find_stage_idx "$a" 2>/dev/null || echo "")
      ib=$(find_stage_idx "$b" 2>/dev/null || echo "")
      [[ -n "$ia" ]] && STAGE_STATE[$ia]="running"
      [[ -n "$ib" ]] && STAGE_STATE[$ib]="running"
      ;;
    pass_end)
      rc=$(echo "$line" | jq -r '.rc // "0"')
      LAST_EVENTS+=("${ts:11:8}  pass_end     rc=$rc")
      ;;
    run_end)
      outcome=$(echo "$line" | jq -r '.outcome // "unknown"')
      rc=$(echo "$line" | jq -r '.rc // "0"')
      RUN_OUTCOME="$outcome"
      LAST_EVENTS+=("${ts:11:8}  run_end      $outcome rc=$rc")
      ;;
  esac
}

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
# Trap q / Ctrl-C cleanly
cleanup() { printf '\033[0m\n'; }
trap cleanup EXIT INT TERM

# Initial render (empty trajectory is valid; shows all pending)
render

if (( ONE_SHOT )); then
  # Read existing trajectory if any
  if [[ -f "$ORCH_TRAJECTORY" ]]; then
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      handle_event "$line"
    done < "$ORCH_TRAJECTORY"
    render
  fi
  exit 0
fi

# Wait for file to exist
wait_count=0
while [[ ! -f "$ORCH_TRAJECTORY" ]]; do
  sleep 0.1
  wait_count=$(( wait_count + 1 ))
  if (( wait_count > 100 )); then
    echo "[compose-render] ERROR: orchestrator.jsonl not appearing at $ORCH_TRAJECTORY" >&2
    exit 1
  fi
done

# Tail + render on each event. Use stdin-loop pattern so Ctrl-C is clean.
tail -n +1 -f "$ORCH_TRAJECTORY" 2>/dev/null | while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  handle_event "$line"
  render
  # Exit tail on terminal run_end
  if [[ "$RUN_OUTCOME" != "running" ]]; then
    # Give a beat for operator to read final state, then exit
    sleep 0.5
    break
  fi
done

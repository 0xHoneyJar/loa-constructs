#!/usr/bin/env bash
# =============================================================================
# compose-panes.sh — cycle-006 L-frontend tmux vibe-coding surface
# =============================================================================
# Spawns a two-pane tmux session for a compose-run invocation:
#   - Left pane  · compose-panes-render.sh (live pipe graph + stream activity)
#   - Right pane · compose-run.sh (runner + iteration prompts)
#
# The two panes are bound by a shared run_id. Both tail / write to
# .run/compose/<run_id>/orchestrator.jsonl. Per-pane colors by construct,
# emoji per pane, main orchestrator pane shows pipe graph + stream activity.
# Doctrine §14.4 (emoji-as-object-refs) + §15.3 (vibe-coding surface).
#
# Usage:
#   compose-panes.sh <composition-name> [--target PATH] [options]
#
# Options forwarded to compose-run.sh:
#   --target PATH, --input JSON, --backend KIND, --max-iterations N,
#   --no-interactive, --orient | --intervene | --glance
#
# Tmux options:
#   --attach | --no-attach    (default attach)
#   --session-name NAME       (default: compose-<composition>-<shortid>)
#
# -h, --help
#
# Exit:
#   The tmux session persists after compose-run completes so the operator
#   can inspect output. Use Ctrl-B D to detach, `tmux kill-session -t NAME`
#   to tear down.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
RENDERER="$SCRIPT_DIR/compose-panes-render.sh"
RUNNER="$SCRIPT_DIR/compose-run.sh"

command -v tmux >/dev/null 2>&1 || { echo "[compose-panes] ERROR: tmux required" >&2; exit 1; }
[[ -x "$RENDERER" ]] || { echo "[compose-panes] ERROR: missing $RENDERER" >&2; exit 1; }
[[ -x "$RUNNER" ]] || { echo "[compose-panes] ERROR: missing $RUNNER" >&2; exit 1; }

usage() { sed -n '2,32p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

COMPOSITION_NAME=""
RUN_ID=""
SESSION_NAME=""
ATTACH=1
FORWARDED_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)            usage; exit 0 ;;
    --session-name)       SESSION_NAME="$2"; shift 2 ;;
    --attach)             ATTACH=1; shift ;;
    --no-attach)          ATTACH=0; shift ;;
    --run-id)             RUN_ID="$2"; FORWARDED_ARGS+=(--run-id "$2"); shift 2 ;;
    # Forwarded to compose-run
    --target|--input|--backend|--max-iterations|--compositions-dir)
      FORWARDED_ARGS+=("$1" "$2"); shift 2 ;;
    --no-interactive|--glance|--orient|--intervene|--dry-run)
      FORWARDED_ARGS+=("$1"); shift ;;
    --) shift; break ;;
    -*) echo "[compose-panes] unknown flag: $1" >&2; exit 1 ;;
    *)
      if [[ -z "$COMPOSITION_NAME" ]]; then COMPOSITION_NAME="$1"
      else echo "[compose-panes] unexpected positional: $1" >&2; exit 1
      fi
      shift
      ;;
  esac
done

[[ -n "$COMPOSITION_NAME" ]] || { usage >&2; exit 1; }

# Generate run_id if none supplied (so renderer + runner share one)
if [[ -z "$RUN_ID" ]]; then
  RUN_ID=$(uuidgen 2>/dev/null \
           || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null \
           || echo "panes-$(date +%s)-$$")
  FORWARDED_ARGS+=(--run-id "$RUN_ID")
fi

[[ -z "$SESSION_NAME" ]] && SESSION_NAME="compose-${COMPOSITION_NAME}-${RUN_ID:0:8}"

# Reject if session already exists (avoid confusion)
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "[compose-panes] ERROR: tmux session '$SESSION_NAME' already exists. Attach with 'tmux attach -t $SESSION_NAME' or kill it first." >&2
  exit 1
fi

# Pre-create the orchestrator dir so renderer doesn't race the runner
ORCH_DIR="$PROJECT_ROOT/.run/compose/$RUN_ID"
mkdir -p "$ORCH_DIR/history"
# Seed an empty trajectory file so the renderer's tail -f can open it
touch "$ORCH_DIR/orchestrator.jsonl"

# Build the tmux layout: window 0 = orchestrator, split horizontal to right for runner
# Renderer is in left pane (60% width), runner in right (40%).
# Escape the run args carefully — use printf %q for each.
runner_cmd_parts=("$RUNNER" "$COMPOSITION_NAME")
for arg in ${FORWARDED_ARGS[@]+"${FORWARDED_ARGS[@]}"}; do
  runner_cmd_parts+=("$arg")
done
runner_cmd=""
for p in "${runner_cmd_parts[@]}"; do
  runner_cmd+="$(printf '%q' "$p") "
done

renderer_cmd="$(printf '%q' "$RENDERER") $(printf '%q' "$COMPOSITION_NAME") $(printf '%q' "$RUN_ID")"

# Create session with left pane = renderer
tmux new-session -d -s "$SESSION_NAME" -x 200 -y 50 -n "orchestrator" "bash -c \"$renderer_cmd; echo; echo '[renderer exited — Ctrl-B D to detach]'; read -r _\""

# Split horizontal: right pane = runner
tmux split-window -h -t "$SESSION_NAME:orchestrator" -p 40 "bash -c \"$runner_cmd; echo; echo '[runner exited — Ctrl-B D to detach, Ctrl-B C to reopen]'; read -r _\""

# Focus the runner pane by default (operator watches runner + renderer updates)
tmux select-pane -t "$SESSION_NAME:orchestrator.1"

# Status line for the session — shows composition + run_id
tmux set-option -t "$SESSION_NAME" status-left "#[bold]compose-run#[default] $COMPOSITION_NAME · ${RUN_ID:0:8} · "
tmux set-option -t "$SESSION_NAME" status-left-length 80
tmux set-option -t "$SESSION_NAME" status-right "backend=headless-tmux · $(date +%H:%M:%S)"

if (( ATTACH )); then
  exec tmux attach -t "$SESSION_NAME"
else
  echo "[compose-panes] session '$SESSION_NAME' created (detached)"
  echo "[compose-panes] attach: tmux attach -t $SESSION_NAME"
  echo "[compose-panes] trajectory: $ORCH_DIR/orchestrator.jsonl"
  echo "[compose-panes] renderer: $RENDERER $COMPOSITION_NAME $RUN_ID"
  echo "[compose-panes] run_id: $RUN_ID"
fi

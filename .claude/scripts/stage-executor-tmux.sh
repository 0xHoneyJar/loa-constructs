#!/usr/bin/env bash
# =============================================================================
# stage-executor-tmux.sh — cycle-006 real-LLM stage executor (L-backend)
# =============================================================================
# Per-stage worker invoked by construct-compose.sh via LOA_COMPOSE_STAGE_EXECUTOR.
# Replaces cycle-005's default_stage_executor stub with claude -p + tmux
# dispatch (doctrine v6 §18.4 — Unix-native, forkable without agent-teams).
#
# Honored per-stage mode (doctrine v5 §17 + cycle-006 SEED AC-backend.2/3):
#   - mode: fresh      → one-shot `claude -p` subprocess; context resets by construction
#   - mode: persistent → file-accumulated context (MVP). Each pass appends prior
#                        output to $HISTORY_DIR/stage-<label>.jsonl; subsequent
#                        invocations prepend accumulated history to the prompt.
#                        The "persistent teammate" behavior is semantically
#                        preserved (register depth accumulates across loop passes)
#                        without requiring fragile interactive-pane capture.
#                        Cycle-007 may upgrade to long-lived interactive panes.
#
# Invocation (from construct-compose.sh):
#   stdin:  prior stage output (JSON)
#   argv:   $1 construct_slug
#           $2 skill
#           $3 persona
#           $4 stage_label
#           $5 writes_csv (comma-separated stream types; first is primary)
#           $6 run_id
#           $7 session_id
#   env:    LOA_COMPOSE_COMPOSITION_JSON — full composition JSON for stage-mode lookup
#           LOA_COMPOSE_HISTORY_DIR — persistent-mode context accumulation dir
#           LOA_COMPOSE_ORCH_TRAJECTORY — orchestrator trajectory file (append-only)
#           LOA_COMPOSE_ITER_PASS — present when this invocation is an iteration pass
#           LOA_STAGE_MOCK=1 — skip real LLM call, emit deterministic test row
#                              (for bats and cheap dev iteration)
#           ANTHROPIC_API_KEY — claude CLI creds (or whatever claude -p needs)
#   stdout: JSON row conforming to primary write-type schema
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
SCHEMA_DIR="${LOA_SCHEMA_DIR:-$PROJECT_ROOT/.claude/schemas}"
STREAM_VALIDATE="$SCRIPT_DIR/stream-validate.sh"
SCHEMA_VERSION="1.0.0"

construct="${1:-}"
skill="${2:-}"
persona="${3:-}"
stage_label="${4:-}"
writes_csv="${5:-}"
run_id="${6:-}"
session_id="${7:-}"

[[ -n "$construct" && -n "$stage_label" && -n "$writes_csv" ]] \
  || { echo "[stage-executor] ERROR: missing required argv" >&2; exit 64; }

primary_type=$(echo "$writes_csv" | awk -F',' '{print $1}')

# ISO-8601 UTC timestamp — sub-second precision via python3 when available
iso_ts() {
  python3 -c "from datetime import datetime, timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z')" 2>/dev/null \
    || date -u +%Y-%m-%dT%H:%M:%SZ
}
ts=$(iso_ts)

# Consume prior stage output from stdin.
prior=""
if [[ ! -t 0 ]]; then
  prior=$(cat -)
fi

# ---------------------------------------------------------------------------
# Orchestrator trajectory emit (for L-frontend pipe graph)
# ---------------------------------------------------------------------------
orch_trajectory="${LOA_COMPOSE_ORCH_TRAJECTORY:-}"
orch_emit() {
  [[ -z "$orch_trajectory" ]] && return 0
  local event_type="$1"; shift
  local payload
  payload=$(jq -c -n \
    --arg ts "$(iso_ts)" \
    --arg type "$event_type" \
    --arg stage "$stage_label" \
    --arg construct "$construct" \
    --arg skill "$skill" \
    --arg persona "$persona" \
    --arg primary_type "$primary_type" \
    --arg run_id "$run_id" \
    --arg session_id "$session_id" \
    --arg iter_pass "${LOA_COMPOSE_ITER_PASS:-}" \
    $(for kv in "$@"; do
        k="${kv%%=*}"; v="${kv#*=}"
        printf -- "--arg %q %q " "$k" "$v"
      done) \
    '. + $ARGS.named + {type: $type, ts: $ts}')
  echo "$payload" >> "$orch_trajectory"
}

# ---------------------------------------------------------------------------
# Per-stage mode lookup from composition JSON
# ---------------------------------------------------------------------------
stage_mode="fresh"
if [[ -n "${LOA_COMPOSE_COMPOSITION_JSON:-}" ]]; then
  # Find stage in chain by label (or 1-indexed position fallback)
  found_mode=$(echo "$LOA_COMPOSE_COMPOSITION_JSON" \
    | jq -r --arg lbl "$stage_label" \
        '(.chain[] | select((.stage // empty | tostring) == $lbl) | .mode) // empty' \
    2>/dev/null || echo "")
  if [[ -z "$found_mode" ]]; then
    # Fallback: positional lookup (stage_label might be "1", "2", etc.)
    if [[ "$stage_label" =~ ^[0-9]+$ ]]; then
      idx=$(( stage_label - 1 ))
      found_mode=$(echo "$LOA_COMPOSE_COMPOSITION_JSON" \
        | jq -r ".chain[$idx].mode // \"\"" 2>/dev/null || echo "")
    fi
  fi
  [[ -n "$found_mode" ]] && stage_mode="$found_mode"
fi

orch_emit "stage_enter" "mode=$stage_mode"

# ---------------------------------------------------------------------------
# History accumulation (persistent mode)
# ---------------------------------------------------------------------------
history_dir="${LOA_COMPOSE_HISTORY_DIR:-}"
history_file=""
accumulated_history=""
if [[ "$stage_mode" == "persistent" && -n "$history_dir" ]]; then
  history_file="$history_dir/stage-${stage_label}.jsonl"
  if [[ -f "$history_file" ]]; then
    # Build a compact historical context summary
    accumulated_history=$(jq -s -c '.' "$history_file" 2>/dev/null || echo "[]")
  fi
fi

# ---------------------------------------------------------------------------
# Prompt assembly
# ---------------------------------------------------------------------------
build_prompt() {
  local prior_json="$1" history_json="$2"
  # Keep prompt terse; construct-specific enrichment is cycle-007 concern.
  cat <<PROMPT
You are $persona, acting as construct $construct via skill $skill.

Stage: $stage_label
Primary output stream type: $primary_type
Stage mode: $stage_mode
PROMPT

  if [[ -n "$history_json" && "$history_json" != "[]" ]]; then
    cat <<PROMPT

Accumulated prior passes of this stage (persistent-teammate context):
$history_json

Build on prior context. Deepen, refine — do not reset.
PROMPT
  fi

  cat <<PROMPT

Prior-stage payload (immediate upstream):
$prior_json

Produce a $primary_type stream row. Output MUST be a single valid JSON object.
Required keys for $primary_type: see .claude/schemas/$(echo "$primary_type" | tr '[:upper:]' '[:lower:]').schema.json
The row MUST include:
  "stream_type": "$primary_type"
  "schema_version": "$SCHEMA_VERSION"
  "timestamp": ISO-8601 UTC
  "session_id": "$session_id"
  "run_id": "$run_id"
Plus type-specific fields.

Respond with ONLY the JSON object. No markdown fences. No commentary.
PROMPT
}

# ---------------------------------------------------------------------------
# Mock mode (bats / cheap dev iteration)
# ---------------------------------------------------------------------------
emit_mock_row() {
  case "$primary_type" in
    Signal)
      jq -n \
        --arg ts "$ts" --arg source "$construct/$skill" --arg persona "$persona" \
        --arg observation "[mock $stage_mode] stage $stage_label · cycle-006 executor" \
        --arg schema_version "$SCHEMA_VERSION" --arg run_id "$run_id" --arg session_id "$session_id" \
        --argjson prior "${prior:-null}" \
        --arg stage_mode "$stage_mode" \
        '{stream_type: "Signal", schema_version: $schema_version, timestamp: $ts,
          source: $source, observation: $observation,
          tags: ["mock", "cycle-006", $stage_mode, $persona],
          session_id: $session_id, run_id: $run_id, _prior: $prior}'
      ;;
    Verdict)
      jq -n \
        --arg ts "$ts" --arg source "$persona" --arg schema_version "$SCHEMA_VERSION" \
        --arg run_id "$run_id" --arg session_id "$session_id" \
        --arg verdict "[mock $stage_mode] stage $stage_label · cycle-006" \
        --arg glance "[mock $persona · $stage_mode] stage $stage_label" \
        --argjson prior "${prior:-null}" \
        '{stream_type: "Verdict", schema_version: $schema_version, timestamp: $ts,
          source: $source, verdict: $verdict, severity: "info", evidence: [],
          glance: $glance, session_id: $session_id, run_id: $run_id, _prior: $prior}'
      ;;
    Artifact)
      jq -n \
        --arg ts "$ts" --arg producer "$construct/$skill" --arg schema_version "$SCHEMA_VERSION" \
        --arg run_id "$run_id" --arg session_id "$session_id" \
        --arg path "/tmp/cycle-006-mock-artifact-${stage_label}" \
        '{stream_type: "Artifact", schema_version: $schema_version, timestamp: $ts,
          path: $path, producer: $producer, media_type: "application/x-mock",
          session_id: $session_id, run_id: $run_id}'
      ;;
    Intent)
      jq -n \
        --arg ts "$ts" --arg schema_version "$SCHEMA_VERSION" --arg run_id "$run_id" \
        --arg intent "[mock] stage $stage_label intent" \
        '{stream_type: "Intent", schema_version: $schema_version, timestamp: $ts,
          intent: $intent, run_id: $run_id}'
      ;;
    Operator-Model)
      jq -n \
        --arg ts "$ts" --arg schema_version "$SCHEMA_VERSION" --arg run_id "$run_id" \
        '{stream_type: "Operator-Model", schema_version: $schema_version, timestamp: $ts,
          expertise: [], run_id: $run_id}'
      ;;
    *)
      echo "[stage-executor] ERROR: unknown primary type '$primary_type'" >&2
      return 3
      ;;
  esac
}

# ---------------------------------------------------------------------------
# Wrap arbitrary text in a schema-valid row for primary_type.
# Used when LLM output cannot be parsed as the target schema directly.
# ---------------------------------------------------------------------------
wrap_as_row() {
  local raw_text="$1"
  local truncated_text
  truncated_text=$(printf '%s' "$raw_text" | head -c 4096)
  case "$primary_type" in
    Signal)
      jq -n \
        --arg ts "$ts" --arg source "$construct/$skill" --arg persona "$persona" \
        --arg observation "$truncated_text" \
        --arg schema_version "$SCHEMA_VERSION" --arg run_id "$run_id" --arg session_id "$session_id" \
        --argjson prior "${prior:-null}" \
        --arg stage_mode "$stage_mode" \
        '{stream_type: "Signal", schema_version: $schema_version, timestamp: $ts,
          source: $source, observation: $observation,
          tags: ["wrapped", "cycle-006", $stage_mode, $persona],
          session_id: $session_id, run_id: $run_id, _prior: $prior}'
      ;;
    Verdict)
      jq -n \
        --arg ts "$ts" --arg source "$persona" --arg schema_version "$SCHEMA_VERSION" \
        --arg run_id "$run_id" --arg session_id "$session_id" \
        --arg verdict "$truncated_text" \
        --arg glance "$construct/$skill · wrapped raw LLM output" \
        --argjson prior "${prior:-null}" \
        '{stream_type: "Verdict", schema_version: $schema_version, timestamp: $ts,
          source: $source, verdict: $verdict, severity: "info", evidence: [],
          glance: $glance, session_id: $session_id, run_id: $run_id, _prior: $prior}'
      ;;
    Artifact)
      # Artifact as wrapped-text: write to tmp file + path into row
      local artifact_path
      artifact_path=$(mktemp -t cycle-006-artifact-XXXXXX.txt)
      printf '%s\n' "$raw_text" > "$artifact_path"
      jq -n \
        --arg ts "$ts" --arg producer "$construct/$skill" --arg schema_version "$SCHEMA_VERSION" \
        --arg run_id "$run_id" --arg session_id "$session_id" \
        --arg path "$artifact_path" \
        '{stream_type: "Artifact", schema_version: $schema_version, timestamp: $ts,
          path: $path, producer: $producer, media_type: "text/plain",
          session_id: $session_id, run_id: $run_id}'
      ;;
    Intent|Operator-Model)
      emit_mock_row
      ;;
    *)
      echo "[stage-executor] ERROR: cannot wrap unknown primary type '$primary_type'" >&2
      return 3
      ;;
  esac
}

# ---------------------------------------------------------------------------
# Main dispatch
# ---------------------------------------------------------------------------
if [[ "${LOA_STAGE_MOCK:-0}" == "1" ]]; then
  orch_emit "stage_mock" "primary_type=$primary_type"
  output=$(emit_mock_row)
else
  prompt=$(build_prompt "${prior:-{}}" "${accumulated_history:-[]}")

  # Invoke claude -p. We capture stdout + stderr separately.
  # Use a temp file for the prompt since it can contain special chars.
  prompt_tmp=$(mktemp -t cycle-006-prompt-XXXXXX.md)
  trap 'rm -f "$prompt_tmp"' EXIT
  printf '%s' "$prompt" > "$prompt_tmp"

  orch_emit "stage_llm_call_start"
  llm_rc=0
  llm_out=$(claude -p --output-format text < "$prompt_tmp" 2>/dev/null) || llm_rc=$?
  orch_emit "stage_llm_call_end" "rc=$llm_rc"

  if (( llm_rc != 0 )) || [[ -z "$llm_out" ]]; then
    # Fallback: emit wrapped-row with diagnostic.
    output=$(wrap_as_row "[cycle-006 stage-executor] claude -p failed rc=$llm_rc or empty output; stage=$stage_label")
  else
    # Try to parse as JSON directly.
    if echo "$llm_out" | jq -e . >/dev/null 2>&1; then
      # It's JSON. Does it match the primary_type schema?
      candidate="$llm_out"
      if echo "$candidate" | "$STREAM_VALIDATE" "$primary_type" - >/dev/null 2>&1; then
        output="$candidate"
      else
        # JSON but doesn't validate — wrap.
        output=$(wrap_as_row "$llm_out")
      fi
    else
      # Non-JSON — wrap raw text.
      output=$(wrap_as_row "$llm_out")
    fi
  fi
fi

# ---------------------------------------------------------------------------
# Persistent-mode history append
# ---------------------------------------------------------------------------
if [[ "$stage_mode" == "persistent" && -n "$history_file" ]]; then
  # Append this pass to the history file with metadata
  pass_record=$(jq -c -n \
    --argjson output "$output" \
    --arg ts "$ts" \
    --arg iter_pass "${LOA_COMPOSE_ITER_PASS:-0}" \
    --arg stage_label "$stage_label" \
    '{ts: $ts, iter_pass: $iter_pass, stage: $stage_label, output: $output}')
  echo "$pass_record" >> "$history_file"
fi

orch_emit "stage_exit" "primary_type=$primary_type"

# Emit to stdout (construct-compose.sh consumes)
printf '%s' "$output"

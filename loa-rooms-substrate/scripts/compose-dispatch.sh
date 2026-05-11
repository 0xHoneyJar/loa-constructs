#!/usr/bin/env bash
# =============================================================================
# compose-dispatch.sh — Composition runner with native-agent dispatch
# =============================================================================
# Cycle: simstim-20260509-aead9136 (Sprint 2, S2-T2)
# PRD: FR-5 (composition visibility)
# SDD: §2.6 (composition runner integration)
#
# Orchestrates multi-stage construct compositions. Two execution modes:
#
#   INTERACTIVE (Form A): writes dispatch prompts the operator pastes into
#     their Claude Code session. The operator's session uses @-mention
#     typeahead to spawn project agents. Subagents are visible in the main UI.
#     Required for T4 acceptance (visible chain).
#
#   HEADLESS (Form B audit-substrate path): invokes `claude -p` per stage.
#     Produces handoff packets but subagents are NOT visible in operator's
#     main UI (per Sprint 0 Probe 2). Useful for CI / batch / audit-only runs.
#     Sprint 4 completes this path.
#
# Per-stage flow:
#   1. Construct room activation packet from prior handoff + declared inputs
#   2. Write packet to .run/rooms/<room_id>.json
#   3. Log stage_enter to .run/compose/<run_id>/orchestrator.jsonl
#   4. Dispatch (Form A: emit prompt; Form B: claude -p)
#   5. Validate returned handoff packet
#   6. Write packet to .run/compose/<run_id>/envelopes/<idx>.<slug>.handoff.json
#   7. Log stage_exit
#
# Usage:
#   compose-dispatch.sh <composition.yaml> [options]
#
# Options:
#   --interactive    Force interactive mode (Form A)
#   --headless       Force headless mode (Form B; partial — Sprint 4 completes)
#   --run-id ID      Use specific run_id (default: generated)
#   --stage N        Execute only stage N (0-indexed; for resumption)
#   --dry-run        Validate composition + emit packets without dispatching
#   --json           Structured JSON output to stdout
#
# Exit codes:
#   0  All stages dispatched + handoffs validated
#   1  Composition validation failed
#   2  Stage failed (handoff validation or dispatch error)
#   3  Awaiting operator (Form A: prompt emitted, awaiting paste)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$PROJECT_ROOT/.." && pwd)"
COMPOSE_SCHEMA="$PROJECT_ROOT/.claude/schemas/runtime/composition.schema.json"
HANDOFF_VALIDATOR="$PROJECT_ROOT/.claude/scripts/handoff-validate.sh"
ROOM_VALIDATOR="$PROJECT_ROOT/.claude/scripts/room-packet-validate.sh"

usage() {
    cat <<EOF
Usage: compose-dispatch.sh <composition.yaml> [options]

Options:
  --interactive    Force interactive mode (Form A — operator pastes dispatch prompt)
  --headless       Force headless mode (Form B — claude -p; partial in Sprint 2)
  --run-id ID      Specific run_id (default: generated YYYYMMDD-HEXSHORT)
  --stage N        Execute only stage N (0-indexed)
  --dry-run        Validate composition; emit room packets; do not dispatch
  --json           Structured JSON output

Exit codes:
  0  All stages dispatched + handoffs validated
  1  Composition validation failed
  2  Stage failed
  3  Awaiting operator (Form A interactive)
EOF
}

COMP_PATH=""
MODE=""
RUN_ID=""
ONE_STAGE=""
DRY_RUN=0
OUTPUT_JSON=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --interactive) MODE="interactive"; shift ;;
        --headless) MODE="headless"; shift ;;
        --run-id) RUN_ID="$2"; shift 2 ;;
        --stage) ONE_STAGE="$2"; shift 2 ;;
        --dry-run) DRY_RUN=1; shift ;;
        --json) OUTPUT_JSON=1; shift ;;
        -h|--help) usage; exit 0 ;;
        -*) echo "ERROR: unknown flag '$1'" >&2; exit 1 ;;
        *) if [[ -z "$COMP_PATH" ]]; then COMP_PATH="$1"; else echo "ERROR: extra arg" >&2; exit 1; fi; shift ;;
    esac
done

if [[ -z "$COMP_PATH" ]]; then
    usage >&2
    exit 1
fi

if [[ ! -f "$COMP_PATH" ]]; then
    echo "ERROR: composition not found: $COMP_PATH" >&2
    exit 1
fi

# Mode detection if not forced
if [[ -z "$MODE" ]]; then
    if [[ -n "${CLAUDE_CODE_INTERACTIVE_SESSION:-}" ]] || { [[ -t 0 ]] && [[ -z "${CI:-}" ]]; }; then
        MODE="interactive"
    else
        MODE="headless"
    fi
fi

# Generate run_id if not supplied
if [[ -z "$RUN_ID" ]]; then
    RUN_ID="$(date -u +%Y%m%d)-$(openssl rand -hex 3)"
fi

RUN_DIR="$PROJECT_ROOT/.run/compose/$RUN_ID"
ORCHESTRATOR_LOG="$RUN_DIR/orchestrator.jsonl"
ROOMS_DIR="$PROJECT_ROOT/.run/rooms"
ENVELOPES_DIR="$RUN_DIR/envelopes"
PROMPTS_DIR="$RUN_DIR/dispatch-prompts"

mkdir -p "$RUN_DIR" "$ENVELOPES_DIR" "$PROMPTS_DIR" "$ROOMS_DIR"

# Initialize logger
log_event() {
    local event="$1"
    local payload_json="${2:-{\}}"
    local ts
    # macOS date lacks %N; portable RFC 3339 format is sufficient for log ordering
    ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    jq -nc --arg event "$event" --arg ts "$ts" --arg run_id "$RUN_ID" --argjson payload "$payload_json" \
        '{event: $event, ts: $ts, run_id: $run_id, payload: $payload}' >> "$ORCHESTRATOR_LOG"
}

# -----------------------------------------------------------------------------
# Step 1: Validate composition YAML against schema
# -----------------------------------------------------------------------------
COMP_JSON="$(python3 - "$COMP_PATH" <<'PYEOF'
import json, sys, yaml
try:
    with open(sys.argv[1]) as f:
        data = yaml.safe_load(f)
    print(json.dumps(data))
except Exception as e:
    print(json.dumps({"_error": str(e)}))
PYEOF
)"

if [[ "$(echo "$COMP_JSON" | jq -r '._error // ""')" != "" ]]; then
    echo "ERROR: composition YAML parse failed: $(echo "$COMP_JSON" | jq -r '._error')" >&2
    exit 1
fi

# Validate against composition schema if available.
# Pass JSON + schema-path via argv to avoid Python-heredoc injection (BB review F001).
# Using argv is safe because Python receives sys.argv strings as raw — no shell
# metachars or quote-breaking can survive into Python source.
if [[ -f "$COMPOSE_SCHEMA" ]]; then
    VALIDATE_RESULT="$(python3 - "$COMP_JSON" "$COMPOSE_SCHEMA" <<'PYEOF'
import json, sys
try:
    import jsonschema
except ImportError:
    print(json.dumps({"ok": False, "reason": "jsonschema_not_installed"}))
    sys.exit(0)
comp = json.loads(sys.argv[1])
schema_path = sys.argv[2]
with open(schema_path) as f:
    schema = json.load(f)
validator = jsonschema.Draft202012Validator(schema)
errors = sorted(validator.iter_errors(comp), key=lambda e: list(e.absolute_path))
if errors:
    print(json.dumps({"ok": False, "errors": [{"path": list(e.absolute_path), "msg": e.message} for e in errors[:5]]}))
else:
    print(json.dumps({"ok": True}))
PYEOF
)"

    if [[ "$(echo "$VALIDATE_RESULT" | jq -r '.ok')" != "true" ]]; then
        echo "ERROR: composition validation failed:" >&2
        echo "$VALIDATE_RESULT" | jq -r '.errors[]? | "  - \(.path | tojson): \(.msg)"' >&2
        log_event "compose.validation_failed" "$VALIDATE_RESULT"
        exit 1
    fi
fi

COMP_NAME="$(echo "$COMP_JSON" | jq -r '.name // "unnamed"')"
NUM_STAGES="$(echo "$COMP_JSON" | jq '.chain | length')"
CYCLE_ID="${LOA_CYCLE_ID:-simstim-20260509-aead9136}"

log_event "compose.start" "$(jq -n --arg name "$COMP_NAME" --argjson stages "$NUM_STAGES" --arg mode "$MODE" --arg cycle "$CYCLE_ID" \
    '{composition: $name, stages: $stages, mode: $mode, cycle_id: $cycle}')"

[[ "$OUTPUT_JSON" == "1" ]] || echo "[compose-dispatch] Composition '$COMP_NAME' — $NUM_STAGES stages — mode=$MODE — run_id=$RUN_ID"

# -----------------------------------------------------------------------------
# Step 2: Iterate stages
# -----------------------------------------------------------------------------
PRIOR_HANDOFF_PATH=""
STAGES_DISPATCHED=0
PENDING_OPERATOR=0

for ((i=0; i<NUM_STAGES; i++)); do
    if [[ -n "$ONE_STAGE" ]] && [[ "$i" != "$ONE_STAGE" ]]; then
        continue
    fi

    STAGE_JSON="$(echo "$COMP_JSON" | jq ".chain[$i]")"
    STAGE_CONSTRUCT="$(echo "$STAGE_JSON" | jq -r '.construct')"
    STAGE_SKILL="$(echo "$STAGE_JSON" | jq -r '.skill // ""')"
    STAGE_PERSONA="$(echo "$STAGE_JSON" | jq -r '.persona // ""')"
    STAGE_READS="$(echo "$STAGE_JSON" | jq -c '.reads // []')"
    STAGE_WRITES="$(echo "$STAGE_JSON" | jq -c '.writes // []')"

    [[ "$OUTPUT_JSON" == "1" ]] || echo "[compose-dispatch] stage $i: construct-$STAGE_CONSTRUCT (skill=$STAGE_SKILL)"

    # Build room activation packet body
    ROOM_INPUTS="[]"
    if [[ -n "$PRIOR_HANDOFF_PATH" ]]; then
        # Echo prior handoff's output_refs as this stage's inputs
        ROOM_INPUTS="$(jq -c '.output_refs // []' "$PRIOR_HANDOFF_PATH" 2>/dev/null || echo "[]")"
    fi

    EXPECTED_OUTPUT="$(echo "$STAGE_WRITES" | jq -r '.[0] // "Verdict"')"

    ROOM_BODY="$(jq -n \
        --arg cycle_id "$CYCLE_ID" \
        --arg construct_slug "$STAGE_CONSTRUCT" \
        --arg persona "$STAGE_PERSONA" \
        --arg invocation_path "at_mention" \
        --argjson inputs "$ROOM_INPUTS" \
        --arg expected_output "$EXPECTED_OUTPUT" \
        --arg run_id "$RUN_ID" \
        --argjson stage_index "$i" \
        --arg created_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg created_by "compose-dispatch.sh" \
        '{
            cycle_id: $cycle_id,
            construct_slug: $construct_slug,
            persona: (if $persona == "" then null else $persona end),
            mode: "room",
            invocation_path: $invocation_path,
            inputs: $inputs,
            expected_output_type: $expected_output,
            expected_handoff_path: null,
            composition_run_id: $run_id,
            stage_index: $stage_index,
            forbidden_context: [],
            allowed_skills: [],
            created_at: $created_at,
            created_by: $created_by
        }')"

    # Compute room_id
    ROOM_ID="$(python3 -c "
import json, sys, hashlib, rfc8785
body = json.loads(sys.argv[1])
print('sha256:' + hashlib.sha256(rfc8785.dumps(body)).hexdigest())
" "$ROOM_BODY")"

    ROOM_PACKET="$(echo "$ROOM_BODY" | jq --arg id "$ROOM_ID" '. + {room_id: $id}')"
    ROOM_PATH="$ROOMS_DIR/${ROOM_ID#sha256:}.json"
    echo "$ROOM_PACKET" | jq . > "$ROOM_PATH"

    # Validate room packet
    if ! "$ROOM_VALIDATOR" "$ROOM_PATH" --json > /dev/null 2>&1; then
        echo "ERROR: stage $i room packet validation failed" >&2
        "$ROOM_VALIDATOR" "$ROOM_PATH" >&2 || true
        log_event "stage.room_packet_invalid" "$(jq -n --arg path "$ROOM_PATH" --argjson stage "$i" '{stage: $stage, packet: $path}')"
        exit 2
    fi

    log_event "stage_enter" "$(jq -n --argjson stage "$i" --arg construct "$STAGE_CONSTRUCT" --arg room_id "$ROOM_ID" --arg room_path "$ROOM_PATH" \
        '{stage: $stage, construct: $construct, room_id: $room_id, room_path: $room_path}')"

    HANDOFF_PATH="$ENVELOPES_DIR/$(printf '%02d' $i).$STAGE_CONSTRUCT.handoff.json"

    if [[ "$DRY_RUN" == "1" ]]; then
        [[ "$OUTPUT_JSON" == "1" ]] || echo "[compose-dispatch] DRY-RUN: stage $i would dispatch via $MODE; room packet at $ROOM_PATH"
        log_event "stage_dry_run" "$(jq -n --argjson stage "$i" '{stage: $stage}')"
        continue
    fi

    case "$MODE" in
        interactive)
            # Form A: write dispatch prompt for operator to paste
            PROMPT_PATH="$PROMPTS_DIR/stage-$i.prompt.md"
            skill_hint="${STAGE_SKILL:-construct default}"
            {
                echo "@agent-construct-$STAGE_CONSTRUCT please run a room invocation per this packet:"
                echo "- Room packet: $ROOM_PATH"
                echo "- Cycle: $CYCLE_ID"
                echo "- Composition run: $RUN_ID"
                echo "- Stage index: $i"
                echo "- Skill suggested: $skill_hint"
                echo "- Expected output type: $EXPECTED_OUTPUT"
                echo ""
                echo "Inputs echoed from prior stage output_refs (may be empty for stage 0):"
                echo '```json'
                echo "$ROOM_INPUTS"
                echo '```'
                echo ""
                echo "When you finish, write your handoff packet to:"
                echo "  $HANDOFF_PATH"
                echo ""
                echo "Required packet fields per FR-3.1: construct_slug, output_type, verdict, invocation_mode, cycle_id."
                echo "Recommended: persona, output_refs, evidence."
                echo "Schema: .claude/data/trajectory-schemas/construct-handoff.schema.json"
                echo ""
                echo "Return a one-line summary: stage $i complete <packet path>"
            } > "$PROMPT_PATH"
            [[ "$OUTPUT_JSON" == "1" ]] || cat <<EOF
[compose-dispatch] OPERATOR ACTION REQUIRED — stage $i Form A dispatch:
  $(cat "$PROMPT_PATH")

Once stage $i's subagent has written the handoff packet, re-run with:
  compose-dispatch.sh "$COMP_PATH" --run-id "$RUN_ID" --stage $((i+1))
EOF
            log_event "stage_dispatch_pending_operator" "$(jq -n --argjson stage "$i" --arg prompt "$PROMPT_PATH" --arg expected_handoff "$HANDOFF_PATH" \
                '{stage: $stage, prompt: $prompt, expected_handoff: $expected_handoff}')"
            PENDING_OPERATOR=1
            # Continue iterating to emit all stage prompts; don't exit yet
            ;;

        headless)
            # Form B: claude -p invocation. Sprint 4 completes this path; Sprint 2 stub:
            log_event "stage_dispatch_headless_stub" "$(jq -n --argjson stage "$i" '{stage: $stage, status: "sprint_4_completes_this"}')"
            [[ "$OUTPUT_JSON" == "1" ]] || echo "[compose-dispatch] WARN: headless dispatch is Sprint-4 stubbed; stage $i not actually executed"
            # In real implementation: claude -p with a similar prompt, then extract handoff packet from output
            ;;
    esac

    # Validate handoff packet (only if it exists — operator hasn't yet pasted/Sprint 4 hasn't run)
    if [[ -f "$HANDOFF_PATH" ]]; then
        if ! "$HANDOFF_VALIDATOR" "$HANDOFF_PATH" --json > /dev/null 2>&1; then
            echo "ERROR: stage $i handoff packet validation failed" >&2
            "$HANDOFF_VALIDATOR" "$HANDOFF_PATH" >&2 || true
            log_event "stage.handoff_invalid" "$(jq -n --argjson stage "$i" --arg path "$HANDOFF_PATH" '{stage: $stage, path: $path}')"
            exit 2
        fi
        log_event "stage_exit" "$(jq -n --argjson stage "$i" --arg construct "$STAGE_CONSTRUCT" --arg handoff "$HANDOFF_PATH" \
            '{stage: $stage, construct: $construct, handoff: $handoff}')"
        PRIOR_HANDOFF_PATH="$HANDOFF_PATH"
        STAGES_DISPATCHED=$((STAGES_DISPATCHED + 1))
    fi
done

if [[ "$PENDING_OPERATOR" == "1" ]]; then
    log_event "compose.awaiting_operator" "$(jq -n --argjson dispatched "$STAGES_DISPATCHED" --argjson total "$NUM_STAGES" '{dispatched: $dispatched, total: $total}')"
    if [[ "$OUTPUT_JSON" == "1" ]]; then
        jq -n --arg run_id "$RUN_ID" --argjson stages "$NUM_STAGES" --arg mode "$MODE" --argjson dispatched "$STAGES_DISPATCHED" \
            '{run_id: $run_id, mode: $mode, stages: $stages, awaiting_operator: true, dispatched: $dispatched, exit_code: 3}'
    fi
    exit 3
fi

log_event "compose.complete" "$(jq -n --argjson dispatched "$STAGES_DISPATCHED" --argjson total "$NUM_STAGES" '{dispatched: $dispatched, total: $total}')"

if [[ "$OUTPUT_JSON" == "1" ]]; then
    jq -n --arg run_id "$RUN_ID" --argjson stages "$NUM_STAGES" --arg mode "$MODE" --argjson dispatched "$STAGES_DISPATCHED" \
        '{run_id: $run_id, mode: $mode, stages: $stages, dispatched: $dispatched, exit_code: 0}'
else
    echo "[compose-dispatch] complete — $STAGES_DISPATCHED of $NUM_STAGES stages dispatched"
fi
exit 0

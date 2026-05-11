#!/usr/bin/env bash
# =============================================================================
# loa-handoff-collect.sh — SubagentStop hook (Sprint 5, S5-T2)
# =============================================================================
# Cycle: simstim-20260509-aead9136
# PRD: NFR-3.3 (subagent observability)
# SDD: §2.7.2
#
# Invoked by Claude Code at SubagentStop. Scans the subagent transcript for
# the last fenced JSON block matching construct-handoff schema; if found,
# writes to .run/compose/<run_id>/envelopes/ and validates.
#
# Logs subagent.stop event to .run/audit.jsonl with collection outcome.
#
# Per FR-8.3: foreground subagent timeout-on-AskUserQuestion → emit
# gates_failed: operator_unavailable to the audit log (informational).
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
AUDIT_LOG="$PROJECT_ROOT/.run/audit.jsonl"
HANDOFF_VALIDATOR="$PROJECT_ROOT/.claude/scripts/handoff-validate.sh"

mkdir -p "$(dirname "$AUDIT_LOG")"

NAME="${SUBAGENT_NAME:-${1:-unknown}}"
AGENT_ID="${SUBAGENT_ID:-${2:-unknown}}"
TRANSCRIPT_PATH="${SUBAGENT_TRANSCRIPT_PATH:-${3:-}}"
EXIT_STATUS="${SUBAGENT_EXIT_STATUS:-${4:-unknown}}"
EXPECTED_HANDOFF="${SUBAGENT_EXPECTED_HANDOFF:-${5:-}}"

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Default audit payload
audit_payload="$(jq -n \
    --arg event "subagent.stop" \
    --arg ts "$TS" \
    --arg name "$NAME" \
    --arg agent_id "$AGENT_ID" \
    --arg transcript "$TRANSCRIPT_PATH" \
    --arg exit_status "$EXIT_STATUS" \
    --arg expected_handoff "$EXPECTED_HANDOFF" \
    '{event: $event, ts: $ts, name: $name, agent_id: $agent_id, transcript_path: $transcript, exit_status: $exit_status, expected_handoff: $expected_handoff, handoff_collected: false, validation: null, warnings: []}')"

# Only attempt collection for construct-* subagents
if [[ "$NAME" != construct-* ]]; then
    audit_payload="$(echo "$audit_payload" | jq '. + {scope: "non_construct_skip"}')"
    echo "$audit_payload" | jq -c . >> "$AUDIT_LOG"
    exit 0
fi

# Try to extract handoff packet from transcript
if [[ -z "$TRANSCRIPT_PATH" ]] || [[ ! -f "$TRANSCRIPT_PATH" ]]; then
    audit_payload="$(echo "$audit_payload" | jq '.warnings += ["transcript_missing"]')"
    echo "$audit_payload" | jq -c . >> "$AUDIT_LOG"
    exit 0
fi

# Extract last fenced ```json block matching construct-handoff schema
extracted_packet="$(python3 - "$TRANSCRIPT_PATH" <<'PYEOF'
import sys, re, json

with open(sys.argv[1]) as f:
    content = f.read()

# Find all fenced ```json blocks
pattern = re.compile(r"```json\s*\n(.*?)\n```", re.DOTALL)
matches = pattern.findall(content)

# Walk in reverse (last block wins) and find first that has required fields
required = {"construct_slug", "output_type", "verdict", "invocation_mode", "cycle_id"}
for block in reversed(matches):
    try:
        d = json.loads(block)
    except json.JSONDecodeError:
        continue
    if not isinstance(d, dict):
        continue
    if required.issubset(d.keys()):
        print(json.dumps(d))
        sys.exit(0)

# No matching packet found
sys.exit(1)
PYEOF
)" || extracted_packet=""

if [[ -z "$extracted_packet" ]]; then
    audit_payload="$(echo "$audit_payload" | jq '.warnings += ["no_handoff_packet_found"]')"
    echo "$audit_payload" | jq -c . >> "$AUDIT_LOG"
    exit 0
fi

# Determine destination
if [[ -z "$EXPECTED_HANDOFF" ]]; then
    # Default: .run/audit-collected-handoffs/<agent_id>.handoff.json
    EXPECTED_HANDOFF="$PROJECT_ROOT/.run/audit-collected-handoffs/${AGENT_ID:-unknown}.handoff.json"
fi
mkdir -p "$(dirname "$EXPECTED_HANDOFF")"

echo "$extracted_packet" > "$EXPECTED_HANDOFF"

# Validate
validation_result="$("$HANDOFF_VALIDATOR" "$EXPECTED_HANDOFF" --json 2>&1 || true)"
validation_ok="$(echo "$validation_result" | jq -r '.ok // false' 2>/dev/null || echo "false")"
validation_reason="$(echo "$validation_result" | jq -r '.reason // "unknown"' 2>/dev/null || echo "unknown")"

audit_payload="$(echo "$audit_payload" | jq \
    --arg path "$EXPECTED_HANDOFF" \
    --arg vok "$validation_ok" \
    --arg vreason "$validation_reason" \
    '. + {handoff_collected: true, handoff_path: $path, validation: {ok: $vok, reason: $vreason}}')"

echo "$audit_payload" | jq -c . >> "$AUDIT_LOG"
exit 0

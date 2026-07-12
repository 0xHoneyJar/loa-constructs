#!/usr/bin/env bash
# =============================================================================
# feedback-v3-emit.sh — emit a feedback-v3 Verdict-stream row (cycle-003 L4)
# =============================================================================
# Writes one JSON row to .run/feedback-v3.jsonl, validating against
# .claude/schemas/feedback-v3.schema.json.
#
# Usage:
#   feedback-v3-emit.sh <persona> <session_id> <trigger> <findings-json> [kansei-json]
#
# Args:
#   persona        — pack name or persona identifier (e.g., "Artisan", "ALEXANDER")
#   session_id     — UUID, typically from construct-trajectory entry row
#   trigger        — what invoked the skill (e.g., "skill:decomposing-feel")
#   findings-json  — JSON array of findings objects (id, severity, description, suggestion)
#   kansei-json    — optional JSON object of kansei signals (Q1-Q5 booleans)
#
# Emits a row matching feedback-v3 schema v3.0.0. Doctrine §3 stream_type: Verdict.
# Doctrine §14.3 read_mode: defaults to "orient"; overridable via LOA_READ_MODE.
#
# Exit codes:
#   0 = success (row written, validation passed)
#   1 = missing arguments
#   2 = invalid JSON input
#   3 = schema validation failed
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
FEEDBACK_FILE="${LOA_FEEDBACK_V3_FILE:-$PROJECT_ROOT/.run/feedback-v3.jsonl}"
SCHEMA_FILE="${LOA_FEEDBACK_V3_SCHEMA:-$PROJECT_ROOT/.claude/schemas/workflow/feedback-v3.schema.json}"

if [[ $# -lt 4 ]]; then
    echo "usage: $0 <persona> <session_id> <trigger> <findings-json> [kansei-json]" >&2
    exit 1
fi

persona="$1"
session_id="$2"
trigger="$3"
findings_json="$4"
kansei_json="${5:-{\}}"

read_mode="${LOA_READ_MODE:-orient}"
stream_type="Verdict"

# Validate findings + kansei are valid JSON before building the row.
if ! echo "$findings_json" | jq empty 2>/dev/null; then
    echo "feedback-v3-emit: invalid findings JSON" >&2
    exit 2
fi
if ! echo "$kansei_json" | jq empty 2>/dev/null; then
    echo "feedback-v3-emit: invalid kansei JSON" >&2
    exit 2
fi

# Current timestamp (end); start time can be derived upstream.
now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
# 5 minute default start offset — callers should override with real session start.
t_start="${LOA_SESSION_START:-$now}"

row=$(jq -cn \
    --arg schema_version "3.0.0" \
    --arg persona "$persona" \
    --arg session_id "$session_id" \
    --arg trigger "$trigger" \
    --arg timestamp_start "$t_start" \
    --arg timestamp_end "$now" \
    --arg stream_type "$stream_type" \
    --arg read_mode "$read_mode" \
    --argjson findings "$findings_json" \
    --argjson kansei "$kansei_json" \
    '{schema_version: $schema_version,
      persona: $persona,
      session_id: $session_id,
      trigger: $trigger,
      timestamp_start: $timestamp_start,
      timestamp_end: $timestamp_end,
      findings: $findings,
      kansei_signals: $kansei}')

# Schema validation (best-effort — skip if ajv/check-jsonschema unavailable).
if command -v check-jsonschema &>/dev/null && [[ -f "$SCHEMA_FILE" ]]; then
    if ! echo "$row" | check-jsonschema --schemafile "$SCHEMA_FILE" /dev/stdin >/dev/null 2>&1; then
        echo "feedback-v3-emit: schema validation FAILED" >&2
        echo "$row" | jq . >&2
        exit 3
    fi
fi

mkdir -p "$(dirname "$FEEDBACK_FILE")" 2>/dev/null || true
echo "$row" >> "$FEEDBACK_FILE"

# Echo the row for piping / further processing (Verdict → downstream consumer).
echo "$row"

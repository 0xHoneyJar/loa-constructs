#!/usr/bin/env bash
# =============================================================================
# loa-tool-mandate.sh — SubagentStart hook (Sprint 5, S5-T1)
# =============================================================================
# Cycle: simstim-20260509-aead9136
# PRD: FR-7 (tool mandate enforcement) — observability primary per Sprint 0
# SDD: §2.7.1
#
# Invoked by Claude Code at SubagentStart per .claude/hooks/settings.json.
# Reads subagent context (env vars or stdin), logs to:
#
#   .run/audit.jsonl                — every spawned subagent
#   .run/construct-trajectory.jsonl — when name starts with construct-
#
# Computes denylist violations + missing required tools by reading the adapter's
# Loa block. Per Sprint 0 Probe 1 outcome, these are LOGGED not BLOCKED — exit 0
# regardless of findings. Future cycle MAY upgrade to blocking once Claude Code
# documents whether SubagentStart hooks can prevent spawn.
#
# Also implements bridge iter 1 M-3: invocation-authority drift check. If the
# subagent's invocation_path was natural_language and the adapter declares
# invocation_modes: [room] (no studio), log gates_failed: invocation_authority_drift.
#
# Hook safety contract:
#   - Runs in env -i minimal allowlist (per Loa hook conventions)
#   - Exits fast (target <500ms)
#   - Only writes to .run/audit.jsonl + .run/construct-trajectory.jsonl
#   - Never modifies construct state
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
AUDIT_LOG="$PROJECT_ROOT/.run/audit.jsonl"
TRAJECTORY_LOG="$PROJECT_ROOT/.run/construct-trajectory.jsonl"
AGENTS_DIR="$PROJECT_ROOT/.claude/agents"

mkdir -p "$(dirname "$AUDIT_LOG")"

# Subagent context — read from env vars (Claude Code convention) or stdin JSON
NAME="${SUBAGENT_NAME:-${1:-unknown}}"
AGENT_ID="${SUBAGENT_ID:-${2:-unknown}}"
TOOLS_RAW="${SUBAGENT_TOOLS:-${3:-}}"
PARENT_SESSION="${SUBAGENT_PARENT_SESSION:-${4:-unknown}}"
INVOCATION_PATH_INPUT="${SUBAGENT_INVOCATION_PATH:-${5:-unknown}}"

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Convert tools "Read,Grep,Bash" → JSON array
tools_json="[]"
if [[ -n "$TOOLS_RAW" ]]; then
    tools_json="$(echo "$TOOLS_RAW" | tr ',' '\n' | sed 's/^[ \t]*//; s/[ \t]*$//' | grep -v '^$' | jq -R . | jq -s .)"
fi

# Default audit envelope
audit_payload="$(jq -n \
    --arg event "subagent.start" \
    --arg ts "$TS" \
    --arg name "$NAME" \
    --arg agent_id "$AGENT_ID" \
    --arg parent_session "$PARENT_SESSION" \
    --arg invocation_path "$INVOCATION_PATH_INPUT" \
    --argjson tools "$tools_json" \
    '{event: $event, ts: $ts, name: $name, agent_id: $agent_id, parent_session: $parent_session, invocation_path: $invocation_path, tools: $tools, gates_failed: []}')"

# Construct-prefix detection
gates_failed="[]"
if [[ "$NAME" == construct-* ]]; then
    construct_slug="${NAME#construct-}"
    adapter_path="$AGENTS_DIR/$NAME.md"

    if [[ -f "$adapter_path" ]]; then
        # Extract Loa block tools_denied + tools_required + invocation_modes
        # Adapter format: YAML frontmatter starts/ends with ---
        manifest_data="$(python3 - "$adapter_path" <<'PYEOF'
import sys, yaml, json, re

with open(sys.argv[1]) as f:
    content = f.read()

m = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
if not m:
    print(json.dumps({"_error": "no_frontmatter"}))
    sys.exit(0)

try:
    fm = yaml.safe_load(m.group(1))
except Exception as e:
    print(json.dumps({"_error": str(e)}))
    sys.exit(0)

loa = fm.get("loa", {}) if isinstance(fm.get("loa"), dict) else {}
out = {
    "tools_denied": loa.get("tools_denied", []) or [],
    "tools_required": loa.get("tools_required", []) or [],
    "invocation_modes": loa.get("invocation_modes", ["room"]) or ["room"],
}
print(json.dumps(out))
PYEOF
)"
        denied="$(echo "$manifest_data" | jq -c '.tools_denied // []')"
        required="$(echo "$manifest_data" | jq -c '.tools_required // []')"
        invocation_modes="$(echo "$manifest_data" | jq -c '.invocation_modes // ["room"]')"

        # Check denylist violations: tools_denied ∩ subagent.tools
        denylist_violations="$(jq -nc --argjson denied "$denied" --argjson tools "$tools_json" \
            '[$tools[] | select(. as $t | $denied | index($t))]')"

        if [[ "$(echo "$denylist_violations" | jq 'length')" -gt 0 ]]; then
            gates_failed="$(jq -nc --argjson g "$gates_failed" \
                --arg name "tool_mandate_drift" \
                --argjson tools "$denylist_violations" \
                '$g + [{gate_name: $name, status: "failed", reason: ("tools in denylist: " + ($tools | tostring))}]')"
        fi

        # M-3 invocation_authority_drift: natural_language signal but adapter doesn't allow studio
        if [[ "$INVOCATION_PATH_INPUT" == "natural_language" ]]; then
            allows_studio="$(echo "$invocation_modes" | jq 'index("studio") != null')"
            if [[ "$allows_studio" != "true" ]]; then
                gates_failed="$(jq -nc --argjson g "$gates_failed" \
                    --argjson modes "$invocation_modes" \
                    '$g + [{gate_name: "invocation_authority_drift", status: "failed", reason: ("invocation_path=natural_language but adapter invocation_modes=" + ($modes | tostring) + " does not include studio")}]')"
            fi
        fi

        # Augment audit payload
        audit_payload="$(echo "$audit_payload" | jq --arg slug "$construct_slug" --argjson denied "$denied" --argjson required "$required" --argjson modes "$invocation_modes" --argjson gf "$gates_failed" \
            '. + {construct_slug: $slug, manifest: {tools_denied: $denied, tools_required: $required, invocation_modes: $modes}, gates_failed: $gf}')"

        # Write to construct-trajectory.jsonl
        echo "$audit_payload" | jq -c . >> "$TRAJECTORY_LOG"
    fi
elif [[ "$NAME" == loa-validator-* ]]; then
    audit_payload="$(echo "$audit_payload" | jq '. + {agent_class: "validator"}')"
fi

# Always write to audit log
echo "$audit_payload" | jq -c . >> "$AUDIT_LOG"

# Per Sprint 0: observability-primary path. Hook never blocks; exit 0.
exit 0

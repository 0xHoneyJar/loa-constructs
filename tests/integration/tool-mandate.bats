#!/usr/bin/env bats
# =============================================================================
# tool-mandate.bats — T6 + T7 acceptance + bridge iter 1 M-3
# =============================================================================
# Cycle: simstim-20260509-aead9136 (Sprint 5, S5-T3 + S5-T4)
# PRD: §8.6 T6 (Tool Mandate Enforcement), §8.7 T7 (AskUserQuestion Gate)
# SDD: §2.7
#
# Per Sprint 0 Probe 1 outcome: FR-7 path is OBSERVABILITY primary.
# Tests assert hook log shape on simulated invocations rather than blocked spawns.
# Real Claude Code SubagentStart events are out-of-test-scope; hooks are
# invoked directly via env vars per the Loa hook calling convention.
# =============================================================================

fail() {
    echo "FAIL: $*" >&2
    return 1
}

setup() {
    PROJECT_ROOT="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)"
    cd "$PROJECT_ROOT"
    START_HOOK="$PROJECT_ROOT/.claude/hooks/subagent-start/loa-tool-mandate.sh"
    STOP_HOOK="$PROJECT_ROOT/.claude/hooks/subagent-stop/loa-handoff-collect.sh"
    AUDIT_LOG="$PROJECT_ROOT/.run/audit.jsonl"
    TRAJECTORY_LOG="$PROJECT_ROOT/.run/construct-trajectory.jsonl"

    [[ -x "$START_HOOK" ]] || skip "SubagentStart hook missing"
    [[ -x "$STOP_HOOK" ]] || skip "SubagentStop hook missing"

    # Per-test isolation: snapshot audit log size; restore in teardown
    AUDIT_BEFORE=0
    [[ -f "$AUDIT_LOG" ]] && AUDIT_BEFORE="$(wc -l < "$AUDIT_LOG" | tr -d ' ')"
    TRAJ_BEFORE=0
    [[ -f "$TRAJECTORY_LOG" ]] && TRAJ_BEFORE="$(wc -l < "$TRAJECTORY_LOG" | tr -d ' ')"
}

invoke_start_hook() {
    local name="$1" tools="$2" agent_id="${3:-test-agent-001}" invocation_path="${4:-at_mention}"
    SUBAGENT_NAME="$name" \
    SUBAGENT_TOOLS="$tools" \
    SUBAGENT_ID="$agent_id" \
    SUBAGENT_INVOCATION_PATH="$invocation_path" \
    SUBAGENT_PARENT_SESSION="test-session" \
    "$START_HOOK"
}

last_audit_event() {
    [[ -f "$AUDIT_LOG" ]] || return 1
    tail -1 "$AUDIT_LOG"
}

# -----------------------------------------------------------------------------
# T6 — Tool Mandate Enforcement (observability primary)
# -----------------------------------------------------------------------------

@test "T6: SubagentStart hook fires on construct-* spawn" {
    run invoke_start_hook "construct-artisan" "Read,Bash"
    [[ "$status" -eq 0 ]] || fail "hook exited non-zero: $output"

    local audit_now
    audit_now="$(wc -l < "$AUDIT_LOG" | tr -d ' ')"
    [[ "$audit_now" -gt "$AUDIT_BEFORE" ]] || fail "expected new audit log entry; before=$AUDIT_BEFORE now=$audit_now"
}

@test "T6: hook records tools list in audit envelope" {
    invoke_start_hook "construct-artisan" "Read,Grep,Bash" || fail "hook failed"
    local entry
    entry="$(last_audit_event)"
    local tools_count
    tools_count="$(echo "$entry" | jq -r '.tools | length')"
    [[ "$tools_count" == "3" ]] || fail "expected 3 tools, got $tools_count: $entry"

    echo "$entry" | jq -e '.tools | index("Read") != null' > /dev/null || fail "Read missing from tools"
    echo "$entry" | jq -e '.tools | index("Bash") != null' > /dev/null || fail "Bash missing from tools"
}

@test "T6: hook construct-* invocation writes to construct-trajectory.jsonl" {
    invoke_start_hook "construct-artisan" "Read,Bash" || fail "hook failed"
    local traj_now
    traj_now="$(wc -l < "$TRAJECTORY_LOG" | tr -d ' ')"
    [[ "$traj_now" -gt "$TRAJ_BEFORE" ]] || fail "expected construct-trajectory entry"
}

@test "T6: hook detects k-hole-style denylist violation if manifest declares one" {
    # Synthesize a temporary adapter with denylist for this test only
    local synth_adapter="$PROJECT_ROOT/.claude/agents/construct-test-mandate-fixture.md"
    cat > "$synth_adapter" <<'EOF'
---
name: construct-test-mandate-fixture
description: "Test fixture for T6 denylist enforcement"
tools: Read, Bash
model: inherit

loa:
  construct_slug: test-mandate-fixture
  schema_version: 4
  invocation_modes: [room]
  tools_required: []
  tools_denied: [WebSearch]
  domain:
    primary: test
    ubiquitous_language: []
    out_of_domain: []
---

Test adapter — present only during T6 acceptance run.
EOF

    # Now invoke the hook with a tool list that VIOLATES the denylist (includes WebSearch)
    SUBAGENT_NAME="construct-test-mandate-fixture" \
    SUBAGENT_TOOLS="Read,Bash,WebSearch" \
    SUBAGENT_ID="t6-fixture-agent" \
    SUBAGENT_INVOCATION_PATH="at_mention" \
    "$START_HOOK" || fail "hook failed"

    local entry
    entry="$(grep '"name":"construct-test-mandate-fixture"' "$AUDIT_LOG" | tail -1)"
    [[ -n "$entry" ]] || fail "no audit entry for fixture construct"

    # Cleanup the fixture adapter regardless
    rm -f "$synth_adapter"

    # Assert gates_failed contains tool_mandate_drift
    local gates_count
    gates_count="$(echo "$entry" | jq -r '.gates_failed | length')"
    [[ "$gates_count" -ge 1 ]] || fail "expected ≥1 gates_failed entry, got $gates_count: $entry"

    echo "$entry" | jq -e '.gates_failed[] | select(.gate_name == "tool_mandate_drift")' > /dev/null \
        || fail "expected tool_mandate_drift gate in entry: $entry"
}

@test "T6: clean construct invocation produces zero gates_failed" {
    invoke_start_hook "construct-artisan" "Read,Grep,Glob,Bash" || fail "hook failed"
    local entry
    entry="$(last_audit_event)"
    local gates_count
    gates_count="$(echo "$entry" | jq -r '.gates_failed | length')"
    [[ "$gates_count" == "0" ]] || fail "expected 0 gates_failed for clean invocation, got $gates_count"
}

# -----------------------------------------------------------------------------
# Bridge iter 1 M-3 — invocation_authority_drift
# -----------------------------------------------------------------------------

@test "M-3: natural_language invocation_path on room-only adapter logs authority drift" {
    # construct-artisan is room-only (declared in its adapter loa.invocation_modes)
    invoke_start_hook "construct-artisan" "Read,Grep,Bash" "drift-test-agent" "natural_language" || fail "hook failed"
    local entry
    entry="$(last_audit_event)"
    echo "$entry" | jq -e '.gates_failed[] | select(.gate_name == "invocation_authority_drift")' > /dev/null \
        || fail "expected invocation_authority_drift gate; got: $entry"
}

@test "M-3: at_mention invocation_path produces no authority drift" {
    invoke_start_hook "construct-artisan" "Read,Grep,Bash" "clean-agent" "at_mention" || fail "hook failed"
    local entry
    entry="$(last_audit_event)"
    local drift_count
    drift_count="$(echo "$entry" | jq -r '[.gates_failed[] | select(.gate_name == "invocation_authority_drift")] | length')"
    [[ "$drift_count" == "0" ]] || fail "at_mention should not trigger authority drift, got $drift_count"
}

# -----------------------------------------------------------------------------
# T7 — AskUserQuestion Gate (SubagentStop hook + handoff collection)
# -----------------------------------------------------------------------------

@test "T7: SubagentStop hook collects handoff packet from transcript" {
    # Synthesize a mock transcript with a fenced ```json handoff block
    local mock_transcript="$(mktemp /tmp/mock-transcript.XXXXXX.txt)"
    cat > "$mock_transcript" <<'EOF'
[some prior transcript content...]

Here is my analysis. Returning the structured handoff packet:

```json
{
  "construct_slug": "artisan",
  "output_type": "Verdict",
  "verdict": {"score": 4, "summary": "Structure holds"},
  "invocation_mode": "room",
  "cycle_id": "simstim-20260509-aead9136",
  "persona": "ALEXANDER",
  "output_refs": [],
  "evidence": ["test fixture"]
}
```

Done.
EOF

    local expected_path="$(mktemp -d /tmp/handoff-out.XXXXXX)/handoff.json"
    SUBAGENT_NAME="construct-artisan" \
    SUBAGENT_ID="t7-collect-agent" \
    SUBAGENT_TRANSCRIPT_PATH="$mock_transcript" \
    SUBAGENT_EXIT_STATUS="0" \
    SUBAGENT_EXPECTED_HANDOFF="$expected_path" \
    "$STOP_HOOK" || fail "stop hook failed"

    [[ -f "$expected_path" ]] || fail "expected handoff packet not written"

    local collected_score
    collected_score="$(jq -r '.verdict.score' "$expected_path")"
    [[ "$collected_score" == "4" ]] || fail "expected score 4, got $collected_score"

    rm -f "$mock_transcript"
    rm -rf "$(dirname "$expected_path")"
}

@test "T7: missing handoff packet logs warning, exits 0" {
    local mock_transcript="$(mktemp /tmp/mock-no-packet.XXXXXX.txt)"
    cat > "$mock_transcript" <<'EOF'
This transcript has no fenced JSON handoff block.
EOF

    local expected_path="$(mktemp -d /tmp/handoff-out.XXXXXX)/handoff.json"
    run env SUBAGENT_NAME="construct-artisan" \
        SUBAGENT_ID="t7-noresult-agent" \
        SUBAGENT_TRANSCRIPT_PATH="$mock_transcript" \
        SUBAGENT_EXIT_STATUS="0" \
        SUBAGENT_EXPECTED_HANDOFF="$expected_path" \
        "$STOP_HOOK"

    rm -f "$mock_transcript"
    rm -rf "$(dirname "$expected_path")"

    [[ "$status" -eq 0 ]] || fail "stop hook should exit 0 even when no packet found, got $status"

    local entry
    entry="$(grep '"agent_id":"t7-noresult-agent"' "$AUDIT_LOG" | tail -1)"
    [[ -n "$entry" ]] || fail "no audit entry for noresult test"

    echo "$entry" | jq -e '.warnings | index("no_handoff_packet_found") != null' > /dev/null \
        || fail "expected warning no_handoff_packet_found in: $entry"
}

@test "T7: stop hook validates collected packet via handoff-validate.sh" {
    local mock_transcript="$(mktemp /tmp/mock-valid.XXXXXX.txt)"
    cat > "$mock_transcript" <<'EOF'
```json
{
  "construct_slug": "artisan",
  "output_type": "Verdict",
  "verdict": {"summary": "ok"},
  "invocation_mode": "room",
  "cycle_id": "test",
  "persona": "ALEXANDER",
  "output_refs": [{"type": "verdict", "ref": "test"}],
  "evidence": ["test"]
}
```
EOF

    local expected_path="$(mktemp -d /tmp/handoff-out.XXXXXX)/handoff.json"
    SUBAGENT_NAME="construct-artisan" \
    SUBAGENT_ID="t7-valid-agent" \
    SUBAGENT_TRANSCRIPT_PATH="$mock_transcript" \
    SUBAGENT_EXIT_STATUS="0" \
    SUBAGENT_EXPECTED_HANDOFF="$expected_path" \
    "$STOP_HOOK" || fail "stop hook failed"

    local entry
    entry="$(grep '"agent_id":"t7-valid-agent"' "$AUDIT_LOG" | tail -1)"
    rm -f "$mock_transcript"
    rm -rf "$(dirname "$expected_path")"

    echo "$entry" | jq -e '.validation.ok == "true"' > /dev/null || fail "expected validation.ok=true: $entry"
}

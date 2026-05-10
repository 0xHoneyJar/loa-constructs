# Subagent Hook Installation — Sprint 5 Integration

**Cycle**: simstim-20260509-aead9136
**Sprint**: cycle-construct-rooms-sprint-5
**Status**: hooks authored + tested; settings.json wiring is operator-controlled
**Bridge finding addressed**: cycle-final-review HIGH-1

---

## What this document does

The Sprint 5 hooks (`loa-tool-mandate.sh` for SubagentStart, `loa-handoff-collect.sh` for SubagentStop) exist at conventional paths and are bats-tested. To activate them, **`.claude/settings.json` must register them** with Claude Code's hook system. This document gives the recommended addition.

Per project rule, framework-managed `.claude/settings.json` should not be edited directly during a cycle. The operator decides when to merge this addition.

## Recommended merge — append to `.claude/settings.json::hooks`

Add these two top-level keys to the `"hooks": { ... }` object in `.claude/settings.json`:

```json
"SubagentStart": [
  {
    "matcher": "",
    "hooks": [
      {
        "type": "command",
        "command": ".claude/hooks/subagent-start/loa-tool-mandate.sh"
      }
    ]
  }
],
"SubagentStop": [
  {
    "matcher": "",
    "hooks": [
      {
        "type": "command",
        "command": ".claude/hooks/subagent-stop/loa-handoff-collect.sh"
      }
    ]
  }
]
```

The `matcher: ""` empty string means: fire on every subagent lifecycle event regardless of subagent name. The hook itself filters internally for `construct-*` and `loa-validator-*` names.

## Empirical verification after merge

Once added to settings.json, smoke-test by invoking a construct adapter from a fresh Claude Code session:

```
@agent-construct-artisan respond with hello
```

Then check:

```bash
# Audit log should have a subagent.start entry
tail -1 .run/audit.jsonl | jq

# Construct trajectory should also have it
tail -1 .run/construct-trajectory.jsonl | jq

# After the subagent stops, audit log should also have a subagent.stop entry
grep '"event":"subagent.stop"' .run/audit.jsonl | tail -1 | jq
```

If the entries appear, the hooks are integrated. If not, Claude Code may use a different env-var convention than the hooks expect — see `tool-mandate.bats` for the env-var shape the hooks consume, and adjust the hook script accordingly.

## Hook env-var contract

The hooks expect these env vars from Claude Code's hook calling convention:

| Env var | Purpose | Default |
|---|---|---|
| `SUBAGENT_NAME` | Spawned agent name (e.g., `construct-artisan`) | `unknown` |
| `SUBAGENT_ID` | Spawn-unique ID | `unknown` |
| `SUBAGENT_TOOLS` | Comma-separated tool list (e.g., `Read,Bash,WebSearch`) | empty |
| `SUBAGENT_PARENT_SESSION` | Parent operator session ID | `unknown` |
| `SUBAGENT_INVOCATION_PATH` | One of `at_mention`, `agent_call`, `room_packet`, `natural_language` | `unknown` |
| `SUBAGENT_TRANSCRIPT_PATH` | (SubagentStop) absolute path to subagent transcript JSONL | empty |
| `SUBAGENT_EXIT_STATUS` | (SubagentStop) `0` or non-zero | `unknown` |
| `SUBAGENT_EXPECTED_HANDOFF` | (SubagentStop) where to write the collected handoff packet | `.run/audit-collected-handoffs/<id>.handoff.json` |

If Claude Code's actual convention differs (e.g., JSON on stdin, different env-var names), update the hooks to match. The bats tests at `tests/integration/tool-mandate.bats` provide the test harness for verifying changes.

## Rollback

If hooks misbehave, comment out or remove the SubagentStart/SubagentStop blocks from `.claude/settings.json`. The hook scripts themselves are non-destructive — they only write to `.run/audit.jsonl` and `.run/construct-trajectory.jsonl`, plus optionally `.run/audit-collected-handoffs/`.

## See also

- `.claude/hooks/subagent-start/loa-tool-mandate.sh` — SubagentStart hook source
- `.claude/hooks/subagent-stop/loa-handoff-collect.sh` — SubagentStop hook source
- `tests/integration/tool-mandate.bats` — hook unit tests (10 green)
- `grimoires/loa/sdd.md` §2.7 — hook design spec
- `.run/bridge-reviews/cycle-final-review.md` HIGH-1 — the finding this document addresses

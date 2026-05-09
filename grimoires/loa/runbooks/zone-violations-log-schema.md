# Zone Violations Audit Log Schema

**Authority**: cycle-0 SDD §1.3 (Enforcement Hook — Interim Defense-in-Depth)
**Cycle**: cycle-0-zone-hygiene
**Status**: schema documented; logging implementation deferred to upstream Loa Issue #818 F1 (zone-write-guard.sh hook)

---

## Purpose

When upstream Loa Issue #818 F1 (`zone-write-guard.sh` PreToolUse hook) lands, every PreToolUse:Write/Edit operation that **would have been blocked** by the hook gets logged to `.run/zone-violations.jsonl` for cycle-1's audit pass.

Until the hook ships, this schema is documentation-only:
- Specifies the JSONL format the hook should produce
- Provides a structure for cycle-1+ to query violations
- Allows project-side tools to voluntarily emit log lines for self-checks

The log is gitignored (`.run/` is gitignored). Per-cycle, operators can grep the log to quantify zone-boundary pressure.

---

## JSONL Schema

Each line is a single JSON object representing one zone-violation event:

```json
{
  "ts": "2026-05-09T19:24:00.123Z",
  "event": "zone.violation_attempted",
  "actor": {
    "type": "skill",
    "name": "/run sprint-plan",
    "session_id": "run-20260509-abc123"
  },
  "attempted_write": {
    "path": ".claude/scripts/example.sh",
    "operation": "edit",
    "would_create_new_file": false
  },
  "zone_attempted": "framework",
  "zone_actor_belongs_to": "project",
  "violation_kind": "PROJECT_TO_FRAMEWORK_WRITE",
  "rule_violated": {
    "actor": "/run sprint-plan",
    "forbidden_writes_to": "framework",
    "reason": "framework is upstream-managed; project commits cannot modify it. Use .claude/overrides/ or .loa.config.yaml for project-side framework customization."
  },
  "outcome": "blocked",
  "branch": "cycle/cycle-N-name",
  "git_sha": "abc1234",
  "additional_context": {
    "calling_skill": "/implement",
    "task_id": "bd-cycle0.5"
  }
}
```

### Required fields

- `ts` — ISO 8601 UTC timestamp with millisecond precision
- `event` — must be `"zone.violation_attempted"` (or `"zone.violation_logged"` for advisory-only events)
- `actor.type` — one of: `"skill" | "command" | "operator" | "automation"`
- `actor.name` — the actor's identifier (skill name, operator handle, automation script name)
- `attempted_write.path` — relative path the actor tried to write
- `attempted_write.operation` — one of: `"create" | "edit" | "delete"`
- `zone_attempted` — which zone the path resolves to per `grimoires/loa/zones.yaml`
- `zone_actor_belongs_to` — the actor's expected zone (lookup from zones.yaml::write_actors)
- `violation_kind` — one of:
  - `"PROJECT_TO_FRAMEWORK_WRITE"` — project work writing to framework zone (NO boundary 11)
  - `"UPDATE_LOA_TO_PROJECT_WRITE"` — /update-loa writing to project zone (NO boundary 12, the leak fix)
  - `"PACK_LOOSE_FILE_INSTALL"` — sync-constructs.sh writing outside manifest paths (NO boundary 13)
  - `"OPERATOR_PRIVATE_LEAK"` — operator-private content escaping into shared zone
- `rule_violated` — exact entry from zones.yaml::forbidden_zone_writes that triggered the block
- `outcome` — one of: `"blocked" | "logged_advisory" | "permitted_with_warning"`

### Optional fields

- `actor.session_id` — for skills/automations that have session identifiers
- `attempted_write.would_create_new_file` — boolean; useful for distinguishing edits from creates
- `branch` — current git branch (helps cycle-1 audit understand context)
- `git_sha` — current HEAD SHA
- `additional_context` — free-form object for skill-specific context

---

## Querying the log

Cycle-1's first audit task should run:

```bash
# Count violations by kind
jq -r '.violation_kind' .run/zone-violations.jsonl | sort | uniq -c | sort -rn

# Top 10 violating actors
jq -r '.actor.name' .run/zone-violations.jsonl | sort | uniq -c | sort -rn | head -10

# Most-touched forbidden paths
jq -r '.attempted_write.path' .run/zone-violations.jsonl | sort | uniq -c | sort -rn | head -10

# Violations on a specific branch
jq 'select(.branch == "cycle/cycle-1-some-name")' .run/zone-violations.jsonl
```

---

## Cycle-0 expected behavior (no hook installed yet)

Until upstream Issue #818 F1 ships:
- The log file at `.run/zone-violations.jsonl` does NOT exist
- Project tools that wish to self-report can write to it manually
- Operator-driven cycle-0 work can append voluntary entries when uncertain about a zone boundary

Example voluntary self-report (project tool that wants to log a self-check):

```bash
echo "$(jq -nc \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
  --arg path "$1" \
  --arg actor "$2" \
  '{ts: $ts, event: "zone.violation_logged", actor: {type: "automation", name: $actor},
    attempted_write: {path: $path, operation: "edit"}, outcome: "logged_advisory",
    additional_context: {note: "voluntary self-report — zone enforcement hook not yet installed"}}'
)" >> .run/zone-violations.jsonl
```

---

## When hook ships (post-Issue-#818-F1)

The hook should:

1. Read `grimoires/loa/zones.yaml` on every PreToolUse:Write/Edit invocation
2. Resolve the target path's zone
3. Resolve the actor's zone (from skill metadata + session context)
4. Check `forbidden_zone_writes` for any matching rule
5. If matched:
   - Append a JSONL entry to `.run/zone-violations.jsonl`
   - Block the tool call (exit non-zero with actionable error)
6. If no match: permit the tool call

Hook should be exempt for:
- The hook script itself (recursion)
- `.run/zone-violations.jsonl` writes (it logs to itself)
- Approved override paths declared in `.loa.config.yaml::zone_write_overrides`

---

## Schema Versioning

This schema is version `1.0`. Future versions:

- `1.1` likely adds: `enforcement_mode: "strict | warn | advisory"` to support graduated rollout per zones.yaml deployment
- `2.0` would change the event-name vocabulary (e.g., split `"zone.violation_attempted"` from `"zone.actor_resolution_failed"`)

The schema lives upstream in Loa once Issue #818 F1 lands. Cycle-0 ships the documentation; the canonical schema file (`zone-violations.schema.json` JSON Schema) lives at `.claude/data/zone-violations.schema.json` (framework zone) per the F1 design.

---

## Cross-references

- cycle-0 SDD §1.3 (Enforcement Hook contract)
- cycle-0 PRD FR-1 + NO boundary 11/12/13
- `grimoires/loa/zones.yaml::forbidden_zone_writes`
- Upstream Loa Issue #818 F1 (zone-write-guard.sh hook)
- Upstream Loa Issue #818 F2 (zone-aware merge filter — separate but related)

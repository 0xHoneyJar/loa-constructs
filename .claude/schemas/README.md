# Loa JSON Schemas

JSON Schema definitions for validating agent outputs and trajectory entries.

## Purpose

These schemas provide structured output validation for Loa's agent system, ensuring consistent document formats and enabling Claude's Structured Outputs feature integration.

## Layout (2026-04-27)

Schemas are organized by **concern**:

```
.claude/schemas/
├── network/           ← The Constructs Network shape
│   ├── construct.schema.json          identity, expertise boundaries, governance, voice
│   ├── pack-manifest.schema.json      construct distribution / pack metadata
│   └── construct-manifest.schema.json construct extension points
│
├── runtime/           ← Runtime orchestration
│   └── composition.schema.json        runtime expert chains (the Form C runtime consumes)
│
├── workflow/          ← Loa framework workflow gates
│   ├── prd.schema.json                Product Requirements Document
│   ├── sdd.schema.json                Software Design Document
│   ├── sprint.schema.json             Sprint Plan
│   ├── trajectory-entry.schema.json   Agent reasoning trace
│   └── feedback-v3.schema.json        Reviewer / auditor feedback
│
└── (top-level — uncategorized)
    ├── adversarial-finding.schema.json
    ├── artifact.schema.json
    ├── intent.schema.json
    ├── signal.schema.json
    ├── verdict.schema.json
    ├── operator-model.schema.json
    ├── flatline-result.schema.json
    ├── ... (~25 others)
```

**Why subdirs**: surfaces the architectural seam visually. The Constructs Network (network/), how constructs run (runtime/), and how the Loa framework builds (workflow/) are three distinct concerns that share this directory but don't share governance. Naming them this way makes "where should this new schema live?" answerable.

**Why some stay flat**: ~30 schemas (stream types like `artifact`/`intent`/`signal`/`verdict`, internal Loa engine schemas like `flatline-result`, supporting schemas like `learnings`, `patterns`, `decisions`) don't have a clean category yet. Categorize them when there's >2 of a kind, not preemptively.

**Schema family invariant**: the family stays cohesive in this repo. Subdirs organize *within* the repo; cross-repo extraction (per VERSIONING.md) requires a clear external use case.

> **Cross-cutting taxonomy**: the Hivemind labels schema lives in [`0xHoneyJar/loa-hivemind`](https://github.com/0xHoneyJar/loa-hivemind), referenced by `composition.schema.json` via `$ref`. See [VERSIONING.md](VERSIONING.md) for the migration record.

## Schema Files (key examples)

| Schema | Path | Purpose | Target Files |
|--------|------|---------|--------------|
| `prd` | `workflow/prd.schema.json` | Product Requirements Document | `grimoires/loa/prd.md` (YAML frontmatter) |
| `sdd` | `workflow/sdd.schema.json` | Software Design Document | `grimoires/loa/sdd.md` (YAML frontmatter) |
| `sprint` | `workflow/sprint.schema.json` | Sprint Plan | `grimoires/loa/sprint.md` (YAML frontmatter) |
| `trajectory-entry` | `workflow/trajectory-entry.schema.json` | Agent reasoning trace | `grimoires/loa/a2a/trajectory/*.jsonl` |
| `composition` | `runtime/composition.schema.json` | Runtime composition (workflow chain) | `grimoires/compositions/**/*.yaml` |
| `construct` | `network/construct.schema.json` | Construct identity + expertise | `construct.yaml` (per-pack) |
| `pack-manifest` | `network/pack-manifest.schema.json` | Construct pack distribution | `.loa-construct-manifest.json` |

## Usage

### Validate a File

```bash
# Auto-detect schema based on file path
.claude/scripts/schema-validator.sh validate grimoires/loa/prd.md

# Specify schema explicitly
.claude/scripts/schema-validator.sh validate output.json --schema prd

# Validation modes
.claude/scripts/schema-validator.sh validate file.md --mode strict  # Fail on errors
.claude/scripts/schema-validator.sh validate file.md --mode warn    # Warn only
.claude/scripts/schema-validator.sh validate file.md --mode disabled # Skip validation
```

### List Available Schemas

```bash
.claude/scripts/schema-validator.sh list
```

## Schema Format

All schemas follow JSON Schema Draft-07 specification:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://loa.dev/schemas/prd.schema.json",
  "title": "Product Requirements Document",
  "description": "Schema for validating PRD output",
  "type": "object",
  "properties": {
    ...
  },
  "required": [...]
}
```

## Configuration

Schema validation can be configured in `.loa.config.yaml`:

```yaml
structured_outputs:
  enabled: true
  validation_mode: "warn"  # strict | warn | disabled
  schemas:
    prd: ".claude/schemas/prd.schema.json"
    sdd: ".claude/schemas/sdd.schema.json"
    sprint: ".claude/schemas/sprint.schema.json"
```

## Integration with Claude Structured Outputs

These schemas are designed to work with Claude's Structured Outputs feature (beta header: `structured-outputs-2025-11-13`). When enabled, Claude guarantees output conformance to the specified schema.

For API integration, schemas can be passed directly to the Claude API:

```python
response = client.messages.create(
    model="claude-opus-4-7",
    messages=[...],
    response_format={
        "type": "json_schema",
        "json_schema": json.load(open(".claude/schemas/prd.schema.json"))
    }
)
```

## Extended Thinking Integration

The `trajectory-entry.schema.json` schema supports extended thinking traces:

```json
{
  "thinking_trace": {
    "steps": ["Step 1: Analyze...", "Step 2: Consider..."],
    "duration_ms": 1500,
    "tokens_used": 450
  }
}
```

This enables logging Claude's internal reasoning for complex agents like `reviewing-code`, `auditing-security`, and `designing-architecture`.

## Related Documentation

- [Claude Structured Outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)
- [Extended Thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [JSON Schema Specification](https://json-schema.org/specification-links.html#draft-7)

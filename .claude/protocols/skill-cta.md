# Skill CTA Protocol

> **Source**: cycle-037 SDD §2.4, PRD FR-2.1
> **Status**: Active (cycle-037 MVP)

## Format

After primary command output, CTA-enabled commands append:

```
Next:
<command-1> — <description>
<command-2> — <description>
```

## Rules

1. Maximum 3 CTAs per invocation
2. CTAs appear after main output, before any grimoire writes
3. Use truenames (e.g., `/implement`) not golden path aliases (e.g., `/build`)
4. Command-context-based: each CTA-enabled command has a static mapping of relevant next steps (cycle-037 MVP). Dynamic workflow-state-derived CTAs using `golden_path.commands` + `truename_map` are future scope.
5. Gated by `cta.enabled: true` in `.loa.config.yaml`

## Enabled Commands (cycle-037 MVP)

| Command | Context | CTAs |
|---------|---------|------|
| `constructs browse` | browse | install, status, loa |
| `constructs status` | status | browse, install, loa |
| `constructs install` | install | quick_start (if available), status, loa |

## Configuration

```yaml
# .loa.config.yaml
cta:
  enabled: false  # default: false
```

## Implementation

- `emit_cta()` in `constructs-lib.sh`
- `is_cta_enabled()` in `constructs-lib.sh`
- Protocol file: `.claude/protocols/skill-cta.md` (this file)

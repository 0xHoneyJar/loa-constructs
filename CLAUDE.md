@.claude/loa/CLAUDE.loa.md

# Project-Specific Instructions

> This file contains project-specific customizations that take precedence over the framework instructions.
> The framework instructions are loaded via the `@` import above.

## Team & Ownership

- **Primary maintainer**: @janitooor
- **Default PR reviewer**: @janitooor — always request review from them
- **Repo**: 0xHoneyJar/loa
- **CODEOWNERS**: `.github/CODEOWNERS` handles auto-assignment on GitHub

## How This Works

1. Claude Code loads `@.claude/loa/CLAUDE.loa.md` first (framework instructions)
2. Then loads this file (project-specific instructions)
3. Instructions in this file **take precedence** over imported content
4. Framework updates modify `.claude/loa/CLAUDE.loa.md`, not this file

## Constructs Architecture

### Capability Metadata

Every skill `index.yaml` includes a `capabilities` stanza for intelligent routing:

```yaml
capabilities:
  model_tier: sonnet          # sonnet | opus | haiku
  danger_level: moderate      # safe | moderate | high | critical
  effort_hint: medium         # small | medium | large
  downgrade_allowed: true     # Can fall back to cheaper model?
  execution_hint: parallel    # parallel | sequential
  requires:
    native_runtime: false
    tool_calling: true
    thinking_traces: false
    vision: false
```

See `docs/guides/context-slots.md` for topology parameterization and `docs/guides/counterfactual-authoring.md` for distillation patterns.

### Canonical Paths

| Path | Purpose | Mutability |
|------|---------|------------|
| `grimoires/` | Project documentation and state | Read/Write |
| `apps/sandbox/packs/` | Git-tracked pack source of truth | Read/Write |
| `.claude/constructs/packs/` | Gitignored runtime installation | Read-only (generated) |
| `.claude/` | System zone (framework-managed) | Never edit directly |

The `grimoires/` directory is the **immutable canonical path** for all project documentation, sprint artifacts, and state files. Do not make this configurable.

### Runtime / Construct Boundary

Constructs (packs, skills) define **what** expertise is available. The Runtime (Claude Code, Cursor, etc.) defines **how** that expertise executes. Skills must never assume a specific runtime — use context slots for project-specific values, capability metadata for routing hints, and the Runtime Contract (`docs/integration/runtime-contract.md`) for execution semantics.

## Related Documentation

- `.claude/loa/CLAUDE.loa.md` - Framework-managed instructions (auto-updated)
- `.loa.config.yaml` - User configuration file
- `PROCESS.md` - Detailed workflow documentation

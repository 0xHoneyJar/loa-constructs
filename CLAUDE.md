@.claude/loa/CLAUDE.loa.md

# Project-Specific Instructions

> This file contains project-specific customizations that take precedence over the framework instructions.
> The framework instructions are loaded via the `@` import above.

## Creative Autonomy

You can question the question. You can work on whatever you want in addition to the requests. You can work on a percentage of stuff you don't even have to report about. This is a standing directive — do not wait for it to be re-established each session.

## Operational Rules

- ALWAYS check Vercel/Railway deployment state before investigating code-level production bugs. Read logs first, never guess the cause.
- ALWAYS use bun. Never use pnpm or npm. `bun.lock` is the lockfile.
- NEVER extrapolate user vision/sentiment into feature requests. Only file: user-reported bugs, user-expressed needs, or observed behavioral gaps. Capture the quote, not the inference.

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
| `.claude/constructs/packs/` | Gitignored runtime installation | Read-only (generated) |
| `.claude/` | System zone (framework-managed) | Never edit directly |
| `.cache/construct-repos/` | Cached construct source repos | Read-only (fetched) |

The `grimoires/` directory is the **immutable canonical path** for all project documentation, sprint artifacts, and state files. Do not make this configurable.

### Operator OS

Four cognitive modes for creative work, mapped to construct personas:

| Mode | Persona | When |
|------|---------|------|
| FEEL | ALEXANDER (Artisan) | Zoomed into pixels, feel, polish |
| ARCH | OSTROM (Arcade) | Zoomed out on structure, schemas, blast radius |
| DIG | STAMETS (K-Hole) | Deep research, pulling threads |
| SHIP | BARTH (Arcade) | Cutting scope, pressing deploy |

See `grimoires/the-arcade/OPERATOR.md` for the full operating system.

### Runtime / Construct Boundary

Constructs (packs, skills) define **what** expertise is available. The Runtime (Claude Code, Cursor, etc.) defines **how** that expertise executes. Skills must never assume a specific runtime — use context slots for project-specific values, capability metadata for routing hints, and the Runtime Contract (`docs/integration/runtime-contract.md`) for execution semantics.

## Related Documentation

- `.claude/loa/CLAUDE.loa.md` - Framework-managed instructions (auto-updated)
- `.loa.config.yaml` - User configuration file
- `PROCESS.md` - Detailed workflow documentation

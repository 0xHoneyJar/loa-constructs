---
name: "source-command-red-team"
description: "Generative adversarial security design using Flatline Protocol red team mode.
Generates creative attack scenarios against design documents and synthesizes
architectural counter-designs."
---

# source-command-red-team

Use this skill when the user asks to run the migrated source command `red-team`.

## Command Template

# /red-team — Generative Adversarial Security Design

Read `.Codex/skills/red-teaming/SKILL.md` for full workflow specification.

## Quick Reference

```bash
# Red team the current SDD
/red-team grimoires/loa/sdd.md

# Focus on specific attack surfaces
/red-team grimoires/loa/sdd.md --focus "agent-identity,token-gated-access"

# Quick exploratory mode
/red-team grimoires/loa/sdd.md --mode quick

# Deep iterative mode
/red-team grimoires/loa/sdd.md --depth 3 --mode deep

# Red team an inline spec fragment
/red-team --spec "Users authenticate via wallet signature"
```

## Workflow

1. Validate `red_team.enabled: true` in config
2. Sanitize input document (multi-pass injection + secret scan)
3. Load attack surface registry (filter by `--focus` if provided)
4. Invoke `flatline-orchestrator.sh --mode red-team`
5. Present attack summary with consensus categories
6. Human validation gate for severity >800
7. Generate full report (0600) and CI-safe summary

## Output

- `.run/red-team/rt-{id}-result.json` — Full JSON result
- `.run/red-team/rt-{id}-report.md` — Restricted full report
- `.run/red-team/rt-{id}-summary.md` — CI-safe summary

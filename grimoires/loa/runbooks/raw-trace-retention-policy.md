# Raw Trace Retention Policy

**Authority**: cycle-0 SDD §6.2 + Sprint 2 T2.4
**Cycle**: cycle-0-zone-hygiene
**Established**: 2026-05-09
**Status**: ACTIVE

---

## Purpose

Establish what counts as "evidence" vs "authority" for AI-generated review traces, model invocation logs, and adversarial review outputs. Prevent raw model exhaust from accumulating as if it were product history.

The audit Finding 6 surfaced this: cycle-102-model-stability/ tracked 38 files including 27 `.json` and `.stderr` raw model outputs alongside its PRD/SDD/sprint planning artifacts. Sprint 2 T2.1 stripped those framework cycle dirs along with their raw traces; this runbook codifies the policy so future cycles don't recreate the pattern.

---

## Core Principle

> **Raw model output is evidence, not authority.**

A raw `.json` flatline finding, a `.stderr` log from an LLM invocation, a per-iteration bridge-review markdown — these are **inputs to a human/agent decision**, not the decision itself.

The grimoire (project state at `grimoires/loa/`) holds **decisions** (PRDs, SDDs, sprint plans, NOTES.md entries, runbooks, retrospectives). It MUST NOT hold the raw inputs that informed those decisions. If a decision needs to be reconstructed later, the human/agent reads the **decision artifact**, not the raw inputs.

This is the same Stripe / Amazon "narrative memo" discipline applied at the framework layer: one document per decision, addressable forever, body summarizes the reasoning. The raw stack-traces, telemetry dumps, and model-invocation logs that informed the memo go to a retention store with explicit lifecycle.

---

## Retention Tiers

### Tier 1 — Decisions (permanent, tracked)

**Where**: `grimoires/loa/{prd,sdd,sprint,NOTES,visions,runbooks,a2a/sprint-N/...}/`

**Lifecycle**: tracked in git, retained forever.

**Examples**: PRD/SDD/sprint plans (operator-authored), NOTES.md cycle-closure entries, runbooks like THIS file, accepted findings summaries, retrospectives.

### Tier 2 — Decision Inputs (operator-private, gitignored)

**Where**:
- `.run/bridge-reviews/*.md` (operator-private gitignored per Sprint 0 T0.5)
- `.run/flatline-{prd,sdd,sprint}-findings.json` (operator-private gitignored per Sprint 0 T0.5)
- `grimoires/loa/context/*` (operator-private allowlist via INDEX.md)
- Operator local notes / drafts

**Lifecycle**: kept on operator's disk for duration of cycle + retention window.

**Retention window**: until cycle ARCHIVED (NOT cycle-CLOSED — archive happens after release ships and learnings are distilled).

**Examples**: Bridgebuilder review markdowns, Flatline findings JSON, operator scratch notes, vault-derived doctrine references.

### Tier 3 — Raw Model Output (ephemeral, gitignored, operator-discardable)

**Where**:
- `.run/spiral-state.json.failed-*` / `.archive-*` (Sprint 0 T0.5 gitignored)
- `.run/cycles/cycle-<hex>/` (transient spiral cycle workspaces)
- Raw `.stderr` from any LLM invocation
- Raw `.json` model responses pre-parsing
- Per-iteration bridge findings before consolidation

**Lifecycle**: kept until next cleanup pass / disk pressure / cycle-archive event. Operator MAY discard at any point.

**Examples**: spiral cycle state archives, failed-PRD spiral attempts, raw cheval invocation logs.

---

## Anti-Patterns (audit Finding 6)

❌ Tracking raw `.json` model outputs alongside PRD/SDD/sprint in the same directory.
❌ Committing per-iteration bridge findings to git.
❌ Loading raw model `.stderr` into a future PRD's context budget.
❌ Treating Flatline parser exhaust as architectural input.

If a raw trace needs to inform a future cycle's PRD, the operator MUST first **distill it into a decision artifact** (NOTES.md entry, vision registry capture, lore pattern). The PRD references the distilled artifact — never the raw trace.

---

## Loading Rules for Context-Consuming Skills

Skills that load context (e.g., `/plan-and-analyze` calling `qmd-context-query.sh`) MUST:

1. Read **only Tier 1 (decisions)** by default
2. Read Tier 2 (decision inputs) **only when explicitly named** by the operator (via INDEX.md or CLI flag)
3. Read Tier 3 (raw model output) **never** as PRD/SDD/sprint input

This is the same fail-closed discipline the cycle-098 cost gate applies: when uncertain about what's authoritative, prefer the distilled summary over the raw firehose.

Enforcement currently relies on operator discipline + INDEX.md allowlist (cycle-0 T0.4). Hard enforcement lands cycle-1+ via upstream Issue #818 F1 (zone-write-guard hook + skill-side filter).

---

## Project-Side Workspace Cleanup Cadence

Operator should periodically clean Tier 3 paths:

```bash
# Trim spiral state archives older than 30d
find .run/spiral-state.json.archive-* -mtime +30 -delete

# Trim failed/stub spiral state
rm -f .run/spiral-state.json.failed-* .run/spiral-state.json.stub-*

# Trim transient cycle workspaces
rm -rf .run/cycles/cycle-*

# Trim raw bridge reviews older than the closing cycle
find .run/bridge-reviews/ -name "*.md" -mtime +60 -delete
```

These commands are operator-driven (no cron). cycle-0 doesn't ship them as automated; that's cycle-1+ if the manual cadence proves error-prone.

---

## Cycle-0 Sprint 2 T2.1 Application

The framework cycle dirs stripped in T2.1 (cycle-093/094/098/099/100/102 + sprint-bug-622-623) included substantial raw-trace content per audit Finding 6:
- `cycle-102-model-stability/flatline-direct/*.json` + `*.stderr` (model invocations)
- `cycle-102-model-stability/flatline-sdd-direct/*.json` + `*.stderr`
- `cycle-102-model-stability/flatline-sprint-direct/*.json` + `*.stderr`

These were Tier 3 raw model output that should never have been tracked. Their leaving is correct per this policy; they were also the wrong-zone (framework's project state in downstream's repo).

For project-side cycles going forward (cycle-0 onward), Tier 3 traces stay in `.run/` and are gitignored per cycle-0 Sprint 0 T0.5.

---

## Cross-references

- cycle-0 PRD §3 (Sprint 2 archive policy)
- cycle-0 SDD §6.2 (Component Inventory: Operator-Private)
- cycle-0 Sprint 2 T2.4 (this runbook)
- Audit Finding 6 (raw traces tracked as product history)
- Sprint 0 T0.5 .gitignore additions (`.run/bridge-reviews/`, `.run/spiral-state.json.archive-*`, etc.)
- INDEX.md allowlist (cycle-0 T0.4) — Tier 1+2 routing for context-consuming skills
- Upstream Loa Issue #818 F1 (hard enforcement for skill-side Tier-1-only loading)

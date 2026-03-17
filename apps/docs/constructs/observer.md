---
name: Beehive
slug: observer
version: "3.0.0"
category: analytics
type: skill-pack
schema_version: 3
skills: 24
commands: 0
tags:
  - construct
  - category/analytics
  - type/skill-pack
---

# Beehive

> Builds the hive so the colony can thrive. Watches how people actually use your product, asks the questions they didn't know they needed to answer, and reads the signals a living system gives off — without ever extracting from the people you're learning from.

**Version**: 3.0.0 · **Category**: analytics · **Type**: skill-pack · **Skills**: 24

## Install

```bash
loa install observer
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/observing-users` | Capture user feedback as hypothesis-first research canvases |
| `/ingesting-dms` | Ingest direct messages as observation data |
| `/batch-observing` | Batch observation processing |
| `/feedback-observing` | Observe and structure feedback signals |
| `/concierge-testing` | Run concierge tests with users |
| `/shaping-journeys` | Synthesize canvas patterns into journey definitions |
| `/daily-synthesis` | Daily synthesis across canvases |
| `/shaping` | Shape observations into actionable patterns |
| `/level-3-diagnostic` | Diagnostic-first analysis reaching user goals before code |
| `/analyzing-gaps` | Compare user expectations with code reality |
| `/detecting-drift` | Detect drift in user behavior patterns |
| `/detecting-staleness` | Detect stale observation data |
| `/filing-gaps` | Create issues from gap reports |
| `/batch-filing-gaps` | Batch file gap reports as issues |
| `/generating-followups` | Generate follow-up questions from observations |
| `/importing-research` | Bulk convert legacy profiles to UTC format |
| `/refreshing-artifacts` | Refresh observation artifacts |
| `/snapshotting` | Snapshot observation state |
| + 6 inner processes | thinking, listening, seeing, speaking, distilling, growing |

## Relationships

### Core Infrastructure

Beehive is central infrastructure — it feeds canvases into the design and security pipelines.

### Depends On

- [Crucible](/constructs/crucible) — validation loop
- [Artisan](/constructs/artisan) — taste feedback cycle

### Composes With

- [Crucible](/constructs/crucible) — bidirectional validation
- [Artisan](/constructs/artisan) — canvases feed taste, taste feeds observation

### Composition Paths

**Writes to:**
- `grimoires/laboratory/canvases/` (user truth canvases)
- `grimoires/laboratory/journeys/` (journey maps)
- `grimoires/laboratory/synthesis/` (cross-canvas synthesis)

## Operator Mode

Beehive maps to **ARCH mode** (persona: OSTROM) — structural observation of systems. [See Operator Modes &rarr;](/network/operator)

Beehive's own persona is **KEEPER** (Karl von Frisch, waggle dance decoder). [See Personas &rarr;](/network/personas)

## Verification Archetype

**Observable construct** — output makes claims about the real world. Verification compares claims to ground truth. [Verification guide &rarr;](/verification/verification-guide#_1-observable-constructs-output-matches-reality)

## Source

- **Repo**: `0xHoneyJar/construct-observer`
- **Cache**: `.cache/construct-repos/construct-observer/`
- **Grimoire**: `grimoires/observer/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)

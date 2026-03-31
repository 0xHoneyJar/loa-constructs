---
session: 1
date: 2026-03-31
type: kickoff
status: planned
---

# Sprawl Protocol Consolidation (kickoff)

## Scope
- Archive wire (dead, superseded by score)
- Absorb world (design tokens + daemon voice) into interface
- Run Convex → Turso migration (per existing PRD)
- Absorb score (behavioral signals + scoring engine) into interface
- Result: 4 repos → 1 world. One service on Railway. $5/mo.

## Artifacts
- Build doc: `grimoires/gecko/specs/kickoff-sprawl-consolidation.md`

## Prior session
Construct ecosystem audit. 17 construct descriptions rewritten. Sovereign stack established. World architecture pattern defined.

## Decisions made
- Wire is dead — archive, don't migrate
- Score absorbs as src/lib/score/ (in-process, not HTTP)
- World absorbs as src/lib/design/ + src/lib/daemon/ (formalized consumption)
- taste.md and voice.md stay as source of truth, code generated from them
- Template repo extracted after pattern proves out
- No new features during consolidation

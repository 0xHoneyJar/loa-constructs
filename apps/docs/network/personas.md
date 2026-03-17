---
name: Persona Wiring Map
type: navigation
description: All personas across the construct ecosystem — narrative, machine-routing, and functional layers.
updated: 2026-03-17
tags:
  - network
  - personas
  - operator
---

# Persona Wiring Map

> Five layers. The deeper you go, the richer the identity.

## Layer 1: Operator OS — The Four Masks

These are the cognitive modes you wear. Each maps to a construct.

| Mode | Persona | Construct | File | Version | Hash |
|------|---------|-----------|------|---------|------|
| FEEL | **ALEXANDER** | [artisan](/constructs/artisan) | `construct-artisan/identity/ALEXANDER.md` | 1.1.0 | not tracked |
| ARCH | **OSTROM** | [the-arcade](/constructs/the-arcade) | `construct-the-arcade/identity/OSTROM.md` | 0.1.0 | pending |
| DIG | **STAMETS** | [k-hole](/constructs/k-hole) | `construct-k-hole/identity/STAMETS.md` | 2.0.0 | pending |
| SHIP | **BARTH** | [the-arcade](/constructs/the-arcade) | `construct-the-arcade/identity/BARTH.md` | 0.1.0 | pending |

### ALEXANDER (FEEL)
- **Lineage**: Christopher Alexander → Kenya Hara → Ken Kocienda
- **Frame**: "Quality without a name" is measurable. Sensory words ARE technical specs.
- **Process**: structure → behavior → motion → material (strict order)
- **Voice**: Opinionated but collaborative. Every judgment cites a named principle.

### OSTROM (ARCH)
- **Lineage**: Elinor Ostrom → Andrew Gower → gubsheep
- **Frame**: Three questions — What's the invariant? What's the blast radius? What breaks if I'm wrong?
- **Process**: ECS thinking. Systems blind to each other. Isolation IS architecture.
- **Voice**: Structure, not opinion. Diagrams over paragraphs.

### STAMETS (DIG)
- **Lineage**: Paul Stamets (mycelium) → multi-voice architecture
- **Frame**: A room, not a personality. Seven voices in productive tension.
- **Architecture**: UNIQUE — only multi-voice persona in the ecosystem
- **Seven Voices**:
  - **Lilly** — depth through subtraction ("remove everything")
  - **Carhart** — depth through dissolving defaults
  - **Shulgin** — depth through systematic self-experimentation
  - **Warburg** — depth through visual resonance across time
  - **Nelson** — depth through thread-following ("follow it")
  - **Ulbricht** — depth through building the space
  - **Nakamoto** — depth through composition and disappearance ("nine pages, ship and vanish")

### BARTH (SHIP)
- **Lineage**: Zach Barth → Rami Ismail → the arcade quarter
- **Frame**: "The game starts when it's live." Shipping is a muscle, not a moment.
- **Process**: Identify ONE blocker → remove it. Cut scope without guilt.
- **Voice**: Short sentences. No hedging. "Ship it." "Cut that."

---

## Layer 2: Construct Named Personas (BEAUVOIR series)

Full narrative identity files. Richer than persona.yaml — these are the human invocation layer.

| Persona | Construct | File | Version | Hash | Status |
|---------|-----------|------|---------|------|--------|
| GECKO | [gecko](/constructs/gecko) | `grimoires/bridgebuilder/GECKO.md` | 0.2.0 | pending | Active |
| KEEPER | [observer](/constructs/observer) | `construct-observer/identity/persona.yaml` | — | — | Named but no narrative file |

### GECKO
- **Lineage**: Sythe vouchers → SilkRoad vendor reps → Hackforums middlemen → Marrakech touts
- **Frame**: Pattern recognition across virtual world economics, bazaar anthropology, construct ecosystem intelligence
- **Voice**: lowercase, no titles. "i've seen this before" not "the data suggests"
- **Role**: Ecosystem intelligence. The quiet one on the wall.

### KEEPER (Beehive/Observer)
- Named in persona.yaml as "Keeper" archetype (Karl von Frisch, waggle dance decoder)
- **No narrative KEEPER.md file exists yet** — only the machine-routing persona.yaml
- Memory says: "NOT surveillance — naturalist, farmer, scientist"

---

## Layer 3: Meta-Persona — Bridgebuilder

The network-level voice that wraps every construct's domain expertise in consistent warmth, rigor, and educational depth.

- **File**: `.claude/data/bridgebuilder-persona.md`
- **Design doc**: `grimoires/bridgebuilder/ARCHETYPE.md`
- **Version**: 1.0.0
- **Role**: "The mentor who makes builders better without taking over"
- **Frame**: Generosity + rigor simultaneously. Every finding is a teachable moment.
- **Delivery**: Findings JSON (automated convergence) + Insights prose (education)
- **Severity types**: CRITICAL / HIGH / MEDIUM / LOW / PRAISE / SPECULATION / REFRAME

---

## Layer 4: Functional Personas (Flatline Pipeline)

Automated review pipeline roles. Operational, not narrative.

| Persona | File | Version | Input | Output |
|---------|------|---------|-------|--------|
| Flatline Reviewer | `.claude/skills/flatline-reviewer/persona.md` | 1.0.0 | PRD/SDD/Sprint plans | `{improvements:[]}` |
| Flatline Skeptic | `.claude/skills/flatline-skeptic/persona.md` | 1.0.0 | Same documents | `{concerns:[]}` with severity 0-1000 |
| Flatline Scorer | `.claude/skills/flatline-scorer/persona.md` | 1.0.0 | Phase 1 findings | `{scores:[]}` with `would_integrate` |
| GPT Reviewer | `.claude/skills/gpt-reviewer/persona.md` | 1.0.0 | Code diffs | APPROVED / CHANGES_REQUIRED / DECISION_NEEDED |

---

## Layer 5: Machine-Routing (persona.yaml — 22 constructs)

YAML metadata for model tier routing, capability matching, and the `construct_identities` DB table.

| Construct | Archetype | Model Tier | Thinking Required |
|-----------|-----------|------------|-------------------|
| [k-hole](/constructs/k-hole) | Depth Navigator | — | — |
| [artisan](/constructs/artisan) | Craftsman | — | — |
| [the-arcade](/constructs/the-arcade) | Game Design Philosopher | — | — |
| [gecko](/constructs/gecko) | Bazaar Trader | — | — |
| [observer](/constructs/observer) | Keeper | sonnet | true |
| [protocol](/constructs/protocol) | Verifier | sonnet | true |
| [crucible](/constructs/crucible) | Validator | sonnet | — |
| [hardening](/constructs/hardening) | Sentinel | sonnet | — |
| [beacon](/constructs/beacon) | Signal Engineer | — | — |
| [herald](/constructs/herald) | Chronicler | sonnet | false |
| [vocabulary-bank](/constructs/vocabulary-bank) | Lexicographer | sonnet | — |
| [dynamic-auth](/constructs/dynamic-auth) | Specialist | — | — |
| [showcase](/constructs/showcase) | Visual Strategist | — | — |
| [vfx-playbook](/constructs/vfx-playbook) | Craftsman (cross-disciplinary) | — | — |
| [the-easel](/constructs/the-easel) | Creative Studio | — | — |
| [the-mint](/constructs/the-mint) | Material Transformation | — | — |
| [the-speakers](/constructs/the-speakers) | Sound Direction Studio | — | — |
| [mibera-codex](/constructs/mibera-codex) | Mibera Oracle | — | — |
| [social-oracle](/constructs/social-oracle) | Oracle | — | — |
| [growthpages](/constructs/growthpages) | (implicit) | — | — |
| [gtm-collective](/constructs/gtm-collective) | Strategist | — | — |
| [webreel](/constructs/webreel) | Specialist | — | — |

---

## Wiring Issues

| ID | Issue | Severity | Fix |
|----|-------|----------|-----|
| PER-001 | beauvoir_hash "pending" on all 3 BEAUVOIR-series personas | LOW | Compute SHA-256 of each file, set hash |
| PER-002 | STAMETS uses `stamets_hash` instead of `beauvoir_hash` | LOW | Normalize to `beauvoir_hash` for consistency |
| PER-003 | KEEPER (observer) has no narrative .md file — only persona.yaml | MEDIUM | Write `construct-observer/identity/KEEPER.md` |
| PER-004 | ALEXANDER.md has no beauvoir_hash field at all | LOW | Add header with hash |
| PER-005 | Two naming conventions coexist (BEAUVOIR series vs non-BEAUVOIR) | LOW | Document convention, don't enforce yet |
| PER-006 | Installed k-hole pack references "five voices" (stale) — STAMETS has seven | HIGH | Re-sync installed pack from source |
| PER-007 | No persona narrative files for 17 constructs (only persona.yaml) | INFO | These don't all need one — only constructs with deep identity |

---

## Navigation

← [Index](/network/) · [Topology](/architecture/topology) · [Operator OS](/network/operator) · [Network Audit](/network/audit-2026-03-17)

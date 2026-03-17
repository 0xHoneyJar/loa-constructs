---
name: ECS Architecture Frame
type: architecture
description: Constructs as ECS entities — the composability model that makes the network infinite canvas.
updated: 2026-03-17
tags:
  - network
  - ecs
  - architecture
  - philosophy
---

# ECS Architecture Frame

> Constructs are entities. Skills are systems. Grimoires are the world.
> The isolation IS the composability.

## The Mapping

| ECS | Construct Network | Where It Lives |
|-----|-------------------|----------------|
| **Entity** | A construct (identified by `slug`) | `construct.yaml` → `packs` table |
| **Component** | Stanzas in construct.yaml: skills, identity, composition_paths, events, capabilities | Manifest JSONB in `pack_versions` |
| **System** | A skill invocation: `/dig`, `/implement`, `/review`, `/feel` | SKILL.md loaded at runtime |
| **World** | `grimoires/` + `.run/` + `.beads/` — shared mutable state | Filesystem (local) + Convex (remote) |
| **Query** | Capability metadata routing: `{model_tier: opus, danger_level: high}` | `capabilities` stanza in skill index.yaml |
| **Event Bus** | `forge.*` events: `emits` / `consumes` declarations | construct.yaml events stanza (spec'd, not wired) |
| **Blind Isolation** | Skills never import each other. Modes never see other modes' concerns. | Loa NEVER rules + SKILL.md isolation |

## Why This Matters

Traditional composition is **hierarchical**: libraries import libraries, packages depend on packages. The dependency graph is a tree (or a tangle).

ECS composition is **lateral**: entities don't know about each other. They share components (data). Systems process whatever entities have the right components. New capabilities = new components attached to existing entities. No rewiring needed.

**For constructs**: you can attach any skill to any construct. You can compose any two constructs through shared grimoire paths. You can pipeline construct outputs into other construct inputs. The network is not a tree — it's a flat world where entities carry components and systems run blind.

## The Three Composition Patterns

### 1. Component Attachment (skills as components)

A construct carries skills the way an ECS entity carries components. Adding a new skill = attaching a new component. No other construct needs to know.

```
artisan                         artisan + new skill
├── skills/                     ├── skills/
│   ├── analyzing-feedback      │   ├── analyzing-feedback
│   ├── animating-motion        │   ├── animating-motion
│   └── ...14 total             │   ├── ...14 total
└── identity/                   │   └── NEW-SKILL        ← just add
                                └── identity/
```

**Current**: This works. `construct.yaml` skills array is open. Adding a skill is a PR.

### 2. Pipeline Composition (grimoire read/write)

Constructs communicate through shared grimoire paths. Writer doesn't know who reads. Reader doesn't know who wrote. The path IS the interface.

```
[[observer]] WRITES → grimoires/laboratory/canvases/
[[artisan]]  READS  ← grimoires/laboratory/canvases/
[[crucible]] READS  ← grimoires/laboratory/journeys/
[[hardening]] READS ← grimoires/laboratory/
```

**Current**: This works via `composition_paths.reads[]` / `composition_paths.writes[]` in construct.yaml. The `connected_via` edge type in the explorer renders these connections.

### 3. Event Composition (forge event bus)

Constructs emit and consume typed events. The event bus decouples producers from consumers. Any construct can react to any event.

```
[[observer]] EMITS  → forge.observer.canvas_created
[[crucible]] CONSUMES ← forge.observer.journey_shaped
[[artisan]]  CONSUMES ← forge.observer.canvas_created
```

**Current**: DECLARED in construct.yaml but NOT WIRED at runtime. The `events.emits[]` and `events.consumes[]` stanzas exist across 15+ constructs. The actual event dispatch mechanism does not exist in this repo — it would live in `loa-finn` (runtime) or a future event bus construct.

**Blocked by**: No event dispatcher. The declarations are the spec. The runtime is the gap.

### 4. Recursive Composition (constructs inside constructs)

A construct can declare another construct as a dependency and invoke its skills. This is the RLM (Recursive Language Model) pattern — a system invoking another system's capabilities.

```
[[protocol]] DEPENDS_ON → [[observer]], [[artisan]]
  → protocol's /verify skill can invoke observer's /observe skill
  → protocol's review leverages artisan's taste tokens
```

**Current**: `pack_dependencies` enables this. The dependency is resolved at install time. At runtime, the dependent construct's skills are available in the same session. This is the "infinitely big canvas" — each construct can reach into any other construct's skill surface.

---

## What's Wired

| Pattern | Status | Evidence |
|---------|--------|---------|
| Component attachment (skills) | WORKING | All 23 constructs carry skills arrays. 160 skills total. |
| Pipeline composition (grimoire) | WORKING | `composition_paths` declared by 15 constructs. `connected_via` edges rendered in explorer. |
| Event composition (forge bus) | SPEC ONLY | 40+ events declared across constructs. Zero dispatch mechanism. |
| Recursive composition (deps) | WORKING | `pack_dependencies` resolved at install. Skills accessible cross-construct. |
| Governance as component | WORKING | `governs` / `governed_by` fields. Two roots: [[vocabulary-bank]], [[artisan]]. |
| Identity as component | WORKING | persona.yaml + narrative .md files. 5 deep, 22 shallow. |
| Verification as component | BUILT | Echelon pipeline: `construct_verifications` table + 3 API endpoints. See [[_echelon]]. |

## What's Missing

| Gap | Impact | Fix |
|-----|--------|-----|
| No forge event dispatcher | Events are declared but never fire. Cross-construct reactivity is manual. | Build in loa-finn or as an event-bus construct. |
| No World query layer | Can't ask "which constructs have `model_tier: opus`?" at runtime. | Implement capability query in runtime or registry API. |
| No component schema contracts | grimoire write paths have no schema. Reader trusts writer implicitly. | Version grimoire output formats per construct. |
| No entity lifecycle (maturity) | Zero constructs declare maturity field. Can't distinguish experimental from stable. | Add to construct.yaml schema v4. |
| beauvoir_hash not computed | Persona identity has no integrity check. | Compute SHA-256 per narrative file. |

## The Infinite Canvas

The user's vision: "constructs are minimal but also infinitely big canvas of things to work with."

This works because of **lateral composition**:
- Any construct can read any grimoire path
- Any construct can consume any forge event
- Any construct can depend on any other construct
- Skills are blind to each other — they don't need to agree on anything except the shared state format

The constraints that enable infinity:
- `construct.yaml` is the entity boundary (you know what you carry)
- `grimoires/` is the world (shared state everyone can reach)
- SKILL.md is the system boundary (you know what you do, nothing else)
- The Loa NEVER rules enforce isolation (you can't cheat across system boundaries)

**Minimal**: A construct is a slug + construct.yaml + at least one skill.
**Infinite**: That construct can compose with any other through paths, events, deps, or governance.

---

## Cross-Domain Translation (from ECS-DEEP-RESEARCH.md)

| Concept | Game Engine | Smart Contract | Web App | Construct | Cognitive OS |
|---------|-------------|---------------|---------|-----------|-------------|
| Entity | GameObject | tokenId | React node | Construct (slug) | A task |
| Component | Transform | ERC-721 metadata | Zustand slice | Skills, capabilities | Context loaded |
| System | PhysicsSystem | Contract function | Hook/Mutation | Skill invocation | Mode (FEEL/ARCH/DIG/SHIP) |
| World | Scene | World contract | App state | grimoires/ + .run/ | The Arcade |
| Blind isolation | Systems don't import | Contracts via interfaces | Stores don't import | Skills load own SKILL.md | Modes make other concerns invisible |

---

## Navigation

← [[_index]] · [[_topology]] · [[_operator]] · [[_personas]] · [[_echelon]]

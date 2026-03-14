# PRD: Construct Composability Infrastructure — Grimoire Paths, Governance, Implicit Composition

**Cycle**: cycle-051
**Created**: 2026-03-13
**Status**: Draft
**Foundation**: Composability diagnostic (400+ lines, 5 Gemini dig sessions, 130+ queries)
**Context**:
- `grimoires/loa/context/construct-composability-diagnostic.md` (primary)
- `grimoires/loa/archive/constructs-feedback-rfcs.md` (RFC-1 through RFC-8)
- `grimoires/bridgebuilder/STRATEGIC-GAP.md` (3-cycle strategic plan)
- `grimoires/loa/context/construct-network-cohesion.md` (filesystem inference principles)
- `grimoires/gecko/construct-discovery-design.md` (surface analysis, composability graph)

---

## 1. Problem Statement

23 constructs on the network. **15 are islands** — no declared relationships to anything else. The 8 connected constructs compose through grimoire files (observer writes canvases, artisan reads them), but this piping is **undeclared**. The `compose_with` field has 4 edges total. The event bus has 45 declared event types and **zero runtime emissions**. 8 constructs have `consumes: ['?']` placeholder data.

The constructs compose. They just don't know they do.

**The gap**: Implicit composition through grimoire paths is invisible to the platform. Users can't discover what works together. The explorer graph shows 15 disconnected nodes. New construct authors have no guidance on where to connect. Cross-cutting constructs (vocabulary-bank, taste tokens) have no composition primitive that describes "governance" — they're neither dependencies nor affinities.

**The opportunity**: The grimoire filesystem IS the composition layer (confirmed by deep research into stigmergy, Plan 9, Kubernetes reconciliation loops). The platform needs to make this visible, not replace it.

> Source: construct-composability-diagnostic.md, production API analysis (2026-03-13)

---

## 2. Goals & Success Metrics

### Goals
1. **Make implicit composition visible** — grimoire paths that constructs already use become declared and discoverable
2. **Model governance relationships** — vocabulary-bank, taste tokens, and design constraints have a proper composition primitive
3. **Reduce islands from 15 to ≤5** — through auditing actual relationships and declaring them
4. **Enable composition validation** — catch ghost wires (declared consumers with no producer)
5. **Surface composition in the explorer** — "Connected via" grimoire paths alongside "Works with"

### Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Constructs with zero composition edges | 15 (65%) | ≤5 (22%) |
| `compose_with` edges | 4 | 15+ |
| `paths.writes` populated | 0 | 23 |
| `paths.reads` populated | 0 | 15+ |
| `events.consumes` with placeholder '?' | 8 | 0 |
| Governance relationships declared | 0 | 5+ |
| Explorer shows grimoire-path connections | No | Yes |

---

## 3. User & Stakeholder Context

### Primary: Construct Author
- Building a new construct, wants to know: "what grimoire paths already exist that I should read from?"
- Needs to declare what their construct produces and consumes without learning an event bus protocol
- Wants composition to "just work" through conventions, not configuration

### Secondary: Construct Consumer (Loa user)
- Installing constructs, wants to know: "what connects to what?"
- Needs to see implicit composition (shared grimoire paths) alongside explicit composition (dependencies)
- Should understand why observer + artisan pair — not just that they do

### Tertiary: Network Maintainer
- Needs validation: are all declared consumes backed by a producer?
- Needs visibility: which grimoire paths are most trafficked?
- Needs to detect composition drift: construct A reads from a path construct B stopped writing to

---

## 4. Functional Requirements

### FR-1: Grimoire Path Declarations (construct.yaml)

**Priority**: P0

| ID | Requirement | AC |
|----|-------------|-----|
| FR-1.1 | `paths.writes[]` in construct.yaml — directories the construct writes to | Validated by seed script, stored in manifest JSONB |
| FR-1.2 | `paths.reads[]` in construct.yaml — directories the construct reads from | Validated, stored |
| FR-1.3 | Seed script extracts paths from manifest, surfaces in API | `paths` field in construct list response |
| FR-1.4 | Audit all 23 constructs' SKILL.md for actual grimoire reads/writes | Populate paths for all constructs that use grimoire files |

### FR-2: Governance Composition Primitive

**Priority**: P0

| ID | Requirement | AC |
|----|-------------|-----|
| FR-2.1 | Add `governs[]` to construct.yaml composition section | Array of slugs this construct constrains |
| FR-2.2 | Add `governed_by[]` to construct.yaml composition section | Array of slugs that constrain this construct |
| FR-2.3 | API surfaces governance relationships in construct response | `governs` and `governed_by` fields |
| FR-2.4 | Explorer "Works with" panel shows governance as distinct edge type | Visual distinction from dependency/affinity |

### FR-3: Composition Audit (23 constructs)

**Priority**: P0

| ID | Requirement | AC |
|----|-------------|-----|
| FR-3.1 | Audit every construct's SKILL.md for actual compose relationships | Document in audit spreadsheet |
| FR-3.2 | Populate `compose_with` based on audit findings | PRs to all construct repos with undeclared affinities |
| FR-3.3 | Remove all `consumes: ['?']` placeholders | Replace with real consumed events or remove field |
| FR-3.4 | Populate `governs`/`governed_by` for cross-cutting constructs | vocabulary-bank, artisan (taste), surveying-patterns |

### FR-4: Composition Validation in Seed/Publish

**Priority**: P1

| ID | Requirement | AC |
|----|-------------|-----|
| FR-4.1 | Validate declared `events.consumes` have a matching producer | Warning if consumer has no matching emitter |
| FR-4.2 | Validate declared `paths.reads` have a matching writer | Warning if read path has no known writer |
| FR-4.3 | Detect orphan paths — writes with no readers | Advisory signal for unused output |

### FR-5: Explorer Composition Panel

**Priority**: P1

| ID | Requirement | AC |
|----|-------------|-----|
| FR-5.1 | "Connected via" section on detail page showing shared grimoire paths | When construct A writes to and construct B reads from same path, show connection |
| FR-5.2 | Governance edges in graph visualization | Distinct visual (dashed line) for governs relationships |
| FR-5.3 | Path-based composition in "Works with" panel | Show grimoire path connections alongside compose_with |

---

## 5. Technical & Non-Functional Requirements

### NFR-1: Schema Backwards Compatibility
- `paths`, `governs`, `governed_by` are additive fields in construct.yaml
- API new fields are optional — existing clients unaffected
- Zod schema uses `.passthrough()` — non-breaking extension

### NFR-2: No New Runtime Infrastructure
- No event bus, no message broker, no pubsub
- All composition is declared in manifests and surfaced through the existing API
- Grimoire filesystem remains the composition medium

### NFR-3: Author Burden
- Populating paths should take <5 minutes per construct (read SKILL.md, list grimoire dirs)
- Governance declarations are opt-in — only cross-cutting constructs need them
- Seed script validation is advisory (warnings), not blocking

---

## 6. Scope & Prioritization

### Sprint 1: Schema + Audit + Path Population
- Add `paths.writes`, `paths.reads`, `governs`, `governed_by` to Zod schema + API
- Audit all 23 constructs for actual grimoire paths and relationships
- PRs to populate paths + compose_with + governance across all construct repos
- Remove `consumes: ['?']` placeholders

### Sprint 2: Validation + Explorer
- Composition validation in seed script (consumer/producer matching)
- "Connected via" grimoire paths on explorer detail page
- Governance edges in graph visualization
- Path-based composition data in API response

### Out of Scope
- Event bus runtime (confirmed premature — zero events ever emitted)
- File watcher / fswatch notifications (stage 2 graduation — deferred)
- Co-installation analytics / "used together" signals (needs install volume)
- Automatic path inference from SKILL.md parsing (manual audit is more accurate)

---

## 7. Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Construct repos owned by different maintainers | Medium | Delays path PRs | Batch PRs with clear descriptions, assign to @janitooor |
| Grimoire paths vary across consumer repos | Medium | Paths not portable | Declare canonical paths, note that actual paths are project-specific |
| Governance primitive is too abstract for authors | Low | Unused field | Only 3-5 constructs need it, document clearly |
| Schema changes break downstream consumers | Low | API errors | All fields additive + optional, tested with existing clients |

### Dependencies
- Upstream Loa Zod schema update (for `paths`, `governs`, `governed_by`)
- Access to all 23 construct repos for PRs
- Cycle-048 explorer "Works with" panel as base for FR-5

---

## 8. Design Philosophy (from deep research)

### Stigmergy Over Orchestration
Constructs coordinate through environmental traces (grimoire artifacts), not direct messages. The grimoire IS the pheromone trail. Making it visible is the platform's job. Replacing it is not.

### Binding by Shape, Not by Name
Constructs that write to `grimoires/laboratory/canvases/` and constructs that read from it are composed. The path shape IS the interface. No registration, no handshake.

### Grammars Over Component Libraries
Vocabulary-bank, taste tokens, and design rules are grammars — sets of rules for assembly. They CONSTRAIN other constructs. The `governs` primitive models this.

### The Shim Era
File watchers (fswatch on grimoire paths) give 90% of event bus value at 10% complexity. Deferred to future cycle.

### The Environment as Mediator
The grimoire filesystem isn't a limitation — it's the architecture. The platform makes mediation visible and efficient, not replaces it.

> Sources: David Barbour (RDP), David Spivak (Applied Category Theory), Rob Pike (Plan 9), Martin Kleppmann (logs as streams), Sophia Prater (ORCA), Shabnam Shanyabi (Form-Based Codes), Gregor Hohpe (file→event graduation)

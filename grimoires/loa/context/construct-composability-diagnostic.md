# Construct Composability Diagnostic
> gecko × beauvoir | 2026-03-13
> sources: production API surface analysis, RFC archives, strategic gap analysis, network cohesion plan, lifecycle research

---

## The Tension

Constructs are lego blocks that don't prescribe form. But legos have studs. The studs are what make composition possible without prescribing what you build. Right now, **15 of 23 constructs are smooth blocks with no studs.** They can sit next to each other on a table but they can't click together.

The tension isn't between openness and composability. It's between **declared composition** (what the manifest says) and **actual composition** (what the filesystem does). The constructs compose — observer feeds artisan, k-hole feeds the-mint — but they compose through grimoire files, not through any declared interface. The `compose_with` field is a social signal ("we work well together"), not a protocol.

---

## What the Data Shows

### Composition Density (Production API, 2026-03-13)

| Metric | Count | % of 23 |
|--------|-------|---------|
| Constructs with `compose_with` | 2 | 9% |
| Constructs depended upon | 6 | 26% |
| **Isolated (no edges at all)** | **15** | **65%** |
| `events.consumes` actually filled | 3 | 13% |
| `events.consumes` placeholder ('?') | 8 | 35% |
| Events ever emitted at runtime | 0 | 0% |

**65% of the network is invisible to the graph.** beacon, herald, gtm-collective, dynamic-auth, gecko, social-oracle, growthpages, vocabulary-bank, webgl-particles, mibera-codex, webreel — none declare any relationship to anything else.

### Composition Graph (Declared)

```
compose_with (4 edges, 2 sources):
  the-mint → the-easel
  the-mint → k-hole
  the-speakers → the-easel
  the-speakers → artisan

dependency graph (19 edges):
  hardening depends on observer
  observer depends on artisan, crucible
  protocol depends on artisan, observer
  showcase depends on artisan, k-hole, the-easel, vfx-playbook
  the-arcade depends on k-hole, observer, the-easel
  the-easel depends on artisan
  the-mint depends on k-hole, the-easel
  the-speakers depends on artisan, k-hole, the-easel
  vfx-playbook depends on k-hole
```

### Hub Constructs (most depended-upon)

| Construct | Inbound Dependencies |
|-----------|---------------------|
| artisan | 5 (observer, protocol, showcase, the-easel, the-speakers) |
| k-hole | 5 (showcase, the-arcade, the-mint, the-speakers, vfx-playbook) |
| the-easel | 4 (showcase, the-arcade, the-mint, the-speakers) |
| observer | 3 (hardening, protocol, the-arcade) |

### The Event Bus is Write-Only

- 45 event types declared across 17 constructs
- **0 events ever emitted at runtime**
- 3 constructs declare what they consume (gecko, the-mint, the-speakers)
- 8 constructs have `consumes: ['?']` — placeholder values never filled
- The grimoire filesystem IS the de-facto bus — observer writes canvases, artisan reads them

The event bus was designed (RFC-1), partially declared in manifests, but never built as runtime. It's an aspirational schema, not working infrastructure.

---

## Where the Studs Should Be (Without Prescribing Form)

The lego analogy has three layers:

### Layer 1: The Stud (declared connection points)

Every construct already has this in construct.yaml:
```yaml
events:
  emits: [...]      # what I produce
  consumes: [...]   # what I need
compose_with: [...]  # who I work well with
pack_dependencies: [...] # who I need
```

**The problem isn't the schema. The problem is that authors don't fill it in.** 15 constructs have zero composition metadata. The scaffold doesn't guide toward it. There's no validation that declared consumes match any producer.

**Fix**: At `construct create` time, show the existing event namespace. At publish time, validate that declared consumes match at least one producer in the network. Platform responsibility, not author burden.

### Layer 2: The Grimoire Path (implicit piping)

Constructs ALREADY compose through the filesystem:

```
observer writes → grimoires/laboratory/canvases/
artisan reads  ← grimoires/laboratory/canvases/

k-hole writes  → grimoires/resonance/
the-mint reads ← grimoires/resonance/

herald reads   ← grimoires/laboratory/ (for announcement grounding)
gecko reads    ← grimoires/*/observations.jsonl (ecosystem monitoring)
```

These paths are **undeclared**. They exist as prose in SKILL.md ("read from grimoires/laboratory/...") not as structured metadata. The `paths.writes` and `paths.reads` fields exist in the schema but no construct uses them.

**Fix**: Formalize the grimoire paths as declarations of what already happens:
```yaml
paths:
  writes:
    - grimoires/laboratory/canvases/
    - grimoires/the-mint/relics/
  reads:
    - grimoires/laboratory/canvases/
```

This doesn't prescribe form. It describes reality. And it enables the platform to show: "observer writes to `grimoires/laboratory/canvases/`, artisan reads from it — they're already connected."

### Layer 3: The Event Protocol (future, not now)

The full event bus (RFC-1, RFC-3) is the right long-term target but it's premature. Zero events have ever been emitted. Building the runtime before anyone uses it is building a bridge to an empty shore.

**Progression**:
1. **Implicit** (today): constructs share files through grimoire paths, undeclared
2. **Declared** (next): constructs declare `paths.writes`/`paths.reads` in manifest
3. **Evented** (future): high-traffic paths get event wrappers for real-time notification

---

## The 15 Islands — Classification

### Actually Independent (correct)
- webgl-particles, mibera-codex, webreel — domain-specific, no cross-construct need

### Should Declare Relationships But Don't

| Construct | Missing Relationship | Evidence |
|-----------|---------------------|----------|
| **herald** | Consumes observer canvases for announcement grounding | SKILL.md references grimoires/laboratory |
| **social-oracle** | Converts PR data to social content, similar to herald | SKILL.md references GitHub data |
| **gtm-collective** | Consumes observer + herald output for go-to-market | 8 skills that reference user research |
| **growthpages** | Consumes k-hole research for educational content | Educational content pipeline |
| **vocabulary-bank** | Should feed EVERY content-producing construct | Its entire purpose is vocabulary governance |
| **gecko** | Observes the entire network, should consume all forge.* events | Ecosystem intelligence |
| **beacon** | Produces structured data consumed by search engines + agents | SEO/discovery output |
| **dynamic-auth** | Provides wallet identity consumed by protocol + auth-gated constructs | Authentication primitive |
| **hardening** | Depends on observer but doesn't declare compose_with | Incident analysis from user truth |

**The vocabulary-bank problem**: It's a vocabulary governance construct with zero declared relationships, yet its entire purpose is to constrain language used by every content-producing construct. Most connected in theory, most isolated in practice.

---

## The Balance: Interface Without Prescription

The tension — "lego blocks that don't prescribe form" vs "composability requires interfaces" — resolves like this:

**The interface IS the grimoire path.** Not a protocol. Not a schema. A directory. Observer writes canvases to `grimoires/laboratory/canvases/`. Any construct can read from there. No contract, no handshake, no coupling. Just a path.

### What the Network Should Do
- **Make paths visible** (declare them in manifests, show them in explorer)
- **Validate connections** (does the path you read from have a writer?)
- **Surface the graph** (show which constructs share paths, not just which declare dependencies)

### What the Network Should NOT Do
- Prescribe what goes on the path (file format, schema, naming)
- Require registration to write to a path
- Gate reading from a path behind subscription

The stud on the lego isn't a protocol. It's a shape. The shape is the grimoire directory structure. The constructs click together by writing to and reading from shared paths. The platform's job is to make those connections discoverable — not to enforce them.

---

## Recommendations

### 1. Audit all 23 `compose_with` and `events.consumes` — fill in what's real
Not aspirational. What actually happens today. Half-day task across the network.

### 2. Populate `paths.writes` / `paths.reads` in construct.yaml
The piping RFC (loa-constructs#145) identified this. No construct uses these fields yet.

### 3. Remove all `consumes: ['?']` placeholders
8 constructs have fake data. Placeholder data is worse than no data.

### 4. Add composition validation to seed/publish pipeline
When a construct declares consumed events, validate a producer exists in the network.

### 5. Surface composition density in the explorer
Add "Connected via" section showing shared grimoire paths when paths.writes/reads overlap.

### 6. Don't build the event bus yet
The RFC is sound. The runtime isn't needed. Zero events emitted. Invest in making filesystem piping visible before building runtime event routing.

---

## Open Questions for Deep Research

1. **How do other "open composition" systems handle the declaration burden?** (Unix pipes, Kubernetes operators, Terraform providers, browser extensions). What makes composition discoverable without requiring explicit wiring?

2. **What's the right granularity for grimoire paths?** Is `grimoires/laboratory/canvases/` too specific? Is `grimoires/laboratory/` too broad? How do mature plugin systems define their extension points?

3. **How do graph-based systems handle the "island problem"?** When 65% of nodes are unconnected, what patterns help users discover potential connections? (npm's "used together" signal, VS Code's "recommended extensions")

4. **What's the graduation path from file-based to event-based communication?** When does a grimoire path become an event stream? What trigger conditions make the transition worthwhile?

5. **How should vocabulary-bank (a cross-cutting concern) relate to constructs?** It's not a dependency — it's a constraint. Constructs don't "depend on" vocabulary-bank, they're "governed by" it. What composition primitive describes this?

---

## Source References

- `grimoires/loa/archive/constructs-feedback-rfcs.md` — RFC-1 through RFC-8 (event bus, manifest standard, alignment probes)
- `grimoires/bridgebuilder/STRATEGIC-GAP.md` — Strategic gap analysis (7 surfaces, 21 issues, 3-cycle plan)
- `grimoires/loa/context/construct-network-cohesion.md` — Network cohesion architecture (filesystem inference, graduated tiers)
- `grimoires/bridgebuilder/gemini-construct-lifecycle-research.md` — Cross-ecosystem DX research (npm, Cargo, Roblox, Shopify, Unity)
- `grimoires/gecko/construct-discovery-design.md` — Surface analysis of 23 constructs (composability graph, vocabulary, gaps)
- Production API: `api.constructs.network/v1/constructs?per_page=100` (live composition data)
- K-Hole /dig session: `construct-k-hole/scripts/research-output/dig-session-2026-03-13.md` (5 grounded searches, ~130 Gemini queries)

---

## Deep Research Synthesis (K-Hole /dig, 2026-03-13)

### Finding 1: "Binding by Shape, Not by Name"

The dig into open composition systems (Unix, Kubernetes, RDP, Category Theory) surfaced a clear evolutionary pattern:

| Era | Binding Mechanism | Example |
|-----|------------------|---------|
| Early | Generic stream interface | Unix pipes (stdin/stdout) |
| Middleware | Registry name lookup | OSGi bundles, COM objects |
| Modern | Semantic/structural properties | Kubernetes label selectors, content-addressable hashes |

**For constructs**: We're at the "middleware" stage — constructs bind by name (`compose_with: ['observer']`). The next stage is **binding by shape**: constructs discover each other through structural compatibility (shared grimoire paths, matching event types) rather than explicit naming.

David Barbour's **Reactive Demand Programming** replaces "pushing data through pipes" with "continuous demands in a shared environment." This is exactly what the grimoire filesystem does — observer doesn't "push" canvases to artisan. It writes to a shared environment (`grimoires/laboratory/canvases/`), and artisan reads when it needs to. The environment mediates, not the wire.

**Key concept: Stigmergy** — coordination through environmental traces rather than direct communication. Ants don't message each other; they leave pheromone trails. Constructs don't call each other; they leave grimoire artifacts. The grimoire IS the pheromone trail.

### Finding 2: "Grammars, Not Component Libraries"

The dig into cross-cutting concerns (vocabulary-bank problem) revealed that mature design systems are shifting from "sets of parts" to "sets of rules for assembly":

**From Building Blocks to Grammars**: The focus shifts from the object to the relationship between objects. Vocabulary-bank isn't a component — it's a grammar. It governs how other constructs produce language, the same way design tokens govern how components produce visuals.

**Three composition primitives**:
1. **Dependency** ("I need this to function") — `pack_dependencies`
2. **Affinity** ("I work well with this") — `compose_with`
3. **Governance** ("I constrain this") — NEW: not modeled in current schema

Vocabulary-bank, taste tokens (artisan), and design rules (surveying-patterns) are all **governance constructs**. They don't depend on other constructs and other constructs don't depend on them — they CONSTRAIN them. This is the "Form-Based Codes" pattern from urban planning: governing constraints and relationships without dictating specific implementation.

**Proposal**: Add a `governs` relationship type:
```yaml
composition:
  depends_on: [...]     # I need this (hard dependency)
  composes_with: [...]  # I pair well with this (soft affinity)
  governs: [...]        # I constrain this (cross-cutting)
  governed_by: [...]    # I am constrained by this
```

### Finding 3: "Contextual Containers Replace Direct References"

The dig into the graph island problem (65% of our network) found that leading ecosystems solve this through **latent behavioral graphs**, not explicit wiring:

- **VS Code**: Uses Pointwise Mutual Information (PMI) on co-installation data. Extensions that appear in the same workspaces are linked, even without declared dependencies.
- **npm**: "Trivial packages" act as bridges between isolated clusters. Small single-function packages are the markers connecting larger islands.
- **The workspace IS the hyper-edge**: A user's installed construct set creates an implicit graph. If someone installs observer + artisan + hardening together, those three are behaviorally linked regardless of declarations.

**For constructs**: We can't do co-installation analysis yet (too few installs). But we CAN use the **project grimoire as the hyper-edge**. If a project's `grimoires/` directory has artifacts from observer, artisan, and k-hole, those three are behaviorally connected in that project. The platform can surface this: "In projects using observer, artisan is also present 80% of the time."

This is the cheapest way to solve the island problem: mine the project directory structure for implicit composition signals.

### Finding 4: "The Shim Era — File-Based in the Back, Event-Driven in the Front"

The dig into file→event graduation found a 4-stage path:

1. **Batch Polling** — scheduled jobs process accumulated files
2. **File Watchers** — OS-level hooks (`inotify`, `fswatch`) trigger on file changes
3. **Change Data Capture** — log-tailing the filesystem for changes
4. **Native Event Bus** — Kafka/RabbitMQ with proper consumer offsets

**Critical finding**: Many production systems STAY at stage 2-3 permanently. The "shim" (file watcher + event notification) is not a temporary hack — it's a legitimate architecture for systems where the "Business Value of Freshness" doesn't justify full event bus complexity.

**For constructs**: The grimoire filesystem is at stage 1 (batch — constructs read files when they activate). Stage 2 (file watchers) would mean: when observer writes a new canvas, artisan gets a notification. This doesn't require an event bus. It requires `fswatch` on grimoire paths + a notification mechanism. The `paths.writes`/`paths.reads` declarations enable this.

**Martin Kleppmann's insight**: A filesystem IS a log. An append-only `.jsonl` file is structurally identical to a Kafka partition. Consumer offsets are file pointers. We don't need to "graduate" from files to events — we need to make the file-based communication **observable and subscribable**.

**The Passive-Aggressive Command trap** (Martin Fowler): Over-decoupling through events makes system flows invisible. For 23 constructs, explicit grimoire paths are MORE debuggable than event subscriptions. You can `ls grimoires/laboratory/canvases/` and see what observer produced. You can't `ls` an event stream.

### Finding 5: "The Environment as Mediator"

Across all 4 completed digs, one pattern dominates:

> The burden of coordination shifts from the component to the substrate.

- **Unix**: The kernel mediates (pipes, filesystem)
- **Kubernetes**: etcd mediates (desired state, reconciliation loops)
- **Ants**: The environment mediates (pheromone trails, stigmergy)
- **Constructs**: The grimoire mediates (directory structure, file artifacts)

This means the grimoire filesystem isn't a limitation — it's the architecture. The platform's job is to make the mediation **visible** (declare paths, show connections) and **efficient** (validate paths exist, notify on changes) — not to replace it with a different mediation layer.

---

## Revised Recommendations (Post-Research)

### Original recommendations (still valid):
1. Audit compose_with + events.consumes across all 23
2. Populate paths.writes / paths.reads
3. Remove consumes: ['?'] placeholders
4. Add composition validation to seed/publish
5. Surface composition density in explorer
6. Don't build the event bus yet

### New recommendations (from deep research):

7. **Add `governs` / `governed_by` composition primitive** — for cross-cutting constructs like vocabulary-bank, artisan (taste), and surveying-patterns. This is the missing third type alongside dependency and affinity.

8. **Mine grimoire directory structure for implicit composition** — if a project has `grimoires/laboratory/` (observer) and `grimoires/artisan/` (artisan), they're behaviorally linked. Surface this as "used together" signals in the explorer.

9. **Treat paths.writes/reads as the composition interface** — not compose_with, not events. The grimoire path IS the stud on the lego. Make it the primary composition signal.

10. **Consider file watchers (stage 2) as the graduation target** — not a full event bus (stage 4). `fswatch` on declared grimoire paths + notification is 90% of the value at 10% of the complexity.

11. **Frame composition as "binding by shape"** — constructs that write to `grimoires/laboratory/canvases/` and constructs that read from `grimoires/laboratory/canvases/` are composed. No registration, no handshake. The path shape IS the interface.

### Dig trail
- `construct-k-hole/scripts/research-output/dig-session-2026-03-13.md` (13 total entries, 5 composability-specific)

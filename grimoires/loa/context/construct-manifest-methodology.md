# Construct Manifest Methodology
> How construct manifests evolve — stability without rigidity
> 2026-03-14
> sources: 10 K-Hole /dig sessions (Roblox, Minecraft, WordPress, npm, Unity/Unreal, Emacs→VS Code, Valve/GMod, Figma, Homebrew/Cargo/Terraform, Ostrom commons governance)

---

## Historical Lineage — What Survives and Why

### The 50-Year Pattern

The dig across 10 ecosystems surfaced a single evolutionary arc that every successful plugin/manifest system follows:

```
Implicit → Invasive → Declarative → Encapsulated → Semantic
```

| Era | Mechanism | Example | Manifest |
|-----|-----------|---------|----------|
| **Implicit** | Convention | Emacs .el files, early Roblox XML | The code IS the manifest |
| **Invasive** | Patching | Minecraft MCP/ModLoader (2010), early WordPress | Humans decompile + modify |
| **Declarative** | Manifests | npm package.json (2010), Forge mods.toml | Machine-readable intent |
| **Encapsulated** | Exports/gates | npm `exports` (2019), Roblox permissions | Author controls public surface |
| **Semantic** | AI-readable | skills.sh SKILL.md (2025), `.well-known/skills` | Agents reason over meaning |

**Constructs are at stage 3→4.** We have declarative manifests (construct.yaml). We're adding encapsulation (composition_paths as the public surface). Stage 5 (semantic) is what the `/constructs` discovery command does — agents reasoning over construct meaning.

### What Makes Manifests Last

From the Homebrew/Cargo/Terraform dig — schemas that survive 10+ years share three traits:

1. **The Couch Device Assumption** — design for the manifest that won't be touched for years. No field should break if it sits unchanged while everything around it evolves. (Yehuda Katz's principle from Bundler → Cargo.)

2. **Two-File Truth** — the author's "wish list" (construct.yaml) is separate from the machine's "resolved reality" (what the seed produces in JSONB). Don't make one file do both. (Cargo.toml vs Cargo.lock, Gemfile vs Gemfile.lock.)

3. **The Escape Hatch** — 100% declarative manifests break under edge cases. Every surviving schema has a hook for imperative code: Cargo's `build.rs`, Terraform's `local-exec`, Homebrew's Ruby DSL blocks. Our escape hatch is `hooks.post_install` + `scripts/`.

### Paving Cowpaths

npm's `package.json` didn't prescribe `exports` from day one. The community invented `browser`, `module`, `jsnext:main` as unofficial fields. Years later, Node.js standardized `exports` by observing what worked. The manifest evolved by **codifying the de facto**.

**For constructs**: `composition_paths` came from observing that constructs already communicate through grimoire directories. We didn't invent a new system — we declared what was already happening. This is the right pattern. Future manifest fields should follow the same rule: observe first, then declare.

### Convergence Through Conflict

Minecraft's Forge vs Fabric "Loader Wars" produced two competing manifest formats. Both eventually converged on the same solutions: TOML/JSON, SemVer, Mixins. The insight: **in any volatile ecosystem, the community gravitates toward "declarative stability" — where the manifest (intent) becomes more important than the implementation.**

For constructs: if someone forks construct-base and creates their own template, that's fine. The manifest schema is the shared language. The implementation is theirs.

### Governance as Architecture

Elinor Ostrom's commons governance principles are being hard-coded into platform APIs. The most successful large-scale platforms (Eclipse, Shopify, WordPress) function as **"ecosystems of ecosystems"** — the core provides boundary resources (APIs, schemas), sub-communities develop their own rules.

For constructs: we provide the manifest schema + validation. Construct authors decide what goes inside. The network surfaces connections. Nobody tells a construct what it should be.

### The Inverted U-Curve

Researcher Slinger Jansen found that plugin ecosystems follow an inverted U: too much top-down control stifles innovation. Too little leads to fragmentation. The peak is **"Algorithmic Reflexive Governance"** — rules that evolve based on community telemetry and feedback.

For constructs: our Tier 1/2/3 system is the governance model. Tier 1 is enforced (CI blocks missing fields). Tier 2 is encouraged (the platform surfaces it but doesn't require it). Tier 3 is opt-in (only relevant constructs use it). The tiers can shift based on what we observe.

---

## The Principle

A construct manifest describes what IS, not what SHOULD BE. It's a map of current reality — what the construct writes, reads, pairs with, constrains. When reality changes, the manifest changes. When reality hasn't been observed yet, the manifest stays quiet.

We don't prescribe what goes inside a construct. We declare what connects it to the world outside.

---

## Three Tiers of Declaration

### Tier 1: Identity (required to exist)

These fields make the construct findable and installable. Without them, it's invisible.

| Field | Why | When to fill |
|-------|-----|-------------|
| `name` | Human-readable label | At creation |
| `slug` | Machine identifier | At creation |
| `version` | Change tracking | At creation |
| `description` | What it does (one paragraph) | At creation |
| `short_description` | Storefront tagline (noun phrase, ≤80 chars) | At creation |
| `domain[]` | Category for discovery and graph placement | At creation |
| `visibility` | `public` to appear on the network | At creation |
| `type` | `skill-pack`, `tool-pack`, `codex` | At creation |
| `skills[]` | What commands it provides | At creation |
| `author` | Who made it | At creation |

**These are the minimum viable manifest.** The scaffold generates them. CI blocks publishing without them.

### Tier 2: Composition (encouraged when true)

These fields describe how the construct connects to others. They should be filled when the connections EXIST — not aspirationally.

| Field | Why | When to fill |
|-------|-----|-------------|
| `composition_paths.writes[]` | Grimoire directories this construct produces artifacts in | When you observe the construct writing to grimoire paths |
| `composition_paths.reads[]` | Grimoire directories this construct consumes from | When you observe the construct reading from grimoire paths |
| `compose_with[]` | Constructs that pair well with this one | When you've seen them used together |
| `events.emits[]` | What signals this construct produces | When the events are real (not aspirational) |
| `events.consumes[]` | What signals this construct needs | When consumption is implemented |
| `pack_dependencies` | Hard requirements | When the construct literally won't work without them |

**The key rule: declare what you've observed, not what you imagine.** A construct that hasn't been installed alongside observer shouldn't declare `compose_with: observer` just because it sounds good. Wait until someone actually uses them together.

### Tier 3: Governance (opt-in for cross-cutting constructs)

These fields are for constructs that constrain others without depending on them.

| Field | Why | When to fill |
|-------|-----|-------------|
| `governs[]` | Constructs this one constrains (vocabulary, taste, rules) | When governance is active and intentional |
| `governed_by[]` | Constructs that constrain this one | When you've adopted another construct's constraints |

**Most constructs will never use Tier 3.** That's correct. Only vocabulary-bank, artisan (taste tokens), and pattern-enforcement constructs need it.

---

## Evolution Methodology

### How fields get added to the template

1. **Observed in production** — at least 3 constructs demonstrate the pattern
2. **Validated by usage** — the field solves a real problem (not a theoretical one)
3. **Added as Tier 2** (encouraged) — never Tier 1 (required) unless the network breaks without it
4. **Template updated** — construct-base gets the field with a clear comment
5. **Existing constructs notified** — PRs with the field populated where applicable (not blanket)

### How we communicate updates to existing constructs

**Not**: "We added new required fields, update your manifest."
**Instead**: "We noticed your construct writes to `grimoires/laboratory/`. We've added a way to declare that so the network graph can show the connection. Here's a PR."

The PR should:
- Only add fields that are TRUE for that specific construct
- Include a comment explaining why this field exists
- Not add empty arrays or placeholder values
- Reference the construct-base template for full documentation

### What we DON'T do

- Don't add `composition_paths: { writes: [], reads: [] }` to constructs that don't use grimoire paths
- Don't add `compose_with: []` to constructs with no known affinities
- Don't add `governs: []` to non-governance constructs
- Don't add `events.emits` for events that have never been emitted
- Don't prescribe what the construct should connect to — describe what it does connect to

### When to revisit

- When a new construct is created and the author asks "what should I fill in?" — the tiers guide them
- When co-installation data shows patterns we haven't declared
- When the explorer needs a new facet for discovery
- When the event bus becomes a real runtime system (not yet)

---

## The Fan-Out Pattern

When updating existing constructs with new manifest fields:

### Step 1: Audit what's real
Read the construct's SKILL.md files. What grimoire paths does it actually reference? What other constructs does it mention? This is the source of truth — not our assumptions.

### Step 2: Draft per-construct PRs
Each PR is tailored. Observer gets `composition_paths.writes: [grimoires/laboratory/canvases/]` because it writes there. Herald gets `composition_paths.reads: [grimoires/laboratory/]` because it reads from there. Dynamic-auth gets nothing added because it doesn't use grimoire paths.

### Step 3: PR description explains the why
"The network now surfaces grimoire path connections in the explorer graph. This PR declares the paths your construct already uses so the connections become visible."

### Step 4: Don't batch
One PR per construct. Each reviewed independently. No "update all 23 manifests" mega-PR that nobody reads.

---

## Stability Guarantee

These fields will NOT change in meaning once documented:

| Field | Meaning | Stable Since |
|-------|---------|-------------|
| `schema_version: 3` | Manifest format version | 2026-02 |
| `domain[]` | Discovery categorization | 2026-03 |
| `composition_paths.writes/reads` | Grimoire path declarations | 2026-03 |
| `compose_with[]` | Affinity relationships | 2026-03 |
| `governs/governed_by` | Cross-cutting constraints | 2026-03 |
| `visibility` | Network presence control | 2026-03 |

New fields may be ADDED to the schema. Existing fields will not be RENAMED or REMOVED without a schema_version bump.

---

## What This Enables for the UI

When someone creates a construct through the website:

1. **Step 1**: Name, slug, description, domain → Tier 1 (required)
2. **Step 2**: "Does your construct write to grimoire paths?" → Tier 2 (optional, with examples)
3. **Step 3**: "Does your construct work alongside others?" → Tier 2 (optional, shows network graph)
4. **Step 4**: Published. Composition fields can be added later as the author observes real usage.

The UI should never front-load Tier 2 or Tier 3 fields. They appear AFTER the construct exists, as progressive disclosure — "now that your construct is live, here's how to make it composable."

This matches the research finding: **graduated manifest tiers** (Shopify, Cargo, npm). Create time is minimal. Publication adds discovery fields. Composition emerges from usage.

---

## Research Trail

- `construct-k-hole/scripts/research-output/dig-session-2026-03-14.md` (10 entries, ~300 Gemini queries)
- Ecosystems studied: Roblox (10-year manifest evolution), Minecraft (Forge/Fabric loader wars), WordPress (20-year readme.txt→plugin.json), npm (package.json field archaeology), Unity/Unreal (Fab marketplace convergence), Emacs→VS Code (50-year plugin lineage), Valve/GMod (community-emergent standards), Figma (sandbox paradox), Homebrew/Cargo/Terraform (10+ year survivors), Ostrom (commons governance)
- Key researchers: Yehuda Katz (Bundler/Cargo), Mitchell Hashimoto (Terraform), Guy Bedford (Node exports), Slinger Jansen (ecosystem governance), Elinor Ostrom (commons), Searge (MCP/Minecraft), Garry Newman (GMod), Paolo Galeone (game IaC)

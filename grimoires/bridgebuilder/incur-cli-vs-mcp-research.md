# incur & CLI-vs-MCP Research

> **Date**: 2026-02-27
> **Sources**: [wevm/incur](https://github.com/wevm/incur), [CLI vs MCP blog](https://kanyilmaz.me/2026/02/23/cli-vs-mcp.html), [TOON format](https://github.com/toon-format/toon)
> **Context**: Evaluating incur patterns against Loa Constructs architecture for potential adoption

---

## 1. incur Architecture — Complete Findings

### 1.1 Core Design: Three-Function Surface

incur exposes exactly three methods: `Cli.create()`, `.command()`, `.serve()`. The deliberate minimalism means agents can author entire CLIs without learning framework abstractions. Every command definition carries:

- `args` — Zod-validated positional arguments
- `options` — Zod-validated flags
- `env` — Zod-validated environment variables
- `output` — Zod-validated return shape
- `run()` — execution function with fully-typed parameters

```ts
Cli.create('greet', {
  description: 'A greeting CLI',
  args: z.object({ name: z.string().describe('Name to greet') }),
  run({ args }) { return { message: `hello ${args.name}` } },
}).serve()
```

### 1.2 How `skills add` Works

The `my-cli skills add` command triggers a multi-stage pipeline:

1. **Collection**: `collectEntries()` recursively walks the command `Map`, separating groups from leaf commands
2. **Generation**: `Skill.split()` partitions commands into `File` objects based on a `depth` parameter — each file becomes a `SKILL.md` with YAML frontmatter + body
3. **Rendering**: Each command produces sections for Arguments, Options, Environment Variables, Output schema, Examples, and Hints — all auto-derived from Zod schemas
4. **Installation**: `Agents.install(tmpDir, { global, cwd })` writes files to agent-specific config directories (e.g., `~/.config/agents/skills/` for global)
5. **Cleanup**: Stale skills from previous generations are removed via hash comparison (SHA-256 of serialized schemas)
6. **Metadata**: `~/.local/share/incur/<name>.json` stores `{ hash, skills, at }` for staleness detection

The key insight: **auto-registration means the CLI IS the skill definition**. There is no separate skill authoring step. Zod schemas become argument tables, descriptions become frontmatter, and the CLI tree structure becomes the file tree structure.

### 1.3 TOON Format

Token-Oriented Object Notation — a serialization format optimized for LLM consumption:

**Encoding rules:**
- Objects use YAML-style indentation (no braces)
- Simple arrays: `friends[3]: ana,luis,sam`
- Tabular arrays (the killer feature): header declares fields once, then CSV-style value rows

```
hikes[3]{id,name,distanceKm,elevationGain,companion,wasSunny}:
  1,Blue Lake Trail,7.5,320,ana,true
  2,Ridge Overlook,9.2,540,luis,false
```

**Benchmarked performance:**
| Format | Accuracy | Tokens | Efficiency (acc/1K tokens) |
|--------|----------|--------|---------------------------|
| TOON | 73.9% | 2,744 | 26.9 |
| JSON compact | 70.7% | 3,081 | 22.9 |
| YAML | 69.0% | 3,719 | 18.6 |
| JSON | 69.7% | 4,545 | 15.3 |
| XML | 67.1% | 5,167 | 13.0 |

TOON achieves **39.6% fewer tokens than JSON** with **higher accuracy**. The sweet spot is uniform arrays of objects — exactly the shape of tool listings, search results, and tabular data agents frequently produce.

**When NOT to use TOON:**
- Deeply nested structures (JSON-compact often smaller)
- Semi-uniform arrays (40-60% tabular)
- Pure flat tables (CSV smaller)

### 1.4 On-Demand Skill Loading

This is incur's most architecturally significant design decision.

**MCP model**: All 20+ tool schemas injected into every conversation turn. Cost is front-loaded and paid regardless of how many tools are actually used.

**incur model**: At session start, only **frontmatter** loads (name + description, ~40 tokens per skill). When the agent decides to use a skill, it reads the full SKILL.md for that command group on demand. After invocation, TOON output replaces JSON.

**Token comparison (20-command CLI, 5 invocations):**

| Phase | MCP + JSON | One Skill + JSON | incur |
|-------|-----------|-----------------|-------|
| Session start | 6,747 | 624 | 805 |
| Discovery | 0 | 11,489 | 387 |
| Invocation (x5) | 110 | 65 | 65 |
| Response (x5) | 10,940 | 10,800 | 5,790 |
| **Total cost** | **$0.0325** | **$0.0410** | **$0.0131** |

The ~3x cost reduction comes from two independent optimizations: lazy loading (saves on discovery) and TOON output (saves on every response).

### 1.5 Call-to-Action (CTA) Property

CTAs are typed follow-up suggestions returned from command execution:

```ts
return ok({ items }, {
  cta: {
    commands: [
      { command: 'get 1', description: 'View item' },
      { command: 'list', args: { state: 'closed' }, description: 'View closed' },
    ],
  },
})
```

Output appends a `Next:` section:
```
Next:
my-cli get 1 – View item
my-cli list closed – View closed
```

**Key properties:**
- CTAs are **type-inferred** — command names, args, and options are validated at compile time via declaration merging on the `Register` interface
- They guide agent workflow without the agent needing to know the full command tree
- They create a **pull-based discovery** model: the agent learns about related commands only after executing the current one
- They function as state-machine edges: each command output declares which commands are valid next steps

### 1.6 Type Safety Story

Zod schemas flow through TypeScript generics end-to-end:

1. **Definition**: `args: z.object({ env: z.enum(['staging', 'production']) })`
2. **Validation**: Input validated before `run()` executes — type errors surface at the CLI boundary, not inside business logic
3. **Inference**: `run({ args, options, env })` has fully inferred types with zero manual annotations
4. **Output**: `output: z.object({ url: z.string() })` declares the return shape — agents can parse without heuristics
5. **CTA**: Via declaration merging on `Register`, CTA command references are compile-time checked
6. **Generation**: `Schema.toJsonSchema()` converts Zod to JSON Schema for Markdown table generation and MCP tool registration

### 1.7 MCP Bridge

incur provides MCP as an alternative transport via `my-cli mcp add`. The `Mcp.ts` module:

- Runs a stdio JSON-RPC server using `StdioServerTransport`
- Flattens command groups into underscore-joined tool names (e.g., `pr_list`)
- Merges args + options Zod shapes into a single JSON Schema per tool
- Supports streaming via `notifications/progress` MCP notifications
- Uses sentinel pattern (`Symbol.for('incur.sentinel')`) for ok/error signaling

The MCP bridge is explicitly positioned as the fallback for runtimes that lack skill file support. Skills are the recommended path.

---

## 2. CLI vs MCP Thesis — Blog Post Findings

### 2.1 Core Argument

MCP front-loads the entire tool catalog as JSON Schema into every conversation. For large tool surfaces (84 tools across 6 servers), this costs ~15,540 tokens at session start regardless of usage. CLI-based tooling pays ~300 tokens at session start and loads details on demand.

### 2.2 Quantified Comparison

| Tools Used | MCP | CLI | Savings |
|-----------|-----|-----|---------|
| Session start | ~15,540 | ~300 | 98% |
| 1 tool | ~15,570 | ~910 | 94% |
| 10 tools | ~15,840 | ~964 | 94% |
| 100 tools | ~18,540 | ~1,504 | 92% |

### 2.3 Versus Anthropic Tool Search

Anthropic's Tool Search (indexed tool selection) reduces the MCP overhead by ~85% but still retrieves full JSON Schema per tool. CLI remains cheaper:

| Tools Used | MCP | Tool Search | CLI | CLI vs TS Savings |
|-----------|-----|-------------|-----|-------------------|
| 1 tool | ~15,570 | ~3,530 | ~910 | 74% |
| 10 tools | ~15,840 | ~3,800 | ~964 | 75% |
| 100 tools | ~18,540 | ~12,500 | ~1,504 | 88% |

### 2.4 Key Insight

The efficiency gap **widens** with repeated tool use because CLI discovery cost is amortized across the session while MCP schema overhead is paid every turn. This makes CLI the clear winner for any agent that interacts with tools iteratively over a session.

### 2.5 Limitations Noted

- CLI approach requires `--help` invocation per tool (~600 tokens per discovery), but only once per tool per session
- MCP has zero per-tool discovery cost because schemas are pre-loaded
- For very short sessions (1-2 tool calls), MCP may be competitive depending on total tool count

---

## 3. Synthesis: incur Patterns vs. Constructs Architecture

### 3.1 Architectural Alignment Matrix

| incur Concept | Constructs Equivalent | Alignment | Notes |
|---------------|----------------------|-----------|-------|
| `SKILL.md` (generated from Zod) | `SKILL.md` (hand-authored markdown) | **Same artifact, different authoring** | Constructs SKILL.md are richer (counterfactuals, context slots, workflow phases) |
| Frontmatter (name + description) | `index.yaml` (metadata + capabilities) | **Converged intent** | Both solve "lightweight index at session start, full content on demand" |
| `skills add` (auto-registration) | `/constructs install` (manual selection) | **Different discovery model** | incur: CLI generates its own skills. Constructs: registry of pre-authored packs |
| `depth` parameter (file splitting) | Pack/skill hierarchy | **Structural parallel** | incur splits by command groups; Constructs organize by domain packs |
| CTA property | No direct equivalent | **Gap** | Constructs have `golden_path.commands` and `quick_start` but no per-invocation CTAs |
| TOON output format | No output format standardization | **Gap** | Constructs rely on runtime-native output (markdown, YAML, JSON) |
| Zod schema validation | Capability metadata in `index.yaml` | **Different layer** | incur validates I/O at runtime; Constructs declare metadata for routing |
| MCP bridge | MCP registry (`mcp-registry.yaml`) | **Complementary** | Constructs already lazy-load MCP; incur shows skills can replace MCP entirely |
| `ok()`/`error()` sentinel pattern | Exit codes in Runtime Contract | **Same intent** | Both standardize success/failure signaling between execution layers |
| Hash-based staleness detection | Version fields in manifests | **incur more automated** | incur auto-detects schema drift; Constructs use manual version bumps |

### 3.2 Patterns Worth Adopting

#### 3.2.1 TOON Output for Skill Results (HIGH VALUE)

**Why**: The constructs network produces significant tabular output — pack listings, skill inventories, search results, audit reports, sprint task tables. TOON's header-then-values pattern would reduce token cost of every `/constructs browse`, `/loa` status check, and `/review-sprint` output.

**Implementation path**:
- Add TOON as an output format option in skill execution
- Especially valuable for `constructs-browse.sh`, `constructs-loader.sh list`, and `beads-health.sh`
- Does NOT require changing SKILL.md authoring — applies to runtime output only
- Could be gated behind `.loa.config.yaml` flag: `output_format: toon | json | yaml | md`

**Conflict level**: None. Additive change to output layer. Does not touch the construct/skill boundary.

#### 3.2.2 Per-Invocation Call-to-Actions (MEDIUM VALUE)

**Why**: Constructs have `golden_path` and `quick_start` but these are static, pack-level suggestions. incur's CTAs are dynamic — each skill invocation returns context-sensitive next steps. This would improve agent navigation, especially for users unfamiliar with the skill tree.

**Implementation path**:
- Add optional `cta` stanza to skill output format (after the main content, before any grimoire writes)
- Each skill's SKILL.md could define a `## Next Steps` section that is context-dependent based on output
- Bridge the CTA concept to the existing `golden_path.commands` in pack CLAUDE.md files

**Example for `/decompose` (decomposing-feel)**:
```
Next:
/inscribe — Codify the decomposition into taste tokens
/iterate — Begin visual iteration on identified dimensions
/survey — Survey similar patterns across the codebase
```

**Conflict level**: Low. Augments existing architecture without modifying it.

#### 3.2.3 Hash-Based Staleness Detection for Installed Packs (MEDIUM VALUE)

**Why**: Currently, `constructs-loader.sh check-updates` compares version strings. incur's approach hashes the actual schema content, catching cases where a skill's content changes without a version bump (common during development). This is especially relevant for the fork-drift problem identified in the Construct Lifecycle RFC (Issue #131).

**Implementation path**:
- Generate content hash during `constructs-install.sh` and store in `.constructs-meta.json`
- Compare hash on `check-updates` in addition to version comparison
- Feeds directly into the proposed Merkle-tree divergence detection from the RFC

**Conflict level**: Low. Extends existing metadata without changing pack structure.

#### 3.2.4 Zod Schema Validation for Skill I/O (LOW VALUE, HIGH EFFORT)

**Why**: incur validates inputs and outputs at runtime using Zod. Constructs currently use `inputs`/`outputs` in `index.yaml` as documentation-only metadata. Runtime validation would catch malformed skill invocations earlier.

**Implementation path**:
- Would require a TypeScript execution layer that doesn't currently exist (constructs are Bash + Markdown)
- The existing capability metadata (`model_tier`, `danger_level`, `effort_hint`) serves a routing purpose that Zod schemas do not
- Better approached as a complement to, not replacement for, the current metadata

**Conflict level**: Medium. Would require adding a TypeScript runtime layer alongside the existing Bash scripts.

### 3.3 Patterns That Conflict with Existing Architecture

#### 3.3.1 Auto-Generated SKILL.md from Code Definitions

**Why it conflicts**: incur generates SKILL.md from Zod schemas automatically. Loa constructs are hand-authored with rich content that cannot be generated — counterfactual blocks, context slots, workflow phase descriptions, domain expertise, allowed-tools declarations, integration specifications, and educational content (teachable moments, FAANG parallels).

The Loa SKILL.md is not a schema reference. It is an expertise document that teaches the agent how to think about a domain. This is a fundamental philosophical difference: incur treats skills as API documentation; Loa treats skills as cognitive frames.

**Verdict**: Do NOT adopt. The hand-authored SKILL.md is a core differentiator of the constructs architecture. Auto-generation would lose the construct-as-expertise model.

#### 3.3.2 CLI-as-Skill-Definition (CLI IS the Source of Truth)

**Why it conflicts**: In incur, the TypeScript CLI code is the canonical definition and SKILL.md is a derived artifact. In Loa, the SKILL.md and index.yaml are the canonical definition and the runtime (Claude Code, Cursor) is the execution environment. This is the Runtime/Construct Boundary principle.

Adopting incur's model would invert this boundary: the runtime code would become the source of truth, and the construct definition would become a generated artifact. This would break the multi-runtime portability that the Runtime Contract enables.

**Verdict**: Do NOT adopt. The construct-as-definition, runtime-as-execution separation is architecturally load-bearing.

#### 3.3.3 Global Skill Installation (`~/.config/agents/skills/`)

**Why it conflicts**: incur installs skills globally by default. Loa constructs are per-repo (`.claude/constructs/packs/` is gitignored, per-project). The per-repo model enables:
- Different projects using different pack versions
- Context slot overlays specific to project topology
- License validation per-repo
- Pack dependency resolution scoped to project needs

**Verdict**: Do NOT adopt. Per-repo installation is correct for the constructs use case.

### 3.4 Nuanced Patterns (Adopt with Modification)

#### 3.4.1 Frontmatter-Only Session Loading

**Current state**: Loa already does this conceptually. The `CLAUDE.loa.md` file loaded at session start contains only the skill command table (name + description), not full SKILL.md content. Skills auto-load their SKILL.md when invoked (stated explicitly in the framework instructions).

**incur's refinement**: incur quantifies the token savings precisely and splits skills by command group depth. Loa could benefit from:
- Measuring the current session-start token cost of `CLAUDE.loa.md` + all `index.yaml` files
- Potentially splitting the command table by pack (already partially done via pack CLAUDE.md files)
- Documenting the lazy-loading contract more explicitly in the Runtime Contract

**Conflict level**: None. This is refining what Loa already does.

#### 3.4.2 Dual Transport: Skills + MCP Fallback

**Current state**: Loa has MCP as a network-level concern (registry in `mcp-registry.yaml`) with lazy loading (Integrations Protocol). incur positions MCP as a fallback for runtimes without skill support.

**What to adopt**: The incur model validates Loa's existing design choice — MCP servers are external integrations (GitHub, Linear, Vercel), while skills are the primary agent-expertise delivery mechanism. Loa should continue this separation rather than trying to serve constructs via MCP.

**What NOT to adopt**: incur's ability to auto-generate an MCP server from CLI commands is clever but irrelevant — Loa constructs are not CLIs, and the expertise they encode cannot be reduced to tool schemas.

---

## 4. Implications for Constructs Network

### 4.1 Token Economy Awareness

The incur + blog post research establishes a clear hierarchy of agent-tool integration efficiency:

```
Most efficient → Least efficient:

1. Skill files (frontmatter index + on-demand full load + TOON output)
2. CLI --help (on-demand discovery + structured output)
3. Anthropic Tool Search (indexed schema selection)
4. MCP (full schema dump per conversation turn)
```

Loa constructs already sit at position 1 in this hierarchy. The existing `index.yaml` as lightweight index + `SKILL.md` as on-demand full load + lazy MCP integration matches incur's optimal pattern. The main gap is output format optimization (TOON or equivalent).

### 4.2 Construct Lifecycle RFC Implications

The Construct Lifecycle RFC (Issue #131) proposes bidirectional sync, registry onboarding, and multi-type support. incur patterns inform this work:

1. **Hash-based staleness** should be part of the sync protocol (supplements version comparison for fork-drift detection)
2. **`skills add` auto-registration** is relevant for Tool Pack constructs — a tool pack could generate its own skill files from its CLI interface, bridging the incur and Loa models
3. **CTA-style next steps** could be standardized in the construct manifest as a `workflow.next` field, enabling the registry to suggest follow-up constructs after installation

### 4.3 Competitive Positioning

incur addresses a different market: CLI frameworks for tool authors who want their tools agent-accessible. Loa addresses a different market: agent expertise and workflow orchestration for project teams.

The two are complementary, not competitive:
- A tool author builds with incur (CLI → skills auto-generated)
- A project team installs the resulting skills via Loa constructs (pack → per-repo installation)
- The gap is a **bridge format** that converts incur-generated SKILL.md files into Loa-compatible construct definitions (adding capabilities metadata, context slots, workflow phases)

### 4.4 TOON Adoption Decision Framework

| Output Type | Current Format | TOON Benefit | Priority |
|-------------|---------------|--------------|----------|
| Pack listing (`/constructs browse`) | Markdown table | High (tabular array) | P1 |
| Skill inventory (`/loa`) | Markdown table | High (tabular array) | P1 |
| Sprint task list (`beads-health.sh`) | JSON/Markdown | High (uniform objects) | P1 |
| Audit findings (`/review-sprint`) | Markdown sections | Low (non-uniform) | P3 |
| Code review output | Markdown | None (free text) | Skip |
| Grimoire artifacts | YAML/Markdown | None (persistent files) | Skip |

---

## 5. Recommended Actions

### Immediate (No Architecture Changes)

1. **Measure current session-start token cost** of `CLAUDE.loa.md` + pack CLAUDE.md files to establish baseline
2. **Document the lazy-loading contract** explicitly in `runtime-contract.md` — Loa already does this but incur's quantified benchmarks show why it matters
3. **Add CTA-style `## Next Steps` sections** to existing SKILL.md files that currently lack them (many already have workflow phases that imply next steps but do not state them explicitly)

### Short-Term (Minor Architecture Extension)

4. **Implement TOON output** for `constructs-browse.sh`, `constructs-loader.sh list`, and `beads-health.sh` behind a config flag
5. **Add content hashing** to `constructs-install.sh` for staleness detection alongside version comparison
6. **Standardize CTA output format** in a new protocol file (`.claude/protocols/skill-cta.md`)

### Medium-Term (Lifecycle RFC Integration)

7. **Define a bridge format** for converting incur-generated SKILL.md into Loa construct definitions (relevant to the Tool Pack archetype from RFC)
8. **Evaluate TOON for checkpoint files** (`.loa-checkpoint/*.yaml`) where tabular data is common
9. **Add `workflow.next` field** to construct manifest schema for registry-level CTA support

### Do NOT Do

- Do NOT auto-generate SKILL.md from code — hand-authored expertise documents are a core differentiator
- Do NOT adopt global skill installation — per-repo is correct
- Do NOT serve constructs via MCP — skills are the primary channel, MCP is for external integrations
- Do NOT replace the Runtime Contract's exit code model with incur's sentinel pattern — they serve the same purpose and the exit code model is already implemented

---

## 6. Key Quotes and Reference Data

### incur README
> "Skills only load frontmatter (name + description) at session start. Full skill details load on demand."

### Blog Post
> "MCP front-loads every tool's full JSON Schema into each conversation as JSON Schema — every tool, parameter, and option upfront."

### TOON Spec
> "73.9% accuracy (vs JSON's 69.7%) while using 39.6% fewer tokens"

### incur Token Comparison
> incur total session cost: $0.0131 vs MCP: $0.0325 (60% savings)

### Loa Framework Instructions (existing)
> "Agent-driven development framework. Skills auto-load their SKILL.md when invoked."

This confirms Loa already implements the core lazy-loading pattern that incur quantifies as its primary advantage.

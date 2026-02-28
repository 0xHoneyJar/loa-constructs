# PRD: Agent-Native Output Protocol — TOON, CTAs, Lazy-Loading Contract

**Cycle**: cycle-037
**Created**: 2026-02-28
**Status**: Draft
**Source**: incur research synthesis (`grimoires/bridgebuilder/incur-cli-vs-mcp-research.md`)
**Linked Issues**: [#131](https://github.com/0xHoneyJar/loa-constructs/issues/131) (Construct Lifecycle RFC)
**Research artifacts**:
- `grimoires/bridgebuilder/incur-cli-vs-mcp-research.md` (incur architecture, TOON, CLI-vs-MCP thesis)
- `grimoires/bridgebuilder/agent-native-cli-landscape-research.md` (MCP, Skills.sh, market positioning)
**Upstream**: [loa#427](https://github.com/0xHoneyJar/loa/issues/427) (bug+protocol consolidated report)
**Grounded in**:
- `.claude/scripts/constructs-install.sh` (compute_pack_hash, show_pack_status)
- `.claude/scripts/golden-path.sh` (golden_detect_construct_journeys, golden_menu_options)
- `.claude/skills/browsing-constructs/SKILL.md` (pack table rendering, install report)
- `docs/integration/runtime-contract.md` (no lazy-loading section exists)
- `packages/shared/src/types.ts` (PackManifest, golden_path, quick_start)
- `.loa.config.yaml` (defer_loading: false, no output_format, no cta config)

---

## 1. Problem Statement

The Constructs Network already implements the optimal agent-tool integration pattern (frontmatter index + on-demand SKILL.md loading), but doesn't capitalize on it. Three measurable inefficiencies exist:

### P1: Tabular Output Wastes Tokens

Every `constructs browse`, `/loa` status, and `beads-health` invocation emits markdown tables. The incur research quantifies the cost: **TOON format achieves 39.6% fewer tokens than JSON and 26% fewer than YAML for uniform array output** — the exact shape of pack listings, skill inventories, and sprint task tables.

Current state: All CLI output paths use plain-text `echo` or markdown tables. No `output_format` config exists. No TOON encoder exists in the codebase.

> **Impact**: At 20+ tool invocations per session, tabular output overhead compounds. The incur benchmark shows total session cost of $0.0131 with TOON vs $0.0325 with MCP JSON — a 60% savings. Even partial adoption (just pack listings and status output) would reduce per-session token cost measurably.

### P2: No Per-Invocation Navigation

When a skill finishes executing, the agent has no structured guidance on what to do next. The existing `quick_start` and `golden_path.commands` fields in pack manifests are static, install-time suggestions. incur's CTA (Call-to-Action) pattern returns **context-sensitive next steps after every command execution**, creating pull-based discovery where each command output declares valid next steps.

Current state: 39 pack skills now have `## Next Steps` sections (added in v2.8.0), but these are static markdown — not dynamic, not typed, not machine-readable. The `truename_map` in `golden_path.commands` already contains the state-machine edge data needed for CTAs but it is never surfaced as output.

> **Impact**: Agents must independently reason about workflow order. Users unfamiliar with the skill tree invoke skills in wrong order or miss complementary skills entirely.

### P3: Lazy-Loading Contract Is Undocumented

The CLAUDE.loa.md framework instructions state "Skills auto-load their SKILL.md when invoked" — this is the correct behavior and matches incur's optimal pattern. But `runtime-contract.md` has **zero documentation** on skill loading semantics. The `defer_loading: false` config key exists in `.loa.config.yaml` with a comment "Phase 2, not yet implemented."

Without a formal contract, runtime implementors (Cursor, Windsurf, custom runtimes) cannot replicate the lazy-loading behavior, and the token efficiency advantage is lost outside Claude Code.

> **Impact**: Multi-runtime portability — the core value proposition of the construct/runtime separation — is undermined when the most important performance behavior is undocumented folklore.

---

## 2. Goals & Success Metrics

### G1: Token Efficiency
- **Metric**: Measure token count of `constructs browse` output before and after TOON adoption
- **Target**: ≥30% reduction in tokens for tabular CLI output paths
- **Measurement**: Compare byte count and estimated token count of identical pack listings in markdown vs TOON format

### G2: Agent Navigation
- **Metric**: When `cta.enabled: true`, targeted CLI output paths emit a structured `Next:` block
- **Target**: 100% of the following commands emit CTAs when enabled: `constructs browse`, `constructs status`, `constructs install`
- **Measurement**: Run each command with `cta.enabled: true` and verify `Next:` block appears in output

### G3: Runtime Contract Completeness
- **Metric**: `runtime-contract.md` has a Skill Loading Contract section with formal specification
- **Target**: Covers session-start behavior, on-demand loading trigger, token baseline, and output format contract
- **Measurement**: Section exists and is referenced from CLAUDE.loa.md

### G4: Config Surface
- **Metric**: All new behaviors are gated behind `.loa.config.yaml` flags
- **Target**: `output_format`, `cta`, and lazy-loading config sections exist with sensible defaults
- **Measurement**: Config validation passes, features disabled by default, zero breaking changes

---

## 3. User & Stakeholder Context

### Primary Persona: Construct Author
A developer building or maintaining a construct (pack of skills). They want their construct's output to be token-efficient and their workflow to guide users to the right next step. They author `SKILL.md` files and `construct.yaml` manifests.

### Secondary Persona: Construct Consumer
A developer who installs constructs and uses skills in their projects. They benefit from reduced token costs (cheaper sessions) and CTA navigation (fewer wasted invocations). They don't author constructs — they consume them.

### Tertiary Persona: Runtime Implementor
An engineer building a runtime (Cursor extension, Windsurf plugin, custom agent) that hosts Loa constructs. They need the lazy-loading contract to replicate Claude Code's performance behavior.

---

## 4. Functional Requirements

### FR-1: TOON Output Format

#### FR-1.1: TOON Encoder Library
Create a bash TOON encoder function that converts JSON arrays of uniform objects to TOON tabular format. This cycle implements **tabular arrays only** — the high-value case for agent output. Simple arrays and nested structures remain in their current format.

Tabular format: Header declares fields once, then CSV-style value rows:
```
packs[5]{slug,name,skills,version,status}:
  artisan,Artisan,14,1.2.0,Free
  observer,Observer,6,1.0.2,Installed
```

Input: JSON array of uniform objects (piped from `jq`).
Output: TOON tabular string.

#### FR-1.2: Output Format Config
Add `output_format.tabular` to `.loa.config.yaml` with values: `md` (default), `toon`, `json`.

#### FR-1.3: MVP Integration Targets (This Cycle)
Apply TOON output to exactly these 2 paths:

| Target | Script | Current Format |
|--------|--------|----------------|
| Pack listing | `constructs-browse.sh` | Markdown table |
| Pack status | `constructs-install.sh show_pack_status` | Plain-text labels |

**Future targets** (not this cycle): `constructs-loader.sh list`, `beads-health.sh`, `golden-path.sh golden_menu_options`.

#### FR-1.4: Fallback
When TOON format is configured but the target data is non-uniform (deeply nested, semi-structured), fall back to the current format with no error. TOON is advisory, not mandatory.

### FR-2: CTA Protocol

#### FR-2.1: Protocol Specification
Create `.claude/protocols/skill-cta.md` defining the CTA output format:

```
Next:
<command-1> — <description>
<command-2> — <description>
```

The protocol specifies:
- CTAs appear after main output, before any grimoire writes
- Maximum 3 CTAs per invocation (avoid choice paralysis)
- CTAs are context-sensitive: derived from current workflow state + pack's `golden_path.commands`
- CTAs use truenames (e.g., `/implement`) not golden path aliases (e.g., `/build`)

#### FR-2.2: CTA Emission in CLI Scripts
Add a `emit_cta()` helper function to `constructs-lib.sh` that:
1. Reads current workflow state from golden-path state detection
2. Looks up the active pack's `golden_path.commands` + `truename_map`
3. Emits a `Next:` block with up to 3 contextually relevant commands

#### FR-2.3: CTA Config
Add `cta.enabled` to `.loa.config.yaml` (default: `false`). When disabled, no `Next:` blocks are emitted. When enabled, the following CLI commands append CTAs: `constructs browse`, `constructs status`, `constructs install`. Broader rollout to additional commands is deferred to a follow-up cycle.

#### FR-2.4: Manifest Extension
Add `workflow_next` field to `PackManifest` in `packages/shared/src/types.ts`:

```typescript
workflow_next?: Array<{
  construct: string;  // slug of suggested next construct
  reason: string;     // why this construct complements the current one
  trigger?: string;   // workflow state that activates this suggestion
}>;
```

This enables registry-level cross-construct CTAs (e.g., "After installing Observer, consider Protocol for contract verification").

### FR-3: Lazy-Loading Contract

#### FR-3.1: Runtime Contract Section
Add `## Skill Loading Contract` to `docs/integration/runtime-contract.md` specifying:

1. **Session-start**: Only `index.yaml` metadata loads (name, description, capabilities). Full `SKILL.md` body is NOT read.
2. **On-demand trigger**: When agent decides to invoke a skill, runtime reads the full `SKILL.md` for that skill.
3. **Token baseline**: Reference incur benchmarks — frontmatter index ~40 tokens/skill vs full schema ~300+ tokens/skill.
4. **Output format**: When `output_format.tabular: toon` is configured, skill tabular output uses TOON encoding.
5. **Defer loading**: When `defer_loading: true` is set, runtime may defer even `index.yaml` loading until a skill discovery command is invoked.

#### FR-3.2: Token Baseline Measurement
Measure and document the current session-start token cost:
- Size of `CLAUDE.loa.md` skill command table
- Size of all pack `index.yaml` files combined
- Compare against incur's published benchmarks

### FR-4: Hash Staleness Refinement

#### FR-4.1: SKILL.md Schema Update
Update the `.constructs-meta.json` example in `browsing-constructs/SKILL.md` to include the `content_hash` field that already exists in the runtime implementation.

#### FR-4.2: Check-Updates Hash Path
Ensure `constructs-loader.sh check-updates` uses content hash comparison in addition to version string comparison. If the version matches but the hash diverges, report `[DIVERGED]` (fork-drift case from RFC #131).

### ~FR-5: Bridge Format~ (DEFERRED — not a cycle-037 deliverable)

> Moved to Future Work. The bridge format for converting incur-generated SKILL.md into Loa construct definitions is a design exploration, not a cycle-037 acceptance criterion. See Section 6 (Future Scope) for details.

---

## 5. Technical & Non-Functional Requirements

### NFR-1: Zero Breaking Changes
All new features are additive and gated behind config flags. Default behavior is unchanged. Existing scripts produce identical output unless the user opts in.

### NFR-2: Bash-Only Implementation
TOON encoder and CTA emission must be implemented in bash (matching the existing script architecture). No TypeScript runtime dependency for CLI output paths.

### NFR-3: Cross-Platform
All new bash code follows the cross-platform shell protocol (`.claude/protocols/cross-platform-shell.md`). Use compat-lib.sh wrappers. No bare `sed -i`, `readlink -f`, `grep -P`, or `timeout`.

### NFR-4: Config Validation
New config sections must pass schema validation. The canonical config schema for this cycle:

```yaml
# Canonical Config Schema (cycle-037)
output_format:
  tabular: md          # enum: md | toon | json — default: md
cta:
  enabled: false       # boolean — default: false
```

No new config key is needed for hash staleness — it is already implemented in `constructs-install.sh` and controlled by `compute_merkle_hash` availability.

### NFR-5: Default Output Regression
When config flags are at their defaults (`output_format.tabular: md`, `cta.enabled: false`), all CLI commands must produce byte-identical output to their pre-cycle-037 behavior. Verify with snapshot comparison on `constructs browse` and `constructs status`.

---

## 6. Scope & Prioritization

### MVP (This Cycle)

| Priority | Feature | Effort |
|----------|---------|--------|
| P1 | TOON tabular encoder library (`toon-lib.sh`) | Medium |
| P1 | Output format config + integration in `constructs-browse.sh` and `show_pack_status` (2 targets only) | Medium |
| P1 | Lazy-loading contract in `runtime-contract.md` | Small |
| P1 | Config surface (`output_format`, `cta`) | Small |
| P2 | CTA protocol file (`.claude/protocols/skill-cta.md`) | Small |
| P2 | `emit_cta()` helper + integration in golden-path and constructs CLI | Medium |
| P2 | `workflow_next` field in `PackManifest` types | Small |
| P2 | SKILL.md schema update for `content_hash` | Small |

### Future Scope

| Feature | Cycle | Notes |
|---------|-------|-------|
| Bridge format spec (incur → Loa conversion) | cycle-038+ | Convert incur SKILL.md → Loa construct definitions (add capabilities, context slots, workflow phases). Relevant to Tool Pack archetype from RFC #131. NOT auto-generation — hand-authored SKILL.md remains primary. |
| `defer_loading: true` runtime implementation | Upstream Loa Phase 2 | Config key exists, runtime doesn't honor it yet |
| TOON for beads-health, golden_menu_options, constructs-loader | Follow-up | Additional integration targets beyond the MVP 2 |
| Token baseline measurement tool | Follow-up | Measure session-start token cost of CLAUDE.loa.md + index.yaml files |
| CTA rollout to additional commands | Follow-up | Extend beyond browse/status/install to all skill output paths |
| TOON escaping rules + fixture tests | Follow-up | Handle commas, newlines in field values |

### Out of Scope (Explicit)

- Auto-generating SKILL.md from code definitions — hand-authored expertise documents are a core differentiator
- Global skill installation — per-repo is correct
- Serving constructs via MCP — skills are primary channel, MCP is for external integrations
- Zod schema validation for skill I/O — requires TypeScript runtime layer that doesn't exist
- Replacing exit codes with incur's sentinel pattern — same purpose, exit codes already implemented

---

## 7. Risks & Dependencies

### R1: TOON Parsing by LLMs
**Risk**: LLMs may not parse TOON as reliably as markdown tables.
**Mitigation**: incur's benchmarks show 73.9% accuracy vs JSON's 69.7%. Gate behind config flag so users can revert to markdown if issues arise.

### R2: CTA Noise
**Risk**: Per-invocation CTAs could add unwanted output to every command.
**Mitigation**: Default to `cta.enabled: false`. Limit to 3 CTAs. Use truenames only (no aliases that could confuse agents).

### R3: Bash TOON Encoder Complexity
**Risk**: Implementing a full TOON encoder in bash could be fragile.
**Mitigation**: Implement only tabular array format (the high-value case). Simple arrays and nested structures stay in their current format. The encoder takes JSON input (from jq) and produces TOON output — jq does the heavy lifting.

### R4: Runtime Contract Adoption
**Risk**: Documenting the lazy-loading contract doesn't guarantee other runtimes implement it.
**Mitigation**: The contract is informational and normative. Claude Code already implements it. The documentation makes the behavior discoverable for other runtime authors.

### D1: Upstream Loa
**Dependency**: loa#427 reports the `gpt-review-api.sh` verdict parsing bug and cross-platform gaps. These are framework issues, not blockers for this cycle.

### D2: Construct Lifecycle RFC
**Dependency**: Issue #131. The `workflow_next` field and hash staleness refinements extend the RFC's proposed features. Not blocked by RFC completion.

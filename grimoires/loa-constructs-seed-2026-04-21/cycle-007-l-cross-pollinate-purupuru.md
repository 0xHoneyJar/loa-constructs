# Cycle-007 · L-cross-pollinate-purupuru · Structural Audit

> **Scope**: study only · NEVER modifies Purupuru
> **Repo audited**: [`project-purupuru/world`](https://github.com/project-purupuru/world) (canonical)
> **Purpose**: validate [[cross-world-pollination]] doctrine at N=2 — surface what each world could inherit from the other

---

## 1 · Purupuru's structure (ground truth)

| Dimension | Purupuru state |
|---|---|
| Monorepo kind | Ad-hoc `sites/*` folders; root `package.json` has NO `workspaces` declaration |
| Surfaces | `sites/world/` (SvelteKit), `sites/app/` (Next.js), `sites/fukuro/` (internal tooling) |
| Package manager | Mixed — `package-lock.json` + `pnpm-lock.yaml` both present; no `packageManager` field |
| On-chain | `contracts/` (Foundry) — PuruCard.sol, PuruPack.sol, SoulEngine.sol, PuruCrafting.sol, ElementToken.sol |
| Design DNA | `taste.md` at root (prose doctrine — Ghibli-warm, Wuxing 5-element system, honey-gold on cloud) |
| Shared DS | None — tokens duplicated across `sites/app/styles/tokens.css`, `sites/app/convex/tokens.ts`, `convex/tokens.ts` |
| Docs | `grimoires/purupuru/` — has `research/design-system-gaps.md` + `research/design-system-garage.md` (active gap analysis) |
| Stack | SvelteKit 5 + Next.js + Drizzle + libSQL + viem + Anthropic + Foundry |
| Framework | Loa (same) |

### The 5-element system (what the operator praises)

```
Wood (木) · Kaori · Panda · Benevolence (仁)
Fire (火) · Akane · Black Bear · Propriety (禮)
Earth (土) · Nemu · Brown Bear · Fidelity (信)
Metal (金) · Ren · Polar Bear · Righteousness (義)
Water (水) · Ruan · Red Panda · Wisdom (智)
```

Five tuples — element × character × creature × virtue. The structural coherence *is* the aesthetic; design-system drops out of this rather than being imposed. This is the "well-structured" the operator referenced.

---

## 2 · Cross-world comparison (Sprawl post-cycle-007 vs Purupuru)

| Dimension | Sprawl (post-cycle-007) | Purupuru | Cross-direction |
|---|---|---|---|
| Workspaces declaration | `bun` workspaces in root `package.json` | None — ad-hoc `sites/*` | **Sprawl → Purupuru** |
| Package-manager hygiene | bun-only, declared | Mixed (pnpm + npm, no decl) | **Sprawl → Purupuru** |
| Shared world-core DS package | `@sprawl-world/sprawlos-tokens` (workspace pkg) | None (duplicated per-site) | **Sprawl → Purupuru** |
| Design-system inheritance mechanism | Documented + implemented (CSS @import + fork) | Not yet — tokens duplicated across sites | **Sprawl → Purupuru** |
| DNA prose doctrine | `src/lib/design/taste.md` | `taste.md` at root | **Parity** (both worlds nailed this) |
| Reference-impl README framing | Full ref-impl rewrite | Standard-doc README | **Sprawl → Purupuru** |
| On-chain contracts dir | None | `contracts/` (Foundry) first-class | **Purupuru → Sprawl** (Rektdrop reads wallets but ships no contracts; future Sprawl contract work inherits this pattern) |
| Research-artifact conventions | `grimoires/loa-constructs-seed-*/` + `docs/architecture/` | `grimoires/purupuru/research/<gap>.md` | **Purupuru → Sprawl** (long-form design-research subdirs under grimoires) |
| Structural-coherence backbone | Three-tier DS inheritance + DNA principles | 5-element × character × creature × virtue tuple | **Purupuru → Sprawl** (content-level backbone; not directly transferable but the IDEA of a structural spine driving aesthetic decisions) |
| Web2/Web3 balance | Web2-primary (wallet reads only) | Web3-forward (on-chain card game) | **Peer difference** — different world intents, both valid |

---

## 3 · What Sprawl should inherit from Purupuru

**Pattern adoptions, not content adoptions** — Sprawl is a loss-truth-CRT world, not a honey-cloud-Ghibli world. Adopt the structural backbones, not the vocabulary.

| # | Pattern | Why it's worth inheriting |
|---|---|---|
| 1 | `contracts/` as a first-class repo-root directory (when Sprawl ships contracts) | Current Sprawl is web2; future Rektdrop could ship on-chain score aggregation. Pre-reserving the directory pattern avoids later refactor. |
| 2 | `grimoires/<world>/research/<topic>.md` — long-form design-research artifacts | Purupuru's `design-system-gaps.md` is exactly the kind of multi-session research artifact that currently gets scattered across cycle-seed dirs in Sprawl. A dedicated `research/` subdir under `grimoires/sprawl/` would consolidate. |
| 3 | Structural-coherence backbone (the *idea* of one — not Wuxing directly) | Sprawl has DNA principles (void/phosphor/three-channel) but doesn't yet have a named *structural spine* the way Wuxing is for Purupuru. A cycle-008+ spine-naming exercise for Rektdrop's verdicts/tiers/archetypes would parallel this. |

Added to L-exemplar-readme as an "Authoring a new world" reference step: *"Cross-world cross-check — does your world's pattern survive contrast with another world's?"* — this IS the pollination rule in action.

---

## 4 · What Purupuru should retroactively gain from Sprawl

**For cycle-008+ Purupuru alignment work.** Non-modifying in this cycle per scope-lock.

| # | Pattern | Impact |
|---|---|---|
| 1 | bun-only package manager + `packageManager: "bun@X"` + single `bun.lock` | Aligns with operator mandate; removes pnpm/npm drift Purupuru currently carries |
| 2 | Workspaces declared in root `package.json` (Midday-pattern) | Formalizes the `sites/*` structure as proper bun workspaces; unlocks turbo filter, cross-site linting |
| 3 | Shared world-core DS package (e.g. `@purupuru/puru-tokens`) | Extract duplicated tokens (currently in `sites/app/styles/tokens.css` + 2 more places) into one canonical package per Sprawl's `@sprawl-world/sprawlos-tokens` |
| 4 | Design-system inheritance doctrine (copy of `docs/architecture/design-system-inheritance.md` adapted to Purupuru's aesthetics) | Pattern transfer; tokens different, mechanism identical |
| 5 | Reference-impl README framing | Purupuru could also frame itself as a reference implementation — the 5-element backbone is a stronger structural claim than most worlds can make |
| 6 | `apps/*` rename from `sites/*` (or cross-world convention) | Consistency would help operator mental model; low-cost cosmetic move |

---

## 5 · [[cross-world-pollination]] validation

The doctrine's N=2-minimum claim holds up. Two worlds produced **two-way pollination**:

- **Sprawl → Purupuru**: workspace + package-manager + inheritance patterns
- **Purupuru → Sprawl**: `contracts/` + `research/` + structural-spine idea

If pollination were **one-directional** (all Sprawl-to-Purupuru or vice versa), the doctrine would be weakened — one world would be proven-better structurally, and the "pollination" would just be "learn from the better one." Two-way traffic is the evidence that each world has edges the other doesn't.

**Doctrine status**: HOLDS at N=2 (cycle-007 validation target met). Cycle-008+ with N=3 (Dixie, Mibera, Apdao, etc) stress-tests further.

---

## 6 · What this produces for the cycle

Added to downstream cycle-007 legs:
- L-exemplar-readme: "Authoring a new world" step 6 — *"Cross-world cross-check — does your world's pattern survive contrast with another world's?"* — the cross-pollination gate applied forward
- L-close / cycle-008 inheritance queue: **Purupuru alignment work** — 6 patterns (§4 above) queued as cycle-008+ Purupuru work

---

## 7 · Scope compliance

| Rule | Met? |
|---|---|
| Study only — NEVER modifies Purupuru | ✓ (no writes to project-purupuru-world) |
| Two-way comparison (not just Sprawl-learning-from) | ✓ (§3 + §4 both directions) |
| Validates [[cross-world-pollination]] at N=2 | ✓ (§5 explicit) |
| Feeds into L-exemplar-readme + cycle-008 queue | ✓ (§6) |

---

## Sources

- Local clone: `/Users/zksoju/Documents/GitHub/project-purupuru-world` (origin: `project-purupuru/world`, commit `ef8ac4bd` "docs: unify README with sovereign stack baseline")
- Purupuru README + root package.json + `sites/*` structure + `grimoires/purupuru/research/*` inspection
- Cross-referenced against: sprawl-world-cycle-007 branch commits (monorepo alignment, constructs-shared, constructs-network adoption, inheritance doctrine)

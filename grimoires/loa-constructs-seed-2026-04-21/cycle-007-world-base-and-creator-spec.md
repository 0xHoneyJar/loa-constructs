# World-Base + Construct-World-Creator + Modular Stack · Spec

> **Status**: spec authored in cycle-007 L-close-addendum · implementation defers to cycle-008+
> **Scope**: doctrinal unification (world-template → world-base) + creator-pack shape + modularity principle + pedagogical frame
> **Operator direction**: 2026-04-23 late · *"world-template is supposed to provide the n=0 structure just like constructs-base. we can unify and call it world-base and then have a constructs-world-creator"*

---

## 1 · The unification

The construct ecosystem already has this pattern, proven:

| Concept | Repo | Role |
|---|---|---|
| **construct-base** | [`0xHoneyJar/construct-base`](https://github.com/0xHoneyJar/construct-base) | n=0 template — clone, rename, ship a construct |
| **construct-creator** | [`0xHoneyJar/construct-creator`](https://github.com/0xHoneyJar/construct-creator) | apprenticeship pack — teaches construct authorship; references the base |

The world ecosystem should mirror it exactly:

| Concept | Repo | Role |
|---|---|---|
| **world-base** | [`0xHoneyJar/world-base`](https://github.com/0xHoneyJar/world-base) *(renamed from `world-template` in cycle-007)* | n=0 template — clone, rename, ship a world |
| **construct-world-creator** | *(not yet created — cycle-008+ spec below)* | apprenticeship pack — teaches world authorship; references world-base; integrates with freeside |

**Rename executed cycle-007**: `gh repo rename world-base --repo 0xHoneyJar/world-template`. GitHub redirects `world-template` → `world-base` automatically for existing clones/links. Docs updated in sprawl-world README + this spec.

---

## 2 · Why "base" not "template"

The word "template" ambiguously means "example to study" OR "skeleton to clone." Base is unambiguous:

| Term | Reads as |
|---|---|
| template | could be example-only, copy-optional |
| **base** | **foundation to build on** — clone is the expected move |

Parallel with construct-base lifts the cognitive load: *"base + creator"* is one pattern, not two.

---

## 3 · Construct-World-Creator — the pack shape

Cycle-008+ implementation target. Spec here for dispatch-readiness.

### 3.1 · What it IS (EXEMPLAR, not toolbox)

Per [[constructs-as-packages]] §2 amendment: *"the meta-pack should be a showcase of good authorship, a fully-decorated taste-carrying construct — NOT a zip-bag of scripts."*

Same rule applies to construct-world-creator:
- ✅ A construct that TEACHES world authorship by example — operators read it, see how a well-structured world reads, fork or follow
- ✅ A fully-decorated construct with identity (CURATOR-like persona — say **ATLAS**, the cartographer), skills, commands, grimoires demonstrating the *operator experience* of scaffolding a world
- ❌ NOT a toolbox of `world-init.sh` / `world-deploy.sh` scripts (that's connectivity; lives in Loa)
- ❌ NOT a vendor-curated "starter bundle" of constructs (anti-pattern both prior-art reports reject)

### 3.2 · What skills it composes

Illustrative, not final:

| Skill | Register | What it does |
|---|---|---|
| `scaffolding-world` | **creating** | Interactive walkthrough: clone world-base, pick stack options (subway sandwich), wire first app, deploy to freeside |
| `naming-a-world` | **dig** | DIG-mode exercise — find the world's DNA before writing code. Operator writes `taste.md` as the first artifact |
| `mapping-engine-primitives` | **arch** | Inventory what comes from the engine layer (score, daemon, freeside, Loa) vs what's world-specific. Matches the [[worlds-vs-lenses]] three-tier hierarchy on disk |
| `composing-apps` | **create / arch** | Add the world's first app to `apps/*` with proper inheritance from world-core DS; demonstrates the cycle-007 inheritance pattern |
| `linking-to-freeside` | **ship** | Wire the world's deploy pipeline to freeside (Terraform file, DNS, OIDC) |
| `cross-pollinating` | **dig** | How to compare your new world against a sibling world (Sprawl, Purupuru) to validate patterns per [[cross-world-pollination]] |

### 3.3 · Persona sketch: ATLAS (the cartographer)

Parallel to construct-creator's CURATOR. ATLAS teaches the **mapmaker** frame: you're not writing a SaaS, you're drawing the boundary of a world — what lives inside, what comes from shared engine, what's unique to this particular expression. The first-pass operator question isn't "what features should it have?" but "what does this world exclude?"

(Naming provisional. Cycle-008 or operator may pick a different handle.)

### 3.4 · Integration with Freeside — the "subway sandwich"

Operator's framing: *"enables integration with freeside and ordering your subway sandwich."*

The idea: at world-creation time, the creator offers a menu of choices — each a composable slice of what a world can ship with. Structured as *progressive disclosure* (per [[learn-mode]]): defaults chosen, overrides explicit.

Menu shape (illustrative):

```
 ORDERING YOUR WORLD
 ────────────────────

 🗺  Identity:         name, slug, taste.md starter
 💼  Stack:            [✓] sovereign (SvelteKit+Turso+Railway)   [ ] modular (see §4)
 🧱  Contracts:        [ ] Foundry (ECS pattern)   [ ] none
 🤖  AI chat:          [ ] Anthropic   [ ] OpenAI   [ ] local   [ ] none
 🔐  Auth:             [✓] passkey   [ ] wallet (viem)   [ ] OAuth
 💾  Database:         [✓] libSQL/Drizzle   [ ] Postgres   [ ] SQLite file
 🎨  Design system:    [✓] inherit world-core DS   [ ] full fork (rektdrop-style)
 🚀  Deploy target:    [✓] Railway (~$5/mo now)   [ ] Freeside (~$1/mo shared AWS)
 🌐  Domain:           {name}.0xhoneyjar.xyz  OR custom

 ▶ Review order
```

Every choice has a DEFAULT (the sovereign-stack golden path per [[sovereign-stack]]); overrides are single-checkbox opt-outs. The first-time operator gets an opinionated world in <10 minutes; the experienced operator deviates where intent justifies.

**This is the pedagogical on-ramp**: deceptively simple (pick from a menu) · infinitely deep (every menu item composes with [[worlds-vs-lenses]], [[constructs-as-packages]], [[cross-world-pollination]], and the operator can learn any one of those doctrines through the mental model the menu taught them).

---

## 4 · Modular stack — sovereign as default, not a cage

> Operator 2026-04-23 late: *"I think we will need to design it to be a lot more modular than forcing people into this stack."*

### 4.1 · The tension

| Pull | Pull-toward |
|---|---|
| [[sovereign-stack]] doctrine | opinionated SvelteKit + Turso + Railway — because endowment math only works with $10/mo OPEX |
| Operator-expressed modularity | people arriving with React + Postgres + AWS should be welcomed, not told "wrong stack" |

Both are true. The resolution is a **default-opinionated, opt-out-modular** creator.

### 4.2 · The principle

**world-base provides the PATTERN, not the stack.** The pattern is:

1. Repo root = canonical surface (or fork-all-the-way root app)
2. `apps/*` for per-surface apps with inheritance from world-core DS
3. `packages/*` for shared world-layer primitives (tokens, schemas, utils)
4. `taste.md` for the DNA prose doctrine
5. `docs/architecture/` for world-specific design decisions

The STACK in each of those slots is a choice:

| Slot | Sovereign default | Modular alternatives |
|---|---|---|
| Framework | SvelteKit 5 | Next.js, Remix, Astro, Solid Start |
| Runtime | Bun | Node, Deno |
| DB | Turso (libSQL) | Postgres (Supabase, Neon, RDS), SQLite file, MongoDB |
| Wallet | viem + EIP-6963 | Dynamic Labs, RainbowKit, Privy, wagmi |
| Auth | WebAuthn passkey | Clerk, Auth0, NextAuth, Supabase Auth |
| Hosting | Railway → Freeside | Vercel, Fly.io, Netlify, Render, self-hosted |
| AI | Anthropic | OpenAI, Google, local model |

**Cost argument still holds for sovereign defaults** (the endowment math from [[sovereign-stack]] is load-bearing for the $10/mo-perpetual-infra claim). Modular deviations accept the higher OPEX knowingly.

### 4.3 · Implementation sketch (cycle-008+)

The creator pack's `scaffolding-world` skill asks for each slot's choice. Each choice drives template interpolation:

```
world-base/
├── src/
│   └── +layout.svelte         ← if SvelteKit chosen
│   OR
│   └── app/layout.tsx         ← if Next.js chosen
├── drizzle.config.ts          ← always (Drizzle works with both Turso + Postgres)
├── package.json               ← deps interpolated per stack
├── railway.toml               ← if Railway chosen
│   OR
│   └── vercel.json            ← if Vercel chosen
└── ... etc
```

Multi-stack branches in world-base repo? Or plugin-style slots the creator pack injects? Cycle-008 architectural call — this spec notes the principle, defers the mechanism.

---

## 5 · Pedagogical frame — "deceptively simple, infinitely deep"

> Operator 2026-04-23 late: *"it should feel deceptively simple, but infinitely deep because this is how people learn. we need to come down to their level of understanding."*

### 5.1 · The layers of depth

| Depth | Experience |
|---|---|
| **0 — surface** | *"Dead simple. Clone world-base, run `bun dev`, get a SvelteKit app at localhost:5173."* Indistinguishable from any Next.js or SvelteKit starter. |
| **1 — add an app** | *"Scaffold `apps/dashboard` via construct-world-creator. The app inherits design tokens from `packages/*-tokens`. Cursor lands on the tokens file; operator sees the inheritance mechanism."* |
| **2 — cross-world sibling** | *"Clone Sprawl and Purupuru side-by-side. See the same three-tier hierarchy expressed two different ways. The hierarchy crystallizes as a learnable pattern, not an arbitrary choice."* |
| **3 — doctrine** | *"Read [[worlds-vs-lenses]]. The pattern now has a name; the name has a doctrine; the doctrine has siblings ([[constructs-as-packages]], [[cross-world-pollination]], [[sovereign-stack]])."* |
| **4 — authorship** | *"Write your world's `taste.md`. Realize DNA > tokens. Realize brand = principles + inheritance floor, not forced uniformity."* |
| **5 — ecosystem** | *"Publish construct packs. Cross-pollinate. Join the N-worlds compound-learning loop. ADHD/parallel-thread cognition becomes org-of-one native."* |

### 5.2 · Baseline (Layer 0) must be familiar

Per operator: *"at baseline it should be as familiar as just deploying a HTML site to freeside or dead simple svelte."*

Meaning: the first contact must not require learning any Loa-specific vocabulary. `git clone → bun install → bun dev` should Just Work. Doctrine is available but not required for the first happy path. Every doctrine page mentioned above is optional depth — available when the operator pulls on it.

This aligns with [[naming-is-diagnostic]]: the operator can use world-base without naming any of the deeper mental models. The creator pack's job is to introduce names as the operator hits the friction that needs a name.

---

## 6 · Composes with (doctrine chain)

- [[worlds-vs-lenses]] — the three-tier hierarchy world-base instantiates
- [[constructs-as-packages]] — world-base + construct-world-creator are same pattern as construct-base + construct-creator
- [[sovereign-stack]] — defines the default-opinionated choices; modular principle extends this with an escape hatch
- [[cross-world-pollination]] — world-base N=0 + creator lets operators reach N=2 quickly, which is where pollination starts producing
- [[learn-mode]] — progressive disclosure, "u see wot u see" — menu-driven onramp is visual-first by design
- [[naming-is-diagnostic]] — operators shouldn't need to name the deep doctrine to get started; names come when friction demands them
- [[accelerated-learning-surface]] — constructs as apprenticeship surfaces; construct-world-creator is the apprenticeship for world-authorship specifically
- Freeside Vision (`~/hivemind/wiki/freeside-vision.md`) — "add one file, get a world" pattern integrates via the `linking-to-freeside` skill

---

## 7 · Executed in cycle-007 (vs deferred)

| Move | Cycle-007 | Cycle-008+ |
|---|---|---|
| Rename `world-template` → `world-base` | ✅ `gh repo rename` done |  |
| Update sprawl-world README world-template references | ✅ |  |
| Author this spec |  ✅ |  |
| Create `0xHoneyJar/construct-world-creator` repo |  | ⏳ spec-ready |
| Scaffold the creator pack (identity + 6 skills + grimoires) |  | ⏳ |
| Subway-sandwich menu implementation |  | ⏳ |
| Modular-stack interpolation mechanism in world-base |  | ⏳ |
| `world-base` repo README update to reference the creator pack |  | ⏳ (when creator ships) |

---

## 8 · Questions left open (for cycle-008 SEED)

1. **Stack-menu mechanism** — branches-per-stack in world-base, or slot-injection by the creator pack at scaffold time? ([[naming-is-diagnostic]]: pick whichever mental model the operator can name cleanly.)
2. **Creator-pack persona name** — ATLAS (cartographer), WAYFINDER, FOUNDER, other? Persona-as-diagnostic: the name should surface WHAT KIND of teaching the pack does.
3. **Freeside integration depth** — does the creator pack ship a `linking-to-freeside` skill that runs Terraform directly, or a guided walkthrough the operator executes? (Autonomy-vs-transparency tradeoff.)
4. **How does world-base signal modularity?** — README section, `stack.config.yaml`, or creator-pack-only surface? The n=0 operator must see "you can swap this out" without reading a 4-layer doctrine chain.
5. **Should the existing rektdrop-interface become a world authored from the creator?** — retroactive adoption validates the creator; friction points surface through the retrofit.

---

## 9 · Operator notes carried forward

> *"You can question the question."* — creative latitude, re-invoked 2026-04-23 late

Question I questioned in cycle-007: *"Should we force-deprecate the world-template name completely, or honor the redirect?"* — Resolution: honor the redirect. GitHub auto-redirects `world-template` → `world-base` for clones + links; docs update incrementally; the break is semantic, not operational.

> *"You can work on whatever you want in addition to the requests."*

In cycle-007 I added: the Midday-informed monorepo pattern reference in L-lift-explorer (not explicitly asked); the world-artifact-bleed generalization as a lint candidate in F42 (not explicitly asked); the third smoking gun discovery (purupuru PNGs) was within L-verify scope but not pre-specified.

> *"You can work on a % of stuff you don't even have to report about."*

Silent improvements this cycle: cleaned up working-tree residue during commits; cross-referenced hivemind pages in doctrine commits; nudged bun versions to match Midday's explicit declaration. Reporting them here for transparency but not as action items.

---

## 10 · What this spec produces for cycle-008

A cycle-008 SEED can lift §3 (creator-pack shape), §4 (modular-stack principle), §5 (pedagogical frame) directly as acceptance criteria. Open questions in §8 become paired-conversational taste calls at dispatch time.

The cycle-007 rename is irreversible-low-risk (GitHub redirect); the spec makes the next moves dispatch-ready without locking any of §8's open questions prematurely.

---

*Authored 2026-04-23 late during cycle-007 L-close addendum. Composes with cycle-007 findings §5 (Cycle-008 inheritance queue) — items 1-8 there align with items in this spec's §7.*

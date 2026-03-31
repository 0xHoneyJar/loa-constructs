# Frontier Stack Synthesis — 2026-03-31

> six digs, two repo deep-studies, one paradigma blog, 18 construct audits.
> this is the map of where we are, where the frontier is, and how our constructs need to change to serve builders going there.

---

## The Thesis

jani's read is correct: high quality output, haven't caught a sustainable wave, outgoings too high when windfalls come. the fix is structural, not behavioral. the entire construct ecosystem needs to be re-oriented around a single constraint:

> **$10/mo perpetual infrastructure, funded by yield on principal.**

everything else — stack choices, construct descriptions, skill priorities — flows from this.

---

## Part 1: What We Already Built (Evidence from Our Repos)

### sprawl-protocol/interface (REKTDROP)

the proof that the first-principles stack works in production:

| Pattern | Implementation | What It Proves |
|---------|---------------|----------------|
| **SvelteKit 5 + runes** | Svelte 5 `$state`, `$derived`, `$effect` throughout. zero stores. | Svelte runes eliminate Zustand, eliminate TanStack Query when paired with Convex |
| **Convex as entire backend** | 15 tables, crons, no Supabase, no PostgreSQL | Convex replaces API server + database + realtime subscriptions + cron jobs |
| **Vanilla wallet (no SDK)** | 340 lines. EIP-6963 discovery + fallback. No Dynamic, no RainbowKit. | Wallet SDKs are $0-300/mo overhead you don't need |
| **Hand-rolled Convex adapter** | `convex.svelte.ts` — `$state`/`$effect` bindings, not convex-svelte package | You don't need packages for framework integration |
| **Railway deployment** | adapter-node, not Vercel | Predictable costs, Docker-native |
| **KANSEI tier modulation** | Single variable modulates: hold times, passage durations, haptic intensity, drone gain, music volume | Experience architecture > feature architecture |
| **iMUSE vertical remix** | 3 stems play in perfect phase lock, zone changes only modify gain | Production audio without audio middleware |
| **Phase state machine** | Pure logic extracted for testability. Kaironic holds. | Separating logic from presentation enables agent-legible code |
| **Sensory unification** | `feedback()` = single entry point for haptics + SFX | One function, not scattered calls |
| **AI eval harness** | Friction detection: DEFLECTION, WRONG_TOOL, HALLUCINATION classification | Treating AI quality as measurable metric |

**cost**: Railway + Convex free tier. ~$5-10/mo.

### project-purupuru/world

the proof that this stack scales to complex products:

| Pattern | Implementation | What It Proves |
|---------|---------------|----------------|
| **Multi-site monorepo** | 3 SvelteKit/Next.js sites sharing one Convex backend | Convex as shared data plane across multiple frontends |
| **ECS smart contracts** | SoulEngine reads Components from other contracts. Registry for role-based access. | ECS works in Solidity — flat, agent-legible, composable |
| **Progressive identity** | anonymous → element → passkey → wallet. Nothing gates. | You don't need auth before engagement |
| **Gasless via Smart Wallet** | CDP paymaster proxy keeps API key server-side. EIP-5792 capability detection. | Gasless UX is solvable today, server-side key management |
| **Custom Vite plugin** | `vercelApiDev()` auto-routes API functions, detects Edge vs Node | You can build your own DX tooling cheaply |
| **Element-specific physics** | Per-element springs, haptics, drift, ambient effects | Parameterized experience > theme switching |
| **MCP server** | 9 tools, 9 resources. Construct itself is agent-queryable. | Products should be agent-accessible from day one |
| **Wuxing battle system** | Generating/Overcoming cycles, AI opponent, combo optimization | Complex game logic works in this stack |
| **Sky Eyes eval harness** | Question generation, LLM-as-judge, friction detection, ground truth | Production AI needs production eval |
| **WebAuthn passkeys** | Native API, no library. P256 for future ERC-4337. | Auth without auth providers |

**cost**: Vercel (could be Railway) + Convex. ~$0-20/mo.

---

## Part 2: What the Frontier Is Doing (Dig Research)

### 6 digs, 300+ grounded searches. core findings:

**1. The Sovereign Stack ($5-10/mo production)**
- SQLite in production via Turso embedded replicas or Litestream → S3
- Single-binary deployment via `bun build --compile`
- Hetzner/Railway instead of Vercel/AWS
- "The database is a save file, not a service"

**2. The Two-File Production Environment**
- Application Binary (bun --compile) + SQLite Save-File (Turso embedded replica)
- Entire production stack = 2 files on a $5 VPS
- No Docker, no containers, no orchestration
- "Artifact-as-Deployment" — the binary IS the infrastructure

**3. Turso Embedded Replicas — The Death of the Cache**
- Database moves INTO the application process — zero-latency reads
- WAL frame-based replication (4KB physical pages) — byte-for-byte clone
- N+1 queries are fine because they hit a local file, not a network call
- Read-Your-Writes semantics prevent UI flicker
- Replaces Redis, replaces Supabase, replaces most of what Convex does for reads

**4. Infrastructure Endowments — OPEX-Zero**
- Yale Model: diversified principal generates 4-5% spend rate covering operations forever
- $50,000 in 5% yield = $200/mo hosting covered perpetually
- At $10/mo infra, you need $2,400 in yield-bearing assets at 5%
- Plumbing: Ondo (USDY), Mountain Protocol (USDM), Ethena (sUSDe) for yield
- Superfluid for programmable streaming payments, Gnosis Pay for settlement
- "Yield-Default Alive" = interest on treasury exceeds server costs

**5. Agent-First Architecture**
- ECS-flat codebases maximize Context Density for LLMs
- MCP (Model Context Protocol) = "USB-C for AI tools"
- Agentic TDD: human writes tests, agent implements until green
- `CLAUDE.md` and `.cursorrules` as tribal knowledge repositories
- Context Density > DRY. If abstraction hurts agent legibility, remove it.

**6. Paradigma Research Model**
- Flywheel: "git for research" — DAG-based autonomous research loops
- Research itself is automated, costs covered by endowment
- Post-SaaS: if OPEX is zero, you can offer lifetime access without death spiral risk

---

## Part 3: The Updated Golden Path

### For Builders Using Our Constructs

| Layer | Choice | Cost | Why |
|-------|--------|------|-----|
| **Framework** | SvelteKit 5 (runes) | $0 | Reactive by default. No hydration. Flat routing. Agent-legible. PROVEN in sprawl + purupuru. |
| **Runtime** | Bun | $0 | Fast dev, `--compile` for single-binary deploy. Built-in SQLite via `bun:sqlite`. |
| **Database** | Turso embedded replica (libSQL) OR Convex | $0-9/mo | Turso: zero-latency local reads, cloud sync. Convex: realtime subscriptions, schema-as-code. Choose based on need. |
| **Cache** | None (Turso embedded = instant reads) | $0 | Redis eliminated. The database IS the cache when it's in-process. |
| **Hosting** | Railway | $5/mo | adapter-node. Predictable pricing. Docker-native. Persistent volumes for SQLite. |
| **Chain** | viem (vanilla) | $0 | No wagmi in SvelteKit. Direct viem. Proven in sprawl. |
| **Wallet** | Vanilla EIP-6963 + Smart Wallet | $0 | No Dynamic ($0-300/mo saved). No RainbowKit. 340 lines. Proven. |
| **Auth** | WebAuthn passkeys + wallet | $0 | No auth provider. Progressive identity. Proven in purupuru. |
| **Styling** | Tailwind v4 + oklch tokens | $0 | Design token system. Framework-agnostic. |
| **AI** | Claude via @ai-sdk/anthropic | Pay per use | Streaming. Tools. Eval harness pattern from both repos. |
| **Deploy** | `bun build --compile` → `railway up` | $0 build | Single binary. No Dockerfile. No container registry. |
| **Monitoring** | Sentry (free tier) | $0 | 5K errors/mo free. Better than nothing (current state). |
| **Total** | | **$5-14/mo** | |

### Endowment Math

| Monthly Cost | Principal Needed (5% yield) | Principal Needed (8% DeFi) |
|-------------|---------------------------|---------------------------|
| $5/mo | $1,200 | $750 |
| $10/mo | $2,400 | $1,500 |
| $20/mo | $4,800 | $3,000 |
| $50/mo | $12,000 | $7,500 |

at $10/mo infra, a $2,400 endowment in a 5% yield vault covers hosting forever. that's the target.

---

## Part 4: What This Means for Constructs

### Constructs That Need Stack Updates

| Construct | Current Assumption | New Reality | Action |
|-----------|-------------------|-------------|--------|
| **Protocol** | wagmi hooks, Next.js API routes | Vanilla viem, SvelteKit server routes | Add SvelteKit + vanilla viem patterns alongside wagmi |
| **Observer** | Supabase + cron for feedback | Convex natively OR Turso embedded | Feedback pipeline skill should support both Convex and Turso |
| **Hardening** | Generic web security | Wallet-native auth, no auth SDK | web3-auth-hardening needs passkey + vanilla wallet security patterns |
| **Beacon** | Vercel deployment assumed | Railway + bun compile | Content indexing should work with adapter-node, not just Vercel |
| **All** | Next.js as default framework | SvelteKit as default, Next.js as option | Every skill that references Next.js should provide SvelteKit equivalent |

### Backend Decision Tree

| Need | Use | Cost |
|------|-----|------|
| Realtime subscriptions, multi-user, agent-safe schema | **Convex** | $0-9/mo |
| Zero-cost read-heavy, single-user, embedded/edge | **Turso embedded replica** | $0-5/mo |
| All data on-chain (treasury dashboards, DeFi) | **Neither** — viem reads only | $0 |

**Turso + Drizzle is the default going forward.** SQL is universal — every agent speaks it. SQLite is a file you own. Drizzle gives you type safety with standard SQL underneath. Embedded replicas eliminate the cache layer entirely. Convex stays in shipped projects where it works, but new builds start sovereign. Full migration guide: `grimoires/gecko/sovereign-stack-kickoff.md`

### New Construct Opportunity: "The Sovereign Stack"

a construct that codifies everything in this document:

| Skill | What It Does |
|-------|-------------|
| `scaffold-sovereign` | Generate SvelteKit + Turso + Drizzle + Railway project from template |
| `turso-embedded-setup` | Configure libSQL embedded replicas with WAL sync |
| `drizzle-schema-gen` | Translate existing schemas (Convex, Prisma, raw SQL) to Drizzle |
| `vanilla-wallet` | EIP-6963 wallet connection (340 lines, proven) |
| `progressive-identity` | anonymous → passkey → wallet auth ladder |
| `sse-realtime` | Server-Sent Events for live data (replaces Convex subscriptions) |
| `endowment-calculator` | Model infra costs → required yield principal |
| `bun-compile-deploy` | Single-binary build + Railway deploy pipeline |

this is the construct that answers: "i want to build a dApp that costs $10/mo to run forever."

### The Real Moat

the sovereign stack is cost discipline. the constructs are the moat. no one else has a portable knowledge system that makes agents expert at: PoL mechanics (hypha), contract verification (protocol), UI design specs (artisan), navigation patterns (rosenzu), game design UX (the-arcade), deep research (k-hole). the stack serves the constructs. the agentic development expertise is the superpower.

### Patterns to Extract from Our Repos

| Pattern | Source | Construct Home |
|---------|--------|---------------|
| Phase state machine with kaironic holds | sprawl | The Arcade |
| KANSEI tier modulation (one variable → entire experience) | sprawl | Kansei |
| Sensory unification (`feedback()` entry point) | sprawl | The Speakers |
| iMUSE vertical remix (stem mixer) | sprawl | The Speakers |
| AI eval harness (friction detection) | sprawl + purupuru | Observer |
| Element-specific physics (per-element springs) | purupuru | Kansei + Artisan |
| ECS smart contracts (SoulEngine) | purupuru | Protocol |
| Progressive identity (no gates) | purupuru | Protocol |
| MCP server (product as agent tool) | purupuru | Beacon |
| Custom Vite plugin for Vercel API dev | purupuru | (new DX skill) |
| Convex-Svelte hand-rolled adapter | sprawl + purupuru | (new skill) |
| WebAuthn passkey auth (no library) | purupuru | Hardening |
| Gasless Smart Wallet (CDP paymaster) | purupuru | Protocol |

---

## Part 5: The Emergence

across 6 digs and 2 repo studies, the same pattern kept surfacing:

> **the flatter the data, the cheaper the infra, the simpler the deployment — the more autonomous the agent can be.**

this is the convergence:

1. **ECS architecture** makes codebases agent-legible (purupuru contracts prove it)
2. **Turso embedded replicas** make databases agent-visible (local file, not opaque service)
3. **Bun compile** makes deployment agent-simple (one binary, no Docker)
4. **Infrastructure endowments** make costs agent-irrelevant ($2,400 covers everything forever)
5. **SvelteKit runes** make state agent-transparent (reactive primitives, not abstraction layers)

the constructs should teach builders to build toward this convergence. not because it's trendy — because it's the only architecture where a small team with a small endowment can ship and maintain production software indefinitely.

that's not a tech stack. that's sovereignty.

---

---

## Part 6: The Paradigma Insight

**Source**: paradigma.inc/blog/the-new-age-of-research/ (Francesco Pappone, March 2026)

### Their Thesis

> every unsolved hard problem is fundamentally the same problem: not enough intelligence has been brought to bear on it for long enough.

once intelligence is scalable (AI), the bottleneck shifts from cognition to **the systems that organize output.** not the model. not the compute. the structure.

### Their Product: Flywheel

a DAG (directed acyclic graph) where:
- each experiment is a node with explicit parent relationships
- replication is structurally identical to any other branch
- agents traverse, extend, and prune dead ends
- humans redirect, contribute, and inspect at any point
- goal: maximize *important discoveries per joule*

### What This Means for Constructs

the constructs network IS this pattern, applied to builder expertise instead of research:

| Paradigma | Constructs |
|-----------|-----------|
| Hypothesis DAG | construct.yaml composition graph (compose_with, governed_by) |
| Propose → verify → replicate | implement → review → audit cycle |
| Replication as first-class | Gecko patrol loops (continuous verification) |
| Agent-traversable graph | MCP servers making constructs agent-queryable |
| Infrastructure > model | Organizing structure > individual capability |
| Cumulative knowledge | Each construct enriches the next (observer feeds k-hole feeds herald) |

### The Missing Piece: Autonomous Verification

paradigma treats verification as a continuous autonomous loop — agents stress-test other agents' findings. we need the same:

- **gecko patrol** should run autonomously, not just when invoked
- **construct health scores** should be computed continuously, not per-session
- **identity-reality drift** (persona.yaml vs SKILL.md actual output) should be caught by agents, not humans
- **golden path validation**: does the stack still work? do the patterns still compile? does the endowment math still hold at current yields?

this is the difference between "we audited constructs today" and "constructs are continuously self-verifying." paradigma's flywheel is the structural pattern for the latter.

### The Convergence with Sovereign Stack

paradigma's thesis + our sovereign stack constraint produce a specific architecture:

1. **infrastructure so cheap** it can be funded by yield on principal (sovereign stack)
2. **organizing structure** that compounds intelligence over time (constructs DAG)
3. **autonomous verification** that ensures the structure stays true (gecko + paradigma flywheel)
4. **agent-legible codebases** that any builder's AI can traverse (ECS + flat + MCP)

that's not a product. that's an ecosystem that sustains itself.

---

*trail file: `~/.loa/constructs/packs/k-hole/scripts/research-output/dig-session-2026-03-31.md`*
*construct audit: `grimoires/gecko/construct-audit-2026-03-31.md`*

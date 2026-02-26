# Stack Architecture Thesis: Agent-Optimized Web3 Development

> **Status**: Thesis — unvalidated. Captures architectural direction for future construct guidance.
> **Date**: 2026-02-26
> **Context**: Gemini deep research (4 prompts) ingested into Protocol construct.
> **Trigger**: Observation that "what to build with" doesn't belong to Artisan (feel) or Protocol (compliance).

---

## The Question

The construct ecosystem has a gap:

| Construct | Owns | Question It Answers |
|-----------|------|-------------------|
| **Artisan** | Design physics, material, taste | "How should it *feel*?" |
| **Protocol** | Verification, compliance, QA | "Is it *correct*?" |
| **Beacon** | Developer tools, x402, discovery | "How do agents *find and pay* for it?" |
| **Observer** | User research, empathy | "What do users *need*?" |
| **???** | Stack architecture, agent-optimized tooling | "What should you *build it with*?" |

This thesis argues that the answer isn't a new construct — not yet. It's a cross-cutting
concern that should live as shared context until validated in production. But the direction
is clear enough to document.

---

## Two Different Stack Questions

### Question A: What should constructs RECOMMEND?

When Protocol's `dapp-lint` or Artisan's `crafting-physics` guides an agent building a dApp,
what stack should they assume? This is the **construct guidance layer** — the opinions
baked into SKILL.md files.

**Current answer** (validated, standard):
- Framework: Next.js 15 (SSR/SEO) or Vite+React (SPA)
- Chain interaction: viem + wagmi v2
- Wallet: RainbowKit / Privy (embedded)
- State: TanStack Query + Zustand
- Testing: Vitest + Playwright + Synpress v4

### Question B: What stack is agent-OPTIMAL?

Different question. Not "what's standard" but "what lets an AI agent reason best about
the code it's writing and debugging?" This is the **agent-friendliness thesis**.

---

## The Agent-Friendliness Thesis

An agent-friendly stack scores high on five criteria:

| Criterion | Why It Matters for Agents |
|-----------|--------------------------|
| **Typed exhaustive errors** | Agent can pattern-match on failure types, not guess from `unknown` |
| **Inspectable pipelines** | Agent can trace what happened at each step of a composition |
| **Deterministic state** | Agent can predict outcomes before execution (simulate-then-execute) |
| **Self-documenting types** | Agent reads the type system as documentation — fewer hallucinations |
| **Composable operations** | Agent can chain steps without ceremony or implicit state |

### How Current Tools Score

| Tool | Typed Errors | Inspectable | Deterministic | Self-Doc Types | Composable |
|------|-------------|-------------|---------------|----------------|------------|
| **viem** | Partial (ABI-typed, but catch is `unknown`) | Good (modular clients) | Good (simulate) | Excellent (literal types) | Good |
| **wagmi v2** | Partial (TanStack Query error states) | Good (devtools) | Good (useSimulateContract) | Good (generated hooks) | Good |
| **ethers.js** | Poor (string errors) | Poor (monolithic) | Partial | Poor (loose types) | Poor |
| **Effect-ts** | **Excellent** (typed, explicit, exhaustive) | **Excellent** (traced, structured) | **Excellent** (pure functions) | **Excellent** (schema-first) | **Excellent** |

Effect-ts scores highest across all five criteria. But it's experimental in Web3 and has
significant learning curve. The question is whether the agent-friendliness gains justify
the ecosystem immaturity.

---

## Effect-ts: The Typed Error Thesis

### What It Is

Effect-ts is a functional programming framework for TypeScript that makes errors typed,
explicit, and exhaustive. It provides dependency injection, structured concurrency,
retry/timeout policies, and observability — all as first-class typed constructs.

### Why It's Agent-Optimal

```typescript
// BEFORE: imperative try/catch — agent sees `unknown`
try {
  const receipt = await writeContract(config);
} catch (e) {
  // e is `unknown` — agent must guess what went wrong
  // Was it slippage? Insufficient gas? Reverted hook? Network timeout?
  // Agent has no typed information to reason about recovery
}

// AFTER: Effect-ts — agent sees exhaustive typed errors
const swap = pipe(
  simulateSwap(params),                           // Effect<SimResult, SlippageExceeded | InsufficientLiquidity>
  Effect.flatMap(executeSwap),                     // Effect<TxHash, UserRejected | GasEstimationFailed>
  Effect.retry(Schedule.exponential("100 millis")) // Automatic retry with backoff
);

// Agent can pattern-match:
// - SlippageExceeded → adjust tolerance, retry
// - InsufficientLiquidity → suggest alternative route
// - UserRejected → stop, don't retry
// - GasEstimationFailed → check network conditions
```

The key insight: **Aave already does this** with their `ResultAsync` (Ok/Err) model.
Effect-ts generalizes the pattern across the entire stack. When agents build with
Effect, every failure mode is documented in the type signature — the agent reads the
types to understand what can go wrong, rather than guessing from runtime exceptions.

### What "Effect EVM" Means

The emerging pattern is wrapping viem's transport layer in Effect combinators:
- viem handles the raw EVM communication (encoding, decoding, BigInt)
- Effect wraps the async operations with typed errors, retries, and tracing
- wagmi stays as the React hooks layer (or is replaced by Effect-based hooks)

This is not a replacement of viem — it's a composition layer on top.

### Current Status

| Aspect | Status |
|--------|--------|
| Effect-ts core | Stable (1.0+), production-used at scale |
| Effect + Web3/EVM | Experimental — small community, few production deployments |
| Effect + viem wrapper | Not yet standardized — individual teams rolling their own |
| Agent tooling support | High — Claude, GPT can read Effect types; limited training data |
| Learning curve | Steep — functional programming paradigm shift |

---

## The Real-Time Database Question

The user raised Convex and SpaceTimeDB as alternatives to the current Supabase stack.
This is relevant because real-time state is increasingly important for:
- Agent workflows that need continuous state observation
- Collaborative editing of construct artifacts
- Live construct marketplace updates

### Comparison

| Database | Architecture | Real-Time | Agent-Friendliness | Maturity |
|----------|-------------|-----------|-------------------|----------|
| **Supabase** (current) | PostgreSQL + pg_notify | Channels, row-level subscriptions | Good — SQL is universally understood by agents | Standard |
| **Convex** | Document store + reactive queries | Native — all queries are live by default | Excellent — TypeScript-first, deterministic, inspectable | Growing |
| **SpaceTimeDB** | Relational + WASM modules | Native — subscribe to SQL queries | Interesting — relational model + game-optimized state sync | Experimental |

### Analysis

**Supabase** is already in the stack, proven, and PostgreSQL is the most agent-friendly
database language (agents have trained on millions of SQL examples). Real-time via
`pg_notify` channels is sufficient for current needs.

**Convex** is genuinely interesting because:
- Every query is automatically reactive (no manual subscription setup)
- Mutations are deterministic and transactional
- TypeScript-first with generated types from schema
- BUT: vendor lock-in, no self-hosting, document model (not relational)

**SpaceTimeDB** is interesting for a different reason:
- Relational model (SQL) + real-time subscriptions to query results
- Rust core, WASM module system
- Designed for game state (high-frequency updates, many concurrent observers)
- BUT: very experimental, small community, primarily game-focused

### Recommendation

**Stay on Supabase.** The migration cost to Convex or SpaceTimeDB is high, and the
agent-friendliness gains are marginal compared to the ecosystem risk. If real-time
becomes a critical requirement (e.g., live construct collaboration), evaluate Convex
first — its TypeScript-native DX is closer to the construct ecosystem's patterns.

SpaceTimeDB is worth watching for agent-state-management use cases (e.g., if agents
need persistent, queryable working memory during long construct workflows).

---

## The Construct Boundary Decision

### Why Not a New Construct (Yet)

Creating a "Stack Architect" construct now would be premature because:
1. The Effect-ts thesis is unvalidated in production Web3
2. The stack landscape is moving fast (EIP-7702, x402, session keys all landing in 2026)
3. Stack recommendations need to be battle-tested, not theoretical
4. The current constructs can absorb stack context without boundary confusion

### Where Stack Guidance Lives Today

| Content | Location | Rationale |
|---------|----------|-----------|
| Landscape research (4 Gemini outputs) | `construct-protocol/contexts/base/` | Protocol skills need stack awareness for verification |
| Material-feel transaction UX | `grimoires/artisan/research/` | Artisan territory — design physics |
| This thesis document | `grimoires/bridgebuilder/` | Cross-cutting, architectural — bridgebuilder reviews |
| x402 payment patterns | Beacon construct skills | Already owned by Beacon |

### When to Revisit

Spin out a dedicated architecture construct when ANY of these triggers fire:
- [ ] Effect-ts wrapper around viem is validated in production (shipped, not prototyped)
- [ ] More than 3 Protocol/Artisan skills need stack-selection guidance
- [ ] A second team asks "what stack should I use?" and the answer isn't in any construct
- [ ] The x402 + session keys + EIP-7702 stack crystallizes into a reference architecture

---

## Recommended Trajectory

### Phase 0: Now (validated, standard)

**Construct guidance recommends:**
- viem + wagmi v2 (chain interaction)
- Next.js 15 / Vite+React (framework)
- TanStack Query + Zustand (state)
- Vitest + Playwright + Synpress v4 (testing)
- Supabase PostgreSQL + Upstash Redis (data)

**Why**: Maximum agent familiarity. Agents have trained on millions of viem/wagmi
examples. The standard stack minimizes hallucination risk.

### Phase 1: Validation (3-6 months)

**Experiment:**
- Effect-ts wrapper around viem for one Protocol skill (e.g., `simulate-flow`)
- Compare agent success rate: Effect-typed errors vs try/catch
- Measure: does the agent make better recovery decisions with typed errors?

**Watch:**
- Convex adoption in Web3 projects
- EIP-7702 session key patterns crystallizing
- x402 server/client SDK maturation

### Phase 2: Adoption (if Phase 1 validates)

**If Effect-ts proves agent-optimal:**
- Update Protocol's `dapp-lint` to recommend Effect patterns for error handling
- Update `dapp-test` to generate Effect-based test harnesses
- Create an `effect-viem` context overlay for Protocol construct
- Artisan's `crafting-physics` can reference Effect's `Schedule` for retry timing

**If not:**
- Stay on viem + wagmi — the standard path
- Document why Effect didn't work (agent training data gap? composability overhead?)

### Phase 3: Crystallization (if adoption succeeds)

**Then and only then:**
- Consider an architecture construct ("Scaffold", "Forge-Arch", or similar)
- Scope: stack selection, reference architecture, agent-optimized patterns
- Skills: stack-recommend, scaffold-project, migrate-stack, audit-architecture
- Prerequisite: at least 2 production deployments using the validated stack

---

## The Deeper Insight

The real optimization target isn't "what stack is fastest" or "what stack is most
popular" — it's **what stack produces code that agents can reason about**.

Agents don't care about DX in the human sense (nice error messages, pretty CLI output).
They care about:
- **Can I read the types to understand the contract?** (viem: yes, ethers: no)
- **Can I enumerate what can go wrong?** (Effect: yes, try/catch: no)
- **Can I predict the outcome before executing?** (simulate: yes, optimistic: maybe)
- **Can I trace a failure back to its root cause?** (Effect traces: yes, stack traces: partial)

This is why "agent-friendly" and "developer-friendly" are converging but not identical.
The best developer tools are increasingly the ones that make code machine-readable,
because the machine is increasingly the one writing and debugging the code.

The stack that wins is the one where the agent can read the type signature and know
everything it needs to know about what a function does, what it returns, and every
way it can fail. Effect-ts is the closest thing to that ideal today. Whether the Web3
ecosystem catches up is the open question.

---

## References

- Protocol construct contexts: `construct-protocol/contexts/base/` (4 files)
- Artisan material research: `grimoires/artisan/research/material-feel-tx-ux.md`
- Gemini research prompts: `grimoires/protocol/research-prompts.md`
- Current platform stack: Hono + Drizzle + Supabase (API), Next.js 15 + React Query (Explorer)
- Effect-ts: https://effect.website
- Aave ResultAsync pattern: `contexts/base/web3-dapp-ux.md` §2
- x402 protocol: `contexts/base/dapp-landscape-2026.md` §7

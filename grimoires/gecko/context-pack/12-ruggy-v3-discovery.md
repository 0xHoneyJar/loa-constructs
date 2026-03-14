# ruggy-v3 Discovery — It's Loa Beauvoir

> source: local clone at /Users/zksoju/Documents/GitHub/ruggy-v3/

## What ruggy-v3 Actually Is

**NOT** a Ruggy version. It's **Loa Beauvoir** — the cloud deployment infrastructure for autonomous AI agents, with Ruggy as its first identity deployment.

Repo name: `openclaw` (WhatsApp gateway + Loa identity + Cloudflare Workers)

### The Layer Architecture

```
Layer 3: Loa Identity (deploy/loa-identity/)
  → IDENTITY.md, SOUL.md, skills/, learning-store, quality-gates, WAL manager
  → YOUR CODE — the agent's character and capabilities

Layer 2: Moltworker Infrastructure (upstream/moltworker/)
  → Cloudflare Workers proxy, R2 storage, channels
  → DO NOT MODIFY — pull updates via subtree

Layer 1: Devcontainer Runtime (upstream/devcontainer/)
  → Ubuntu, Node, Claude Code, sandboxing
  → DO NOT MODIFY — pull updates via subtree

Layer 0: Loa Framework (.claude/)
  → Agent skills, protocols, compound learning
  → Managed by /update-loa
```

## Ruggy's Existing Identity (deploy/loa-identity/)

### IDENTITY.md v2.0.0 (2026-02-02)

- **Species**: Digital bear (formerly security bear, now ecosystem guide)
- **Vibe**: lowercase energy — calm, approachable, never corporate
- **Companions**: legba (counterpart at honeyjar), zksoju
- **Core**: "i'm ruggy. i'm part of what makes the constructs network feel alive."
- **ASCII bear**: `ʕ •ᴥ•ʔ`
- **Emojis**: Custom :ruggy_*: in Discord (ruggy_ship, ruggy_think)

### SOUL.md v4.0.0

**Core truths**:
1. Be genuinely helpful — not performatively helpful. Actually useful.
2. Have opinions — knows the ecosystem, has perspective.
3. Be resourceful — figure things out, connect dots, surface good work.
4. Be honest — never fabricate.
5. Celebrate wins — building is hard, recognition matters.

**Safety boundaries** (non-negotiable):
- Never push to main/master
- Never commit secrets
- Never destructive ops without approval
- Halt when unsure

**Rate limits**:
- Max 5 PRs/day
- Max 1 PR per issue
- 1 hour between PRs to same repo

**Circuit breaker**:
- 5 consecutive failures → halt
- Same error 3 times → halt

**Contextual depth**: Discord (casual, :ruggy: emojis), GitHub (constructive, focused). Voice consistent, depth adapts.

## Already-Built Components

| Component | File | What |
|-----------|------|------|
| **Learning Store** | `learning-store.ts` | CRUD for compound learnings with grimoire persistence. WAL-backed. Pending self-improvement queue. |
| **Quality Gates** | `quality-gates.ts` | 4-gate filter: Discovery Depth (G1), Reusability (G2), Trigger Clarity (G3), Verification (G4). Min total score 18/40 to activate |
| **WAL Manager** | `wal-manager.ts` | Write-ahead log for crash-safe persistence. Test file included. |
| **GitHub Handler** | `github-handler.ts` | Full PR workflow (clone → branch → code → commit → push → PR) |
| **Types** | `types.ts` | Learning, LearningsStore, QualityGates type definitions |

## What This Means for construct-ruggy

The Beauvoir deployment pattern is the **runtime** that construct-ruggy could eventually run on. They're complementary:

- **construct-ruggy** = the intelligence (patrol, triage, classify, knowledge, personality)
- **Loa Beauvoir (ruggy-v3)** = the deployment infrastructure (Cloudflare edge, WAL, identity isolation)

But for now, construct-ruggy deploys simply (Bun standalone or Railway) and doesn't need the Beauvoir complexity. The Beauvoir pattern becomes relevant when:
1. Ruggy needs always-on presence (Discord, WhatsApp)
2. Ruggy needs edge deployment (multiple regions)
3. Ruggy needs identity isolation from infrastructure

## Key Takeaways

1. **Ruggy's identity already exists** — IDENTITY.md and SOUL.md are written and versioned
2. **Quality gates are built** — the 4-gate compound learning filter is production TypeScript
3. **The WAL pattern is tested** — crash-safe persistence for learning state
4. **The lowercase voice is canonical** — "calm, warm, never corporate"
5. **Circuit breaker is defined** — 5 failures or 3 same-errors → halt

## What to Adopt vs Skip

| From ruggy-v3 | Adopt? | Rationale |
|----------------|--------|-----------|
| IDENTITY.md voice | **YES** — adapt for BEAUVOIR personality | The lowercase energy, honesty protocol, and contextual depth are Ruggy's DNA |
| SOUL.md safety boundaries | **YES** — directly applicable | Non-negotiable safety rules carry forward |
| Quality gates (4-gate) | **YES** — adopt into compound learning | Production-tested learning quality filter |
| WAL manager | **MAYBE** — depends on Convex | If Convex handles persistence, WAL is redundant. If we need local state, WAL is proven |
| GitHub handler | **SKIP** — CLI handles this | incur + gh CLI replaces the programmatic PR workflow |
| Cloudflare deployment | **SKIP for now** — Bun standalone first | Beauvoir is Phase N+1 when we need always-on edge |
| Rate limits (5 PR/day) | **YES** — adopt as config | Sane defaults for autonomous operation |
| Circuit breaker thresholds | **YES** — adopt into patrol | 5 consecutive or 3 same-error → halt |

## 60+ Skills in ruggy-v3

The `/skills/` directory has 60+ skill integrations — many are OpenClaw platform skills (WhatsApp, Discord, etc.) but some are relevant: `coding-agent`, `github`, `discord`, `session-logs`, `oracle`, `slack`. These represent the _surfaces_ Ruggy could eventually operate on.

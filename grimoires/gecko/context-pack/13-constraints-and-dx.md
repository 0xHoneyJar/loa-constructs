# Constraints, UX/DX, and Pragmatic Systems — Blueprint Inputs

> the hard walls and soft preferences that shape construct-ruggy's design.

## Hard Constraints (Non-Negotiable)

### C1: Bun Runtime
Everything runs on Bun. No Node.js, no Deno, no Cloudflare Workers (moltbot pain).
- `bun.lock` is the lockfile
- `bun run`, `bun test`, `bun build`
- Bun's built-in SQLite, HTTP server, test runner available

### C2: Convex as Database + Real-Time
No separate PostgreSQL for Ruggy. Convex IS the database.
- Already deployed: dev (doting-jackal-397), prod (quaint-anaconda-866)
- Tables: signals, signal classifications, incidents, API keys
- Real-time subscriptions for dashboard
- Mutations for state changes (patrol state, sovereignty tier, learning state)
- **Implication**: GovernedResource pattern must adapt to Convex's optimistic concurrency, not PostgreSQL's SELECT FOR UPDATE

### C3: Existing Signals Pipeline
Cycle-044 is deployed and working. Ruggy consumes, not rebuilds.
- Signal ingestion API at api.constructs.network/v1/signals
- Convex functions for query/mutation
- Haiku classification (store-first, classify-later)
- Linear auto-escalation
- Discord alerting
- Per-app API keys (sk_live_...)

### C4: Linear as Issue Bus
Same team ID (466d92ac) as Ruggie v2. Already configured.
- Ruggy starts as a regular Linear account, NOT OAuth agent
- Template-based issue creation (bug: 707cddad, UTC: 5377584f)
- Webhook sync for resolution notifications
- Agent SDK is Phase N+1

### C5: Standalone Construct Repo
`construct-ruggy` following the pattern:
- construct.yaml manifest
- identity/ (persona, BEAUVOIR)
- skills/ (patrol, triage, classify, observe, diagnose, report)
- knowledge/ (sources.json, tagged retrieval)
- cli/ (incur-based)
- Connects to constructs network via signals API

### C6: Karpathy Constraint
"Agents are slop" when they try to do everything.
- ONE thing: ecosystem health triage
- Narrow, well-constrained, measurable
- Ship the triage loop first, everything else is Phase N+1

### C7: Cost Ceiling
~$1/day for 6 repos.
- Haiku ($0.001/op) for classification
- Sonnet ($0.05/op) for investigation
- Opus ($0.50/op) for planning — used rarely
- Budget enforcement: if daily cost > $2, pause non-critical ops

### C8: Trust Boundary
From construct-gecko CLAUDE.md:
- READS: everything (GitHub, Linear, Convex, API logs, construct registry)
- WRITES: only grimoires/gecko/ (observations, patrol state, reports)
- CREATES: Linear issues, Discord alerts (via existing pipeline)
- NEVER: push to main, deploy, modify application code directly

## Soft Constraints (Strong Preferences)

### S1: Lowercase Voice
From ruggy-v3 IDENTITY.md/SOUL.md:
- All lowercase always
- Calm, approachable, never corporate
- Contextual depth: casual on Discord, focused on GitHub
- "be genuinely helpful — not performatively helpful"

### S2: Effect.ts for Structure
User wants Effect.ts, particularly for:
- DAMP personality modeling (typed services, dependency injection)
- CLI service composition
- Error handling with typed errors
- Scope TBD — possibly just personality layer, possibly broader

### S3: Easiest Sovereignty
Binary or simple three-tier:
- **Constrained**: observe and classify only, human reviews all actions
- **Standard**: can triage and create LOW/MEDIUM issues
- **Autonomous**: full patrol, any severity, circuit breaker active
- Promotion: manual (admin sets tier), NOT earned-reputation
- Circuit breaker: 5 consecutive failures or 3 same-error → halt

### S4: CLI for Agent Self-Invocation
Primary consumer of the CLI is Ruggy itself, not humans.
- `ruggy patrol --depth standard`
- `ruggy signals classify --unclassified`
- `ruggy issues create --from-signal SIG-123`
- Humans use: dashboard (/signals), Linear UI, Discord
- MCP bridge for Claude Code context injection

## Current Systems Map

### What's Running

| System | Where | URL | Ruggy Interaction |
|--------|-------|-----|-------------------|
| API | Railway | api.constructs.network | HTTP calls (signals, constructs) |
| Explorer | Vercel | constructs.network | Dashboard display only |
| Database | Supabase | pooled connection | Read-only (via API) |
| Convex (dev) | Convex Cloud | doting-jackal-397 | Direct mutations (signals, patrol state) |
| Convex (prod) | Convex Cloud | quaint-anaconda-866 | Direct mutations (signals, patrol state) |
| Linear | Linear Cloud | linear.app | REST/GraphQL (issues, sync) |
| Discord | Discord API | webhook URL | Alerts via webhook (existing pipeline) |
| GitHub | GitHub API | gh CLI | Read-only (PRs, repos, commits) |

### What's Cloned Locally (Ruggy-Relevant)

| Repo | What | Status |
|------|------|--------|
| construct-gecko | Karpathy-loop patrol prototype | Replace with construct-ruggy |
| ruggy-v3 (Loa Beauvoir) | Cloud deployment infra for Ruggy | Phase N+1 — skip for now |
| ruggy-v2 | Most mature Ruggie (disabled) | DNA extraction complete (01-ruggie-lineage.md) |
| loa-dixie | Governed BFF with autonomous engine | Patterns adopted, not dependency |

### API Keys Available

| Key | Where | Purpose |
|-----|-------|---------|
| ANTHROPIC_API_KEY | env | Claude models (Haiku/Sonnet/Opus) |
| LINEAR_API_KEY | env | Linear GraphQL/REST |
| GITHUB_TOKEN | gh CLI | GitHub API (repos, PRs, issues) |
| SIGNALS_API_KEY | Convex + Railway | sk_live_7df1... — signal ingestion |
| CONVEX_URL | env | Convex deployment URL |
| CONVEX_DEPLOY_KEY | env | Convex admin operations |

## DX: How Ruggy Gets Built

### Development Loop
```
construct-ruggy/
├── bun install
├── bun run dev          # starts CLI in dev mode
├── bun run patrol       # runs one patrol cycle locally
├── bun test             # vitest or bun:test
└── bun run deploy       # push to Railway or Bun standalone
```

### Testing Strategy
- **Unit**: Bun test runner for classifiers, state machines, knowledge retrieval
- **Integration**: Real Convex (dev deployment) + real Linear (test project)
- **E2E**: Same as cycle-044 — ingestion → classification → escalation → issue creation
- **No mocks for external services** — test against real APIs in dev mode

### Iteration Cadence
- Phase 0 (knowledge): 1-2 days — no code, just markdown/YAML
- Phase 1 (CLI): 3-5 days — incur commands, middleware, basic patrol
- Phase 2 (patrol loop): 3-5 days — state machine, classification, circuit breaker
- Phase 3 (compound learning): ongoing — feedback → pattern → skill extraction

## UX: How Humans Experience Ruggy

### Dashboard (/dashboard/signals)
Already built. Shows:
- Signal inbox with severity/category
- Triage interface
- Analytics (volume, classification accuracy, escalation rate)
- Ruggy's patrol activity (new: patrol state, sovereignty tier, health score)

### Linear
Ruggy creates issues using existing templates. Humans see:
- Issues tagged with `ruggy-triage` label
- Signal source linked in issue description
- Classification confidence in metadata
- Ruggy's reasoning in comments (if sovereignty tier allows)

### Discord
Existing alert pipeline. Humans see:
- CRITICAL signal alerts in #alerts channel
- Patrol summary in #ops channel (new)
- Weekly health digest (new, Phase N+1)

### CLI (for power users / debugging)
```
ruggy status                    # health score, sovereignty tier, patrol state
ruggy signals list --recent     # last N signals with classification
ruggy patrol --dry-run          # preview patrol without acting
ruggy patrol --force            # run patrol now (ignores schedule)
ruggy knowledge refresh         # re-fetch knowledge sources
```

## Anti-Patterns to Avoid

| Anti-Pattern | Why | Instead |
|--------------|-----|---------|
| Building the Beauvoir deployment first | Premature infrastructure. Bun standalone is fine. | Deploy simply, add edge later |
| Implementing Linear Agent SDK now | Registration, OAuth, webhooks — complexity without users | Use regular Linear account |
| Building custom MCP server | incur auto-generates one. Don't build twice | Use incur's built-in MCP |
| Trying to patrol all 60 repos | Karpathy constraint. Start with 5 priority product repos | mibera-*, mcv, cubquests, set-and-forgetti, apdao |
| Earned-reputation sovereignty | Complex system with no users to observe | Binary: constrained or autonomous, manual promotion |
| Effect.ts everywhere | Steep learning curve, small team | Start with personality layer, expand if it works |
| PostgreSQL for patrol state | Different infra from signals pipeline | Convex for everything |
| Autonomous patrol before triage works | No point patrolling if you can't triage what you find | Triage loop first (Observer workflow), patrol second |
| Onchain observability in week 1 | Score API integration adds complexity to an already-scoped week | Phase 2 — after triage loop is proven |

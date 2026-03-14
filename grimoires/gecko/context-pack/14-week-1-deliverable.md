# Week 1 Deliverable — Ruggy Goes Live

> the bear opens for business. five stalls to watch, one pipeline to feed, one team channel to report to.

## What "Live" Means

Ruggy is running. Not as a concept, not as a context pack — as a process that:
1. **Ingests feedback** from 5 product repos via the signals API
2. **Classifies** each signal as bug or UTC (user-to-creator) using Haiku
3. **Labels** with severity, category, and source repo
4. **Creates Linear issues** from classified signals using Observer's existing workflow
5. **Reports** ecosystem state via Discord commands connected to the cycle-044 pipeline

That's it. No autonomous patrol. No sovereignty engine. No compound learning. One loop, working, measurable.

## The Five Stalls

| Priority | Repo | Why First | Widget Complexity |
|----------|------|-----------|-------------------|
| 1 | mibera-dimensions | Active Mibera product, paired with honeyroad | Standard feedback widget |
| 1 | mibera-honeyroad | Active Mibera product, paired with dimensions | Standard feedback widget |
| 2 | mcv-interface | Most mature (92 sprints), highest signal density expected | Standard feedback widget |
| 3 | cubquests-interface | Active product | Standard feedback widget |
| 4 | set-and-forgetti | Gold standard dApp — if the widget works here, it works everywhere | Standard feedback widget |
| 5 | apdao-auction-house | Origin repo, has scars | Standard feedback widget |

### What Each Repo Gets

1. **Feedback widget** — same component from explorer, adapted per repo
2. **API key** — per-app `sk_live_...` synced to Convex (same pattern as cycle-044)
3. **Signal routing** — signals tagged with `app_slug` for per-repo filtering

### Widget Integration

The feedback widget already exists in the explorer layout. For product repos:
- Install as a component (copy or package)
- Configure with repo-specific API key
- Point at `api.constructs.network/v1/signals`
- Each repo's signals land in the same Convex signal store, tagged by source

## The Observer Workflow

This is the established pattern. Ruggy follows it, doesn't reinvent it.

```
User feedback (widget)
     │
     ▼
signals API (api.constructs.network/v1/signals)
     │
     ▼
Convex signal store (dedup, store-first)
     │
     ▼
Haiku classification (async)
  ├── bug → severity + category labels
  └── UTC (user-to-creator) → severity + category labels
     │
     ▼
Linear issue creation
  ├── bug template (707cddad)
  └── UTC template (5377584f)
  └── labels: [app_slug, severity, category]
     │
     ▼
Discord alert (CRITICAL/HIGH only)
```

### Classification Categories

From Observer's taxonomy:
- **Bug**: crash, regression, broken feature, data issue
- **UTC**: feature request, UX friction, performance complaint, confusion, praise

### Labelling

Each Linear issue gets:
- **Source label**: `mibera-dimensions`, `mcv-interface`, etc.
- **Severity**: critical, high, medium, low
- **Category**: bug subcategory or UTC subcategory
- **Created by**: Ruggy (the Linear account)

## Discord Commands

Connected to the signals pipeline infrastructure from cycle-044.

| Command | What It Shows |
|---------|---------------|
| `/ruggy status` | Health score, signal volume (24h/7d), active incidents, pipeline state |
| `/ruggy signals [repo]` | Recent signals for a repo, with classification |
| `/ruggy escalations` | Open Linear issues created from signals |
| `/ruggy repos` | All monitored repos with signal counts |

### Implementation

Discord bot or slash commands via webhook. Queries Convex directly for real-time data. No separate API needed — Convex functions serve the data.

## Dixie Integration for Week 1 — REFRAMED

**Fork, not patterns.** Ruggy IS a Dixie deployment. See `15-reframe-dixie-as-template.md`.

| What We Get From the Fork | Week 1 Usage |
|---------------------------|-------------|
| **Autonomous engine** (7-step permission) | Start in constrained tier. The engine is there — we just don't unlock it yet. |
| **Knowledge system** (sources.json) | Replace with Ruggy's corpus: product repo inventory, signal taxonomy, construct registry, Linear config |
| **Compound learning** pipeline | Wired but passive. Starts accumulating data from classified signals. |
| **State machines** | Use for patrol state (idle → observing → classifying → triaging → idle) |
| **15-layer middleware** | Leave as-is. Add Ruggy routes alongside existing modules. |
| **Cheval** (multi-model routing) | Budget enforcement + model fallback already built. Wire Haiku/Sonnet/Opus tiers through it. |
| **BEAUVOIR personality** | Replace `persona/oracle.md` with `persona/ruggy.md` (hand-crafted from IDENTITY.md + SOUL.md + GECKO.md) |
| **Circuit breaker** | 5 consecutive failures → halt, 3 same-error → halt (from SOUL.md, already in Dixie's pattern) |
| **2,431 tests** | Run them. Fix what breaks from our changes. The safety net. |

What we configure down in week 1:
- Fleet governor — single agent, no spawning
- Meeting geometries — solo operation
- Sovereignty engine — constrained tier, override rate tracking begins

## Success Metrics (Week 1) — Real, Not Vanity

See `16-real-metrics.md` for the full philosophy. Week 1 focuses on proving the pipeline works end-to-end. The metrics that matter start accruing from day 1:

| Metric | Week 1 Target | Why It Matters |
|--------|---------------|----------------|
| **Time to Awareness (TTA)** | Establish baseline — measure from first real signal | This is THE metric. If we can't measure it yet, that's the first thing to fix. |
| **Human Override Rate** | <50% (week 1 is learning) | Every override teaches Ruggy. High rate is expected initially. Trend matters, not absolute. |
| **Signal-to-Action Ratio** | >0 actions from real signals | One real bug surfaced and fixed proves more than 100 classifications. |
| **Cost per day** | <$2/day | Economic constraint. At $1/day with 6 repos, we're at ~$0.17/repo/day. |
| **Coverage gaps (post-hoc)** | Log any incident Ruggy missed | Start building the blind spot inventory from day 1. |

**What we explicitly don't track in week 1**: total signal volume, widget install count, Discord command usage, uptime percentage, classification speed.

## What This Sets Up

Week 1 gives us the **triage loop**. Everything after builds on it:

- **Week 2-3**: Patrol loop — Ruggy checks health proactively, not just reactively from feedback
- **Phase 2**: Onchain observability via Score API — transaction patterns, contract health, governance
- **Phase 2+**: Compound learning — patterns from classified signals improve future classification
- **Phase N+1**: Cross-signal correlation — "3 repos reporting auth failures at the same time" → incident grouping
- **Phase N+1**: Linear Agent SDK — Ruggy becomes a first-class team member, receives delegated issues
- **Phase N+1**: Beauvoir deployment — always-on edge presence via Cloudflare Workers

## Technical Breakdown — Dixie Fork

### Repo: ruggy-dixie (or loa-dixie fork under 0xHoneyJar)

```
loa-dixie/ (forked)
├── persona/
│   └── ruggy.md              # BEAUVOIR: bazaar trader, lowercase energy ← REPLACE oracle.md
├── knowledge/
│   ├── ruggy-binding.yaml    # agent_id, persona path, model config ← REPLACE oracle-binding.yaml
│   ├── sources.json          # Ruggy's 10-15 knowledge sources ← REPLACE
│   ├── sources/
│   │   ├── product-repos.md       # the 5 monitored repos + context
│   │   ├── signal-taxonomy.md     # classification categories + routing rules
│   │   ├── linear-config.md       # team ID, templates, label taxonomy
│   │   ├── construct-registry.md  # 14 constructs, their health signals
│   │   ├── observer-workflow.md   # feedback → UTC/bug → triage → label → issue
│   │   └── ecosystem-map.md       # org repos, infrastructure, who maintains what
│   └── contracts/
│       └── ruggy-requirements.json # consumer contract ← REPLACE oracle-requirements.json
├── app/src/routes/
│   ├── signals.ts            # NEW: signal triage routes (Convex bridge)
│   ├── patrol.ts             # NEW: health patrol routes
│   ├── discord.ts            # NEW: Discord slash command handler
│   └── (existing Dixie routes — leave working)
├── app/src/services/
│   ├── autonomous-engine.ts  # EXISTING — 7-step permission (use as-is)
│   ├── compound-learning.ts  # EXISTING — wire to signal classifications
│   ├── state-machine.ts      # EXISTING — add patrol state machine
│   ├── fleet-governor.ts     # EXISTING — single agent, constrained
│   └── signal-classifier.ts  # NEW: Haiku classification service
├── deploy/
│   ├── Dockerfile            # EXISTING — may need Bun migration later
│   └── docker-compose.yml    # EXISTING — works for local dev
└── (all existing Dixie infrastructure)
```

### Sequence: What Gets Built When

1. **Day 1**: Fork loa-dixie. Replace persona + knowledge + binding. Run test suite — fix what breaks.
2. **Day 2**: Add signal triage route (Convex bridge). Wire Haiku classifier through cheval multi-model routing.
3. **Day 3**: Add Linear issue creation from classified signals (Observer workflow). Wire to existing templates.
4. **Day 3**: Malleable widget logic — PRs inserting signal POST into existing feedback UI in 5 product repos.
5. **Day 4**: Discord hybrid — webhook alerts for CRITICAL/HIGH + slash command bot for status/signals/escalations.
6. **Day 5**: Integration testing — end-to-end: widget → signal → classify → Linear issue → Discord alert.
7. **Day 5**: Deploy (Docker on Railway, or wherever most convenient). Start measuring TTA and override rate.

# Cycle-008 · L-ground · Freeside Baseline Capture

> AC-G.1–G.3 per `cycle-008-SEED-freeside-pilot.md` §3
> **Leg**: L-ground · inputs + baseline capture
> **Status**: Part 1-2-4 ported; Part 3 (UI baseline) awaiting operator screenshots; Part 5 pending Part 3
> **Authored**: 2026-04-24 (paired, design-studio-workflow refinement session)

---

## 0 · Why L-ground exists

Composition A (strategic-analysis) consumes three kinds of input:

1. **User observation** — Eileen #608's Account Analysis System content + day-to-day CM context
2. **Positioning signal** — ES/zerker recent_convo's premium-BI framing
3. **Current-state grounding** — what freeside IS today (screenshots + component inventory)

These can't be inferred by LILY/BEEKEEPER/k-hole — they must be loaded from sources. L-ground is the pre-composition packaging step. Everything downstream reads from what this leg emits.

Also establishes the **dependency-check** on cycle-008 P1#1 (root-app-migration) — this pilot proceeds in parallel since analysis + mockup emission don't depend on sprawl-world monorepo stability.

---

## 1 · User-picture synthesis (from loa#608 + recent_convo)

### 1.1 · Three tiers, four roles

| Layer | Role | Day-shape | Mental model | "Win" looks like |
|---|---|---|---|---|
| 🧑‍💼 **L1** | Community Manager (CM) for a web3 team | Manual cross-check, DM triage, data pulls, perk negotiation | NOT AI-native. *"Ask it anything"* = friction, not feature | Concrete insight CM can paste to exec: *"15% of diamond holders participated in xyz"* |
| 🕸️ **L1.5** | CM's team (5 mods/regional leads) | Tiered-access, SaaS role-reality | Already familiar with Notion/Discord role tiers | Scoped view of their region/responsibility, nothing more |
| 🏛️ **L2** | Executive / Decision-Maker | Once-a-quarter tool-switch debates | Risk-averse; needs defensible wins; learning curves = blockers | Report proving freeside paid for itself vs incumbent |
| 🧑‍🔬 **L3** | THJ-internal Analyst (Eileen #608 use-case #1) | Bizdev/partnership ops running account analysis | Knows SWOT/Porter/PESTLE as vocabulary | Decision-ready account intelligence handoff |

The load-bearing insight: **same SaaS UI serves L1+L1.5+L3 at different privilege tiers**, with L2 as the downstream consumer of artifacts L1 produces from the tool.

NOT "build a dashboard." **Build a framework-rendering system where each tier sees the subset-of-evidence their role can act on, and the UI of each tier is shaped by what that tier can defend upward.**

### 1.2 · User-truth — four named items (candidate-watch)

| Name | Claim | Source |
|---|---|---|
| 📑 **deliverable-not-interface** | L1's real value to exec = *report they can paste*, not *dashboard they explored*. Chat interface IS the anti-pattern Eileen names: *"'ask it anything' creates a problem where they need to think about it."* | operator Q2 2026-04-24 + #608 + recent_convo |
| 🪜 **staircase-growth-acceptance** | Web3 end users are staircase in growth — *"cycling through nothing happening in a long time and everything happens in a short period of time."* Stablecoins → 5 years of talk → Arthur Hayes podcast → Guy Young → Ethena. Means BI vectors CAN'T be macro-cycle-indexed. Design must accept long-quiet + burst-loud. | Eileen #608 §3 |
| 🤝 **informal-influence-is-web3-primary** | In web3, ecosystem support (foundation, labs, funding, technical cosign) gatekeeps more than formal hierarchy. **Relationship Map > Org Chart** — specifically in web3 (vs traditional enterprise where both are co-primary). | Eileen #608 §7 |
| 📣 **perks-are-retention-currency** | CM's constant KPI: securing perks from OTHER communities. Freeside producing report → CM sends → other community negotiates back → CM looks competent to exec. This is the REAL retention loop (not shadow-mode-vs-incumbent). | recent_convo (ES 4:11-4:16) |

All four flagged as doctrine candidates (second-instance-earns-promotion per [[naming-is-diagnostic]]); no pages written until cycle-009+ instance-2 surfaces.

---

## 2 · Eileen #608 · Architectural prior-art (NOT user-research-feed)

### 2.1 · Load-bearing rules (verbatim, the opening paragraphs)

These are constraints on HOW compositions A and C1 must be authored:

| Rule | Implication for cycle-008 |
|---|---|
| *"Business analysis and strategy frameworks must not be co-generated with product or product-feature design in the same synthesis pass."* | **Composition A and Composition C1 MUST be separate compositions** — this IS the A `<>` C1 split. |
| *"They should run independently and in parallel against a shared, fixed brief."* | Lens stages within A (SWOT/Porter/PESTLE/Relationship-Map) run in parallel against shared evidence (see §2.3). |
| *"Each framework must produce a bounded output containing key findings, implications, risks, open questions, and recommended actions."* | **DecisionArtifact schema** — these fields are the typed handoff structure per AC-CF.2. |
| *"Framework outputs should then be converged into a single decision artifact."* | Stage 8 of Composition A = convergence — single artifact emitted, not raw lens outputs. |
| *"Only that decision artifact should be used as input to the product or product-feature workflow."* | Composition C1 consumes DecisionArtifact only; does NOT consume raw lens outputs (prevents branching alternatives). |
| *"Do not feed raw framework explorations directly into implementation generation — creates branching alternatives, recursive derivative outputs, and loss of decision clarity."* | The antipattern. Cycle-008 SEED §4 invariant explicitly blocks this. |

### 2.2 · Four use-cases from #608 opening

| # | Use-case | Stakeholder | Cycle-008 relevance |
|---|---|---|---|
| 1 | Internal account analysis for THJ prospective customers | THJ bizdev / partnership ops | L3 user; directly proves architecture works at strategic-planning layer |
| 2 | Agents per framework processed as SDD sprint; operator picks which to run | Internal dev / THJ operators | MATCHES our construct-as-stage composition pattern |
| 3 | **Embed in freeside as BI layer for subscribed teams (community managers)** | **L1 user — this is our primary freeside-pilot target** | Directly drives composition C1's output target (what UI L1 consumes) |
| 4 | Plus onchain data analytics (midi / score / freeside hybrid) | L1 users with onchain data needs | Shapes sprawl-integration path post-pilot (cycle-009+) |

### 2.3 · §5.4 Shared-evidence-model recommendation

> *"Build the system around a shared evidence model, then render frameworks as views over that model. [...] Reduces duplicate retrieval, improves cross-framework consistency, supports provenance, makes gaps visible, lowers runtime cost, simplifies auditing."* — loa#608 §5.4

Translated: lens stages (SWOT/Porter/PESTLE/Relationship-Map) in Composition A MUST read the SAME evidence base (Stages 1-3 of composition A: LILY/BEEKEEPER/k-hole outputs). NO per-lens independent retrieval. This is AC-A.2.

**Convergent invention**: Eileen arrived at typed-stream-pipe-doctrine independently. Her "shared evidence model" = our typed-stream trajectory. Her "frameworks as views" = our constructs-as-lenses.

### 2.4 · Web3-specific framing (from #608 §3)

> *"Web3 end users are staircase in growth... Most of the conversations about strategy, direction, requires gradation and does not follow the macro business cycle in the same way other businesses do. Furthermore, there is no consensus on how success is supposed to be measured in open markets."*

> *"Web3 requires the support of the rest of the industry through funding, technical support (foundation, labs, blockchain development support)."*

Informs: Composition A's PESTLE lens must NOT assume macro-business-cycle framing. Relationship-Map lens weighted heavier than Org-Chart for web3 accounts specifically (per user-truth §1.2 #3).

---

## 3 · ES/zerker recent_convo · Positioning summary

### 3.1 · Freeside today vs what it should be

| Today | Should be |
|---|---|
| *"NFT verification but cheaper, connects a few more things"* | **Premium BI for community managers** — actionable insights, not feature-parity |
| Shadowmode = proof-of-work against incumbent | Shadowmode = *trojan horse* for cross-sell funnel |
| Cheaper (can't be 90% cheaper) | Premium with selective discounts |
| AI = *"you can ask it whatever you want"* (creates cognitive load) | AI = *built-in agentic software on backend*; users see surfaced insights, not chat interface |

### 3.2 · The retention funnel (ES 4:05-4:06)

```
invite teams → shadow mode (30 days) → see results
   → cross-sell / up-sell
   → more usage → whitelabel cubquest + other THJ products as addons
```

Freeside = carrier product for broader THJ creation surface. Not standalone SaaS; gateway to ecosystem.

### 3.3 · Team-structure reality (ES 4:08-4:10)

```
Community Manager (1)
  ├── Moderator / Regional Lead (5)
  ├── Moderator / Regional Lead
  └── ...
Exec (watches from above, decides switch)
```

Implications:
- **Tiered-access SaaS roles** (team, admin, owner, etc.) — NOT web3-native wallet-only
- CM does day-to-day; exec makes procurement decision; BOTH must see the tool's value, differently
- The UI has to serve both *"am I efficient at my CM job"* and *"does this prove ROI to my exec"*

### 3.4 · Key canonical example (ES 4:13)

> *"If you can just show teams 15% of your diamond holders participated in xyz — that would be an insight to help them do business right away."*

This is the CANONICAL DELIVERABLE SHAPE. Not a dashboard. A single fact, segment-aware, action-triggering. Every composition-C1 mockup should be testable against: *"could this produce a fact shaped like 15%-of-X-did-Y?"*

---

## 4 · Sprawl-world dependency check (AC-G.2)

### 4.1 · Status of P1#1 (root-app-migration)

Per cycle-007 §12.3: *"Root-app migration (sprawl-world: Rektdrop → `apps/rektdrop/`) — P1. Clean up the Sprawl work and get it ready for my design engineering work."*

**As of 2026-04-24 (cycle-008 open)**: P1#1 not yet dispatched. Sprawl-world root is still hybrid (Rektdrop at root + apps/dashboard + apps/constructs-network). Per cycle-007 §12.3, this P1 is the operator's baseline-prerequisite for design-engineering work.

### 4.2 · Impact on cycle-008 freeside-pilot

| Leg | Blocked by P1#1? |
|---|---|
| L-ground (this leg) | ❌ No — reads external sources (#608, recent_convo, freeside UI screenshots) |
| L-compose-fractal | ❌ No — loa-constructs schema + doc work only |
| L-composition-A | ❌ No — authors composition YAML for strategic-analysis; runs against #608 + recent_convo inputs |
| L-composition-C1 | ❌ No — authors composition YAML for design-mockup; mint gen runs via ChatGPT Image 2.0, not sprawl-world code |
| L-seam-loop | ❌ No — scratchpad + Operator-Model wiring in `.run/compose/`; no sprawl-world touch |
| L-pilot-run | ❌ No — emits analysis + mockup artifacts; doesn't integrate into sprawl-world app code |
| L-close | ❌ No — findings + KANSEI |
| **D1 (cycle-009+)** | ✅ **Yes** — design-engineering fill into real shadcn-svelte components REQUIRES sprawl-world monorepo stable |

**Conclusion**: cycle-008 pilot proceeds; cycle-009+ D1 is the stage that gates on P1#1 completion.

### 4.3 · Parallel track awareness

- **P1#1 root-app-migration**: separate SEED (not this one); operator may dispatch in parallel
- **P1#2 constructs-network-sync**: separate SEED; webhook + cron; parallel
- **P1#3 freeside-pilot**: THIS SEED

If operator dispatches P1#1 in parallel this cycle, cycle-009 D1 becomes dispatchable immediately; otherwise D1 waits.

---

## 5 · Current freeside UI baseline (AC-G.1 continuation) — ⏳ AWAITING OPERATOR

**Status**: TODO. Operator input needed before this leg closes.

### 5.1 · Inputs required from operator

| Item | Shape | Purpose |
|---|---|---|
| 🔗 Freeside URL(s) | dashboard URL + auth-gated deep-link URLs if relevant | so screenshots can be labeled with context-of-view |
| 🖼️ Screenshots (3+) | Full-page PNGs; saved to `/tmp/freeside-baseline-YYYYMMDD/` OR attached to conversation | Provides the visual baseline composition C1 iterates against |
| 🧾 Component inventory snippet | Hand-listed 5-15 components the operator eyeballs in the dashboard (e.g. "sidebar nav, metrics card row, activity feed, settings dropdown...") | MVP baseline; cycle-009 automates via playwright or component-scanner |
| 📝 Notes on the operator's mental critique | Free-text: *"what I'd change today"* — hyper-context injection at capture time | Seeds BEEKEEPER's user-observation stage with operator's own PM-lens signal |

### 5.2 · How to proceed

Operator pastes screenshots into conversation OR tells me the path they're saved at. I'll:
- Organize into `.run/compose/freeside-pilot-<run_id>/inputs/baseline/`
- Append the component inventory + operator notes as typed files
- Close L-ground and hand off to L-compose-fractal

Until then, this leg is paused on external input. L-compose-fractal can start in parallel (it's independent of baseline).

### 5.3 · Suggested surfaces to capture (ranked)

Operator may deviate from these — these are defaults based on Eileen #608 + recent_convo context:

1. **Main dashboard after login** (home landing for L1/CM)
2. **Community / members view** (if exists) — most aligned with "15% of diamond holders" use-case
3. **Admin / settings area** (for L2 exec context)
4. **Any existing analytics surface** (chart views, metrics displays)
5. **Empty-state / onboarding** (what a new team sees)

If freeside has a public/unauthenticated surface, capture that too — it's part of the acquisition funnel per recent_convo shadow-mode framing.

---

## 6 · Inputs packaged (AC-G.3) — PENDING §5

Target structure once baseline is captured:

```
.run/compose/freeside-pilot-<run_id>/
└── inputs/
    ├── eileen-608-user-picture.md         ← §1 of this doc
    ├── eileen-608-architectural-prior.md  ← §2 of this doc
    ├── recent-convo-positioning.md        ← §3 of this doc
    ├── sprawl-world-dependency.md         ← §4 of this doc
    └── baseline/
        ├── screenshots/
        │   ├── 001-dashboard-home.png
        │   ├── 002-community-view.png
        │   └── ... (operator-provided)
        ├── component-inventory.md
        └── operator-critique.md
```

Composition A's BEEKEEPER + LILY stages read from `inputs/`. Composition C1's the-easel + mint read baseline/ directly.

`<run_id>` = `freeside-pilot-YYYYMMDD-HHMM` per SEED §9 default #4.

---

## 7 · What L-ground unblocks

| Leg | Can start now (without §5 screenshots)? | Can complete (with §5 screenshots)? |
|---|---|---|
| L-compose-fractal · YAML schema ext + DecisionArtifact row | ✅ Yes | ✅ Yes (doesn't need baseline) |
| L-composition-A · strategic-analysis.yaml authoring | ✅ Yes (authors YAML; runs against #608 + recent_convo only) | N/A — running pilot needs baseline for convergence |
| L-composition-C1 · design-mockup.yaml authoring | ✅ Yes (authors YAML; mint references will reference baseline once it's present) | N/A |
| L-seam-loop · scratchpad + Operator-Model wiring | ✅ Yes | ✅ Yes |
| L-pilot-run · actual execution | ❌ No — requires full baseline | — |
| L-close | ❌ No — requires pilot-run complete | — |

**Conclusion**: legs 2-5 can dispatch in parallel-ish even while waiting on §5. L-pilot-run is the serializing point.

---

## 8 · Handoff

**Next leg**: L-compose-fractal (YAML schema extension + DecisionArtifact typed row + seam-loop trajectory rows)

**Pending operator delivery**: §5 screenshots + component inventory + operator critique notes. When received, this leg closes with the §6 packaging step.

**Pre-doctrine observation**: L-ground is itself an instance of [[builder-touch-imperative]] compliance — the leg exists specifically to bring external signal (users via #608 + recent_convo; current-state via screenshots) into the loop BEFORE any composition authoring begins. Without L-ground, composition A and C1 would be authored from operator-vibe alone — the canonical solo-building failure this cycle explicitly rejects.

---

*L-ground open 2026-04-24. Parts 1, 2, 3, 4 complete. Part 5 awaiting operator input. Parts 6-8 follow Part 5.*

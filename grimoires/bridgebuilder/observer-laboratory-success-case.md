# Observer as Laboratory — Success Case & Verification Bridge

> *"The Laboratory doesn't just test hypotheses. It produces the truth that lets the whole organism adapt."*

**Status**: Active Document
**Author**: Team Bridgebuilder
**Date**: 2026-02-20
**Grounded in**: loa-constructs#131 (Construct Lifecycle RFC), loa#379 (Verification Gradient), ARCHETYPE.md, STRATEGIC-GAP.md, construct-lifecycle-design.md
**Audience**: Technical (Tobias/Echelon), Strategic (pirate ship leadership), Operational (construct maintainers)

---

## 1. Laboratory Function Mapping

The Hivemind OS defines the Laboratory as the function that *produces verified knowledge from raw signals*. It doesn't ship product. It doesn't close deals. It creates the ground truth that every other function depends on — or it creates noise that poisons everything downstream.

Observer is the construct that performs this function for the Constructs Network. Here is how each Laboratory capability maps to Observer's actual implementation:

### 1.1 The Six Laboratory Capabilities

| Hivemind Laboratory Function | Observer Implementation | Current State | Evidence |
|------------------------------|------------------------|---------------|----------|
| **Feedback Forensics** — Collect raw signals from users, strip noise, extract actionable patterns | `observing-users` skill + Level 3 diagnostic protocol. Captures feedback as hypothesis-first User Truth Canvases (UTCs). DM-based collection with structured follow-up. | **Active, partially instrumented.** 163+ provenance records in append-only JSONL. Source fidelity gate exists but block count unmeasured. | `grimoires/loa/context/construct-manifests/construct-observer.json`, Observer field report (#116) |
| **User Truth Canvases** — Structured profiles that represent what users actually experience (not what we think they experience) | UTC schema v2 — each canvas captures user quotes, behavioral signals, satisfaction scores, pain points, and hypotheses. Canvas enrichment pipeline adds cross-reference data. | **16 of 28 target canvases enriched.** Enrichment pipeline functional but coverage incomplete. Auto-canvas creates thin entries (friction point #3 from #116). | STRATEGIC-GAP.md, #116 friction analysis |
| **Quantitative Validation** — Measure whether hypotheses hold against behavioral data | Score API integration — behavioral conviction signals from midi-interface and hub-interface. Planned: cross-reference UTC hypotheses against Score API ground truth. | **Score API exists externally. Integration gap.** No automated hypothesis→measurement loop yet. | construct-lifecycle-design.md §4 |
| **Experiment Proposals** — Turn validated patterns into concrete experiments the Workshop can build | `analyzing-gaps` skill generates gap analysis reports. `filing-gaps` skill creates GitHub/Linear issues with proper taxonomy labels. Signal classification routes findings by severity (HIGH/MEDIUM/LOW). | **Active.** Gap→issue pipeline functional. Signal classification accuracy unmeasured. Gap accuracy (exact user quotes vs. inferred vision) unmeasured. | ARCHETYPE.md §4 metrics framework |
| **Learning Memos** — Distill experiment results into reusable knowledge | `analyzing-feedback` skill detects design preference patterns and auto-contributes to hypothesis ledger. `importing-research` bulk-converts legacy research to UTC format. | **Partially active.** Feedback analysis works. Learning memo format not yet standardized for cross-session consumption. | Skill index.yaml capabilities stanza |
| **Graduation Gauntlet** — Determine when an experiment has produced enough evidence to become a committed feature | Not yet implemented as a formal gate. Observer's own graduation criteria are undefined — this document establishes them. | **Full gap.** This is what Section 4 (Marry/Kiss/Kill) addresses. | This document |

### 1.2 Observer as Nervous System

The Laboratory isn't a room — it's a nervous system. Observer is the sensory apparatus: it receives signals from the edges of the organism (user DMs, support conversations, behavioral data, friction reports), processes them through structured protocols (Level 3 diagnostic, hypothesis-first framing, UTC enrichment), and routes the processed intelligence to the functions that need it.

The routing topology:

```
Raw Signals (DMs, support, behavioral)
        │
        ▼
┌─────────────────────────────────────┐
│          OBSERVER (Laboratory)       │
│                                      │
│  observing-users → Level 3 triage    │
│  analyzing-feedback → pattern detect │
│  analyzing-gaps → reality comparison │
│  filing-gaps → issue generation      │
│  importing-research → UTC conversion │
│  shaping-journeys → journey mapping  │
│                                      │
│  Provenance: append-only JSONL       │
│  Canvases: UTC schema v2             │
│  Classification: HIGH/MEDIUM/LOW     │
└──────────┬──────────────────────────┘
           │
     ┌─────┼─────────────────────┐
     ▼     ▼                     ▼
  Artisan  Beacon              The Mint
  (design  (growth            (asset
  system)  content)           pipeline)
```

**Cross-construct events** are the Laboratory's output synapses. When Observer detects a sentiment reversal, Artisan should know. When Observer identifies a journey pattern, Beacon should surface it. Today these events are conceptual (#109, #116 friction point #4). The success criteria below measure whether these synapses actually fire.

---

## 2. Success Metrics

Seven measurable criteria, each grounded in what Observer actually does today. No aspirational metrics — only things we can instrument against the current codebase and infrastructure.

### 2.1 Provenance Chain Integrity

**What it measures**: Every piece of user intelligence Observer produces can be traced back to its source — who said it, when, in what context, through what collection method.

| Metric | Target | Current State | How to Measure |
|--------|--------|---------------|----------------|
| Hash chain continuity | 100% — no gaps in append-only JSONL | 163+ records, chain intact | `query.sh --verify-chain` (exists in midi-interface Observer tooling) |
| Source attribution rate | 100% of canvases link to a provenance record | Unmeasured | Script: count canvases with valid `provenance_id` / total canvases |
| Tampering detection | Any modification to historical records is flagged | Append-only by convention, not enforced | Requires hash verification on read (not yet implemented) |

**Why this matters for the Laboratory**: Knowledge without provenance is rumor. The Hivemind OS Laboratory produces *verified* knowledge. If Observer can't prove where its intelligence came from, every downstream decision built on that intelligence is ungrounded.

**Echelon mapping**: Provenance integrity is a precondition for BACKTESTED verification tier — you can't backtest what you can't trace.

### 2.2 Source Fidelity Gate Block Count

**What it measures**: How often Observer's quality gates prevent low-fidelity data from entering the system.

| Metric | Target | Current State | How to Measure |
|--------|--------|---------------|----------------|
| Gate block count (monthly) | Baseline needed — first 30 days of measurement establishes normal | **Currently unmeasured.** Gate exists but blocks aren't counted. | Instrument fidelity gate to log rejections to provenance JSONL |
| Block-to-override ratio | <10% overrides (manual bypass of gate) | Unknown | Log gate overrides separately from automated blocks |
| Thin canvas rejection rate | >50% of auto-created canvases flagged for enrichment | Known friction (#116 point #3) | Count auto-canvases below quality threshold / total auto-canvases |

**Why this matters**: A Laboratory that accepts bad data produces bad conclusions. The fidelity gate is Observer's immune system — it should be rejecting noise actively, and we should know how often it fires.

### 2.3 Canvas Enrichment Coverage

**What it measures**: The percentage of User Truth Canvases that have been enriched beyond their initial capture — cross-referenced, hypothesis-linked, behaviorally validated.

| Metric | Target | Current State | How to Measure |
|--------|--------|---------------|----------------|
| Enrichment coverage | 100% of active canvases enriched within 7 days of creation | **16/28 (57%)** | Count canvases with enrichment timestamps / total active canvases |
| Enrichment depth score | Each canvas has 3+ cross-references | Unmeasured | Count cross-reference links per canvas |
| Staleness detection | Canvases older than 30 days without re-enrichment flagged | Staleness not tracked (#116 friction point #7) | Compare `last_enriched_at` against current date |

**Why this matters**: A thin canvas is a half-truth. The enrichment pipeline is what transforms raw observation into usable intelligence. 57% coverage means 43% of Observer's knowledge base is operating on incomplete data.

### 2.4 Growth Loop Closure Rate

**What it measures**: When Observer reaches out to a user for follow-up (DM-based research), how often does the loop actually close?

| Metric | Target | Current State | How to Measure |
|--------|--------|---------------|----------------|
| DM follow-up response rate | >40% within 48 hours | Unmeasured | Count responses / total follow-up DMs sent |
| Response-to-canvas rate | >80% of responses produce canvas updates | Unmeasured | Count canvas updates within 24h of response / total responses |
| Repeat engagement rate | >25% of users engage in 2+ research sessions | Unmeasured | Count unique users with 2+ provenance records / total unique users |

**Why this matters**: The Laboratory's feedback loop is only as strong as its weakest link. If Observer sends follow-up DMs that go unanswered, the growth loop is open — signals enter but never complete the cycle back to validated knowledge.

### 2.5 Gap Accuracy

**What it measures**: When Observer identifies a gap between user expectations and product reality, is that gap grounded in exact user quotes and behavioral evidence — or is it inferred from the team's own vision?

| Metric | Target | Current State | How to Measure |
|--------|--------|---------------|----------------|
| Quote-grounded gap rate | >90% of gaps cite exact user quotes | Unmeasured | Audit gap reports: count gaps with direct quotes / total gaps |
| Behavioral evidence rate | >60% of gaps link to Score API behavioral signal | **0%** — Score API integration gap | Requires Score API integration (see §3) |
| False positive rate | <15% of gaps closed as "not a real gap" | Unmeasured | Track gap→issue→close reason. Count "won't fix" + "not a bug" / total closed |

**Why this matters**: Gap accuracy is the Laboratory's credibility metric. If Observer reports gaps that don't exist, the Workshop builds the wrong things. If Observer misses real gaps, users suffer in silence. The only defense against both failure modes is grounding gaps in verifiable evidence — quotes and behavior, not inference and projection.

### 2.6 Cross-Construct Event Fulfillment

**What it measures**: When Observer emits an event that another construct should consume (Observer → Artisan sentiment data, Observer → Beacon journey pattern), does the consumer actually receive and act on it?

| Metric | Target | Current State | How to Measure |
|--------|--------|---------------|----------------|
| Event emission rate | All classified signals emit cross-construct events | **Conceptual only** — events defined in #109, not implemented | Requires event bus implementation (Cycle C in STRATEGIC-GAP.md) |
| Consumer fulfillment rate | >80% of emitted events consumed within 24h | N/A — no events flowing | Event bus consumer acknowledgment tracking |
| Observer → Artisan handoff success | Sentiment data reaches design system decisions | **0%** — no pipeline exists | Requires Observer↔Artisan integration |

**Why this matters**: A Laboratory that produces intelligence nobody reads is a journal nobody opens. Cross-construct events are the mechanism by which Observer's knowledge actually influences what gets built. Without this, Observer is a standalone research tool — valuable, but not yet a Laboratory in the Hivemind OS sense.

### 2.7 Signal Classification Accuracy

**What it measures**: When Observer classifies a signal as HIGH, MEDIUM, or LOW severity, how often does the classification match the actual impact discovered downstream?

| Metric | Target | Current State | How to Measure |
|--------|--------|---------------|----------------|
| Classification accuracy | >85% agreement with post-hoc severity assessment | Unmeasured | Sample 20 classified signals per month, have human reviewer assess true severity, compute agreement rate |
| HIGH signal action rate | >90% of HIGH signals produce an action within 7 days | Unmeasured | Track HIGH signals → issue creation → resolution |
| Misclassification impact | <5% of LOW signals later revealed as HIGH | Unmeasured | Retrospective audit: count LOW signals that became critical issues |

**Why this matters**: Signal classification is the Laboratory's triage function. If HIGH signals are missed, critical user pain goes unaddressed. If LOW signals are over-promoted, the Workshop wastes cycles on noise. Accuracy here directly determines whether the Hivemind OS organism responds to the right stimuli.

---

## 3. Echelon Verification Bridge

> *How Observer's metrics map to Tobias's Echelon verification infrastructure.*

The Verification Gradient (loa#379) proposes three tiers: **UNVERIFIED → BACKTESTED → PROVEN**. Echelon's Product Theatre templates and VerificationCertificates provide the verification machinery. This section maps Observer's Laboratory metrics to Echelon's requirements.

### 3.1 Ground Truth Sources

Echelon verification requires *ground truth* — data that can be independently verified against observable reality, not self-reported claims.

| Observer Ground Truth | Source | Verification Method | Echelon Requirement |
|----------------------|--------|--------------------|--------------------|
| Provenance records | Append-only JSONL (163+ entries) | Hash chain verification (`query.sh --verify-chain`) | Immutable audit trail — VerificationCertificate can reference specific records by hash |
| User Truth Canvases | UTC schema v2, stored in grimoire state directory | Cross-reference canvas quotes against original DM transcripts | Behavioral ground truth — Product Theatre can validate user claims against Score API |
| Score API behavioral data | External API (midi-interface, hub-interface) | API responses are timestamped and signed | Quantitative ground truth — the objective counterpart to qualitative UTC data |
| Gap analysis reports | Generated by `analyzing-gaps` skill, stored as markdown | Compare gap claims against codebase reality (file:line references) | Grounded Truth compliance — ALWAYS cite `file:line` source references |
| Signal classifications | Stored in provenance JSONL with severity tags | Post-hoc accuracy audit (§2.7) | Triage ground truth — did the classification produce correct prioritization? |
| Cross-construct events | Not yet implemented (§2.6) | Event bus acknowledgment logs | Integration ground truth — did intelligence actually flow between constructs? |

### 3.2 VerificationCertificate Criteria Mapping

A VerificationCertificate for Observer would attest: *"This construct's outputs meet specified accuracy, coverage, and integrity thresholds."*

| Certificate Field | Observer Value | How Computed |
|-------------------|---------------|--------------|
| `construct_slug` | `observer` | Manifest |
| `verification_tier` | UNVERIFIED → BACKTESTED → PROVEN | See §3.3 |
| `provenance_integrity` | `pass` / `fail` | Hash chain verification, zero gaps |
| `canvas_coverage` | `0.57` (16/28) → target `1.0` | Enriched canvases / total canvases |
| `gap_accuracy` | TBD (needs baseline) | Quote-grounded rate from §2.5 |
| `signal_classification_accuracy` | TBD (needs baseline) | Agreement rate from §2.7 |
| `cross_construct_events` | `0.0` (not implemented) → target `0.8` | Fulfillment rate from §2.6 |
| `growth_loop_closure` | TBD (needs baseline) | Response rate from §2.4 |
| `issued_at` | ISO 8601 timestamp | Certificate generation time |
| `valid_until` | 30 days from issuance | Certificates expire to force re-verification |
| `issuer` | `echelon` / `manual-audit` | Who performed the verification |

### 3.3 Verification Tier Progression

What concrete evidence moves Observer from one tier to the next:

#### UNVERIFIED (Current State)

Observer has been deployed and is producing outputs, but no systematic verification has been performed.

**Characteristics at this tier:**
- Provenance chain exists but hash verification not automated
- Canvas enrichment at 57% (below threshold)
- Signal classification accuracy unmeasured
- Cross-construct events not implemented
- Score API not integrated

**Constraint implication**: Per loa#379, UNVERIFIED constructs declaring `review: skip` in their `workflow.gates` are treated as `review: full`. Observer's manifest declares `review: textual` (`construct-observer.json`), so this constraint does not currently block — but it would block a construct that declared `review: skip` without earning the trust to skip it.

#### BACKTESTED (Target: Month 2-3)

Observer's historical outputs have been verified against ground truth retrospectively.

**Requirements to advance:**
- [ ] Provenance hash chain passes automated verification (100% integrity)
- [ ] Canvas enrichment coverage reaches 80%+
- [ ] Gap accuracy baseline established (first 30-day audit complete)
- [ ] Signal classification accuracy baseline established (first 20-sample audit)
- [ ] Score API integration operational (behavioral data accessible)
- [ ] Source fidelity gate instrumented (block count measured for 30+ days)

**What "backtested" means concretely**: Take Observer's last 30 days of outputs. For each gap report, verify the quoted user actually said that. For each signal classification, check if the severity matched what happened. For each canvas, confirm the enrichment data is accurate. Document pass/fail per item. Compute aggregate rates.

#### PROVEN (Target: Month 4-6)

Observer's outputs have been verified in real-time over a sustained period, and the verification itself is automated.

**Requirements to advance:**
- [ ] All BACKTESTED requirements maintained for 90+ consecutive days
- [ ] Cross-construct event fulfillment rate >80%
- [ ] Growth loop closure rate >40%
- [ ] Gap→feature conversion rate >20% (gaps that become shipped features)
- [ ] Signal classification accuracy >85% on rolling 30-day window
- [ ] VerificationCertificate auto-generated monthly by Echelon
- [ ] At least one external consumer (not the Observer maintainer) validates outputs

### 3.4 The Constraint Yielding Gate

This is the bridge between Observer's verification tier and the Loa framework's process compliance:

```
IF construct.verification_tier == UNVERIFIED
AND construct.workflow.gates.review == 'skip'
THEN override to review: full

IF construct.verification_tier == PROVEN
AND construct.workflow.gates declares any value
THEN trust the declaration (construct has earned autonomy)
```

This is already described in loa#379's addendum as the 6 verification checks. Observer is the first test case — it currently declares `review: textual` and `audit: skip`. The textual review is appropriate for a research construct. The audit skip is premature at UNVERIFIED tier, but acceptable at BACKTESTED (the construct produces knowledge, not deployable code).

---

## 4. Marry / Kiss / Kill Criteria

> *When does Observer graduate from experiment to committed feature?*

The Hivemind OS Graduation Gauntlet demands clear criteria for each disposition. These are Observer-specific — other constructs would have different thresholds, but the framework is reusable.

### MARRY — Observer becomes a committed, permanent part of the network

**All of the following must be true:**

| Criterion | Threshold | Rationale |
|-----------|-----------|-----------|
| Verification tier | PROVEN | Trust must be earned through sustained, verified performance |
| Production duration | 3+ months continuous operation | Short-term success can be luck; 3 months reveals systemic reliability |
| Canvas enrichment coverage | >90% | The knowledge base must be comprehensive, not spotty |
| Gap→feature conversion rate | >20% | Observer's outputs must demonstrably influence what gets built |
| Cross-construct event fulfillment | >80% | Observer must be integrated into the nervous system, not isolated |
| Growth loop closure | >40% response rate | The feedback loop must actually close — users engage, knowledge improves |
| External validation | 1+ non-maintainer consumer validates outputs as useful | Usefulness can't be self-assessed |
| Fork drift resolved | midi-interface variant either upstreamed or formally registered as @thj/observer | Lifecycle question from #131 must be answered |

**What "married" means**: Observer gets a permanent place in the recommended construct stack. Its skills are included in first-run onboarding suggestions. Its metrics are part of the network health dashboard. Breaking changes to Observer require the same process as breaking changes to the framework.

### KISS — Observer shows promise but hasn't earned full commitment

**Characteristics of the "kiss" state:**

| Signal | Indicator |
|--------|-----------|
| Verification tier at BACKTESTED | Outputs are historically accurate but not yet continuously verified |
| Canvas coverage improving | Trending from 57% toward 80%+ but not yet there |
| Some gaps converting to features | >5% conversion rate but below 20% threshold |
| Cross-construct events partially working | Events emit but consumer fulfillment below 80% |
| Growth loop partially closed | DMs sent but response rate below 40% |
| Learning is happening | Each research cycle produces genuinely new insights, even if coverage is incomplete |

**What "kiss" means**: Observer stays active. Continued investment is justified. But it doesn't get recommended to new users by default, and its `workflow.gates` declarations are not fully trusted (UNVERIFIED→BACKTESTED constraint yielding still applies for the stricter gates). The construct is producing real learning, and learning compounds — so patience is warranted.

### KILL — Observer should be deprecated or radically rearchitected

**Any one of the following triggers kill consideration:**

| Signal | Indicator | Why It's Terminal |
|--------|-----------|-------------------|
| Provenance chain breaks | Hash verification fails, records lost or tampered | The Laboratory's credibility is destroyed. Without provenance, outputs are rumors. |
| Source fidelity gate never fires | 60+ days of zero blocks | The quality gate is a no-op. Bad data flows freely. The immune system is dead. |
| Canvas enrichment stalls | Coverage stays below 60% for 60+ days despite active use | The knowledge base isn't growing. Observer is collecting without learning. |
| Gap accuracy below 50% | More than half of reported gaps are false positives or inferred rather than quoted | Observer is projecting, not observing. The Laboratory is producing fiction. |
| Zero cross-construct events after implementation | Event bus exists, Observer is connected, but nothing flows for 30+ days | Observer is isolated — a journal nobody opens. Integration failure. |
| Growth loop completely open | <10% DM response rate for 60+ days | Users have disengaged. Observer is talking to itself. |
| Maintainer abandonment | No commits, no enrichment, no research sessions for 60+ days | A construct without a maintainer is a construct without a future. |

**What "kill" means**: Observer is either deprecated (skills archived, users migrated to alternatives) or subjected to a fundamental rearchitecture. The construct-observer repo gets an `ARCHIVED` status in the registry. Existing users receive a migration guide. The provenance records are preserved (knowledge doesn't die with the construct) but no new records are generated.

**Important nuance**: Kill doesn't mean the *idea* of user research tooling is wrong. It means *this particular implementation* failed to produce verified knowledge at the quality level the Laboratory demands. A successor construct could inherit Observer's provenance records and build on the lessons learned.

---

## 5. Tobias Collaboration Spec

> *What Tobias needs to integrate Observer into Echelon's verification infrastructure.*

### 5.1 Access Requirements

| Resource | Location | Access Type | Current Status |
|----------|----------|-------------|----------------|
| **midi-interface Observer** | `github.com/0xHoneyJar/midi-interface` (private) | Read access to `/skills/observer/` (23 skills) | Tobias needs repo invite — request from @janitooor |
| **Provenance records** | `midi-interface:.beads/` or grimoire state directory | Read access to append-only JSONL files (163+ entries) | Same repo access as above |
| **Score API** | `api.constructs.network` or midi-interface API | API key with read scope on behavioral signals | Tobias needs API key — issue from @janitooor |
| **UTC schema v2** | `packages/shared/src/types.ts` (this repo) + Observer-specific extensions in midi-interface | Read access (public repo) + midi-interface (private) | Public types available; Observer extensions need repo access |
| **construct-observer manifest** | `grimoires/loa/context/construct-manifests/construct-observer.json` (this repo) | Read access (public repo) | Available now |
| **Registry Observer** | `apps/sandbox/packs/observer/` (this repo, if it exists) or construct-observer standalone repo | Read access | Verify which repo holds the 6-skill registry version |

### 5.2 Observer's Verification Check Definitions

From loa#379 addendum — the 6 checks Echelon needs to implement for Observer:

| Check | What It Verifies | Input Data | Expected Output |
|-------|-----------------|------------|-----------------|
| **Provenance integrity** | Hash chain is unbroken, no gaps, no tampering | Append-only JSONL file | `pass` / `fail` + gap count if any |
| **Source fidelity** | Quality gate is actively filtering low-quality data | Gate logs (needs instrumentation) | Block count, override count, block rate |
| **Canvas coverage** | Enrichment pipeline is processing canvases comprehensively | Canvas directory listing + enrichment timestamps | Coverage percentage, staleness flags |
| **Gap grounding** | Gap reports cite verifiable evidence (quotes, file:line) | Gap analysis markdown files | Quote-grounded rate, behavioral evidence rate |
| **Signal routing** | Classifications produce correct downstream prioritization | Provenance JSONL severity tags + outcome tracking | Classification accuracy percentage |
| **Loop closure** | Research cycles complete (signal → analysis → action → validation) | DM logs, canvas updates, issue creation timestamps | Closure rate, median cycle time |

### 5.3 Data Format Expectations

**Provenance JSONL schema** (each line is a JSON object):
```jsonc
{
  "id": "uuid",
  "hash": "sha256-of-content",
  "prev_hash": "sha256-of-previous-record",  // chain link
  "timestamp": "ISO-8601",
  "source_type": "dm" | "support" | "behavioral" | "observation",
  "user_id": "anonymized-hash",
  "content_summary": "string",
  "signal_classification": "HIGH" | "MEDIUM" | "LOW",
  "canvas_id": "uuid | null",  // linked UTC canvas
  "collector": "observer-skill-slug"
}
```

**VerificationCertificate output** (what Echelon produces after verification):
```jsonc
{
  "construct_slug": "observer",
  "verification_tier": "UNVERIFIED" | "BACKTESTED" | "PROVEN",
  "checks": {
    "provenance_integrity": { "status": "pass", "details": "163/163 records verified" },
    "source_fidelity": { "status": "needs_baseline", "block_count": null },
    "canvas_coverage": { "status": "partial", "coverage": 0.57 },
    "gap_grounding": { "status": "needs_baseline", "quote_rate": null },
    "signal_routing": { "status": "needs_baseline", "accuracy": null },
    "loop_closure": { "status": "needs_baseline", "closure_rate": null }
  },
  "issued_at": "2026-02-20T00:00:00Z",
  "valid_until": "2026-03-22T00:00:00Z",
  "issuer": "echelon",
  "notes": "Initial assessment. Five of six checks need baseline establishment."
}
```

### 5.4 Collaboration Workflow

The proposed working relationship between Observer maintenance and Echelon verification:

```
Observer Maintainer                    Tobias (Echelon)
       │                                      │
       ├─ Instruments fidelity gate ──────────▶│
       │                                      ├─ Builds verification checks
       │                                      │
       ├─ Provides 30 days of data ──────────▶│
       │                                      ├─ Runs first backtest
       │                                      │
       │◀── VerificationCertificate ───────────┤
       │    (UNVERIFIED → BACKTESTED?)        │
       │                                      │
       ├─ Fixes gaps identified ──────────────▶│
       │                                      ├─ Re-runs verification
       │                                      │
       │◀── Updated Certificate ──────────────┤
       │                                      │
       ├─ 90 days continuous operation ───────▶│
       │                                      ├─ Evaluates for PROVEN
       │                                      │
       │◀── PROVEN Certificate ───────────────┤
       │    (or: feedback on what's missing)   │
```

**Cadence**: Monthly verification runs. Certificate expires after 30 days. Observer maintainer receives structured feedback on each check's pass/fail status with specific remediation guidance.

**Communication channel**: GitHub issues on the relevant repo (midi-interface for the 23-skill variant, construct-observer for the 6-skill registry version). Tag Echelon verification issues with `[echelon]` label.

### 5.5 The Fork Drift Question

Observer exists in two forms — this is the #131 Construct Lifecycle RFC's case study:

| Version | Location | Skills | Status |
|---------|----------|--------|--------|
| **Registry Observer** | construct-observer repo (6 skills) | 6 | Published, stable |
| **midi-interface Observer** | midi-interface repo (23 skills, forked from 6) | 23 (17 added) | Active, diverged |

**For Echelon verification**: Tobias should verify the **midi-interface variant** first — it's the active deployment with real provenance data. The registry version is a subset and will be verified implicitly when the upstream PR lands (8 generic skills proposed for upstream in construct-lifecycle-design.md Sprint 5).

**Resolution path**: Register `@thj/observer` as a scoped variant on the registry. Upstream 8 generic skills to construct-observer v1.1.0. The remaining 15 skills are midi-interface-specific and stay as variant-only.

---

## 6. Implementation Sequence

What needs to happen, in what order, to make this document operational:

### Phase 0: Instrumentation (Week 1-2)
- [ ] Instrument Observer's source fidelity gate to log block/override counts
- [ ] Add enrichment timestamps to all canvases
- [ ] Add `last_enriched_at` field to canvas schema for staleness detection
- [ ] Document current provenance JSONL schema (formalize what exists)
- [ ] Grant Tobias read access to midi-interface repo

### Phase 1: Baseline Establishment (Week 3-6)
- [ ] Run first provenance hash chain verification
- [ ] Conduct first gap accuracy audit (sample 20 gaps, check for direct quotes)
- [ ] Conduct first signal classification accuracy audit (sample 20 signals)
- [ ] Measure DM follow-up response rate for first 30-day window
- [ ] Tobias: build first VerificationCertificate template against Observer data

### Phase 2: Backtest (Week 7-10)
- [ ] Score API integration: connect behavioral data to UTC hypothesis validation
- [ ] Canvas enrichment push: reach 80% coverage
- [ ] Tobias: run full backtest against 30+ days of instrumented data
- [ ] Issue first VerificationCertificate
- [ ] Evaluate: UNVERIFIED → BACKTESTED?

### Phase 3: Continuous Verification (Week 11+)
- [ ] Cross-construct event bus implementation (requires Cycle C from STRATEGIC-GAP.md)
- [ ] Automated monthly VerificationCertificate generation
- [ ] Growth loop closure tracking (DM → response → canvas update pipeline)
- [ ] 90-day sustained operation for PROVEN consideration

---

*"The Laboratory doesn't celebrate hypotheses. It celebrates the moment a hypothesis survives contact with reality. Observer's job is to ensure that moment happens — with provenance, with rigor, with the kind of care that treats every user's experience as ground truth worth verifying."*

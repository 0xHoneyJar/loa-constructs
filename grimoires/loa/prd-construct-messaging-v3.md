# PRD: Construct Messaging Protocol v3

**Version:** 3.0.0-draft
**Status:** Discovery - Research Complete
**Cycle:** cycle-005
**Created:** 2026-01-24
**Updated:** 2026-01-24 (post-research)
**Supersedes:** Melange Protocol v2 (PR #24), Identity & Resolution (cycle-004)

### Decisions Locked
- Staging: Branch-based (`staging/learning-X` in main Loa repo)
- Auto-file thresholds: Conservative (Critical 3+, High 5+, Medium 10+)
- Architecture: **UNIX-aligned pragmatic** (not Gas Town complexity)
- Beads: **Do not adopt** - GitHub Issues is sufficient distributed database

---

## Executive Summary

This PRD defines a unified **Construct Messaging Protocol** that enables:
1. **Inter-Construct Communication** - Structured feedback between AI-powered repos (Melange)
2. **Upstream Learning Flow** - Child Constructs report learnings back to Mother Loa (RFC #48)
3. **Pub/Sub Event Architecture** - Standardized event emission with subscription-based processing

**Core Insight**: Constructs are distributed execution engines that need both **peer-to-peer communication** (Melange) and **hierarchical learning propagation** (upstream feedback). These are two complementary patterns, not competing ones.

---

## 0. Research Synthesis: Beads, Agent Mail, and Cargo Cults

*External research conducted 2026-01-24 to clarify architectural patterns*

### 0.1 Beads Clarified

**Question**: Is beads_rust multiplayer? What is the "beads mail paradigm"?

**Answer**: Beads and Agent Mail are **two separate systems**:

| System | Purpose | Multiplayer? |
|--------|---------|--------------|
| **Beads** (beads_rust) | Task graph state management | Via Git sync (eventual consistency) |
| **MCP Agent Mail** | Actor-model messaging between agents | Local server with inbox/outbox directories |

**Beads Architecture**:
- Local-first JSONL storage (`.beads/beads.jsonl`)
- "Multiplayer" emerges from Git push/pull, not real-time sync
- CRDT-like append-only logs minimize merge conflicts
- Daemon handles debouncing and async git operations

**Agent Mail Architecture**:
- Inbox/Outbox directory topology (`messages/inbox/{AgentID}/`)
- Individual Markdown files per message (collision-proof via UUID)
- Advisory file locking for resource contention
- SQLite hot storage + Git cold storage (audit trail)

### 0.2 The Cargo Cult Warning

The research identified **"Gas Town"** as a cargo cult phenomenon:

> *"bro I spent all weekend in Claude Code"*
> *"nice, what did you build?"*
> *"my setup is crazy, 5 instances, custom hooks everywhere"*
> *"...what are you building?"*
> *"my setup is so optimized"*

**Anti-Pattern**: Obsessing over tooling complexity while shipping nothing.

**Symptoms**:
- Elaborate orchestration frameworks that mimic advanced AI development
- "Meta-game" optimization (configuring the system instead of using it)
- Accepting "lost work" as normal ("vibe coding")

### 0.3 Architectural Decision: Pragmatic over Complex

**Recommendation from research**: Unless building offline-first Git-backed swarms, **do not adopt full Beads/Gas Town complexity**.

| Full Gas Town | Our Pragmatic Approach |
|---------------|------------------------|
| Beads + Agent Mail + Daemon | GitHub Issues + Discord webhooks |
| File reservations via MCP server | Git branch isolation |
| Custom JSONL graph database | GitHub's existing distributed database |
| 30-agent specialized swarms | Human-in-the-loop with AI assist |

**Why GitHub Issues is sufficient**:
- Already a distributed database with API
- Has built-in labels, lifecycle, and notifications
- Universally accessible (no custom tooling)
- Audit trail via issue history

### 0.4 Patterns Worth Extracting

From the research, these patterns add value without cargo cult overhead:

**1. The Filter vs File Pattern** (Gatekeeper)
```
Observation Stream → Triage Agent → [Pass Threshold?] → File Issue
                                  → [Below Threshold?] → Daily Digest / Discard
```

**2. RICE Scoring for Prioritization**
```
Score = (Reach × Impact × Confidence) / Effort
If Score < Threshold: Discard
If Score >= Threshold: File
```

**3. Advisory Locking** (if needed)
- Lock files: `.locks/src_auth.lock`
- Check before editing shared resources
- Enforcement via pre-commit hooks (not required for Phase 1)

**4. Sender-Side Outbox**
- Atomic commit = message sent (already in Melange design)
- Retry/sync is infrastructure concern, not agent concern

### 0.5 UNIX Philosophy Alignment

Our architecture should follow:

| Principle | Application |
|-----------|-------------|
| Do one thing well | `/send` sends, `/inbox` triages, `/feedback` captures |
| Text streams | JSON/YAML events, Markdown messages |
| Composable tools | Agents as CLI tools with stdin/stdout |
| Crash-only design | All state in Git; agent restarts resume cleanly |

### 0.6 Research Sources

- Gemini Deep Research: "Distributed State and Asynchronous Coordination"
- Gemini Deep Research: "The Architecture of Beads: Local-First Distributed State"
- OpenAI: "Scaling Postgres" (KISS principle reference)
- Steve Yegge: Gas Town / Beads concepts
- Dicklesworthstone: MCP Agent Mail implementation

---

## 1. Problem Statement

### 1.1 Current State (Melange v2)

Melange v2 (PR #24) solves **peer-to-peer inter-construct messaging**:
- `/send`, `/inbox`, `/threads`, `/review-resolution` commands
- GitHub Issues as transport with Discord notifications
- Identity verification via GitHub OAuth
- Sender-side outbox model

**What Melange v2 does well:**
- Structured async feedback between constructs
- Human-in-the-loop on every action
- Zero external infrastructure (GitHub native)
- Clear ownership (sender owns the Issue)

### 1.2 The Missing Layer: Upstream Learning

Melange handles **horizontal** communication (Sigil ↔ Loa), but not **vertical** learning propagation:

```
Current Flow (One-Way):
   LOA (Mother)
      ↓ (distributes framework)
   REGISTRY
      ↓ (distributes skills)
   SIGIL/HIVEMIND/RUGGY (Children)
      ↓ (powers projects)
   CONSUMER PROJECTS
      ↓ (generates learnings)
   ??? (learnings trapped)
```

Child Constructs accumulate valuable signals:
- **Friction patterns** - Installation issues, DX problems
- **Capability gaps** - Missing features, workarounds needed
- **Integration discoveries** - Patterns that work across constructs
- **Performance insights** - What's slow, what scales

These insights remain siloed. No structured way for learnings to flow upstream.

### 1.3 Jani's Concerns (Issue #48 Comment)

Jani proposes a **pub/sub pattern** with key requirements:
1. **Standardized event emission** - Child constructs publish structured events
2. **Subscription layer** - Mother Loa subscribes to learning feeds
3. **Staging buffer** - Experimental patterns go to staging Loa first
4. **Assessment layer** - Compare outcomes against benchmarks before adoption
5. **Stability for Mother Loa** - Protect the foundation from experimental noise

### 1.4 Problems to Solve

| Problem | Current State | Desired State |
|---------|---------------|---------------|
| Peer feedback | Melange v2 (working) | Maintain + enhance |
| Upstream learnings | None (siloed) | Structured pub/sub |
| Experimental patterns | Mixed with production | Staging Loa buffer |
| Cross-construct correlation | Manual | Automated pattern detection |
| Learning adoption | Ad-hoc | Gated with benchmarks |

---

## 2. Vision

### 2.1 The Complete Picture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONSTRUCT MESSAGING v3                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    UPSTREAM LEARNING (Vertical)                   │   │
│  │                                                                   │   │
│  │   Consumer Projects ──publish──> Child Constructs ──publish──>   │   │
│  │                                                                   │   │
│  │            ┌─────────────┐         ┌─────────────┐               │   │
│  │            │  STAGING    │ ──────> │   MOTHER    │               │   │
│  │            │    LOA      │ (gate)  │     LOA     │               │   │
│  │            └─────────────┘         └─────────────┘               │   │
│  │                  ↑                        ↑                       │   │
│  │            assessment               production                    │   │
│  │            + benchmarks             adoption                      │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                  PEER MESSAGING (Horizontal)                      │   │
│  │                                                                   │   │
│  │     SIGIL ←───────────→ LOA-CONSTRUCTS ←───────────→ HIVEMIND    │   │
│  │              (Melange)                    (Melange)               │   │
│  │                          ↕                                        │   │
│  │                       RUGGY                                       │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Guiding Principles

1. **Stability for Mother Loa** - Never inject experimental patterns directly into production Loa
2. **Sender owns the noise** - Issues/events live in the emitting repo
3. **Human-in-the-loop always** - No auto-adoption; humans approve every action
4. **Zero external infrastructure** - GitHub + Discord only (no databases, queues)
5. **Progressive disclosure** - Start simple, opt into complexity
6. **Correlation over isolation** - Cross-construct patterns should emerge

---

## 3. User Personas

### 3.1 Construct Operator (Primary)

**Who**: Human who maintains one or more Constructs (soju, jani)

**Workflows**:
- **Peer messaging**: `/send loa "error handling needs work"` → `/inbox` triage
- **Upstream publishing**: `/feedback --publish` → emit structured learning event
- **Pattern review**: `/learnings --review` → see cross-construct patterns

**Pain Points**:
- Learnings trapped in local grimoires
- No visibility into what other constructs discovered
- Manual correlation of similar issues

### 3.2 Mother Loa Maintainer (Secondary)

**Who**: Person responsible for Loa framework stability (jani)

**Workflows**:
- **Subscribe to feeds**: `/loa subscribe sigil, hivemind, ruggy`
- **Review queue**: `/loa inbox` → see pending learnings
- **Stage experiments**: `/loa stage <learning-id>` → deploy to staging Loa
- **Promote to production**: `/loa promote <learning-id>` → adopt into Loa

**Pain Points**:
- No structured intake for child learnings
- Can't test patterns before adoption
- Manual aggregation across constructs

### 3.3 Consumer Project Developer (Tertiary)

**Who**: Developer using a Construct-powered repo

**Workflows**:
- **Report friction**: Agent auto-captures friction patterns
- **Verify resolution**: Get notified when upstream fixes land

**Pain Points**:
- Friction reports go nowhere
- No feedback loop on reported issues

---

## 4. Core Concepts

### 4.1 Two Complementary Protocols

| Aspect | Peer Messaging (Melange) | Upstream Learning |
|--------|--------------------------|-------------------|
| Direction | Horizontal (peer-to-peer) | Vertical (child → parent) |
| Transport | GitHub Issues | GitHub Issues + Events |
| Trigger | Human explicit (`/send`) | Agent discovery + human approval |
| Audience | Single target construct | Mother Loa (via registry) |
| Lifecycle | open → accepted → resolved → verified | draft → published → staged → adopted |
| Notification | Discord webhook | Discord + PR creation |

### 4.2 Event Types (Upstream Learning)

Child Constructs emit structured events to `grimoires/{construct}/upstream/`:

```yaml
# grimoires/sigil/upstream/2026-01-24-friction-001.yaml
type: friction
id: friction-001
timestamp: 2026-01-24T10:00:00Z
source_construct: sigil
source_version: 4.0.0
target: loa  # or "registry" or "self"

signal:
  category: installation
  severity: high
  summary: "pnpm install fails on Node 18"
  evidence:
    - file: grimoires/sigil/observations/2026-01-23-install-fail.md
    - error_count: 5
    - affected_sessions: 3
  pattern_match: null  # or reference to known pattern

recommendation: |
  Update engines field in package.json to require Node >= 20

auto_file_eligible: true  # Meets threshold for auto-filing
```

**Event Categories**:
| Category | Target | Threshold for Auto-File |
|----------|--------|------------------------|
| `friction` | Registry or Loa | 3+ occurrences |
| `gap` | Loa | 5+ sessions |
| `capability` | Loa | N/A (manual only) |
| `integration` | Self or Loa | 5+ related signals |
| `performance` | Self | Benchmark comparison |

### 4.3 The Staging Loa Concept

Jani's key insight: **Don't inject experiments into production Loa**.

```
Child Learning ──publish──> Learning Queue
                                  │
                                  ↓
                          ┌──────────────┐
                          │  ASSESSMENT  │
                          │    LAYER     │
                          └──────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ↓                           ↓
              ┌──────────┐              ┌──────────────┐
              │ STAGING  │              │   MOTHER     │
              │   LOA    │──(promote)──>│     LOA      │
              └──────────┘              └──────────────┘
                    │
                    ↓
              Test against
              benchmarks
```

**Staging Loa**:
- Fork of production Loa with experimental patterns applied
- Test suite runs against staging before promotion
- Human approval required for promotion
- Rollback path if benchmarks regress

### 4.4 Subscription Model

Mother Loa subscribes to child construct feeds:

```yaml
# In Loa's .loa.config.yaml
upstream:
  subscriptions:
    - construct: sigil
      categories: [friction, gap, capability]
      auto_stage: false  # Require manual staging
    - construct: hivemind
      categories: [friction, gap]
      auto_stage: true   # Auto-stage if threshold met
    - construct: registry
      categories: [friction]
      auto_stage: true
```

**Feed Discovery**:
- Each construct publishes to `grimoires/{name}/upstream/`
- Registry indexes available feeds
- Loa polls feeds on demand (`/loa sync`) or on schedule

### 4.5 Integration with Existing Melange

Melange v2 remains **unchanged** for peer messaging:
- `/send`, `/inbox`, `/threads`, `/review-resolution` work as designed
- Upstream learning is a **new layer** on top
- Events can reference Melange threads (e.g., "friction discovered during thread #42")

---

## 5. Functional Requirements

### 5.1 Peer Messaging (Melange v2 - Maintain)

**Existing commands remain**:
- `/send <target> "<message>" [--block]`
- `/inbox [--all] [--from <construct>]`
- `/threads [--mine] [--blocked] [--resolved] [--sync]`
- `/review-resolution [--all]`

**No changes to existing behavior**. PR #24 should be merged as-is.

### 5.2 Upstream Learning - Child Side

#### FR-2.1: Signal Capture

Agents automatically capture signals during sessions:
```yaml
# Appended to grimoires/{construct}/observations/
- timestamp: 2026-01-24T10:00:00Z
  type: friction
  context: "User tried /mount, got permission error"
  evidence: "Error: EACCES: permission denied, mkdir '/usr/local/...'"
  session_id: abc123
```

**Capture triggers**:
- Error messages matching patterns
- User corrections/retries
- Explicit user feedback
- Long session times on simple tasks

#### FR-2.2: Signal Aggregation with RICE Scoring

Periodic aggregation of raw signals into upstream events using RICE framework:

```bash
/feedback --aggregate
# Analyzes grimoires/{construct}/observations/
# Computes RICE score for each pattern
# Groups by category and filters by threshold
# Outputs: grimoires/{construct}/upstream/pending/
```

**RICE Scoring for Agents**:
```
Score = (Reach × Impact × Confidence) / Effort

Where:
- Reach = Files/modules affected (0-10)
- Impact = Severity (Critical=10, High=7, Medium=4, Low=1)
- Confidence = Agent certainty (0.0-1.0, require >= 0.85)
- Effort = Est. complexity to fix (1-10, lower is better)
```

**Thresholds** (Conservative):
| Severity | Occurrences | RICE Score | Action |
|----------|-------------|------------|--------|
| Critical | 3+ | >= 50 | Prompt for auto-file |
| High | 5+ | >= 30 | Prompt for auto-file |
| Medium | 10+ | >= 15 | Add to weekly digest |
| Low | N/A | < 15 | Discard or log only |

#### FR-2.3: Signal Review & Publish

Human reviews aggregated signals before publishing:

```bash
/feedback --review
# Shows pending upstream events
# For each: Approve, Edit, Defer, Dismiss
# Approved → moves to grimoires/{construct}/upstream/published/
```

#### FR-2.4: Filing to Mother Loa

Approved signals can be filed as GitHub Issues:

```bash
/feedback --file <event-id>
# Creates Issue in Loa repo (or Registry repo based on target)
# Uses upstream Issue template
# Labels: upstream, from:{construct}, category:{type}, severity:{level}
```

**Auto-file threshold** (opt-in):
- `friction` with 3+ occurrences → prompt for auto-file
- `gap` with 5+ sessions → prompt for auto-file
- User can approve batch filing

### 5.3 Upstream Learning - Loa Side

#### FR-3.1: Subscription Management

```bash
/loa subscribe <construct> [--categories <list>] [--auto-stage]
/loa unsubscribe <construct>
/loa subscriptions  # List current subscriptions
```

#### FR-3.2: Feed Sync

```bash
/loa sync [--construct <name>]
# Pulls published events from subscribed constructs
# Stores in grimoires/loa/upstream/inbox/
```

#### FR-3.3: Learning Inbox

```bash
/loa inbox [--from <construct>] [--category <type>]
# Shows pending learnings for review
# Actions: Stage, Dismiss, Comment, Request More Info
```

#### FR-3.4: Staging Workflow

```bash
/loa stage <learning-id>
# Creates branch: staging/learning-{id}
# Applies proposed changes
# Runs test suite
# Reports benchmark comparison

/loa staging-status
# Shows active staging experiments
# Pass/fail status, benchmark deltas
```

#### FR-3.5: Promotion

```bash
/loa promote <learning-id>
# Merges staging branch to main
# Notifies source construct of adoption
# Updates learning status: adopted
```

### 5.4 Cross-Construct Correlation

#### FR-4.1: Pattern Detection

When similar signals appear from multiple constructs:

```bash
/loa patterns
# Shows correlated patterns across constructs
# Example: "3 constructs report same friction with /mount"
```

#### FR-4.2: Aggregated Issues

Correlated patterns can be filed as aggregated Issues:

```markdown
## Aggregated Upstream Issue

**Pattern**: Installation friction with pnpm

**Sources**:
- sigil#friction-001 (5 occurrences)
- hivemind#friction-003 (3 occurrences)
- ruggy#friction-002 (2 occurrences)

**Total Impact**: 10 occurrences across 3 constructs

**Recommendation**: ...
```

---

## 6. Technical Architecture

### 6.1 Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CHILD CONSTRUCT                               │
│  (e.g., sigil)                                                          │
│                                                                          │
│  grimoires/sigil/                                                        │
│  ├── observations/          ← Raw signals captured by agent             │
│  │   └── 2026-01-24-*.md                                                │
│  ├── upstream/                                                           │
│  │   ├── pending/           ← Aggregated, awaiting review               │
│  │   │   └── friction-001.yaml                                          │
│  │   └── published/         ← Approved, ready for Loa consumption       │
│  │       └── friction-001.yaml                                          │
│  └── melange/               ← Existing peer messaging cache             │
│      └── threads.json                                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ (git push / API poll)
                                      ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                              MOTHER LOA                                  │
│                                                                          │
│  grimoires/loa/                                                          │
│  ├── upstream/                                                           │
│  │   ├── inbox/             ← Synced from child constructs              │
│  │   │   ├── sigil/                                                      │
│  │   │   │   └── friction-001.yaml                                      │
│  │   │   └── hivemind/                                                   │
│  │   ├── staging/           ← Experiments in progress                   │
│  │   │   └── learning-001/                                               │
│  │   └── adopted/           ← Successfully promoted                     │
│  │       └── learning-001.yaml                                           │
│  └── melange/               ← Existing peer messaging                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Event Schema

```yaml
# Upstream Event Schema v1
$schema: "upstream-event-v1"
type: friction | gap | capability | integration | performance
id: string  # unique within construct
timestamp: ISO8601
source:
  construct: string
  version: string
  operator: string  # GitHub username
target: loa | registry | self

signal:
  category: string  # subcategory
  severity: critical | high | medium | low
  summary: string  # one-line description
  evidence:
    - type: file | error | count | reference
      value: string | number
  pattern_id: string | null  # if matches known pattern
  related_melange_thread: string | null  # e.g., "sigil#42"

recommendation: string  # proposed solution
auto_file_eligible: boolean
status: draft | pending | published | filed | staged | adopted | dismissed
```

### 6.3 GitHub Integration

**Child → Loa filing**:
- Uses existing GitHub Issues API
- Issue template: `.github/ISSUE_TEMPLATE/upstream-learning.yml`
- Labels: `upstream`, `from:{construct}`, `category:{type}`, `severity:{level}`

**Staging workflow**:
- Creates branch: `staging/learning-{id}`
- Applies changes via PR
- CI runs test suite + benchmarks
- Human approves merge

### 6.4 Discord Notifications

Extend existing Melange webhooks:

| Event | Channel | Format |
|-------|---------|--------|
| Learning published | #construct-learnings | "sigil published friction-001: pnpm install fails" |
| Learning staged | #loa-staging | "Staging learning-001 from sigil (benchmark running)" |
| Benchmark result | #loa-staging | "learning-001: PASS (+2% test coverage, -5ms startup)" |
| Learning adopted | #loa-updates | "Adopted learning-001: Fixed pnpm Node version check" |

---

## 7. Scope

### 7.1 Phase 1: Foundation (This Cycle)

**Peer Messaging**:
- [x] Merge Melange v2 (PR #24) as-is
- [ ] Deploy to production

**Upstream Learning - Child Side**:
- [ ] Signal capture framework
- [ ] `/feedback --aggregate` command
- [ ] `/feedback --review` command
- [ ] `/feedback --file` command
- [ ] Upstream event schema v1

**Upstream Learning - Loa Side**:
- [ ] Subscription config in `.loa.config.yaml`
- [ ] `/loa sync` command
- [ ] `/loa inbox` command

### 7.2 Phase 2: Staging Layer

- [ ] `/loa stage` command
- [ ] Staging branch workflow
- [ ] Benchmark comparison infrastructure
- [ ] `/loa promote` command

### 7.3 Phase 3: Correlation & Intelligence

- [ ] Cross-construct pattern detection
- [ ] Aggregated issue creation
- [ ] Auto-stage for high-confidence patterns
- [ ] Learning analytics dashboard

### 7.4 Out of Scope (Future)

- External org participation
- Machine learning-based pattern detection
- Automated adoption (always human-in-the-loop)
- Real-time event streaming (async is sufficient)

---

## 8. Decisions Made

### 8.1 User Decisions (2026-01-24)

| Question | Decision | Rationale |
|----------|----------|-----------|
| Staging Loa infrastructure | **Branch-based** | Create `staging/learning-X` branches in main Loa repo. Simpler, no extra repos to maintain |
| Auto-file thresholds | **Conservative (3/5/10)** | Critical: 3+ occurrences, High: 5+, Medium: 10+ before prompting. Reduces noise |
| Registry vs Loa routing | TBD | Need routing logic - likely based on signal category |
| Beads integration | TBD | Pending external research on beads multiplayer |

### 8.2 Research Completed (2026-01-24)

| Question | Finding |
|----------|---------|
| Beads multiplayer? | Yes via Git sync, not real-time. **Decision: Don't adopt** - GitHub Issues sufficient |
| Beads mail paradigm? | Beads (state) + Agent Mail (messaging) are separate systems |
| Should we build Gas Town? | **No** - cargo cult risk. Stay pragmatic with UNIX-aligned patterns |
| What's worth extracting? | Filter vs File pattern, RICE scoring, Sender-Side Outbox (already in Melange) |

### 8.3 Still Open

1. **Benchmark infrastructure**: What test suites exist for Loa framework staging gates?
2. **Cross-construct correlation**: Algorithm for detecting similar signals across constructs?

### 8.3 Open for Jani Review

1. Does branch-based staging meet the "stability for mother Loa" requirement?
2. Is the event schema v1 sufficient for cross-construct correlation?
3. Are there additional event categories needed beyond friction/gap/capability/integration/performance?

---

## 9. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Learnings captured | 10+ per construct per month | Count of published events |
| Learnings adopted | 30%+ of published | adopted / published ratio |
| Time to adoption | < 2 weeks average | timestamp delta |
| Cross-construct patterns | 5+ identified per quarter | pattern count |
| Framework stability | No regressions from learnings | benchmark comparison |
| Human approval rate | 100% | No auto-adoption |

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Noise from low-quality signals | High | Severity thresholds, human review gates |
| Staging Loa complexity | Medium | Start with branch-based staging, not separate repo |
| Adoption bottleneck at Loa | High | Parallel staging, aggregated patterns |
| Breaking changes from learnings | Critical | Benchmark gates, rollback path |
| Cross-construct privacy | Low | All events are in public repos |

---

## 11. Dependencies

### 11.1 Technical Dependencies

- Melange v2 merged (PR #24) - **Required for Phase 1**
- Registry API v2 (operator schema) - **Already deployed**
- GitHub Actions for staging workflow - **Standard infrastructure**

### 11.2 Human Dependencies

- Jani review of pub/sub architecture - **Before Phase 2**
- Discord channel setup for #loa-staging - **Before Phase 2**
- Benchmark suite for Loa framework - **Before Phase 2**

---

## 12. Related Documents

- [Melange Protocol v2 PRD](./prd-melange-protocol.md) - Peer messaging foundation
- [Melange Identity & Resolution PRD](./prd-sender-identity.md) - Identity verification
- [Issue #48: Construct Feedback Protocol RFC](https://github.com/0xHoneyJar/loa/issues/48) - Original RFC
- [Issue #43: Grimoire Reality](https://github.com/0xHoneyJar/loa/issues/43) - Cross-repo ecosystem context

---

## Appendix A: Example Workflows

### A.1 Child Construct Reports Friction

```bash
# Sigil operator notices repeated installation failures

# 1. Agent has captured signals in observations
ls grimoires/sigil/observations/
# → 2026-01-24-install-fail-001.md
# → 2026-01-24-install-fail-002.md

# 2. Aggregate signals
/feedback --aggregate
# "Found 5 friction signals related to 'installation'"
# "Recommend filing as friction-001"

# 3. Review and approve
/feedback --review
# Shows: friction-001 - pnpm install fails on Node 18
# Actions: [Approve] [Edit] [Defer] [Dismiss]
# → Approve

# 4. File to Loa
/feedback --file friction-001
# Creates Issue in 0xHoneyJar/loa with labels:
# upstream, from:sigil, category:friction, severity:high
# Discord notification to #construct-learnings
```

### A.2 Loa Maintainer Processes Learning

```bash
# Jani sees Discord notification: "sigil published friction-001"

# 1. Sync feeds
/loa sync
# "Synced 3 new learnings from sigil, hivemind, ruggy"

# 2. Review inbox
/loa inbox
# Shows: friction-001 from sigil (high severity)
# Actions: [Stage] [Dismiss] [Comment] [Request Info]
# → Stage

# 3. Staging workflow
/loa stage friction-001
# "Created branch staging/learning-001"
# "Applied changes: update engines field"
# "Running benchmarks..."
# "PASS: All tests pass, +0% coverage, -2ms startup"

# 4. Promote to production
/loa promote friction-001
# "Merged staging/learning-001 to main"
# "Notified sigil operator"
# "Learning status: adopted"
```

### A.3 Cross-Construct Pattern

```bash
# Multiple constructs report same friction

/loa patterns
# Pattern detected: "pnpm Node version"
# Sources:
#   - sigil#friction-001 (5 occurrences)
#   - hivemind#friction-003 (3 occurrences)
#   - ruggy#friction-002 (2 occurrences)
# Total: 10 occurrences
# Recommendation: Single fix addresses all

/loa stage-pattern "pnpm Node version"
# "Creating aggregated staging branch"
# "All 3 constructs will be notified on adoption"
```

---

## Appendix B: Comparison to Jani's Pub/Sub Proposal

| Jani's Suggestion | This PRD | Notes |
|-------------------|----------|-------|
| "Pub/sub pattern" | Event publication + subscription config | Git-based, not message queue |
| "Standardized event emission" | Upstream event schema v1 | YAML files in grimoires |
| "Subagent gathering events" | `/loa sync` command | Human-triggered, not daemon |
| "Staging Loa version" | Branch-based staging | Can evolve to separate repo |
| "Assessment layer with benchmarks" | Benchmark gates on promotion | Requires benchmark infrastructure |
| "Stability for mother Loa" | Human approval at every gate | No auto-adoption |

---

*This PRD is a draft for discovery. External research on beads multiplayer and existing patterns will inform revisions.*

---
id: loa-constructs-infrastructure-cycle-2026-04-21-seed
title: "loa-constructs Infrastructure Cycle — close the plumbing, let schemas emerge"
cycle_shortname: "Infrastructure-first construct-network"
cycle_slug: "loa-constructs-infrastructure-cycle"
status: seed-ready-for-flatline
cycle_target: loa-constructs-cycle-001
consumer: /spiraling
branch_target: feat/spiral-loa-constructs-infrastructure-cycle-001
worktree: /Users/zksoju/Documents/GitHub/loa-constructs-cycle-001
date: 2026-04-21
author: OTLET (synthesis) + OSTROM (architecture) + GECKO (friction evidence) + STAMETS (prior art) + KEEPER (landed post-compose — see §14)
peer_reports:
  - grimoires/loa-constructs-seed-2026-04-21/ostrom-infrastructure-architecture.md
  - grimoires/loa-constructs-seed-2026-04-21/gecko-ecosystem-health.md
  - grimoires/loa-constructs-seed-2026-04-21/stamets-prior-art.md
  - grimoires/loa-constructs-seed-2026-04-21/keeper-friction-profile.md (landed 2026-04-21; findings absorbed into §14 amendment)
post_compose_amendments: §14 (KEEPER ingestion + 4 operator-surfaced intel pieces)
depends_on:
  - grimoires/bridgebuilder/auto-sync-architecture.md (2026-03-05) — folded into Leg A + Leg B
  - grimoires/bridgebuilder/constructs-network-review.md (2026-03-05) — CRITICAL-1 → Leg A, CRITICAL-2 → Leg F (deferred), HIGH-1 → Leg C, HIGH-2/3 → resolved upstream, MEDIUM-1 → Leg B
  - grimoires/bridgebuilder/context/construct-dx-universal-fix.md — Leg C's canonical source (Fix 1/2/3)
  - ~/hivemind/strategy/construct-network-feedback-2026-04-20.md (8 axes) — Leg D=Axis 1, Leg E=Axis 7; Axes 2/3/4/5/6/8 DEFERRED until D+E produce data
  - ~/hivemind/wiki/concepts/riding-loa-endgame.md §12 (5-layer composition stack)
  - ~/hivemind/wiki/concepts/agent-native-civic-architecture.md §1 (civic-layer split — kept in doctrine, not schema)
  - ~/hivemind/wiki/concepts/life-patterns-as-doctrine.md (grandmother-test — the pruning gate this SEED passed)
grounded_in:
  - OSTROM report §1-9 (infrastructure inventory + 5-leg decomposition)
  - GECKO report §1-8 (26 asymmetric composes, 3 slash collisions, 5 install surfaces, dual-slug observer/beehive, Pashov credibility signal, 10 edges that should be optional)
  - STAMETS report §1-6 (Polar.sh transfer, Anthropic Skills progressive disclosure, OCI vision, DO-NOTs: git-as-database / Stripe Connect / siloed-npm-clone)
  - grimoires/bridgebuilder/stack-architecture-thesis.md (Effect-ts deferred per Phase 0 — stay on viem/wagmi)
doctrine_applied:
  - life-patterns-as-doctrine (grandmother-test: "close the plumbing so the right tools appear where they belong" passes)
  - infrastructure-first covenant (OSTROM §7 — schemas emerge, don't get prospectively invented)
  - grounded-and-bounded (7 legs, operator-ratified; 5 of 8 axes deliberately excluded until D+E produce evidence)
  - private→public tolerated (OSTROM §3 — Tier-A flips first; secret sweep gated per repo)
  - standards-overlay-not-standards-fork (STAMETS §3 DO-NOT-3 — constructs are Anthropic-Skills-compliant supersets; no new schema competes with SKILL.md)
  - construct-network is NOT designed around spiraling (operators-manual §8) — this cycle is sized for spiraling because it's bounded engineering; the network itself stays larger
rl_corpus_commitment: true
---

# loa-constructs Infrastructure Cycle — SEED

## 0 · The reorient (why this cycle exists, now)

Yesterday (2026-04-20) produced an 8-axis comprehensive feedback on the construct-network. It named real problems. It also proposed 8 schemas to design. OSTROM's report this morning surfaces the lie underneath: **6 of those 8 axes cannot be responsibly designed yet — they require data that doesn't exist because the infrastructure that would produce it is not wired**.

GECKO confirms the same thing from the bazaar's eye view: composition is being *declared* as aspiration (26 asymmetric `compose_with`), install surfaces are fragmented (5 commands pointing at the same registry), identity has drifted (observer/beehive dual-slug; beacon persona vs beacon skills). You cannot design orthogonal governance schemas on top of a registry that doesn't yet know which repos exist.

STAMETS puts the roof on: the patterns worth adopting are already hardened (Polar for paid constructs, progressive disclosure for manifests, OIDC + content-addressable storage for trust). The traps are well-named (git-as-database, Stripe Connect DIY, siloed npm-clone). Nothing in this cycle is invention. Everything is adoption.

The operator decision locked 2026-04-21: **infrastructure-first; schemas emerge from resolutions**. This SEED honors that. The 5 infra legs (A-E) produce the plumbing and the first wave of evidence. Legs F (composition recipes) and G (Polar scaffold for Freeside) ride alongside because they're bounded reads against the same infrastructure and require zero schema commitments. Everything doctrinal (Axis 2 territory declarations, Axis 3 civic-layer in schema, Axis 4 invocation tiers, Axis 5 orchestration router, Axis 8 micro/macro loop split) waits.

The construct-network is not designed around spiraling; spiraling serves the network when the shape fits. This cycle's shape fits: bounded, evidence-friendly, convergence-seeking, reversible per leg.

---

## 1 · Scope — 7 legs, bounded, infrastructure-first

OSTROM's 5 legs (A-E) are adopted verbatim with two additions: Leg F (composition-recipes scaffold, bounded read-only) and Leg G (Freeside Polar adapter scaffold, scaffolded not implemented per operator's "Freeside integration scaffolded" directive).

### Leg A — `POST /v1/admin/discover` endpoint (M)

**Goal**: operator-triggered org-scan + upsert without code edits or `DATABASE_URL` interactivity. Closes CRITICAL-1 from bridgebuilder's network review. Encodes `auto-sync-architecture.md` Layer 1 (Discovery) into a deployed endpoint.

**Scope** (from OSTROM §9 Leg A):
- port `scripts/discover-constructs.ts:60-132` logic into `apps/api/src/services/discovery.ts`
- expose behind admin auth at `apps/api/src/routes/admin.ts` — two routes: `POST /v1/admin/discover` (writes) and `POST /v1/admin/discover/dry-run` (read-only preview)
- one Drizzle migration for `discovery_runs` table (`{scanned_at, repo, visibility, had_manifest, registered, new}` — schema emerges per OSTROM §7)
- auth: existing admin JWT check; no new auth primitives
- GitHub rate budget: 60 req per scan × any cadence <= 5000/hr → no backoff needed v1

**Files**:
- `apps/api/src/routes/admin.ts` (MODIFY — add two routes)
- `apps/api/src/services/discovery.ts` (NEW)
- `apps/api/drizzle/00NN_discovery_runs.sql` (NEW)
- `scripts/discover-constructs.ts` (DELETE after migration — single source of truth)

**AC**:
- operator curls `POST /v1/admin/discover` with admin JWT → all 30 `construct-*` repos in org (minus archived) appear in `packs` table with `auto_discovered: true`, `status: 'discovered'` for any missing from current `GIT_CONFIGS`
- dry-run returns the same discovered-set JSON but writes zero rows
- `discovery_runs` row records every scan (audit trail)
- Zero interactive `DATABASE_URL` step; no local seed-script dependency

**Pre-team**: OSTROM (infra-AC), GECKO (verify 3 invisible repos from bridgebuilder CRITICAL-1 — `construct-deep-research`, `construct-webgl-particles`, `construct-base` — all become visible)

### Leg B — Public-first flip ritual + `repository` webhook handler (M)

**Goal**: eliminate manual re-sync after `gh repo edit --visibility public`. Complete OSTROM §3's Tier-A flip ritual (5-10 repos) and wire the receiving webhook so future flips propagate in ≤10s.

**Scope** (from OSTROM §9 Leg B, enriched by GECKO §5 inventory):
- run §3 checklist on Tier-A repos (artisan, k-hole, observer, the-arcade, protocol + any newly-surfaced-public from GECKO §5 local-only/gh-only reconciliation)
- extend `apps/api/src/routes/webhooks.ts:381` to handle `repository.{privatized,publicized,renamed,archived}` events — currently only `push` + `create` fire (line 429-431)
- add `visibility_transitions` audit table (`{pack_id, from, to, at, source}` — schema emerges per OSTROM §7)
- existing `guardVisibilityTransition` (`webhooks.ts:575`) stays — demote-only guard prevents public→private breakage for external consumers
- install org-level GitHub App webhook (replaces per-repo manual-paste model; `webhooks.ts:670-684` returns *instructions*, not configuration — this is the DX win flagged by auto-sync-architecture.md:208)

**Files**:
- `apps/api/src/routes/webhooks.ts` (MODIFY — add `repository` event handler branch)
- `apps/api/drizzle/00NN_visibility_transitions.sql` (NEW)
- `.github/install-constructs-app.md` (NEW — runbook for org-app installation)

**Pre-flip sanitization (per OSTROM §3.2)** — one-time per repo:
- `trufflehog git file://. --only-verified` (CI already wires this; reuse)
- grep for `process.env.*_SECRET|_KEY|_TOKEN|DATABASE_URL` in `scripts/` + `skills/`
- confirm `LICENSE` file exists; confirm `construct.yaml:visibility` correctly reflects target

**AC**:
- `gh repo edit 0xHoneyJar/construct-X --visibility public` → webhook fires within 10s → `packs.visibility` updates → `visibility_transitions` row written
- Tier-A repos flipped and visible to unauthenticated `GET /v1/constructs`
- Tier-C repos remain private (freeside, any wallet-logic, unreleased brand IP)
- `guardVisibilityTransition` passes demotion-prevention bats test on round-trip

**Pre-team**: OSTROM (webhook-AC), GECKO (sanity-check flip inventory against §5 public/private census — 22 public today; target ≥26 after Tier-A flips)

### Leg C — `construct.yaml` as primary source (installer DX universal fix) (M)

**Goal**: `git clone → ls ~/.loa/constructs/packs/` makes the pack visible without needing a `manifest.json` regeneration ceremony. Closes `construct-dx-universal-fix.md` Fix 1/2/3 at the `.claude/scripts/` layer.

**Scope** (from OSTROM §9 Leg C):
- `construct-index-gen.sh`: read `construct.yaml` as primary source; derive `manifest.json` in-memory if missing; write only on explicit publish
- `constructs-install.sh`: index + list work from yaml without intermediate JSON artifact
- `construct-resolve.sh`: resolve slugs from yaml in local packs directory

**Files** (per `construct-dx-universal-fix.md:27-69`):
- `.claude/scripts/construct-index-gen.sh`
- `.claude/scripts/constructs-install.sh`
- `.claude/scripts/construct-resolve.sh`

**AC**:
- user `git clone 0xHoneyJar/construct-NEW ~/.loa/constructs/packs/new`, then `constructs-install.sh list` shows `new` with its declared skills — no manifest.json required anywhere
- GECKO §4's `webgl-particles` "local pack with no construct.yaml" case errors cleanly rather than silently breaking the index
- Bash-strict-mode compliance (per `.claude/rules/shell-conventions.md`)

**Pre-team**: OSTROM (script-AC), GECKO (verify the 8 GitHub-only repos from §1 install cleanly via `git clone`)

### Leg D — Axis-1 trajectory emission wrapper (S-M)

**Goal**: every construct invocation produces a machine-readable trajectory event. Enables Axes 2, 5, 8 to be *designed against real data* rather than guessed. Per `construct-network-feedback` §2 Axis 1 — P0 "without this, every other optimization is guesswork."

**Scope** (from OSTROM §9 Leg D):
- `.claude/scripts/construct-invoke.sh` wrapper — emits JSONL entry/exit rows to `.run/construct-trajectory.jsonl`:
  ```jsonl
  {"ts": "...", "kind": "entry", "construct": "artisan", "persona": "ALEXANDER",
   "skills_requested": ["analyzing-feedback"],
   "parent_session": "...", "invocation_id": "uuid"}
  {"ts": "...", "kind": "exit", "invocation_id": "uuid",
   "context_read": ["taste.md", "feel-register.md"],
   "artifacts_emitted": ["grimoires/.../feedback.md"],
   "verdicts": [{"kind": "register_check", "result": "pass", "conf": 0.8}],
   "cost_usd": 0.42, "input_tokens": 4021, "output_tokens": 877}
  ```
- rewire `/feel`, `/dig`, `/systems`, `/run` slash commands through the wrapper (three proves the loop; rest follows in a later cycle)
- CLAUDE.loa.md pointer addition — one line in the Reference Files table; no new doctrine

**Files**:
- `.claude/scripts/construct-invoke.sh` (NEW)
- `CLAUDE.loa.md` (MODIFY — one-line pointer)

**AC**:
- one FEEL session produces paired entry/exit rows
- rows pass `jq` schema validation (Leg E defines `feedback-v3.schema.json`; trajectory schema is simpler)
- bats test covers three-persona wiring (ALEXANDER, STAMETS, OSTROM as first three)
- log rotation via `logrotate`-style `.run/construct-trajectory.YYYY-MM-DD.jsonl` (24h rotation, 30-day retention)

**Pre-team**: OSTROM (schema), STAMETS (progressive-disclosure alignment — trajectory is the "metadata envelope" for what was loaded)

### Leg E — feedback-v3 emission convention (Axis 7) (S-M)

**Goal**: three personas (ALEXANDER, KEEPER, STAMETS) emit uniform corpus rows per invocation. Biggest RL-horizon leverage per `riding-loa-endgame §12 L5` + `construct-network-feedback §2 Axis 7`. Three is deliberately the floor — boiling the ocean is the anti-pattern.

**Scope** (from OSTROM §9 Leg E):
- `feedback-v3.schema.json` at `.claude/schemas/`:
  ```jsonc
  {
    "schema": "feedback-v3",
    "source": "construct:artisan/ALEXANDER",
    "intent": "observation | proposal | verdict",
    "region": "...",
    "scene": {"world": "purupuru", "register": "tsuheji-warm", "primitive": "fresnel-rim"},
    "text": "Rim color reads plastic, not paper.",
    "proposed_fix": {"target": "shader-uniform", "patch": {"u_rim_b": 0.6}, "reversible": true},
    "label": {"primitive": "fresnel-rim", "register": "tsuheji-warm"}
  }
  ```
- validator bats test — round-trips an emitted row through the schema
- three SKILL.md edits (`artisan/ALEXANDER` check-register, `observer/KEEPER` drift-audit, `k-hole/STAMETS` dig-summary) — each adds a single line: "MUST emit a feedback-v3 row on verdict."

**Files**:
- `.claude/schemas/feedback-v3.schema.json` (NEW)
- `tests/unit/feedback-v3-roundtrip.bats` (NEW)
- `~/.loa/constructs/packs/artisan/skills/*/SKILL.md` (MODIFY — one persona's skill)
- `~/.loa/constructs/packs/observer/skills/*/SKILL.md` (MODIFY)
- `~/.loa/constructs/packs/k-hole/skills/*/SKILL.md` (MODIFY)

**AC**:
- a FEEL session produces one feedback-v3 row that passes schema validation and is `jq`-queryable
- three personas emit; all others produce no rows (deliberate — do not expand this sprint)
- corpus row appears in same JSONL stream as Leg D trajectory (source-of-truth composition — one corpus, many producers)

**Pre-team**: OSTROM (schema), STAMETS (Anthropic-Skills-compliance check — does this row shape survive as an agent-skill teaching surface?)

### Leg F — Composition-recipes scaffold (S)

**Goal**: known-good pairs (ALEXANDER + KEEPER; STAMETS + OSTROM; ALEXANDER + ROSENZU) become first-class invocable units. Infrastructure-adjacent because it only needs read-path; no new schema commits — declarations go into file-system convention. Enables the "intent-tier" invocation (per `construct-invocation-glossary` companion doc) when operator is ready.

**Scope** (extracted from OSTROM §8 Axis 6 classification: "Infrastructure — sprint-adjacent"):
- `.claude/constructs/compositions/*.yaml` directory — one file per named composition
- three starter recipes ship this cycle:
  - `feel-audit.yaml` → ALEXANDER + KEEPER (parallel; verdicts merge)
  - `dig-to-ship.yaml` → STAMETS → OSTROM (sequential; research hands off to architecture)
  - `material-tour.yaml` → ALEXANDER + ROSENZU (parallel; material observations + spatial framing)
- read-path only — the orchestration router (Axis 5) remains deferred

**Files**:
- `.claude/constructs/compositions/feel-audit.yaml` (NEW)
- `.claude/constructs/compositions/dig-to-ship.yaml` (NEW)
- `.claude/constructs/compositions/material-tour.yaml` (NEW)
- `.claude/constructs/compositions/README.md` (NEW — one-page convention doc)

**AC**:
- three yaml files validate against a minimal JSON schema (`slug`, `invokes`, `intent`, `sequence`, `output_schema`, `governance_layer`)
- no runtime wiring this cycle — declarations are read-only for now; routing comes later
- GECKO's §2 evidence informs recipe selection: only pairs with symmetric `compose_with` become recipes (artisan↔observer, crucible↔observer currently the only two — expansion gated on real composition traffic)

**Pre-team**: GECKO (verify chosen recipes don't amplify the hub-and-spoke distortion from §2)

### Leg G — Freeside Polar adapter scaffold (S — SCAFFOLD ONLY, not implementation)

**Goal**: scaffold the integration path STAMETS §4 identified — Polar.sh as the MoR for paid constructs, slotted into Freeside next to Paddle/NOWPayments. Operator-locked decision: "Freeside integration scaffolded."

**Scope**:
- directory `packages/adapters/billing/polar/` with stub TypeScript interfaces:
  - `createConstructProduct(constructSlug, price, benefits): Promise<ProductRef>`
  - `checkEntitlement(userId, constructSlug): Promise<EntitlementStatus>`
  - `onPurchaseWebhook(event): Promise<void>`
- `README.md` documenting the integration shape (STAMETS §4 "one sentence")
- NO live Polar API integration, NO env vars wired, NO webhook routes — stubs + interfaces only
- explicit note: "Polar adoption is the direction; implementation waits for operator signal + post-cycle data on paid-construct demand."

**Files** (in `loa-freeside` repo — cross-repo note, not in loa-constructs):
- `loa-freeside/packages/adapters/billing/polar/index.ts` (NEW — stub)
- `loa-freeside/packages/adapters/billing/polar/types.ts` (NEW)
- `loa-freeside/packages/adapters/billing/polar/README.md` (NEW)

**AC**:
- `bun install` works in loa-freeside; stubs typecheck
- `README.md` names the three methods + one-sentence integration shape
- NO runtime coupling to loa-constructs this cycle — scaffold only

**Pre-team**: STAMETS (Polar surface validation), OSTROM (cross-repo boundary sanity — no leaking loa-constructs internals into freeside)

**OUT-OF-SCOPE for Leg G this cycle**:
- Polar account setup (operator concern)
- Creem comparison (STAMETS §6 pull-thread — 2027 if at all)
- OCI transport (STAMETS §5 SPECULATION — Vision Registry candidate)

---

## 2 · Boundary invariant

**Touches** (loa-constructs repo):
- `apps/api/src/routes/admin.ts`, `apps/api/src/routes/webhooks.ts`
- `apps/api/src/services/discovery.ts` (NEW)
- `apps/api/drizzle/` (2 new migrations)
- `.claude/scripts/construct-index-gen.sh`, `constructs-install.sh`, `construct-resolve.sh`, `construct-invoke.sh` (new)
- `.claude/schemas/feedback-v3.schema.json` (NEW)
- `.claude/constructs/compositions/*.yaml` (NEW, 3 files + README)
- `CLAUDE.loa.md` (1-line pointer addition)
- `tests/unit/feedback-v3-roundtrip.bats` (NEW)
- `.github/install-constructs-app.md` (NEW runbook)

**Touches** (loa-freeside repo — cross-repo, isolated):
- `packages/adapters/billing/polar/` (NEW subdirectory, stubs only)

**Touches** (cross-repo — Tier-A flips per Leg B):
- `0xHoneyJar/construct-{artisan,k-hole,observer,the-arcade,protocol}` — `gh repo edit --visibility public` post sanitization checklist

**Does NOT touch**:
- `scripts/seed-forge-packs.ts` (deprecated by Leg A; deletion deferred until cycle-002)
- Schema for `territory declarations` / `governance_layer` (Axes 2/3 — DEFERRED until D+E produce evidence)
- Orchestration router (Axis 5 — DEFERRED)
- Micro/macro loop schema (Axis 8 — DEFERRED)
- `~/.loa/constructs/packs/` beyond the three Leg E persona edits (ALEXANDER, KEEPER, STAMETS only — three proves the loop; rest waits for RL corpus feedback)
- All 13 `construct-*` pack repos not on the Tier-A flip list
- `construct-freeside` (stays `visibility: private` per Tier-C + OSTROM §3 — infra secrets)
- Paddle, NOWPayments, BYOK, tier-budget, conviction-scoring — all existing Freeside systems untouched (Polar lives in a new adapter slot, zero collision)
- GECKO §3 `/dig` and `/forge` slash-command collisions — a rename cycle, not an infra cycle (pull-thread 2)
- GECKO §4 `beacon` persona rewrite — doctrine work (pull-thread 3)
- GECKO §4 observer/beehive dual-slug reconciliation — one-line operator call (pull-thread 1)

---

## 3 · Version bumps

- `loa-constructs` repo: tag `v1.NN.0` post-merge (feature-level)
- `apps/api/package.json`: minor bump (`1.NN.0`) — two new endpoints + one new service
- `apps/api/drizzle/`: migrations `00NN_discovery_runs.sql`, `00NN+1_visibility_transitions.sql` (sequential)
- `.loa.config.yaml` or equivalent: no bump — config stays
- `loa-freeside/packages/adapters/billing/polar/package.json`: `0.1.0-alpha` (stub-only)
- No pack-level version bumps this cycle (three SKILL.md files touched in Leg E are content edits, not API)

---

## 4 · KANSEI gate — 5 operator-answered questions at cycle close

Per OSTROM §9 and operator's F-template convention (cycle-103 §4):

1. **"Can you `gh repo edit construct-X --visibility public` and see it reflected in the registry within 10 seconds without any other action?"** — validates Leg A + Leg B end-to-end. Target: yes, unequivocally.
2. **"Can you `git clone` a new construct into `~/.loa/constructs/packs/` and have it appear in `constructs list` with no manifest.json ceremony?"** — validates Leg C. Target: yes.
3. **"After one FEEL session, can you `jq` one row out of `.run/construct-trajectory.jsonl` AND one row out of the feedback-v3 stream that labels the same primitive?"** — validates Legs D + E compose cleanly. Target: yes.
4. **"Looking at `.run/construct-trajectory.jsonl` after three sessions, does any NEW schema (territory? civic-layer? scope-tags?) look obvious — or does the data surface a different question entirely?"** — validates the infrastructure-first covenant. The right answer may be "a different question" — that's a success, not a failure. The schema emerges from evidence, not prospect.
5. **"Does this cycle's work feel like it *served the game* — purupuru ships a construct, the economic model becomes more legible, the operator spends less time on registry plumbing — or does it feel like doctrine maintenance pretending to be infrastructure?"** — the grandmother-test per life-patterns-as-doctrine. Target: serves the game. If no, we've drifted.

**Pass threshold**: ≥4/5 positive. If <3/5, halt + re-evaluate. Strong candidate failure mode: Leg D produces noise rather than signal (trajectory rows that are either too sparse to mine or too verbose to read). Mitigation: downscale Leg D to two personas in that case; emit richness only on verdict events, not all tool calls.

---

## 5 · Budget + dispatch

**Target**: $220. **Cap**: $280. Profile: `standard`.

This is a 7-leg bounded infrastructure cycle across two repos (loa-constructs primary, loa-freeside scaffold). Higher budget than a single-world UI cycle (cycle-103 was $120) because:
- 2 Drizzle migrations + 2 new API endpoints (schema changes carry review+audit cost)
- cross-repo touch (Leg G in loa-freeside)
- 5-6 Tier-A repo flips with per-repo sanitization checklist (human-gated, but bot-assisted)
- 3 SKILL.md edits across 3 construct packs (cross-pack coordination)

**Sprint shape** (OSTROM's sequencing — A+B+C parallelize, D follows A, E follows D, F+G ride alongside):

- S1: Leg A `POST /v1/admin/discover` + `services/discovery.ts` + migration
- S2: Leg B `repository` webhook handler + `visibility_transitions` migration + Tier-A flip ritual (secret sweep + flip execution)
- S3: Leg C `construct-index-gen.sh` + `constructs-install.sh` + `construct-resolve.sh` patch trio
- S4: Leg D `construct-invoke.sh` wrapper + trajectory JSONL emission + three slash-command rewires
- S5: Leg E `feedback-v3.schema.json` + validator bats + 3 SKILL.md edits (ALEXANDER, KEEPER, STAMETS)
- S6: Leg F `compositions/*.yaml` trio + README (read-only scaffold, no orchestrator wiring)
- S7: Leg G `loa-freeside/packages/adapters/billing/polar/` stubs + README
- S8: KANSEI gate (5 operator-answered questions) + cycle-close findings doc

```bash
cd /Users/zksoju/Documents/GitHub/loa-constructs-cycle-001
.claude/scripts/spiral-harness.sh \
  --task "Build loa-constructs infrastructure cycle per SEED 2026-04-21. 7 legs: A POST /v1/admin/discover + services/discovery.ts + discovery_runs migration (port from scripts/discover-constructs.ts, admin-auth, dry-run variant); B repository webhook handler on existing /v1/webhooks/github for privatized/publicized/renamed/archived events + visibility_transitions migration + Tier-A flip ritual (trufflehog sweep per OSTROM §3.2 then gh repo edit --visibility public on artisan, k-hole, observer, the-arcade, protocol — verify guardVisibilityTransition blocks public→private); C .claude/scripts/ DX universal fix per construct-dx-universal-fix.md Fix 1/2/3 (construct-index-gen.sh, constructs-install.sh, construct-resolve.sh — yaml is primary, JSON derived in-memory, no manifest.json ceremony); D .claude/scripts/construct-invoke.sh wrapper emitting entry/exit JSONL rows to .run/construct-trajectory.jsonl (rewire /feel /dig /systems through wrapper; 24h log rotation, 30-day retention); E .claude/schemas/feedback-v3.schema.json + bats validator + SKILL.md edits for artisan/ALEXANDER + observer/KEEPER + k-hole/STAMETS (three personas ONLY; do not expand); F .claude/constructs/compositions/ trio (feel-audit, dig-to-ship, material-tour) + README (read-only convention, no runtime wiring); G cross-repo loa-freeside/packages/adapters/billing/polar/ stubs (createConstructProduct, checkEntitlement, onPurchaseWebhook) + README + types — scaffold only, no live Polar API. BOUNDARY: admin.ts + webhooks.ts + services/discovery.ts + 2 migrations + 4 .claude/scripts/ + schemas/feedback-v3 + compositions/ + 3 SKILL.md + CLAUDE.loa.md pointer + tests/feedback-v3-roundtrip.bats + loa-freeside polar/ stubs. DOES NOT TOUCH scripts/seed-forge-packs.ts (defer deletion), Axis 2/3/4/5/8 schemas (defer until D+E data lands), orchestration router, observer/beehive dual-slug (pull-thread), slash-command collisions (pull-thread), beacon persona (pull-thread). KANSEI gate 5 questions per §4 — target ≥4/5, halt if <3/5. Canonical: SEED + OSTROM report + GECKO report + STAMETS report + operator-decision lock 2026-04-21 (infrastructure-first; private→public tolerated; Freeside scaffolded; comprehensive workflow investment). Emit F1-FN findings doc at cycle close per cycle-101/102/103 template." \
  --cycle-dir .run/cycles/loa-constructs-cycle-001 \
  --cycle-id loa-constructs-cycle-001 \
  --branch feat/spiral-loa-constructs-infrastructure-cycle-001 \
  --profile standard \
  --budget 280 \
  --seed-context grimoires/loa-constructs-seed-2026-04-21/SEED-loa-constructs-infrastructure-cycle.md
```

---

## 6 · Risks + mitigations

| Risk | Mitigation |
|---|---|
| GitHub API rate-limit surprise on first org-scan (if cadence escalates) | OSTROM §4 — 60 req/scan @ 6h cadence = 240/day, 20x below 5000/hr authenticated. If cadence needs to tighten, switch to GitHub App (higher limits). Document threshold in operations runbook. |
| Webhook miss on first Tier-A flip (org-app install lag) | Leg A's discover endpoint is the safety net — operator can manually trigger `POST /v1/admin/discover` to reconcile any missed events |
| `guardVisibilityTransition` false-positive blocks a legitimate demote | Unit-test round-trip per OSTROM §9 Leg B; add an operator-only override route if needed (deferred unless observed) |
| Leg C scope leak into Loa framework (touches `.claude/scripts/` which is System Zone per zone-system.md) | Keep to the 3-file patch documented in `construct-dx-universal-fix.md:27-69`. Any change beyond → escalate to cycle-level authorization per zone rules |
| Leg D trajectory JSONL noise rather than signal (verbose tool-call logs overwhelm actual verdicts) | Downscale to verdict-only emission at S4 checkpoint if `jq` queries require too much filtering. Two-persona fallback for Leg D + E |
| Leg E three-persona expansion temptation ("why not do all 7 verdict-emitting personas?") | Operator-directive discipline per OSTROM §9 Leg E: "DO NOT expand in this sprint." Expansion gates on KANSEI Q4 outcome — if data says yes, cycle-002. |
| Leg F recipes encode hub-and-spoke distortion GECKO §2 identified | Only include recipes where `compose_with` is symmetric today — artisan↔observer, crucible↔observer; synthetic pairs must trace to a real observed session |
| Leg G cross-repo coupling (loa-constructs changes require loa-freeside changes) | Scaffold-only per operator directive. Zero runtime coupling this cycle. Implementation is a follow-up cycle after Polar account exists. |
| KEEPER report absent at compose-time; infrastructure decisions may miss a friction-signature | OTLET drift-note in §11 flags; operator-gated pull-thread to revisit post-cycle with KEEPER's friction profile as cycle-002 input. OSTROM §8 absorbed one known KEEPER signal (operators-manual §8 stranded-PENDING labs) pre-emptively. |
| Public-flip exposes an unnoticed secret in a Tier-A repo | Tier-A checklist mandates `trufflehog` + grep sweep before flip. If post-flip surface leak detected, `guardVisibilityTransition` DOES allow manual demotion via admin endpoint (one-shot override). Incident runbook in `.github/install-constructs-app.md`. |
| Operator's "Freeside integration scaffolded" expands mid-cycle to "Polar wired live" | Enforce Leg G boundary via bats test: "zero network calls from `polar/` stubs." Red-team during KANSEI gate. |

---

## 7 · RL corpus contribution (per operator's "RL corpus throughout" directive)

This cycle is the **infrastructure that makes future RL corpus rich**. It does not itself produce heavy corpus:

- **Leg D trajectory** — first persistent record of which constructs fire when, at what cost, against what context. Foundational for any future routing/orchestration training.
- **Leg E feedback-v3** — three personas emit labeled verdicts in a uniform schema. ALEXANDER's register-checks, KEEPER's drift-audits, STAMETS's dig-summaries become training pairs where (invocation-context → verdict) is a supervised signal.
- **Leg A discovery_runs** — audit trail becomes ground truth for "what exists, when, in what state." Future supersession-chain training data.
- **Leg B visibility_transitions** — every private→public flip is an evidenced decision. RL corpus for governance-layer reasoning.

**Corpus commitment honored**: all Leg D + E emissions feed `feedback-v3` JSONL; all Leg A + B audit rows are queryable; nothing is ephemeral. Per OTLET Principle 3: append-only, chain-not-overwrite, supersede with reasoning.

Not a commitment this cycle: boiling the corpus ocean. Three personas, not thirteen. Two JSONL streams, not seven. Expansion gates on KANSEI Q4 — real data, not prospect.

---

## 8 · Phase shape — pure Phase 2 (no Blender, no external MCP)

No Blender MCP. No external art pipeline. No OKX/Dialect sandbox. No pre-cycle main-session bottleneck.

**All Phase 2** — the harness can dispatch A-G end-to-end autonomously, with one HITL gate per Tier-A flip (operator runs `trufflehog` + inspects diff, then clicks flip). That gate is explicit, not implicit.

---

## 9 · What this cycle explicitly is NOT

Per OSTROM §8 deferral classifications + GECKO pull-threads + life-patterns grandmother-test:

- NOT a redesign of the construct-network doctrine. Axes 2, 3, 4, 5, 8 wait for D+E evidence. Declarations of territory, civic-layer schema, invocation tiers, orchestration router, micro/macro loop split — all deferred.
- NOT a resolution of GECKO's identity-drift findings:
  - observer/beehive dual-slug: one-line operator call, not infra (pull-thread 1)
  - beacon persona rewrite: doctrine work (pull-thread 3)
  - hypha JSON-vs-YAML schema split: registry tolerance fix, scope is registry-side (pull-thread 5)
- NOT a resolution of GECKO's 26 asymmetric `compose_with` declarations. Leg F seeds recipes only from the 2 symmetric pairs; the other 24 wait for real composition traffic (which Leg D will surface).
- NOT a resolution of GECKO's 3 slash-command collisions (`/dig`, `/forge`, `/map`). Rename work, not infra (pull-thread 2).
- NOT a resolution of GECKO's 5 install-command surfaces (Pashov's credibility signal). Consolidation cycle, not infra (pull-thread 4).
- NOT a live Polar integration. Scaffold only per operator directive. Live integration waits for (a) Polar account, (b) paid-construct demand evidence, (c) a later cycle.
- NOT a migration off Stripe or Paddle. STAMETS §4 explicitly positions Polar as an *additional* adapter next to Paddle, not a replacement. Existing Freeside systems untouched.
- NOT an OCI transport migration (STAMETS §5). Vision Registry candidate; 2027 at earliest.
- NOT an Effect-ts adoption (`stack-architecture-thesis`). Phase 0 → stay on viem/wagmi until one Protocol skill proves typed-errors improve agent success rate.
- NOT a change to the civic-layer schema. Doctrine stays in `agent-native-civic-architecture.md §1`; infrastructure does not encode it yet.
- NOT an expansion of feedback-v3 to more than three personas. Operator discipline per OSTROM §9 Leg E.
- NOT a rewrite of `seed-forge-packs.ts`. Deprecation flagged; actual deletion waits for cycle-002.
- NOT a resolution of archivist's underutilization (GECKO §7 — 13 packs emit events archivist ignores). Separate cycle; depends on event-bus runtime existing, which this cycle does not build.

---

## 10 · Meta — what landing this cycle proves

If this cycle lands cleanly, it proves the *infrastructure-first covenant*:

1. **Schema emerges from evidence, not prospect.** Legs A-E produce data rows (`discovery_runs`, `visibility_transitions`, `construct-trajectory.jsonl`, `feedback-v3.jsonl`). Cycle-002 designs Axes 2/3/5/8 schemas *against real patterns in those rows*, not against hypothetical futures.
2. **Private→public is a ritual, not a risk.** Tier-A flips execute cleanly via checklist + webhook + guardrail. Future flips become trivial. The moat stops being visibility; it can shift to license + corpus + craft (per `small-team-craft-economics`).
3. **Prior art integration beats invention.** STAMETS §2's three HIGH_SIGNAL transfers (Polar, progressive disclosure, OIDC+CAS) land — two directly (Polar scaffold, progressive disclosure via Leg D's metadata-first shape), one indirectly (OIDC comes with GitHub App install). No standards forked. One overlay on Anthropic Skills.
4. **The construct-network doesn't orbit spiraling.** This cycle fits spiraling because the shape fits — bounded, evidence-friendly, convergence-seeking. The rest of the network (feel-registers, ambient UIs, lore-bible authoring) doesn't need spiraling and this SEED doesn't try to force it.
5. **OTLET supersession discipline works across personas.** This SEED supersedes three prior design docs (§11 below) not by overwriting but by absorbing their load-bearing legs into A/B/C and explicitly reference-floor-ing the rest. The chains stay walkable; the content stays preserved; retrieval prefers this SEED first.

If those five don't hold — if Leg D produces noise not signal, if Tier-A flips leak secrets, if Polar's scaffold stays unused indefinitely, if Axis 2/3 schemas never crystallize from the data — then the learning is bigger: maybe infrastructure-first is wrong for this network and we should swap to doctrine-first. That would feed a larger reorient (cycle-003 or a Bonfire session), not cycle-002.

The cycle is designed to *validate the covenant*, not just ship code.

---

## 11 · Supersession note — what this SEED absorbs, what stays reference-floor, what it explicitly does NOT supersede

Per OTLET Principle 3 (chain rather than overwrite) and supersession-chain convention.

### What this SEED SUPERSEDES (these documents are now `reference-floor`; retrieval prefers this SEED for cycle-dispatch purposes)

| Document | How absorbed | Status |
|---|---|---|
| `grimoires/bridgebuilder/auto-sync-architecture.md` (2026-03-05) | Layer 1 Discovery → Leg A. Layer 2 Sync (push webhook) → existing. Layer 3 Visibility → Leg B. Schema additions (visibility column, discovered_at, auto_discovered) → already shipped per OSTROM §1. Org-member auth deferred per OSTROM §3 public-first. | **SUPERSEDED-BY: this SEED** — remains valuable as the original Layer-1/2/3 reasoning trace; don't re-read for dispatch. |
| `grimoires/bridgebuilder/context/construct-dx-universal-fix.md` | Fix 1/2/3 → Leg C verbatim. | **FOLDED-INTO: Leg C**. Doc stays as canonical source for the fix shape; referenced by SEED. |
| `~/hivemind/strategy/construct-network-feedback-2026-04-20.md` (8 axes) | Axis 1 → Leg D. Axis 7 → Leg E. Axis 6 → Leg F (scaffold only). Axes 2, 3, 4, 5, 8 → **DEFERRED** until D+E produce data. Staged-rollout §4 priorities 1-3 honored; 4-7 deferred. | **PARTIALLY-SUPERSEDED: 3 of 8 axes absorbed**; remainder reference-floor with activation condition: "re-read when Leg D + E produce 2+ weeks of corpus data." |
| `grimoires/bridgebuilder/constructs-network-review.md` CRITICAL-1 | → Leg A. | **RESOLVED-BY: Leg A**. |
| `grimoires/bridgebuilder/constructs-network-review.md` HIGH-1 | → Leg C. | **RESOLVED-BY: Leg C**. |
| `grimoires/bridgebuilder/constructs-network-review.md` MEDIUM-1 (private constructs deferred) | → Leg B. | **RESOLVED-BY: Leg B**. |

### What STAYS active (not superseded; still authoritative in their domains)

| Document | Why still active |
|---|---|
| `~/hivemind/wiki/concepts/life-patterns-as-doctrine.md` | The grandmother-test is applied *by* this SEED; the doctrine itself is unchanged. |
| `~/hivemind/wiki/concepts/riding-loa-endgame.md §12` | 5-layer composition stack — Leg E maps to L5; doctrine stays canonical. |
| `~/hivemind/wiki/concepts/agent-native-civic-architecture.md` | Civic-layer split remains doctrine-only this cycle (Axis 3 deferred). Doctrine stays load-bearing. |
| `grimoires/loa/context/operators-manual.md` | §8 spiraling-usage guidance is applied by this SEED (cycle fits spiraling); manual remains the operator entry-point. |
| `grimoires/bridgebuilder/stack-architecture-thesis.md` | Phase 0 stance (stay on viem/wagmi) remains; this cycle does not touch the stack thesis. |
| `grimoires/bridgebuilder/constructs-network-review.md` CRITICAL-2 (triple API surface) | Partially resolved upstream; full consolidation is a later-cycle concern. |
| `grimoires/bridgebuilder/constructs-network-review.md` HIGH-2/HIGH-3 | Already resolved upstream (per review doc notes). Reference-floor. |
| `grimoires/purupuru/lore-bible.md` + `taste.md` + all world-side canon | Untouched. |

### What this SEED explicitly DOES NOT supersede

- Any construct pack's `construct.yaml`, `persona.yaml`, or `expertise.yaml`. Pack-level authoring remains the pack-author's domain. GECKO flagged drifts (beacon, observer/beehive, hypha) are pull-threads, not SEED scope.
- `grimoires/purupuru/*` — this is a loa-constructs cycle, not a Purupuru cycle.
- Any of Lily's GTM packs (gtm-collective, herald, showcase, social-oracle, growthpages). GTM surfaces wait for Purupuru ships, not infra cycles.
- cycle-103 HoloCard SEED. Parallel cycle in `world-reliquary` worktree; no overlap.
- `stack-architecture-thesis` Effect-ts proposal. Phase 0 stance unchanged; typed-error adoption waits for a Protocol-skill validation cycle.

### Absent peer report: KEEPER (drift-note)

OTLET notes that `keeper-friction-profile.md` did not land before synthesis threshold was met (3 of 4 peer reports). OSTROM §8 pre-emptively absorbed one known KEEPER signal (stranded-PENDING labs per `operators-manual §8` friction-signature #4). Full KEEPER friction profile is an operator-gated pull-thread (below) — cycle-002 seed should consume KEEPER's report explicitly if landed by then.

---

## 12 · Pull-threads — what naturally emerges during or after this cycle

Five to seven threads, each tagged **operator-gated** or **auto-dispatchable**, per dispatch policy.

### PT-1 · observer/beehive dual-slug reconciliation
**Surface**: GECKO §4. Pack ships under two directory names with identical `construct.yaml`. Half-landed rename.
**Shape**: one-line operator call — keep which name? Then delete the other directory + update references.
**Tag**: **operator-gated** (naming decision; agent should not pick).
**Trigger**: after cycle closes; 15-minute operator conversation.

### PT-2 · Slash-command collision rename (`/dig`, `/forge`, `/map`)
**Surface**: GECKO §3. `k-hole:dig` vs `hypha:dig`; `k-hole:forge` vs `noether:forge`; `hypha:map` vs `rosenzu:map`.
**Shape**: namespace-aware slash-command resolver OR rename the colliding commands. GECKO recommends the latter for blast-radius minimization.
**Tag**: **operator-gated** (naming; affects downstream muscle memory).
**Trigger**: when operator notices a command fires the wrong construct. Could dispatch as a mini-cycle once the fourth operator-session bumps into it.

### PT-3 · Beacon persona rewrite
**Surface**: GECKO §4. "Signal Engineer / SEO" persona, skills are Dialect-Actions / Blinks / payments. Identity drift — worse than #181 flagged.
**Shape**: rewrite `persona.yaml` to match current skills OR split beacon into two packs (one for SEO/crawl, one for payment-actions). Ties to STAMETS §4 (Polar adoption) — beacon could become the "accepting-payments" pack's home.
**Tag**: **operator-gated** (identity authorship).
**Trigger**: once Polar scaffolding from Leg G demands a caller; beacon is the natural home.

### PT-4 · Install-surface consolidation (Pashov's credibility signal)
**Surface**: GECKO §8. Five install commands shown to users. Pashov noticed the inconsistency — a credibility debt, not docs debt.
**Shape**: pick `npx constructs install <slug>` as canonical (already the registry-backed path). Retire or redirect legacy surfaces (`@loa-constructs/cli`, `loa-cli`, `claude skills add`). Update tutorials, kickoff docs, SKILL.md references.
**Tag**: **auto-dispatchable** (mechanical consolidation once operator ratifies the canonical name).
**Trigger**: post-cycle, before next external-facing demo. Pashov's signal is on record; external trust payoff is high.

### PT-5 · Optional-dep cleanup (10 edges)
**Surface**: GECKO §6. Five hard `pack_dependencies` that should be optional (showcase→k-hole, vfx→k-hole, protocol→observer, protocol→artisan, the-arcade→observer). Plus the observer↔crucible true cycle.
**Shape**: pack-level edits in 5-8 pack manifests. Move edges from required to optional. Resolve observer↔crucible asymmetric circular by making observer→crucible optional (crucible already has observer as optional).
**Tag**: **auto-dispatchable** (mechanical; each edit is reversible; tested by clean install).
**Trigger**: post-cycle. Unblocks ~40% of install paths per GECKO §6.

### PT-6 · Archivist event-subscription expansion
**Surface**: GECKO §7. 13 packs emit `forge.*` events; archivist consumes from only 2 sources (observer, k-hole).
**Shape**: after event-bus runtime exists (NOT THIS CYCLE — depends on loa-finn or a new event-bus construct), expand archivist's consumption to match its `compose_with` claims (the-arcade, hivemind-os) or prune the claims.
**Tag**: **operator-gated** (requires new event-bus runtime which is its own cycle authorization).
**Trigger**: after event-bus cycle lands. Not next.

### PT-7 · KEEPER friction profile absorption + Axes 2/3/4/5/8 design pass
**Surface**: OTLET drift-note in §11 (KEEPER report absent) + OSTROM §8 (5 of 8 axes deferred).
**Shape**: once Leg D + E produce 2+ weeks of trajectory + feedback-v3 data, *and* KEEPER's friction profile is filed, seed cycle-002 to design Axes 2 (territory), 3 (civic-layer schema), 5 (orchestration router), 8 (micro/macro loop split) *against evidence*. Axis 4 (invocation vocabulary tiers) can seed sooner — doctrine work, not infra.
**Tag**: **operator-gated** (data-maturity + KEEPER-filing judgement).
**Trigger**: operator review at ≥2 weeks post-cycle, with `jq` corpus sanity-check + KEEPER's report in hand.

---

## 13 · Memory-flow map (Phase 1 crystallization, OTLET convention)

Per OTLET §2 (the supersession chain) — what composes here, what gets pushed to reference-floor, what remains open.

```
PRIOR DESIGN WORK ──────────────────────▶ THIS SEED ─────────────▶ POST-CYCLE PULL-THREADS
                                              │
auto-sync-architecture.md    ──absorb──▶   Leg A + Leg B
construct-dx-universal-fix.md ──absorb──▶  Leg C
construct-network-feedback   ──partial──▶  Leg D (Axis 1)
  (8 axes)                                  Leg E (Axis 7)
                                            Leg F (Axis 6 scaffold)
                                            ──defer──▶  cycle-002+ seed (Axes 2/3/4/5/8)
constructs-network-review    ──resolve──▶  Leg A (CRITICAL-1), Leg C (HIGH-1), Leg B (MEDIUM-1)
                                            ──stays active──▶  CRITICAL-2 (triple API) future cycle
stack-architecture-thesis    ──preserve──▶  Phase 0 stance; no action this cycle
STAMETS prior-art            ──adopt──▶    Leg E (progressive disclosure)
                                            Leg G (Polar scaffold)
                                            ──speculation──▶  Vision Registry (OCI transport)
GECKO friction evidence      ──inform──▶   Leg A + Leg C acceptance criteria
                                            ──pull-thread──▶  PT-1 through PT-5
KEEPER friction profile      ──ABSENT──▶   PT-7 (cycle-002 dependency)

life-patterns-as-doctrine    ──gate──▶     grandmother-test passed for all 7 legs (plumbing ≈ phonebook ≈ ancient)
operators-manual §8          ──gate──▶     cycle shape fits spiraling (bounded + evidence-friendly + convergence)
```

Confidence on this map: 0.85. Decay class: cycle-seed (90d — after cycle closes, map becomes episodic record).

---

*OTLET synthesis complete. 2026-04-21. The plumbing is named. The schemas wait. The grandmother would recognize this — close the back door, then see what grows.*

---

## 14 · Post-compose amendments (2026-04-21 late, operator-surfaced)

Four load-bearing intel pieces landed after initial synthesis. Absorbed here as surgical adjustments, not re-compose.

### 14.1 · KEEPER report landed — findings absorbed

`grimoires/loa-constructs-seed-2026-04-21/keeper-friction-profile.md` arrived post-compose with 3 operator-level signals:

1. **Single-author corpus** — every comment on every reviewed issue is `@zkSoju`; external builders have filed zero issues. The *channel* isn't broken — see §14.2. Signal downgraded to "discoverability of existing channel," not "build new channel."
2. **Half of the architectural work is already designed; remaining friction is ship-latency** — confirms this SEED's shape. Bridgebuilder grimoires resolve F1/F3/F5/F6 at design level; spiraling's correct role is **shipping debt closure**, not re-design. Validates the 7-leg scope.
3. **Zero instrumentation for own friction** — `.run/audit.jsonl` is 0 bytes in this repo; 6/7 observer-as-Laboratory metrics unmeasured. Leg D trajectory emission **IS** the first-class instrumentation surface. Validated.

**Six concrete friction events mapped (F1-F6)** — each already has coverage in a leg:

| KEEPER finding | Leg coverage |
|---|---|
| F1 `/dig` broken on installed packs (#171) | Leg C (construct.yaml primary, eliminates manifest staleness) |
| F2 Seed run destroys DB visibility state (comment 1 of #171) | **NEW: §14.3 — Leg A acceptance gains idempotency criterion** |
| F3 Schema v1→v3 has no migration tooling (#117) | Deferred to PT-8 (new — below) — not this cycle |
| F4 Spawned agents don't inherit construct context (#184) | Leg D partial (trajectory sees spawns); full fix is OSTROM §6 L1+L2 hybrid, sized as follow-up cycle |
| F5 Three install commands for one action (#181) | **PT-4 already captured; no leg change** |
| F6 Product-repo grimoires invisible to registry | Leg D trajectory + Leg E feedback-v3 emission surface this over time (D+E make downstream visible) |

### 14.2 · `/feedback` v3.0.0 is the external-builder feedback surface (already built)

`loa/.claude/commands/feedback.md` ships with **Smart Routing Classification** that routes feedback between `loa` / `loa-constructs` / `forge` / project. "**Construct-aware routing files issues on construct vendor repos with content redaction. Open to all users (OSS-friendly).**"

This resolves KEEPER §3 point 1 (single-author corpus) at the *channel level* — the channel exists, is externally reachable, and routes correctly. The gap is *discoverability*, not infrastructure.

**Adjustment to Leg B**: the `.github/install-constructs-app.md` runbook gains a subsection "**Feedback channel for external users**" — one paragraph pointing to `/feedback` + a link to the canonical invocation. Zero new code.

**Closes cycle-level concern** "external builder DX needs a new feedback surface" — no, it doesn't. The surface exists. It needs to be *pointed at* from onboarding copy.

### 14.3 · KEEPER F2 — `seed-forge-packs.ts` destructive idempotency (Leg A acceptance amendment)

KEEPER F2 surfaced a destructive bug buried in a comment (no dedicated tracker): `seed-forge-packs.ts` upsert includes `visibility = EXCLUDED.visibility`, so every seed run overwrites with `construct.yaml`'s `public`. Author quote: *"Had to manually fix visibility via SQL 3 times in one session after re-seeding."*

**Adjustment to Leg A AC** (adds one criterion):

> **AC-A5 (NEW)**: `POST /v1/admin/discover` does NOT overwrite existing `packs.visibility` values when the construct.yaml value would be a demotion from a higher-privacy state. The discover service reads current DB state, diffs against repo-declared state, and *preserves the operator's DB-set visibility* — the **`source_commit` three-way-merge pattern from Rajiv Pant's AI-skills three-repo architecture** (see §14.4). Migrate the bug in `scripts/seed-forge-packs.ts` by deprecating the script (Leg A's existing intent) AND ensuring `services/discovery.ts` never inherits its destructive upsert semantics.

**Also**: the Leg B `guardVisibilityTransition` demote-only guard (`webhooks.ts:575`) already catches public→private silently. Extend it to explicitly LOG the blocked transition to `visibility_transitions` audit table with `source: 'guard_block'` so operator can find what almost-broke.

### 14.4 · Leg C enrichment — three-repo architecture + source_commit pattern (STAMETS DIG 2026-04-21)

Fresh k-hole dig (11 sources, depth++, trail at `grimoires/k-hole/research-output/dig-session-2026-04-21.md`) surfaced:

- **Anthropic SKILL.md (late 2025) catalyzed a decentralized ecosystem** — Vercel's `skills.sh` is "npm/brew for AI skills." Our public-first direction is industry-aligned.
- **Rajiv Pant's three-repo architecture** — *public registry + private org + user overrides*. Maps 1:1 to operator's tiered audience directive (internal 3mo → external 6mo → agent corpus throughout).
- **`.source.json` with `source_commit`** — three-way merges prevent overwrite-on-update. Directly addresses KEEPER F2 (§14.3) at pattern level.
- **`.well-known` proposal for Agent Skills discovery** — emerging standard, watch for adoption.
- **girofu/skill-fetch + OpenClaw ClawHub** — quality scoring, vector search, security scanning. Not this cycle; pull-thread PT-9 (new — below).
- **Geoffrey Huntley's "Ralph Wiggum loop"** — declarative skill execution via success criteria + bash verification. Philosophical alignment with operators-manual §8 true-name discipline.

**Adjustment to Leg C** (adds one scope item):

> **Leg C additional scope**: when a locally-cloned construct diverges from upstream (user has edited `SKILL.md` or `construct.yaml`), `constructs-install.sh` must preserve the divergence on re-sync. Implement Pant's `.source.json` pattern: after install, write `~/.loa/constructs/packs/<slug>/.source.json` with `{source_repo, source_commit, installed_at}`. On `constructs-install.sh upgrade <slug>`, compute three-way merge (base = source_commit, local = working tree, remote = latest upstream). Conflict → prompt operator, don't overwrite. Zero-diff → no-op. Fast-forward → apply. This is the minimum-viable skill-lifecycle management — don't build git replacement; ride it.

**Acceptance addition**: AC-C4: "a user who edits a local construct then runs `constructs-install.sh upgrade` is prompted on conflict, never silently overwritten. `.source.json` round-trips cleanly across install → edit → upgrade."

### 14.5 · `trust_level` as optional column in `packs` migration (Leg A)

El Capitan's Hypha construct declares `trust_level: L2` in its `construct.json` (schema v1). Our current `packs` table has no such column. The field is **emerging from external-builder evidence**, not prospective design — precisely the infrastructure-first pattern.

**Adjustment to Leg A migration**: add `trust_level` as nullable `varchar` to the `packs` table in `00NN_discovery_runs.sql`. Populate during discover-upsert if the construct declares it. Default null. No validation layer this cycle — evidence-emergence only. A future doctrine-cycle defines the L1/L2/L3 trust ladder.

### 14.6 · External-builder baseline — TWO active communities (not one)

Full scan conducted via GECKO-lens 2026-04-21 late. External-Loa-using ecosystem is broader than initial SEED composition assumed.

#### 14.6.a · 0xElCapitan / apDAO — 7 public repos

- **Hypha** (public, `construct.json` schema_v1, `trust_level: L2`, links `constructs.network/catalog/hypha`) — Berachain PoL historian
- **Forge** (Shell) — Feed-Adaptive Oracle & Runtime Generator
- **Tremor, Corona, Breath** — seismic / space-weather / air-quality oracle constructs for Echelon
- **loa** (fork), **loa-finn**, **loa-hounfour** — framework dogfooding + schema-only protocol libs

Already registered in `registry-sources.yaml`: `hypha` under `external:` namespace.

GECKO §3 `/dig` collision is confirmed real (Hypha declares `commands: [map, dig, flows, build, bounds]`). PT-2 slash-command rename is a real external-coordination issue, not just internal-naming hygiene.

#### 14.6.b · AITOBIAS04 — ~20 public repos, the other half

The second active external-builder community. Overlap with El Capitan is significant — both publish `breath / corona / tremor / forge` — jointly held or co-built oracle constructs. AITOBIAS04's specific additions:

- **Echelon** — "Verification Substrate" (prediction-market / verification framework)
- **echelon-core** — 3-tier architecture (Core verification engine + Integration Layer for constructs + Expression Layer for Workspace/Environment/Theatre). Echelon-core is a **Loa-configured PROJECT** (has `.beads/`, `.claude/`, `.loa-version.json`, `.loa.config.yaml`), not itself a construct pack — it consumes Loa.
- **loa** (their own variant) — "Ostrom-compliant commons governance & development system for AI agents to assist building products from requirements to production & deployment." Parallel framework, not a construct.
- **aeon** — "most autonomous agent framework, no approval loops, no babysitting"
- **OpenViking** — file-system-paradigm context database for AI agents
- **MiroFish, Crucix, shadowbroker, worldmonitor, empire-agent-first, gradient-bang, autoresearch, llm-wiki, miner-manifold, timesfm** — adjacent AI/agent/intelligence ecosystem

**TREMOR's README** publicly credits: *"built on Soju's constructs and ridden by Loa"* — dependency declared openly.

Neither AITOBIAS04 orgs nor specific AITOBIAS04 constructs are registered in `registry-sources.yaml` yet. **PT-10 (new)** below.

#### 14.6.c · Registry-sources.yaml — the existing external-construct mechanism

File exists at `registry-sources.yaml` in loa-constructs repo root. Current state:
- **Live**: `hypha` (El Capitan)
- **Candidate (commented)**: `w3ga` (0xHoneyJar — privacy-first Web3 analytics, needs `construct.yaml` before sync)
- **Not yet registered**: any AITOBIAS04 construct, El Capitan's `forge/tremor/corona/breath` (though these may be duplicates of AITOBIAS04 co-built versions)

**Adjustment to Leg A (NO new acceptance — informational)**: the `services/discovery.ts` scan should merge `registry-sources.yaml` entries with org-discovered repos, preserving both authors' work. Already implied by the existing seed script; confirm in implementation.

#### 14.6.d · Structural implication — two builder communities, not one

The infrastructure we're shipping (Leg A discover, Leg B repo-visibility webhook, Leg C `construct.yaml`-primary, Leg D trajectory) must hold for external builders *under their own orgs*, not just 0xHoneyJar. Concretely:

- `POST /v1/admin/discover` should accept an optional `owner` parameter to scan specific external orgs (operator-triggered), not just the default 0xHoneyJar namespace
- Tier-A flip ritual (Leg B) is **0xHoneyJar-internal only**. External builders handle their own visibility; our webhook subscribes to whichever events they choose to send us (when they register with our webhook URL)
- Leg C's `construct.yaml`-primary discipline must tolerate `construct.json` (Hypha's schema-v1) as well. Already noted in GECKO §4; re-emphasized here.

### 14.7 · Three new pull-threads surfaced (append to §12; supersede prior §14.7 count)

- **PT-8 · Schema v1 → v3 migration tooling** (KEEPER F3 / #117): Observer pack migration was 27-files × hand-authored; 4 more packs queued at schema_v1. Needs semi-automated migration CLI. Tag: **operator-gated** (doctrine work; not next). Trigger: when ≥2 external construct authors request it.
- **PT-9 · Construct quality scoring + security scanning** (from DIG): girofu/skill-fetch + ClawHub patterns. Scoring = `{usage, stability, composition-symmetry, trust_level, emission-density}`. Tag: **auto-dispatchable after corpus has 2+ weeks of Leg D/E data**. Trigger: data maturity.
- **PT-10 · External-builder registry expansion + AITOBIAS04 onboarding**: extend `registry-sources.yaml` with AITOBIAS04 constructs (specifically the `breath/corona/tremor/forge` entries if co-built, or references to the Echelon-native versions). Coordinate with AITOBIAS04 via direct outreach — their TREMOR already credits us. Tag: **operator-gated** (partnership coordination, not mechanical). Trigger: post-cycle, after Leg A's discover endpoint proves stable — then extend to external orgs.

### 14.7 · Two new pull-threads surfaced (append to §12)

- **PT-8 · Schema v1 → v3 migration tooling** (KEEPER F3 / #117): Observer pack migration was 27-files × hand-authored; 4 more packs queued at schema_v1. Needs semi-automated migration CLI. Tag: **operator-gated** (doctrine work; not next). Trigger: when ≥2 external construct authors request it.
- **PT-9 · Construct quality scoring + security scanning** (from DIG): girofu/skill-fetch + ClawHub patterns. Scoring = `{usage, stability, composition-symmetry, trust_level, emission-density}`. Tag: **auto-dispatchable after corpus has 2+ weeks of Leg D/E data**. Trigger: data maturity.

### 14.8 · Dispatch command unchanged

The spiral-harness command in §5 stands. The §14 amendments are encoded inside the task-string adjustments:

- Leg A AC gains AC-A5 (idempotency preservation)
- Leg A migration gains `trust_level` column
- Leg B runbook gains `/feedback` onboarding subsection
- Leg C scope gains `.source.json` three-way-merge pattern + AC-C4

These fit inside the existing $220 target / $280 cap. No budget change. Profile stays `standard`.

### 14.9 · UX/DX target — skills.sh simplicity + composable-expertise-legos + KISS

Operator direction 2026-04-21 late: *"our target UX/DX is https://skills.sh/docs CLI + ease of getting it on the network. The key difference will be the composability and node-like approach we take with it (similar to how /hivemind is built — constructs built and visualized this way). It gets messy when you fork across the Loa ecosystem and separate repos. Keep it simple. KISS. Composable expertise legos is the idea."*

**The lens**: every leg this cycle should be evaluated against two anchors:

1. **Skills.sh floor** — install is ONE command (`npx constructs install <slug>` or whatever canonical emerges from PT-4). Discovery is easy. Getting on the network is easy. No special ceremony. No mandatory manifest.json rewriting. No auth maze for public constructs. Match the feel of `npx skills add`.
2. **Composable-legos differentiator** — constructs are pieces that snap together. Composition is first-class (Leg F recipes are the scaffold). The node-graph visualization (future — **PT-11** below) is how the composition becomes visible to the operator and eventually to external builders. Like hivemind's Obsidian graph view — edges between entities render as a network, not a flat list.

**KISS constraint on this cycle**:

- **Do NOT build the node-graph viz layer this cycle.** It's PT-11 (auto-dispatchable once Leg D produces invocation-edge data + Leg F produces composition-recipe files). Infrastructure-first covenant: data first, viz emerges from data.
- **Do NOT add new install commands.** PT-4 consolidation (five surfaces → one) lands as a fast-follow after this cycle, not within it. The canonical is `npx constructs install <slug>` — the `npx skills add` analog.
- **Do NOT multiply the `construct.yaml` / `construct.json` schema tolerance.** Leg C already covers yaml-primary + json-legacy (Hypha's schema_v1). DO NOT introduce a third shape in this cycle even if a new external builder requests it. KISS.
- **Do NOT encourage Loa framework forks.** The ecosystem already has two external `loa` forks (0xElCapitan/loa, AITOBIAS04/loa). Fragmentation is a known tax. This cycle doesn't resolve it, but explicitly DOES NOT add to it — no new variants, no new alt-Loa conventions.

**Vision phrase canonized**: *composable expertise legos*. Register in hivemind (see `~/hivemind/wiki/concepts/composable-expertise-legos.md`).

**What the grandmother recognizes in this**:
- LEGOs: pieces with studs that fit standard holes. Don't customize the stud-pattern.
- A toolbox: each tool has one job. Adding a tool to the box doesn't change the tools already in it.
- A recipe book: shared vocabulary of dishes built from ingredients that are themselves shared.

### 14.10 · PT-11 added (the node-graph viz layer)

**PT-11 · Node-graph visualization of construct composition**

Mirror the `/hivemind` graph view for constructs. Render the composition network: constructs as nodes, `compose_with` / `compose_from` / `governs` / `governed_by` / `emits → consumes` as edges. Layer in invocation-frequency from Leg D trajectory (edge weight = traffic); overlay GECKO's asymmetric-compose finding (dashed edge = claim without reciprocation); overlay civic-layer (node color = system vs participation).

**Shape**: Svelte + D3 (or sigma.js / vis-network) panel in `apps/explorer/`. Reads:
- `packs` table for node inventory
- `discovery_runs` + `visibility_transitions` for lifecycle state
- `.run/construct-trajectory.jsonl` (Leg D output) for edge weights
- `feedback-v3.jsonl` (Leg E output) for verdict overlays
- `compositions/*.yaml` (Leg F output) for known-good-pair highlighting

**Tag**: **auto-dispatchable once Leg D produces 2+ weeks of trajectory + Leg F ships composition recipes**. No new data layer required — purely a read-path.

**Why it matters**: external builders will understand "composable expertise legos" instantly when they can *see* the composition graph. It's the visual proof of the KISS promise. Hivemind's graph view makes structure legible at a glance — constructs deserve the same.

**Explicit non-goal this cycle**: build the viz. Infrastructure-first — Leg D + F produce the data; the viz can ship as a separate follow-up cycle or as a fast-follow side-project when Leg D has accumulated enough for the graph to be non-trivial.

---

*Amendment 2026-04-21-LATE. KEEPER landed; `/feedback` channel discovered; Pant's `.source.json` addresses F2; El Capitan's `trust_level` emerges into our schema as observed-not-invented. The SEED is now dispatch-ready with post-compose intel absorbed. Grandmother nods — the close-the-back-door plan remains; we just noticed one door was already closed, and another had a latch we hadn't seen.*

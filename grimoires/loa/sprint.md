# Sprint Plan: R&D Synthesis — Measurement Honesty

**Cycle**: cycle-035
**Created**: 2026-02-22
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Sprints**: 3 (global IDs: sprint-34, sprint-35, sprint-36)
**Team**: Solo (single-agent)

---

## Sprint 1: Measurement Foundation (P0)

**Global ID**: sprint-34
**Goal**: Database migration, signal outcomes API, fork provenance, graduation criteria fix
**Priority**: P0 — all other sprints depend on this schema

### Task 1.1: Migration 0006 — Schema Foundation

**Files**: `apps/api/src/db/schema.ts`, `apps/api/drizzle/0006_measurement_honesty.sql`

**Description**: Create migration `0006_measurement_honesty.sql` with:
- `forked_from UUID REFERENCES packs(id)` column on `packs` table
- `skill_prose TEXT` column on `packs` table
- `signal_outcomes` table (full DDL from SDD §3.1.2)
- `construct_showcases` table (full DDL from SDD §3.1.3)
- All indexes per SDD

Update Drizzle schema in `schema.ts`:
- Add `forkedFrom` and `skillProse` to packs definition
- Add `signalOutcomes` table definition with constraints
- Add `constructShowcases` table definition
- Update `packsRelations` with `forkedFromPack` relation

**Null handling**: Both new packs columns (`forked_from`, `skill_prose`) are nullable. Existing rows get NULL. Application code must handle NULL for both: `forkedFrom: pack.forkedFrom ?? null` in mapping, `skillProse: pack.skillProse ?? null` in sync. No backfill needed — see SDD §3.1.1 rationale.

**Rollback strategy**: All changes are additive (no column removals, no type changes). Rollback = revert code deploy; columns and tables remain unused. If migration partially fails, `signal_outcomes` and `construct_showcases` are independent tables that can be created/dropped individually. The `ALTER TABLE packs ADD COLUMN` statements are also independent and can be retried.

**DDL reference**: See SDD §3.1.1–§3.1.3 for exact DDL. Key constraints to verify:
- `signal_outcomes.no_self_evaluation`: CHECK (recorded_by IS DISTINCT FROM evaluated_by)
- `signal_outcomes.unique_signal_evaluation`: UNIQUE (pack_id, signal_type, signal_source)
- `signal_outcomes.predicted_impact`: CHECK IN ('high', 'medium', 'low')
- `signal_outcomes.actual_impact`: CHECK IN ('high', 'medium', 'low', 'none')

**Acceptance Criteria**:
- [ ] Migration runs cleanly on empty DB and on DB with existing 0005 migration
- [ ] Migration tested on production-like snapshot (existing packs with data)
- [ ] `pnpm drizzle-kit generate` shows no diff after schema.ts update
- [ ] All FK constraints, CHECK constraints, and UNIQUE constraints in place
- [ ] Indexes created: `idx_packs_forked_from`, `idx_signal_outcomes_pack`, `idx_signal_outcomes_evaluated`, `idx_construct_showcases_pack`, `idx_construct_showcases_approved`
- [ ] Existing packs queries work unchanged with null forked_from and null skill_prose

**Dependencies**: Migration 0005 must be verified in production
**Effort**: Small

---

### Task 1.2: Signal Outcomes API — Core Endpoints

**Files**: NEW `apps/api/src/routes/signals.ts`, NEW `apps/api/src/services/signals.ts`, `apps/api/src/index.ts` (mount router)

**Description**: Implement the signal outcomes API per SDD §4.1:

1. `POST /v1/packs/:slug/signals/outcomes` — Create signal outcome prediction
   - Resolve slug → pack_id, verify isPackOwner
   - Rate limit: 50/hour per user (Redis key: `rl:signals:create:{userId}`, follows existing `checkSyncRateLimit()` pattern in packs.ts)
   - Sanitize inputs, insert with recorded_by = userId

2. `PATCH /v1/packs/:slug/signals/outcomes/:id` — Evaluate a recorded signal
   - Auth: `isPackOwner() || isAdmin()` AND `userId !== recorded_by`
   - Single-maintainer exception: allow self-eval, flag it
   - Sanitize outcome_summary
   - Invalidate accuracy cache on write

3. `GET /v1/packs/:slug/signals/outcomes` — List outcomes (public, summaries only)
   - Returns outcome_summary, never outcome_evidence
   - Pagination: page + per_page
   - Computed field: self_evaluated boolean

4. `GET /v1/packs/:slug/signals/outcomes/detail` — List with evidence (owner only)
   - Same as above but includes outcome_evidence
   - Auth: isPackOwner

Add `isomorphic-dompurify` to `apps/api/package.json` for sanitization.

**Acceptance Criteria**:
- [ ] POST creates outcome with correct recorded_by, returns 201
- [ ] POST returns 403 for non-owner, 429 for rate limit, 409 for duplicate (pack_id, signal_type, signal_source)
- [ ] PATCH updates actual_impact, evaluated_by, evaluated_at
- [ ] PATCH returns 403 for self-evaluation (non-single-maintainer), 403 for non-owner/non-admin
- [ ] PATCH by non-owner non-admin returns 403 (explicit test)
- [ ] PATCH with userId === recorded_by returns 403 unless single-maintainer (explicit test)
- [ ] GET public returns outcome_summary, never outcome_evidence
- [ ] GET detail returns full data, 403 for non-owner
- [ ] All text inputs sanitized (HTML stripped)
- [ ] Rate limit returns 429 after 50 requests/hour (Redis-based, per-user key)

**Dependencies**: Task 1.1
**Effort**: Medium

---

### Task 1.3: Signal Accuracy API — Computation + Caching

**Files**: `apps/api/src/services/signals.ts` (add computeAccuracy), `apps/api/src/routes/signals.ts` (add accuracy endpoint)

**Description**: Implement accuracy computation per SDD §4.1.5–4.1.8:

1. `GET /v1/packs/:slug/signals/accuracy` — Public accuracy report
   - Redis cache: `accuracy:{packId}` with 10min TTL
   - Invalidated on PATCH evaluation write

2. `computeAccuracy()` service function:
   - Build 3×4 confusion matrix (predicted high/medium/low × actual high/medium/low/none)
   - Compute per-class precision/recall
   - Compute weighted kappa (linear weights, ordinal scale)
   - Reference implementation: match scikit-learn `cohen_kappa_score(weights='linear')` output
   - Self-evaluated outcomes excluded from kappa (weight = 0)
   - Coverage: evaluated/total ratio
   - Time-to-outcome: median, p25, p75
   - Warnings: sample < 20, coverage < 50%, self-eval > 20%
   - **Degenerate cases**: All predictions same class → kappa = 0 (not NaN). Zero evaluated outcomes → `sufficient_data: false`. Division by zero in precision/recall → 0.

3. TypeScript interfaces: `SignalOutcome`, `SignalOutcomePublic`, `AccuracyReport`, `ClassMetrics` (SDD §4.1.8)

4. **Redis fallback**: If Redis unavailable, compute accuracy on every request (no cache). Log warning, do not error. Use try/catch around Redis get/set — never let cache failure break the accuracy endpoint.

**Golden Test Fixtures**: Include at least 3 hardcoded test datasets with pre-computed expected outputs:
- Fixture A: Perfect agreement (kappa = 1.0, all predictions match outcomes)
- Fixture B: Random/no agreement (kappa ≈ 0.0)
- Fixture C: Mixed with some self-evaluations excluded (verify exclusion logic)
Verify against scikit-learn `cohen_kappa_score(weights='linear')` output. Store fixtures in test file, not external dependency.

**Acceptance Criteria**:
- [ ] Accuracy endpoint returns correct confusion matrix for test dataset
- [ ] Weighted kappa matches scikit-learn reference for all 3 golden fixtures (tolerance ±0.001)
- [ ] Returns `sufficient_data: false` when sample_size < 20
- [ ] All-same-class predictions return kappa = 0 (not NaN/Infinity)
- [ ] Self-evaluated outcomes excluded from kappa, reported separately
- [ ] Redis cache hit on second request; invalidated after PATCH evaluation
- [ ] Redis unavailable → computes without cache, no error returned
- [ ] Warnings fire at correct thresholds (20% self-eval, 50% coverage, 20 sample size)
- [ ] Empty data returns clean empty state, not error

**Dependencies**: Task 1.2
**Effort**: Medium

---

### Task 1.4: Fork Provenance — Endpoint Fix + API Response

**Files**: `apps/api/src/routes/packs.ts:~1709`, `apps/api/src/services/constructs.ts`

**Description**: Per SDD §4.2:

1. Fix `POST /packs/fork` to pass `forkedFrom: sourcePack.id` to createPack()
2. Add `forkedFrom` and `forkCount` to `Construct` interface
3. In `getConstructBySlug` (detail path only): join forked_from → parent slug/name, count forks
4. In list path: `forkedFrom: null, forkCount: 0` (lightweight defaults, no N+1)

**Acceptance Criteria**:
- [ ] POST /packs/fork sets forked_from FK on new pack
- [ ] GET /v1/constructs/:slug returns forked_from with slug + name when present
- [ ] GET /v1/constructs/:slug returns fork_count (count of packs forking this one)
- [ ] List endpoint returns null/0 defaults (no performance impact)

**Dependencies**: Task 1.1
**Effort**: Small

---

### Task 1.5: Kill Download-Count Graduation

**Files**: `docs/GRADUATION.md`, `apps/api/src/services/constructs.ts:142`

**Description**: Per PRD FR7 and SDD §6.2.1:

1. Update `GRADUATION.md`:
   - exp→beta: 7+ days + README ≥200 words + at least 1 SKILL.md
   - beta→stable: 30+ days at beta + CHANGELOG present + no `critical`/`breaking` issues
   - Remove all "10+ downloads" and "100+ downloads" references

2. Reduce `RELEVANCE_WEIGHTS.downloads` from 0.3 → 0.1 at `constructs.ts:142`

**Acceptance Criteria**:
- [ ] Zero references to download counts in GRADUATION.md criteria (grep verification)
- [ ] RELEVANCE_WEIGHTS.downloads === 0.1
- [ ] Graduation criteria are concrete and automatable (word counts, file presence, time gates)

**Dependencies**: None
**Effort**: Small

---

## Sprint 2: Explorer Reality (P1)

**Global ID**: sprint-35
**Goal**: Explorer diagnostic language, SKILL.md prose, fork celebration, certificate rename
**Priority**: P1 — user-facing improvements that depend on Sprint 1 schema

### Task 2.1: Diagnostic Language — Replace "Level" Label

**Files**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx:128-130`

**Description**: Per SDD §5.2:

Replace theatrical "Level" stat block with diagnostic text:
- experimental → "Experimental — needs README + 7 days for beta"
- beta → "Beta — needs CHANGELOG + no critical issues for stable"
- stable → "Stable"
- deprecated → "Deprecated"
- unknown/default → "Experimental — needs README + 7 days for beta"

Remove the "Level" label entirely. Pure diagnostic output.

**Acceptance Criteria**:
- [ ] No "Level" text appears on construct detail page
- [ ] Each maturity level shows correct diagnostic text
- [ ] Unknown/missing maturity defaults to experimental diagnostic
- [ ] Visual styling: text-sm, no stat-block framing

**Dependencies**: None (can start immediately)
**Effort**: Small

---

### Task 2.2: SKILL.md Prose Pipeline

**Files**: `apps/api/src/routes/packs.ts` (sync), NEW `apps/api/src/utils/extractSkillProse.ts`, `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`, `apps/explorer/lib/data/transform-construct.ts`

**Description**: Per SDD §4.3 and §5.3:

**API side (sanitize on write)**:
1. Create `extractSkillProse()` utility (SDD §4.3.2):
   - Find primary SKILL.md (root-level preferred over nested)
   - Strip YAML frontmatter
   - Truncate at sentence boundary within 2000 chars
   - Sanitize with DOMPurify (strip all HTML) — this is the **canonical sanitization point**
   - Return null if no SKILL.md
2. Call during `POST /packs/:slug/sync` within existing transaction
3. Store result in `packs.skill_prose` (stored clean)

**Explorer side (sanitize on render — defense in depth)**:
4. Add `skill_prose` to APIConstruct type and ConstructDetail
5. Add `react-markdown`, `remark-gfm`, `rehype-sanitize` to explorer deps (if not present)
6. Render skill_prose as sanitized markdown above identity section — `rehype-sanitize` provides second layer even though stored content is already clean
7. Fall back to description when skill_prose is null

**Sanitization strategy**: Sanitize on write (DOMPurify in API) AND sanitize on render (rehype-sanitize in Explorer). Double sanitization is intentional defense-in-depth — if either layer fails, the other catches it.

**Acceptance Criteria**:
- [ ] extractSkillProse strips frontmatter correctly
- [ ] Truncation at sentence boundary (not mid-word/sentence)
- [ ] XSS payloads in SKILL.md are sanitized on API side (HTML stripped before storage)
- [ ] Explorer renders with rehype-sanitize (defense in depth)
- [ ] `<script>alert(1)</script>` in SKILL.md → no script tag in stored prose or rendered output
- [ ] Null SKILL.md → null skill_prose → description fallback on Explorer
- [ ] Sync updates skill_prose on every call
- [ ] Explorer renders markdown safely (no raw HTML)

**Dependencies**: Task 1.1 (skill_prose column must exist)
**Effort**: Medium

---

### Task 2.3: Fork Celebration — Explorer Display

**Files**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`, `apps/explorer/lib/data/transform-construct.ts`, browse card components

**Description**: Per SDD §5.4:

1. Add `forked_from` and `fork_count` to ConstructDetail type
2. On detail page: "Forked from [parent]" link badge when forkedFrom is present
3. On detail page: "N variants exist" text when forkCount > 0
4. On browse cards: small fork count badge when > 0

**Acceptance Criteria**:
- [ ] Forked construct shows "Forked from [parent name]" link
- [ ] Link navigates to parent construct page
- [ ] Constructs with forks show "N variants exist"
- [ ] Browse cards show fork count badge
- [ ] Constructs without forks show nothing (no empty state clutter)

**Dependencies**: Task 1.4 (fork data in API response)
**Effort**: Small

---

### Task 2.4: Rename CalibrationCertificate → VerificationCertificate

**Files**: `apps/api/src/db/schema.ts:1171`, `apps/api/drizzle/0005_construct_verifications.sql:77`, `grimoires/bridgebuilder/echelon-integration-gaps.md`, `grimoires/bridgebuilder/observer-laboratory-success-case.md`, `grimoires/bridgebuilder/rd-synthesis-behavioral-measurement.md`

**Description**: Per PRD FR8 and SDD §7.2:

1. Update JSDoc comment at schema.ts:1171 — "CalibrationCertificate" → "VerificationCertificate"
2. Update SQL COMMENT at 0005_construct_verifications.sql:77
3. Grep-and-replace across 3 grimoire files (~28 occurrences total)
4. Verify no code identifiers use "CalibrationCertificate" (they don't — already generic)

**Acceptance Criteria**:
- [ ] `grep -ri "CalibrationCertificate"` returns zero results across entire repo
- [ ] Code identifiers unchanged (only comments and docs modified)
- [ ] All 3 grimoire files updated

**Dependencies**: None
**Effort**: Small

---

## Sprint 3: Visible Craft (P2)

**Global ID**: sprint-36
**Goal**: Showcases API, Explorer showcase display, accuracy display
**Priority**: P2 — enhances user experience, builds on Sprint 1+2

### Task 3.1: Showcases API — Table + Endpoints

**Files**: `apps/api/src/routes/packs.ts` (add routes)

**Description**: Per SDD §4.4:

1. `POST /v1/packs/:slug/showcases` — Submit showcase (any authenticated user)
   - Zod: title (1-200), url (valid URL, max 2000), description (max 500, optional)
   - Sanitize description with DOMPurify, set approved: false, submitted_by: userId
   - Rate limit: 20/hour per user (Redis key: `rl:showcases:create:{userId}`, follows existing `checkSyncRateLimit()` pattern)

2. `PATCH /v1/packs/:slug/showcases/:id/approve` — Approve showcase
   - Auth: isPackOwner OR isAdmin
   - Toggle approved: true

3. `GET /v1/packs/:slug/showcases` — List showcases
   - Public: only approved: true
   - Pack owner: all (including pending)
   - Ordered by created_at DESC

**Acceptance Criteria**:
- [ ] POST creates showcase with approved: false
- [ ] PATCH approve sets approved: true, returns 403 for non-owner/non-admin
- [ ] GET public returns only approved showcases
- [ ] GET by pack owner returns all showcases
- [ ] Description sanitized, URL validated
- [ ] Rate limit enforced

**Dependencies**: Task 1.1 (construct_showcases table)
**Effort**: Small

---

### Task 3.2: Explorer Built With — Showcase Display

**Files**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`, `apps/explorer/lib/data/fetch-constructs.ts`

**Description**: Per SDD §5.5 (showcases section):

1. Fetch showcases via `GET /v1/packs/:slug/showcases` in fetchConstruct()
2. Add showcases to ConstructDetail type
3. Render "Built With" section on detail page:
   - Title linked to URL (target="_blank", rel="noopener noreferrer")
   - Description text below
   - Only show section when showcases array is non-empty

**Acceptance Criteria**:
- [ ] Showcases section appears when construct has approved showcases
- [ ] Each showcase shows title (linked), description
- [ ] Links open in new tab with security attributes
- [ ] Section hidden when no showcases

**Dependencies**: Task 3.1
**Effort**: Small

---

### Task 3.3: Accuracy Display — Explorer Component

**Files**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`, `apps/explorer/lib/data/fetch-constructs.ts`

**Description**: Per SDD §5.5 (accuracy section):

1. Fetch accuracy via `GET /v1/packs/:slug/signals/accuracy` in fetchConstruct()
2. Add accuracy data to ConstructDetail type
3. Render accuracy section when sufficient_data is true:
   - Weighted κ, Coverage %, Sample size
   - Warning messages in amber text
4. Show nothing when insufficient data or no data

**Acceptance Criteria**:
- [ ] Accuracy section appears when sufficient_data === true
- [ ] Shows weighted kappa, coverage, sample size
- [ ] Warnings displayed when present
- [ ] No section when insufficient data (clean empty state)
- [ ] Uses cached API response (10min TTL from backend)

**Dependencies**: Task 1.3 (accuracy API must exist)
**Effort**: Small

---

## Sprint Dependencies

```
Sprint 1 (P0):
  1.1 Migration ──────→ 1.2 Signal API ──→ 1.3 Accuracy API
  1.1 Migration ──────→ 1.4 Fork Provenance
  1.5 Graduation (independent)

Sprint 2 (P1):
  2.1 Diagnostic Language (independent)
  1.1 ──→ 2.2 SKILL.md Prose
  1.4 ──→ 2.3 Fork Celebration
  2.4 Certificate Rename (independent)

Sprint 3 (P2):
  1.1 ──→ 3.1 Showcases API ──→ 3.2 Explorer Showcases
  1.3 ──→ 3.3 Accuracy Display
```

---

## Risk Buffer

| Sprint | Buffer | Rationale |
|--------|--------|-----------|
| Sprint 1 | 30% | Accuracy computation (kappa) is non-trivial; golden fixture validation + degenerate case handling + Redis fallback add testing surface |
| Sprint 2 | 10% | Mostly UI changes + straightforward extraction; prose pipeline is the unknown |
| Sprint 3 | 10% | Simple CRUD + display; low complexity |

---

## Out of Scope (Follow-Up Issues)

| Item | Target Repo | Why Deferred |
|------|-------------|-------------|
| Kill 3x rank-based signal weighting | construct-observer | Observer-internal change |
| Observer Discovery mode (raw observation) | construct-observer | New skill, not a fix |
| Replace Level N framing in Loa golden path | loa | Framework-level, not registry |
| Score API formula changes | midi-interface | Score developer context required |
| Analytical signal layer (internal weights) | loa-constructs (future) | Needs Score API access patterns to stabilize |
| Community evaluator system | loa-constructs (future) | Requires user growth before meaningful |

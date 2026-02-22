# PRD: R&D Synthesis — Measurement Honesty

**Cycle**: cycle-035
**Created**: 2026-02-21
**Status**: Draft
**Source**: `grimoires/bridgebuilder/rd-synthesis-behavioral-measurement.md` (4-expert R&D team output)
**Linked Issues**: [#131](https://github.com/0xHoneyJar/loa-constructs/issues/131) (Construct Lifecycle), [loa#379](https://github.com/0xHoneyJar/loa/issues/379) (Verification Trust)
**Predecessor**: cycle-034 (Type System, Dependency Graph — archived)
**Grounded in**:
- Codebase scan: `schema.ts` (1200+ lines), `packs.ts` (1977 lines), `constructs.ts` (339 lines), `analytics.ts` (136 lines)
- Explorer: `constructs/[slug]/page.tsx` (305 lines), `fetch-constructs.ts` (247 lines)
- R&D synthesis from Game Systems, Platform Economy, Creative Expression, and Behavioral Science experts
- Founder's journal (6 pages, rave braindump): measurement against real behavior, Score calibration, creative abundance
- Echelon first VerificationCertificate: precision 0.80, recall 0.55, composite 0.700, UNVERIFIED tier

---

## 1. Problem Statement

The Constructs Network measures everything except whether its own judgments are correct.

**Four concrete problems grounded in code:**

1. **No retrospective accuracy loop.** Observer classifies signals as HIGH/MEDIUM/LOW (3x/1x/0.5x weight). There is no table, no endpoint, and no mechanism to track whether HIGH signals actually produced high-impact outcomes. The system operates blind — it predicts but never checks its predictions. The founder identified this: *"I am extracting signal from conversations but I am not practicing what I preach. This must be measured against real behavior."*
   > Evidence: No `signal_accuracy` or `outcome_tracking` table in `schema.ts`. No analytics endpoint tracks signal-to-outcome correlation.

2. **Download counts contradict stated philosophy.** `docs/GRADUATION.md:23` requires "10+ downloads" for experimental→beta graduation. `docs/GRADUATION.md:34` requires "100+ downloads" for beta→stable. But `ARCHETYPE.md:173-179` explicitly rejects "Total installs" as a vanity metric: *"A number goes up. Tells you nothing about impact."* The graduation system and the design philosophy are in direct contradiction.
   > Evidence: `GRADUATION.md:23,34` vs `ARCHETYPE.md:173`. Downloads also weight search ranking at 0.3 in `constructs.ts:142` via `RELEVANCE_WEIGHTS.downloads`.

3. **Fork relationships are invisible.** `POST /v1/packs/fork` at `packs.ts:1669-1740` creates a new pack from a source but does NOT record the relationship. The `packs` table (`schema.ts:472-553`) has no `forked_from` column. Observer's 6→23 skill evolution in midi-interface — the most valuable product signal in the ecosystem — is untraceable in the registry.
   > Evidence: `packs.ts:1712` creates fork without provenance. `schema.ts:472-553` has no `forked_from` field.

4. **Explorer shows stat blocks instead of craft.** Construct detail page at `constructs/[slug]/page.tsx:128-130` displays `"Level"` with `graduationLevel` — theatrical RPG framing for professional tools. Lines 139-168 surface `construct_identities` JSONB (`cognitiveFrame`, `expertiseDomains`) instead of the SKILL.md prose that actually carries the construct's voice. No "Built With" showcases exist. No fork celebration. The Explorer is a database viewer, not a product page.
   > Evidence: `page.tsx:129` — `<p className="text-white/40 mb-1">Level</p>`. No SKILL.md rendering anywhere in Explorer.

---

## 2. Goals & Success Metrics

### Goals

| Goal | Rationale |
|------|-----------|
| **G1**: The system knows when it's wrong | Retrospective accuracy tracking closes the metacognitive loop — the single most important measurement per behavioral science analysis |
| **G2**: Fork relationships are first-class | Fork drift is product signal, not technical debt. Celebrate it, measure it, surface it. |
| **G3**: Explorer shows craft, not stat blocks | Professional tools need `git status` energy, not Clippy energy. Prose > JSONB. Visible output > download counts. |
| **G4**: Graduation criteria match stated philosophy | Kill the download-count contradiction. Replace with criteria the ARCHETYPE.md would endorse. |
| **G5**: Verification naming is honest | "CalibrationCertificate" borrows credibility from forecasting science (Brier scores) while measuring classification accuracy (precision/recall). Rename to VerificationCertificate. |

### Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Retrospective accuracy endpoint exists and accepts outcome data | Functional, tested | API integration tests |
| Fork provenance tracked for all fork operations | 100% of `POST /fork` creates provenance | DB constraint + endpoint test |
| Explorer shows SKILL.md prose on construct detail pages | Rendered for all constructs with SKILL.md | Visual verification + E2E |
| Download counts removed from graduation criteria | Zero references to downloads in GRADUATION.md criteria | Grep verification |
| "CalibrationCertificate" renamed to "VerificationCertificate" in code comments and docs | All references updated | Grep verification |

---

## 3. User & Stakeholder Context

### Primary: The Builder (You)

The founder, operating as both builder and first user. The journal captures the core tension: *"Creating simple experiences that resonate with people is the exact tension that will get us to where we want to go. It parallels with grounding while also supporting visionary thinking."*

Needs: honest measurement that serves creative growth, not compliance theater.

### Secondary: Tobias / Echelon

External collaborator building verification infrastructure. Currently the only external verifier. The rename from "CalibrationCertificate" to "VerificationCertificate" affects his integration semantics.

Needs: clear naming, honest metrics, independent verification path.

### Tertiary: Future Construct Authors

The 500-pack ecosystem that doesn't exist yet. Decisions now set cultural norms. *"Establish the norm while you're small."*

Needs: zero-friction creation. Verification as opt-in badge, never as gate to visibility.

---

## 4. Functional Requirements

### FR1: Retrospective Accuracy Tracking (P0)

*"Without this feedback loop, every other measurement in the system operates blind."*

**New table**: `signal_outcomes`

```sql
CREATE TABLE signal_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id),        -- FK, not slug
  signal_type TEXT NOT NULL,           -- 'gap_filed', 'signal_classified', 'journey_shaped'
  signal_source TEXT NOT NULL,         -- namespaced: 'github:issue/123', 'canvas:utc/user-abc'
  signal_source_url TEXT,              -- verifiable URL to original signal
  predicted_impact TEXT NOT NULL CHECK (predicted_impact IN ('high', 'medium', 'low')),
  actual_impact TEXT CHECK (actual_impact IN ('high', 'medium', 'low', 'none')),
  outcome_summary TEXT,                -- public-facing summary (no sensitive data)
  outcome_evidence TEXT,               -- private: URL or description (never exposed in public API)
  recorded_by UUID NOT NULL REFERENCES users(id),     -- who created the prediction
  evaluated_by UUID REFERENCES users(id),             -- who evaluated the outcome
  created_at TIMESTAMPTZ DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ,
  CONSTRAINT no_self_evaluation CHECK (recorded_by IS DISTINCT FROM evaluated_by),
  CONSTRAINT unique_signal_evaluation UNIQUE (pack_id, signal_source)
);
```

**Impact rubric** (concrete, observable criteria):

| Level | Definition | Time Window | Example |
|-------|-----------|-------------|---------|
| `high` | Resulted in merged code change or documented behavior shift within 14 days | 14 days | Gap filed → PR merged → user-facing change |
| `medium` | Opened as issue/task but not yet resolved, OR indirect influence on subsequent decisions | 30 days | Gap filed → issue created → in backlog |
| `low` | Acknowledged but no downstream action taken | 30 days | Gap discussed in review but deprioritized |
| `none` | Signal was incorrect or irrelevant — no observable downstream effect | 30 days | Predicted high impact, nothing happened |

**Evaluator integrity**: The `no_self_evaluation` constraint ensures the person who recorded the prediction cannot evaluate its outcome. For the current single-maintainer ecosystem, self-evaluations are logged but flagged in accuracy reports as `self_evaluated: true` with reduced weight (0.5x) in aggregate accuracy computation.

**New endpoints**:

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/v1/packs/:slug/signals/outcomes` | Record an outcome for a prior signal | Pack owner |
| `PATCH` | `/v1/packs/:slug/signals/outcomes/:id` | Evaluate a recorded signal | Pack owner or admin (not recorder) |
| `GET` | `/v1/packs/:slug/signals/outcomes` | List outcomes (summaries only) | Public |
| `GET` | `/v1/packs/:slug/signals/outcomes/detail` | List outcomes with evidence | Pack owner |
| `GET` | `/v1/packs/:slug/signals/accuracy` | Compute accuracy stats (predicted vs actual) | Public |

**Accuracy computation**: Return a structured accuracy report:
- **Confusion matrix**: 3×4 grid (predicted high/medium/low × actual high/medium/low/none)
- **Per-class precision/recall**: For each predicted_impact level
- **Weighted kappa**: Ordinal agreement accounting for chance (Cohen's weighted kappa)
- **Coverage**: `evaluated_signals / total_signals` — what fraction of signals have outcomes
- **Time-to-outcome**: Median days from signal creation to evaluation
- **Sample size guardrails**: Show "Insufficient data — N evaluations, need 20+" when n < 20. Show confidence intervals (95% Wilson) when n ≥ 20. Flag selection bias when coverage < 50%.

### FR2: Fork Provenance Tracking (P0)

*"Add `forked_from` to the packs table and celebrate forks."*

**Schema change** — add to `packs` table (`schema.ts:~533`):
```typescript
forkedFrom: uuid('forked_from').references(() => packs.id),
```

**Fork endpoint fix**: `POST /v1/packs/fork` at `packs.ts:1712` must pass `forkedFrom: sourcePack.id` to `createPack()`.

**API response additions**:
- `GET /v1/constructs/:slug` returns `forked_from: { slug, name } | null`
- `GET /v1/constructs/:slug` returns `fork_count: number`

### FR3: Explorer Diagnostic Language (P1)

*"Replace with `git status`-style diagnostics."*

Replace `constructs/[slug]/page.tsx:128-130`:
- `experimental` → "Experimental — needs README + 7 days for beta"
- `beta` → "Beta — needs test coverage + docs for stable"
- `stable` → "Stable"
- `deprecated` → "Deprecated"

No "Level" label. No theatrical framing. Pure diagnostic.

### FR4: Explorer SKILL.md Prose Display (P1)

*"Show SKILL.md prose as primary identity, not JSONB stat blocks."*

**Schema change**: Add `skill_prose TEXT` to `packs` table.

**SKILL.md format contract**: SKILL.md files are markdown with optional YAML frontmatter. The "primary SKILL.md" is the first file matching `**/SKILL.md` in the pack root (not nested skill directories). If multiple exist, prefer the one at the pack root level.

**Git-sync change**: During `POST /v1/packs/sync`, extract prose from primary SKILL.md:
1. Strip YAML frontmatter (if present)
2. Extract up to 2000 chars, truncating at the last complete sentence boundary (`. `, `.\n`, or `.\r\n`)
3. Sanitize: strip HTML tags, escape markdown injection vectors. Use `DOMPurify` or equivalent server-side sanitization before storage.
4. Store in `skill_prose`. Set to `NULL` if no SKILL.md found.
5. **Staleness**: `skill_prose` is refreshed on every sync operation. No separate cache invalidation needed — sync IS the refresh trigger.

**Explorer**: Render `skill_prose` as sanitized markdown (via `react-markdown` with `rehype-sanitize`) above the identity section on detail page. Fall back to `description` if no prose exists. Never render raw HTML from user content.

### FR5: Explorer Fork Celebration (P1)

- If construct has `forked_from`: "Forked from [parent]" badge with link
- If construct has forks: "N variants exist" with links
- Fork count visible on construct cards in browse view

### FR6: Explorer Built With Showcases (P2)

**New table**: `construct_showcases`

```sql
CREATE TABLE construct_showcases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  submitted_by UUID REFERENCES users(id),
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Endpoints**: `POST /v1/packs/:slug/showcases` (auth), `GET /v1/packs/:slug/showcases` (public, approved-only).

### FR7: Kill Download-Count Graduation (P0)

**`docs/GRADUATION.md` changes**:
- Remove "10+ downloads" from exp→beta criteria (line 23)
- Remove "100+ downloads" from beta→stable criteria (line 34)
- Replace with concrete, automatable criteria:
  - exp→beta: 7+ days since creation + README present with ≥200 words + at least 1 SKILL.md file
  - beta→stable: 30+ days at beta + CHANGELOG present + no open issues labeled `critical` or `breaking` in source repo
  - *Note*: "verified skill" was removed as a criterion because the only external verifier (Echelon) has 0.55 recall — gating on verification would block 45% of legitimate constructs. Verification remains opt-in badge, never a gate.

**Search ranking**: Reduce `RELEVANCE_WEIGHTS.downloads` from 0.3 → 0.1 at `constructs.ts:142`.

### FR8: Rename CalibrationCertificate → VerificationCertificate (P1)

**Code** (comments only — identifiers already generic):
- `schema.ts:1171` — JSDoc comment
- `0005_construct_verifications.sql:77` — SQL COMMENT

**Documentation**: Update all references in `echelon-integration-gaps.md` (14), `observer-laboratory-success-case.md` (9), `rd-synthesis-behavioral-measurement.md` (5).

---

## 5. Technical & Non-Functional

### Migration Safety

New migration `0006_measurement_honesty.sql` adds:
- `forked_from` column to `packs` (nullable FK, non-breaking)
- `skill_prose` column to `packs` (nullable text, non-breaking)
- `signal_outcomes` table (new)
- `construct_showcases` table (new)

All changes are **additive**. No column removals, no type changes, no data migration.

### API Backwards Compatibility

All new endpoints are additions. Existing endpoints gain fields (additive, non-breaking).

### Security

- `POST /v1/signals/outcomes`: pack owner auth only (verified via `packs.owner_id` FK join)
- `GET /v1/signals/outcomes/:slug`: public, returns `outcome_summary` only (never `outcome_evidence`)
- `GET /v1/signals/outcomes/:slug/detail`: pack owner only (returns full evidence)
- `GET /v1/signals/accuracy/:slug`: public (aggregated stats only, no individual outcomes)
- `POST /v1/packs/:slug/showcases`: authenticated user
- Showcase approval: admin-only
- **Content sanitization**: All user-supplied markdown (`skill_prose`, `outcome_summary`, showcase `description`) must be sanitized server-side before storage to prevent stored XSS
- **Rate limiting**: `POST /v1/signals/outcomes` limited to 50 writes/hour per user to prevent accuracy stat flooding

---

## 6. Scope & Prioritization

### Sprint 1: Measurement Foundation (P0)

| Task | What |
|------|------|
| Migration 0006 | `signal_outcomes` table, `forked_from` + `skill_prose` columns |
| Signal outcomes API | POST outcome, GET outcomes, GET accuracy |
| Fork provenance | Fix fork endpoint, add to API response |
| Kill download graduation | Update GRADUATION.md, reduce ranking weight |

### Sprint 2: Explorer Reality (P1)

| Task | What |
|------|------|
| Diagnostic language | Replace "Level" with diagnostic text |
| SKILL.md prose | Extract during sync, render on detail page |
| Fork celebration | Badges, fork count, variant links |
| Rename certificates | Comment/doc rename throughout |

### Sprint 3: Visible Craft (P2)

| Task | What |
|------|------|
| Showcases table + API | New table, POST/GET endpoints |
| Explorer Built With | Showcase section on detail page |
| Accuracy display | Show signal accuracy stats when data exists |

### Out of Scope (Follow-Up Issues for Other Repos)

| Item | Repo | Why Deferred |
|------|------|-------------|
| Kill 3x rank-based signal weighting | construct-observer | Observer-internal |
| Observer Discovery mode (raw observation) | construct-observer | New skill |
| Replace Level N framing in Loa golden path | loa | Framework-level |
| Score API formula changes | midi-interface | Score developer context required |
| Analytical signal layer (internal weights) | loa-constructs (future) | Needs Score API access patterns to stabilize |

---

## 7. Risks & Dependencies

| Risk | Severity | Mitigation |
|------|----------|------------|
| Migration 0006 on production Supabase | Medium | All additive; test on staging first |
| Echelon affected by rename | Low | Only comments/docs; code identifiers generic |
| SKILL.md extraction adds sync latency | Low | Sentence-boundary truncation at 2000 chars; skip if absent |
| Signal accuracy data sparse initially | Expected | Show "Insufficient data — N evaluations, need 20+" |
| Self-evaluation bias in single-maintainer ecosystem | Medium | `no_self_evaluation` constraint + `self_evaluated` flag with 0.5x weight |
| Stored XSS via user-supplied markdown | Medium | Server-side DOMPurify + rehype-sanitize on render |

| Dependency | Status |
|------------|--------|
| Migration 0005 in production | Verify — may need to be run |
| Drizzle migration tooling | Working |
| Explorer ISR caching | Working |

---

## 8. Source Tracing

| Section | Primary Source | Supporting Evidence |
|---------|---------------|-------------------|
| Problem 1 (no accuracy loop) | `rd-synthesis.md:93-105` (Behavioral Science) | Founder journal: "measured against real behavior" |
| Problem 2 (download contradiction) | `rd-synthesis.md:36-39` (All 4 experts) | `GRADUATION.md:23,34` vs `ARCHETYPE.md:173-179` |
| Problem 3 (fork invisibility) | `rd-synthesis.md:187-191` (Platform Economy) | `packs.ts:1669-1740`, `schema.ts:472-553` |
| Problem 4 (stat blocks not craft) | `rd-synthesis.md:79-88` (Creative Expression) | `page.tsx:128-130,139-168` |
| FR1 (accuracy tracking) | Behavioral Science: "single most important measurement" | Tetlock, Brier decomposition |
| FR2 (fork provenance) | Platform Economy: "add forked_from immediately" | npm fork model |
| FR3 (diagnostic language) | Game Systems: "git status, not Clippy" | Portal, professional tool UX |
| FR4 (SKILL.md prose) | Creative Expression: "prose > JSONB" | `construct_identities` vs SKILL.md |
| FR7 (kill downloads) | All 4 experts unanimous | ARCHETYPE.md anti-vanity philosophy |
| FR8 (rename certificate) | Behavioral Science: "naming theater" | Tetlock calibration vs classification |

---

## 9. Flatline Review Integration

**Review ID**: flatline-prd-20260221
**Models**: Opus + GPT-5.2 | **Confidence**: FULL (100% agreement) | **Cost**: 46¢

### HIGH_CONSENSUS Integrated (4)

| ID | Finding | Integration |
|----|---------|-------------|
| IMP-001 | Accuracy metrics underspecified | Added confusion matrix, weighted kappa, coverage, sample size guardrails |
| IMP-002 | Self-evaluation undermines integrity | Added `no_self_evaluation` constraint, evaluator role separation, self-eval flag |
| IMP-003 | SKILL.md extraction contract missing | Added format contract, sentence-boundary truncation, XSS sanitization, sync trigger |
| IMP-009 | signal_id must be typed reference | Changed to `signal_source` (namespaced) + `signal_source_url` (verifiable) with unique constraint |

### BLOCKERS Addressed (7)

| ID | Concern | Resolution |
|----|---------|-----------|
| SKP-001 (910) | No ground truth for actual_impact | Added impact rubric with observable criteria and time windows |
| SKP-001 (900) | Self-assessment confirmation bias | Covered by IMP-002: `no_self_evaluation` + weighted flag |
| SKP-002 (880) | Public endpoints leak evidence | Split into public (summary only) and owner-only (detail) endpoints |
| SKP-002 (850) | Download removal without replacement | Replaced with concrete automatable criteria; removed "verified skill" gate |
| SKP-003 (760) | Auth model + FK constraints | Changed to `pack_id` UUID FK, added unique constraint, RLS notes |
| SKP-003 (750) | SKILL.md hidden complexity | Covered by IMP-003: format contract, staleness policy, sanitization |
| SKP-004 (720) | Accuracy computation vague | Covered by IMP-001: confusion matrix, kappa, coverage metric |

---

*"The best measurement system tells you when you're wrong before someone else does."*

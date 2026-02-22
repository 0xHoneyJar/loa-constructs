# SDD: R&D Synthesis — Measurement Honesty

**Cycle**: cycle-035
**Created**: 2026-02-22
**Status**: Draft
**PRD**: `grimoires/loa/prd.md`
**Predecessor**: cycle-034 SDD (Type System, Dependency Graph — archived)
**Grounded in**:
- `schema.ts:472-553` (packs table), `schema.ts:1175-1206` (construct_verifications)
- `packs.ts:1669-1740` (fork endpoint), `packs.ts:879-1048` (sync endpoint)
- `constructs.ts:136-147` (RELEVANCE_WEIGHTS), `constructs.ts:340-422` (packToConstruct)
- `page.tsx:128-130` (Level label), `page.tsx:139-168` (identity JSONB)
- `fetch-constructs.ts:9-50` (APIConstruct), `transform-construct.ts:39-88` (transformToDetail)

---

## 1. Executive Summary

This SDD details the architecture for cycle-035: Measurement Honesty. The work spans 3 sprints across the API (`apps/api`) and Explorer (`apps/explorer`), adding:

1. **Signal outcomes tracking** — new table, 4 endpoints, accuracy computation with statistical rigor
2. **Fork provenance** — schema column, endpoint fix, API response enrichment
3. **SKILL.md prose pipeline** — extraction during sync, sanitized storage, Explorer rendering
4. **Diagnostic language** — replace theatrical "Level" framing with `git status` diagnostics
5. **Graduation criteria overhaul** — kill download counts, replace with automatable criteria
6. **Certificate rename** — CalibrationCertificate → VerificationCertificate (comments/docs only)
7. **Built With showcases** — new table, 2 endpoints, Explorer section (Sprint 3)

All database changes are additive (no column removals, no type changes). All API changes are backwards-compatible (new endpoints + new optional fields on existing responses).

---

## 2. System Architecture

### Affected Components

```
┌─────────────────────────────────────────────────────┐
│ Explorer (Next.js 15, Vercel)                       │
│  ├── constructs/[slug]/page.tsx  (FR3, FR4, FR5)    │
│  ├── constructs browse cards     (FR5)              │
│  └── lib/data/transform-construct.ts (new fields)   │
├─────────────────────────────────────────────────────┤
│ API (Hono, Railway)                                  │
│  ├── routes/signals.ts           (FR1 — NEW FILE)   │
│  ├── routes/packs.ts             (FR2, FR4, FR6)    │
│  ├── services/constructs.ts      (FR7)              │
│  ├── services/signals.ts         (FR1 — NEW FILE)   │
│  └── services/showcases.ts       (FR6 — NEW FILE)   │
├─────────────────────────────────────────────────────┤
│ Database (Supabase PostgreSQL)                       │
│  ├── schema.ts                   (FR1, FR2, FR4, FR6)│
│  └── drizzle/0006_measurement_honesty.sql            │
├─────────────────────────────────────────────────────┤
│ Docs                                                 │
│  ├── GRADUATION.md               (FR7)              │
│  └── grimoires/bridgebuilder/*   (FR8)              │
└─────────────────────────────────────────────────────┘
```

### Unchanged Components

- Redis caching (Upstash) — existing `constructList` cache covers new pack fields. **New cache key**: `accuracy:{packId}` with 10-min TTL for accuracy computation (see §4.1.7)
- Auth middleware (`requireAuth`, `optionalAuth`) — reused as-is
- Stripe/NowPayments — untouched
- MCP registry — untouched

---

## 3. Data Architecture

### 3.1 Migration: `0006_measurement_honesty.sql`

Single migration file. All changes additive, safe for zero-downtime deployment.

#### 3.1.1 New columns on `packs` table

```sql
-- Fork provenance (FR2)
ALTER TABLE packs ADD COLUMN forked_from UUID REFERENCES packs(id);
CREATE INDEX idx_packs_forked_from ON packs(forked_from) WHERE forked_from IS NOT NULL;

-- SKILL.md prose cache (FR4)
ALTER TABLE packs ADD COLUMN skill_prose TEXT;
```

Both nullable, non-breaking. Existing rows get `NULL` values.

**Fork backfill decision**: Historical forks will NOT be backfilled in this cycle. The ecosystem currently has 5 packs; the only known fork (Observer in midi-interface) was created outside the registry's fork endpoint. Backfilling would require manual identification of fork relationships with uncertain accuracy. All future forks via `POST /packs/fork` will correctly record provenance. This decision is explicitly documented — revisit if fork detection becomes automated.

#### 3.1.2 New table: `signal_outcomes` (FR1)

```sql
CREATE TABLE signal_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  signal_source TEXT NOT NULL,
  signal_source_url TEXT,
  predicted_impact TEXT NOT NULL CHECK (predicted_impact IN ('high', 'medium', 'low')),
  actual_impact TEXT CHECK (actual_impact IN ('high', 'medium', 'low', 'none')),
  outcome_summary TEXT,
  outcome_evidence TEXT,
  recorded_by UUID NOT NULL REFERENCES users(id),
  evaluated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ,
  CONSTRAINT no_self_evaluation CHECK (recorded_by IS DISTINCT FROM evaluated_by),
  CONSTRAINT unique_signal_evaluation UNIQUE (pack_id, signal_type, signal_source)
);

CREATE INDEX idx_signal_outcomes_pack ON signal_outcomes(pack_id);
CREATE INDEX idx_signal_outcomes_evaluated ON signal_outcomes(pack_id) WHERE actual_impact IS NOT NULL;
```

#### 3.1.3 New table: `construct_showcases` (FR6)

```sql
CREATE TABLE construct_showcases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  submitted_by UUID REFERENCES users(id),
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_construct_showcases_pack ON construct_showcases(pack_id);
CREATE INDEX idx_construct_showcases_approved ON construct_showcases(pack_id) WHERE approved = true;
```

### 3.2 Drizzle Schema Updates (`schema.ts`)

#### 3.2.1 `packs` table additions (after `constructType` column, ~line 548)

```typescript
// Fork provenance (cycle-035, FR2)
forkedFrom: uuid('forked_from').references(() => packs.id),

// SKILL.md prose cache (cycle-035, FR4)
skillProse: text('skill_prose'),
```

#### 3.2.2 `packsRelations` update (~line 777)

Add to existing relations:

```typescript
forkedFromPack: one(packs, {
  fields: [packs.forkedFrom],
  references: [packs.id],
  relationName: 'forkParent',
}),
```

#### 3.2.3 New table: `signalOutcomes`

```typescript
export const signalOutcomes = pgTable('signal_outcomes', {
  id: uuid('id').primaryKey().defaultRandom(),
  packId: uuid('pack_id').notNull().references(() => packs.id, { onDelete: 'cascade' }),
  signalType: text('signal_type').notNull(),
  signalSource: text('signal_source').notNull(),
  signalSourceUrl: text('signal_source_url'),
  predictedImpact: text('predicted_impact').notNull(),
  actualImpact: text('actual_impact'),
  outcomeSummary: text('outcome_summary'),
  outcomeEvidence: text('outcome_evidence'),
  recordedBy: uuid('recorded_by').notNull().references(() => users.id),
  evaluatedBy: uuid('evaluated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }),
}, (table) => ({
  packIdx: index('idx_signal_outcomes_pack').on(table.packId),
  evaluatedIdx: index('idx_signal_outcomes_evaluated').on(table.packId),
  uniqueSignal: unique('unique_signal_evaluation').on(table.packId, table.signalType, table.signalSource),
}));
```

#### 3.2.4 New table: `constructShowcases`

```typescript
export const constructShowcases = pgTable('construct_showcases', {
  id: uuid('id').primaryKey().defaultRandom(),
  packId: uuid('pack_id').notNull().references(() => packs.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  url: text('url').notNull(),
  description: text('description'),
  submittedBy: uuid('submitted_by').references(() => users.id),
  approved: boolean('approved').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  packIdx: index('idx_construct_showcases_pack').on(table.packId),
  approvedIdx: index('idx_construct_showcases_approved').on(table.packId),
}));
```

---

## 4. API Design

### 4.1 Signal Outcomes API (FR1) — NEW: `routes/signals.ts`

New Hono router mounted under `/v1/packs/:slug/signals` (pack-scoped, not construct-scoped — outcomes are keyed by `pack_id` FK, so endpoints must be pack-scoped to avoid slug/construct ambiguity). Follows existing patterns from `packs.ts`.

#### 4.1.1 `POST /v1/packs/:slug/signals/outcomes`

**Auth**: `requireAuth()` — pack owner verified via `isPackOwner()`
**Rate limit**: 50 writes/hour per user (new rate limit function)

**Request body** (Zod schema):

```typescript
const createOutcomeSchema = z.object({
  pack_slug: z.string().min(3).max(100),
  signal_type: z.enum(['gap_filed', 'signal_classified', 'journey_shaped']),
  signal_source: z.string().min(1).max(500),       // namespaced: 'github:issue/123'
  signal_source_url: z.string().url().max(2000).optional(),
  predicted_impact: z.enum(['high', 'medium', 'low']),
});
```

**Response** (201):

```json
{
  "data": {
    "id": "uuid",
    "pack_slug": "observer",
    "signal_type": "gap_filed",
    "signal_source": "github:issue/123",
    "predicted_impact": "high",
    "actual_impact": null,
    "created_at": "2026-02-22T..."
  }
}
```

**Logic**:
1. Resolve `pack_slug` → `pack.id` via `getPackBySlug()`
2. Verify `isPackOwner(pack.id, userId)` → 403
3. Check rate limit (50/hr per user) → 429
4. Insert with `recorded_by: userId`
5. Return created outcome (sans `outcome_evidence`)

#### 4.1.2 `PATCH /v1/packs/:slug/signals/outcomes/:id`

**Auth**: `requireAuth()` — evaluator must be authorized AND must not be the recorder.

**Evaluator authorization rules** (checked in order):
1. `isPackOwner(pack.id, userId)` — pack owner can always evaluate (but not their own predictions)
2. `isAdmin(userId)` — admins can evaluate any pack's outcomes
3. All other users → 403 "Not authorized to evaluate outcomes for this pack"

This prevents vandalism/brigading by restricting evaluation to trusted parties.

**Request body**:

```typescript
const evaluateOutcomeSchema = z.object({
  actual_impact: z.enum(['high', 'medium', 'low', 'none']),
  outcome_summary: z.string().max(500).optional(),
  outcome_evidence: z.string().max(2000).optional(),
});
```

**Logic**:
1. Resolve `:slug` → `pack.id` via `getPackBySlug()`
2. Fetch outcome by ID → 404. Verify outcome belongs to this pack → 404
3. Check evaluator authorization: `isPackOwner() || isAdmin()` → 403
4. Check `userId !== outcome.recordedBy` → 403 "Cannot evaluate your own prediction"
5. **Single-maintainer exception**: If pack has exactly 1 owner AND no admins have evaluated this pack's outcomes before, allow self-evaluation but flag it. Set `evaluated_by = recorded_by`. The accuracy service excludes self-evaluated outcomes from kappa computation entirely (weight = 0) and displays them separately.
6. Sanitize `outcome_summary` (strip HTML)
7. Update `actual_impact`, `outcome_summary`, `outcome_evidence`, `evaluated_by`, `evaluated_at`
8. Invalidate accuracy cache for this pack (see §4.1.7)

#### 4.1.3 `GET /v1/packs/:slug/signals/outcomes`

**Auth**: `optionalAuth()`
**Public response**: Returns `outcome_summary` but NOT `outcome_evidence`.

```json
{
  "data": [
    {
      "id": "uuid",
      "signal_type": "gap_filed",
      "signal_source": "github:issue/123",
      "predicted_impact": "high",
      "actual_impact": "high",
      "outcome_summary": "Gap led to PR #456 merged in 3 days",
      "self_evaluated": false,
      "created_at": "...",
      "evaluated_at": "..."
    }
  ],
  "meta": { "total": 15, "evaluated": 8, "page": 1, "per_page": 50 }
}
```

#### 4.1.4 `GET /v1/packs/:slug/signals/outcomes/detail`

**Auth**: `requireAuth()` + `isPackOwner()` — owner-only, includes `outcome_evidence`.

#### 4.1.5 `GET /v1/packs/:slug/signals/accuracy`

**Auth**: `optionalAuth()` — public, aggregated stats only.

**Response**:

```json
{
  "data": {
    "construct_slug": "observer",
    "sample_size": 25,
    "coverage": 0.62,
    "sufficient_data": true,
    "confusion_matrix": {
      "high":   { "high": 5, "medium": 1, "low": 0, "none": 0 },
      "medium": { "high": 1, "medium": 8, "low": 2, "none": 1 },
      "low":    { "high": 0, "medium": 1, "low": 4, "none": 2 }
    },
    "per_class": {
      "high":   { "precision": 0.83, "recall": 0.83 },
      "medium": { "precision": 0.80, "recall": 0.67 },
      "low":    { "precision": 0.67, "recall": 0.67 }
    },
    "weighted_kappa": 0.72,
    "time_to_outcome_days": { "median": 8, "p25": 3, "p75": 18 },
    "self_evaluated_fraction": 0.12,
    "warnings": []
  }
}
```

**Guardrails** (implemented in `services/signals.ts`):
- `sample_size < 20` → `sufficient_data: false`, `warnings: ["Insufficient data — 15 evaluations, need 20+"]`
- `coverage < 0.5` → `warnings: ["Selection bias risk — only 40% of signals have outcomes"]`
- `self_evaluated_fraction > 0.5` → `warnings: ["Majority self-evaluated — interpret with caution"]`

#### 4.1.6 Accuracy Computation Service (`services/signals.ts`)

```typescript
export async function computeAccuracy(packId: string): Promise<AccuracyReport> {
  // 1. Fetch all evaluated outcomes for pack
  const outcomes = await db.select()
    .from(signalOutcomes)
    .where(and(
      eq(signalOutcomes.packId, packId),
      isNotNull(signalOutcomes.actualImpact)
    ));

  // 2. Fetch total signal count (including unevaluated)
  const totalCount = await db.select({ count: count() })
    .from(signalOutcomes)
    .where(eq(signalOutcomes.packId, packId));

  // 3. Build confusion matrix
  const matrix = buildConfusionMatrix(outcomes);

  // 4. Compute per-class precision/recall
  const perClass = computePerClassMetrics(matrix);

  // 5. Compute weighted kappa (ordinal: high > medium > low)
  const kappa = computeWeightedKappa(outcomes);

  // 6. Compute time-to-outcome distribution
  const timeStats = computeTimeToOutcome(outcomes);

  // 7. Compute self-evaluation fraction
  const selfEvalFraction = outcomes.filter(o =>
    o.recordedBy === o.evaluatedBy
  ).length / outcomes.length;

  // 8. Build warnings
  const warnings = buildWarnings(outcomes.length, totalCount, selfEvalFraction);

  return { ... };
}
```

**Weighted kappa implementation**: Use linear weighting for ordinal scale:
- Same category → weight 0 (perfect agreement)
- Adjacent (high↔medium, medium↔low) → weight 1
- Two apart (high↔low) → weight 2
- `none` treated as equivalent to opposite end (high predicted, none actual = weight 3)

Standard Cohen's weighted kappa formula: `κ_w = 1 - (Σ w_ij * o_ij) / (Σ w_ij * e_ij)` where `o` is observed and `e` is expected by chance.

**Self-evaluated outcomes**: Excluded from kappa computation entirely (weight = 0). Displayed separately in the accuracy report as `self_evaluated_count` and `self_evaluated_fraction`. Warning threshold: 20% (not 50% — lowered per Flatline review to prevent majority self-evaluated data going unwarned).

#### 4.1.7 Accuracy Caching

Accuracy computation is expensive (multiple DB queries + statistical computation) and the endpoint is public (hit on every detail page). Cache with Redis:

```typescript
const ACCURACY_CACHE_TTL = 600; // 10 minutes
const accuracyCacheKey = (packId: string) => `accuracy:${packId}`;

// In GET accuracy handler:
const cached = await redis.get(accuracyCacheKey(packId));
if (cached) return JSON.parse(cached);

const report = await computeAccuracy(packId);
await redis.set(accuracyCacheKey(packId), JSON.stringify(report), { ex: ACCURACY_CACHE_TTL });
```

**Invalidation**: On `PATCH /v1/packs/:slug/signals/outcomes/:id` (evaluation write), delete the cache key:
```typescript
await redis.del(accuracyCacheKey(outcome.packId));
```

#### 4.1.8 TypeScript Interfaces

```typescript
/** Represents a single signal outcome record */
export interface SignalOutcome {
  id: string;
  packId: string;
  signalType: 'gap_filed' | 'signal_classified' | 'journey_shaped';
  signalSource: string;
  signalSourceUrl: string | null;
  predictedImpact: 'high' | 'medium' | 'low';
  actualImpact: 'high' | 'medium' | 'low' | 'none' | null;
  outcomeSummary: string | null;
  outcomeEvidence: string | null;
  recordedBy: string;
  evaluatedBy: string | null;
  createdAt: Date;
  evaluatedAt: Date | null;
}

/** Public-facing outcome (no evidence) */
export interface SignalOutcomePublic extends Omit<SignalOutcome, 'outcomeEvidence'> {
  selfEvaluated: boolean;
}

/** Per-class precision/recall metrics */
export interface ClassMetrics {
  precision: number;
  recall: number;
}

/** Structured accuracy report */
export interface AccuracyReport {
  packSlug: string;
  sampleSize: number;
  coverage: number;
  sufficientData: boolean;
  confusionMatrix: Record<'high' | 'medium' | 'low', Record<'high' | 'medium' | 'low' | 'none', number>>;
  perClass: Record<'high' | 'medium' | 'low', ClassMetrics>;
  weightedKappa: number;
  timeToOutcomeDays: { median: number; p25: number; p75: number };
  selfEvaluatedCount: number;
  selfEvaluatedFraction: number;
  warnings: string[];
}
```

### 4.2 Fork Provenance (FR2) — Modifications to `routes/packs.ts`

#### 4.2.1 Fix `POST /packs/fork` (~line 1709)

Current code calls `createPack()` without `forkedFrom`. Fix:

```typescript
// Before (current):
const newPack = await createPack({
  name: `${sourcePack.name} (fork)`,
  slug: newSlug,
  ownerId: userId,
  ownerType: 'user',
});

// After:
const newPack = await createPack({
  name: `${sourcePack.name} (fork)`,
  slug: newSlug,
  ownerId: userId,
  ownerType: 'user',
  forkedFrom: sourcePack.id,  // NEW: record provenance
});
```

#### 4.2.2 Enrich `GET /v1/constructs/:slug` response

In `packToConstruct()` at `constructs.ts`, add fork data to the `Construct` interface:

```typescript
// Add to Construct interface:
forkedFrom: { slug: string; name: string } | null;
forkCount: number;
```

In the single-construct detail fetch path, join `forked_from` to get parent info:

```typescript
// In getConstructBySlug service:
const parentPack = pack.forkedFrom
  ? await db.select({ slug: packs.slug, name: packs.name })
      .from(packs).where(eq(packs.id, pack.forkedFrom)).limit(1)
  : null;

// Fork count:
const forkCount = await db.select({ count: count() })
  .from(packs).where(eq(packs.forkedFrom, pack.id));
```

### 4.3 SKILL.md Prose Pipeline (FR4) — Modifications to sync endpoint

#### 4.3.1 Extraction during `POST /packs/:slug/sync` (~line 950)

After the existing sync logic extracts files, add prose extraction within the same transaction:

```typescript
// Inside the sync transaction, after packFiles insert:
const skillProse = extractSkillProse(syncResult.files);

// Update packs table:
await tx.update(packs)
  .set({
    skillProse,           // NULL if no SKILL.md found
    // ...existing fields
  })
  .where(eq(packs.id, pack.id));
```

#### 4.3.2 `extractSkillProse()` utility

```typescript
import createDOMPurify from 'isomorphic-dompurify';
const DOMPurify = createDOMPurify();

export function extractSkillProse(files: SyncFile[]): string | null {
  // 1. Find primary SKILL.md (root-level preferred)
  const skillFile = files
    .filter(f => f.path.endsWith('/SKILL.md') || f.path === 'SKILL.md')
    .sort((a, b) => a.path.split('/').length - b.path.split('/').length)[0];

  if (!skillFile?.content) return null;

  let content = skillFile.content;

  // 2. Strip YAML frontmatter
  if (content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    if (endIdx !== -1) {
      content = content.slice(endIdx + 3).trim();
    }
  }

  // 3. Truncate at sentence boundary within 2000 chars
  if (content.length > 2000) {
    const truncated = content.slice(0, 2000);
    const lastSentence = Math.max(
      truncated.lastIndexOf('. '),
      truncated.lastIndexOf('.\n'),
      truncated.lastIndexOf('.\r\n')
    );
    content = lastSentence > 0 ? truncated.slice(0, lastSentence + 1) : truncated;
  }

  // 4. Sanitize (strip HTML tags, prevent injection)
  content = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] });

  return content || null;
}
```

### 4.4 Showcases API (FR6) — NEW: `routes/showcases.ts` or in `packs.ts`

Given the small surface area, add to existing `packs.ts` router.

#### 4.4.1 `POST /v1/packs/:slug/showcases`

**Auth**: `requireAuth()`

```typescript
const createShowcaseSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url().max(2000),
  description: z.string().max(500).optional(),
});
```

Sanitize `description` before storage. Set `approved: false`, `submitted_by: userId`.

#### 4.4.2 `PATCH /v1/packs/:slug/showcases/:id/approve`

**Auth**: `requireAuth()` + `isPackOwner() || isAdmin()` — pack owner or admin can approve.

```typescript
// Toggle approval
await db.update(constructShowcases)
  .set({ approved: true })
  .where(eq(constructShowcases.id, showcaseId));
```

This gives pack owners control over what appears on their construct's page. Admins can moderate across all packs.

#### 4.4.3 `GET /v1/packs/:slug/showcases`

**Auth**: `optionalAuth()`
Returns only `approved: true` showcases for public requests. Pack owners see all (including pending). Ordered by `created_at DESC`.

---

## 5. Explorer Changes

### 5.1 Transport Layer — `APIConstruct` type update

Add to `APIConstruct` interface in `transform-construct.ts`:

```typescript
// New fields (all optional for backwards compat)
forked_from?: { slug: string; name: string } | null;
fork_count?: number;
skill_prose?: string | null;
showcases?: Array<{ id: string; title: string; url: string; description: string | null }>;
```

Add to `ConstructDetail` (camelCase):

```typescript
forkedFrom: { slug: string; name: string } | null;
forkCount: number;
skillProse: string | null;
```

### 5.2 Diagnostic Language (FR3) — `page.tsx:128-130`

Replace the "Level" stat block:

```tsx
// BEFORE:
<div className="border border-white/10 p-3">
  <p className="text-white/40 mb-1">Level</p>
  <p className="text-white capitalize">{construct.graduationLevel}</p>
</div>

// AFTER:
<div className="border border-white/10 p-3">
  <p className="text-white text-sm">
    {diagnosticLabel(construct.graduationLevel)}
  </p>
</div>
```

Helper function (in same file or extracted to utils):

```typescript
function diagnosticLabel(maturity: string): string {
  switch (maturity) {
    case 'experimental':
      return 'Experimental — needs README + 7 days for beta';
    case 'beta':
      return 'Beta — needs CHANGELOG + no critical issues for stable';
    case 'stable':
      return 'Stable';
    case 'deprecated':
      return 'Deprecated';
    default:
      return 'Experimental — needs README + 7 days for beta';
  }
}
```

### 5.3 SKILL.md Prose Rendering (FR4) — `page.tsx`

Above the existing identity section (line ~139), add:

```tsx
{construct.skillProse && (
  <div className="mb-8">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
    >
      {construct.skillProse}
    </ReactMarkdown>
  </div>
)}
```

Dependencies: `react-markdown`, `remark-gfm`, `rehype-sanitize` (check if already in `explorer/package.json`).

Falls back to existing `description` display when `skillProse` is null.

### 5.4 Fork Celebration (FR5) — `page.tsx`

Add near the maturity diagnostic:

```tsx
{construct.forkedFrom && (
  <Link href={`/constructs/${construct.forkedFrom.slug}`}
    className="text-sm text-amber-400/80 hover:text-amber-400">
    Forked from {construct.forkedFrom.name}
  </Link>
)}

{construct.forkCount > 0 && (
  <p className="text-sm text-white/40">
    {construct.forkCount} variant{construct.forkCount !== 1 ? 's' : ''} exist
  </p>
)}
```

On browse cards (construct list), show fork count as a small badge if > 0.

### 5.5 Accuracy Display (Sprint 3) — `page.tsx`

New section below showcases:

```tsx
{accuracy && accuracy.sufficient_data && (
  <div className="border border-white/10 p-4">
    <h3 className="text-white/60 text-sm mb-3">Signal Accuracy</h3>
    <div className="grid grid-cols-3 gap-3">
      <Stat label="Weighted κ" value={accuracy.weighted_kappa.toFixed(2)} />
      <Stat label="Coverage" value={`${(accuracy.coverage * 100).toFixed(0)}%`} />
      <Stat label="Sample" value={accuracy.sample_size} />
    </div>
    {accuracy.warnings.length > 0 && (
      <div className="mt-2 text-amber-400/60 text-xs">
        {accuracy.warnings.map(w => <p key={w}>{w}</p>)}
      </div>
    )}
  </div>
)}
```

Data fetched via `GET /v1/signals/accuracy/${slug}` in `fetchConstruct()`.

---

## 6. Service Layer Detail

### 6.1 `services/signals.ts` (NEW)

```typescript
export async function createSignalOutcome(params: {
  packId: string;
  signalType: string;
  signalSource: string;
  signalSourceUrl?: string;
  predictedImpact: string;
  recordedBy: string;
}): Promise<SignalOutcome>;

export async function evaluateSignalOutcome(params: {
  outcomeId: string;
  actualImpact: string;
  outcomeSummary?: string;
  outcomeEvidence?: string;
  evaluatedBy: string;
}): Promise<SignalOutcome>;

export async function listOutcomes(
  packId: string,
  opts: { includeEvidence: boolean; page: number; perPage: number }
): Promise<{ outcomes: SignalOutcome[]; total: number; evaluated: number }>;

export async function computeAccuracy(packId: string): Promise<AccuracyReport>;
```

### 6.2 `services/constructs.ts` modifications

#### 6.2.1 `RELEVANCE_WEIGHTS.downloads` change (FR7)

```typescript
// Before:
downloads: 0.3,

// After:
downloads: 0.1,
```

No other changes to the scoring function. The log-scale formula at lines 219-222 remains the same, just with reduced weight.

#### 6.2.2 `Construct` interface additions

```typescript
// Add to existing Construct interface:
forkedFrom: { slug: string; name: string } | null;
forkCount: number;
skillProse: string | null;
```

#### 6.2.3 `packToConstruct` mapping additions (~line 411)

Add fork and prose fields to the mapping function. The fork parent lookup is a separate query only for single-construct detail fetches (not list queries, to avoid N+1).

For list queries: `forkedFrom: null, forkCount: 0, skillProse: null` (lightweight defaults).
For detail queries: actual FK join + count subquery.

---

## 7. Documentation Changes

### 7.1 `docs/GRADUATION.md` (FR7)

**Before** (lines 23, 34):
```
experimental → beta: 10+ downloads, README present, 7+ days
beta → stable: 100+ downloads, test coverage, 30+ days
```

**After**:
```
experimental → beta: 7+ days since creation, README present (≥200 words), at least 1 SKILL.md file
beta → stable: 30+ days at beta, CHANGELOG present, no open issues labeled `critical` or `breaking`
```

### 7.2 Certificate Rename (FR8)

Comment-only changes (identifiers are already generic):

| File | Line | Before | After |
|------|------|--------|-------|
| `schema.ts` | 1171 | `CalibrationCertificate` in JSDoc | `VerificationCertificate` |
| `0005_construct_verifications.sql` | 77 | `CalibrationCertificate` in SQL COMMENT | `VerificationCertificate` |

Documentation grep-and-replace across:
- `grimoires/bridgebuilder/echelon-integration-gaps.md` (~14 occurrences)
- `grimoires/bridgebuilder/observer-laboratory-success-case.md` (~9 occurrences)
- `grimoires/bridgebuilder/rd-synthesis-behavioral-measurement.md` (~5 occurrences)

---

## 8. Security Architecture

### 8.1 Authentication & Authorization

| Endpoint | Auth | Ownership Check |
|----------|------|-----------------|
| `POST /v1/packs/:slug/signals/outcomes` | `requireAuth()` | `isPackOwner(pack.id, userId)` |
| `PATCH /v1/packs/:slug/signals/outcomes/:id` | `requireAuth()` | `(isPackOwner() OR isAdmin())` AND `userId !== outcome.recordedBy` |
| `GET /v1/packs/:slug/signals/outcomes` | `optionalAuth()` | None (public summaries) |
| `GET /v1/packs/:slug/signals/outcomes/detail` | `requireAuth()` | `isPackOwner()` |
| `GET /v1/packs/:slug/signals/accuracy` | `optionalAuth()` | None (public aggregates, cached 10min) |
| `POST /v1/packs/:slug/showcases` | `requireAuth()` | None (any authenticated user) |
| `PATCH /v1/packs/:slug/showcases/:id/approve` | `requireAuth()` | `isPackOwner() OR isAdmin()` |
| `GET /v1/packs/:slug/showcases` | `optionalAuth()` | None (approved only; owner sees all) |

### 8.2 Input Sanitization

All user-supplied text fields sanitized before DB storage:

| Field | Sanitization | Library |
|-------|-------------|---------|
| `outcome_summary` | Strip HTML tags | `isomorphic-dompurify` |
| `outcome_evidence` | URL validation (stored privately) | Zod `.url()` |
| `skill_prose` | Strip HTML tags, strip frontmatter | `isomorphic-dompurify` |
| `showcase.description` | Strip HTML tags | `isomorphic-dompurify` |
| `showcase.url` | URL validation | Zod `.url()` |

### 8.3 Rate Limiting

| Endpoint | Limit | Per |
|----------|-------|-----|
| `POST /v1/packs/:slug/signals/outcomes` | 50/hour | User |
| `POST /v1/packs/:slug/showcases` | 20/hour | User |

Implementation: follows existing pattern from `checkSyncRateLimit()` in `packs.ts` — count recent records by user within time window via raw SQL.

### 8.4 Data Privacy

- `outcome_evidence` is NEVER returned in public endpoints
- Public endpoints return `outcome_summary` only (free-text, sanitized)
- Accuracy endpoint returns aggregated statistics, never individual outcomes
- No PII in any new public response fields

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Component | Tests |
|-----------|-------|
| `extractSkillProse()` | Frontmatter stripping, sentence boundary, XSS vector sanitization, null SKILL.md |
| `computeAccuracy()` | Confusion matrix, kappa computation, guardrail thresholds, empty data |
| `buildWarnings()` | Sample size < 20, coverage < 50%, self-eval > 50% |
| `diagnosticLabel()` | All 4 maturity levels + unknown fallback |

### 9.2 Integration Tests

| Endpoint | Test Cases |
|----------|------------|
| `POST /v1/packs/:slug/signals/outcomes` | Happy path, non-owner 403, rate limit 429, duplicate signal 409 |
| `PATCH /v1/packs/:slug/signals/outcomes/:id` | Happy path, self-evaluation blocked 403, single-maintainer self-eval allowed with flag |
| `GET /v1/signals/accuracy/:slug` | Sufficient data, insufficient data, no data, warnings |
| `POST /packs/fork` | Verify `forked_from` set on new pack |
| `POST /packs/:slug/sync` | Verify `skill_prose` extracted and sanitized |
| `GET /v1/constructs/:slug` | Verify `forked_from` and `fork_count` in response |

### 9.3 Security Tests

- Attempt XSS payload in `outcome_summary` → verify sanitized
- Attempt HTML in `skill_prose` SKILL.md → verify stripped
- Attempt to evaluate own prediction → verify 403
- Attempt to read `outcome_evidence` via public endpoint → verify absent

---

## 10. Deployment & Migration

### 10.1 Migration Rollout

1. Run `0006_measurement_honesty.sql` on staging Supabase
2. Verify all existing queries still work (additive changes only)
3. Deploy API with new schema code
4. Run migration on production
5. Deploy Explorer with new components

### 10.2 Rollback

All changes are additive. Rollback = revert code, columns remain unused. No data migration needed.

### 10.3 Dependencies

| Dependency | Status | Action |
|-----------|--------|--------|
| Migration 0005 (construct_verifications) | Verify in production | Check before running 0006 |
| `isomorphic-dompurify` | Not in current deps | Add to `apps/api/package.json` |
| `react-markdown` + `rehype-sanitize` | Check Explorer deps | Add if not present |
| Drizzle migration tooling | Working | Generate migration from schema diff |

---

## 11. Sprint Mapping

### Sprint 1: Measurement Foundation (P0)

| Task | Files Modified | New Files |
|------|---------------|-----------|
| Migration 0006 | `schema.ts` | `drizzle/0006_measurement_honesty.sql` |
| Signal outcomes API | `packs.ts` (mount router) | `routes/signals.ts`, `services/signals.ts` |
| Fork provenance | `packs.ts:1709`, `constructs.ts` (interface + mapping) | — |
| Kill download graduation | `constructs.ts:142`, `docs/GRADUATION.md` | — |

### Sprint 2: Explorer Reality (P1)

| Task | Files Modified | New Files |
|------|---------------|-----------|
| Diagnostic language | `page.tsx:128-130` | — |
| SKILL.md prose | `packs.ts` (sync), `page.tsx`, `transform-construct.ts` | Util: `extractSkillProse.ts` |
| Fork celebration | `page.tsx`, `transform-construct.ts`, browse cards | — |
| Certificate rename | `schema.ts:1171`, `0005_...sql:77`, 3 grimoire files | — |

### Sprint 3: Visible Craft (P2)

| Task | Files Modified | New Files |
|------|---------------|-----------|
| Showcases API | `packs.ts` (new routes) | — |
| Explorer Built With | `page.tsx` | — |
| Accuracy display | `page.tsx`, `fetch-constructs.ts` | — |

---

## 12. Technical Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| `isomorphic-dompurify` requires `jsdom` in Node.js | Low | Well-established pattern; alternative: `sanitize-html` |
| Weighted kappa with sparse data produces unstable values | Medium | Only compute when n ≥ 20; show "insufficient data" otherwise |
| Fork count N+1 on list queries | Low | Only compute fork count on detail page, not list. List shows boolean `is_fork` only |
| `skill_prose` adds ~2KB per sync | Low | Only stored on `packs` table row; no separate file storage needed |
| Migration 0006 lock on `packs` table during ALTER | Medium | Nullable ALTER TABLE is `ACCESS EXCLUSIVE` but instant on Postgres 11+; no data rewrite needed |

---

## 13. Flatline Review Integration

**Review ID**: flatline-sdd-20260222
**Models**: Opus + GPT-5.2 | **Confidence**: FULL (90% agreement) | **Cost**: 62¢

### HIGH_CONSENSUS Integrated (4)

| ID | Finding | Integration |
|----|---------|-------------|
| IMP-001 | Missing TS interfaces for AccuracyReport/SignalOutcome | Added §4.1.8 with full interface definitions |
| IMP-002 | Accuracy computation needs caching | Added §4.1.7 with Redis TTL 10min + invalidation on evaluation write |
| IMP-003 | Evaluator authorization gap | Added explicit auth rules: isPackOwner OR isAdmin, not just "any user" |
| IMP-006 | Showcase approval has no mechanism | Added PATCH approve endpoint with pack owner/admin auth |

### DISPUTED Resolved (1)

| ID | Finding | Resolution |
|----|---------|-----------|
| IMP-010 | Backfill historical fork provenance | Accepted as documented decision: NO backfill. Documented rationale in §3.1.1 |

### BLOCKERS Addressed (5)

| ID | Concern | Resolution |
|----|---------|-----------|
| SKP-001 (900) | constructSlug vs pack_slug path ambiguity | All signal endpoints now pack-scoped: `/v1/packs/:slug/signals/*` |
| SKP-001 (850) | Self-evaluation bypass undermines premise | Self-evaluated outcomes excluded from kappa (weight=0), displayed separately, warning at 20% |
| SKP-002 (750) | No caching for accuracy | Covered by IMP-002: Redis cache with 10min TTL |
| SKP-002 (740) | Uniqueness constraint too coarse | Changed to `UNIQUE(pack_id, signal_type, signal_source)` |
| SKP-003 (950) | Any auth user can evaluate | Covered by IMP-003: restricted to pack owner + admin |

---

*"The architecture serves the measurement. The measurement serves the maker."*

# SDD: Observer Verification Infrastructure & Echelon Access

**Cycle**: cycle-033
**Created**: 2026-02-21
**Status**: Draft
**PRD**: `grimoires/loa/prd.md`
**Grounded in**: `apps/api/src/db/schema.ts` (1182 lines), `apps/api/src/routes/packs.ts` (1719 lines), `apps/api/src/routes/constructs.ts` (334 lines), `apps/api/src/services/constructs.ts` (1011 lines), `apps/explorer/lib/data/fetch-constructs.ts` (238 lines), `apps/explorer/lib/types/graph.ts` (91 lines), `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx` (231 lines)

---

## 1. Executive Summary

This SDD designs the verification infrastructure that makes the Constructs Network the first marketplace where expertise is verified, not just declared. The work spans 3 layers across 2 apps:

1. **Database Layer** — 1 new table (`construct_verifications`), 1 new relation, 1 new migration file, `contentHash` population fix
2. **API Layer** — 3 new endpoints in `packs.ts` (GET/POST verification, GET ground-truth), 1 service extension in `constructs.ts`
3. **Explorer Layer** — Type extensions in `graph.ts` + `fetch-constructs.ts`, identity content rendering + verification badge in `[slug]/page.tsx`, verification filter on catalog page

**Change surface**: ~8 files modified, ~1 file created (migration SQL). No new npm dependencies. No breaking changes to existing responses.

---

## 2. System Architecture

### 2.1 Component Interaction

```
┌─────────────────────┐     ┌──────────────────────┐
│  Echelon Pipeline    │     │  Construct Maintainer │
│  (Tobias)            │     │  (@zksoju)            │
└──────────┬──────────┘     └──────────┬───────────┘
           │ POST /verification        │ POST /sync
           ▼                           ▼
┌─────────────────────────────────────────────────┐
│  API (Hono + Node.js on Railway)                │
│                                                  │
│  packs.ts     ──  GET/POST /verification        │
│                   GET /ground-truth              │
│  constructs.ts ── GET /:slug (extended response)│
│                                                  │
│  schema.ts    ──  construct_verifications table  │
│                   packsRelations (identity)      │
└──────────┬──────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│  PostgreSQL (Supabase)                          │
│  - construct_verifications (NEW)                │
│  - construct_identities (EXISTS, needs migrate) │
│  - pack_versions.contentHash (EXISTS, unused)   │
└──────────┬──────────────────────────────────────┘
           │ ISR fetch (1h revalidation)
           ▼
┌─────────────────────────────────────────────────┐
│  Explorer (Next.js 15 on Vercel)                │
│  - Identity content display                      │
│  - Verification tier badge                       │
│  - Verification filter on catalog               │
└─────────────────────────────────────────────────┘
```

### 2.2 Data Flow — Verification Lifecycle

```
1. Observer maintainer syncs construct repo
   POST /v1/packs/observer/sync
   → pack_versions.manifest includes workflow.verification.checks
   → contentHash computed and stored (FR-7 fix)

2. Tobias reads Observer's ground truth
   GET /v1/packs/observer/ground-truth
   → Returns verification_checks from manifest + metadata summary

3. Echelon runs verification pipeline (384 tests)
   → Produces CalibrationCertificate JSON

4. Tobias submits certificate
   POST /v1/packs/observer/verification
   → Inserted into construct_verifications
   → verification_tier = 'BACKTESTED'

5. Explorer fetches construct detail
   GET /v1/constructs/observer
   → Response now includes verification_tier + verified_at
   → Explorer renders tier badge + identity content
```

---

## 3. Data Architecture

### 3.1 New Table: `construct_verifications`

**Location**: `apps/api/src/db/schema.ts`, insert after `constructIdentities` table (line 1155)

```typescript
export const constructVerifications = pgTable(
  'construct_verifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    packId: uuid('pack_id')
      .notNull()
      .references(() => packs.id, { onDelete: 'cascade' }),
    verificationTier: varchar('verification_tier', { length: 20 }).notNull(),
    certificateJson: jsonb('certificate_json').notNull(),
    issuedBy: varchar('issued_by', { length: 100 }).notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    packIdx: index('idx_construct_verifications_pack').on(table.packId),
    latestIdx: index('idx_construct_verifications_latest').on(
      table.packId,
      table.createdAt
    ),
  })
);
```

**Design decisions**:

| Decision | Rationale |
|----------|-----------|
| `certificateJson` as JSONB, not typed columns | Echelon's CalibrationCertificate schema may evolve. JSONB stores the full document without migration overhead. Matches the `manifest` JSONB pattern on `packVersions` (line 563). |
| `verificationTier` as varchar, not enum | Only 3 values now (UNVERIFIED, BACKTESTED, PROVEN) but Echelon may add tiers. Varchar with application-level validation avoids future ALTER TYPE migrations. Compare: `maturity` uses a pgEnum because the values are closed (4 levels, unlikely to change). Verification tiers are open — Tobias already mentioned "tier_1_structural", "tier_2_behavioral", "tier_3_adversarial" in loa#379. |
| `onDelete: 'cascade'` on packId FK | Matches every other pack-referencing table (packVersions, packFiles, packInstallations, packSubscriptions, constructReviews). If a pack is deleted, its verifications have no meaning. |
| Append-only (no UPDATE) | Each verification is an immutable record. "Latest" is determined by `MAX(created_at)` query. This gives full audit trail for free. |
| No `status` column | A CalibrationCertificate is either valid or expired. Expiry is handled by `expires_at` comparison at read time, not a mutable status field. |

### 3.2 New Relations

**Location**: `apps/api/src/db/schema.ts`, after `packsRelations` (line 772-776)

```typescript
// Update packsRelations to include identity and verifications
export const packsRelations = relations(packs, ({ one, many }) => ({
  versions: many(packVersions),
  subscriptions: many(packSubscriptions),
  installations: many(packInstallations),
  identity: one(constructIdentities, {
    fields: [packs.id],
    references: [constructIdentities.packId],
  }),
  verifications: many(constructVerifications),
}));

// Add constructVerifications relations
export const constructVerificationsRelations = relations(
  constructVerifications,
  ({ one }) => ({
    pack: one(packs, {
      fields: [constructVerifications.packId],
      references: [packs.id],
    }),
  })
);
```

**Note**: The `packsRelations` change is from `({ many })` to `({ one, many })` because the `identity` relation uses `one()`. The `verifications` relation uses `many()` since a pack can have multiple verification records over time.

### 3.3 Migration File

**Location**: `apps/api/drizzle/0005_construct_verifications.sql`

Following the existing migration naming pattern (0000-0004):

```sql
-- Migration: construct_verifications table + pending schema tables
-- Cycle: cycle-033 — Observer Verification Infrastructure
-- @see grimoires/loa/sdd.md §3.1 construct_verifications

-- 1. construct_verifications (NEW)
CREATE TABLE IF NOT EXISTS "construct_verifications" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "pack_id" uuid NOT NULL REFERENCES "packs"("id") ON DELETE CASCADE,
  "verification_tier" varchar(20) NOT NULL,
  "certificate_json" jsonb NOT NULL,
  "issued_by" varchar(100) NOT NULL,
  "issued_at" timestamptz NOT NULL,
  "expires_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_construct_verifications_pack"
  ON "construct_verifications" ("pack_id");
CREATE INDEX IF NOT EXISTS "idx_construct_verifications_latest"
  ON "construct_verifications" ("pack_id", "created_at");

-- 2. Pending tables from schema.ts that may not be in production
-- These use CREATE TABLE IF NOT EXISTS for idempotency

-- construct_identities (schema.ts:1136-1155)
CREATE TABLE IF NOT EXISTS "construct_identities" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "pack_id" uuid NOT NULL REFERENCES "packs"("id") ON DELETE CASCADE,
  "persona_yaml" text,
  "expertise_yaml" text,
  "cognitive_frame" jsonb,
  "expertise_domains" jsonb,
  "voice_config" jsonb,
  "model_preferences" jsonb,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_construct_identities_pack"
  ON "construct_identities" ("pack_id");

-- construct_reviews (schema.ts:1082-1107)
CREATE TABLE IF NOT EXISTS "construct_reviews" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "pack_id" uuid NOT NULL REFERENCES "packs"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "rating" integer NOT NULL,
  "title" varchar(200),
  "body" text,
  "author_response" text,
  "author_responded_at" timestamptz,
  "is_hidden" boolean DEFAULT false,
  "hidden_reason" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_construct_reviews_pack"
  ON "construct_reviews" ("pack_id");
CREATE INDEX IF NOT EXISTS "idx_construct_reviews_user"
  ON "construct_reviews" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_construct_reviews_unique"
  ON "construct_reviews" ("pack_id", "user_id");

-- graduation_requests (schema.ts:1012-1060)
CREATE TABLE IF NOT EXISTS "graduation_requests" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "construct_type" varchar(10) NOT NULL,
  "construct_id" uuid NOT NULL,
  "current_maturity" "construct_maturity" NOT NULL,
  "target_maturity" "construct_maturity" NOT NULL,
  "requested_by" uuid NOT NULL REFERENCES "users"("id"),
  "requested_at" timestamptz DEFAULT now(),
  "request_notes" text,
  "criteria_snapshot" jsonb DEFAULT '{}',
  "reviewed_at" timestamptz,
  "reviewed_by" uuid REFERENCES "users"("id"),
  "review_notes" text,
  "rejection_reason" varchar(50),
  "status" "graduation_request_status" DEFAULT 'pending',
  "created_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_graduation_requests_construct"
  ON "graduation_requests" ("construct_type", "construct_id");
CREATE INDEX IF NOT EXISTS "idx_graduation_requests_status"
  ON "graduation_requests" ("status");

-- github_webhook_deliveries (schema.ts:1115-1125)
CREATE TABLE IF NOT EXISTS "github_webhook_deliveries" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "delivery_id" varchar(100) NOT NULL,
  "received_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_github_webhook_delivery"
  ON "github_webhook_deliveries" ("delivery_id");

-- categories (schema.ts:1165-1181)
CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "slug" varchar(50) UNIQUE NOT NULL,
  "label" varchar(100) NOT NULL,
  "color" varchar(7) NOT NULL,
  "description" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_categories_slug"
  ON "categories" ("slug");
CREATE INDEX IF NOT EXISTS "idx_categories_sort_order"
  ON "categories" ("sort_order");

COMMENT ON TABLE "construct_verifications"
  IS 'Stores CalibrationCertificates from external verifiers (Echelon). Append-only audit trail.';
```

**Migration strategy**: Use `drizzle-kit push --dry-run` first to verify diff. The `IF NOT EXISTS` clauses ensure idempotency if tables were partially created. The enum types `construct_maturity` and `graduation_request_status` are already defined in schema.ts and should exist from previous migrations — if not, `drizzle-kit push` will create them.

### 3.4 Content Hash Population Fix

**Location**: `apps/api/src/routes/packs.ts`, sync transaction (lines 938-1030)

The `packVersions` insert at line 951-972 omits `contentHash`. Fix:

```typescript
// Inside the sync transaction, after files are processed:
// Compute Merkle-root content hash for divergence detection
const hashInput = syncResult.files
  .map((f) => `${f.path}:${f.contentHash}`)
  .sort()
  .join('\n');
const computedHash = `sha256:${createHash('sha256').update(hashInput).digest('hex')}`;

// Include contentHash in the version insert
const [version] = await tx
  .insert(packVersions)
  .values({
    packId: pack.id,
    version: syncResult.version,
    manifest: syncResult.manifest,
    isLatest: true,
    publishedAt: new Date(),
    totalSizeBytes: syncResult.totalSizeBytes,
    fileCount: syncResult.files.length,
    contentHash: computedHash,  // ← NEW
  })
  .onConflictDoUpdate({
    target: [packVersions.packId, packVersions.version],
    set: {
      manifest: syncResult.manifest,
      isLatest: true,
      publishedAt: new Date(),
      totalSizeBytes: syncResult.totalSizeBytes,
      fileCount: syncResult.files.length,
      contentHash: computedHash,  // ← NEW
    },
  })
  .returning();
```

This eliminates the on-the-fly fallback in `GET /packs/:slug/hash` (lines 1590-1596). The `createHash` import already exists at line 50.

---

## 4. API Design

### 4.1 GET /v1/packs/:slug/verification

**Location**: `apps/api/src/routes/packs.ts`, after permissions endpoint (line 1641)

```typescript
packsRouter.get(
  '/:slug/verification',
  optionalAuth(),
  async (c) => {
    const slug = c.req.param('slug');
    const requestId = randomUUID();

    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw Errors.NotFound('Pack not found');
    }

    // Fetch latest verification (most recent created_at)
    const { constructVerifications } = await import('../db/index.js');
    const [latest] = await db
      .select()
      .from(constructVerifications)
      .where(eq(constructVerifications.packId, pack.id))
      .orderBy(desc(constructVerifications.createdAt))
      .limit(1);

    if (!latest) {
      return c.json({
        data: {
          slug,
          verification_tier: 'UNVERIFIED',
          certificate: null,
          verified_at: null,
          expired: false,
        },
        request_id: requestId,
      });
    }

    const expired = latest.expiresAt
      ? new Date(latest.expiresAt) < new Date()
      : false;

    return c.json({
      data: {
        slug,
        verification_tier: latest.verificationTier,
        certificate: latest.certificateJson,
        issued_by: latest.issuedBy,
        issued_at: latest.issuedAt,
        expires_at: latest.expiresAt,
        verified_at: latest.createdAt,
        expired,
      },
      request_id: requestId,
    });
  }
);
```

**Design notes**:
- `optionalAuth()` — public read. Anyone browsing constructs can see verification status.
- Returns `UNVERIFIED` with null certificate when no verification exists (not 404).
- `expired` flag computed at read time from `expires_at` vs `now()`.
- Single indexed query: `WHERE pack_id = $1 ORDER BY created_at DESC LIMIT 1`.

### 4.2 POST /v1/packs/:slug/verification

```typescript
const verificationSchema = z.object({
  verification_tier: z.enum(['UNVERIFIED', 'BACKTESTED', 'PROVEN']),
  certificate_json: z.record(z.unknown()),
  issued_by: z.string().min(1).max(100),
  issued_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
});

packsRouter.post(
  '/:slug/verification',
  requireAuth(),
  zValidator('json', verificationSchema),
  async (c) => {
    const slug = c.req.param('slug');
    const userId = c.get('userId');
    const requestId = c.get('requestId');
    const body = c.req.valid('json');

    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw Errors.NotFound('Pack not found');
    }

    // Authorization: pack owner only (MVP)
    // Future: add verifier role for external parties
    const isOwner = await isPackOwner(pack.id, userId);
    if (!isOwner) {
      throw Errors.Forbidden(
        'Only pack owners can submit verifications. ' +
        'Verifier role support coming soon.'
      );
    }

    // Rate limit: 10 verifications per pack per day
    const { constructVerifications } = await import('../db/index.js');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(constructVerifications)
      .where(
        and(
          eq(constructVerifications.packId, pack.id),
          sql`${constructVerifications.createdAt} > ${oneDayAgo}`
        )
      );

    if ((recentCount?.count ?? 0) >= 10) {
      throw Errors.RateLimited(
        'Maximum 10 verification submissions per pack per day.'
      );
    }

    // Insert verification record (append-only)
    const [verification] = await db
      .insert(constructVerifications)
      .values({
        packId: pack.id,
        verificationTier: body.verification_tier,
        certificateJson: body.certificate_json,
        issuedBy: body.issued_by,
        issuedAt: new Date(body.issued_at),
        expiresAt: body.expires_at ? new Date(body.expires_at) : null,
      })
      .returning();

    logger.info(
      {
        packId: pack.id,
        slug,
        tier: body.verification_tier,
        issuedBy: body.issued_by,
        userId,
        requestId,
      },
      'Verification certificate submitted'
    );

    return c.json(
      {
        data: {
          id: verification.id,
          slug,
          verification_tier: verification.verificationTier,
          issued_by: verification.issuedBy,
          issued_at: verification.issuedAt,
          created_at: verification.createdAt,
        },
        request_id: requestId,
      },
      201
    );
  }
);
```

**Design decisions**:

| Decision | Rationale |
|----------|-----------|
| `requireAuth()` + owner check | MVP scope. Tobias will submit via @zksoju's credentials or we add verifier role in future cycle. Keeps auth simple — no new role tables. |
| Rate limit via DB count, not Redis | Verification submissions are rare (< daily). DB count is adequate. Matches the `countRecentSubmissions` pattern in submissions.ts. |
| `z.record(z.unknown())` for certificate_json | Accepts any valid JSON object. Echelon's schema is their domain — we store it verbatim. No risk of schema drift blocking submissions. |
| `z.string().datetime()` for timestamps | ISO 8601 validation. Echelon produces ISO timestamps. |

### 4.3 GET /v1/packs/:slug/ground-truth

```typescript
packsRouter.get(
  '/:slug/ground-truth',
  optionalAuth(),
  async (c) => {
    const slug = c.req.param('slug');
    const requestId = randomUUID();

    const pack = await getPackBySlug(slug);
    if (!pack) {
      throw Errors.NotFound('Pack not found');
    }

    // Read verification checks from manifest
    const latestVersion = await getLatestPackVersion(pack.id);
    const manifest = latestVersion?.manifest as Record<string, unknown> | null;
    const workflow = manifest?.workflow as Record<string, unknown> | undefined;
    const verification = workflow?.verification as Record<string, unknown> | undefined;
    const checks = verification?.checks as Record<string, string> | undefined;

    // Read latest certificate for additional metadata
    const { constructVerifications } = await import('../db/index.js');
    const [latestCert] = await db
      .select()
      .from(constructVerifications)
      .where(eq(constructVerifications.packId, pack.id))
      .orderBy(desc(constructVerifications.createdAt))
      .limit(1);

    // Extract ground truth metadata from certificate if available
    const certData = latestCert?.certificateJson as Record<string, unknown> | null;

    return c.json({
      data: {
        slug,
        ground_truth: {
          verification_checks: checks || null,
          verification_tier: latestCert?.verificationTier || 'UNVERIFIED',
          verified_at: latestCert?.createdAt || null,
          certificate_metadata: certData ? {
            issued_by: latestCert?.issuedBy,
            issued_at: latestCert?.issuedAt,
            expires_at: latestCert?.expiresAt,
          } : null,
        },
        manifest_version: latestVersion?.version || null,
        content_hash: latestVersion?.contentHash || null,
      },
      request_id: requestId,
    });
  }
);
```

**Design notes**:
- Combines manifest-embedded checks with latest certificate metadata.
- `optionalAuth()` — Tobias can read without authentication.
- No expensive computation — reads from existing `pack_versions.manifest` JSONB + single `construct_verifications` query.
- The `verification_checks` field comes from `workflow.verification.checks` in the manifest, which the Observer maintainer populates with honest-status values (`verified`, `installed_but_unmeasured`, `architectural_guarantee`, `partial`).

### 4.4 Construct Detail Response Extension

**Location**: `apps/api/src/services/constructs.ts`

Extend `fetchPackAsConstruct` (line 916-953) to include verification tier:

```typescript
// After the identity query (lines 931-946), add:

// Fetch latest verification tier
let verificationTier: string = 'UNVERIFIED';
let verifiedAt: Date | null = null;
try {
  const [latestVerification] = await db
    .select({
      verificationTier: constructVerifications.verificationTier,
      createdAt: constructVerifications.createdAt,
    })
    .from(constructVerifications)
    .where(eq(constructVerifications.packId, pack.id))
    .orderBy(desc(constructVerifications.createdAt))
    .limit(1);
  if (latestVerification) {
    verificationTier = latestVerification.verificationTier;
    verifiedAt = latestVerification.createdAt;
  }
} catch {
  // construct_verifications table might not exist yet — fail gracefully
}
```

Extend `Construct` interface (line 36-75):

```typescript
// Add to Construct interface:
verificationTier: string;
verifiedAt: Date | null;
```

Extend `packToConstruct` return value:

```typescript
// Add to return object:
verificationTier: verificationTier || 'UNVERIFIED',
verifiedAt: verifiedAt || null,
```

Extend `formatConstructDetail` in `constructs.ts` route (line 83-120):

```typescript
// Add to formatConstructDetail return:
verification_tier: c.verificationTier,
verified_at: c.verifiedAt instanceof Date
  ? c.verifiedAt.toISOString()
  : c.verifiedAt,
```

**Note**: The `try/catch` graceful fallback matches the existing identity pattern at lines 930-946 of `constructs.ts`. This ensures the endpoint works even before migrations run.

---

## 5. Explorer Design

### 5.1 Type Extensions

**Location**: `apps/explorer/lib/types/graph.ts`

Add to `ConstructDetail` interface (line 58-71):

```typescript
export interface ConstructDetail extends ConstructNode {
  // ... existing fields ...
  hasIdentity: boolean;
  identity?: {
    cognitiveFrame?: Record<string, unknown>;
    expertiseDomains?: string[];
    voiceConfig?: Record<string, unknown>;
    modelPreferences?: Record<string, unknown>;
  } | null;
  verificationTier: string;
  verifiedAt: string | null;
  // ... existing fields ...
}
```

### 5.2 Fetch Layer Extensions

**Location**: `apps/explorer/lib/data/fetch-constructs.ts`

Add to `APIConstruct` interface (line 6-37):

```typescript
identity?: {
  cognitive_frame?: Record<string, unknown>;
  expertise_domains?: string[];
  voice_config?: Record<string, unknown>;
  model_preferences?: Record<string, unknown>;
} | null;
verification_tier?: string;
verified_at?: string | null;
```

Update `transformToDetail` (line 92-131):

```typescript
function transformToDetail(construct: APIConstruct): ConstructDetail {
  // ... existing transformation ...
  return {
    ...node,
    // ... existing fields ...
    hasIdentity: construct.has_identity ?? false,
    identity: construct.identity ?? null,
    verificationTier: construct.verification_tier || 'UNVERIFIED',
    verifiedAt: construct.verified_at ?? null,
    // ... existing fields ...
  };
}
```

### 5.3 Detail Page — Identity Content Display

**Location**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`

Replace the boolean "Expert Identity" badge (lines 79-83) with actual content:

```tsx
{/* Verification Tier Badge */}
{(() => {
  const tier = construct.verificationTier;
  if (tier === 'PROVEN') {
    return (
      <span className="border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-mono text-green-400">
        Proven
      </span>
    );
  }
  if (tier === 'BACKTESTED') {
    return (
      <span className="border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-mono text-yellow-400">
        Backtested
      </span>
    );
  }
  return (
    <span className="border border-white/20 px-2 py-0.5 text-[10px] font-mono text-white/40">
      Unverified
    </span>
  );
})()}
```

Add identity section after the info grid (after line 115):

```tsx
{/* Expert Identity */}
{construct.identity && (
  <div>
    <h2 className="text-sm font-mono font-bold text-white mb-3">Expert Identity</h2>
    {/* Expertise Domains */}
    {Array.isArray(construct.identity.expertiseDomains) &&
      construct.identity.expertiseDomains.length > 0 && (
      <div className="mb-3">
        <p className="text-xs font-mono text-white/40 mb-2">Expertise Domains</p>
        <div className="flex flex-wrap gap-2">
          {construct.identity.expertiseDomains.map((domain: string) => (
            <span
              key={domain}
              className="border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-xs font-mono text-emerald-400"
            >
              {domain}
            </span>
          ))}
        </div>
      </div>
    )}
    {/* Cognitive Frame */}
    {construct.identity.cognitiveFrame && (
      <div className="border border-white/10 p-3">
        <p className="text-xs font-mono text-white/40 mb-1">Cognitive Frame</p>
        <pre className="text-xs font-mono text-white/60 whitespace-pre-wrap">
          {JSON.stringify(construct.identity.cognitiveFrame, null, 2)}
        </pre>
      </div>
    )}
  </div>
)}
```

Add verification section after identity:

```tsx
{/* Verification Status */}
{construct.verificationTier && construct.verificationTier !== 'UNVERIFIED' && (
  <div>
    <h2 className="text-sm font-mono font-bold text-white mb-3">Verification</h2>
    <div className="border border-white/10 p-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-mono text-white/40">Tier</span>
        <span className="text-xs font-mono text-white capitalize">
          {construct.verificationTier.toLowerCase()}
        </span>
      </div>
      {construct.verifiedAt && (
        <p className="text-xs font-mono text-white/40">
          Verified {new Date(construct.verifiedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  </div>
)}
```

### 5.4 Catalog Page — Verification Filter

**Location**: `apps/explorer/app/(marketing)/constructs/page.tsx`

This is a client-side filter since the catalog page already fetches all constructs and filters locally (lines 19-38). Add verification tier to the `ConstructNode` type when the data is available:

**For MVP**: No catalog filter. Verification tier is only shown on the detail page. The catalog page uses `ConstructNode` (not `ConstructDetail`), which doesn't have verification data. Adding a filter would require either:
- Adding `verification_tier` to the list endpoint response (extra JOIN per construct)
- Fetching detail data for all constructs (expensive)

**Recommendation**: Defer catalog filter to a follow-up. The detail page badge provides immediate value. If needed later, add `verification_tier` to the `formatConstruct` function (not just `formatConstructDetail`).

---

## 6. Security Architecture

### 6.1 Access Model

```
                        Public          Pack Owner      Admin
GET  /verification      ✓               ✓               ✓
POST /verification      ✗               ✓               ✓
GET  /ground-truth      ✓               ✓               ✓
```

- **Public read**: Verification status is marketplace information. No auth required.
- **Owner-only write (MVP)**: Pack owner submits certificates on behalf of verifiers.
- **Future**: Verifier role — authorized external parties (Echelon) submit directly. Requires new `verifier_authorizations` table mapping `(pack_id, user_id, role)`. Out of scope for this cycle.

### 6.2 Input Validation

| Field | Validation | Why |
|-------|-----------|-----|
| `verification_tier` | `z.enum(['UNVERIFIED', 'BACKTESTED', 'PROVEN'])` | Closed set prevents injection via tier field |
| `certificate_json` | `z.record(z.unknown())` | Accepts any JSON object but rejects non-objects (strings, arrays, nulls). Stored as JSONB — Postgres validates structure. |
| `issued_by` | `z.string().min(1).max(100)` | Prevents empty strings and very long values |
| `issued_at` | `z.string().datetime()` | ISO 8601 only — no arbitrary date strings |
| `expires_at` | `z.string().datetime().optional()` | Optional — some certificates don't expire |

### 6.3 Rate Limiting

- **POST /verification**: 10 per pack per day (DB-counted, not Redis).
- Rationale: Verification is a rare event (< daily). DB count is simpler than Redis and matches `countRecentSubmissions` in `submissions.ts`.

### 6.4 CalibrationCertificate Size

The `certificateJson` JSONB column has no explicit size limit in Postgres (JSONB can store up to 255MB). However, the Hono JSON body parser has a default limit. Add explicit validation:

```typescript
// In verificationSchema:
certificate_json: z.record(z.unknown()).refine(
  (val) => JSON.stringify(val).length <= 1_000_000,
  { message: 'Certificate JSON must be under 1MB' }
),
```

1MB is generous — Echelon's CalibrationCertificate with full evidence bundle should be well under 100KB.

---

## 7. Integration Points

### 7.1 Echelon CalibrationCertificate Schema

The POST endpoint accepts Echelon's v1.0.0 schema directly:

```json
{
  "verification_tier": "BACKTESTED",
  "certificate_json": {
    "construct_slug": "observer",
    "verification_tier": "tier_2_behavioral",
    "checks": {
      "provenance_integrity": {
        "status": "verified",
        "details": "163 records, SHA-256 chain intact"
      },
      "source_fidelity_gate": {
        "status": "installed_but_unmeasured",
        "details": "Gate exists, no measurement baseline"
      }
    },
    "issued_at": "2026-02-21T12:00:00Z",
    "valid_until": "2026-05-21T12:00:00Z",
    "issuer": "echelon",
    "signature": "optional-base64-signature"
  },
  "issued_by": "echelon",
  "issued_at": "2026-02-21T12:00:00Z",
  "expires_at": "2026-05-21T12:00:00Z"
}
```

**Note**: The top-level `verification_tier` maps to our registry tier (UNVERIFIED/BACKTESTED/PROVEN). The `certificate_json.verification_tier` is Echelon's internal tier naming (tier_1_structural, tier_2_behavioral, tier_3_adversarial). These are intentionally different — our tier is the public-facing marketplace tier, Echelon's is their internal granularity.

### 7.2 Construct-Observer Repo

Tobias accesses Observer via:
1. **construct-observer** GitHub repo (public/invited): Skills, manifest, identity YAML, ground truth metadata in `verification/` directory.
2. **Registry API**: `GET /v1/constructs/observer` (construct detail + identity + verification tier), `GET /v1/packs/observer/ground-truth` (verification checks + metadata).

He never accesses midi-interface. The construct repo is the shareable unit.

### 7.3 Sync Flow Integration

When `POST /v1/packs/:slug/sync` runs, the sync transaction now:
1. Computes and stores `contentHash` (§3.4 fix)
2. Upserts `constructIdentities` (existing, lines 1002-1028)
3. Does NOT auto-create verification records — verification is always an explicit external action

---

## 8. Performance

### 8.1 Query Patterns

| Query | Expected Load | Index | Cost |
|-------|--------------|-------|------|
| Latest verification per pack | `GET /verification` — once per page load | `idx_construct_verifications_latest (pack_id, created_at)` | Single B-tree lookup, O(1) |
| Verification count for rate limit | `POST /verification` — rare | `idx_construct_verifications_pack (pack_id)` + date filter | Small scan (< 10 rows/day) |
| Identity JOIN | `GET /constructs/:slug` — once per page load | `idx_construct_identities_pack (pack_id)` UNIQUE | Single index lookup, O(1) |

### 8.2 Caching

- **Explorer ISR**: 10-minute revalidation on detail page (`revalidate = 600`, line 6 of `[slug]/page.tsx`). Acceptable for verification changes (rare events).
- **Redis construct cache**: `CACHE_TTL.constructDetail` already caches `GET /v1/constructs/:slug`. Cache includes new `verificationTier` and `verifiedAt` fields. TTL unchanged.
- **No new Redis keys**: Verification data piggybacks on existing construct detail cache.

---

## 9. Development Workflow

### 9.1 Sprint 1: Infrastructure Foundation

**Files modified**:
1. `apps/api/src/db/schema.ts` — Add `constructVerifications` table + relations
2. `apps/api/drizzle/0005_construct_verifications.sql` — Migration file
3. `apps/api/src/routes/packs.ts` — `contentHash` population in sync transaction

**Verification**: Run migration against staging Supabase. Verify with:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'construct_verifications',
  'construct_identities',
  'construct_reviews',
  'graduation_requests',
  'github_webhook_deliveries',
  'categories'
);
```

### 9.2 Sprint 2: Verification API + Ground Truth

**Files modified**:
1. `apps/api/src/routes/packs.ts` — 3 new endpoints (GET/POST verification, GET ground-truth)
2. `apps/api/src/services/constructs.ts` — Add `verificationTier`/`verifiedAt` to `Construct` interface and `fetchPackAsConstruct`
3. `apps/api/src/routes/constructs.ts` — Extend `formatConstructDetail` with `verification_tier`/`verified_at`

**Verification**: curl tests against staging:
```bash
# Submit a test certificate
curl -X POST https://api.constructs.network/v1/packs/observer/verification \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"verification_tier":"BACKTESTED","certificate_json":{"test":true},"issued_by":"manual-test","issued_at":"2026-02-21T00:00:00Z"}'

# Read it back
curl https://api.constructs.network/v1/packs/observer/verification

# Check ground truth
curl https://api.constructs.network/v1/packs/observer/ground-truth

# Verify construct detail includes verification_tier
curl https://api.constructs.network/v1/constructs/observer | jq '.data.verification_tier'
```

### 9.3 Sprint 3: Explorer Verification Display

**Files modified**:
1. `apps/explorer/lib/types/graph.ts` — Add `identity`, `verificationTier`, `verifiedAt` to `ConstructDetail`
2. `apps/explorer/lib/data/fetch-constructs.ts` — Extend `APIConstruct` + `transformToDetail`
3. `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx` — Identity section + verification badge + verification section

**Verification**: Navigate to `constructs.network/constructs/observer` and verify:
- Verification tier badge visible in header
- Expert Identity section with expertise domain tags
- Verification section with tier + date (if verification exists)

---

## 10. Technical Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Migration fails on production Supabase | Low | Critical | `IF NOT EXISTS` on all CREATE statements. `drizzle-kit push --dry-run` first. Supabase has point-in-time recovery. |
| `constructIdentities` table doesn't exist when sync tries to upsert | Medium | Medium | Already handled: `try/catch` at `constructs.ts:930-946`. Sync transaction has no `constructIdentities` in the explicit transaction — upsert is lines 1002-1028 inside a try block. |
| Echelon certificate schema changes break validation | Low | Low | `z.record(z.unknown())` accepts any JSON. Schema changes don't break storage. Only `verification_tier` enum is validated — and it's our enum, not Echelon's. |
| Explorer shows stale verification after certificate submission | Medium | Low | 10-minute ISR revalidation. For urgent updates, Vercel's on-demand ISR can be triggered via `res.revalidate()`. Acceptable for MVP. |
| Pack owner submits fraudulent verification certificate | Medium | Medium | MVP accepts owner-submitted only. Tobias works through @zksoju. Future: verifier role with cryptographic attestation from Echelon's signing key. |
| `contentHash` computation adds latency to sync | Low | Low | SHA-256 of sorted `path:hash` strings is microseconds. Files are already hashed individually during sync. |

---

## 11. Out of Scope (Explicit)

- Verifier role with separate authorization table
- CalibrationCertificate viewer with evidence panel (Phase 4 UX)
- Verification history timeline
- Catalog page verification filter (requires list endpoint extension)
- Cross-construct event bus
- Observer skill extraction from midi-interface
- Automated monthly certificate generation
- Constraint yielding enforcement based on verification tier

---

## Next Step

`/sprint-plan` — Break this SDD into 3 sprint plans with task-level granularity and acceptance criteria per task.

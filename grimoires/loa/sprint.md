# Sprint Plan: Observer Verification Infrastructure & Echelon Access

**Cycle**: cycle-033
**Created**: 2026-02-21
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Global Sprint Range**: sprint-28 through sprint-30
**Team**: Solo developer (1 agent)
**Sprint Duration**: ~1 session each

---

## Sprint 1: Infrastructure Foundation (global sprint-28)

**Goal**: Establish all database infrastructure — tables, relations, migration, and content hash fix. After this sprint, `construct_verifications` exists in production and sync populates `contentHash`.

**Blocks**: Sprint 2 and Sprint 3 (nothing works without the tables)

### Task 1.1: Add `constructVerifications` table to schema

**File**: `apps/api/src/db/schema.ts`
**Insert after**: `constructIdentities` table (line 1155)

**Work**:
- Add `constructVerifications` pgTable with columns: `id`, `packId`, `verificationTier`, `certificateJson`, `issuedBy`, `issuedAt`, `expiresAt`, `createdAt`
- Add two indexes: `idx_construct_verifications_pack` (packId) and `idx_construct_verifications_latest` (packId + createdAt)
- Add `constructVerificationsRelations` with `one(packs)` back-reference

**Acceptance Criteria**:
- [ ] `constructVerifications` table defined in `schema.ts` with all 7 data columns + 1 PK
- [ ] Two indexes defined in the table's third argument
- [ ] `constructVerificationsRelations` defined with `pack: one(packs, ...)` relation
- [ ] TypeScript compiles without errors (`pnpm --filter api build`)

**Ref**: SDD §3.1, §3.2

---

### Task 1.2: Update `packsRelations` to include identity and verifications

**File**: `apps/api/src/db/schema.ts:772-776`

**Work**:
- Change `packsRelations` from `({ many })` to `({ one, many })`
- Add `identity: one(constructIdentities, { fields: [packs.id], references: [constructIdentities.packId] })`
- Add `verifications: many(constructVerifications)`

**Acceptance Criteria**:
- [ ] `packsRelations` destructures `({ one, many })` instead of `({ many })`
- [ ] `identity` relation points to `constructIdentities` via `packs.id` → `constructIdentities.packId`
- [ ] `verifications` relation points to `constructVerifications`
- [ ] TypeScript compiles without errors

**Ref**: SDD §3.2, PRD FR-8

---

### Task 1.3: Create migration file `0005_construct_verifications.sql`

**File**: `apps/api/drizzle/0005_construct_verifications.sql` (NEW)

**Work**:
- Write SQL for all 6 pending tables using `CREATE TABLE IF NOT EXISTS` for idempotency:
  1. `construct_verifications` (new — this cycle)
  2. `construct_identities` (defined in schema.ts, not yet migrated)
  3. `construct_reviews` (defined in schema.ts, not yet migrated)
  4. `graduation_requests` (defined in schema.ts, not yet migrated)
  5. `github_webhook_deliveries` (defined in schema.ts, not yet migrated)
  6. `categories` (defined in schema.ts, not yet migrated)
- Include all indexes with `CREATE INDEX IF NOT EXISTS`
- Add table comment on `construct_verifications`

**Acceptance Criteria**:
- [ ] Migration file exists at `apps/api/drizzle/0005_construct_verifications.sql`
- [ ] All 6 tables use `CREATE TABLE IF NOT EXISTS`
- [ ] All indexes use `CREATE INDEX IF NOT EXISTS`
- [ ] `construct_verifications` has `CASCADE` on `pack_id` FK
- [ ] `construct_identities` has `UNIQUE INDEX` on `pack_id`
- [ ] `graduation_requests` references `construct_maturity` and `graduation_request_status` enums
- [ ] SQL is syntactically valid (no parse errors)

**Ref**: SDD §3.3

---

### Task 1.4: Populate `contentHash` during sync transaction

**File**: `apps/api/src/routes/packs.ts` (sync transaction, lines 938-1030)

**Work**:
- After files are processed in the sync transaction, compute Merkle-root content hash:
  ```
  hashInput = files.map(f => `${f.path}:${f.contentHash}`).sort().join('\n')
  computedHash = `sha256:${createHash('sha256').update(hashInput).digest('hex')}`
  ```
- Add `contentHash: computedHash` to the `packVersions` insert (line 951-972)
- Add `contentHash: computedHash` to the `onConflictDoUpdate` set clause

**Acceptance Criteria**:
- [ ] `contentHash` field included in `packVersions` insert `.values({})`
- [ ] `contentHash` field included in `.onConflictDoUpdate({ set: {} })`
- [ ] Hash computed from sorted `path:contentHash` pairs using SHA-256
- [ ] `createHash` import already exists (line 50) — no new imports needed
- [ ] TypeScript compiles without errors

**Ref**: SDD §3.4, PRD FR-7

---

### Sprint 1 Definition of Done

- All 4 tasks completed
- `pnpm --filter api build` passes
- Migration file reviewed for SQL correctness
- No breaking changes to existing endpoints

---

## Sprint 2: Verification API + Ground Truth (global sprint-29)

**Goal**: Ship the 3 new API endpoints and extend the construct detail response with verification tier. After this sprint, Tobias can submit CalibrationCertificates and read verification status.

**Depends on**: Sprint 1 (tables must exist)
**Blocks**: Sprint 3 (Explorer needs API data)

### Task 2.1: GET /v1/packs/:slug/verification endpoint

**File**: `apps/api/src/routes/packs.ts`
**Insert after**: permissions endpoint (line 1641)

**Work**:
- Add route with `optionalAuth()` (public read)
- Query `constructVerifications` for latest row by `pack_id` ordered by `created_at DESC LIMIT 1`
- Return `UNVERIFIED` with null certificate when no verification exists (not 404)
- Compute `expired` flag from `expires_at` vs `now()` at read time
- Response shape: `{ data: { slug, verification_tier, certificate, issued_by, issued_at, expires_at, verified_at, expired }, request_id }`

**Acceptance Criteria**:
- [ ] Endpoint registered at `GET /:slug/verification` on `packsRouter`
- [ ] Uses `optionalAuth()` — no authentication required
- [ ] Returns `{ verification_tier: 'UNVERIFIED', certificate: null }` when no records exist
- [ ] Returns latest certificate with all fields when records exist
- [ ] `expired` boolean computed from `expires_at < now()`
- [ ] Uses `desc(constructVerifications.createdAt)` ordering
- [ ] TypeScript compiles

**Ref**: SDD §4.1

---

### Task 2.2: POST /v1/packs/:slug/verification endpoint

**File**: `apps/api/src/routes/packs.ts`

**Work**:
- Add Zod schema: `verification_tier` (enum UNVERIFIED/BACKTESTED/PROVEN), `certificate_json` (record with 1MB size limit), `issued_by` (string 1-100), `issued_at` (datetime), `expires_at` (optional datetime)
- Add route with `requireAuth()` + `zValidator('json', verificationSchema)`
- Check pack ownership with `isPackOwner()` — 403 if not owner
- Rate limit: count certificates created in last 24h for this pack, reject if >= 10
- Insert append-only record into `constructVerifications`
- Log submission with structured logger
- Return 201 with created record summary

**Acceptance Criteria**:
- [ ] Zod schema validates all 5 fields with correct types
- [ ] `certificate_json` validated with `.refine()` for 1MB max size
- [ ] `requireAuth()` middleware applied
- [ ] Pack ownership check via `isPackOwner()` — returns 403 with helpful message for non-owners
- [ ] Rate limit: 10 per pack per day, enforced via DB count query
- [ ] Insert uses `.returning()` to get created record
- [ ] Returns HTTP 201 on success
- [ ] Structured log includes `packId`, `slug`, `tier`, `issuedBy`, `userId`, `requestId`
- [ ] TypeScript compiles

**Ref**: SDD §4.2, §6.1-6.4

---

### Task 2.3: GET /v1/packs/:slug/ground-truth endpoint

**File**: `apps/api/src/routes/packs.ts`

**Work**:
- Add route with `optionalAuth()` (public read)
- Read `workflow.verification.checks` from latest `pack_versions.manifest` JSONB
- Read latest certificate from `constructVerifications` for metadata
- Return combined response with `verification_checks`, `verification_tier`, `verified_at`, `certificate_metadata`, `manifest_version`, `content_hash`

**Acceptance Criteria**:
- [ ] Endpoint registered at `GET /:slug/ground-truth` on `packsRouter`
- [ ] Uses `optionalAuth()` — no authentication required
- [ ] Reads `workflow.verification.checks` from manifest JSONB (safe chain with optional access)
- [ ] Reads latest certificate for metadata (issued_by, issued_at, expires_at)
- [ ] Returns `verification_tier: 'UNVERIFIED'` when no certificate exists
- [ ] Includes `manifest_version` and `content_hash` from `packVersions`
- [ ] TypeScript compiles

**Ref**: SDD §4.3

---

### Task 2.4: Extend construct detail response with verification tier

**Files**:
- `apps/api/src/services/constructs.ts` — `Construct` interface, `fetchPackAsConstruct`, `packToConstruct`
- `apps/api/src/routes/constructs.ts` — `formatConstructDetail`

**Work**:
- Add `verificationTier: string` and `verifiedAt: Date | null` to `Construct` interface (line 36-75)
- In `fetchPackAsConstruct` (line 916-953), after identity query, add verification tier query with try/catch fallback
- Add fields to `packToConstruct` return value
- Extend `formatConstructDetail` (line 83-120) with `verification_tier` and `verified_at`

**Acceptance Criteria**:
- [ ] `Construct` interface has `verificationTier: string` and `verifiedAt: Date | null`
- [ ] `fetchPackAsConstruct` queries `constructVerifications` for latest tier
- [ ] Query wrapped in try/catch for graceful fallback (table may not exist yet)
- [ ] Default is `'UNVERIFIED'` with `null` verifiedAt
- [ ] `formatConstructDetail` includes `verification_tier` and `verified_at` in response
- [ ] `verified_at` serialized as ISO string via `.toISOString()`
- [ ] Existing `GET /v1/constructs/:slug` response unchanged except for 2 new fields
- [ ] TypeScript compiles

**Ref**: SDD §4.4

---

### Sprint 2 Definition of Done

- All 4 tasks completed
- `pnpm --filter api build` passes
- All 3 new endpoints respond correctly:
  - `GET /v1/packs/:slug/verification` returns UNVERIFIED for packs without certificates
  - `POST /v1/packs/:slug/verification` accepts CalibrationCertificate and returns 201
  - `GET /v1/packs/:slug/ground-truth` returns metadata
- `GET /v1/constructs/:slug` includes `verification_tier` in response
- No breaking changes to existing API responses

---

## Sprint 3: Explorer Verification Display (global sprint-30)

**Goal**: Make verification visible in the marketplace. Identity content displayed, verification tier badge rendered, verification section added to detail page.

**Depends on**: Sprint 2 (API must serve verification data)

### Task 3.1: Extend Explorer types and fetch layer

**Files**:
- `apps/explorer/lib/types/graph.ts` — `ConstructDetail` interface
- `apps/explorer/lib/data/fetch-constructs.ts` — `APIConstruct` interface, `transformToDetail`

**Work**:
- Add `identity` optional object to `ConstructDetail` with `cognitiveFrame`, `expertiseDomains`, `voiceConfig`, `modelPreferences`
- Add `verificationTier: string` and `verifiedAt: string | null` to `ConstructDetail`
- Add `identity`, `verification_tier`, `verified_at` to `APIConstruct` interface
- Update `transformToDetail` to map snake_case API fields to camelCase:
  - `identity: construct.identity ?? null`
  - `verificationTier: construct.verification_tier || 'UNVERIFIED'`
  - `verifiedAt: construct.verified_at ?? null`

**Acceptance Criteria**:
- [ ] `ConstructDetail` has `identity?: { cognitiveFrame?, expertiseDomains?, voiceConfig?, modelPreferences? } | null`
- [ ] `ConstructDetail` has `verificationTier: string` and `verifiedAt: string | null`
- [ ] `APIConstruct` has matching optional fields with snake_case naming
- [ ] `transformToDetail` correctly maps all new fields
- [ ] `pnpm --filter explorer build` passes

**Ref**: SDD §5.1, §5.2

---

### Task 3.2: Render identity content on detail page

**File**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`

**Work**:
- Replace boolean "Expert Identity" badge (lines 79-83) with verification tier badge:
  - PROVEN → green border + text
  - BACKTESTED → yellow border + text
  - UNVERIFIED → gray border + text
- Add identity section after info grid (after line 115):
  - Expertise domains as tag badges (emerald color scheme)
  - Cognitive frame as expandable `<pre>` block
- Keep existing page structure intact — additive changes only

**Acceptance Criteria**:
- [ ] Verification tier badge renders with 3 color variants (green/yellow/gray)
- [ ] Badge text matches tier: "Proven" / "Backtested" / "Unverified"
- [ ] Expertise domains render as individual tag badges when `identity.expertiseDomains` exists
- [ ] Cognitive frame renders as formatted JSON in a `<pre>` element when `identity.cognitiveFrame` exists
- [ ] Section hidden when `identity` is null/undefined (no empty containers)
- [ ] Page layout unchanged for constructs without identity data
- [ ] `pnpm --filter explorer build` passes

**Ref**: SDD §5.3 (identity content + verification badge)

---

### Task 3.3: Add verification section to detail page

**File**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`

**Work**:
- Add "Verification" section after identity section
- Show only when `verificationTier !== 'UNVERIFIED'` (no empty section for unverified constructs)
- Display: tier name (capitalized), verified date (formatted)
- Keep minimal — CalibrationCertificate viewer is out of scope (Phase 4)

**Acceptance Criteria**:
- [ ] Verification section renders when `verificationTier !== 'UNVERIFIED'`
- [ ] Displays tier name as human-readable text (lowercase, capitalized)
- [ ] Displays `verifiedAt` date formatted with `toLocaleDateString()`
- [ ] Section hidden for UNVERIFIED constructs
- [ ] Follows existing page typography and spacing patterns (font-mono, text-xs, border-white/10)
- [ ] `pnpm --filter explorer build` passes

**Ref**: SDD §5.3 (verification section)

---

### Sprint 3 Definition of Done

- All 3 tasks completed
- `pnpm --filter explorer build` passes
- Detail page renders identity content for constructs with identity data
- Detail page renders verification tier badge for all constructs
- Detail page renders verification section for verified constructs
- No visual regression for existing constructs without identity/verification data

---

## File Change Summary

| Sprint | File | Change Type |
|--------|------|-------------|
| 1 | `apps/api/src/db/schema.ts` | MODIFY — add table, relations |
| 1 | `apps/api/drizzle/0005_construct_verifications.sql` | CREATE — migration |
| 1 | `apps/api/src/routes/packs.ts` | MODIFY — contentHash in sync |
| 2 | `apps/api/src/routes/packs.ts` | MODIFY — 3 new endpoints |
| 2 | `apps/api/src/services/constructs.ts` | MODIFY — interface + query |
| 2 | `apps/api/src/routes/constructs.ts` | MODIFY — formatConstructDetail |
| 3 | `apps/explorer/lib/types/graph.ts` | MODIFY — ConstructDetail type |
| 3 | `apps/explorer/lib/data/fetch-constructs.ts` | MODIFY — APIConstruct + transform |
| 3 | `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx` | MODIFY — identity + verification UI |

**Total**: 8 files modified, 1 file created. 3 sprints, 11 tasks.

---

## Sprint Dependencies

```
Sprint 1 (sprint-28) ──→ Sprint 2 (sprint-29) ──→ Sprint 3 (sprint-30)
  schema.ts table           GET verification         types + fetch layer
  packsRelations            POST verification        identity display
  migration SQL             GET ground-truth         verification badge
  contentHash fix           detail response ext.     verification section
```

---

## Risk Register

| Risk | Sprint | Mitigation |
|------|--------|-----------|
| Migration breaks production | 1 | `IF NOT EXISTS` on all statements, dry-run first |
| Enum types missing for graduation_requests | 1 | `drizzle-kit push` creates enums from schema.ts |
| Existing sync tests break with contentHash | 1 | contentHash is additive — test assertions check specific fields, not exact row shape |
| Rate limit count query slow | 2 | < 10 rows per day per pack — trivially fast |
| Explorer build fails on missing API fields | 3 | All new fields optional with fallback defaults |

---

## Next Step

`/implement sprint-1` — Infrastructure Foundation (DB schema + migration + contentHash)

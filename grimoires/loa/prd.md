# PRD: Observer Verification Infrastructure & Echelon Access

**Cycle**: cycle-033
**Created**: 2026-02-21
**Status**: Draft
**Source Issues**: [#131](https://github.com/0xHoneyJar/loa-constructs/issues/131) (Construct Lifecycle), [loa#379](https://github.com/0xHoneyJar/loa/issues/379) (Verification Gradient)
**Grounded in**:
- `grimoires/bridgebuilder/observer-laboratory-success-case.md` — Laboratory mapping, success metrics, Marry/Kiss/Kill
- `grimoires/bridgebuilder/observer-manifest-audit.md` — Current vs target manifest, 10 missing fields
- `grimoires/bridgebuilder/echelon-integration-gaps.md` — 3 blockers, critical path
- `grimoires/bridgebuilder/ARCHETYPE.md` — Bridgebuilder philosophy
- Codebase scan: exact file:line references for all integration points
- Echelon progress update (AITOBIAS04, loa#379 comment 2026-02-20): 384 tests, Theatre Template Engine shipped

---

## 1. Problem Statement

The Constructs Network has no verification infrastructure. A construct declaring `review: skip` in its manifest is trusted at face value — there is no mechanism to prove the construct deserves that trust, no place to store verification evidence, and no way to display verification status to marketplace users.

Concurrently, the first external collaborator (Tobias/Echelon) has built a verification pipeline (Product Theatres, CalibrationCertificates, verification tiers) and needs to integrate with Observer — but Observer's ground truth data is locked inside the private midi-interface repo with no safe access path.

**Three concrete problems:**

1. **No verification storage**: The DB has no table for verification certificates. The API has no endpoints. The Explorer has no display. Echelon's 384-test verification pipeline has nowhere to land its results.
   > Evidence: Codebase scan — zero `isVerified`, `verifiedAt`, or verification-related columns anywhere in `schema.ts` (1182 lines). No `/verify` routes in `packs.ts` (1719 lines).

2. **No safe construct sharing**: Observer's ground truth (163+ provenance records, 28 canvases, Score API data) lives in midi-interface. Giving Tobias full repo access exposes proprietary business logic, API keys, and user data unrelated to the construct.
   > Evidence: midi-interface root has ~2,640 Loa-related tracked files. Observer skills are 23 of hundreds of files.

3. **Identity data is served but invisible**: The API already returns `construct_identities` data (cognitive_frame, expertise_domains, voice_config, model_preferences) via `formatConstructDetail` (`constructs.ts:83-120`). The Explorer's `APIConstruct` interface (`fetch-constructs.ts:6-37`) only captures `has_identity: boolean` — all JSONB fields are silently dropped. The detail page (`page.tsx:79-83`) shows a boolean badge, not content.
   > Evidence: `fetch-constructs.ts:126` — `hasIdentity: construct.has_identity ?? false`. No `identity` object transformation.

---

## 2. Vision

**The Constructs Network becomes the first marketplace where expertise is verified, not just declared.** Observer earns PROVEN status through Echelon's verification pipeline, setting the precedent for every construct that follows.

The access pattern is construct-first: Tobias gets the construct (standalone repo with skills + manifest + ground truth data) and API access (verification endpoints). He never touches midi-interface. The construct is the shareable unit. The host project is private.

### Design Principles

| Principle | Application |
|-----------|------------|
| **Pashov Principle** | You earn the right to skip the audit by proving you don't need it. UNVERIFIED constructs declaring `review: skip` are treated as `review: full`. |
| **Honest Status** | Verification checks report `verified`, `installed_but_unmeasured`, `architectural_guarantee`, or `partial` — not `pass`/`fail` binary. |
| **Construct Export + Data API** | Ground truth travels through the registry API, not repo access. Tobias never sees midi-interface. |
| **Human-Defined Metrics** | Each construct's maintainer defines what matters for their domain. No universal Brier score across all constructs. |

---

## 3. Goals & Success Metrics

### Primary Goals

| Goal | Metric | Target |
|------|--------|--------|
| G1: Verification storage exists | `construct_verifications` table + GET/POST endpoints | Deployed to production |
| G2: Tobias can submit CalibrationCertificates | `POST /v1/packs/:slug/verification` accepts Echelon output | First certificate stored |
| G3: Verification tier visible in Explorer | Badge on construct detail page | Observer shows UNVERIFIED badge |
| G4: Identity content displayed in Explorer | Cognitive frame, expertise domains visible | Observer detail page shows identity |
| G5: Observer manifest has verification stanza | `workflow.verification.checks` with 4 honest-status checks | Manifest updated on construct-observer |

### Secondary Goals

| Goal | Metric | Target |
|------|--------|--------|
| G6: Ground truth API serves Observer data | `GET /v1/packs/:slug/ground-truth` returns provenance metadata | Endpoint functional |
| G7: DB migrations current | All schema.ts tables exist in production Supabase | Zero missing tables |
| G8: `contentHash` populated on sync | `packVersions.contentHash` set during `/sync` flow | Pre-computed hashes for all git-sourced packs |

---

## 4. User & Stakeholder Context

### Primary User: Tobias (Echelon Developer)

**Job-to-be-Done**: "Verify Observer's outputs against ground truth and produce a CalibrationCertificate that the network can consume."

**Needs**:
- Read access to Observer construct definition (skills, manifest, identity)
- Access to Observer's ground truth metadata (provenance record count, canvas coverage, enrichment timestamps)
- API endpoint to submit CalibrationCertificates
- Feedback loop: certificate → verification tier → visible in marketplace

**Does NOT need**: midi-interface source code, Score API keys, user data, business logic.

### Secondary User: Construct Marketplace Browsers

**Job-to-be-Done**: "Understand whether a construct's claimed expertise is verified or self-declared."

**Needs**:
- Verification tier badge (UNVERIFIED / BACKTESTED / PROVEN)
- Identity content (what does this construct know?)
- Honest status per verification check

### Stakeholder: @janitooor (Primary Maintainer)

**Needs**: DB migrations run safely, API changes reviewed, no breaking changes to existing flows.

### Stakeholder: @zksoju (Construct Maintainer, Product Lead)

**Needs**: Observer's verification stanza accurately reflects the midi-interface deployment. No false claims.

---

## 5. Functional Requirements

### FR-1: `construct_verifications` Table

**File**: `apps/api/src/db/schema.ts`
**Insert after**: `constructIdentities` table (line 1155)

```typescript
export const constructVerifications = pgTable('construct_verifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  packId: uuid('pack_id').references(() => packs.id, { onDelete: 'cascade' }).notNull(),
  verificationTier: varchar('verification_tier', { length: 20 }).notNull(),
    // 'UNVERIFIED' | 'BACKTESTED' | 'PROVEN'
  certificateJson: jsonb('certificate_json').notNull(),
    // Full CalibrationCertificate from Echelon
  issuedBy: varchar('issued_by', { length: 100 }).notNull(),
    // 'echelon' | 'manual-audit' | other verifier identifiers
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**Index**: `CREATE INDEX idx_cv_pack_id ON construct_verifications(pack_id)` — for quick lookup of latest verification per pack.

**Relationship to Echelon schema**: The `certificateJson` JSONB column accepts Echelon's `CalibrationCertificate` format directly (construct_slug, verification_tier, checks, issued_at, valid_until, issuer, notes). No transformation needed.

### FR-2: Verification API Endpoints

**File**: `apps/api/src/routes/packs.ts`
**Insert after**: permissions endpoint (line 1641)

**`GET /v1/packs/:slug/verification`**
- Auth: `optionalAuth()` — public read
- Returns: Latest `construct_verifications` row for the pack, or `{ verification_tier: 'UNVERIFIED', certificate: null }` if none exists
- Response includes `issued_at`, `expires_at`, `issued_by`, and full `certificate_json`
- If certificate has expired (`expires_at < now`), return it with `expired: true` flag but still show the tier

**`POST /v1/packs/:slug/verification`**
- Auth: `requireAuth()` — pack owner OR authorized verifier
- Body: `{ verification_tier, certificate_json, issued_by, issued_at, expires_at }`
- Validation: `verification_tier` must be one of `UNVERIFIED`, `BACKTESTED`, `PROVEN`
- Rate limit: 10 submissions per pack per day (prevent spam)
- On success: insert row into `construct_verifications`, return 201
- **Authorization model**: For MVP, pack owner can submit. Future: verifier role with separate auth.

### FR-3: Ground Truth Metadata Endpoint

**File**: `apps/api/src/routes/packs.ts`

**`GET /v1/packs/:slug/ground-truth`**
- Auth: `optionalAuth()`
- Returns metadata about the construct's ground truth data:
  ```json
  {
    "slug": "observer",
    "ground_truth": {
      "provenance_record_count": 163,
      "canvas_count": 28,
      "canvas_enriched_count": 16,
      "enrichment_coverage": 0.57,
      "last_sync": "2026-02-20T00:00:00Z",
      "verification_checks": {
        "provenance_integrity": "verified",
        "source_fidelity_gate": "installed_but_unmeasured",
        "rlm_isolation": "architectural_guarantee",
        "canvas_enrichment": "partial"
      }
    }
  }
  ```
- Source: Reads from `construct_verifications.certificate_json` if available, otherwise from `pack_versions.manifest` JSONB (`workflow.verification.checks`)
- This is a **read-only summary** — the actual provenance records live in the construct repo, not the registry DB

### FR-4: Explorer Identity Wiring

**Files**:
- `apps/explorer/lib/data/fetch-constructs.ts:6-37` — Extend `APIConstruct`
- `apps/explorer/lib/data/graph.ts:58-71` — Extend `ConstructDetail`
- `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx:79-83` — Extend display

**Changes**:

1. Add `identity` object to `APIConstruct` interface:
   ```typescript
   identity?: {
     cognitive_frame?: Record<string, unknown>;
     expertise_domains?: string[];
     voice_config?: Record<string, unknown>;
     model_preferences?: Record<string, unknown>;
   };
   ```

2. Add `identity` to `ConstructDetail` type and `transformToDetail`:
   ```typescript
   identity: construct.identity ?? null,
   ```

3. Render identity content on construct detail page:
   - Expertise domains as tag badges
   - Cognitive frame as expandable section
   - Replace boolean "Expert Identity" badge with actual content

### FR-5: Explorer Verification Display

**File**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`

1. Add `verification_tier` to API response (extend `formatConstructDetail` in `constructs.ts`):
   - JOIN `construct_verifications` on `pack_id`, get latest row
   - Add `verification_tier` and `verified_at` to response

2. Verification tier badge component:
   ```
   UNVERIFIED  → gray badge, no icon
   BACKTESTED  → yellow badge, checkmark icon
   PROVEN      → green badge, shield icon
   ```

3. Add verification section to detail page:
   - Current tier + when last verified
   - Verification checks summary (from ground-truth endpoint)
   - Link to full CalibrationCertificate (expandable JSON)

4. Add verification tier filter to construct list page

### FR-6: DB Migration Execution

**Files**: `apps/api/src/db/schema.ts`, Drizzle migration files

Run `drizzle-kit push` or `drizzle-kit generate` + `drizzle-kit migrate` to create all tables defined in schema.ts but not yet in production Supabase. This includes:
- `construct_identities` (lines 1136-1155)
- `construct_reviews` (lines 1082-1107)
- `graduation_requests` (lines 1012-1060)
- `github_webhook_deliveries` (lines 1158-1175)
- `categories` (lines 1061-1079)
- NEW: `construct_verifications` (from FR-1)

### FR-7: Content Hash Population

**File**: `apps/api/src/routes/packs.ts:938-972`

The `contentHash` column on `packVersions` (`schema.ts:578`) is never populated during sync. The `/hash` endpoint (`packs.ts:1571-1608`) always falls back to on-the-fly SHA-256 computation.

Fix: During the sync transaction (`packs.ts:938-1030`), compute and store `contentHash` alongside the version insert. This enables O(1) divergence detection for all git-sourced packs without hitting the fallback path.

### FR-8: Drizzle Relations for Identity

**File**: `apps/api/src/db/schema.ts:772-776`

The `packsRelations` definition has no relation to `constructIdentities`. Add:
```typescript
identity: one(constructIdentities, {
  fields: [packs.id],
  references: [constructIdentities.packId],
}),
```

This enables Drizzle `with: { identity: true }` joins, replacing the manual JOIN in `formatConstructDetail`.

---

## 6. Technical Requirements

### TR-1: Security — Construct Export, Not Repo Access

The access model is:
- **construct-observer repo** (public or Tobias-invited): Contains skills, manifest, identity, ground truth metadata. NO midi-interface business logic, NO API keys, NO user data.
- **Registry API** (authenticated): Verification endpoints, ground truth summary, CalibrationCertificate submission.
- **midi-interface** (private, NO access granted): Tobias never sees this repo.

Observer's instance data (provenance records, canvas contents) travels through:
1. Observer maintainer exports summary statistics to construct-observer manifest (`workflow.verification.checks`)
2. On sync, the registry ingests the manifest and serves it via ground truth endpoint
3. Full provenance records available in construct-observer repo's `verification/` directory (maintainer-curated subset)

### TR-2: Backward Compatibility

- All new fields optional on existing constructs
- New API endpoints don't modify existing response shapes
- Explorer changes are additive (new sections, not replacing existing ones)
- `construct_verifications` table is independent — no foreign keys to tables that might not exist

### TR-3: CalibrationCertificate Schema Compatibility

The `certificateJson` JSONB column must accept Echelon's schema without transformation. Key fields from Echelon's `CalibrationCertificate` schema v1.0.0:
- `construct_slug` (string)
- `verification_tier` (enum)
- `checks` (Record<string, { status, details }>)
- `issued_at`, `valid_until` (ISO 8601)
- `issuer` (string)
- `signature` (optional, for third-party auditability)

Design the POST endpoint to accept this shape directly.

### TR-4: Performance

- Verification lookup: Single indexed query on `pack_id`, return latest row
- Ground truth endpoint: Read from manifest JSONB or latest certificate — no expensive computation
- Explorer: ISR revalidation at 1 hour (matching existing `fetch-constructs.ts` pattern)
- Identity JOIN: Use Drizzle `with` clause once relation is defined (FR-8)

---

## 7. Scope & Prioritization

### In Scope (MVP — This Cycle)

- `construct_verifications` table + Drizzle migration
- `GET/POST /v1/packs/:slug/verification` endpoints
- `GET /v1/packs/:slug/ground-truth` endpoint
- Explorer identity content display (cognitive frame, expertise domains)
- Explorer verification tier badge + section
- DB migration execution (all pending tables)
- `contentHash` population during sync
- Drizzle relations for identity

### Out of Scope (Future Cycles)

- Observer skill extraction from midi-interface (separate construct-observer PR)
- CalibrationCertificate viewer with evidence panel (Phase 4 UX)
- Verification history timeline
- Automated monthly certificate generation
- Constraint yielding enforcement based on verification tier (loa framework change)
- Scoped fork path (`@thj/observer` registration)
- Cross-construct event bus
- Verifier role with separate authorization (MVP uses pack owner auth)

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Drizzle migration breaks production | Low | Critical | Run `drizzle-kit push --dry-run` first. Verify against staging. Supabase has point-in-time recovery. |
| CalibrationCertificate schema drifts from Echelon | Medium | Medium | Store as JSONB (flexible). Validate structure loosely. Design POST endpoint jointly with Tobias before implementation. |
| Explorer ISR cache shows stale verification tier | Low | Low | 1-hour revalidation is acceptable for verification changes (rare events). Add manual revalidation trigger for urgent updates. |
| Ground truth summary diverges from actual data | Medium | Medium | Summary is metadata only — counts and timestamps, not the data itself. Echelon's backtest runs against the actual construct repo, not the summary. |
| Tobias submits certificate before migration is run | High | Medium | Phase 1 (migrations) must complete before Phase 2 (endpoints). Strict sprint dependency. |

---

## 9. Dependencies

### Internal Dependencies

| Dependency | Status | Impact |
|-----------|--------|--------|
| cycle-032 construct lifecycle tooling | Completed (archived) | Schema extensions, .construct/ shadow, lifecycle skills all exist |
| `construct_identities` table in schema.ts | Defined, not migrated | Migration is FR-6 of this cycle |
| `contentHash` column on `packVersions` | Defined, never populated | FR-7 of this cycle |
| Explorer `hasIdentity` boolean badge | Exists (`page.tsx:79-83`) | Extend, not replace |

### External Dependencies

| Dependency | Status | Impact |
|-----------|--------|--------|
| Echelon CalibrationCertificate schema v1.0.0 | Published (AITOBIAS04/Echelon) | POST endpoint must match this shape |
| Tobias access to construct-observer repo | Pending | Required for ground truth data access |
| Supabase production access for migrations | Available to @janitooor | Required for FR-6 |

---

## 10. Proposed Sprint Sequence

| Sprint | Label | Deliverables | Blocks |
|--------|-------|-------------|--------|
| Sprint 1 | Infrastructure Foundation | FR-6 (DB migrations), FR-1 (`construct_verifications` table), FR-7 (`contentHash` population), FR-8 (Drizzle identity relation) | Blocks everything |
| Sprint 2 | Verification API + Ground Truth | FR-2 (GET/POST verification), FR-3 (ground truth endpoint), extend `formatConstructDetail` with verification tier | Blocks Sprint 3 |
| Sprint 3 | Explorer Verification Display | FR-4 (identity wiring), FR-5 (verification tier badge + section + filter) | Independent of API once Sprint 2 lands |

**Estimated timeline**: 3 sprints. Sprint 1 is infrastructure-only (DB changes, no user-facing). Sprint 2 enables Tobias to submit certificates. Sprint 3 makes verification visible in the marketplace.

---

## 11. Acceptance Criteria Summary

| # | Criterion | Verification Method |
|---|-----------|-------------------|
| AC-1 | `construct_verifications` table exists in production Supabase | `SELECT * FROM construct_verifications LIMIT 1` succeeds |
| AC-2 | `POST /v1/packs/observer/verification` accepts CalibrationCertificate JSON | curl test with Echelon schema returns 201 |
| AC-3 | `GET /v1/packs/observer/verification` returns latest certificate + tier | curl test returns verification_tier + certificate_json |
| AC-4 | `GET /v1/packs/observer/ground-truth` returns summary metadata | curl test returns provenance count, canvas coverage |
| AC-5 | Explorer construct detail page shows expertise domains | Navigate to constructs.network/constructs/observer, see domain tags |
| AC-6 | Explorer construct detail page shows verification tier badge | Navigate to constructs.network/constructs/observer, see UNVERIFIED badge |
| AC-7 | `contentHash` populated on next sync | Trigger sync, verify `packVersions.contentHash IS NOT NULL` |
| AC-8 | All pending DB tables exist in production | Query each table defined in schema.ts |

---

## Next Step

`/architect` — Software Design Document covering `construct_verifications` table design, API endpoint specs, Explorer component architecture, migration strategy, and Echelon CalibrationCertificate schema alignment.

# Echelon Integration Gap Assessment

> **Date**: 2026-02-20
> **Source**: Issue #131 (Construct Lifecycle RFC) + Tobias/Echelon collaboration path
> **Purpose**: Identify what specifically blocks Tobias from integrating Echelon's Product Theatre with Observer as an OracleAdapter

---

## TL;DR

**5 gaps block Tobias. 3 are already built but unexecuted (DB migrations, identity wiring). 2 require new work (certificate storage endpoint, verification tier display). The publish upload stub is NOT a blocker — git-sync already handles it.**

---

## 1. Gap Inventory

### Gap A: Publish Upload (constructs-publish.sh `push`)

**Status**: STUB — line 317 prints "not yet implemented"
**Rating**: `NOT_RELEVANT`

**Why**: The `push` subcommand in `constructs-publish.sh:247-319` validates, checks permissions, then prints a warning and exits. However, this is irrelevant because:
- The `POST /v1/packs/:slug/sync` endpoint (`packs.ts:879-1061`) already handles git-source sync completely
- The `POST /v1/webhooks/github` (`webhooks.ts:380-615`) auto-syncs on push/tag
- Tobias's `@thj/observer` would be git-sourced via `register-repo` + `sync`, not CLI push

The stub only matters for non-git-sourced constructs doing direct upload. Not on the Echelon path.

---

### Gap B: Scoped Fork Path (`@thj/observer`)

**Status**: API READY, never exercised
**Rating**: `NICE_TO_HAVE`

**What exists**:
- `POST /v1/packs/fork` endpoint (`packs.ts:1647-1718`) — creates a new pack entry with `slug: new_slug`, sets owner, returns 201
- `constructs-publish.sh fork --scope thj observer` shell command — calls the fork API

**What's missing**:
- Fork creates a slug reservation only (`status: 'reserved'`). Files are NOT copied from source. The fork owner must publish their own version via git-sync.
- No `forked_from` column in `packs` table to track provenance
- The slug format would be `thj-observer` (hyphenated), not `@thj/observer` (scoped) — registry slugs are flat

**Why NICE_TO_HAVE**: Tobias can achieve the same result by:
1. `POST /v1/constructs/register` with slug `thj-observer`
2. `POST /v1/packs/thj-observer/register-repo` pointing to his midi-interface fork
3. `POST /v1/packs/thj-observer/sync`

The fork endpoint is a UX shortcut, not a hard dependency.

---

### Gap C: Content Hash Endpoint for Divergence Detection

**Status**: BUILT AND DEPLOYED
**Rating**: `NOT_RELEVANT`

`GET /v1/packs/:slug/hash` (`packs.ts:1571-1608`) exists and works:
- Returns `{ slug, version, hash }` with sha256 Merkle root
- Falls back to on-the-fly computation if `contentHash` column is null
- `constructs-diff.sh check <slug>` consumes this endpoint

This is fully functional. Echelon's Product Theatre can call this to verify Observer hasn't drifted.

---

### Gap D: VerificationCertificate Storage & Retrieval

**Status**: NOT BUILT — **no endpoint or schema for external verification artifacts**
**Rating**: `BLOCKS_TOBIAS`

**The problem**: Echelon's Product Theatre produces a `VerificationCertificate` JSON containing:
- `verification_tier` (string: e.g., "tier_1_structural", "tier_2_behavioral", "tier_3_adversarial")
- `evidence_bundle` (array of test results, assertions, traces)
- `oracle_id` / `oracle_version` (which construct was verified)
- `issued_at` / `expires_at` timestamps
- `signature` (Echelon's attestation)

**Where would this live?** Currently, NOWHERE. The system has:
- `construct_identities` table — stores persona/expertise YAML, cognitive frame, voice config, model preferences. This is identity data, not verification data.
- `pack_versions.manifest` (JSONB) — stores the construct.yaml contents. Could theoretically jam a certificate in here but it's the wrong semantic.
- `packs.maturity` — an enum (`experimental | beta | stable | deprecated`). This is our internal graduation, not external verification.

**What's needed** (minimum viable):
1. A `construct_verifications` table:
   ```
   id, pack_id, verification_tier, certificate_json, issued_by, issued_at, expires_at, created_at
   ```
2. `GET /v1/packs/:slug/verification` — returns latest certificate + tier
3. `POST /v1/packs/:slug/verification` — accepts VerificationCertificate (auth: pack owner or authorized verifier)

**Alternatively** (zero-schema approach): Store the VerificationCertificate as a file in the pack's git repo (`verification/calibration-certificate.json`) and let the existing `sync` flow ingest it as a regular pack file. The Explorer then fetches it from `GET /v1/packs/:slug/download` and extracts the file. This avoids new tables but requires Explorer to know about the file convention.

---

### Gap E: Database Migrations Not Executed

**Status**: SCHEMA DEFINED, MIGRATIONS NOT RUN
**Rating**: `BLOCKS_TOBIAS`

The Drizzle schema (`schema.ts`) defines `constructIdentities` table (lines 1136-1155) with all fields needed for identity data. However:
- Only 5 migration files exist, all from January 2026
- The `construct_identities`, `construct_reviews`, `graduation_requests`, `github_webhook_deliveries`, `categories` tables appear in schema.ts but may not be migrated to production
- Without `construct_identities` in prod DB, the sync endpoint's identity upsert (`packs.ts:1003-1028`, `webhooks.ts:571-596`) will fail

**What's needed**: Run `drizzle-kit push` or `drizzle-kit migrate` against production Supabase to create all tables defined in schema.ts but not yet in production.

---

### Gap F: Explorer Identity Wiring (Display Layer)

**Status**: PARTIALLY BUILT
**Rating**: `NICE_TO_HAVE` (for initial collab; `BLOCKS_TOBIAS` for public-facing verification)

**What exists**:
- API: `GET /v1/constructs/:slug` returns `has_identity: true/false` and full `identity` object with `cognitive_frame`, `expertise_domains`, `voice_config`, `model_preferences` (constructs.ts service, routes/constructs.ts:83-120)
- Explorer type: `ConstructDetail.hasIdentity: boolean` exists (graph.ts:68)
- Explorer fetch: `fetchConstruct()` in `fetch-constructs.ts:92-131` maps `has_identity` → `hasIdentity`
- Explorer display: construct detail page shows "Expert Identity" badge when `hasIdentity` is true (page.tsx:79-83)

**What's missing**:
- No display of identity DETAILS (cognitive frame, expertise domains, voice config) — just a boolean badge
- No verification tier display (because Gap D doesn't exist yet)
- No VerificationCertificate viewer component

**Why NICE_TO_HAVE for initial collab**: The "Expert Identity" badge is already there. Tobias can see Observer has identity. Detailed verification display is a downstream UX concern, not a collaboration blocker.

---

### Gap G: Verification Tier Display in Explorer

**Status**: NOT BUILT
**Rating**: `BLOCKS_TOBIAS` (for the full loop — Echelon verifies → tier surfaces in marketplace)

This depends entirely on Gap D. Once VerificationCertificate data is stored, the Explorer needs:
1. API to expose verification tier in construct list/detail responses
2. Frontend component to render verification tier (badge, certificate viewer)
3. Sort/filter by verification tier in construct browsing

Without this, Echelon's verification work is invisible to marketplace users — defeating the purpose of the collaboration.

---

## 2. Tobias-Specific Impact Matrix

| Gap | Rating | Can Tobias Work Without It? | Why |
|-----|--------|-----------------------------|-----|
| A. Publish upload stub | `NOT_RELEVANT` | Yes | Git-sync handles it |
| B. Scoped fork path | `NICE_TO_HAVE` | Yes | Register + register-repo achieves same |
| C. Content hash endpoint | `NOT_RELEVANT` | Yes | Already built and functional |
| D. VerificationCertificate storage | `BLOCKS_TOBIAS` | No | No place to store/serve verification results |
| E. DB migrations | `BLOCKS_TOBIAS` | No | Identity upsert fails without tables |
| F. Explorer identity wiring | `NICE_TO_HAVE` | Yes (partial) | Badge exists, details are UX polish |
| G. Verification tier display | `BLOCKS_TOBIAS` | No | Verification invisible without this |

---

## 3. Critical Path — Minimum to Unblock

### Phase 1: Infrastructure (blocks everything)
**Effort: Small (~1 sprint task)**
1. Run Drizzle migrations to create `construct_identities`, `construct_reviews`, `graduation_requests`, `github_webhook_deliveries`, `categories` tables in production Supabase
2. Verify identity upsert works via manual `POST /v1/packs/:slug/sync` test

### Phase 2: Verification Storage (blocks Echelon loop)
**Effort: Medium (~2-3 sprint tasks)**
1. Add `construct_verifications` table to Drizzle schema
2. Add `GET /v1/packs/:slug/verification` endpoint
3. Add `POST /v1/packs/:slug/verification` endpoint (auth: owner or authorized verifier role)
4. Run migration

### Phase 3: Explorer Display (blocks public visibility)
**Effort: Medium (~2 sprint tasks)**
1. Extend `GET /v1/constructs/:slug` response to include `verification_tier` and `verified_at` from `construct_verifications`
2. Add verification tier badge to Explorer construct detail page
3. Add verification filter to Explorer construct list

### Phase 4: Full Loop (optional, enables rich UX)
**Effort: Large**
1. VerificationCertificate viewer component in Explorer
2. Evidence bundle display (test results, assertions)
3. Verification history timeline
4. Scoped fork provenance tracking (`forked_from` column)

---

## 4. Echelon Deliverable → System Mapping

| Echelon Deliverable | Storage Location | Endpoint | Explorer Display |
|---------------------|-----------------|----------|-----------------|
| `VerificationCertificate` JSON | `construct_verifications.certificate_json` | `POST /v1/packs/:slug/verification` | Certificate viewer (Phase 4) |
| `verification_tier` string | `construct_verifications.verification_tier` | `GET /v1/packs/:slug/verification` | Badge on detail page (Phase 3) |
| `evidence_bundle` array | Inside `certificate_json` JSONB | Same as above | Evidence panel (Phase 4) |
| `oracle_id` (Observer ref) | `construct_verifications.pack_id` FK | Implicit in URL | Already linked via slug |
| `issued_at` / `expires_at` | `construct_verifications` columns | Same as above | Timeline (Phase 4) |
| `signature` (Echelon attestation) | Inside `certificate_json` | Same as above | Signature badge (Phase 4) |

---

## 5. Key Answers

### Q1: Can Tobias access Observer's ground truth WITHOUT the missing API endpoints?

**Partially.** If migrations are run (Gap E), then:
- `GET /v1/constructs/observer` returns the full manifest, identity data, and construct metadata
- `GET /v1/packs/observer/hash` returns the content hash for integrity verification
- `GET /v1/packs/observer/download` returns all pack files including skill YAML

What he CANNOT do: store VerificationCertificates back into the system (Gap D).

### Q2: Where does VerificationCertificate JSON get stored/served?

**Currently: nowhere.** Proposed: new `construct_verifications` table with `certificate_json` JSONB column. Alternative: convention-based file in git repo (`verification/calibration-certificate.json`) ingested via sync.

### Q3: What's the minimum API work needed to display verification tiers in Explorer?

1. One new table (`construct_verifications`) — 2 new endpoints (GET/POST)
2. Extend constructs service to JOIN verification tier into detail response
3. One new React component for verification badge

**Estimated: 3 sprint tasks.**

### Q4: Is the scoped fork path (`@thj/observer`) possible with current infrastructure?

**Yes, but as `thj-observer` not `@thj/observer`.** Registry slugs are flat alphanumeric-with-hyphens. The fork API exists and works. Alternatively, Tobias can use `register` + `register-repo` + `sync` for the same result.

---

## 6. Recommendation

**Start with Phase 1 (migrations) immediately** — this is pure operational work with zero code changes. It unblocks identity wiring for all constructs, not just Observer.

**Phase 2 (verification storage) is the true collaboration blocker** — design it jointly with Tobias so the VerificationCertificate schema matches Echelon's output format. The JSONB approach gives us flexibility to evolve without more migrations.

**Phases 3-4 can proceed in parallel with Tobias's Echelon work** — he builds the Product Theatre / OracleAdapter while we build the storage and display layer. The integration point is the `POST /v1/packs/:slug/verification` endpoint.

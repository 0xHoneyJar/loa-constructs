# Software Design Document: GTM Collective Pack Integration

**Version**: 1.0.0
**Date**: 2025-12-31
**Author**: Software Architect Agent
**Status**: Draft

---

## 1. Executive Summary

This SDD details the technical architecture for integrating the GTM Collective as a distributable pack in the Loa Registry. The implementation leverages existing infrastructure (pack API, CLI, database schema) and requires minimal new code—primarily a seeding script enhancement and command path updates.

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Seeding Approach** | Enhance existing `import-gtm-collective.ts` | Script exists and generates correct payload structure |
| **Storage** | R2 object storage via existing service | Already implemented in `apps/api/src/services/storage.ts` |
| **Access Control** | Server-side tier gating | Enforced at `GET /v1/packs/:slug/download` |
| **File Structure** | Standard pack format | Compatible with existing `pack-install` CLI command |

---

## 2. System Architecture

### 2.1 High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GTM Collective Pack                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │
│  │   Skills    │   │  Commands   │   │  Manifest   │               │
│  │    (8)      │   │    (14)     │   │  (JSON)     │               │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘               │
│         │                 │                 │                       │
│         └────────────────┬┴─────────────────┘                       │
│                          │                                          │
│  ┌───────────────────────▼───────────────────────┐                 │
│  │            Pack Version (1.0.0)               │                 │
│  │  - 50+ files (skills/commands/resources)      │                 │
│  │  - ~200KB total size                          │                 │
│  └───────────────────────┬───────────────────────┘                 │
│                          │                                          │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Loa Registry Infrastructure                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │
│  │  PostgreSQL │   │  R2 Storage │   │  Hono API   │               │
│  │   Database  │   │   (Files)   │   │  (REST)     │               │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘               │
│         │                 │                 │                       │
│  Tables:                  │          Endpoints:                     │
│  - packs                  │          - POST /v1/packs               │
│  - pack_versions          │          - POST /v1/packs/:slug/versions│
│  - pack_files       Storage:         - GET /v1/packs/:slug/download │
│                     - packs/{slug}/{version}/{path}                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           │ CLI
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      User's Project                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  .claude/                                                           │
│  ├── packs/                                                         │
│  │   └── gtm-collective/                                           │
│  │       ├── manifest.json                                         │
│  │       └── .license.json                                         │
│  ├── skills/                                                        │
│  │   ├── analyzing-market/                                         │
│  │   ├── positioning-product/                                      │
│  │   └── ... (6 more)                                              │
│  └── commands/                                                      │
│      ├── gtm-setup.md                                              │
│      ├── analyze-market.md                                         │
│      └── ... (12 more)                                             │
│                                                                     │
│  gtm-grimoire/  (created by /gtm-setup)                            │
│  ├── context/                                                       │
│  ├── research/                                                      │
│  ├── strategy/                                                      │
│  └── execution/                                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Seeding    │────▶│   Registry   │────▶│   Storage    │
│   Script     │     │     API      │     │     (R2)     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            │ POST /v1/packs
                            │ POST /v1/packs/:slug/versions
                            ▼
                     ┌──────────────┐
                     │   Database   │
                     │  (Metadata)  │
                     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User CLI   │────▶│   Registry   │────▶│   Storage    │
│ pack-install │     │     API      │     │   Download   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            │ GET /v1/packs/:slug/download
                            │ (tier check, license gen)
                            ▼
                     ┌──────────────┐
                     │  User's      │
                     │  .claude/    │
                     └──────────────┘
```

---

## 3. Component Design

### 3.1 Seeding Script Enhancement

**File**: `scripts/import-gtm-collective.ts`

The existing script already:
- Collects files from archive directories
- Generates pack manifest
- Creates import payload JSON

**Enhancement Needed**: Add direct database insertion capability.

```typescript
// New function to add to import-gtm-collective.ts
async function importToDatabase(payload: ImportPayload): Promise<void> {
  // 1. Connect to database
  const { db, packs, packVersions, packFiles } = await import('../apps/api/src/db/index.js');
  const { uploadFile, isStorageConfigured } = await import('../apps/api/src/services/storage.js');

  // 2. Check for existing pack
  const existing = await db.select().from(packs)
    .where(eq(packs.slug, payload.pack.slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Pack "${payload.pack.slug}" already exists. Skipping creation.`);
    return;
  }

  // 3. Create pack record
  const [pack] = await db.insert(packs).values({
    name: payload.pack.name,
    slug: payload.pack.slug,
    description: payload.pack.description,
    longDescription: payload.pack.long_description,
    ownerId: ADMIN_USER_ID,
    ownerType: 'user',
    pricingType: payload.pack.pricing.type,
    tierRequired: payload.pack.pricing.tier_required,
    status: 'published',
    thjBypass: payload.pack.thj_bypass ?? false,
  }).returning();

  // 4. Create version
  const [version] = await db.insert(packVersions).values({
    packId: pack.id,
    version: payload.version.version,
    changelog: payload.version.changelog,
    manifest: payload.version.manifest,
    minLoaVersion: payload.version.min_loa_version,
    isLatest: true,
    publishedAt: new Date(),
  }).returning();

  // 5. Upload files and create records
  let totalSize = 0;
  for (const file of payload.files) {
    const content = Buffer.from(file.content, 'base64');
    const contentHash = createHash('sha256').update(content).digest('hex');
    const storageKey = `packs/${pack.slug}/${version.version}/${file.path}`;

    if (isStorageConfigured()) {
      await uploadFile(storageKey, content, file.mime_type);
    }

    await db.insert(packFiles).values({
      versionId: version.id,
      path: file.path,
      contentHash,
      storageKey,
      sizeBytes: content.length,
      mimeType: file.mime_type,
    });

    totalSize += content.length;
  }

  // 6. Update version stats
  await db.update(packVersions)
    .set({ fileCount: payload.files.length, totalSizeBytes: totalSize })
    .where(eq(packVersions.id, version.id));

  console.log(`Pack "${pack.slug}" v${version.version} imported successfully.`);
}
```

### 3.2 Command Path Resolution

**Issue**: Commands in archive reference `agent_path: ".claude/skills/..."` but pack installation extracts to user's `.claude/skills/`.

**Solution**: No change needed. The `agent_path` in command YAML is relative to the project root, and pack installation places files at:
- Skills → `.claude/skills/{skill-slug}/`
- Commands → `.claude/commands/{command}.md`

This matches the expected paths in command files.

### 3.3 Pack Manifest Schema

```json
{
  "$schema": "https://loaskills.dev/schemas/pack-manifest-v1.json",
  "name": "GTM Collective",
  "slug": "gtm-collective",
  "version": "1.0.0",
  "description": "Go-to-market strategy skills for product launches, positioning, pricing, and market analysis",
  "author": {
    "name": "The Honey Jar",
    "email": "hello@thehoneyjar.xyz",
    "url": "https://thehoneyjar.xyz"
  },
  "skills": [
    { "slug": "analyzing-market", "path": "skills/analyzing-market/" },
    { "slug": "positioning-product", "path": "skills/positioning-product/" },
    { "slug": "pricing-strategist", "path": "skills/pricing-strategist/" },
    { "slug": "crafting-narratives", "path": "skills/crafting-narratives/" },
    { "slug": "educating-developers", "path": "skills/educating-developers/" },
    { "slug": "building-partnerships", "path": "skills/building-partnerships/" },
    { "slug": "translating-for-stakeholders", "path": "skills/translating-for-stakeholders/" },
    { "slug": "reviewing-gtm", "path": "skills/reviewing-gtm/" }
  ],
  "commands": [
    { "name": "gtm-setup", "path": "commands/gtm-setup.md" },
    { "name": "gtm-adopt", "path": "commands/gtm-adopt.md" },
    { "name": "gtm-feature-requests", "path": "commands/gtm-feature-requests.md" },
    { "name": "sync-from-gtm", "path": "commands/sync-from-gtm.md" },
    { "name": "review-gtm", "path": "commands/review-gtm.md" },
    { "name": "analyze-market", "path": "commands/analyze-market.md" },
    { "name": "position", "path": "commands/position.md" },
    { "name": "price", "path": "commands/price.md" },
    { "name": "plan-launch", "path": "commands/plan-launch.md" },
    { "name": "announce-release", "path": "commands/announce-release.md" },
    { "name": "plan-devrel", "path": "commands/plan-devrel.md" },
    { "name": "plan-partnerships", "path": "commands/plan-partnerships.md" },
    { "name": "create-deck", "path": "commands/create-deck.md" },
    { "name": "sync-from-dev", "path": "commands/sync-from-dev.md" }
  ],
  "dependencies": {
    "loa_version": ">=0.9.0",
    "skills": [],
    "packs": []
  },
  "pricing": {
    "type": "subscription",
    "tier": "pro"
  },
  "tags": ["gtm", "marketing", "product", "devrel", "positioning", "pricing", "launch"],
  "license": "proprietary"
}
```

---

## 4. Data Architecture

### 4.1 Database Records

**Table: `packs`**

| Column | Value |
|--------|-------|
| `name` | "GTM Collective" |
| `slug` | "gtm-collective" |
| `description` | "Go-to-market strategy skills..." |
| `owner_id` | (THJ admin user UUID) |
| `owner_type` | "user" |
| `pricing_type` | "subscription" |
| `tier_required` | "pro" |
| `status` | "published" |
| `thj_bypass` | `true` |
| `is_featured` | `true` |

**Table: `pack_versions`**

| Column | Value |
|--------|-------|
| `pack_id` | (FK to packs) |
| `version` | "1.0.0" |
| `changelog` | "Initial release of GTM Collective" |
| `manifest` | (JSON blob) |
| `min_loa_version` | "0.9.0" |
| `is_latest` | `true` |
| `file_count` | ~50 |
| `total_size_bytes` | ~200,000 |

**Table: `pack_files`**

| Column | Example Value |
|--------|---------------|
| `version_id` | (FK to pack_versions) |
| `path` | "skills/analyzing-market/SKILL.md" |
| `content_hash` | (SHA-256) |
| `storage_key` | "packs/gtm-collective/1.0.0/skills/analyzing-market/SKILL.md" |
| `size_bytes` | 6401 |
| `mime_type` | "text/markdown" |

### 4.2 Storage Structure (R2)

```
packs/
└── gtm-collective/
    └── 1.0.0/
        ├── skills/
        │   ├── analyzing-market/
        │   │   ├── index.yaml
        │   │   ├── SKILL.md
        │   │   └── resources/
        │   │       ├── market-landscape-template.md
        │   │       ├── competitive-analysis-template.md
        │   │       └── icp-profiles-template.md
        │   ├── positioning-product/
        │   │   └── ...
        │   └── ... (6 more)
        └── commands/
            ├── gtm-setup.md
            ├── analyze-market.md
            └── ... (12 more)
```

### 4.3 File Inventory

| Category | Count | Estimated Size |
|----------|-------|----------------|
| Skill index.yaml | 8 | ~15 KB |
| Skill SKILL.md | 8 | ~45 KB |
| Skill resources | ~12 | ~80 KB |
| .gitkeep files | 8 | <1 KB |
| Workflow commands | 5 | ~25 KB |
| Routing commands | 9 | ~20 KB |
| Command resources | 2 | ~10 KB |
| **Total** | **~52** | **~195 KB** |

---

## 5. API Integration

### 5.1 Existing Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/packs` | `GET` | List packs (verification) |
| `/v1/packs/:slug` | `GET` | Get pack details |
| `/v1/packs/:slug/download` | `GET` | Download with tier check |

### 5.2 Access Control Flow

```
User requests: GET /v1/packs/gtm-collective/download
                           │
                           ▼
                ┌──────────────────────┐
                │   requireAuth()      │
                │   Middleware         │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  Get pack from DB    │
                │  Check status =      │
                │  "published"         │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  Determine access:   │
                │  - Owner? ✓          │
                │  - THJ bypass? ✓     │
                │  - Tier >= pro? ✓    │
                │  - Free tier? ✗ 402  │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  Generate license    │
                │  Download files      │
                │  Track installation  │
                └──────────┬───────────┘
                           │
                           ▼
                   Return pack data
                   with license token
```

### 5.3 License Token Structure

```typescript
interface PackLicensePayload {
  type: 'pack';
  pack: string;      // 'gtm-collective'
  version: string;   // '1.0.0'
  user_id: string;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  watermark: string; // SHA-256 hash for tracking
}
```

**Token Validity**:
- Pro/Team/Enterprise: Until subscription end + 7 days grace
- Free (if allowed): 30 days

---

## 6. Security Architecture

### 6.1 Access Control Matrix

| User Type | Can List | Can View | Can Download |
|-----------|----------|----------|--------------|
| Anonymous | Yes | Yes (metadata) | No |
| Free tier | Yes | Yes | No (402) |
| Pro tier | Yes | Yes | Yes |
| Team tier | Yes | Yes | Yes |
| Enterprise | Yes | Yes | Yes |
| THJ bypass | Yes | Yes | Yes |
| Pack owner | Yes | Yes | Yes |

### 6.2 Security Measures

| Measure | Implementation | Location |
|---------|----------------|----------|
| Authentication | JWT Bearer token | `middleware/auth.ts` |
| Authorization | Tier checking | `services/subscription.ts` |
| License watermarking | User hash in license | `routes/packs.ts:generatePackLicense` |
| Path traversal prevention | `validatePath()` | `lib/security.ts` |
| Content hashing | SHA-256 | File upload |

### 6.3 Threat Model

| Threat | Mitigation |
|--------|------------|
| Subscription bypass | Server-side enforcement, not client-side |
| License sharing | Watermark tracking, short expiry |
| File path injection | Server-side path sanitization |
| Content tampering | Content hash verification |

---

## 7. CLI Integration

### 7.1 Installation Flow

```bash
$ /pack-install gtm-collective

Fetching pack info for gtm-collective...
Downloading GTM Collective v1.0.0...

Installing GTM Collective v1.0.0...

✓ Verified subscription
✓ Downloaded 52 files (195 KB)
✓ Installed 8 skills
✓ Installed 14 commands
✓ License valid until 2026-01-31

GTM Collective installed successfully!

Available commands:
  /gtm-setup
  /gtm-adopt
  /analyze-market
  /position
  /price
  /plan-launch
  /announce-release
  /plan-devrel
  /plan-partnerships
  /create-deck
  ... and 4 more
```

### 7.2 Post-Installation Structure

```
.claude/
├── packs/
│   └── gtm-collective/
│       ├── manifest.json      # Pack metadata
│       └── .license.json      # License token
├── skills/
│   ├── analyzing-market/
│   │   ├── index.yaml
│   │   ├── SKILL.md
│   │   └── resources/
│   │       ├── market-landscape-template.md
│   │       ├── competitive-analysis-template.md
│   │       └── icp-profiles-template.md
│   ├── positioning-product/
│   │   ├── index.yaml
│   │   ├── SKILL.md
│   │   └── resources/
│   │       ├── positioning-template.md
│   │       └── messaging-framework-template.md
│   └── ... (6 more skills)
└── commands/
    ├── gtm-setup.md
    ├── gtm-adopt.md
    ├── gtm-feature-requests.md
    ├── sync-from-gtm.md
    ├── review-gtm.md
    ├── analyze-market.md
    ├── position.md
    ├── price.md
    ├── plan-launch.md
    ├── announce-release.md
    ├── plan-devrel.md
    ├── plan-partnerships.md
    ├── create-deck.md
    └── sync-from-dev.md
```

---

## 8. Implementation Tasks

### 8.1 Task Breakdown

| Task ID | Description | Effort | Dependencies |
|---------|-------------|--------|--------------|
| T1 | Update archive paths (remove loa-grimoire/context prefix) | S | - |
| T2 | Add direct DB import to seeding script | M | T1 |
| T3 | Run import script to seed database | S | T2 |
| T4 | Validate pack appears in API list | S | T3 |
| T5 | Test CLI installation as pro user | M | T4 |
| T6 | Test 402 response for free user | S | T4 |
| T7 | Test GTM command execution | M | T5 |
| T8 | Clean up archive after validation | S | T7 |

**Effort Key**: S = Small (<2 hrs), M = Medium (2-4 hrs), L = Large (4-8 hrs)

### 8.2 Implementation Order

```
Phase 1: Preparation
├── T1: Update archive paths
└── T2: Add DB import to script

Phase 2: Publication
├── T3: Run import script
└── T4: Validate in API

Phase 3: Validation
├── T5: Test CLI install
├── T6: Test tier gating
└── T7: Test command execution

Phase 4: Cleanup
└── T8: Remove archive
```

---

## 9. Testing Strategy

### 9.1 Test Cases

| Test | Input | Expected Output |
|------|-------|-----------------|
| Pack listing | `GET /v1/packs` | gtm-collective in results |
| Pack details | `GET /v1/packs/gtm-collective` | Full metadata, latest_version |
| Free download | Free user downloads | 402 with pricing info |
| Pro download | Pro user downloads | 200 with files + license |
| CLI install | `/pack-install gtm-collective` | Files in .claude/ |
| Command exec | `/gtm-setup` | Creates gtm-grimoire/ |

### 9.2 Integration Test

```typescript
// apps/api/tests/e2e/gtm-collective.test.ts
describe('GTM Collective Pack', () => {
  it('should list published pack', async () => {
    const res = await request(app).get('/v1/packs');
    expect(res.body.data).toContainEqual(
      expect.objectContaining({ slug: 'gtm-collective' })
    );
  });

  it('should return 402 for free tier download', async () => {
    const res = await request(app)
      .get('/v1/packs/gtm-collective/download')
      .set('Authorization', `Bearer ${freeUserToken}`);
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('PACK_SUBSCRIPTION_REQUIRED');
  });

  it('should allow pro tier download', async () => {
    const res = await request(app)
      .get('/v1/packs/gtm-collective/download')
      .set('Authorization', `Bearer ${proUserToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.pack.files.length).toBeGreaterThan(0);
    expect(res.body.data.license.token).toBeDefined();
  });
});
```

---

## 10. Rollback Plan

### 10.1 Database Rollback

```sql
-- Remove GTM Collective pack and all related data
DELETE FROM pack_files WHERE version_id IN (
  SELECT id FROM pack_versions WHERE pack_id = (
    SELECT id FROM packs WHERE slug = 'gtm-collective'
  )
);

DELETE FROM pack_versions WHERE pack_id = (
  SELECT id FROM packs WHERE slug = 'gtm-collective'
);

DELETE FROM packs WHERE slug = 'gtm-collective';
```

### 10.2 Storage Cleanup

```bash
# Remove files from R2 storage
aws s3 rm s3://loa-registry/packs/gtm-collective/ --recursive
```

---

## 11. Future Considerations

### 11.1 Version Updates

When releasing GTM Collective 1.1.0:
1. Update archive files
2. Re-run import script with `--version 1.1.0`
3. Previous version remains in DB for compatibility

### 11.2 Pack Dependencies

If future packs depend on GTM Collective:
```json
{
  "dependencies": {
    "packs": ["gtm-collective@>=1.0.0"]
  }
}
```

### 11.3 Offline Support

Future enhancement: Cache downloaded pack files locally for offline use.

---

## 12. Appendix

### A. Archive File Mapping

| Archive Path | Pack Path |
|--------------|-----------|
| `gtm-skills-import/{skill}/` | `skills/{skill}/` |
| `gtm-skills-import/commands/*.md` | `commands/*.md` |
| `gtm-commands/*.md` | `commands/*.md` |
| `gtm-commands/resources/*.md` | `commands/resources/*.md` |

### B. Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection | Yes |
| `R2_ACCOUNT_ID` | Cloudflare R2 account | If storage enabled |
| `R2_ACCESS_KEY_ID` | R2 access key | If storage enabled |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | If storage enabled |
| `R2_BUCKET_NAME` | R2 bucket name | If storage enabled |
| `ADMIN_USER_ID` | User ID for pack ownership | Yes |

### C. Related Files

| File | Purpose |
|------|---------|
| `scripts/import-gtm-collective.ts` | Seeding script |
| `scripts/gtm-collective-import-payload.json` | Generated payload |
| `apps/api/src/routes/packs.ts` | Pack API routes |
| `apps/api/src/services/packs.ts` | Pack service layer |
| `packages/loa-registry/src/commands/pack-install.ts` | CLI install |

---

**Document Status**: Ready for implementation
**Next Step**: `/sprint-plan` to break down into sprint tasks

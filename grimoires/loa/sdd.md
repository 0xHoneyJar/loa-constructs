# Software Design Document: isLatest Flag Data Integrity Fix

**Version**: 1.0.0
**Date**: 2026-02-03
**Author**: Software Architect Agent
**Status**: Draft
**PRD Reference**: grimoires/loa/prd.md v1.0.0
**Cycle**: cycle-013
**Issue**: [#86](https://github.com/0xHoneyJar/loa-constructs/issues/86)

---

## 1. Executive Summary

This document describes the technical design for fixing the `isLatest` flag data integrity issues in the Loa Constructs registry. The primary changes involve removing `isLatest` reads from the service layer, implementing batch version fetching to avoid N+1 queries, and adding database constraints to prevent future data corruption.

### 1.1 Design Principles

1. **Semver as Source of Truth**: Version ordering derives from semver comparison, not flags
2. **Batch Operations**: Avoid N+1 queries by fetching all data upfront
3. **Backward Compatibility**: Keep `isLatest` writes for legacy consumers
4. **Defense in Depth**: Database constraint as safety net after code fix

### 1.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    API Layer (Hono)                                 │
├─────────────────────────────────────────────────────────────────────┤
│  GET /v1/constructs                                                 │
│  GET /v1/constructs/summary                                         │
│  GET /v1/constructs/:slug                                           │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Service Layer                                    │
├─────────────────────────────────────────────────────────────────────┤
│  constructs.ts                                                      │
│  ├── getConstructsSummary()    ← BATCH version fetch (NEW)          │
│  ├── fetchSkillsAsConstructs() ← Remove isLatest JOIN               │
│  └── fetchPacksAsConstructs()  ← Remove isLatest JOIN               │
│                                                                     │
│  packs.ts / skills.ts (UNCHANGED)                                   │
│  ├── getLatestPackVersion()    ← Already uses semver                │
│  └── getLatestSkillVersion()   ← Already uses semver                │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Data Layer (PostgreSQL + Drizzle)                │
├─────────────────────────────────────────────────────────────────────┤
│  pack_versions                                                      │
│  ├── is_latest (kept for writes)                                    │
│  └── idx_pack_versions_single_latest (NEW - partial unique)         │
│                                                                     │
│  skill_versions                                                     │
│  ├── is_latest (kept for writes)                                    │
│  └── idx_skill_versions_single_latest (NEW - partial unique)        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Database | PostgreSQL | 15+ |
| ORM | Drizzle | Latest |
| API | Hono | Latest |
| Semver | semver (npm) | ^7.x |
| Cache | Redis (Upstash) | Existing |

---

## 3. Code Changes

### 3.1 `getConstructsSummary()` - Batch Optimization

**Current Implementation (PROBLEMATIC)**:
```typescript
// Line 559-571: Uses isLatest JOIN
const packsData = await db
  .select({ ... })
  .from(packs)
  .leftJoin(
    packVersions,
    and(eq(packVersions.packId, packs.id), eq(packVersions.isLatest, true))
  )
  .where(eq(packs.status, 'published'));
```

**Problem**: When multiple versions have `isLatest=true`, this returns duplicate rows.

**New Implementation**:
```typescript
import semver from 'semver';
import { inArray } from 'drizzle-orm';

export async function getConstructsSummary(): Promise<{
  constructs: ConstructSummary[];
  total: number;
  last_updated: string;
}> {
  // Check cache first (existing logic)
  const cacheKey = CACHE_KEYS.constructSummary();
  if (isRedisConfigured()) {
    const cached = await getRedis().get<...>(cacheKey);
    if (cached) return cached;
  }

  // Step 1: Fetch all published packs (no version JOIN)
  const packsData = await db
    .select({
      id: packs.id,
      slug: packs.slug,
      name: packs.name,
      tierRequired: packs.tierRequired,
    })
    .from(packs)
    .where(eq(packs.status, 'published'));

  if (packsData.length === 0) {
    return { constructs: [], total: 0, last_updated: new Date().toISOString() };
  }

  // Step 2: Batch fetch ALL versions for these packs (single query)
  const packIds = packsData.map(p => p.id);
  const allVersions = await db
    .select()
    .from(packVersions)
    .where(inArray(packVersions.packId, packIds));

  // Step 3: Group by packId, pick highest semver for each
  const latestByPack = new Map<string, typeof packVersions.$inferSelect>();
  for (const version of allVersions) {
    const current = latestByPack.get(version.packId);
    if (!current) {
      latestByPack.set(version.packId, version);
    } else {
      const currentSemver = semver.valid(current.version) || '0.0.0';
      const newSemver = semver.valid(version.version) || '0.0.0';
      if (semver.gt(newSemver, currentSemver)) {
        latestByPack.set(version.packId, version);
      }
    }
  }

  // Step 4: Build response
  const constructs: ConstructSummary[] = packsData.map((p) => {
    const latestVersion = latestByPack.get(p.id);
    const manifest = latestVersion?.manifest as ConstructManifest | null;
    return {
      slug: p.slug,
      name: p.name,
      type: 'pack' as ConstructType,
      commands: manifest?.commands?.map((c) => c.name).filter(Boolean) as string[] || [],
      tier_required: p.tierRequired || 'free',
    };
  });

  const result = {
    constructs,
    total: constructs.length,
    last_updated: new Date().toISOString(),
  };

  // Cache result (existing logic)
  if (isRedisConfigured()) {
    await getRedis().set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL.constructSummary });
  }

  return result;
}
```

**Query Count**: 2 (packs + versions) instead of N+1

### 3.2 `fetchSkillsAsConstructs()` - Remove isLatest JOIN

**Current Implementation (lines 726-776)**:
```typescript
const [skillsResult, countResult] = await Promise.all([
  db.select().from(skills)
    .leftJoin(
      skillVersions,
      and(eq(skillVersions.skillId, skills.id), eq(skillVersions.isLatest, true))
    )
    .where(whereClause)
    ...
]);

// Deduplicate skills (in case of multiple isLatest versions)
const seenSkillIds = new Set<string>();
const uniqueSkillsResult = skillsResult.filter(row => {
  if (seenSkillIds.has(row.skills.id)) return false;
  seenSkillIds.add(row.skills.id);
  return true;
});

// Then OVERRIDES with semver helper
const version = await getLatestSkillVersion(skill.id);
```

**New Implementation**:
```typescript
async function fetchSkillsAsConstructs(options: {
  query?: string;
  tier?: string;
  category?: string;
  featured?: boolean;
  maturity?: MaturityLevel[];
  limit: number;
  offset: number;
}): Promise<{ items: Construct[]; count: number; queryTerms?: string[] }> {
  // Build conditions (unchanged)
  const conditions = [eq(skills.isPublic, true), eq(skills.isDeprecated, false)];
  // ... existing condition building ...

  const whereClause = and(...conditions);

  try {
    // Remove the LEFT JOIN entirely - we call getLatestSkillVersion() anyway
    const [skillsResult, countResult] = await Promise.all([
      db
        .select()
        .from(skills)
        .where(whereClause)
        .orderBy(desc(skills.downloads))
        .limit(options.limit)
        .offset(options.offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(skills)
        .where(whereClause),
    ]);

    // No deduplication needed - query returns unique skills
    const items: Construct[] = [];
    for (const skill of skillsResult) {
      const version = await getLatestSkillVersion(skill.id);
      const owner = await getOwnerInfo(skill.ownerId, skill.ownerType as 'user' | 'team');
      items.push(skillToConstruct(skill, version, owner, queryTerms?.length ? queryTerms : undefined));
    }

    return {
      items,
      count: countResult[0]?.count ?? 0,
      queryTerms: queryTerms?.length ? queryTerms : undefined,
    };
  } catch (error) {
    logger.error({ error, context: 'fetchSkillsAsConstructs' }, 'Failed to fetch skills');
    return { items: [], count: 0 };
  }
}
```

### 3.3 `fetchPacksAsConstructs()` - Remove isLatest JOIN

**Same pattern as 3.2**:
```typescript
async function fetchPacksAsConstructs(options: {
  query?: string;
  tier?: string;
  featured?: boolean;
  maturity?: MaturityLevel[];
  limit: number;
  offset: number;
}): Promise<{ items: Construct[]; count: number; queryTerms?: string[] }> {
  // Build conditions (unchanged)
  const conditions = [eq(packs.status, 'published')];
  // ... existing condition building ...

  const whereClause = and(...conditions);

  try {
    // Remove the LEFT JOIN entirely
    const [packsResult, countResult] = await Promise.all([
      db
        .select()
        .from(packs)
        .where(whereClause)
        .orderBy(desc(packs.downloads))
        .limit(options.limit)
        .offset(options.offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(packs)
        .where(whereClause),
    ]);

    // No deduplication needed
    const items: Construct[] = [];
    for (const pack of packsResult) {
      const version = await getLatestPackVersion(pack.id);
      const owner = await getOwnerInfo(pack.ownerId, pack.ownerType as 'user' | 'team');
      items.push(packToConstruct(pack, version, owner, queryTerms?.length ? queryTerms : undefined));
    }

    return {
      items,
      count: countResult[0]?.count ?? 0,
      queryTerms: queryTerms?.length ? queryTerms : undefined,
    };
  } catch (error) {
    logger.error({ error, context: 'fetchPacksAsConstructs' }, 'Failed to fetch packs');
    return { items: [], count: 0 };
  }
}
```

---

## 4. Database Migration

### 4.1 Pre-flight Validation

Run BEFORE migration to check for non-standard versions:

```sql
-- Check pack_versions for malformed semver
SELECT id, pack_id, version
FROM pack_versions
WHERE version !~ '^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$';

-- Check skill_versions for malformed semver
SELECT id, skill_id, version
FROM skill_versions
WHERE version !~ '^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$';
```

**If rows returned**: Handle manually or use TypeScript migration.

### 4.2 Migration SQL

**File**: `apps/api/src/db/migrations/0001_fix_islatest_constraint.sql`

```sql
-- ============================================================
-- Migration: Fix isLatest data integrity and add constraint
-- Issue: #86
-- Date: 2026-02-03
-- ============================================================

-- STEP 1: Fix pack_versions - keep only highest semver as isLatest
WITH ranked AS (
  SELECT
    id,
    pack_id,
    version,
    ROW_NUMBER() OVER (
      PARTITION BY pack_id
      ORDER BY
        CAST(split_part(version, '.', 1) AS INTEGER) DESC,
        CAST(split_part(version, '.', 2) AS INTEGER) DESC,
        CAST(REGEXP_REPLACE(split_part(version, '.', 3), '[^0-9].*', '') AS INTEGER) DESC
    ) as rn
  FROM pack_versions
  WHERE is_latest = true
)
UPDATE pack_versions
SET is_latest = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- STEP 2: Fix skill_versions - same pattern
WITH ranked AS (
  SELECT
    id,
    skill_id,
    version,
    ROW_NUMBER() OVER (
      PARTITION BY skill_id
      ORDER BY
        CAST(split_part(version, '.', 1) AS INTEGER) DESC,
        CAST(split_part(version, '.', 2) AS INTEGER) DESC,
        CAST(REGEXP_REPLACE(split_part(version, '.', 3), '[^0-9].*', '') AS INTEGER) DESC
    ) as rn
  FROM skill_versions
  WHERE is_latest = true
)
UPDATE skill_versions
SET is_latest = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- STEP 3: Add partial unique constraints
-- These prevent future data corruption
CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_versions_single_latest
ON pack_versions (pack_id) WHERE is_latest = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_versions_single_latest
ON skill_versions (skill_id) WHERE is_latest = true;

-- STEP 4: Verification
-- Should return 0 rows after migration
SELECT pack_id, COUNT(*) as cnt
FROM pack_versions
WHERE is_latest = true
GROUP BY pack_id
HAVING COUNT(*) > 1;

SELECT skill_id, COUNT(*) as cnt
FROM skill_versions
WHERE is_latest = true
GROUP BY skill_id
HAVING COUNT(*) > 1;
```

### 4.3 Rollback SQL

```sql
-- Rollback: Remove constraints (data fix is not reversed)
DROP INDEX IF EXISTS idx_pack_versions_single_latest;
DROP INDEX IF EXISTS idx_skill_versions_single_latest;
```

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Test Case | Expected Result |
|-----------|----------------|
| `getConstructsSummary()` with 0 packs | Returns empty array |
| `getConstructsSummary()` with pack having 0 versions | Pack excluded or version=null |
| `getConstructsSummary()` with multiple versions per pack | Returns highest semver only |
| Batch version fetch groups correctly | Map contains one entry per packId |
| Semver comparison handles pre-release | "1.0.0" > "1.0.0-alpha" |

### 5.2 Integration Tests

| Test Case | Expected Result |
|-----------|----------------|
| `GET /v1/constructs` returns no duplicates | Unique slugs only |
| `GET /v1/constructs/summary` returns correct manifests | Real content, not placeholders |
| `GET /v1/constructs/artisan` returns real content | Commands array populated |
| Constraint violation on duplicate isLatest | INSERT fails with unique violation |

### 5.3 Performance Tests

| Metric | Baseline | Target |
|--------|----------|--------|
| `getConstructsSummary()` latency | N/A (broken) | <100ms p95 |
| `GET /v1/constructs` latency | <200ms | <200ms (no regression) |
| Query count for summary | N+1 | 2 |

---

## 6. Deployment Plan

### 6.1 Deployment Order

1. **Deploy code changes first** (remove isLatest reads)
   - This makes the code resilient to data issues
   - Zero downtime - just a code change

2. **Run migration on staging**
   - Execute pre-flight validation
   - Run migration
   - Verify with verification queries

3. **Run migration on production**
   - Same steps as staging
   - Monitor for constraint violations in logs

4. **Re-upload Artisan pack**
   - Run `pnpm tsx scripts/seed-forge-packs.ts`
   - Verify `GET /v1/constructs/artisan` returns real content

### 6.2 Rollback Plan

| Scenario | Action |
|----------|--------|
| Code change breaks API | Revert code deployment |
| Migration corrupts data | Data fix is reversible via timestamps |
| Constraint blocks publish | Drop constraint, investigate |

---

## 7. File Inventory

### 7.1 Files to Modify

| File | Changes |
|------|---------|
| `apps/api/src/services/constructs.ts` | Remove isLatest JOINs, add batch fetch |

### 7.2 Files to Create

| File | Purpose |
|------|---------|
| `apps/api/src/db/migrations/0001_fix_islatest_constraint.sql` | Data fix + constraint |

### 7.3 Scripts to Run

| Script | When |
|--------|------|
| Pre-flight validation SQL | Before migration |
| Migration SQL | After code deploy |
| `pnpm tsx scripts/seed-forge-packs.ts` | After migration |

---

## 8. Appendix

### A. Current vs New Query Patterns

**getConstructsSummary() - Before**:
```
Query 1: SELECT packs.*, pack_versions.*
         FROM packs
         LEFT JOIN pack_versions ON (packId AND isLatest=true)
         WHERE status='published'

Result: N rows with duplicates when multiple isLatest=true
```

**getConstructsSummary() - After**:
```
Query 1: SELECT id, slug, name, tierRequired FROM packs WHERE status='published'
Query 2: SELECT * FROM pack_versions WHERE pack_id IN (...)

Result: Deterministic, no duplicates, correct semver ordering
```

### B. Goal Traceability

| Goal | Implementation |
|------|---------------|
| G-1 (Consistent version resolution) | Batch semver comparison in §3.1 |
| G-2 (No duplicates) | Remove JOINs in §3.2, §3.3 |
| G-3 (Database constraint) | Partial unique index in §4.2 |
| G-4 (Artisan content) | seed-forge-packs.ts re-run in §6.1 |

### C. References

- **PRD**: grimoires/loa/prd.md
- **Issue**: https://github.com/0xHoneyJar/loa-constructs/issues/86
- **Existing semver helpers**: packs.ts:366-388, skills.ts:434-462

---

**Document Status**: Draft
**Next Step**: `/sprint-plan` to create sprint breakdown

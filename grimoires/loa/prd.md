# PRD: isLatest Flag Data Integrity Fix

**Cycle**: cycle-013
**Issue**: [#86](https://github.com/0xHoneyJar/loa-constructs/issues/86)
**Created**: 2026-02-03
**Status**: Reviewed (Flatline Protocol)
**Flatline Score**: 72/100

---

## 1. Problem Statement

The `isLatest` flag in `pack_versions` and `skill_versions` tables has data integrity issues where multiple versions can be marked as `isLatest=true` for the same pack/skill.

**Current State**:
- Multiple versions with `isLatest=true` cause duplicate results in API responses
- `getConstructsSummary()` uses `isLatest` JOIN, returning inconsistent manifest data
- `fetchSkillsAsConstructs()` and `fetchPacksAsConstructs()` use `isLatest` JOINs but then override with semver-based helpers (wasteful)
- No database constraint prevents multiple `isLatest=true` per pack/skill
- Artisan pack content shows placeholders instead of real content

**Root Cause**: The `isLatest` flag requires manual coordination during version publishing. When this coordination fails, data integrity breaks.

> Source: Issue #86

---

## 2. Goals and Success Criteria

### 2.1 Goals

| ID | Goal | Priority |
|----|------|----------|
| **G-1** | Consistent version resolution via semver | P0 |
| **G-2** | No duplicate constructs in API responses | P0 |
| **G-3** | Database constraint as safety net | P1 |
| **G-4** | Correct Artisan pack content | P1 |

### 2.2 Success Criteria

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| Zero isLatest reads | Grep for `isLatest` in service layer | 0 occurrences |
| No duplicates | `GET /v1/constructs` response | Unique slugs only |
| Constraint enforced | DB query for duplicate isLatest | 0 rows |
| Artisan content | `GET /v1/constructs/artisan` | Real manifest data |

---

## 3. User Context

### 3.1 Primary Persona: CLI User

**Profile**: Developer using `/constructs` command in Claude Code

**Goals**:
- Browse available constructs accurately
- Install specific packs without confusion
- Trust that version numbers are correct

**Current Pain**:
- Sees duplicate entries for same construct
- Gets inconsistent version information
- Artisan pack shows placeholder content

### 3.2 Secondary Persona: API Consumer

**Profile**: Developer integrating with Loa Constructs API

**Goals**:
- Reliable JSON responses
- Consistent version resolution
- Predictable pagination

---

## 4. Functional Requirements

### 4.1 Remove isLatest Reads (FR-1)

Remove all `isLatest` flag reads from the service layer. Use semver comparison exclusively.

| Function | Current Behavior | New Behavior |
|----------|-----------------|--------------|
| `getConstructsSummary()` | LEFT JOIN on `isLatest=true` | Remove JOIN, use `getLatestPackVersion()` |
| `fetchSkillsAsConstructs()` | LEFT JOIN on `isLatest=true` | Remove JOIN (already uses `getLatestSkillVersion()`) |
| `fetchPacksAsConstructs()` | LEFT JOIN on `isLatest=true` | Remove JOIN (already uses `getLatestPackVersion()`) |

### 4.2 Database Constraint (FR-2)

Add partial unique index to prevent multiple `isLatest=true` per pack/skill:

```sql
CREATE UNIQUE INDEX idx_pack_versions_single_latest
ON pack_versions (pack_id) WHERE is_latest = true;

CREATE UNIQUE INDEX idx_skill_versions_single_latest
ON skill_versions (skill_id) WHERE is_latest = true;
```

### 4.3 Data Migration (FR-3)

Fix existing data before adding constraint:
- Identify packs/skills with multiple `isLatest=true` versions
- Keep only the highest semver version as `isLatest=true`
- Set others to `isLatest=false`

### 4.4 Artisan Pack Re-upload (FR-4)

Re-run seed script to sync local Artisan pack content to registry:
- Source: `apps/sandbox/packs/artisan/`
- Ensure manifest has real commands, not placeholders

---

## 5. Technical Requirements

### 5.1 Code Changes

**File: `apps/api/src/services/constructs.ts`**

1. **`getConstructsSummary()` (lines 559-598)**
   - Remove LEFT JOIN on `packVersions` with `isLatest=true`
   - **CRITICAL**: Use batch optimization to avoid N+1 queries:
     - Fetch all packs in one query
     - Fetch ALL versions for those packs in a single query using `inArray()`
     - Group versions by packId in-memory
     - Select highest semver per pack using `semver.gt()`
   - This maintains O(2) queries instead of O(N+1)

2. **`fetchSkillsAsConstructs()` (lines 726-776)**
   - Remove LEFT JOIN on `skillVersions` with `isLatest=true`
   - The function already calls `getLatestSkillVersion()` anyway
   - Deduplication logic can be simplified after JOIN removal

3. **`fetchPacksAsConstructs()` (lines 825-874)**
   - Remove LEFT JOIN on `packVersions` with `isLatest=true`
   - The function already calls `getLatestPackVersion()` anyway
   - Deduplication logic can be simplified after JOIN removal

### 5.2 Database Migration

**File: `apps/api/src/db/migrations/0001_fix_islatest_constraint.sql`**

**CRITICAL**: Run pre-flight validation before migration to check for non-standard versions:

```sql
-- Pre-flight: Identify versions that may fail semver parsing
SELECT version FROM pack_versions
WHERE version !~ '^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$';

SELECT version FROM skill_versions
WHERE version !~ '^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$';
```

If pre-flight returns rows, handle manually or use TypeScript migration with `semver` library.

```sql
-- Step 1: Fix existing data (keep highest semver as isLatest per pack)
WITH ranked AS (
  SELECT id, pack_id, version,
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

-- Step 2: Same for skill_versions
WITH ranked AS (
  SELECT id, skill_id, version,
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

-- Step 3: Add partial unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_versions_single_latest
ON pack_versions (pack_id) WHERE is_latest = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_versions_single_latest
ON skill_versions (skill_id) WHERE is_latest = true;
```

### 5.3 Seed Script

**File: `scripts/seed-forge-packs.ts`**

Re-run to upload Artisan pack with correct manifest from `apps/sandbox/packs/artisan/`.

---

## 6. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Migration safety | Idempotent, can run multiple times |
| API latency | No regression (current: <200ms p95) |
| Backward compatibility | `isLatest` flag still written for legacy consumers |

---

## 7. Scope Definition

### 7.1 In Scope (This PR)

- [x] Remove `isLatest` reads from `getConstructsSummary()`
- [x] Remove `isLatest` JOINs from `fetchSkillsAsConstructs()`
- [x] Remove `isLatest` JOINs from `fetchPacksAsConstructs()`
- [x] Create data migration to fix existing duplicates
- [x] Add partial unique index constraint
- [x] Re-upload Artisan pack content

### 7.2 Out of Scope (Future PR)

- GitHub sync for pack content management
- Auto-update notifications in CLI
- Rollback/version pinning support
- Removing `isLatest` column entirely (still useful for write path)

---

## 8. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration corrupts data | High | Test on staging first; migration is reversible |
| Constraint breaks publish | Medium | Add constraint AFTER fixing data |
| Performance regression | Low | Use batch optimization for `getConstructsSummary()` (2 queries, not N+1) |
| Non-standard semver versions | Medium | Pre-flight validation query before migration |
| Write path atomicity | Low | Constraint added after data fix; existing publish logic is transactional |

### 8.1 Flatline Review Findings (Integrated)

| Finding | Decision | Rationale |
|---------|----------|-----------|
| N+1 query in `getConstructsSummary()` | Batch optimization | Fetch all versions in one query, group in-memory |
| Semver parsing edge cases | Pre-flight validation | Check for non-standard versions before SQL migration |
| Artisan content scope creep | Keep together | Single PR for complete issue resolution |

---

## 9. Open Questions

1. ~~Should we remove `isLatest` column entirely?~~
   **Decision**: No, keep for write path optimization. Only remove reads.

2. ~~Should `test-cli-install.ts` be updated?~~
   **Decision**: Yes, update to use semver helpers. (Script, not service layer)

3. ~~Should `import-gtm-collective.ts` be updated?~~
   **Decision**: Keep write behavior (setting `isLatest: true`), ensure atomic.

---

## 10. Implementation Checklist

### Sprint 1: Code Changes
- [ ] T1.1: Update `getConstructsSummary()` - remove JOIN, add batch version fetch
- [ ] T1.2: Update `fetchSkillsAsConstructs()` to remove isLatest JOIN
- [ ] T1.3: Update `fetchPacksAsConstructs()` to remove isLatest JOIN
- [ ] T1.4: Simplify deduplication logic (no longer needed after JOIN removal)
- [ ] T1.5: Unit tests for version resolution

### Sprint 2: Database Migration
- [ ] T2.1: Run pre-flight validation for non-standard versions
- [ ] T2.2: Create migration file with data fix
- [ ] T2.3: Add partial unique index
- [ ] T2.4: Test migration on staging
- [ ] T2.5: Apply migration to production

### Sprint 3: Content Sync
- [ ] T3.1: Verify Artisan pack local content
- [ ] T3.2: Re-run seed-forge-packs.ts
- [ ] T3.3: Verify API returns correct content

---

## 11. Appendix

### A. File Inventory

**Files to Modify:**
| File | Changes |
|------|---------|
| `apps/api/src/services/constructs.ts` | Remove isLatest JOINs in 3 functions |
| `apps/api/src/db/migrations/` | New migration file |

**Scripts to Run:**
| Script | Purpose |
|--------|---------|
| `pnpm tsx scripts/seed-forge-packs.ts` | Re-upload Artisan pack |

### B. Goal Traceability

| Goal | Tasks |
|------|-------|
| G-1 (Consistent version resolution) | T1.1-T1.5 |
| G-2 (No duplicates) | T1.1-T1.4 |
| G-3 (Database constraint) | T2.1-T2.4 |
| G-4 (Artisan content) | T3.1-T3.3 |

### C. References

- **Issue**: https://github.com/0xHoneyJar/loa-constructs/issues/86
- **Context File**: grimoires/loa/context/issue-86-islatest-fix.md
- **Current workaround**: commit a9a78f3 (semver comparison)

---

**Document Status**: Draft
**Next Step**: `/architect` to create Software Design Document

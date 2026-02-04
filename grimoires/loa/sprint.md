# Sprint Plan: isLatest Flag Data Integrity Fix

**Cycle**: cycle-013
**Issue**: [#86](https://github.com/0xHoneyJar/loa-constructs/issues/86)
**Created**: 2026-02-03
**Status**: Ready for Implementation
**PRD**: grimoires/loa/prd.md
**SDD**: grimoires/loa/sdd.md

---

## Sprint Overview

**Sprint 1**: Complete isLatest Fix (Single Sprint)

This is a focused bug fix that can be completed in a single sprint. The work is divided into 3 logical phases that must be executed in order.

---

## Phase 1: Code Changes

### T1.1: Update `getConstructsSummary()` with Batch Optimization

**Priority**: P0
**File**: `apps/api/src/services/constructs.ts` (lines 537-599)

**Acceptance Criteria**:
- [ ] Remove LEFT JOIN on `packVersions` with `isLatest=true`
- [ ] Add batch fetch: query all packs, then all their versions in one query
- [ ] Group versions by `packId` in-memory using `Map<string, PackVersion>`
- [ ] Select highest semver per pack using `semver.gt()`
- [ ] Handle edge case: pack with 0 versions returns `version: null`
- [ ] Maintain existing cache behavior
- [ ] Query count: exactly 2 (packs + versions), not N+1

**Implementation Reference**: SDD §3.1

---

### T1.2: Update `fetchSkillsAsConstructs()` - Remove isLatest JOIN

**Priority**: P0
**File**: `apps/api/src/services/constructs.ts` (lines 659-776)

**Acceptance Criteria**:
- [ ] Remove LEFT JOIN on `skillVersions` with `isLatest=true`
- [ ] Remove deduplication logic (`seenSkillIds` Set) - no longer needed
- [ ] Query skills table directly without version JOIN
- [ ] Continue using `getLatestSkillVersion()` for each skill
- [ ] Maintain existing query conditions (isPublic, isDeprecated, maturity, tier, category)

**Implementation Reference**: SDD §3.2

---

### T1.3: Update `fetchPacksAsConstructs()` - Remove isLatest JOIN

**Priority**: P0
**File**: `apps/api/src/services/constructs.ts` (lines 778-874)

**Acceptance Criteria**:
- [ ] Remove LEFT JOIN on `packVersions` with `isLatest=true`
- [ ] Remove deduplication logic (`seenPackIds` Set) - no longer needed
- [ ] Query packs table directly without version JOIN
- [ ] Continue using `getLatestPackVersion()` for each pack
- [ ] Maintain existing query conditions (status, maturity, tier, featured)

**Implementation Reference**: SDD §3.3

---

### T1.4: Verify No `isLatest` Reads Remain

**Priority**: P1
**Type**: Verification

**Acceptance Criteria**:
- [ ] Run: `grep -n "isLatest" apps/api/src/services/constructs.ts`
- [ ] Result: 0 matches (excluding comments)
- [ ] All version resolution uses semver comparison

---

## Phase 2: Database Migration

### T2.1: Run Pre-flight Validation

**Priority**: P0
**Type**: Database Check

**Acceptance Criteria**:
- [ ] Execute pre-flight SQL on staging database:
  ```sql
  SELECT version FROM pack_versions
  WHERE version !~ '^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$';

  SELECT version FROM skill_versions
  WHERE version !~ '^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$';
  ```
- [ ] Document any non-standard versions found
- [ ] If rows returned: handle manually or adjust migration

**Implementation Reference**: SDD §4.1

---

### T2.2: Create Migration File

**Priority**: P0
**File**: `apps/api/src/db/migrations/0001_fix_islatest_constraint.sql`

**Acceptance Criteria**:
- [ ] File contains data fix for pack_versions (keep highest semver)
- [ ] File contains data fix for skill_versions (keep highest semver)
- [ ] File creates partial unique index on pack_versions
- [ ] File creates partial unique index on skill_versions
- [ ] File includes verification queries

**Implementation Reference**: SDD §4.2

---

### T2.3: Test Migration on Staging

**Priority**: P0
**Type**: Staging Deployment

**Acceptance Criteria**:
- [ ] Run migration on staging database
- [ ] Verification queries return 0 rows:
  ```sql
  SELECT pack_id, COUNT(*) FROM pack_versions
  WHERE is_latest = true GROUP BY pack_id HAVING COUNT(*) > 1;
  ```
- [ ] API endpoints still work after migration
- [ ] No constraint violations in staging logs

---

### T2.4: Apply Migration to Production

**Priority**: P0
**Type**: Production Deployment

**Acceptance Criteria**:
- [ ] Code changes deployed before migration
- [ ] Run migration on production database
- [ ] Monitor for constraint violations
- [ ] Verify API responses are correct

---

## Phase 3: Content Sync

### T3.1: Verify Artisan Pack Local Content

**Priority**: P1
**Type**: Verification

**Acceptance Criteria**:
- [ ] Check `apps/sandbox/packs/artisan/manifest.json` has real commands
- [ ] Commands array is populated (not placeholders)
- [ ] At least 5 skills referenced

---

### T3.2: Re-run Seed Script

**Priority**: P1
**Type**: Script Execution

**Acceptance Criteria**:
- [ ] Run: `pnpm tsx scripts/seed-forge-packs.ts`
- [ ] Script completes without errors
- [ ] Artisan pack version updated in registry

---

### T3.3: Verify API Returns Correct Content

**Priority**: P1
**Type**: Verification

**Acceptance Criteria**:
- [ ] `GET /v1/constructs/artisan` returns real manifest
- [ ] Commands array is populated
- [ ] Version is correct
- [ ] No placeholder text in response

---

## Definition of Done

### Sprint Complete When:

1. **Code**:
   - [ ] Zero `isLatest` reads in `constructs.ts` service functions
   - [ ] `getConstructsSummary()` uses batch optimization (2 queries)
   - [ ] No deduplication logic needed in fetch functions

2. **Database**:
   - [ ] Pre-flight validation passed
   - [ ] Migration applied to production
   - [ ] Partial unique indexes active
   - [ ] Zero duplicate `isLatest=true` per pack/skill

3. **Content**:
   - [ ] Artisan pack shows real content via API

4. **Quality**:
   - [ ] All existing tests pass
   - [ ] No API latency regression (<200ms p95)
   - [ ] No errors in production logs

---

## Task Dependencies

```
┌─────────────────────────────────────────────────────────┐
│  T1.1  →  T1.2  →  T1.3  →  T1.4                       │
│  (getConstructsSummary)  (fetchSkills)  (fetchPacks)   │
│              │                                          │
│              ▼                                          │
│  T2.1  →  T2.2  →  T2.3  →  T2.4                       │
│  (preflight)   (migration)   (staging)   (production)  │
│                                    │                    │
│                                    ▼                    │
│                          T3.1  →  T3.2  →  T3.3        │
│                          (verify)  (seed)   (api)       │
└─────────────────────────────────────────────────────────┘
```

**Critical Path**: T1.1 → T1.4 → T2.1 → T2.4 → T3.3

---

## Risk Mitigation

| Risk | Mitigation | Owner |
|------|------------|-------|
| Pre-flight finds non-standard versions | Handle manually before migration | Developer |
| Migration fails on production | Have rollback SQL ready | Developer |
| API latency regresses | Monitor p95, batch optimization verified | Developer |

---

## Rollback Plan

1. **Code rollback**: Revert PR via GitHub
2. **Constraint rollback**:
   ```sql
   DROP INDEX IF EXISTS idx_pack_versions_single_latest;
   DROP INDEX IF EXISTS idx_skill_versions_single_latest;
   ```
3. **Data rollback**: Not needed (data fix only removes incorrect flags)

---

## References

- **PRD**: grimoires/loa/prd.md
- **SDD**: grimoires/loa/sdd.md
- **Issue**: https://github.com/0xHoneyJar/loa-constructs/issues/86
- **Context**: grimoires/loa/context/issue-86-islatest-fix.md

---

**Document Status**: Ready for Implementation
**Next Step**: `/implement sprint-1` or `/run sprint-plan`

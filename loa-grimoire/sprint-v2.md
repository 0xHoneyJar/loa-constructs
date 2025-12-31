# Sprint Plan: Loa Skills Registry v2

**Version:** 2.0
**Date:** 2025-12-31
**Author:** Sprint Planner Agent
**Team:** Loa Framework + Janidev (2 developers)
**Sprint Duration:** 2.5 days each
**Total New Sprints:** 3 (Sprints 13-15)
**PRD Reference:** loa-grimoire/prd-v2.md
**SDD Reference:** loa-grimoire/sdd-v2.md

---

## Executive Summary

V2 extends the completed v1 implementation with three focused sprints:

- **Sprint 13**: Security Hardening & Pack Foundation
- **Sprint 14**: GTM Collective Import
- **Sprint 15**: CLI Pack Commands & Polish

**V1 Completion Status:** All 12 sprints COMPLETED (2025-12-31)

**Key V2 Deliverables:**
1. Token blacklisting for true logout (L1)
2. Production JWT secret enforcement (L2)
3. Email service production validation (L3)
4. Path validation consistency (L4)
5. Rate limiter resilience (L5)
6. Skill pack management system
7. GTM Collective pack (8 skills, 14 commands)
8. CLI pack installation commands

---

## Sprint 13: Security Hardening & Pack Foundation

**Goal:** Resolve all security audit findings (L1-L2 P0) and establish pack database schema.

**Duration:** 2.5 days

### Deliverables
- [ ] Token blacklist service (Redis)
- [ ] Production JWT secret enforcement
- [ ] Packs database tables
- [ ] Pack CRUD API endpoints
- [ ] Pack manifest validation

### Acceptance Criteria
- [ ] Logout invalidates refresh tokens immediately
- [ ] App fails to start in production without valid JWT_SECRET
- [ ] `packs`, `pack_versions`, `pack_files` tables created
- [ ] `POST /v1/packs` creates pack record
- [ ] Pack manifest validation rejects invalid schemas

### Technical Tasks

#### T13.1: Token Blacklist Service (L1 - P0)
> From sdd-v2.md: §4.1 L1: Token Blacklist Service

**Files:**
- `apps/api/src/services/blacklist.ts` (new)
- `apps/api/src/services/auth.ts` (modify)
- `apps/api/src/routes/auth.ts` (modify)

**Implementation:**
```typescript
// src/services/blacklist.ts
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';

const BLACKLIST_PREFIX = 'blacklist:';

export const blacklistService = {
  async add(jti: string, expiresInSeconds: number): Promise<void> {
    const key = `${BLACKLIST_PREFIX}${jti}`;
    await redis.setex(key, expiresInSeconds, '1');
    logger.info({ jti }, 'Token added to blacklist');
  },

  async isBlacklisted(jti: string): Promise<boolean> {
    const key = `${BLACKLIST_PREFIX}${jti}`;
    const result = await redis.exists(key);
    return result === 1;
  },
};
```

**Acceptance Criteria:**
- [ ] `blacklistService.add()` stores JTI in Redis with TTL
- [ ] `blacklistService.isBlacklisted()` returns true for blacklisted tokens
- [ ] Logout handler calls blacklist for refresh token
- [ ] Token verification checks blacklist before accepting
- [ ] Unit tests for blacklist service

---

#### T13.2: JWT Secret Production Enforcement (L2 - P0)
> From sdd-v2.md: §4.2 L2: JWT Secret Enforcement

**Files:**
- `apps/api/src/config/env.ts` (modify)

**Implementation:**
```typescript
// In env.ts
const DEV_SECRET = 'development-secret-at-least-32-chars';

JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters')
  .refine(
    (val) => {
      if (process.env.NODE_ENV === 'production') {
        return val !== DEV_SECRET;
      }
      return true;
    },
    'JWT_SECRET must be set to a unique secure value in production'
  ),
```

**Acceptance Criteria:**
- [ ] App exits with clear error if JWT_SECRET missing in production
- [ ] App exits with clear error if JWT_SECRET equals dev fallback in production
- [ ] Development mode still works with fallback
- [ ] Unit test for env validation

---

#### T13.3: Pack Database Schema
> From sdd-v2.md: §3.1 New Tables

**Files:**
- `apps/api/src/db/schema.ts` (modify)
- `apps/api/drizzle/xxxx_add_packs.sql` (new migration)

**Tables to create:**
- `packs` - Pack metadata, pricing, status
- `pack_versions` - Version history with manifests
- `pack_files` - File inventory per version
- `pack_subscriptions` - Links subscriptions to packs
- `pack_installations` - Usage tracking

**Acceptance Criteria:**
- [ ] All 5 tables created with proper indexes
- [ ] Foreign key constraints in place
- [ ] Migration runs successfully
- [ ] Drizzle types generated

---

#### T13.4: Pack CRUD API
> From sdd-v2.md: §5.1 Pack Endpoints

**Files:**
- `apps/api/src/routes/packs.ts` (new)
- `apps/api/src/services/packs.ts` (new)

**Endpoints:**
- `POST /v1/packs` - Create pack
- `GET /v1/packs` - List packs with search/filter
- `GET /v1/packs/:slug` - Get pack details
- `PATCH /v1/packs/:slug` - Update pack
- `DELETE /v1/packs/:slug` - Delete pack (creator only)

**Acceptance Criteria:**
- [ ] Creator can create pack with basic metadata
- [ ] Pack list returns paginated results
- [ ] Pack details include skill/command counts
- [ ] Only owner can update/delete pack
- [ ] Integration tests for all endpoints

---

#### T13.5: Pack Manifest Validation
> From sdd-v2.md: §2.3 Pack Manifest Schema

**Files:**
- `apps/api/src/lib/pack-manifest.ts` (new)

**Validation:**
- Required fields: name, slug, version
- Valid semver format
- Valid pricing configuration
- Valid skill/command paths
- Schema version compatibility

**Acceptance Criteria:**
- [ ] Zod schema for manifest validation
- [ ] Clear error messages for validation failures
- [ ] Validates nested skill/command references
- [ ] Unit tests for validation edge cases

---

### Dependencies
- Sprint 1-12 completed (v1 foundation)
- Upstash Redis available for blacklist

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| Redis unavailable | Graceful degradation, fail closed for auth |
| Schema migration conflicts | Backup before migration, test in staging |

### Success Metrics
- Blacklist operations < 10ms
- Pack creation < 500ms
- JWT validation fails immediately in production without secret

---

## Sprint 14: GTM Collective Import

**Goal:** Import GTM Collective pack and implement pack download with subscription gating.

**Duration:** 2.5 days

### Deliverables
- [ ] GTM Collective pack imported
- [ ] Pack version upload API
- [ ] Pack download with subscription check
- [ ] License generation for packs
- [ ] L3 and L4 security fixes

### Acceptance Criteria
- [ ] GTM Collective appears in pack list
- [ ] All 8 GTM skills present in pack
- [ ] All 14 GTM commands present in pack
- [ ] Download requires Pro subscription (or THJ bypass)
- [ ] License includes pack-specific watermark
- [ ] Email service fails in production if unconfigured

### Technical Tasks

#### T14.1: GTM Skill Migration
> From prd-v2.md: §4 GTM Collective Migration

**Source:** `loa-grimoire/context/gtm-skills-import/`

**Files:**
- `scripts/import-gtm-collective.ts` (new)

**Process:**
1. Read skill files from context directory
2. Create pack record for gtm-collective
3. Create version 1.0.0
4. Upload all files to R2
5. Create file records in database
6. Set THJ bypass flag

**Skills to import (8):**
- analyzing-market
- building-partnerships
- crafting-narratives
- educating-developers
- positioning-product
- pricing-strategist
- reviewing-gtm
- translating-for-stakeholders

**Commands to import (14):**
- gtm-setup, gtm-adopt, gtm-feature-requests
- sync-from-gtm, review-gtm
- analyze-market, position, price
- plan-partnerships, plan-devrel, plan-launch
- create-deck, sync-from-dev, announce-release

**Acceptance Criteria:**
- [ ] Import script runs successfully
- [ ] All 8 skills uploaded to R2
- [ ] All 14 commands uploaded to R2
- [ ] manifest.json correct
- [ ] Pack status = published

---

#### T14.2: Pack Version Upload
> From sdd-v2.md: §5.1 Pack Endpoints

**Files:**
- `apps/api/src/routes/packs.ts` (extend)
- `apps/api/src/services/storage.ts` (extend)

**Endpoint:** `POST /v1/packs/:slug/versions`

**Request:**
```json
{
  "version": "1.0.0",
  "changelog": "Initial release",
  "manifest": { ... },
  "files": [
    { "path": "skills/analyzing-market/SKILL.md", "content": "base64..." }
  ]
}
```

**Acceptance Criteria:**
- [ ] Validates semver format
- [ ] Rejects duplicate versions
- [ ] Uploads files to R2
- [ ] Creates version and file records
- [ ] Updates `is_latest` flag
- [ ] Integration tests

---

#### T14.3: Pack Download with Subscription Check
> From sdd-v2.md: §5.1 Pack Endpoints

**Files:**
- `apps/api/src/routes/packs.ts` (extend)
- `apps/api/src/services/packs.ts` (extend)

**Endpoint:** `GET /v1/packs/:slug/download`

**Logic:**
1. Check authentication
2. Check subscription/access:
   - Free packs: allow all
   - Premium packs: check tier or pack-specific subscription
   - THJ bypass: check thjBypass flag
3. Fetch files from R2
4. Generate license token
5. Return files + license

**Error Response (402):**
```json
{
  "error": {
    "code": "PACK_SUBSCRIPTION_REQUIRED",
    "message": "This pack requires a GTM Collective subscription",
    "details": {
      "pricing": { "monthly": "$49/month", "annual": "$490/year" }
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Free packs downloadable by all authenticated users
- [ ] GTM Collective requires Pro tier or pack subscription
- [ ] THJ users bypass subscription check
- [ ] 402 response includes pricing info
- [ ] Integration tests for access control

---

#### T14.4: Pack License Generation
> From prd-v2.md: §FR2.2 License Generation for Packs

**Files:**
- `apps/api/src/services/license.ts` (extend)

**License Payload:**
```json
{
  "type": "pack",
  "pack": "gtm-collective",
  "version": "1.0.0",
  "user_id": "...",
  "tier": "pro",
  "watermark": "user@example.com",
  "expires_at": "2026-01-01T00:00:00Z"
}
```

**Acceptance Criteria:**
- [ ] License bound to pack and version
- [ ] Expiration from subscription period
- [ ] Watermark for attribution
- [ ] Unit tests for license generation

---

#### T14.5: Email Service Production Validation (L3 - P1)
> From sdd-v2.md: §4.3 L3: Email Service Production Validation

**Files:**
- `apps/api/src/services/email.ts` (modify)

**Implementation:**
```typescript
if (!env.RESEND_API_KEY) {
  if (env.NODE_ENV === 'production') {
    logger.error('RESEND_API_KEY not configured in production');
    throw new Error('Email service not configured');
  }
  logger.warn({ to, subject }, 'Email skipped - not configured');
  return { success: false, error: 'Email not configured' };
}
```

**Acceptance Criteria:**
- [ ] Production throws if RESEND_API_KEY missing
- [ ] Development logs warning and returns success: false
- [ ] Unit tests for both modes

---

#### T14.6: Path Validation Consistency (L4 - P1)
> From sdd-v2.md: §4.4 L4: Consistent Path Validation

**Files:**
- `apps/api/src/lib/security.ts` (new or extend)
- `apps/api/src/services/storage.ts` (modify)

**Implementation:**
```typescript
export function validatePath(path: string): { valid: boolean; sanitized?: string; error?: string } {
  if (path.includes('\0')) return { valid: false, error: 'Null bytes' };
  if (path.includes('..')) return { valid: false, error: 'Path traversal' };
  if (path.startsWith('/')) return { valid: false, error: 'Absolute path' };

  const validPathRegex = /^[a-zA-Z0-9/_.-]+$/;
  if (!validPathRegex.test(path)) return { valid: false, error: 'Invalid chars' };

  return { valid: true, sanitized: path.replace(/\/+/g, '/') };
}
```

**Acceptance Criteria:**
- [ ] All storage operations use validatePath()
- [ ] Path traversal attempts blocked and logged
- [ ] Unit tests for edge cases

---

### Dependencies
- Sprint 13 completed (pack schema)
- GTM skills available in context directory
- R2 storage configured

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| GTM file format issues | Validate each file, detailed error logs |
| Large upload size | Stream uploads, size limits |

### Success Metrics
- GTM import completes in < 60 seconds
- Pack download < 5 seconds
- All security fixes verified by re-audit

---

## Sprint 15: CLI Pack Commands & Polish

**Goal:** Implement CLI pack installation and final security hardening.

**Duration:** 2.5 days

### Deliverables
- [ ] CLI `pack install` command
- [ ] CLI `pack list` command
- [ ] CLI `pack update` command
- [ ] Rate limiter resilience (L5)
- [ ] Admin API (basic)
- [ ] E2E testing for pack flow

### Acceptance Criteria
- [ ] `loa pack install gtm-collective` works end-to-end
- [ ] `loa pack list` shows installed packs
- [ ] `loa pack update` updates to latest version
- [ ] Auth endpoints fail closed on Redis error
- [ ] Admin can list users and moderate packs
- [ ] E2E test covers full installation flow

### Technical Tasks

#### T15.1: CLI Pack Install Command
> From sdd-v2.md: §6.1 New Commands

**Files:**
- `packages/loa-registry/src/commands/pack-install.ts` (new)
- `packages/loa-registry/src/services/pack-installer.ts` (new)

**Command:** `loa pack install <pack-slug> [--version <version>]`

**Flow:**
1. Check authentication
2. Fetch pack metadata from API
3. Check subscription/access
4. Download pack files
5. Validate license
6. Write files to `.claude/`:
   - Skills to `.claude/skills/{skill-slug}/`
   - Commands to `.claude/commands/{command-name}.md`
   - Protocols to `.claude/protocols/{protocol-name}.md`
7. Write pack manifest to `.claude/packs/{pack-slug}/manifest.json`
8. Write license to `.claude/packs/{pack-slug}/.license.json`
9. Record installation via API

**Output:**
```
Installing gtm-collective v1.0.0...

✓ Verified subscription
✓ Downloaded 47 files (125 KB)
✓ Installed 8 skills
✓ Installed 14 commands
✓ License valid until 2026-01-01

GTM Collective installed successfully!

Available commands:
  /gtm-setup          Initialize GTM workflow
  /analyze-market     Run market analysis
  ...
```

**Acceptance Criteria:**
- [ ] Installs all skills to correct directories
- [ ] Installs all commands
- [ ] Creates license file
- [ ] Fails gracefully without subscription
- [ ] Shows upgrade prompt with pricing

---

#### T15.2: CLI Pack List Command
> From sdd-v2.md: §6.1 New Commands

**Files:**
- `packages/loa-registry/src/commands/pack-list.ts` (new)

**Command:** `loa pack list`

**Output:**
```
Installed Packs:

  gtm-collective    v1.0.0    (8 skills, 14 commands)
    License: Pro subscription, expires 2026-01-01
    Installed: 2025-12-31
```

**Acceptance Criteria:**
- [ ] Lists all installed packs
- [ ] Shows version and content counts
- [ ] Shows license status
- [ ] Works offline (reads local files)

---

#### T15.3: CLI Pack Update Command
> From sdd-v2.md: §6.1 New Commands

**Files:**
- `packages/loa-registry/src/commands/pack-update.ts` (new)

**Command:** `loa pack update [pack-slug]`

**Flow:**
1. Check for updates (compare local vs API version)
2. Download new version if available
3. Backup existing files
4. Install new version
5. Update license
6. Report changes

**Acceptance Criteria:**
- [ ] Detects when update available
- [ ] Downloads and installs new version
- [ ] Backs up existing files
- [ ] Reports what changed (changelog)

---

#### T15.4: Rate Limiter Resilience (L5 - P2)
> From sdd-v2.md: §4.5 L5: Rate Limiter Resilience

**Files:**
- `apps/api/src/middleware/rate-limiter.ts` (modify)

**Implementation:**
```typescript
} catch (error) {
  logger.error({ error, path }, 'Rate limiter error');

  // Fail closed for auth endpoints
  if (AUTH_ENDPOINTS.some(ep => path.startsWith(ep))) {
    return c.json({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Rate limiting unavailable' }
    }, 503);
  }

  // Fail open for other endpoints with warning
  c.header('X-RateLimit-Degraded', 'true');
  await next();
}
```

**Acceptance Criteria:**
- [ ] Auth endpoints return 503 on Redis error
- [ ] Other endpoints proceed with X-RateLimit-Degraded header
- [ ] All failures logged
- [ ] Unit tests for both cases

---

#### T15.5: Admin API (Basic)
> From sdd-v2.md: §5.2 Admin Endpoints

**Files:**
- `apps/api/src/routes/admin.ts` (new)
- `apps/api/src/middleware/admin.ts` (new)

**Endpoints:**
- `GET /v1/admin/users` - List users (with search)
- `GET /v1/admin/users/:id` - User details
- `PATCH /v1/admin/users/:id` - Update user (ban, tier override)
- `GET /v1/admin/packs` - List all packs
- `PATCH /v1/admin/packs/:id` - Moderate pack (approve, reject, feature)
- `DELETE /v1/admin/packs/:id` - Remove pack

**Acceptance Criteria:**
- [ ] Requires admin role
- [ ] All actions audit logged
- [ ] Cannot modify own account
- [ ] Integration tests

---

#### T15.6: E2E Testing for Pack Flow
> From prd-v2.md: §10 Success Criteria

**Files:**
- `apps/api/tests/e2e/pack-flow.test.ts` (new)
- `packages/loa-registry/tests/pack-install.test.ts` (new)

**Test Scenarios:**
1. Create pack -> Upload version -> List packs
2. Download pack as free user -> 402 response
3. Download pack as pro user -> Success
4. CLI pack install -> Files created correctly
5. CLI pack list -> Shows installed pack
6. CLI pack update -> Updates to new version

**Acceptance Criteria:**
- [ ] All E2E tests pass
- [ ] Tests run in CI
- [ ] Coverage for happy path and error cases

---

### Dependencies
- Sprint 14 completed (GTM imported)
- CLI plugin infrastructure from v1

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| CLI file write permissions | Check permissions first, clear errors |
| Pack format compatibility | Validate structure before install |

### Success Metrics
- Pack install < 10 seconds
- All E2E tests pass
- Zero security findings on re-audit

---

## Risk Register (V2)

| ID | Risk | Probability | Impact | Sprint | Mitigation |
|----|------|-------------|--------|--------|------------|
| R1 | Redis unavailability blocks auth | Medium | High | 13 | Fail closed, clear error messages |
| R2 | GTM skill format incompatibility | Low | Medium | 14 | Validate each file during import |
| R3 | Large pack downloads timeout | Medium | Medium | 14 | Streaming downloads, progress indication |
| R4 | CLI file permission issues | Medium | Low | 15 | Pre-check permissions, clear errors |
| R5 | Stripe GTM product not configured | Medium | High | 14 | Document setup, have test prices |

---

## Success Criteria (V2 Launch)

### Security Checklist
- [ ] L1: Token blacklisting implemented
- [ ] L2: JWT secret enforcement in production
- [ ] L3: Email service production validation
- [ ] L4: Path validation consistency
- [ ] L5: Rate limiter resilience

### GTM Collective Checklist
- [ ] All 8 skills installable
- [ ] All 14 commands functional
- [ ] Subscription gating works
- [ ] License generation correct

### Platform Checklist
- [ ] Pack CRUD API complete
- [ ] Pack download with access control
- [ ] CLI pack install working
- [ ] Admin API functional
- [ ] E2E tests passing

---

## Sprint Calendar (V2)

| Sprint | Start | End | Focus |
|--------|-------|-----|-------|
| 13 | Day 1 | Day 2.5 | Security & Pack Foundation |
| 14 | Day 3 | Day 5.5 | GTM Import |
| 15 | Day 6 | Day 8.5 | CLI & Polish |

**Total Duration:** ~9 days

---

## Appendix

### A. New Environment Variables (V2)

```bash
# No new environment variables required
# Uses existing Redis, R2, Stripe configuration
```

### B. Stripe Product Setup (GTM Collective)

```bash
# Create GTM Collective product and prices in Stripe dashboard:
# Product: GTM Collective
#   - Monthly Price: $49/month (price_gtm_monthly)
#   - Annual Price: $490/year (price_gtm_annual)
```

### C. GTM Collective Import Checklist

- [ ] Skills directory: `loa-grimoire/context/gtm-skills-import/`
- [ ] Commands directory: `loa-grimoire/context/gtm-commands/`
- [ ] Stripe products created
- [ ] R2 bucket accessible
- [ ] Admin user created for ownership

---

*Generated by Sprint Planner Agent*
*Based on PRD v2 (loa-grimoire/prd-v2.md) and SDD v2 (loa-grimoire/sdd-v2.md)*

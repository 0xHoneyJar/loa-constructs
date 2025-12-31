# Software Design Document: Loa Skills Registry v2 (Addendum)

**Version:** 2.0
**Date:** 2025-12-31
**Author:** Architecture Designer Agent
**Status:** Draft
**PRD Reference:** loa-grimoire/prd-v2.md
**Base SDD:** loa-grimoire/sdd.md

---

## Table of Contents

1. [Overview](#1-overview)
2. [Pack Management Architecture](#2-pack-management-architecture)
3. [Database Schema Changes](#3-database-schema-changes)
4. [Security Hardening Design](#4-security-hardening-design)
5. [API Specifications (New/Modified)](#5-api-specifications-newmodified)
6. [CLI Changes](#6-cli-changes)
7. [File Storage Design](#7-file-storage-design)
8. [Development Phases](#8-development-phases)

---

## 1. Overview

### 1.1 Purpose

This document extends the v1 SDD (`sdd.md`) with architectural changes required for v2:

1. **Pack Management System** - First-class support for skill pack distribution
2. **Security Hardening** - Implementation details for L1-L5 audit findings
3. **GTM Collective Integration** - Architecture for importing premium content

### 1.2 Architecture Impact

**New Components:**
- Pack storage and versioning layer
- Token blacklist service (Redis)
- Admin API module

**Modified Components:**
- Authentication service (blacklisting, secret enforcement)
- Email service (production validation)
- Rate limiter (resilience)
- CLI plugin (pack installation)

### 1.3 Component Diagram Update

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                            LOA SKILLS REGISTRY v2                                     │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  NEW/MODIFIED COMPONENTS (v2)                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           API Server (Hono)                                     │ │
│  │                                                                                  │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐               │ │
│  │  │   Packs    │  │   Admin    │  │  Blacklist │  │  Security  │               │ │
│  │  │  Module ★  │  │  Module ★  │  │ Service ★  │  │ Hardened ★ │               │ │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘               │ │
│  │                                                                                  │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                       │
│  DATA LAYER CHANGES                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                   │
│  │   PostgreSQL     │  │    Redis         │  │  Cloudflare R2   │                   │
│  │                  │  │                  │  │                  │                   │
│  │  + packs         │  │  + blacklist:*   │  │  + packs/{slug}/ │                   │
│  │  + pack_versions │  │    (token jti)   │  │    /versions/    │                   │
│  │  + pack_files    │  │                  │  │                  │                   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                   │
│                                                                                       │
│  ★ = New or significantly modified in v2                                             │
│                                                                                       │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pack Management Architecture

### 2.1 Pack Concept

A **pack** is a distributable collection of related skills and commands. Unlike individual skills (which remain the atomic unit), packs:

1. Are versioned as a unit
2. May have their own subscription (pack-level pricing)
3. Include shared protocols/scripts
4. Are installed/uninstalled atomically

### 2.2 Pack Structure

```
pack-slug/
├── manifest.json           # Pack metadata (required)
├── skills/                  # Skill directories
│   ├── skill-1/
│   │   ├── index.yaml
│   │   ├── SKILL.md
│   │   └── resources/
│   └── skill-2/
├── commands/                # Command files
│   ├── command-1.md
│   └── command-2.md
├── protocols/               # Shared protocols (optional)
│   └── shared-protocol.md
└── scripts/                 # Installation scripts (optional)
    └── mount.sh
```

### 2.3 Pack Manifest Schema

```json
{
  "$schema": "https://loaskills.dev/schemas/pack-manifest-v1.json",
  "name": "GTM Collective",
  "slug": "gtm-collective",
  "version": "1.0.0",
  "description": "Go-to-Market strategy skill pack",
  "author": {
    "name": "The Honey Jar",
    "email": "support@thehoneyjar.io",
    "url": "https://thehoneyjar.io"
  },
  "license": "proprietary",
  "repository": "https://github.com/thehoneyjar/gtm-collective",
  "homepage": "https://loaskills.dev/packs/gtm-collective",

  "pricing": {
    "type": "subscription",
    "tier": "pro",
    "stripe_product_id": "prod_gtm_collective",
    "prices": {
      "monthly": "price_gtm_monthly",
      "annual": "price_gtm_annual"
    }
  },

  "skills": [
    {
      "slug": "analyzing-market",
      "path": "skills/analyzing-market"
    }
  ],

  "commands": [
    {
      "name": "gtm-setup",
      "path": "commands/gtm-setup.md"
    }
  ],

  "protocols": [
    {
      "name": "gtm-workflow",
      "path": "protocols/gtm-workflow.md"
    }
  ],

  "dependencies": {
    "loa": ">=0.9.0"
  },

  "tags": ["gtm", "marketing", "strategy", "enterprise"]
}
```

### 2.4 Pack Lifecycle

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   CREATE    │ ──▶  │   REVIEW    │ ──▶  │  PUBLISHED  │
│  (upload)   │      │  (pending)  │      │  (active)   │
└─────────────┘      └─────────────┘      └─────────────┘
                            │                    │
                            ▼                    ▼
                     ┌─────────────┐      ┌─────────────┐
                     │  REJECTED   │      │ DEPRECATED  │
                     └─────────────┘      └─────────────┘
```

**States:**
- `draft` - Uploaded but not submitted for review
- `pending_review` - Submitted for moderation
- `published` - Available for installation
- `rejected` - Failed moderation (with reason)
- `deprecated` - No longer maintained, existing users warned

---

## 3. Database Schema Changes

### 3.1 New Tables

#### Entity: Packs

```sql
CREATE TYPE pack_status AS ENUM (
    'draft', 'pending_review', 'published', 'rejected', 'deprecated'
);

CREATE TABLE packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    long_description TEXT,
    owner_id UUID NOT NULL,
    owner_type owner_type NOT NULL DEFAULT 'user',

    -- Pricing
    pricing_type VARCHAR(50) DEFAULT 'free', -- 'free', 'one_time', 'subscription'
    tier_required subscription_tier DEFAULT 'free',
    stripe_product_id VARCHAR(255),
    stripe_monthly_price_id VARCHAR(255),
    stripe_annual_price_id VARCHAR(255),

    -- Status
    status pack_status NOT NULL DEFAULT 'draft',
    review_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,

    -- Metadata
    repository_url TEXT,
    homepage_url TEXT,
    documentation_url TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    thj_bypass BOOLEAN DEFAULT FALSE, -- THJ internal access

    -- Stats
    downloads INTEGER DEFAULT 0,
    rating_sum INTEGER DEFAULT 0,
    rating_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_packs_slug ON packs(slug);
CREATE INDEX idx_packs_owner ON packs(owner_id, owner_type);
CREATE INDEX idx_packs_status ON packs(status);
CREATE INDEX idx_packs_featured ON packs(is_featured) WHERE is_featured = TRUE;
```

#### Entity: Pack Versions

```sql
CREATE TABLE pack_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL, -- semver: 1.0.0
    changelog TEXT,
    manifest JSONB NOT NULL, -- Full manifest.json

    -- Compatibility
    min_loa_version VARCHAR(50),
    max_loa_version VARCHAR(50),

    -- Status
    is_latest BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,

    -- Size tracking
    total_size_bytes INTEGER NOT NULL DEFAULT 0,
    file_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_pack_version UNIQUE (pack_id, version)
);

CREATE INDEX idx_pack_versions_pack ON pack_versions(pack_id);
CREATE INDEX idx_pack_versions_latest ON pack_versions(pack_id) WHERE is_latest = TRUE;
```

#### Entity: Pack Files

```sql
CREATE TABLE pack_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES pack_versions(id) ON DELETE CASCADE,
    path VARCHAR(500) NOT NULL, -- e.g., 'skills/analyzing-market/SKILL.md'
    content_hash VARCHAR(64) NOT NULL, -- SHA-256
    storage_key VARCHAR(500) NOT NULL, -- R2 key
    size_bytes INTEGER NOT NULL,
    mime_type VARCHAR(100) DEFAULT 'text/plain',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_pack_file_path UNIQUE (version_id, path)
);

CREATE INDEX idx_pack_files_version ON pack_files(version_id);
```

#### Entity: Pack Subscriptions (Join Table)

```sql
-- Links subscriptions to packs for pack-specific subscriptions
CREATE TABLE pack_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,

    granted_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_pack_subscription UNIQUE (subscription_id, pack_id)
);

CREATE INDEX idx_pack_subscriptions_sub ON pack_subscriptions(subscription_id);
CREATE INDEX idx_pack_subscriptions_pack ON pack_subscriptions(pack_id);
```

#### Entity: Pack Installations (Usage Tracking)

```sql
CREATE TABLE pack_installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES pack_versions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

    action VARCHAR(50) NOT NULL, -- 'install', 'update', 'uninstall'
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pack_installations_pack ON pack_installations(pack_id);
CREATE INDEX idx_pack_installations_user ON pack_installations(user_id);
CREATE INDEX idx_pack_installations_created ON pack_installations(created_at);
```

### 3.2 Schema Modifications

#### Add is_admin to users

```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
```

#### Modify audit_logs for pack events

```sql
-- No schema change needed, existing structure supports:
-- action: 'pack.created', 'pack.published', 'pack.installed', etc.
-- resource_type: 'pack'
-- resource_id: pack UUID
```

### 3.3 Entity Relationship Diagram (V2 Additions)

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    packs     │       │ pack_versions│       │  pack_files  │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id           │◀──┐   │ id           │◀──┐   │ id           │
│ name         │   │   │ pack_id      │───┘   │ version_id   │───▶ pack_versions
│ slug         │   │   │ version      │       │ path         │
│ owner_id     │   │   │ manifest     │       │ storage_key  │
│ status       │   │   │ is_latest    │       └──────────────┘
│ stripe_...   │   │   └──────────────┘
└──────────────┘   │
       │           │   ┌──────────────────┐
       │           │   │pack_subscriptions│
       │           │   ├──────────────────┤
       │           └───│ pack_id          │
       │               │ subscription_id  │───▶ subscriptions
       │               └──────────────────┘
       │
       │           ┌──────────────────┐
       └──────────▶│pack_installations│
                   ├──────────────────┤
                   │ pack_id          │
                   │ version_id       │───▶ pack_versions
                   │ user_id          │───▶ users
                   │ action           │
                   └──────────────────┘
```

---

## 4. Security Hardening Design

### 4.1 L1: Token Blacklist Service

**Architecture:**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Logout    │────▶│  Blacklist  │────▶│   Redis     │
│   Handler   │     │   Service   │     │  (Upstash)  │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │   Token     │
                    │ Verification│
                    └─────────────┘
```

**Implementation:**

```typescript
// src/services/blacklist.ts
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';

const BLACKLIST_PREFIX = 'blacklist:';

export const blacklistService = {
  /**
   * Add token to blacklist
   * @param jti - JWT ID (unique token identifier)
   * @param expiresInSeconds - TTL matching token expiry
   */
  async add(jti: string, expiresInSeconds: number): Promise<void> {
    const key = `${BLACKLIST_PREFIX}${jti}`;
    await redis.setex(key, expiresInSeconds, '1');
    logger.info({ jti }, 'Token added to blacklist');
  },

  /**
   * Check if token is blacklisted
   * @param jti - JWT ID to check
   * @returns true if blacklisted
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const key = `${BLACKLIST_PREFIX}${jti}`;
    const result = await redis.exists(key);
    return result === 1;
  },
};
```

**Token Verification Update:**

```typescript
// In src/services/auth.ts
export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const payload = await verifyToken(token, 'refresh');

  // Check blacklist
  if (payload.jti && await blacklistService.isBlacklisted(payload.jti)) {
    throw Errors.Unauthorized('Token has been revoked');
  }

  return payload;
}
```

**Logout Handler Update:**

```typescript
// In src/routes/auth.ts
app.post('/logout', async (c) => {
  const refreshToken = c.req.header('X-Refresh-Token');

  if (refreshToken) {
    try {
      const payload = await verifyToken(refreshToken, 'refresh');
      if (payload.jti) {
        const ttl = Math.floor((payload.exp - Date.now() / 1000));
        if (ttl > 0) {
          await blacklistService.add(payload.jti, ttl);
        }
      }
    } catch {
      // Token invalid/expired - no need to blacklist
    }
  }

  return c.json({ success: true, message: 'Logged out successfully' });
});
```

### 4.2 L2: JWT Secret Enforcement

**Environment Schema Update:**

```typescript
// src/config/env.ts
import { z } from 'zod';

const DEV_SECRET = 'development-secret-at-least-32-chars';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters')
    .refine(
      (val) => {
        // In production, must not be the development fallback
        if (process.env.NODE_ENV === 'production') {
          return val !== DEV_SECRET;
        }
        return true;
      },
      'JWT_SECRET must be set to a unique secure value in production'
    ),

  // ... rest of env schema
});

// Fail fast on startup if invalid
const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('Environment validation failed:');
  console.error(result.error.format());
  process.exit(1);
}

export const env = result.data;
```

### 4.3 L3: Email Service Production Validation

```typescript
// src/services/email.ts
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === 'production') {
      logger.error('RESEND_API_KEY not configured in production');
      throw new Error('Email service not configured');
    }

    logger.warn({ to, subject }, 'Email skipped - RESEND_API_KEY not configured');
    return {
      success: false,
      error: 'Email service not configured in development'
    };
  }

  // ... existing send logic
}
```

### 4.4 L4: Consistent Path Validation

```typescript
// src/lib/security.ts

/**
 * Validate and sanitize file paths
 * Prevents path traversal and injection attacks
 */
export function validatePath(path: string): { valid: boolean; sanitized?: string; error?: string } {
  // Check for null bytes
  if (path.includes('\0')) {
    return { valid: false, error: 'Path contains null bytes' };
  }

  // Check for path traversal
  if (path.includes('..') || path.includes('\\..') || path.includes('../')) {
    return { valid: false, error: 'Path traversal detected' };
  }

  // Check for absolute paths
  if (path.startsWith('/') || path.match(/^[A-Za-z]:\\/)) {
    return { valid: false, error: 'Absolute paths not allowed' };
  }

  // Whitelist allowed characters
  const validPathRegex = /^[a-zA-Z0-9/_.-]+$/;
  if (!validPathRegex.test(path)) {
    return { valid: false, error: 'Path contains invalid characters' };
  }

  // Sanitize
  const sanitized = path
    .replace(/\/+/g, '/')  // Collapse multiple slashes
    .replace(/^\//, '');    // Remove leading slash

  return { valid: true, sanitized };
}

// src/services/storage.ts
import { validatePath } from '../lib/security';

export function generateStorageKey(basePath: string, filePath: string): string {
  const result = validatePath(filePath);
  if (!result.valid) {
    throw Errors.BadRequest(`Invalid file path: ${result.error}`);
  }

  return `${basePath}/${result.sanitized}`;
}
```

### 4.5 L5: Rate Limiter Resilience

```typescript
// src/middleware/rate-limiter.ts

const AUTH_ENDPOINTS = ['/v1/auth/login', '/v1/auth/register', '/v1/auth/refresh'];

export function rateLimiter(options: RateLimitOptions): MiddlewareHandler {
  return async (c, next) => {
    const key = getClientKey(c);
    const path = c.req.path;

    try {
      const result = await checkRateLimit(key, options);

      if (!result.allowed) {
        return c.json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            details: { retry_after: result.retryAfter }
          }
        }, 429);
      }

      // Set headers
      c.header('X-RateLimit-Limit', String(options.limit));
      c.header('X-RateLimit-Remaining', String(result.remaining));
      c.header('X-RateLimit-Reset', String(result.resetAt));

      await next();
    } catch (error) {
      logger.error({ error, path, key }, 'Rate limiter error');

      // Fail closed for auth endpoints
      if (AUTH_ENDPOINTS.some(ep => path.startsWith(ep))) {
        return c.json({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Rate limiting service unavailable'
          }
        }, 503);
      }

      // Fail open for other endpoints with warning header
      c.header('X-RateLimit-Degraded', 'true');
      logger.warn({ path }, 'Rate limiting bypassed due to Redis error');
      await next();
    }
  };
}
```

---

## 5. API Specifications (New/Modified)

### 5.1 Pack Endpoints

#### POST /v1/packs
Create a new pack.

**Authorization:** Bearer token (verified email required)

**Request:**
```json
{
  "name": "GTM Collective",
  "slug": "gtm-collective",
  "description": "Go-to-Market strategy skill pack",
  "pricing": {
    "type": "subscription",
    "tier_required": "pro",
    "stripe_product_id": "prod_xxx",
    "stripe_monthly_price_id": "price_xxx",
    "stripe_annual_price_id": "price_xxx"
  }
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "uuid",
    "name": "GTM Collective",
    "slug": "gtm-collective",
    "status": "draft",
    "created_at": "2025-12-31T00:00:00Z"
  },
  "request_id": "req_xxx"
}
```

#### POST /v1/packs/:slug/versions
Upload a new version of a pack.

**Request:**
```json
{
  "version": "1.0.0",
  "changelog": "Initial release",
  "manifest": { ... },
  "files": [
    {
      "path": "skills/analyzing-market/SKILL.md",
      "content": "base64-encoded-content"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "uuid",
    "version": "1.0.0",
    "is_latest": true,
    "file_count": 25,
    "total_size_bytes": 45000,
    "published_at": "2025-12-31T00:00:00Z"
  },
  "request_id": "req_xxx"
}
```

#### GET /v1/packs/:slug/download
Download pack files.

**Authorization:** Bearer token or API key

**Response (200 OK):**
```json
{
  "data": {
    "pack": {
      "name": "GTM Collective",
      "version": "1.0.0",
      "files": [
        {
          "path": "manifest.json",
          "content": "..."
        },
        {
          "path": "skills/analyzing-market/SKILL.md",
          "content": "..."
        }
      ]
    },
    "license": {
      "type": "subscription",
      "tier": "pro",
      "expires_at": "2026-01-01T00:00:00Z",
      "watermark": "user@example.com"
    }
  },
  "request_id": "req_xxx"
}
```

**Error Response (402 Payment Required):**
```json
{
  "error": {
    "code": "PACK_SUBSCRIPTION_REQUIRED",
    "message": "This pack requires a GTM Collective subscription",
    "details": {
      "pack": "gtm-collective",
      "pricing": {
        "monthly": "$49/month",
        "annual": "$490/year"
      },
      "checkout_url": "/v1/packs/gtm-collective/checkout"
    }
  },
  "request_id": "req_xxx"
}
```

#### GET /v1/packs
List available packs.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query |
| tag | string | Filter by tag |
| featured | boolean | Only featured packs |
| page | number | Page number |
| per_page | number | Items per page |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "GTM Collective",
      "slug": "gtm-collective",
      "description": "Go-to-Market strategy skill pack",
      "tier_required": "pro",
      "downloads": 150,
      "skill_count": 8,
      "command_count": 14,
      "is_featured": true,
      "latest_version": "1.0.0"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 1
  },
  "request_id": "req_xxx"
}
```

### 5.2 Admin Endpoints

#### GET /v1/admin/users
List all users (admin only).

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search by email/name |
| tier | string | Filter by tier |
| page | number | Page number |

#### PATCH /v1/admin/users/:id
Update user (admin only).

**Request:**
```json
{
  "is_banned": true,
  "ban_reason": "ToS violation"
}
```

#### PATCH /v1/admin/packs/:id
Moderate pack (admin only).

**Request:**
```json
{
  "status": "published",
  "is_featured": true
}
```

---

## 6. CLI Changes

### 6.1 New Commands

#### `loa pack install <pack-slug>`

Install a skill pack.

**Flow:**
1. Check authentication
2. Fetch pack metadata
3. Check subscription/access
4. Download pack files
5. Validate license
6. Write files to `.claude/`
7. Register installation

**Output:**
```
Installing gtm-collective v1.0.0...

✓ Verified subscription
✓ Downloaded 25 files (45 KB)
✓ Installed 8 skills
✓ Installed 14 commands
✓ License valid until 2026-01-01

GTM Collective installed successfully!

Available commands:
  /gtm-setup          Initialize GTM workflow
  /analyze-market     Run market analysis
  ...
```

#### `loa pack list`

List installed packs.

**Output:**
```
Installed Packs:

  gtm-collective    v1.0.0    (8 skills, 14 commands)
    License: Pro subscription, expires 2026-01-01
    Installed: 2025-12-31
```

#### `loa pack update [pack-slug]`

Update installed pack(s).

**Flow:**
1. Check for updates (compare versions)
2. Download new version
3. Backup existing files
4. Install new version
5. Migrate any local changes

### 6.2 Modified Commands

#### `loa search`

Add pack search results.

**Output:**
```
Searching for "gtm"...

Packs:
  gtm-collective    Go-to-Market strategy pack    (Pro)

Skills:
  (no individual skills match)
```

---

## 7. File Storage Design

### 7.1 R2 Key Structure

```
packs/
├── gtm-collective/
│   ├── 1.0.0/
│   │   ├── manifest.json
│   │   ├── skills/
│   │   │   └── analyzing-market/
│   │   │       ├── index.yaml
│   │   │       └── SKILL.md
│   │   └── commands/
│   │       └── gtm-setup.md
│   └── 1.0.1/
│       └── ...
└── another-pack/
    └── ...
```

### 7.2 Storage Service Updates

```typescript
// src/services/storage.ts

export async function uploadPackFile(
  packSlug: string,
  version: string,
  filePath: string,
  content: Buffer
): Promise<{ storageKey: string; contentHash: string }> {
  // Validate path
  const pathResult = validatePath(filePath);
  if (!pathResult.valid) {
    throw Errors.BadRequest(`Invalid file path: ${pathResult.error}`);
  }

  const storageKey = `packs/${packSlug}/${version}/${pathResult.sanitized}`;
  const contentHash = createHash('sha256').update(content).digest('hex');

  await r2.putObject({
    Bucket: env.R2_BUCKET,
    Key: storageKey,
    Body: content,
    ContentType: getMimeType(filePath),
  });

  return { storageKey, contentHash };
}

export async function downloadPackVersion(
  packSlug: string,
  version: string,
  files: PackFile[]
): Promise<{ path: string; content: string }[]> {
  const results = await Promise.all(
    files.map(async (file) => {
      const response = await r2.getObject({
        Bucket: env.R2_BUCKET,
        Key: file.storageKey,
      });

      const content = await response.Body?.transformToString();
      return { path: file.path, content: content || '' };
    })
  );

  return results;
}
```

---

## 8. Development Phases

### Sprint 13: Security & Pack Foundation

**Tasks:**
- [ ] T13.1: Implement token blacklist service (L1)
- [ ] T13.2: Enforce JWT secret in production (L2)
- [ ] T13.3: Create packs database schema
- [ ] T13.4: Implement pack CRUD API
- [ ] T13.5: Create pack manifest validation

**Deliverables:**
- Token blacklisting functional
- JWT secret enforcement active
- `POST /v1/packs` endpoint working
- Pack manifest schema defined

### Sprint 14: GTM Collective Import

**Tasks:**
- [ ] T14.1: Migrate GTM skills to pack format
- [ ] T14.2: Configure Stripe GTM products/prices
- [ ] T14.3: Implement pack version upload
- [ ] T14.4: Implement pack download with subscription check
- [ ] T14.5: Email service production validation (L3)
- [ ] T14.6: Path validation consistency (L4)

**Deliverables:**
- GTM Collective pack in database
- GTM files in R2
- Pack download working with subscription gate
- L3, L4 security fixes

### Sprint 15: CLI & Polish

**Tasks:**
- [ ] T15.1: CLI `pack install` command
- [ ] T15.2: CLI `pack list` command
- [ ] T15.3: CLI `pack update` command
- [ ] T15.4: Rate limiter resilience (L5)
- [ ] T15.5: Admin API (basic)
- [ ] T15.6: E2E testing for pack flow

**Deliverables:**
- CLI pack management complete
- L5 security fix
- Admin user/pack management API
- Full pack installation E2E test

---

## Appendix

### A. Migration Script: GTM Import

```typescript
// scripts/import-gtm-collective.ts

import { db, packs, packVersions, packFiles } from '../src/db';
import { storage } from '../src/services/storage';
import * as fs from 'fs/promises';
import * as path from 'path';

const GTM_SOURCE = 'loa-grimoire/context/gtm-skills-import';

async function importGTMCollective() {
  // 1. Create pack record
  const [pack] = await db.insert(packs).values({
    name: 'GTM Collective',
    slug: 'gtm-collective',
    description: 'Go-to-Market strategy skill pack with 8 AI agents and 14 commands',
    ownerId: ADMIN_USER_ID,
    ownerType: 'user',
    pricingType: 'subscription',
    tierRequired: 'pro',
    stripeProductId: 'prod_gtm_collective',
    stripeMonthlyPriceId: 'price_gtm_monthly',
    stripeAnnualPriceId: 'price_gtm_annual',
    status: 'published',
    thjBypass: true,
  }).returning();

  // 2. Create version
  const manifest = await buildManifest(GTM_SOURCE);
  const [version] = await db.insert(packVersions).values({
    packId: pack.id,
    version: '1.0.0',
    changelog: 'Initial release',
    manifest,
    isLatest: true,
    publishedAt: new Date(),
  }).returning();

  // 3. Upload files
  const files = await collectFiles(GTM_SOURCE);
  for (const file of files) {
    const content = await fs.readFile(file.absolutePath);
    const { storageKey, contentHash } = await storage.uploadPackFile(
      'gtm-collective',
      '1.0.0',
      file.relativePath,
      content
    );

    await db.insert(packFiles).values({
      versionId: version.id,
      path: file.relativePath,
      contentHash,
      storageKey,
      sizeBytes: content.length,
      mimeType: getMimeType(file.relativePath),
    });
  }

  console.log(`Imported GTM Collective with ${files.length} files`);
}
```

### B. Drizzle Schema Types

```typescript
// src/db/schema.ts additions

export const packStatusEnum = pgEnum('pack_status', [
  'draft', 'pending_review', 'published', 'rejected', 'deprecated'
]);

export const packs = pgTable('packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  description: text('description'),
  longDescription: text('long_description'),
  ownerId: uuid('owner_id').notNull(),
  ownerType: ownerTypeEnum('owner_type').notNull().default('user'),

  pricingType: varchar('pricing_type', { length: 50 }).default('free'),
  tierRequired: subscriptionTierEnum('tier_required').default('free'),
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripeMonthlyPriceId: varchar('stripe_monthly_price_id', { length: 255 }),
  stripeAnnualPriceId: varchar('stripe_annual_price_id', { length: 255 }),

  status: packStatusEnum('status').notNull().default('draft'),
  reviewNotes: text('review_notes'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

  repositoryUrl: text('repository_url'),
  homepageUrl: text('homepage_url'),
  documentationUrl: text('documentation_url'),
  isFeatured: boolean('is_featured').default(false),
  thjBypass: boolean('thj_bypass').default(false),

  downloads: integer('downloads').default(0),
  ratingSum: integer('rating_sum').default(0),
  ratingCount: integer('rating_count').default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const packVersions = pgTable('pack_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  packId: uuid('pack_id').notNull().references(() => packs.id, { onDelete: 'cascade' }),
  version: varchar('version', { length: 50 }).notNull(),
  changelog: text('changelog'),
  manifest: jsonb('manifest').notNull(),
  minLoaVersion: varchar('min_loa_version', { length: 50 }),
  maxLoaVersion: varchar('max_loa_version', { length: 50 }),
  isLatest: boolean('is_latest').default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  totalSizeBytes: integer('total_size_bytes').notNull().default(0),
  fileCount: integer('file_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const packFiles = pgTable('pack_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  versionId: uuid('version_id').notNull().references(() => packVersions.id, { onDelete: 'cascade' }),
  path: varchar('path', { length: 500 }).notNull(),
  contentHash: varchar('content_hash', { length: 64 }).notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).default('text/plain'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

### C. References

- PRD v2: `loa-grimoire/prd-v2.md`
- SDD v1: `loa-grimoire/sdd.md`
- Security Audit: `SECURITY-AUDIT-REPORT.md`
- GTM Skills: `loa-grimoire/context/gtm-skills-import/`
- Registry Schema: `loa-grimoire/context/registry.json`

---

*Generated by Architecture Designer Agent*
*Based on PRD: loa-grimoire/prd-v2.md*

# SDD: Public/Private Network Separation

**Cycle**: cycle-038
**Created**: 2026-03-07
**Status**: Draft (Flatline SDD: 12 findings integrated)
**PRD**: `grimoires/loa/prd.md`
**Grounded in**: Session codebase research — exact function signatures, query patterns, and type definitions from all affected files.

---

## 1. Architecture Overview

This feature adds a **visibility dimension** to the existing construct/pack data model. The change is vertical — it touches every layer from DB schema through API service through frontend — but each layer's change is small and isolated.

```
construct.yaml (visibility: public|internal|unlisted)
       │
       ▼
┌─────────────────────────────────────────────────┐
│ Sync Layer (git-sync.ts / seed-forge-packs.ts)  │
│ Extract visibility from manifest → DB upsert    │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ DB Layer (schema.ts)                             │
│ packs.visibility enum column                     │
│ users.github_org_member cached boolean           │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ Auth Layer (auth.ts / oauth.ts / middleware)      │
│ org claim in JWT, requireOrgMember() middleware   │
│ Org recheck on refresh when stale                │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ Service Layer (packs.ts / constructs.ts)          │
│ getPackBySlug() visibility guard                 │
│ listConstructs() visibility WHERE clause         │
│ Cache key variation by auth context              │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ Explorer (auth-store.ts / pages / components)    │
│ isOrgMember state, filter toggle, badges         │
└─────────────────────────────────────────────────┘
```

---

## 2. Database Schema Changes

### 2.1 New Enum: `construct_visibility`

**File**: `apps/api/src/db/schema.ts`
**Location**: After `constructMaturityEnum` (line 96)

```typescript
export const constructVisibilityEnum = pgEnum('construct_visibility', [
  'public',
  'internal',
  'unlisted',
]);
```

### 2.2 New Enum: `pack_submission_source` (FINDING-003)

**File**: `apps/api/src/db/schema.ts`
**Location**: After `constructVisibilityEnum`

```typescript
export const packSubmissionSourceEnum = pgEnum('pack_submission_source', [
  'org_sync',     // Auto-synced from org namespace (construct-* repos)
  'external',     // Submitted by external developer via API/explorer
]);
```

This field is immutable after creation — it records HOW a pack entered the network. Used by FR-8 publish hardening: `external` packs require admin approval before `status` can move to `published`.

### 2.3 Packs Table: Add `visibility` + `submission_source` Columns

**File**: `apps/api/src/db/schema.ts`
**Location**: Inside `packs` table definition, after `thjBypass` (line 514)

```typescript
// Visibility control — who can discover and download this construct
// Source of truth: construct.yaml. Synced via git-sync/seed.
visibility: constructVisibilityEnum('visibility').default('internal'),

// How this pack entered the network — immutable after creation (FINDING-003)
// org_sync: auto-synced from 0xHoneyJar namespace
// external: submitted by external developer
submissionSource: packSubmissionSourceEnum('submission_source').default('org_sync'),
```

**Index**: Add to packs table indexes (after `forkedFromIdx`, line 556):

```typescript
visibilityIdx: index('idx_packs_visibility').on(table.visibility, table.status),
```

### 2.4 Users Table: Add Org Membership Columns

**File**: `apps/api/src/db/schema.ts`
**Location**: Inside `users` table definition, after `isAdmin` (line 133)

```typescript
// GitHub org membership (cached, rechecked on login + refresh if stale >24h)
githubUsername: varchar('github_username', { length: 100 }),
githubOrgMember: boolean('github_org_member').default(false),
githubOrgCheckedAt: timestamp('github_org_checked_at', { withTimezone: true }),
```

**Index**: Add to users table indexes:

```typescript
githubOrgIdx: index('idx_users_github_org').on(table.githubOrgMember),
```

### 2.5 Migration SQL

```sql
-- Idempotent migration
DO $$ BEGIN
  CREATE TYPE construct_visibility AS ENUM ('public', 'internal', 'unlisted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pack_submission_source AS ENUM ('org_sync', 'external');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE packs ADD COLUMN IF NOT EXISTS visibility construct_visibility DEFAULT 'internal';
ALTER TABLE packs ADD COLUMN IF NOT EXISTS submission_source pack_submission_source DEFAULT 'org_sync';
CREATE INDEX IF NOT EXISTS idx_packs_visibility ON packs (visibility, status);

ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_org_member BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_org_checked_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_github_org ON users (github_org_member);

-- GitHub user ID for stable org recheck (FINDING-010)
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_user_id BIGINT;

-- Canonical backfill (PRD §9)
UPDATE packs SET visibility = 'public'
WHERE slug IN ('observer', 'artisan', 'crucible', 'beacon', 'protocol',
               'herald', 'k-hole', 'the-easel', 'mibera-codex');
-- All other packs remain 'internal' (the default)

-- All existing packs are org-synced (FINDING-003)
UPDATE packs SET submission_source = 'org_sync' WHERE submission_source IS NULL;
```

---

## 3. Four-Layer Schema Sync

Visibility must be added to all four validation/type layers:

### 3.1 Layer 1: DB Enum (§2.1 above)

### 3.2 Layer 2: Zod Schema

**File**: `packages/shared/src/validation.ts`
**Location**: Inside `packManifestSchema` (after `icon`, ~line 500)

```typescript
visibility: z.enum(['public', 'internal', 'unlisted']).optional().default('internal'),
```

The schema uses `.passthrough()`, so unknown fields are already preserved. Adding this makes it validated and typed.

### 3.3 Layer 3: TypeScript Types

**File**: `packages/shared/src/types.ts`
**Location**: Inside `PackManifest` interface (~line 219)

```typescript
visibility?: 'public' | 'internal' | 'unlisted';
```

### 3.4 Layer 4: JSON Schema / AJV (git-sync) — FINDING-008

**File**: `.claude/schemas/construct.schema.json` (if exists) or inline AJV schema in `validateManifest()`

The `readManifest()` returns `Record<string, unknown>`. `validateManifest()` runs AJV against `.claude/schemas/construct.schema.json` if it exists, then enforces required fields.

**Change required**: Add `visibility` to the JSON Schema with enum validation to prevent invalid values from silently degrading to `internal`:

```json
{
  "visibility": {
    "type": "string",
    "enum": ["public", "internal", "unlisted"],
    "default": "internal",
    "description": "Who can discover and download this construct"
  }
}
```

If the JSON Schema file does not exist or is not used by all sync paths, add inline validation in `syncFromRepo()` (§5.1) — the `VALID_VISIBILITY` check already covers this. The AJV layer provides defense-in-depth for repos that bypass `syncFromRepo()`.

**Note**: Without this, a typo like `visibility: pubic` would silently degrade to `internal`. With enum validation, AJV rejects it and sync reports a manifest error.

---

## 4. Auth Layer Changes

### 4.1 JWT Claims: Add `org` Field

**File**: `apps/api/src/services/auth.ts`

Modify `AccessTokenPayload`:

```typescript
export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  type: 'access';
  org: boolean;  // NEW — GitHub org membership
}
```

Modify `generateTokens()` to accept and include `org`:

```typescript
export async function generateTokens(
  userId: string,
  email: string,
  org: boolean = false  // NEW parameter
): Promise<TokenPair> {
  const accessToken = await new SignJWT({ email, type: 'access', org })
    .setSubject(userId)
    .setIssuedAt()
    .setIssuer(issuer)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret);
  // ... refresh token unchanged (no org claim in refresh)
}
```

### 4.2 GitHub OAuth: Scope + Org Check

**File**: `apps/api/src/routes/oauth.ts`

**Scope change** (line ~65, GitHub authorize redirect):

```typescript
// Before:
const scope = 'user:email';
// After:
const scope = 'user:email read:org';
```

**Org membership check** — add after `findOrCreateOAuthUser()` in the GitHub callback handler:

```typescript
// After findOrCreateOAuthUser() returns user with id:
const orgMembership = await checkGitHubOrgMembership(accessToken, env.CONSTRUCTS_ORG);

// Update user record — store both username AND stable user ID (FINDING-010)
await db.update(users)
  .set({
    githubUsername: githubUser.login,
    githubUserId: githubUser.id,  // stable numeric ID, survives username changes
    githubOrgMember: orgMembership,
    githubOrgCheckedAt: new Date(),
  })
  .where(eq(users.id, user.id));

// Generate tokens WITH org claim
const tokens = await generateTokens(user.id, user.email, orgMembership);
```

**New helper function** (add to `oauth.ts` or a shared `services/github.ts`):

```typescript
async function checkGitHubOrgMembership(
  userAccessToken: string,
  org: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.github.com/user/memberships/orgs/${org}`,
      {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );
    if (res.status === 200) {
      const data = await res.json();
      return data.state === 'active';
    }
    return false; // 404 = not member, 403 = org blocks, any error = fail secure
  } catch {
    return false; // network error = fail secure
  }
}
```

**New env var**: `CONSTRUCTS_ORG` (default: `'0xHoneyJar'`). Add to `apps/api/src/config/env.ts`.

### 4.3 Canonical Org Membership Source (FINDING-009)

**The `githubOrgMember` column on `users` is the single canonical source** for org membership, regardless of which auth method the user logged in with. All token-minting paths read from this field:

| Auth Path | Org Behavior |
|-----------|-------------|
| GitHub OAuth login | Check via user's token, update `githubOrgMember`, mint `org: true/false` |
| Google OAuth login | Read existing `githubOrgMember` from DB, mint `org: value` |
| Password login | Read existing `githubOrgMember` from DB, mint `org: value` |
| Token refresh | Recheck if stale (§4.4), mint `org: value` |

**Implication**: A user who first logs in via Google gets `org: false`. If they later link GitHub (via GitHub OAuth login), their `githubOrgMember` is updated. Subsequent Google/password logins read the updated value. There is no per-provider gating — the user record is the source of truth.

**File changes**:
- `apps/api/src/routes/auth.ts` — `POST /v1/auth/login` (password): add `org: user.githubOrgMember ?? false` to `generateTokens()` call
- `apps/api/src/routes/oauth.ts` — Google callback: add `org: user.githubOrgMember ?? false` to `generateTokens()` call

### 4.4 Token Refresh: Org Recheck (FINDING-010)

**File**: `apps/api/src/routes/auth.ts`
**Location**: `POST /v1/auth/refresh` handler

After verifying the refresh token and fetching the user, add org recheck:

```typescript
// After: const user = await db.select(...).from(users).where(eq(users.id, payload.sub))
let orgMember = user.githubOrgMember ?? false;

// Recheck if stale (>24h) — uses stable GitHub user ID, NOT mutable username
if (user.githubUserId && user.githubOrgCheckedAt) {
  const staleMs = Date.now() - new Date(user.githubOrgCheckedAt).getTime();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  if (staleMs > TWENTY_FOUR_HOURS) {
    orgMember = await checkGitHubOrgMembershipById(
      user.githubUserId,
      env.CONSTRUCTS_ORG
    );
    await db.update(users)
      .set({ githubOrgMember: orgMember, githubOrgCheckedAt: new Date() })
      .where(eq(users.id, user.id));
  }
}

const tokens = await generateTokens(user.id, user.email, orgMember);
```

**Failure policy (single, consistent across all paths)**: On any GitHub API error, **preserve the existing `githubOrgMember` value** and log a warning. Do NOT flip to `false` on transient errors. This is fail-stale, not fail-open or fail-secure — the 24h TTL bounds the staleness window.

**Server-side org check helper** — uses GitHub user ID (stable) not username (mutable):

```typescript
async function checkGitHubOrgMembershipById(
  githubUserId: number,
  org: string
): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_SYNC_TOKEN;
  if (!token) return false; // no server token = can't check = preserve existing

  // First resolve user ID to current username via /user/:id
  // Then check org membership via /orgs/:org/members/:username
  // Required PAT scope: read:org
  try {
    const userRes = await fetch(`https://api.github.com/user/${githubUserId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (userRes.status !== 200) return false;
    const userData = await userRes.json();
    const currentUsername = userData.login;

    const memberRes = await fetch(
      `https://api.github.com/orgs/${org}/members/${currentUsername}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );
    return memberRes.status === 204; // 204 = member, 404 = not
  } catch {
    return false; // network error = preserve existing value at call site
  }
}
```

**Required PAT permissions**: `read:org` on the GITHUB_TOKEN / GITHUB_SYNC_TOKEN. This is the same token used for git-sync and already has repo access.

### 4.4 Auth Middleware: `requireOrgMember()` + Updated `optionalAuth()`

**File**: `apps/api/src/middleware/auth.ts`

**Update `AuthUser` interface:**

```typescript
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  role?: 'user' | 'admin' | 'super_admin';
  isOrgMember: boolean;  // NEW
}
```

**Update `getUserById()`**: Fetch `githubOrgMember` from DB, include in returned `AuthUser`.

**Update JWT verification in `requireAuth()` and `optionalAuth()`**: After verifying the access token, set `isOrgMember` from the `org` claim:

```typescript
// In requireAuth(), after verifyAccessToken():
const user = await getUserById(payload.sub);
user.isOrgMember = payload.org ?? false;
c.set('user', user);
c.set('isOrgMember', payload.org ?? false);  // convenience accessor
```

**New middleware — `requireOrgMember()`:**

```typescript
export function requireOrgMember(): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) {
      throw Errors.Unauthorized('Authentication required');
    }
    if (!user.isOrgMember) {
      throw Errors.Forbidden('Organization membership required');
    }
    await next();
  };
}
```

**Update `GET /v1/auth/me`** (`routes/auth.ts`):

```typescript
// Add to response object:
is_org_member: user.isOrgMember,
```

---

## 5. Sync Layer Changes

### 5.1 git-sync.ts: Extract Visibility from Manifest

**File**: `apps/api/src/services/git-sync.ts`

Update `SyncResult` interface:

```typescript
export interface SyncResult {
  version: string;
  commit: string;
  manifest: Record<string, unknown>;
  files: CollectedFile[];
  identity: IdentityData | null;
  totalSizeBytes: number;
  visibility: 'public' | 'internal' | 'unlisted';  // NEW
}
```

In `syncFromRepo()`, after `readManifest()`:

```typescript
const VALID_VISIBILITY = ['public', 'internal', 'unlisted'] as const;
const rawVisibility = manifest.visibility as string | undefined;
const visibility = rawVisibility && VALID_VISIBILITY.includes(rawVisibility as any)
  ? (rawVisibility as typeof VALID_VISIBILITY[number])
  : 'internal'; // default: safe
```

Include in returned `SyncResult`.

### 5.2 Webhook Sync Handler: Write Visibility to DB

**File**: `apps/api/src/routes/webhooks.ts`
**Location**: Inside the sync transaction (~line 560)

Add `visibility` to the `packs` update:

```typescript
// In the transaction, after updating packs:
await tx.update(packs).set({
  // ... existing fields (construct_type, skill_prose, last_sync_commit, etc.)
  visibility: syncResult.visibility,  // NEW
}).where(eq(packs.id, pack.id));
```

### 5.3 Manual Sync Handler: Same

**File**: `apps/api/src/routes/packs.ts`
**Location**: `POST /:slug/sync` handler

Same pattern — add `visibility: syncResult.visibility` to the packs update within the transaction.

### 5.4 Seed Script: Read + Write Visibility

**File**: `scripts/seed-forge-packs.ts`

After manifest parsing:

```typescript
const VALID_VISIBILITY = ['public', 'internal', 'unlisted'] as const;
const visibility = VALID_VISIBILITY.includes(manifest.visibility as any)
  ? (manifest.visibility as string)
  : 'internal';
```

Add to the packs upsert INSERT and ON CONFLICT UPDATE:

```typescript
// In INSERT VALUES:
visibility,
// In ON CONFLICT DO UPDATE SET:
visibility: sql`EXCLUDED.visibility`,
```

---

## 6. Service Layer: Visibility Guards

### 6.1 `getPackBySlug()` — Central Visibility + Status Guard

**File**: `apps/api/src/services/packs.ts`

This is the **single point of enforcement** for all pack read paths (FR-4). It checks **both** visibility AND publication status (FINDING-002).

```typescript
export interface PackAccessContext {
  userId?: string;       // authenticated user ID, if any
  isOrgMember: boolean;  // from JWT org claim
  isAdmin: boolean;      // from user role
}

export async function getPackBySlug(
  slug: string,
  access?: PackAccessContext
): Promise<Pack | null> {
  const normalizedSlug = slug.toLowerCase();
  const pack = await db.select().from(packs)
    .where(eq(packs.slug, normalizedSlug))
    .limit(1)
    .then(rows => rows[0] ?? null);

  if (!pack) return null;

  // Status enforcement (FINDING-002)
  // Draft/pending_review packs are only visible to owners and admins
  if (pack.status !== 'published') {
    if (!access) return null;
    if (!access.isAdmin && !(await isPackOwnerAsync(pack, access.userId))) return null;
    // Owner/admin can see draft packs — fall through to visibility check
  }

  // Visibility enforcement
  if (!canAccessPack(pack, access)) return null;

  return pack;
}

export function canAccessPack(
  pack: { visibility: string | null; ownerId: string; ownerType: string },
  access?: PackAccessContext
): boolean {
  const visibility = pack.visibility ?? 'internal';

  // Public: anyone
  if (visibility === 'public') return true;

  // Unlisted: anyone with the slug (accessible but not listed)
  if (visibility === 'unlisted') return true;

  // Internal: requires org membership, ownership, or admin
  if (visibility === 'internal') {
    if (!access) return false;
    if (access.isAdmin) return true;
    if (access.isOrgMember) return true;
    // Team-aware ownership check (FINDING-006)
    // Synchronous fast path: direct user ownership
    if (access.userId && pack.ownerType === 'user' && pack.ownerId === access.userId) return true;
    // Note: team ownership requires async check — handled in getPackBySlug() caller
    // or via isPackOwnerAsync() for detail endpoints
    return false;
  }

  return false;
}

// Async ownership check that handles both user and team ownership (FINDING-006)
async function isPackOwnerAsync(
  pack: { ownerId: string; ownerType: string },
  userId?: string
): Promise<boolean> {
  if (!userId) return false;
  if (pack.ownerType === 'user') return pack.ownerId === userId;
  if (pack.ownerType === 'team') {
    const membership = await db.select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, pack.ownerId), eq(teamMembers.userId, userId)))
      .limit(1)
      .then(rows => rows[0]);
    return membership?.role === 'owner' || membership?.role === 'admin';
  }
  return false;
}

// Helper to build access context from Hono context
export function getAccessContext(c: Context): PackAccessContext {
  const user = c.get('user') as AuthUser | undefined;
  return {
    userId: user?.id,
    isOrgMember: c.get('isOrgMember') ?? false,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
  };
}
```

### 6.1.1 Publish Gate Hardening (FINDING-003)

External submissions (`submission_source = 'external'`) have additional restrictions:

```typescript
// In version upload / status change endpoints:
if (pack.submissionSource === 'external' && pack.status === 'pending_review') {
  // Only admins can change status from pending_review → published
  if (!access?.isAdmin) {
    return c.json({ error: 'ADMIN_APPROVAL_REQUIRED' }, 403);
  }
}
```

All version/status endpoints check `submission_source` before allowing publish transitions. The `submission_source` field is set once at pack creation and never changed.

### 6.2 `isPackOwner()` — Fix for Team Ownership (NFR-5)

**File**: `apps/api/src/services/packs.ts`

Current `isPackOwner()` returns `false` for team-owned packs. Fix:

```typescript
export async function isPackOwner(packId: string, userId: string): Promise<boolean> {
  const pack = await db.select({ ownerId: packs.ownerId, ownerType: packs.ownerType })
    .from(packs)
    .where(eq(packs.id, packId))
    .limit(1)
    .then(rows => rows[0]);

  if (!pack) return false;

  if (pack.ownerType === 'user') {
    return pack.ownerId === userId;
  }

  if (pack.ownerType === 'team') {
    const membership = await db.select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, pack.ownerId),
        eq(teamMembers.userId, userId)
      ))
      .limit(1)
      .then(rows => rows[0]);

    return membership?.role === 'owner' || membership?.role === 'admin';
  }

  return false;
}
```

### 6.3 `listConstructs()` — Visibility Filtering (FINDING-007)

**File**: `apps/api/src/services/constructs.ts`

Update `ListConstructsOptions`:

```typescript
export interface ListConstructsOptions {
  // ... existing fields
  visibility?: 'public' | 'internal' | 'all';  // NEW — explicit filter
  accessContext?: PackAccessContext;             // NEW — auth context
}
```

**Filter semantics** (explicit per mode):

| `?visibility=` | Auth Required | Returns |
|----------------|--------------|---------|
| (omitted) | No | Auto: public for anon, public+internal for org, all for admin |
| `public` | No | Public only |
| `internal` | Org or admin | Internal only (403 for non-org) |
| `all` | Org or admin | Public + internal + unlisted (403 for non-org) |

**Note**: `unlisted` is never returned in list responses regardless of filter — unlisted constructs are accessible by slug only, not discoverable in listings. This is the semantic difference between `internal` and `unlisted`.

**In `fetchPacksAsConstructs()`** (~line 880), add visibility WHERE clause:

```typescript
const visibilityConditions = getVisibilityConditions(
  options.visibility,
  options.accessContext
);

const conditions = [
  eq(packs.status, 'published'),
  ...visibilityConditions,  // NEW
  // ... existing archetype, maturity, tier, featured, query filters
];
```

**Helper function:**

```typescript
function getVisibilityConditions(
  filter: 'public' | 'internal' | 'all' | undefined,
  access?: PackAccessContext
): SQL[] {
  // Explicit filter takes precedence
  if (filter === 'internal') {
    // Must be org or admin to request internal-only
    if (!access?.isOrgMember && !access?.isAdmin) {
      throw Errors.Forbidden('Organization membership required to filter by internal');
    }
    return [eq(packs.visibility, 'internal')];
  }
  if (filter === 'all') {
    if (!access?.isOrgMember && !access?.isAdmin) {
      throw Errors.Forbidden('Organization membership required to view all');
    }
    // Return public + internal (NOT unlisted — unlisted is slug-access only)
    return [inArray(packs.visibility, ['public', 'internal'])];
  }
  if (filter === 'public') {
    return [eq(packs.visibility, 'public')];
  }

  // Auto mode (no explicit filter)
  if (!access) {
    return [eq(packs.visibility, 'public')];
  }
  if (access.isAdmin) {
    // Admin sees public + internal (NOT unlisted in listings)
    return [inArray(packs.visibility, ['public', 'internal'])];
  }
  if (access.isOrgMember) {
    return [inArray(packs.visibility, ['public', 'internal'])];
  }
  return [eq(packs.visibility, 'public')];
}
```

### 6.4 Cache Key Strategy (FINDING-004, FINDING-005)

**File**: `apps/api/src/services/redis.ts`

Vary cache keys by **visibility tier** (not individual user):

```typescript
type CacheVisibilityTier = 'public' | 'org' | 'admin';

export function getCacheVisibilityTier(access?: PackAccessContext): CacheVisibilityTier {
  if (!access) return 'public';
  if (access.isAdmin) return 'admin';
  if (access.isOrgMember) return 'org';
  return 'public';
}

// Updated CACHE_KEYS:
export const CACHE_KEYS = {
  // ... existing unchanged keys ...
  constructList:    (params: string, tier: CacheVisibilityTier) =>
                      `constructs:list:${tier}:${params}`,
  constructDetail:  (slug: string, tier: CacheVisibilityTier) =>
                      `constructs:detail:${tier}:${slug}`,
  constructSummary: (tier: CacheVisibilityTier) =>
                      `constructs:summary:${tier}`,
  constructExists:  (slug: string, tier: CacheVisibilityTier) =>
                      `constructs:exists:${tier}:${slug}`,
} as const;
```

**Owner cache bypass (FINDING-004)**: When an authenticated user requests their own pack, **skip the shared cache entirely** and query DB directly. This avoids the problem where a non-org owner shares the `public` cache bucket with anonymous users and gets cached 404s for their own internal constructs.

```typescript
// In getConstructBySlug() / getPackBySlug():
const isOwnerRequest = access?.userId && (
  pack.ownerType === 'user' && pack.ownerId === access.userId
);
// If owner, bypass cache — query DB directly
// If not owner, use tier-based cache
```

**Cache invalidation matrix (FINDING-005)**:

| Event | Keys Invalidated |
|-------|-----------------|
| Webhook sync (visibility change) | detail(slug,*), exists(slug,*), summary(*), **list(*,*)** |
| Manual sync | Same as webhook sync |
| Admin status change | detail(slug,*), exists(slug,*), summary(*), list(*,*) |
| Fork created | detail(parent_slug,*) — fork count changes |
| Pack deleted | detail(slug,*), exists(slug,*), summary(*), list(*,*) |

```typescript
export async function invalidateConstructCaches(slug: string): Promise<void> {
  if (!isRedisConfigured()) return;
  const redis = getRedis();
  const tiers: CacheVisibilityTier[] = ['public', 'org', 'admin'];

  // Delete known keys
  await Promise.all([
    ...tiers.map(t => redis.del(CACHE_KEYS.constructDetail(slug, t))),
    ...tiers.map(t => redis.del(CACHE_KEYS.constructExists(slug, t))),
    ...tiers.map(t => redis.del(CACHE_KEYS.constructSummary(t))),
  ]);

  // Pattern-delete list keys (FINDING-005)
  // List keys include pagination/filter params, so we must scan
  for (const tier of tiers) {
    const pattern = `constructs:list:${tier}:*`;
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== '0');
  }
}

// Invalidate fork parent caches when a fork is created/deleted
export async function invalidateForkParentCaches(parentSlug: string): Promise<void> {
  if (!isRedisConfigured()) return;
  const redis = getRedis();
  const tiers: CacheVisibilityTier[] = ['public', 'org', 'admin'];
  await Promise.all(
    tiers.map(t => redis.del(CACHE_KEYS.constructDetail(parentSlug, t)))
  );
}
```

**Timing**: Cache invalidation runs **after** the write transaction commits, not inside it. This prevents stale reads from racing the transaction.

### 6.5 Fork Provenance Redaction (FINDING-006)

**File**: `apps/api/src/services/constructs.ts`

In `packToConstruct()`, when populating `forkedFrom`:

```typescript
// When building the forkedFrom field:
let forkedFrom: { slug: string; name: string } | null = null;
if (pack.forkedFrom && forkedFromRow) {
  // Only expose provenance if the source is visible to the viewer
  if (canAccessPack(forkedFromRow, accessContext)) {
    forkedFrom = { slug: forkedFromRow.slug, name: forkedFromRow.name };
  }
  // Otherwise: forkedFrom stays null (redacted)
}
```

**File**: `apps/api/src/routes/packs.ts`

In the fork endpoint (`POST /fork`):
```typescript
// Before creating fork, verify source is accessible
const source = await getPackBySlug(body.source_slug, getAccessContext(c));
if (!source) return c.json({ error: 'PACK_NOT_FOUND' }, 404);
```

---

## 7. Route Layer Changes

### 7.1 Constructs Routes

**File**: `apps/api/src/routes/constructs.ts`

| Route | Change |
|-------|--------|
| `GET /` | Pass `getAccessContext(c)` to `listConstructs()` |
| `GET /:slug` | Pass `getAccessContext(c)` to `getConstructBySlug()` |
| `HEAD /:slug` | Pass `getAccessContext(c)` to `constructExists()` |
| `GET /summary` | Change from no auth to `optionalAuth()`, pass context |

### 7.2 Packs Routes (FINDING-001 — complete inventory)

**File**: `apps/api/src/routes/packs.ts`

**Every** endpoint that resolves a pack by slug must pass `PackAccessContext`. This is the **exhaustive** list — any new pack-resolving route MUST include `getAccessContext(c)` or it bypasses visibility.

| Endpoint | Current Auth | Change |
|----------|-------------|--------|
| `GET /:slug/versions` | `optionalAuth` | Pass `getAccessContext(c)` |
| `GET /:slug/download` | `optionalAuth` | Pass context; reject if null |
| `GET /:slug/hash` | `optionalAuth` | Pass context |
| `GET /:slug/reviews` | none | Change to `optionalAuth`, pass context |
| `POST /fork` | `requireAuth` | Check source visibility before forking |
| `GET /:slug/permissions` | `requireAuth` | Pass context |
| `GET /:slug/verification` | `optionalAuth` | Pass `getAccessContext(c)` |
| `GET /:slug/ground-truth` | `optionalAuth` | Pass `getAccessContext(c)` |
| `GET /:slug/signals` | `optionalAuth` | Pass `getAccessContext(c)` |
| `GET /:slug/showcases` | `optionalAuth` | Pass `getAccessContext(c)` |
| `GET /:slug/accuracy` | `optionalAuth` | Pass `getAccessContext(c)` |
| `POST /:slug/sync` | `requireAuth` | Pass context (owner/admin only) |

**Regression guard**: Add a test that inventories all `:slug`-parameterized routes in `packs.ts` and asserts each passes `PackAccessContext`. New routes without context fail the test.

---

## 8. Explorer Changes (FINDING-012)

### 8.1 Construct DTO Contract

The API response DTO must include `visibility` for the explorer to render badges and filters. Add to the construct response type:

```typescript
// In packToConstruct() return shape:
interface ConstructDTO {
  // ... existing fields
  visibility: 'public' | 'internal' | 'unlisted';  // NEW
}
```

**Naming convention**: API responses use `snake_case` (`is_org_member`), explorer TypeScript uses `camelCase` (`isOrgMember`). The mapping happens in the auth store's fetch handler. This is consistent with existing API conventions.

### 8.2 Auth Store: `isOrgMember`

**File**: `apps/explorer/lib/stores/auth-store.ts`

```typescript
interface AuthState {
  // ... existing
  isOrgMember: boolean;  // NEW — populated from /auth/me response.is_org_member
}
```

### 8.3 Visibility Badge Component

```tsx
{construct.visibility === 'internal' && (
  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
    INTERNAL
  </span>
)}
```

### 8.4 Filter Toggle (org members only)

Three states: "Public" | "Internal" | "All" (default: "All" for org members).

### 8.5 Data Fetching Strategy

| Page Type | Strategy | Auth | Visibility |
|-----------|----------|------|------------|
| Home/listing (SSR/ISR) | Server fetch, no auth | None | Public only (SEO-correct) |
| Detail page (SSR) | Server fetch, no auth | None | Public + unlisted only |
| Detail page (client hydration) | Client fetch with auth header | JWT | Full visibility check |
| Client-side navigation | Client fetch with auth header | JWT | Full visibility check |

**SSR detail page gap**: When an org member hard-refreshes an internal construct page, the SSR fetch has no auth and returns 404. Fix: the detail page component renders a loading state on SSR miss, then client-side fetches with auth. If the client fetch also 404s, render the actual 404 page. This provides a brief loading flash for internal constructs on hard refresh but avoids leaking existence to non-org users.

```tsx
// apps/explorer/app/(site)/constructs/[slug]/page.tsx
export default async function ConstructPage({ params }) {
  // SSR: try public fetch
  const construct = await fetchConstruct(params.slug); // no auth
  if (construct) return <ConstructDetail data={construct} />;

  // SSR miss: render client-side auth-aware loader
  return <AuthAwareConstructLoader slug={params.slug} />;
}
```

The `AuthAwareConstructLoader` client component fetches with the auth token. If it gets a 404, it renders `notFound()`. If it gets data, it renders `ConstructDetail`.

---

## 9. Error Handling

| Scenario | Status | Body | Rationale |
|----------|--------|------|-----------|
| Internal construct, no auth | 404 | `CONSTRUCT_NOT_FOUND` | Prevent existence leak |
| Internal construct, no org | 404 | `CONSTRUCT_NOT_FOUND` | Prevent existence leak |
| Draft/pending pack, no ownership | 404 | `CONSTRUCT_NOT_FOUND` | Prevent existence leak (FINDING-002) |
| External pack, pending_review, non-admin publish | 403 | `ADMIN_APPROVAL_REQUIRED` | FR-8 gate (FINDING-003) |
| Org-only endpoint, no org | 403 | `ORG_MEMBERSHIP_REQUIRED` | Clear error |
| `?visibility=internal` without org | 403 | `ORG_MEMBERSHIP_REQUIRED` | FINDING-007 |
| GitHub API failure (any path) | Preserve existing `githubOrgMember` | Log warning | **Fail-stale** (FINDING-010) |

**Failure policy — SINGLE RULE (FINDING-010)**: On any GitHub API error (network, 5xx, rate limit), **preserve the existing `githubOrgMember` value** in the DB. Do NOT flip to `false`. The 24h recheck TTL bounds the maximum staleness. This applies uniformly to OAuth login, Google login, password login, and token refresh. Log a structured warning with `{ event: 'github_org_check_failed', userId, error }`.

---

## 10. Testing Strategy

### Unit Tests (9 core combinations)

| Visibility | Auth State | Expected |
|-----------|------------|----------|
| `public` | No auth | Visible |
| `public` | Auth, no org | Visible |
| `public` | Auth + org | Visible |
| `internal` | No auth | Hidden (404) |
| `internal` | Auth, no org | Hidden (404) |
| `internal` | Auth + org | Visible |
| `unlisted` | No auth | Visible by slug, not listed |
| `unlisted` | Auth, no org | Visible by slug, not listed |
| `unlisted` | Auth + org | Visible by slug, not listed |

### Additional Unit Tests (FINDING-002, FINDING-003)

| Status | Submission Source | Auth | Expected |
|--------|-----------------|------|----------|
| `draft` | `org_sync` | Owner | Visible |
| `draft` | `org_sync` | Non-owner org | Hidden (404) |
| `pending_review` | `external` | Owner | Visible (read-only) |
| `pending_review` | `external` | Admin | Visible + can approve |
| `pending_review` | `external` | Non-owner | Hidden (404) |
| `published` | `external` | Anyone | Visible (per visibility rules) |

### Integration Tests

- List constructs without auth → only public returned
- List constructs with org JWT → public + internal
- List with `?visibility=internal` without org → 403
- Download internal pack without org → 404
- Fork internal construct without org → 404
- Fork provenance redacted when source is internal
- OAuth callback → org check → JWT `org` claim correct
- Google OAuth login → reads existing `githubOrgMember` → correct `org` claim
- Password login → reads existing `githubOrgMember` → correct `org` claim
- Token refresh with stale org → recheck via GitHub user ID → correct claim
- Token refresh with GitHub API failure → preserves existing org value
- Sync with visibility change → all cache tiers + list keys invalidated
- External submission → `submission_source: 'external'`, `status: 'pending_review'`
- External pack publish attempt by non-admin → 403
- **Route regression test**: all `:slug` routes in packs.ts pass `PackAccessContext`
- Owner views own internal construct (non-org) → visible, bypasses shared cache

---

## 11. Rollout: Near-Zero-Downtime Deployment (FINDING-011)

**Key constraint**: The sync layer must NOT overwrite backfilled visibility values with `internal` when manifests don't yet have a `visibility` field. The sync code's default-to-`internal` behavior would revert the migration backfill.

1. **Deploy migration** — add columns with defaults. Run backfill SQL. No query changes yet.
2. **Deploy sync layer with preservation guard** — sync writes `visibility` to DB, BUT:
   ```typescript
   // Preserve existing visibility when manifest omits field (FINDING-011)
   const visibility = syncResult.visibility;
   const shouldUpdateVisibility = rawVisibility !== undefined;
   // Only write visibility if manifest explicitly declares it
   ```
   This prevents the sync from defaulting to `internal` and overwriting the backfill.
3. **Push construct.yaml PRs** — add `visibility: public` to the 9 public repos, `visibility: internal` to the 4 internal repos. After webhook sync, all packs have explicit manifest-declared visibility.
4. **Remove preservation guard** — now all manifests have explicit visibility, so the guard is no longer needed. Deploy sync layer that always writes manifest visibility.
5. **Deploy auth** — OAuth scope, org check, JWT claim, middleware.
   - **Session migration**: Old tokens without `org` claim default to `org: false`. Org members must re-login or wait for token refresh (15-min window) to get `org: true`. This is acceptable — internal constructs are only hidden for at most one refresh cycle.
6. **Deploy service layer** — visibility guards, cache key changes. Internal constructs become invisible to non-org users.
7. **Deploy explorer** — badges, filters, auth store.

---

## 12. File Change Inventory

| File | Change | Lines (est.) |
|------|--------|-------------|
| `apps/api/src/db/schema.ts` | Edit | +18 (visibility enum, submission_source enum, github_user_id) |
| `apps/api/src/services/auth.ts` | Edit | +8 |
| `apps/api/src/routes/oauth.ts` | Edit | +40 (scope, org check, github_user_id storage) |
| `apps/api/src/routes/auth.ts` | Edit | +35 (refresh recheck via user ID, password login org claim) |
| `apps/api/src/middleware/auth.ts` | Edit | +20 |
| `apps/api/src/services/packs.ts` | Edit | +80 (visibility+status guard, isPackOwnerAsync, publish gate) |
| `apps/api/src/services/constructs.ts` | Edit | +55 (filter semantics, DTO visibility field) |
| `apps/api/src/services/redis.ts` | Edit | +45 (owner bypass, list invalidation, fork parent invalidation) |
| `apps/api/src/services/git-sync.ts` | Edit | +15 (visibility extraction, preservation guard) |
| `apps/api/src/routes/constructs.ts` | Edit | +15 |
| `apps/api/src/routes/packs.ts` | Edit | +40 (all slug routes: verification, ground-truth, signals, etc.) |
| `apps/api/src/routes/webhooks.ts` | Edit | +8 (visibility + submission_source) |
| `apps/api/src/config/env.ts` | Edit | +3 |
| `.claude/schemas/construct.schema.json` | Edit | +8 (visibility enum in JSON Schema) |
| `packages/shared/src/validation.ts` | Edit | +2 |
| `packages/shared/src/types.ts` | Edit | +2 |
| `scripts/seed-forge-packs.ts` | Edit | +12 |
| `apps/explorer/lib/stores/auth-store.ts` | Edit | +5 |
| `apps/explorer/lib/data/fetch-constructs.ts` | Edit | +15 |
| `apps/explorer/components/*` | Edit | +20 |
| `apps/explorer/app/(site)/constructs/[slug]/page.tsx` | Edit | +25 (auth-aware SSR loader) |
| `apps/explorer/app/(site)/page.tsx` | Edit | +15 |
| Migration SQL file | New | +25 |
| Route regression test | New | +30 |
| **Total** | | ~~551 lines |

---

## 13. Flatline SDD Review Log

**Reviewer**: Codex MCP (GPT-5.2)
**Verdict**: NEEDS_REVISION → all 12 findings integrated

| Finding | Severity | Title | Resolution |
|---------|----------|-------|------------|
| F-001 | BLOCKER | Side-channel route bypasses | §7.2: Complete route inventory + regression test |
| F-002 | BLOCKER | Central guard ignores status | §6.1: `getPackBySlug()` now checks `status` + visibility |
| F-003 | BLOCKER | No external submission provenance | §2.2: `submission_source` enum + publish gate in §6.1.1 |
| F-004 | HIGH | Cache miss for owner exceptions | §6.4: Owner requests bypass shared cache |
| F-005 | HIGH | Incomplete cache invalidation | §6.4: Full invalidation matrix + list key scanning |
| F-006 | HIGH | Team ownership not in canAccessPack | §6.1: `isPackOwnerAsync()` for team-aware checks |
| F-007 | HIGH | List filtering underspecified | §6.3: Explicit per-mode filter semantics table |
| F-008 | HIGH | Four-layer sync is really three | §3.4: Add visibility to JSON Schema |
| F-009 | HIGH | Org status not across all auth paths | §4.3: Canonical source on user record, all paths read it |
| F-010 | HIGH | Refresh recheck: mutable usernames | §4.4: Use `github_user_id` (stable), single fail-stale policy |
| F-011 | HIGH | Rollout gap between sync and manifest | §11: Preservation guard + reordered phases |
| F-012 | HIGH | Explorer DTO/SSR gaps | §8: DTO contract, naming convention, auth-aware SSR loader |

---

> **Sources**: PRD `grimoires/loa/prd.md`, session codebase research (exact function signatures, query patterns, and type definitions from all affected files), Codex Flatline PRD review findings, Codex Flatline SDD review findings

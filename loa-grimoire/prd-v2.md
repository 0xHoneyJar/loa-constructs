# Product Requirements Document: Loa Skills Registry v2

**Version:** 2.0
**Date:** 2025-12-31
**Author:** PRD Architect Agent
**Status:** Draft
**Builds On:** prd.md (v1.0)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [V1 Assessment](#v1-assessment)
3. [V2 Goals](#v2-goals)
4. [GTM Collective Migration](#gtm-collective-migration)
5. [Security Hardening](#security-hardening)
6. [Deferred Features](#deferred-features)
7. [Functional Requirements](#functional-requirements)
8. [Non-Functional Requirements](#non-functional-requirements)
9. [User Stories](#user-stories)
10. [Success Criteria](#success-criteria)
11. [Scope & Prioritization](#scope--prioritization)
12. [Risks & Dependencies](#risks--dependencies)

---

## 1. Executive Summary

Loa Skills Registry v2 focuses on three key objectives:

1. **Production Hardening** - Address security audit findings from v1 (L1-L5)
2. **GTM Collective Migration** - Import 8 premium GTM skills as the first paid skill pack
3. **Skill Pack Architecture** - Enable third-party skill pack distribution

V1 delivered a complete SaaS foundation with authentication, subscription management, team collaboration, and a CLI. V2 transforms this into a functioning marketplace with actual premium content.

### Key Deliverables

| Category | Deliverable | Priority |
|----------|-------------|----------|
| Security | Refresh token blacklisting | P0 |
| Security | Production JWT secret enforcement | P0 |
| Security | Email service production validation | P1 |
| Content | GTM Collective skill pack (8 skills) | P0 |
| Content | GTM Collective commands (14 commands) | P0 |
| Platform | Skill pack upload/distribution API | P0 |
| Platform | Pack versioning and updates | P1 |
| Admin | Admin dashboard (deferred from v1) | P2 |
| Performance | Performance optimization (deferred from v1) | P2 |

---

## 2. V1 Assessment

### What V1 Delivered

**API (Complete)**
- JWT + API key authentication
- OAuth (GitHub, Google) with CSRF protection (fixed)
- Subscription management via Stripe
- Team management with roles
- Skills CRUD with versioning
- License generation and validation
- Rate limiting (tier-based)
- Health monitoring endpoints
- OpenAPI documentation

**Web Dashboard (Complete)**
- Auth flows (login, register, password reset, email verification)
- Skill browser and detail pages
- Team management UI
- Billing/subscription management
- Creator dashboard

**CLI (Complete)**
- Authentication (login/logout)
- Skill search, install, update, uninstall
- License validation
- Credential storage

### V1 Gaps Identified

**Security (from audit)**
1. L1: Refresh token not invalidated on logout
2. L2: JWT secret has development fallback
3. L3: Email service silently succeeds when unconfigured
4. L4: Path traversal validation inconsistent
5. L5: Rate limiter fails open on Redis errors

**Deferred Features**
1. T11.1: SSO/SAML authentication
2. T11.3: Admin panel
3. T12.2: Performance optimization
4. T12.4: Marketing/landing page

**Missing for Marketplace**
1. No skill pack upload mechanism
2. No pack versioning/update flow
3. No actual premium content (GTM Collective)

---

## 3. V2 Goals

### Primary Goals

1. **Ship GTM Collective** - First premium content, validates entire business model
2. **Fix Security Issues** - Address all audit findings before public launch
3. **Enable Pack Distribution** - Allow skill packs to be uploaded, versioned, and distributed

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| GTM Collective installs | 10 in first month | CLI tracking |
| Security findings resolved | 5/5 (L1-L5) | Re-audit |
| Pack upload success rate | >95% | API metrics |
| CLI install success rate | >99% | Error tracking |

---

## 4. GTM Collective Migration

### Overview

The GTM Collective is a premium skill pack for go-to-market strategy, containing 8 specialized AI agents and 14 commands. It currently exists in `loa-grimoire/context/gtm-skills-import/` and needs to be migrated into the registry's distribution system.

### GTM Skills (8)

| Skill ID | Name | Purpose |
|----------|------|---------|
| `analyzing-market` | Analyzing Market | TAM/SAM/SOM analysis, competitive landscape, ICP development |
| `positioning-product` | Positioning Product | Messaging framework, differentiation, value proposition |
| `pricing-strategist` | Pricing Strategist | Pricing models, tier structure, competitive pricing |
| `building-partnerships` | Building Partnerships | Ecosystem mapping, partner tiers, co-marketing |
| `educating-developers` | Educating Developers | DevRel strategy, community building, developer experience |
| `crafting-narratives` | Crafting Narratives | Launch planning, content calendar, campaign creation |
| `reviewing-gtm` | Reviewing GTM | Strategy validation, grounding checks, consistency audit |
| `translating-for-stakeholders` | Translating for Stakeholders | Pitch decks, board updates, investor materials |

### GTM Commands (14)

**Workflow Commands (5)**
- `gtm-setup` - Initialize GTM workflow
- `gtm-adopt` - Adopt technical reality from SDD
- `gtm-feature-requests` - Feature requests for dev
- `sync-from-gtm` - Sync from GTM to dev
- `review-gtm` - Review GTM strategy

**Routing Commands (9)**
- `analyze-market` - Route to analyzing-market skill
- `position` - Route to positioning-product skill
- `price` - Route to pricing-strategist skill
- `plan-partnerships` - Route to building-partnerships skill
- `plan-devrel` - Route to educating-developers skill
- `plan-launch` - Route to crafting-narratives skill
- `create-deck` - Route to translating-for-stakeholders skill
- `sync-from-dev` - Sync from dev to GTM
- `announce-release` - Route to crafting-narratives skill

### GTM Pricing

From `registry.json`:
- **Monthly**: $49/month (`price_gtm_monthly`)
- **Annual**: $490/year (`price_gtm_annual`) - 2 months free
- **THJ Bypass**: Enabled (internal team access)

### Migration Requirements

1. **Pack Structure**: Create standardized pack format
   ```
   packs/gtm-collective/
   ├── manifest.json          # Pack metadata, version, pricing
   ├── skills/                 # 8 skill directories
   │   ├── analyzing-market/
   │   │   ├── index.yaml
   │   │   ├── SKILL.md
   │   │   └── resources/
   │   └── ...
   ├── commands/               # 14 command files
   │   ├── gtm-setup.md
   │   └── ...
   ├── protocols/              # Shared protocols
   └── scripts/                # Mount scripts
   ```

2. **Storage**: Upload pack files to R2
3. **Database**: Create pack record with version history
4. **Stripe**: Configure GTM product and prices
5. **CLI**: Support pack installation with subscription check

---

## 5. Security Hardening

### L1: Refresh Token Blacklisting (P0)

**Current State**: Logout returns success but tokens remain valid

**Required Changes**:
```typescript
// In auth.ts logout handler
const { jti } = verifyToken(refreshToken);
await redis.setex(`blacklist:${jti}`, REFRESH_TOKEN_EXPIRY_SECONDS, '1');

// In token verification
const isBlacklisted = await redis.exists(`blacklist:${jti}`);
if (isBlacklisted) throw Errors.Unauthorized('Token revoked');
```

**Acceptance Criteria**:
- Logout invalidates refresh token immediately
- Blacklisted tokens cannot be used to refresh
- Blacklist entries auto-expire after token expiry

### L2: Production JWT Secret Enforcement (P0)

**Current State**: Fallback secret used if JWT_SECRET not set

**Required Changes**:
```typescript
// In env.ts
JWT_SECRET: z.string().min(32).refine(
  (val) => process.env.NODE_ENV !== 'production' ||
           val !== 'development-secret-at-least-32-chars',
  'JWT_SECRET must be set to a secure value in production'
),
```

**Acceptance Criteria**:
- App fails to start in production without valid JWT_SECRET
- Development can still use fallback
- Clear error message on misconfiguration

### L3: Email Service Production Validation (P1)

**Current State**: Silently succeeds without API key

**Required Changes**:
```typescript
// In email.ts
if (!env.RESEND_API_KEY) {
  if (env.NODE_ENV === 'production') {
    throw new Error('RESEND_API_KEY required in production');
  }
  logger.warn('Email service disabled in development');
  return { success: false, error: 'Email not configured' };
}
```

**Acceptance Criteria**:
- Production requires RESEND_API_KEY
- Development logs warning but doesn't fail
- Return value indicates email was not sent

### L4: Consistent Path Validation (P1)

**Current State**: `isValidPath()` exists but not used everywhere

**Required Changes**:
- Apply validation in `storage.ts:generateStorageKey()`
- Add validation to all file path inputs
- Centralize path sanitization

**Acceptance Criteria**:
- All file paths validated before storage operations
- Path traversal attempts blocked and logged

### L5: Rate Limiter Resilience (P2)

**Current State**: Fails open on Redis errors

**Required Changes**:
```typescript
// In rate-limiter.ts
} catch (error) {
  logger.error({ error }, 'Rate limiter error');

  // Fail closed for auth endpoints
  if (isAuthEndpoint(c.req.path)) {
    throw Errors.ServiceUnavailable('Rate limiting unavailable');
  }

  // Fail open for read endpoints with warning
  c.header('X-RateLimit-Degraded', 'true');
  await next();
}
```

**Acceptance Criteria**:
- Auth endpoints fail closed on Redis error
- Other endpoints fail open with header indicator
- All failures logged with context

---

## 6. Deferred Features

### T11.1: SSO/SAML (P3 - Future)

Enterprise authentication integration. Requires:
- SAML 2.0 identity provider support
- SSO configuration per organization
- JIT user provisioning

**Deferred Reason**: Requires significant frontend work, enterprise-only feature

### T11.3: Admin Panel (P2)

Administrative dashboard for:
- User management
- Subscription oversight
- Skill moderation
- Usage analytics

**Required for V2**: Basic admin routes (API-only), dashboard in V3

### T12.2: Performance Optimization (P2)

- Database query optimization
- Response caching strategy
- CDN for static assets

**Approach**: Profile with production traffic, optimize hot paths

### T12.4: Marketing/Landing Page (P3)

Public-facing marketing site. Can launch with:
- Simple landing page
- Documentation site
- Pricing page

---

## 7. Functional Requirements

### FR1: Skill Pack Management

#### FR1.1: Pack Upload

**Description**: Allow authenticated creators to upload skill packs

**API Endpoint**: `POST /v1/packs`

**Request**:
```json
{
  "name": "GTM Collective",
  "slug": "gtm-collective",
  "description": "Go-to-Market skill pack...",
  "version": "1.0.0",
  "pricing": {
    "type": "subscription",
    "stripe_price_id": "price_gtm_monthly"
  },
  "files": [
    { "path": "manifest.json", "content": "..." },
    { "path": "skills/analyzing-market/index.yaml", "content": "..." }
  ]
}
```

**Acceptance Criteria**:
- Validates pack structure (manifest, skills, commands)
- Uploads files to R2 with proper keys
- Creates database record with version
- Returns pack ID and installation instructions

#### FR1.2: Pack Versioning

**Description**: Support semantic versioning for packs

**API Endpoint**: `POST /v1/packs/:slug/versions`

**Acceptance Criteria**:
- Validates semver format
- Prevents duplicate versions
- Marks latest version
- Supports changelog

#### FR1.3: Pack Installation (CLI)

**Description**: Install pack via CLI with subscription check

**CLI Command**: `loa install gtm-collective`

**Flow**:
1. Check authentication
2. Verify subscription (API call)
3. Download pack files
4. Validate license
5. Install to `.claude/` directory

**Acceptance Criteria**:
- Fails gracefully without subscription
- Shows upgrade prompt with pricing
- Installs all skills and commands
- Validates file integrity

### FR2: Subscription-Gated Access

#### FR2.1: Pack Access Control

**Description**: Gate pack downloads by subscription tier

**Logic**:
```typescript
// Check if user can access pack
const canAccess = await canAccessPack(userId, packSlug);
if (!canAccess.allowed) {
  throw Errors.TierUpgradeRequired(canAccess.requiredTier);
}
```

**Acceptance Criteria**:
- Free packs accessible to all
- Premium packs require active subscription
- Team members inherit team subscription
- THJ bypass for internal testing

#### FR2.2: License Generation for Packs

**Description**: Generate license tokens for pack installations

**License Payload**:
```json
{
  "pack": "gtm-collective",
  "version": "1.0.0",
  "user_id": "...",
  "tier": "pro",
  "watermark": "user@example.com",
  "expires_at": "2026-01-01T00:00:00Z"
}
```

**Acceptance Criteria**:
- License bound to user and pack
- Includes expiration from subscription
- CLI validates license on each run
- Watermark for attribution

### FR3: Admin API (Basic)

#### FR3.1: User Management

**Endpoints**:
- `GET /v1/admin/users` - List users
- `GET /v1/admin/users/:id` - User details
- `PATCH /v1/admin/users/:id` - Update user (ban, tier override)

**Acceptance Criteria**:
- Requires admin role
- Audit logged
- Cannot modify own account (safety)

#### FR3.2: Pack Moderation

**Endpoints**:
- `GET /v1/admin/packs` - List all packs
- `PATCH /v1/admin/packs/:id` - Update pack (approve, reject, feature)
- `DELETE /v1/admin/packs/:id` - Remove pack

**Acceptance Criteria**:
- Review queue for new packs
- Featured flag for homepage
- Soft delete with audit trail

---

## 8. Non-Functional Requirements

### NFR1: Security

- All L1-L5 findings resolved
- Penetration test before public launch
- Dependency scanning enabled (Dependabot/Snyk)
- Security.txt with disclosure policy

### NFR2: Performance

- Pack download < 5s for typical pack (< 1MB)
- API p95 latency < 200ms
- CLI startup < 500ms

### NFR3: Reliability

- 99.9% API uptime
- Graceful degradation on Redis failure
- Retry logic for transient failures

### NFR4: Observability

- Structured logging with request IDs
- Error tracking (Sentry)
- Usage metrics per pack
- Subscription conversion tracking

---

## 9. User Stories

### Epic 1: GTM Collective User

**US1.1**: As a startup founder, I want to install the GTM Collective so I can develop my go-to-market strategy with AI assistance.

**Acceptance Criteria**:
- Can subscribe to GTM Collective from dashboard
- Can install via `loa install gtm-collective`
- All 8 skills available after installation
- All 14 commands work as documented

**US1.2**: As a GTM user, I want to run `/analyze-market` so I can understand my competitive landscape.

**Acceptance Criteria**:
- Command triggers analyzing-market skill
- Produces market-landscape.md, competitive-analysis.md, icp-profiles.md
- Uses web search when available
- Cites sources in output

### Epic 2: Security-Conscious Admin

**US2.1**: As an admin, I want logout to truly invalidate tokens so compromised sessions can't be reused.

**Acceptance Criteria**:
- Logout blacklists refresh token
- Blacklisted token cannot refresh
- Blacklist entry expires with token

**US2.2**: As a DevOps engineer, I want the app to fail if JWT_SECRET is missing in production so we don't accidentally run insecure.

**Acceptance Criteria**:
- App crashes on startup without valid secret
- Error message is clear and actionable
- Development mode still works with fallback

### Epic 3: Pack Creator

**US3.1**: As a skill creator, I want to upload my skill pack so users can discover and install it.

**Acceptance Criteria**:
- Upload pack via API
- Pack appears in skill browser
- Version history tracked
- Download count visible

---

## 10. Success Criteria

### Launch Criteria (V2.0)

| Criteria | Requirement |
|----------|-------------|
| Security | All L1-L5 findings resolved |
| GTM Collective | All 8 skills installable |
| CLI | `loa install gtm-collective` works end-to-end |
| Subscriptions | GTM subscription checkout functional |
| Tests | All existing tests pass + new pack tests |

### Post-Launch Metrics (30 days)

| Metric | Target |
|--------|--------|
| GTM installs | 10+ |
| Subscription conversion | 5%+ of trial users |
| API errors | < 0.1% |
| Support tickets | < 5 critical |

---

## 11. Scope & Prioritization

### In Scope (V2.0)

| Feature | Priority | Sprint |
|---------|----------|--------|
| L1: Token blacklisting | P0 | 1 |
| L2: JWT secret enforcement | P0 | 1 |
| GTM Collective import | P0 | 1-2 |
| Pack upload API | P0 | 2 |
| Pack versioning | P1 | 2 |
| L3: Email validation | P1 | 2 |
| L4: Path validation | P1 | 2 |
| CLI pack install | P0 | 3 |
| Admin API (basic) | P2 | 3 |
| L5: Rate limiter resilience | P2 | 3 |

### Out of Scope (V2.0)

- SSO/SAML (T11.1)
- Full admin dashboard UI (T11.3)
- Performance profiling (T12.2)
- Marketing site (T12.4)
- Third-party pack submissions (future)
- Pack reviews/ratings (future)

---

## 12. Risks & Dependencies

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| GTM skill compatibility issues | High | Medium | Test each skill individually |
| Stripe pricing misconfiguration | High | Low | Test checkout flow thoroughly |
| Redis unavailability blocks auth | High | Low | Implement L5 resilience |
| Pack structure too rigid | Medium | Medium | Design flexible manifest schema |

### Dependencies

| Dependency | Owner | Status |
|------------|-------|--------|
| Stripe GTM products | Merlin | Not created |
| R2 bucket for packs | Merlin | Exists (skills bucket) |
| Redis for blacklist | Infra | Available (Upstash) |
| GTM skill files | Context | Available in context/ |

### External Dependencies

- Stripe API availability
- Cloudflare R2 availability
- Resend email delivery
- GitHub/Google OAuth providers

---

## Appendix

### A. GTM Collective File Inventory

```
loa-grimoire/context/gtm-skills-import/
├── analyzing-market/
│   ├── index.yaml
│   ├── SKILL.md
│   └── resources/
├── building-partnerships/
├── crafting-narratives/
├── educating-developers/
├── positioning-product/
├── pricing-strategist/
├── reviewing-gtm/
├── translating-for-stakeholders/
├── commands/
│   ├── gtm-setup.md
│   ├── gtm-adopt.md
│   ├── gtm-feature-requests.md
│   ├── sync-from-gtm.md
│   ├── review-gtm.md
│   ├── product-brief-template.md
│   └── product-reality-template.md
└── README.md

loa-grimoire/context/gtm-commands/
├── analyze-market.md
├── announce-release.md
├── create-deck.md
├── plan-devrel.md
├── plan-launch.md
├── plan-partnerships.md
├── position.md
├── price.md
└── sync-from-dev.md
```

### B. Security Audit Reference

See `SECURITY-AUDIT-REPORT.md` for full findings and recommendations.

### C. V1 PRD Reference

See `loa-grimoire/prd.md` for original requirements.

### D. Registry Schema

See `loa-grimoire/context/registry.json` for pack manifest schema.

---

**Next Steps**:
1. Review and approve PRD v2
2. Run `/architect` to update SDD for v2
3. Run `/sprint-plan` to create v2 sprint plan

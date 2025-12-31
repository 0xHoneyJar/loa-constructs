# Software Design Document: Loa Skills Registry

**Version:** 1.0
**Date:** 2025-12-30
**Author:** Architecture Designer Agent
**Status:** Draft
**PRD Reference:** loa-grimoire/prd.md

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Software Stack](#2-software-stack)
3. [Database Design](#3-database-design)
4. [UI Design](#4-ui-design)
5. [API Specifications](#5-api-specifications)
6. [Error Handling Strategy](#6-error-handling-strategy)
7. [Testing Strategy](#7-testing-strategy)
8. [Development Phases](#8-development-phases)
9. [Known Risks and Mitigation](#9-known-risks-and-mitigation)
10. [Open Questions](#10-open-questions)
11. [Appendix](#11-appendix)

---

## 1. Project Architecture

### 1.1 System Overview

Loa Skills Registry is a SaaS platform for distributing, licensing, and monetizing AI agent skills. The system comprises:

- **API Server**: Hono-based REST API handling all business logic
- **Web Dashboard**: Next.js application for user management, billing, and skill browsing
- **CLI Plugin**: TypeScript package integrated with Loa CLI for skill installation
- **Background Workers**: Scheduled tasks for analytics aggregation and cleanup

> **PRD Reference**: "Three-tier architecture: 1. API Layer: Hono (Node.js) REST API, 2. Data Layer: PostgreSQL (Neon) + Redis (Upstash), 3. Storage Layer: Cloudflare R2 (S3-compatible)" (prd.md:441-444)

### 1.2 Architectural Pattern

**Pattern:** Modular Monolith with Service Extraction Path

**Justification:**
Given the team's experience level (mostly new to the stack), a modular monolith provides:
1. Simpler deployment and debugging vs microservices
2. Clear module boundaries that enable future service extraction
3. Shared database reducing operational complexity
4. Single codebase for easier onboarding

The system is designed with clear module boundaries (auth, skills, subscriptions, teams) that can be extracted to separate services if scale demands.

### 1.3 Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                 LOA SKILLS REGISTRY                                   │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  CLIENTS                                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│  │   Loa CLI   │   │ Web Browser │   │   Stripe    │   │  GitHub     │              │
│  │   Plugin    │   │  Dashboard  │   │  Webhooks   │   │  OAuth      │              │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘              │
│         │                 │                 │                 │                      │
│         └─────────────────┴────────┬────────┴─────────────────┘                      │
│                                    │                                                  │
│  EDGE LAYER                        ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                      Cloudflare (CDN + DDoS + SSL)                               │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                                  │
│  APPLICATION LAYER                 ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                            Fly.io                                                │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐    │ │
│  │  │                    API Server (Hono + Node.js 20)                        │    │ │
│  │  │                                                                          │    │ │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │    │ │
│  │  │  │    Auth    │  │   Skills   │  │   Billing  │  │   Teams    │        │    │ │
│  │  │  │   Module   │  │   Module   │  │   Module   │  │   Module   │        │    │ │
│  │  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │    │ │
│  │  │                                                                          │    │ │
│  │  │  ┌────────────────────────────────────────────────────────────────────┐ │    │ │
│  │  │  │                    Middleware Layer                                 │ │    │ │
│  │  │  │  Rate Limiting │ Auth │ Validation │ Error Handling │ Logging      │ │    │ │
│  │  │  └────────────────────────────────────────────────────────────────────┘ │    │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                                  │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐    │ │
│  │  │                  Web Dashboard (Next.js 14)                              │    │ │
│  │  │   Landing │ Auth │ Skills │ Dashboard │ Team │ Admin                    │    │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                                  │
│  DATA LAYER                        ▼                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                   │
│  │   PostgreSQL 16  │  │    Redis 7       │  │  Cloudflare R2   │                   │
│  │   (Neon)         │  │   (Upstash)      │  │  (S3-compatible) │                   │
│  │                  │  │                  │  │                  │                   │
│  │  • Users         │  │  • Sessions      │  │  • Skill files   │                   │
│  │  • Skills        │  │  • Rate limits   │  │  • Avatars       │                   │
│  │  • Subscriptions │  │  • Cache         │  │  • Attachments   │                   │
│  │  • Teams         │  │                  │  │                  │                   │
│  │  • Audit logs    │  │                  │  │                  │                   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                   │
│                                                                                       │
│  EXTERNAL SERVICES                                                                    │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│  │   Stripe    │   │   Resend    │   │  PostHog    │   │   Sentry    │              │
│  │  Payments   │   │   Email     │   │  Analytics  │   │  Monitoring │              │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘              │
│                                                                                       │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 System Components

#### API Server (Hono + Node.js)

- **Purpose:** Handle all REST API requests
- **Responsibilities:**
  - Authentication and authorization
  - Skill CRUD operations
  - Subscription management via Stripe
  - Team management
  - License validation
  - Usage tracking
- **Interfaces:** REST API at `/v1/*`
- **Dependencies:** PostgreSQL, Redis, R2, Stripe

#### Web Dashboard (Next.js)

- **Purpose:** User-facing web application
- **Responsibilities:**
  - User authentication (login, register, OAuth)
  - Skill discovery and browsing
  - Subscription management
  - Team administration
  - Creator dashboards
  - Admin panel
- **Interfaces:** Web UI, calls API Server
- **Dependencies:** API Server

#### CLI Plugin (loa-registry)

- **Purpose:** Integrate with Loa CLI for skill installation
- **Responsibilities:**
  - User authentication
  - Skill search, install, update, uninstall
  - License validation at runtime
  - Offline caching
- **Interfaces:** CLI commands (`/skill-*`)
- **Dependencies:** API Server

### 1.5 Data Flow

**Skill Installation Flow:**
```
1. User runs `/skill-install terraform-assistant`
2. CLI sends GET /v1/skills/terraform-assistant/download with API key
3. API validates subscription tier against skill.tier_required
4. If authorized:
   a. Fetch skill files from R2
   b. Generate license token with watermark
   c. Track usage in PostgreSQL
   d. Return skill files + license
5. CLI writes files to .claude/skills/{slug}/
6. CLI writes .license.json for runtime validation
```

**Subscription Checkout Flow:**
```
1. User clicks "Upgrade to Pro" in dashboard
2. Dashboard calls POST /v1/subscriptions/checkout
3. API creates Stripe Checkout session
4. User redirected to Stripe Checkout
5. User completes payment
6. Stripe sends webhook to POST /v1/webhooks/stripe
7. API updates subscription in PostgreSQL
8. User gains immediate access to Pro skills
```

### 1.6 External Integrations

| Service | Purpose | API Type | Documentation |
|---------|---------|----------|---------------|
| Stripe | Payment processing | REST + Webhooks | https://stripe.com/docs/api |
| GitHub OAuth | User authentication | OAuth 2.0 | https://docs.github.com/en/apps/oauth-apps |
| Google OAuth | User authentication | OAuth 2.0 | https://developers.google.com/identity |
| Cloudflare R2 | File storage | S3-compatible | https://developers.cloudflare.com/r2 |
| Resend | Transactional email | REST | https://resend.com/docs |
| PostHog | Product analytics | SDK | https://posthog.com/docs |
| Sentry | Error monitoring | SDK | https://docs.sentry.io |

### 1.7 Deployment Architecture

**Primary Deployment:** Fly.io (multi-region capable)

```
┌─────────────────────────────────────────────────────────────────┐
│                        fly.io                                    │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Primary Region (IAD)                    │  │
│  │                                                            │  │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐               │  │
│  │   │ API x2   │  │ API x2   │  │  Worker  │               │  │
│  │   │ (shared) │  │ (shared) │  │  (cron)  │               │  │
│  │   └──────────┘  └──────────┘  └──────────┘               │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Future: Replica Regions (LHR, SIN)            │  │
│  │                     (Phase 3+ expansion)                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

External Services:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Neon         │  │ Upstash      │  │ Cloudflare   │
│ PostgreSQL   │  │ Redis        │  │ R2           │
│ (serverless) │  │ (serverless) │  │ (storage)    │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Deployment Configuration (fly.toml):**
```toml
app = "loa-skills-registry"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[env]
  NODE_ENV = "production"
  PORT = "3000"

[[services]]
  protocol = "tcp"
  internal_port = 3000

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.http_checks]]
    interval = "10s"
    timeout = "2s"
    path = "/v1/health"
```

### 1.8 Scalability Strategy

**Horizontal Scaling:**
- Fly.io auto-scales API instances based on load
- Minimum 1 instance, maximum 10 instances
- Stateless design enables seamless scaling

**Vertical Scaling:**
- Start with shared-cpu-1x (256MB RAM)
- Upgrade to shared-cpu-2x or dedicated if needed

**Auto-scaling Triggers:**
- CPU > 70% for 30 seconds
- Memory > 80% for 30 seconds
- Request queue depth > 100

**Load Balancing:**
- Fly.io built-in anycast load balancer
- Geographic routing to nearest region (future)

**Caching Strategy:**
```
Layer 1: CDN (Cloudflare)
├── Static assets: 30 days
├── Skill files: 24 hours (with stale-while-revalidate)
└── API responses: No cache (dynamic)

Layer 2: Application (Redis/Upstash)
├── Session tokens: TTL-based (per session)
├── User subscription status: 5 minutes
├── Skill list queries: 1 minute
└── Rate limit counters: Sliding window

Layer 3: Client (CLI)
├── Installed skill files: Until update
├── License tokens: Server-provided TTL
└── Skill catalog: 5 minutes
```

### 1.9 Security Architecture

**Authentication:**
- JWT access tokens (15 min expiry) signed with RS256
- Refresh tokens (30 day expiry) stored hashed in database
- API keys for CLI: `sk_live_` prefix, bcrypt hashed

**Authorization:**
- Role-based access control (RBAC)
- Roles: user, team_member, team_admin, team_owner, admin
- Tier-based skill access (free < pro < team < enterprise)

**Data Protection:**
- All traffic over HTTPS (TLS 1.3)
- Database encryption at rest (Neon managed)
- Passwords hashed with bcrypt (cost factor 12)
- API keys hashed with bcrypt
- Sensitive config in Fly.io secrets

**Network Security:**
- Cloudflare DDoS protection
- Rate limiting per IP and API key
- CORS restricted to known origins
- Webhook signature verification (Stripe)

**Security Headers:**
```typescript
// Hono security middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
});
```

---

## 2. Software Stack

### 2.1 Frontend Technologies (Dashboard)

| Category | Technology | Version | Justification |
|----------|------------|---------|---------------|
| Framework | Next.js | 14.2.x | App Router, RSC, great DX |
| Language | TypeScript | 5.4.x | Type safety, editor support |
| Styling | Tailwind CSS | 3.4.x | Utility-first, consistent |
| Components | shadcn/ui | 2.0.x | Accessible, customizable, Radix-based |
| State | TanStack Query | 5.x | Server state management |
| Forms | React Hook Form | 7.x | Type-safe, performant forms |
| Validation | Zod | 3.22.x | Runtime validation, TypeScript integration |
| Icons | Lucide React | 0.300.x | Consistent icon set |

**Key Libraries:**
- `@tanstack/react-query`: Server state caching and synchronization
- `react-hook-form`: Form state management with validation
- `zod`: Schema validation (shared with API)
- `next-auth` (v5): Authentication session management
- `stripe`: Stripe Elements for payment UI

### 2.2 Backend Technologies (API)

| Category | Technology | Version | Justification |
|----------|------------|---------|---------------|
| Runtime | Node.js | 20.x LTS | Long-term support, ecosystem |
| Framework | Hono | 4.x | Lightweight, TypeScript-first, fast |
| Language | TypeScript | 5.4.x | Type safety throughout |
| ORM | Drizzle | 0.30.x | Type-safe, lightweight, SQL-like |
| Validation | Zod | 3.22.x | Runtime validation, OpenAPI generation |
| Password | bcrypt | 5.1.x | Industry standard password hashing |
| JWT | jose | 5.x | JWT signing/verification |
| HTTP Client | ky | 1.x | Lightweight fetch wrapper |

**Key Libraries:**
- `drizzle-orm`: Type-safe database queries
- `drizzle-kit`: Migration generation
- `@hono/zod-validator`: Request validation middleware
- `stripe`: Stripe API integration
- `@aws-sdk/client-s3`: R2/S3 file operations
- `@upstash/redis`: Serverless Redis client
- `resend`: Transactional email

### 2.3 CLI Plugin Technologies

| Category | Technology | Version | Justification |
|----------|------------|---------|---------------|
| Language | TypeScript | 5.4.x | Consistent with API |
| Build | tsup | 8.x | Fast bundling |
| HTTP | ky | 1.x | Lightweight fetch |
| Storage | conf | 12.x | User config storage |
| Keychain | keytar | 7.x | Secure credential storage |

### 2.4 Infrastructure & DevOps

| Category | Technology | Purpose |
|----------|------------|---------|
| Cloud Provider | Fly.io | API hosting, auto-scaling |
| Database | Neon | Serverless PostgreSQL |
| Cache | Upstash | Serverless Redis |
| Storage | Cloudflare R2 | S3-compatible storage |
| CDN | Cloudflare | Edge caching, DDoS protection |
| Email | Resend | Transactional email |
| Analytics | PostHog | Product analytics |
| Monitoring | Sentry | Error tracking, performance |
| CI/CD | GitHub Actions | Build, test, deploy |

### 2.5 Development Tools

| Category | Technology | Purpose |
|----------|------------|---------|
| Package Manager | pnpm | Fast, efficient |
| Monorepo | Turborepo | Efficient builds |
| Linting | ESLint | Code quality |
| Formatting | Prettier | Consistent formatting |
| Testing | Vitest | Unit/integration tests |
| E2E Testing | Playwright | End-to-end tests |
| API Testing | Bruno | API exploration |

---

## 3. Database Design

### 3.1 Database Technology

**Primary Database:** PostgreSQL 16 (Neon serverless)

**Justification:**
1. **ACID compliance** for financial data (subscriptions)
2. **Full-text search** built-in for skill discovery
3. **JSON support** for flexible metadata
4. **Proven at scale** with excellent tooling
5. **Neon serverless** reduces operational burden

**Connection Pooling:** Neon built-in (no PgBouncer needed)

### 3.2 Schema Design

#### Entity: Users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for OAuth-only users
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    oauth_provider VARCHAR(50), -- 'github', 'google'
    oauth_id VARCHAR(255),
    stripe_customer_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_oauth UNIQUE (oauth_provider, oauth_id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
```

#### Entity: Teams

```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    avatar_url TEXT,
    stripe_customer_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_slug ON teams(slug);
CREATE INDEX idx_teams_owner ON teams(owner_id);
```

#### Entity: Team Members

```sql
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role team_role NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,

    CONSTRAINT unique_team_member UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
```

#### Entity: Subscriptions

```sql
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'team', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing');

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL DEFAULT 'free',
    status subscription_status NOT NULL DEFAULT 'active',
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    seats INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Either user_id or team_id must be set, not both
    CONSTRAINT subscription_owner CHECK (
        (user_id IS NOT NULL AND team_id IS NULL) OR
        (user_id IS NULL AND team_id IS NOT NULL)
    )
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_team ON subscriptions(team_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
```

#### Entity: API Keys

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_prefix VARCHAR(12) NOT NULL, -- 'sk_live_xxxx' for identification
    key_hash VARCHAR(255) NOT NULL, -- bcrypt hash of full key
    name VARCHAR(255) NOT NULL,
    scopes TEXT[] DEFAULT ARRAY['read:skills', 'write:installs'],
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
```

#### Entity: Skills

```sql
CREATE TYPE skill_category AS ENUM (
    'development', 'devops', 'marketing', 'sales',
    'support', 'analytics', 'security', 'other'
);
CREATE TYPE owner_type AS ENUM ('user', 'team');

CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    long_description TEXT,
    category skill_category DEFAULT 'other',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    owner_id UUID NOT NULL,
    owner_type owner_type NOT NULL DEFAULT 'user',
    tier_required subscription_tier NOT NULL DEFAULT 'free',
    is_public BOOLEAN DEFAULT TRUE,
    is_deprecated BOOLEAN DEFAULT FALSE,
    repository_url TEXT,
    documentation_url TEXT,
    downloads INTEGER DEFAULT 0,
    rating_sum INTEGER DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skills_slug ON skills(slug);
CREATE INDEX idx_skills_owner ON skills(owner_id, owner_type);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_tier ON skills(tier_required);
CREATE INDEX idx_skills_tags ON skills USING GIN(tags);
CREATE INDEX idx_skills_search ON skills
    USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

#### Entity: Skill Versions

```sql
CREATE TABLE skill_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL, -- semver: 1.0.0
    changelog TEXT,
    min_loa_version VARCHAR(50),
    is_latest BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_skill_version UNIQUE (skill_id, version)
);

CREATE INDEX idx_skill_versions_skill ON skill_versions(skill_id);
CREATE INDEX idx_skill_versions_latest ON skill_versions(skill_id) WHERE is_latest = TRUE;
```

#### Entity: Skill Files

```sql
CREATE TABLE skill_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES skill_versions(id) ON DELETE CASCADE,
    path VARCHAR(500) NOT NULL, -- e.g., 'SKILL.md'
    content_hash VARCHAR(64) NOT NULL, -- SHA-256
    storage_key VARCHAR(500) NOT NULL, -- R2 key
    size_bytes INTEGER NOT NULL,
    mime_type VARCHAR(100) DEFAULT 'text/plain',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_file_path UNIQUE (version_id, path)
);

CREATE INDEX idx_skill_files_version ON skill_files(version_id);
```

#### Entity: Skill Usage

```sql
CREATE TYPE usage_action AS ENUM ('install', 'update', 'load', 'uninstall');

CREATE TABLE skill_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    version_id UUID REFERENCES skill_versions(id),
    action usage_action NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skill_usage_skill ON skill_usage(skill_id);
CREATE INDEX idx_skill_usage_user ON skill_usage(user_id);
CREATE INDEX idx_skill_usage_created ON skill_usage(created_at);
```

#### Entity: Licenses

```sql
CREATE TABLE licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    watermark VARCHAR(100) NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoke_reason TEXT
);

CREATE INDEX idx_licenses_user ON licenses(user_id);
CREATE INDEX idx_licenses_skill ON licenses(skill_id);
CREATE INDEX idx_licenses_watermark ON licenses(watermark);
```

#### Entity: Audit Logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g., 'subscription.created'
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_team ON audit_logs(team_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

### 3.3 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │    teams     │       │ team_members │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id           │◀──┐   │ id           │◀──┐   │ id           │
│ email        │   │   │ name         │   │   │ team_id      │───▶ teams
│ password_hash│   │   │ slug         │   │   │ user_id      │───▶ users
│ name         │   │   │ owner_id     │───┼───│ role         │
│ avatar_url   │   │   └──────────────┘   │   └──────────────┘
│ stripe_...   │   │                      │
└──────────────┘   │   ┌──────────────┐   │
       │           │   │ subscriptions│   │
       │           └───│ user_id      │   │
       │               │ team_id      │───┘
       │               │ tier         │
       │               │ status       │
       │               │ stripe_...   │
       │               └──────────────┘
       │
       │           ┌──────────────┐       ┌──────────────┐
       └──────────▶│   api_keys   │       │   skills     │
                   │ user_id      │       │ id           │◀──────┐
                   │ key_hash     │       │ slug         │       │
                   │ name         │       │ owner_id     │       │
                   │ scopes       │       │ tier_required│       │
                   └──────────────┘       └──────────────┘       │
                                                 │               │
                                                 ▼               │
                                          ┌──────────────┐       │
                                          │skill_versions│       │
                                          │ skill_id     │───────┘
                                          │ version      │◀──────┐
                                          │ is_latest    │       │
                                          └──────────────┘       │
                                                 │               │
                                                 ▼               │
                                          ┌──────────────┐       │
                                          │ skill_files  │       │
                                          │ version_id   │───────┘
                                          │ path         │
                                          │ storage_key  │
                                          └──────────────┘
```

### 3.4 Migration Strategy

**Tool:** Drizzle Kit

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate

# Open Drizzle Studio for database inspection
pnpm drizzle-kit studio
```

**Migration Workflow:**
1. Modify `src/db/schema.ts`
2. Run `pnpm drizzle-kit generate` to create migration SQL
3. Review generated migration in `drizzle/` folder
4. Run `pnpm drizzle-kit migrate` to apply
5. Commit both schema and migration files

### 3.5 Data Access Patterns

| Query | Frequency | Optimization |
|-------|-----------|--------------|
| Get user by email | High | Index on email |
| Get user subscription tier | Very High | Redis cache (5 min TTL) |
| Search skills | High | GIN index on text, Redis cache (1 min) |
| Get skill by slug | High | Index on slug |
| Download skill files | Medium | CDN cache (24h) |
| Track skill usage | High | Async write, batch inserts |
| List user's installed skills | Medium | Composite index |
| Validate license | Very High | Redis cache (TTL from token) |

### 3.6 Caching Strategy

**Redis/Upstash Caching:**

```typescript
// Cache keys and TTLs
const CACHE_CONFIG = {
  // User's effective subscription tier
  userTier: (userId: string) => `user:${userId}:tier`,
  userTierTTL: 300, // 5 minutes

  // Skill list (paginated)
  skillList: (params: string) => `skills:list:${params}`,
  skillListTTL: 60, // 1 minute

  // Skill details
  skill: (slug: string) => `skill:${slug}`,
  skillTTL: 300, // 5 minutes

  // Rate limit counters
  rateLimit: (key: string, window: string) => `rate:${key}:${window}`,
  // TTL = window duration

  // Session tokens (for invalidation)
  session: (tokenHash: string) => `session:${tokenHash}`,
  // TTL = token expiry
};
```

### 3.7 Backup and Recovery

**Neon Automated Backups:**
- Point-in-time recovery (PITR) included
- 7-day retention on free tier
- 30-day retention on Pro tier

**Recovery Objectives:**
- **RTO (Recovery Time Objective):** < 1 hour
- **RPO (Recovery Point Objective):** < 5 minutes (PITR)

---

## 4. UI Design

### 4.1 Design System

**Component Library:** shadcn/ui (Radix primitives + Tailwind)

**Design Tokens:**
```css
/* Colors (using CSS variables) */
--primary: 222.2 47.4% 11.2%;
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96.1%;
--accent: 210 40% 96.1%;
--destructive: 0 84.2% 60.2%;
--muted: 210 40% 96.1%;
--border: 214.3 31.8% 91.4%;

/* Spacing (Tailwind scale) */
4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

/* Typography */
Font: Inter (variable)
Headings: 600 weight
Body: 400 weight
Code: JetBrains Mono
```

**Theming:** Light/Dark mode support via `next-themes`

### 4.2 Key User Flows

#### Flow 1: New User Registration
```
Landing → Click "Get Started" → Register Form → Email Verification → Dashboard
```

#### Flow 2: Skill Installation (CLI)
```
/skill-login → Enter credentials → /skill-search → Review → /skill-install → Success
```

#### Flow 3: Subscription Upgrade
```
Dashboard → Click "Upgrade" → View Plans → Select Pro → Stripe Checkout → Success
```

#### Flow 4: Team Onboarding
```
Dashboard → Create Team → Subscribe Team → Invite Members → Members Accept → Team Ready
```

### 4.3 Page/View Structure

| Page | URL | Purpose | Key Components |
|------|-----|---------|----------------|
| Landing | / | Marketing, conversion | Hero, Features, Pricing, CTA |
| Login | /login | User authentication | LoginForm, OAuth buttons |
| Register | /register | User registration | RegisterForm, OAuth buttons |
| Dashboard | /dashboard | User home | Stats, RecentSkills, QuickActions |
| Skills | /skills | Browse skills | SkillGrid, Filters, Search |
| Skill Detail | /skills/[slug] | View skill | SkillInfo, Versions, Install |
| Profile | /profile | User settings | ProfileForm, AvatarUpload |
| API Keys | /api-keys | Manage keys | KeyList, CreateKeyDialog |
| Billing | /billing | Subscription | CurrentPlan, PlanSelector, History |
| Team | /team | Team management | MemberList, InviteForm, Settings |
| Team Billing | /team/billing | Team subscription | TeamPlan, Seats, History |
| Creator | /creator | Skill publishing | SkillList, CreateSkillForm |
| Admin | /admin | Platform admin | UserList, SkillList, Metrics |

### 4.4 Component Architecture

```
app/
├── (marketing)/
│   ├── page.tsx              # Landing page
│   └── pricing/page.tsx      # Pricing page
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── verify/page.tsx
├── (dashboard)/
│   ├── layout.tsx            # Dashboard shell
│   ├── dashboard/page.tsx
│   ├── skills/
│   │   ├── page.tsx          # Skill browser
│   │   └── [slug]/page.tsx   # Skill detail
│   ├── profile/page.tsx
│   ├── api-keys/page.tsx
│   ├── billing/page.tsx
│   ├── team/
│   │   ├── page.tsx          # Team management
│   │   └── billing/page.tsx
│   └── creator/
│       └── page.tsx          # Creator dashboard
└── (admin)/
    └── admin/page.tsx        # Admin panel

components/
├── ui/                       # shadcn/ui components
├── layouts/
│   ├── MarketingLayout.tsx
│   ├── DashboardLayout.tsx
│   └── AuthLayout.tsx
├── skills/
│   ├── SkillCard.tsx
│   ├── SkillGrid.tsx
│   ├── SkillFilters.tsx
│   └── SkillDetail.tsx
├── billing/
│   ├── PlanSelector.tsx
│   ├── CurrentPlan.tsx
│   └── BillingHistory.tsx
├── team/
│   ├── MemberList.tsx
│   ├── InviteForm.tsx
│   └── RoleSelect.tsx
└── shared/
    ├── Header.tsx
    ├── Sidebar.tsx
    ├── SearchInput.tsx
    └── LoadingSpinner.tsx
```

### 4.5 Responsive Design Strategy

**Breakpoints (Tailwind defaults):**
```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

**Approach:** Mobile-first with progressive enhancement

**Key Adaptations:**
- Sidebar collapses to bottom nav on mobile
- Skill grid: 1 col (mobile) → 2 col (tablet) → 3-4 col (desktop)
- Tables become cards on mobile

### 4.6 Accessibility Standards

**WCAG Level:** AA compliance

**Key Considerations:**
- Keyboard navigation for all interactive elements
- ARIA labels for icons and dynamic content
- Focus indicators visible
- Color contrast ≥ 4.5:1 for text
- Screen reader announcements for state changes
- Reduced motion preference respected

### 4.7 State Management

**Server State:** TanStack Query (React Query)
```typescript
// Example: Fetching skills with caching
const { data: skills, isLoading } = useQuery({
  queryKey: ['skills', filters],
  queryFn: () => api.skills.list(filters),
  staleTime: 60_000, // 1 minute
});
```

**Client State:** React Context + hooks (minimal)
```typescript
// Auth context
const { user, isLoading, signOut } = useAuth();

// Theme context
const { theme, setTheme } = useTheme();
```

---

## 5. API Specifications

### 5.1 API Design Principles

**Style:** REST
**Base URL:** `https://api.loaskills.dev/v1`
**Versioning:** URL path (`/v1/`)
**Authentication:** Bearer token (JWT or API key)

**Request Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
X-Request-ID: <uuid>  # Optional, for tracing
```

**Response Format:**
```json
{
  "data": { ... },           // Success response
  "pagination": { ... },     // For list endpoints
  "request_id": "req_xxx"    // Always present
}
```

### 5.2 Authentication Endpoints

#### POST /v1/auth/register
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "email_verified": false,
    "created_at": "2025-01-01T00:00:00Z"
  },
  "request_id": "req_xxx"
}
```

#### POST /v1/auth/login
Authenticate with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "access_token": "eyJhbG...",
    "refresh_token": "dGhpcyBp...",
    "expires_in": 900,
    "token_type": "Bearer"
  },
  "request_id": "req_xxx"
}
```

#### POST /v1/auth/refresh
Refresh access token.

**Request:**
```json
{
  "refresh_token": "dGhpcyBp..."
}
```

**Response (200 OK):**
```json
{
  "data": {
    "access_token": "eyJhbG...",
    "refresh_token": "bmV3IHJl...",
    "expires_in": 900,
    "token_type": "Bearer"
  },
  "request_id": "req_xxx"
}
```

### 5.3 Skills Endpoints

#### GET /v1/skills
List skills with filtering and pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query |
| category | string | Filter by category |
| tier | string | Filter by tier |
| tag | string | Filter by tag |
| sort | string | Sort by: downloads, rating, newest, name |
| page | number | Page number (default: 1) |
| per_page | number | Items per page (default: 20, max: 100) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Terraform Assistant",
      "slug": "terraform-assistant",
      "description": "AI-powered Terraform workflow assistance",
      "category": "devops",
      "tier_required": "pro",
      "downloads": 1234,
      "rating": 4.5,
      "tags": ["terraform", "devops", "infrastructure"],
      "latest_version": "1.2.0",
      "owner": {
        "name": "DevOps Pro",
        "type": "user"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 42,
    "total_pages": 3
  },
  "request_id": "req_xxx"
}
```

#### GET /v1/skills/{slug}/download
Download skill files with license.

**Response (200 OK):**
```json
{
  "data": {
    "skill": {
      "name": "Terraform Assistant",
      "version": "1.2.0",
      "files": [
        {
          "path": "SKILL.md",
          "content": "# Terraform Assistant\n..."
        },
        {
          "path": "resources/templates/main.tf.hbs",
          "content": "..."
        }
      ]
    },
    "license": {
      "type": "subscription",
      "tier": "pro",
      "expires_at": "2025-02-01T00:00:00Z",
      "watermark": "wm_abc123xyz"
    },
    "cache_ttl": 86400
  },
  "request_id": "req_xxx"
}
```

**Error Response (402 Payment Required):**
```json
{
  "error": {
    "code": "TIER_UPGRADE_REQUIRED",
    "message": "This skill requires a Pro subscription",
    "details": {
      "required_tier": "pro",
      "current_tier": "free",
      "upgrade_url": "https://loaskills.dev/billing"
    }
  },
  "request_id": "req_xxx"
}
```

### 5.4 Subscription Endpoints

#### POST /v1/subscriptions/checkout
Create Stripe checkout session.

**Request:**
```json
{
  "tier": "pro",
  "success_url": "https://loaskills.dev/billing?success=true",
  "cancel_url": "https://loaskills.dev/billing?canceled=true"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "checkout_url": "https://checkout.stripe.com/c/pay/...",
    "session_id": "cs_xxx"
  },
  "request_id": "req_xxx"
}
```

#### POST /v1/webhooks/stripe
Handle Stripe webhook events.

**Events Handled:**
- `checkout.session.completed` - Create subscription
- `customer.subscription.updated` - Update subscription
- `customer.subscription.deleted` - Cancel subscription
- `invoice.payment_failed` - Handle failed payment

**Response (200 OK):**
```json
{
  "received": true
}
```

### 5.5 Rate Limiting

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

**Rate Limit Response (429):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "retry_after": 60
    }
  },
  "request_id": "req_xxx"
}
```

**Rate Limits by Tier:**
| Tier | Requests/min | Downloads/hour |
|------|--------------|----------------|
| Anonymous | 20 | 0 |
| Free | 60 | 10 |
| Pro | 100 | 100 |
| Team | 100 | 1000 |
| Enterprise | 1000 | 10000 |

---

## 6. Error Handling Strategy

### 6.1 Error Categories

| Category | HTTP Status | Code | Example |
|----------|-------------|------|---------|
| Validation | 400 | VALIDATION_ERROR | Invalid email format |
| Authentication | 401 | UNAUTHORIZED | Invalid or expired token |
| Authorization | 403 | FORBIDDEN | Insufficient permissions |
| Not Found | 404 | NOT_FOUND | Skill not found |
| Conflict | 409 | CONFLICT | Email already registered |
| Payment Required | 402 | TIER_UPGRADE_REQUIRED | Pro skill, free user |
| Rate Limit | 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| Server Error | 500 | INTERNAL_ERROR | Unexpected error |

### 6.2 Error Response Format

```typescript
interface APIError {
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable message
    details?: {             // Additional context
      [key: string]: unknown;
    };
    docs_url?: string;      // Link to documentation
  };
  request_id: string;       // For support/debugging
}
```

**Example:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "email": "Invalid email format",
      "password": "Must be at least 8 characters"
    },
    "docs_url": "https://docs.loaskills.dev/errors#validation"
  },
  "request_id": "req_abc123"
}
```

### 6.3 Error Handling Implementation

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Common errors
export const Errors = {
  Unauthorized: () => new AppError('UNAUTHORIZED', 'Authentication required', 401),
  Forbidden: () => new AppError('FORBIDDEN', 'Insufficient permissions', 403),
  NotFound: (resource: string) => new AppError('NOT_FOUND', `${resource} not found`, 404),
  TierRequired: (required: string, current: string) => new AppError(
    'TIER_UPGRADE_REQUIRED',
    `This requires a ${required} subscription`,
    402,
    { required_tier: required, current_tier: current, upgrade_url: '/billing' }
  ),
};
```

```typescript
// src/middleware/error-handler.ts
export const errorHandler = (): MiddlewareHandler => {
  return async (c, next) => {
    try {
      await next();
    } catch (err) {
      const requestId = c.get('requestId') || crypto.randomUUID();

      if (err instanceof AppError) {
        return c.json({
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
          },
          request_id: requestId,
        }, err.status as StatusCode);
      }

      // Log unexpected errors
      console.error('Unexpected error:', err);

      return c.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
        request_id: requestId,
      }, 500);
    }
  };
};
```

### 6.4 Logging Strategy

**Log Levels:**
- `ERROR`: Unhandled exceptions, critical failures
- `WARN`: Handled errors, deprecation notices
- `INFO`: Request/response, significant events
- `DEBUG`: Detailed debugging (dev only)

**Structured Logging Format:**
```json
{
  "timestamp": "2025-01-01T00:00:00.000Z",
  "level": "INFO",
  "message": "Request completed",
  "request_id": "req_abc123",
  "user_id": "uuid",
  "method": "GET",
  "path": "/v1/skills",
  "status": 200,
  "duration_ms": 45,
  "ip": "1.2.3.4",
  "user_agent": "loa-cli/1.0.0"
}
```

**Logging Implementation:**
```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
});
```

---

## 7. Testing Strategy

### 7.1 Testing Pyramid

| Level | Coverage Target | Tools | Scope |
|-------|-----------------|-------|-------|
| Unit | 80% | Vitest | Pure functions, utilities |
| Integration | Key flows | Vitest + Supertest | API routes, services |
| E2E | Critical paths | Playwright | User journeys |

### 7.2 Unit Testing

**Scope:** Pure functions, utilities, validators

```typescript
// Example: src/lib/tier.test.ts
import { describe, it, expect } from 'vitest';
import { canAccessTier } from './tier';

describe('canAccessTier', () => {
  it('allows free tier to access free skills', () => {
    expect(canAccessTier('free', 'free')).toBe(true);
  });

  it('denies free tier access to pro skills', () => {
    expect(canAccessTier('free', 'pro')).toBe(false);
  });

  it('allows pro tier to access free and pro skills', () => {
    expect(canAccessTier('pro', 'free')).toBe(true);
    expect(canAccessTier('pro', 'pro')).toBe(true);
  });
});
```

### 7.3 Integration Testing

**Scope:** API routes with database, services with external calls mocked

```typescript
// Example: src/routes/skills.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../app';
import { db, migrate } from '../db';

describe('GET /v1/skills', () => {
  beforeAll(async () => {
    await migrate();
    // Seed test data
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('returns paginated skills', async () => {
    const res = await app.request('/v1/skills');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
  });

  it('filters by category', async () => {
    const res = await app.request('/v1/skills?category=devops');
    expect(res.status).toBe(200);

    const body = await res.json();
    body.data.forEach((skill: any) => {
      expect(skill.category).toBe('devops');
    });
  });
});
```

### 7.4 E2E Testing

**Scope:** Critical user journeys

```typescript
// Example: e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can register and login', async ({ page }) => {
    // Register
    await page.goto('/register');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'securePassword123');
    await page.fill('[name="name"]', 'Test User');
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('user can upgrade to Pro', async ({ page }) => {
    await page.goto('/login');
    // ... login

    await page.goto('/billing');
    await page.click('text=Upgrade to Pro');

    // Verify Stripe redirect (in test mode)
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
  });
});
```

### 7.5 CI/CD Integration

**GitHub Actions Workflow:**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test:coverage
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/test

      - uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      # ... setup
      - run: pnpm exec playwright install
      - run: pnpm test:e2e
```

---

## 8. Development Phases

### Phase 1: Foundation (Sprint 1-2)

**Sprint 1: Project Setup & Auth**
- [ ] Initialize monorepo with Turborepo
- [ ] Set up API server (Hono + TypeScript)
- [ ] Configure Drizzle ORM with Neon
- [ ] Implement users table and auth service
- [ ] Create registration and login endpoints
- [ ] Set up GitHub Actions CI
- [ ] Deploy to Fly.io (staging)

**Sprint 2: Dashboard Foundation & Skills**
- [ ] Initialize Next.js dashboard
- [ ] Set up shadcn/ui components
- [ ] Implement auth pages (login, register)
- [ ] Create skills table and service
- [ ] Implement skill CRUD endpoints
- [ ] Set up R2 for file storage
- [ ] Create skill browser page

### Phase 2: Core Features (Sprint 3-4)

**Sprint 3: Subscriptions & Billing**
- [ ] Integrate Stripe (products, prices)
- [ ] Implement checkout flow
- [ ] Handle Stripe webhooks
- [ ] Create billing page
- [ ] Implement tier validation on downloads
- [ ] Add rate limiting (Redis)
- [ ] Create CLI plugin skeleton

**Sprint 4: CLI & License Enforcement**
- [ ] Implement CLI authentication
- [ ] Create `/skill-install` command
- [ ] Create `/skill-list` command
- [ ] Implement license validation
- [ ] Add offline caching
- [ ] Create license watermarking
- [ ] End-to-end testing

### Phase 3: Teams & Analytics (Sprint 5-6)

**Sprint 5: Team Management**
- [ ] Implement teams table and service
- [ ] Create team CRUD endpoints
- [ ] Add member invitation flow
- [ ] Implement team subscriptions
- [ ] Create team dashboard page
- [ ] Add seat management
- [ ] SSO preparation (schema)

**Sprint 6: Analytics & Polish**
- [ ] Implement usage tracking
- [ ] Create analytics dashboards
- [ ] Add creator dashboards
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Documentation
- [ ] Production deployment

### Phase 4: Enterprise (Sprint 7-8) - Future

**Sprint 7: Enterprise Features**
- [ ] SSO/SAML implementation
- [ ] Audit logging
- [ ] Admin panel

**Sprint 8: Launch**
- [ ] Load testing
- [ ] Penetration testing
- [ ] Documentation finalization
- [ ] Marketing site

---

## 9. Known Risks and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Team inexperience with stack** | High | Medium | Detailed SDD, code reviews, pair programming, incremental complexity |
| **Stripe integration complexity** | Medium | High | Start integration early, use test mode extensively, follow Stripe best practices |
| **Scale issues at launch** | Low | Medium | Load testing, auto-scaling configured, CDN caching |
| **Security vulnerabilities** | Medium | Critical | Security audit before launch, OWASP guidelines, dependency scanning |
| **Neon/Upstash outages** | Low | High | Multi-region (future), graceful degradation, status monitoring |
| **License bypass attempts** | Medium | Medium | Watermarking, usage monitoring, legal terms |
| **Loa framework breaking changes** | Medium | Medium | Version pinning, compatibility testing, communication with Loa team |

---

## 10. Open Questions

| Question | Owner | Due Date | Status |
|----------|-------|----------|--------|
| Stripe product/price setup | Team | Sprint 3 | Open |
| Domain name (loaskills.dev?) | Team | Sprint 1 | Open |
| Initial skills to seed registry | Team | Sprint 4 | Open |
| SSO provider selection | Team | Sprint 5 | Open |
| Legal terms (ToS, Privacy Policy) | Team | Sprint 6 | Open |

---

## 11. Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| Skill | A folder containing SKILL.md and supporting files that extend Claude's capabilities |
| Tier | Subscription level (Free, Pro, Team, Enterprise) |
| Seat | A licensed user slot within a team subscription |
| Watermark | Unique identifier embedded in skill license for tracking |
| Cache TTL | Time-to-live for cached license validation |
| R2 | Cloudflare's S3-compatible object storage |
| Neon | Serverless PostgreSQL provider |
| Upstash | Serverless Redis provider |

### B. References

- Hono Documentation: https://hono.dev/
- Drizzle ORM: https://orm.drizzle.team/
- Next.js 14: https://nextjs.org/docs
- shadcn/ui: https://ui.shadcn.com/
- Stripe API: https://stripe.com/docs/api
- Fly.io: https://fly.io/docs/
- Neon: https://neon.tech/docs
- Upstash: https://upstash.com/docs

### C. Project Structure

```
loa-skills-registry/
├── apps/
│   ├── api/                    # Hono API server
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point
│   │   │   ├── app.ts          # Hono app configuration
│   │   │   ├── config/         # Environment config
│   │   │   ├── db/             # Drizzle schema & client
│   │   │   ├── routes/         # API route handlers
│   │   │   ├── services/       # Business logic
│   │   │   ├── middleware/     # Hono middleware
│   │   │   ├── lib/            # Utilities
│   │   │   └── types/          # TypeScript types
│   │   ├── drizzle/            # Migration files
│   │   └── package.json
│   └── web/                    # Next.js dashboard
│       ├── app/                # App router pages
│       ├── components/         # React components
│       ├── lib/                # Utilities
│       └── package.json
├── packages/
│   ├── loa-registry/           # CLI plugin
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── commands/
│   │   │   ├── client.ts
│   │   │   └── cache.ts
│   │   └── package.json
│   └── shared/                 # Shared types/utils
│       ├── src/
│       │   ├── types.ts
│       │   └── validation.ts
│       └── package.json
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

### D. Environment Variables

```bash
# API Server
DATABASE_URL=postgres://...
REDIS_URL=redis://...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=loa-skills

STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...

JWT_SECRET=...
JWT_ISSUER=https://api.loaskills.dev

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

RESEND_API_KEY=re_...

POSTHOG_API_KEY=phc_...
SENTRY_DSN=https://...

# Dashboard
NEXT_PUBLIC_API_URL=https://api.loaskills.dev/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

### E. Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-12-30 | Initial version | Architecture Designer |

---

*Generated by Architecture Designer Agent*
*Based on PRD: loa-grimoire/prd.md*

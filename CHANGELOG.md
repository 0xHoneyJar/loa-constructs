# Changelog

All notable changes to the Loa Skills Registry will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-31

### Why This Release

This is the initial production release of Loa Skills Registry, completing all 15 sprints of development. The platform provides a complete SaaS solution for distributing, licensing, and monetizing AI agent skills compatible with the Loa framework and Claude Code.

### Added

#### Core Platform (Sprints 1-4)

- **Authentication System**
  - JWT-based authentication with access/refresh tokens
  - bcrypt password hashing (cost factor 12)
  - Email verification flow
  - Password reset with secure tokens
  - OAuth integration (GitHub, Google)
  - API key authentication with `sk_live_`/`sk_test_` prefixes

- **Database Schema**
  - PostgreSQL via Drizzle ORM
  - 15+ tables: users, teams, subscriptions, skills, packs, licenses, audit_logs
  - Proper indexes and foreign key constraints
  - JSONB fields for flexible metadata

- **Subscription System**
  - Four tiers: Free, Pro, Team, Enterprise
  - Stripe integration for payments
  - Webhook handling for subscription lifecycle
  - Tier-based access control

- **Skills API**
  - CRUD operations for skills
  - Version management with semver
  - File storage on Cloudflare R2
  - Download tracking and analytics
  - Category and tag filtering
  - Search functionality

#### Dashboard (Sprints 5-6)

- **Authentication Pages**
  - Login, Register, Forgot Password, Reset Password
  - Email verification flow
  - OAuth buttons for GitHub/Google
  - Protected route wrapper

- **Dashboard Core**
  - Responsive layout with sidebar navigation
  - Dashboard home with stats overview
  - Skill browser with search and filters
  - Skill detail pages
  - Billing management
  - Profile settings
  - API key management

#### CLI Plugin (Sprints 7-8)

- **Core Commands**
  - `login` - Authenticate with registry
  - `logout` - Clear credentials
  - `whoami` - Show current user
  - `search` - Search for skills
  - `info` - Get skill details

- **Installation Commands**
  - `install` - Install a skill
  - `update` - Update installed skills
  - `uninstall` - Remove a skill
  - `list` - List installed skills

- **License Validation**
  - Local license file storage
  - Expiration checking
  - Watermark tracking

#### Team Management (Sprint 9)

- **Team API**
  - Create and manage teams
  - Member management (add, remove, change role)
  - Role hierarchy: owner > admin > member
  - Team-scoped subscriptions

- **Invitation System**
  - Email invitations with secure tokens
  - Accept/decline flow
  - Expiration handling
  - Invitation revocation

- **Dashboard Pages**
  - Team list and creation
  - Team settings and members
  - Team billing

#### Analytics & Creator Tools (Sprint 10)

- **Usage Analytics**
  - Per-user usage tracking
  - Skill installation metrics
  - Time-series data

- **Creator Dashboard**
  - Published skills overview
  - Download statistics
  - Revenue tracking (future)

- **Skill Publishing**
  - Multi-step publish flow
  - Version management
  - File upload interface

#### Enterprise Features (Sprint 11)

- **Audit Logging**
  - Comprehensive event tracking
  - User, team, and resource scoping
  - Queryable via API
  - 40+ event types

- **Enhanced Rate Limiting**
  - Sliding window algorithm
  - Tier-based limits
  - Redis-backed for distributed systems

- **Security Hardening**
  - Security headers (CSP, HSTS, X-Frame-Options)
  - CSRF protection (double-submit cookie)
  - Input sanitization utilities

#### Launch Prep (Sprint 12)

- **E2E Testing**
  - Playwright test suite
  - Critical path coverage
  - CI integration

- **API Documentation**
  - OpenAPI/Swagger spec
  - Interactive documentation at `/v1/docs`

- **Deployment Configuration**
  - Fly.io configuration
  - Health checks
  - Rolling deployments

- **Monitoring**
  - Structured logging with Pino
  - Sentry integration for error tracking
  - Performance metrics

#### Pack System (Sprints 13-15)

- **Pack Database Schema** (Sprint 13)
  - 5 new tables: packs, pack_versions, pack_files, pack_subscriptions, pack_installations
  - Pricing types: free, one_time, subscription
  - Status workflow: draft → pending_review → published

- **Pack API** (Sprint 13)
  - CRUD operations for packs
  - Version management
  - Manifest validation
  - Download with subscription check

- **Token Blacklisting** (Sprint 13)
  - Redis-based token revocation
  - True logout functionality
  - Fail-secure on Redis errors

- **GTM Import Script** (Sprint 14)
  - Bulk pack import from JSON
  - Skill bundling
  - File generation

- **CLI Pack Commands** (Sprint 15)
  - `pack-install` - Install a pack
  - `pack-list` - List installed packs
  - `pack-update` - Update packs
  - License storage per pack

- **Admin API** (Sprint 15)
  - User management (list, view, update)
  - Pack moderation (approve, reject, feature)
  - Tier override capability
  - Audit logging for all actions

### Security

- **Authentication**
  - JWT with HS256 signing
  - 15-minute access token expiry
  - 30-day refresh token expiry
  - Token blacklisting for revocation
  - Production JWT_SECRET enforcement (≥32 chars)

- **Authorization**
  - Role-based access control
  - Ownership verification
  - Team permission hierarchy
  - Admin self-modification prevention

- **Input Validation**
  - Zod schemas on all endpoints
  - SQL injection prevention via Drizzle ORM
  - Path traversal prevention
  - XSS prevention via CSP

- **Rate Limiting**
  - Tier-based limits (100-1000 req/min)
  - Stricter auth endpoint limits (10 req/min)
  - Fail-closed for auth endpoints on Redis errors
  - IP-based limiting for unauthenticated requests

- **Infrastructure**
  - HTTPS enforced
  - Security headers on all responses
  - Secrets via environment variables
  - No hardcoded credentials

### Technical Stack

| Component | Technology |
|-----------|------------|
| API | Hono + Node.js |
| Database | PostgreSQL (Neon) + Drizzle ORM |
| Cache | Redis (Upstash) |
| Storage | Cloudflare R2 |
| Auth | JWT (jose) + bcrypt |
| Payments | Stripe |
| Email | Resend |
| Frontend | Next.js 14 + Tailwind CSS |
| Hosting | Fly.io |
| Monorepo | Turborepo + pnpm |

### API Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/register` | Create account |
| POST | `/v1/auth/login` | Login |
| POST | `/v1/auth/refresh` | Refresh tokens |
| POST | `/v1/auth/logout` | Logout (blacklists token) |
| POST | `/v1/auth/forgot-password` | Request password reset |
| POST | `/v1/auth/reset-password` | Reset password |
| POST | `/v1/auth/verify-email` | Verify email |
| GET | `/v1/auth/me` | Get current user |

#### Skills
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/skills` | List/search skills |
| GET | `/v1/skills/:slug` | Get skill details |
| POST | `/v1/skills` | Create skill |
| PATCH | `/v1/skills/:slug` | Update skill |
| DELETE | `/v1/skills/:slug` | Delete skill |
| GET | `/v1/skills/:slug/download` | Download files |
| POST | `/v1/skills/:slug/install` | Record install |

#### Packs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/packs` | List packs |
| GET | `/v1/packs/:slug` | Get pack details |
| POST | `/v1/packs` | Create pack |
| PATCH | `/v1/packs/:slug` | Update pack |
| GET | `/v1/packs/:slug/download` | Download pack |
| POST | `/v1/packs/:slug/versions` | Add version |

#### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/teams` | List user's teams |
| POST | `/v1/teams` | Create team |
| GET | `/v1/teams/:slug` | Get team details |
| PATCH | `/v1/teams/:slug` | Update team |
| DELETE | `/v1/teams/:slug` | Delete team |
| POST | `/v1/teams/:slug/invite` | Invite member |
| POST | `/v1/teams/:slug/members/:id/remove` | Remove member |

#### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/admin/users` | List users |
| GET | `/v1/admin/users/:id` | Get user details |
| PATCH | `/v1/admin/users/:id` | Update user |
| GET | `/v1/admin/packs` | List all packs |
| PATCH | `/v1/admin/packs/:id` | Moderate pack |
| DELETE | `/v1/admin/packs/:id` | Remove pack |

### Test Coverage

- 76 API tests passing
- E2E tests for critical paths
- Type checking across all packages
- Security audit: APPROVED

### Sprint Summary

| Sprint | Focus | Status |
|--------|-------|--------|
| 1 | Project Setup & Auth | COMPLETED |
| 2 | Skills CRUD & Storage | COMPLETED |
| 3 | Subscriptions & Stripe | COMPLETED |
| 4 | Skills API Polish | COMPLETED |
| 5 | Dashboard Auth | COMPLETED |
| 6 | Dashboard Core | COMPLETED |
| 7 | CLI Plugin Core | COMPLETED |
| 8 | CLI Install & License | COMPLETED |
| 9 | Team Management | COMPLETED |
| 10 | Analytics & Creator | COMPLETED |
| 11 | Enterprise Features | COMPLETED |
| 12 | Polish & Launch Prep | COMPLETED |
| 13 | Security & Pack Foundation | COMPLETED |
| 14 | GTM Collective Import | COMPLETED |
| 15 | CLI Pack Commands & Polish | COMPLETED |

### Documentation

- [README.md](README.md) - Project overview
- [SECURITY-AUDIT-REPORT.md](SECURITY-AUDIT-REPORT.md) - Security audit
- [loa-grimoire/prd.md](loa-grimoire/prd.md) - Product requirements
- [loa-grimoire/sdd.md](loa-grimoire/sdd.md) - System design
- [loa-grimoire/sprint.md](loa-grimoire/sprint.md) - Sprint plan

---

[1.0.0]: https://github.com/0xHoneyJar/loa-registry/releases/tag/v1.0.0

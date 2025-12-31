# Sprint Plan: Loa Skills Registry

**Version:** 1.0
**Date:** 2025-12-30
**Author:** Sprint Planner Agent
**Team:** Loa Framework + Janidev (2 developers)
**Sprint Duration:** 2.5 days each
**Total Sprints:** 12

---

## Executive Summary

This sprint plan covers the complete Loa Skills Registry implementation:
- **Phase 1 (Sprints 1-4)**: Foundation & Core API
- **Phase 2 (Sprints 5-8)**: Dashboard & CLI Plugin
- **Phase 3 (Sprints 9-10)**: Teams & Analytics
- **Phase 4 (Sprints 11-12)**: Enterprise & Polish

**Existing Assets:**
- `api/checkout/create.ts` - Stripe checkout (adaptable)
- `api/webhook/stripe.ts` - Stripe webhooks (reusable)
- `api/subscription/verify.ts` - Subscription verification (adaptable)

**Key Dependencies:**
- Neon PostgreSQL account
- Upstash Redis account
- Cloudflare R2 bucket
- Stripe account with products/prices configured
- Fly.io account for deployment
- Resend account for email

---

## Sprint 1: Project Foundation

**Goal:** Establish monorepo structure, CI/CD pipeline, and database foundation.

**Duration:** 2.5 days

### Deliverables
- [ ] Monorepo initialized with Turborepo
- [ ] API server skeleton (Hono)
- [ ] Dashboard skeleton (Next.js)
- [ ] Database schema deployed to Neon
- [ ] GitHub Actions CI pipeline
- [ ] Fly.io staging deployment

### Acceptance Criteria
- [ ] `pnpm install && pnpm build` succeeds
- [ ] `pnpm test` runs (even if minimal tests)
- [ ] API responds to `GET /v1/health` with 200
- [ ] Dashboard loads at localhost:3000
- [ ] CI runs on every PR
- [ ] Staging URL accessible at `loa-skills-staging.fly.dev`

### Technical Tasks

#### T1.1: Initialize Monorepo
> From sdd.md: §11.C Project Structure

- [ ] Create repo structure with `apps/api`, `apps/web`, `packages/shared`
- [ ] Configure `turbo.json` for build pipeline
- [ ] Set up `pnpm-workspace.yaml`
- [ ] Add root `package.json` with scripts
- [ ] Configure TypeScript with shared `tsconfig.base.json`
- [ ] Set up ESLint + Prettier with shared config

**Files:**
```
loa-skills-registry/
├── apps/
│   ├── api/package.json
│   └── web/package.json
├── packages/
│   └── shared/package.json
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── .eslintrc.js
```

#### T1.2: API Server Setup
> From sdd.md: §2.2 Backend Technologies

- [ ] Initialize `apps/api` with Hono
- [ ] Configure TypeScript
- [ ] Create app entry point (`src/index.ts`)
- [ ] Add health check endpoint (`GET /v1/health`)
- [ ] Configure environment variables
- [ ] Add development server script

**Dependencies:** Node.js 20, Hono 4.x, TypeScript 5.4.x

#### T1.3: Dashboard Setup
> From sdd.md: §2.1 Frontend Technologies

- [ ] Initialize `apps/web` with Next.js 14
- [ ] Configure App Router
- [ ] Set up Tailwind CSS
- [ ] Install shadcn/ui base components
- [ ] Create basic layout structure
- [ ] Add landing page placeholder

**Dependencies:** Next.js 14, Tailwind 3.4.x, shadcn/ui

#### T1.4: Database Schema
> From sdd.md: §3.2 Schema Design

- [ ] Set up Drizzle ORM in `apps/api`
- [ ] Create schema files for all tables:
  - `users`
  - `teams`
  - `team_members`
  - `subscriptions`
  - `api_keys`
  - `skills`
  - `skill_versions`
  - `skill_files`
  - `skill_usage`
  - `licenses`
  - `audit_logs`
- [ ] Generate initial migration
- [ ] Configure Neon connection
- [ ] Run migration on staging database

**Dependencies:** Drizzle ORM 0.30.x, drizzle-kit

#### T1.5: CI/CD Pipeline
- [ ] Create `.github/workflows/ci.yml`
  - Checkout, setup pnpm, install deps
  - TypeScript check
  - Lint
  - Unit tests
  - Build all packages
- [ ] Create `.github/workflows/deploy-staging.yml`
  - Trigger on push to main
  - Build Docker images
  - Deploy to Fly.io staging

#### T1.6: Fly.io Deployment
- [ ] Create `fly.toml` for API
- [ ] Create Dockerfile for API
- [ ] Create `fly.toml` for dashboard (or use Vercel)
- [ ] Set up environment secrets in Fly.io
- [ ] Deploy staging environment
- [ ] Verify health check accessible

### Dependencies
- Neon account created with database
- Upstash account created
- Fly.io account with CLI installed

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| Neon connection issues | Have local Postgres fallback for dev |
| Fly.io deployment failures | Debug with `fly logs`, use `fly doctor` |

### Success Metrics
- CI pipeline runs in < 5 minutes
- Staging deployment completes successfully
- Health check returns 200 within 100ms

---

## Sprint 2: Authentication System

**Goal:** Implement complete authentication with email/password and OAuth.

**Duration:** 2.5 days

### Deliverables
- [x] User registration endpoint
- [x] User login endpoint
- [x] JWT token generation and validation
- [x] Refresh token flow
- [x] GitHub OAuth flow
- [x] Google OAuth flow
- [x] Password reset flow
- [x] Email verification flow

### Acceptance Criteria
- [x] User can register with email/password
- [x] User receives verification email (via Resend)
- [x] User can login and receive JWT + refresh token
- [x] JWT expires in 15 minutes
- [x] Refresh token works for 30 days
- [x] GitHub OAuth redirects and creates user
- [x] Google OAuth redirects and creates user
- [x] Password reset email sends with valid token

### Technical Tasks

#### T2.1: Auth Service
> From sdd.md: §1.9 Security Architecture

- [x] Create `src/services/auth.ts`
- [x] Implement password hashing with bcrypt (cost factor 12)
- [x] Implement JWT signing with HS256 (jose library)
- [x] Create refresh token generation
- [x] Store refresh tokens hashed in database
- [x] Implement token validation middleware

**Code Example:**
```typescript
// src/services/auth.ts
import { sign, verify } from 'jose';
import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function generateTokens(userId: string): Promise<TokenPair> {
  const accessToken = await sign({ sub: userId }, privateKey, {
    algorithm: 'RS256',
    expiresIn: '15m',
    issuer: 'https://api.loaskills.dev',
  });
  // ...
}
```

#### T2.2: Auth Routes
> From sdd.md: §5.2 Authentication Endpoints

- [x] `POST /v1/auth/register` - Create user
- [x] `POST /v1/auth/login` - Authenticate
- [x] `POST /v1/auth/refresh` - Refresh tokens
- [x] `POST /v1/auth/logout` - Invalidate tokens
- [x] `POST /v1/auth/forgot-password` - Request reset
- [x] `POST /v1/auth/reset-password` - Reset password
- [x] `POST /v1/auth/verify` - Verify email

#### T2.3: OAuth Flows
> From sdd.md: §1.6 External Integrations

- [x] `GET /v1/auth/oauth/github` - Start GitHub OAuth
- [x] `GET /v1/auth/oauth/github/callback` - Handle callback
- [x] `GET /v1/auth/oauth/google` - Start Google OAuth
- [x] `GET /v1/auth/oauth/google/callback` - Handle callback
- [x] Link OAuth accounts to existing users by email

#### T2.4: Email Service
- [x] Set up Resend client
- [x] Create email templates:
  - Welcome / verification email
  - Password reset email
- [x] Implement `src/services/email.ts`

#### T2.5: Auth Middleware
- [x] Create `src/middleware/auth.ts`
- [x] Extract and validate JWT from Authorization header
- [x] Attach user to Hono context
- [x] Create `requireAuth` middleware
- [x] Create `optionalAuth` middleware

### Dependencies
- Sprint 1 completed (database, API skeleton)
- Resend account configured
- GitHub OAuth app created
- Google OAuth credentials created

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| OAuth callback URL issues | Test with ngrok for local dev |
| Email deliverability | Use Resend's test mode first |

### Success Metrics
- Login flow completes in < 500ms
- OAuth flow completes in < 3 seconds
- Email delivery within 30 seconds

---

## Sprint 3: Subscription Management

**Goal:** Implement Stripe integration with tiered subscriptions.

**Duration:** 2.5 days

### Deliverables
- [ ] Subscription tiers defined in Stripe
- [ ] Checkout session creation
- [ ] Stripe webhook handling
- [ ] Subscription status sync
- [ ] User tier validation
- [ ] Tier-based access control

### Acceptance Criteria
- [ ] User can initiate checkout for Pro ($29/mo)
- [ ] User can initiate checkout for Team ($99/mo)
- [ ] Successful payment updates subscription status immediately
- [ ] Failed payment triggers appropriate status change
- [ ] Subscription cancellation works
- [ ] User's effective tier is correct (personal + team)

### Technical Tasks

#### T3.1: Stripe Setup
> From sdd.md: §1.6 External Integrations

- [ ] Create Stripe products:
  - Pro Monthly ($29)
  - Pro Annual ($290)
  - Team Monthly ($99)
  - Team Annual ($990)
  - Team Seat Add-on ($15/seat/mo)
- [ ] Note all Price IDs for environment config
- [ ] Configure webhook endpoint in Stripe dashboard

#### T3.2: Adapt Existing Checkout Code
> Existing: api/checkout/create.ts

- [ ] Port logic to `src/routes/subscriptions.ts`
- [ ] Replace GitHub auth with our JWT auth
- [ ] Update price mapping for new tiers
- [ ] Add team checkout flow
- [ ] Add seat quantity handling

#### T3.3: Adapt Existing Webhook Code
> Existing: api/webhook/stripe.ts

- [ ] Port to `src/routes/webhooks.ts`
- [ ] Update handlers to write to our database
- [ ] Add `checkout.session.completed` handler
- [ ] Add `customer.subscription.updated` handler
- [ ] Add `customer.subscription.deleted` handler
- [ ] Add `invoice.payment_failed` handler

#### T3.4: Subscription Service
- [ ] Create `src/services/subscription.ts`
- [ ] Implement `getEffectiveTier(userId)` - considers personal + team
- [ ] Implement `canAccessTier(userTier, requiredTier)` - tier hierarchy
- [ ] Add Redis caching for tier lookups (5 min TTL)

#### T3.5: Billing Portal
- [ ] `POST /v1/subscriptions/portal` - Create portal session
- [ ] Customer can manage payment methods
- [ ] Customer can cancel subscription

### Dependencies
- Sprint 2 completed (auth)
- Stripe account with test mode enabled
- Stripe CLI installed for webhook testing

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| Webhook event ordering | Use idempotency keys, handle all states |
| Stripe API changes | Pin API version (2023-10-16) |

### Success Metrics
- Checkout session creates in < 1 second
- Webhook processed in < 500ms
- Tier lookup from cache in < 10ms

---

## Sprint 4: Skill Registry Core

**Goal:** Implement skill storage, versioning, and download system.

**Duration:** 2.5 days

### Deliverables
- [ ] Skill CRUD operations
- [ ] Skill version management
- [ ] File upload to R2
- [ ] Skill download with tier validation
- [ ] License generation with watermark
- [ ] Basic search functionality

### Acceptance Criteria
- [ ] Creator can publish a skill with files
- [ ] Creator can publish new versions
- [ ] User can list/search skills
- [ ] User can download skill if tier allows
- [ ] Download returns files + license token
- [ ] License contains watermark and expiry

### Technical Tasks

#### T4.1: R2 Storage Setup
> From sdd.md: §1.6 External Integrations

- [ ] Create R2 bucket `loa-skills`
- [ ] Configure CORS for API access
- [ ] Set up S3 client with R2 credentials
- [ ] Create `src/services/storage.ts`
  - `uploadFile(key, buffer, contentType)`
  - `downloadFile(key)`
  - `deleteFile(key)`
  - `getSignedUrl(key, expiresIn)`

#### T4.2: Skill Routes
> From sdd.md: §5.3 Skills Endpoints

- [ ] `GET /v1/skills` - List with search, filter, pagination
- [ ] `GET /v1/skills/:slug` - Get skill details
- [ ] `GET /v1/skills/:slug/versions` - List versions
- [ ] `GET /v1/skills/:slug/download` - Download with license
- [ ] `GET /v1/skills/:slug/validate` - Validate license
- [ ] `POST /v1/skills` - Create skill (creator only)
- [ ] `POST /v1/skills/:slug/versions` - Publish version

#### T4.3: License Service
> From prd.md: FR-4 License Enforcement

- [ ] Create `src/services/license.ts`
- [ ] Generate license tokens with:
  - User ID
  - Skill slug
  - Version
  - Tier
  - Expiry (subscription end or fixed period)
  - Watermark (unique hash)
- [ ] Sign license tokens with JWT
- [ ] Validate licenses (check signature, expiry, tier)

#### T4.4: Search Implementation
- [ ] Implement full-text search with PostgreSQL
- [ ] Use GIN index on skill name + description
- [ ] Add filters: category, tier, tags
- [ ] Add sorting: downloads, rating, newest, name
- [ ] Cache search results (1 min TTL)

#### T4.5: Usage Tracking
- [ ] Record downloads in `skill_usage` table
- [ ] Increment `skills.downloads` counter
- [ ] Track version-specific usage

### Dependencies
- Sprint 3 completed (subscriptions for tier validation)
- Cloudflare R2 bucket created
- R2 API credentials configured

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| Large file uploads | Chunked uploads, size limits (10MB) |
| R2 connectivity | Implement retry logic |

### Success Metrics
- Skill search in < 200ms
- File download starts in < 500ms
- License generation in < 50ms

---

## Sprint 5: Dashboard Authentication

**Goal:** Build dashboard authentication pages and flows.

**Duration:** 2.5 days

### Deliverables
- [x] Login page
- [x] Register page
- [x] OAuth buttons (GitHub, Google)
- [x] Email verification page
- [x] Forgot password page
- [x] Reset password page
- [x] Protected route wrapper
- [x] User session management

### Acceptance Criteria
- [x] User can register via form
- [x] User can login via form
- [x] OAuth buttons redirect correctly
- [x] After auth, user lands on dashboard
- [x] Unauthenticated users redirected to login
- [x] Session persists across browser refresh
- [x] Logout clears session

### Technical Tasks

#### T5.1: Auth Layout
> From sdd.md: §4.4 Component Architecture

- [x] Create `app/(auth)/layout.tsx`
- [x] Add centered card layout
- [x] Include logo and branding
- [x] Add responsive styling

#### T5.2: Login Page
- [x] Create `app/(auth)/login/page.tsx`
- [x] Build LoginForm component
  - Email input
  - Password input
  - Remember me checkbox
  - Submit button
- [x] Add OAuth buttons (GitHub, Google)
- [x] Handle form validation with Zod
- [x] Call API `POST /v1/auth/login`
- [x] Store tokens in secure cookie

#### T5.3: Register Page
- [x] Create `app/(auth)/register/page.tsx`
- [x] Build RegisterForm component
  - Name input
  - Email input
  - Password input
  - Confirm password
  - Terms acceptance
- [x] Add OAuth buttons
- [x] Call API `POST /v1/auth/register`
- [x] Show success message, prompt email verification

#### T5.4: Password Reset Pages
- [x] Create `app/(auth)/forgot-password/page.tsx`
- [x] Create `app/(auth)/reset-password/page.tsx`
- [x] Handle token from URL
- [x] Call appropriate API endpoints

#### T5.5: Auth Provider
- [x] Set up NextAuth.js v5 or custom auth context
- [x] Store JWT in httpOnly cookie
- [x] Implement token refresh logic
- [x] Create `useAuth()` hook
- [x] Create `<ProtectedRoute>` component

### Dependencies
- Sprint 2 completed (auth API)
- shadcn/ui components installed

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| CORS issues with API | Configure API CORS for dashboard domain |
| Cookie security | Use httpOnly, secure, sameSite=strict |

### Success Metrics
- Login flow < 2 seconds
- Page load < 1 second
- Lighthouse accessibility > 90

---

## Sprint 6: Dashboard Core Pages

**Goal:** Build main dashboard pages including skill browser and billing.

**Duration:** 2.5 days

### Deliverables
- [ ] Dashboard home page
- [ ] Skill browser page
- [ ] Skill detail page
- [ ] Billing page
- [ ] Profile page
- [ ] API keys page
- [ ] Dashboard sidebar/navigation

### Acceptance Criteria
- [ ] Dashboard shows user stats
- [ ] Skill browser loads skills with search/filter
- [ ] Skill detail shows full info + install instructions
- [ ] Billing shows current plan + upgrade options
- [ ] Profile allows name/avatar updates
- [ ] API keys can be created/revoked

### Technical Tasks

#### T6.1: Dashboard Layout
> From sdd.md: §4.4 Component Architecture

- [ ] Create `app/(dashboard)/layout.tsx`
- [ ] Build Sidebar component
  - Navigation links
  - User avatar + dropdown
  - Tier badge
- [ ] Build Header component
- [ ] Implement responsive mobile menu

#### T6.2: Dashboard Home
- [ ] Create `app/(dashboard)/dashboard/page.tsx`
- [ ] Show user stats:
  - Skills installed
  - Current tier
  - Usage this month
- [ ] Show recent activity
- [ ] Quick action buttons

#### T6.3: Skill Browser
> From sdd.md: §4.3 Page/View Structure

- [ ] Create `app/(dashboard)/skills/page.tsx`
- [ ] Build SkillGrid component
- [ ] Build SkillCard component
- [ ] Build SkillFilters component
  - Category dropdown
  - Tier filter
  - Tag filter
- [ ] Build SearchInput component
- [ ] Implement pagination
- [ ] Use TanStack Query for data fetching

#### T6.4: Skill Detail
- [ ] Create `app/(dashboard)/skills/[slug]/page.tsx`
- [ ] Show skill info, description, rating
- [ ] Show version history
- [ ] Show install instructions (CLI command)
- [ ] Show tier requirement
- [ ] Add "Install" button (links to CLI)

#### T6.5: Billing Page
- [ ] Create `app/(dashboard)/billing/page.tsx`
- [ ] Show current plan details
- [ ] Build PlanSelector component
- [ ] Integrate Stripe Checkout
- [ ] Show billing history (from Stripe)
- [ ] Add "Manage Subscription" button (portal)

#### T6.6: Profile Page
- [ ] Create `app/(dashboard)/profile/page.tsx`
- [ ] Build ProfileForm component
- [ ] Avatar upload with preview
- [ ] Name editing
- [ ] Email display (read-only)
- [ ] Password change section

#### T6.7: API Keys Page
- [ ] Create `app/(dashboard)/api-keys/page.tsx`
- [ ] List existing keys (showing prefix only)
- [ ] Create new key dialog
  - Name input
  - Scope selection
  - Expiry selection
- [ ] Show full key only once after creation
- [ ] Revoke key functionality

### Dependencies
- Sprint 5 completed (auth pages)
- Sprint 4 completed (skills API)
- Sprint 3 completed (billing API)

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| Large skill lists | Virtualized list, pagination |
| API key exposure | Never send full key after creation |

### Success Metrics
- Skill browser page load < 1.5 seconds
- Search results update < 500ms
- All pages pass accessibility audit

---

## Sprint 7: CLI Plugin Core

**Goal:** Build Loa CLI plugin with core commands.

**Duration:** 2.5 days

### Deliverables
- [x] Plugin package structure
- [x] `/skill-login` command
- [x] `/skill-logout` command
- [x] `/skill-list` command
- [x] `/skill-search` command
- [x] `/skill-info` command
- [x] Credential storage

### Acceptance Criteria
- [x] Plugin installable in Loa projects
- [x] User can authenticate with API key
- [x] User can view installed skills
- [x] User can search registry
- [x] User can view skill details
- [x] Credentials persist across sessions

### Technical Tasks

#### T7.1: Plugin Structure
> From context: loa-plugin-architecture.md

- [ ] Create `packages/loa-registry/`
- [ ] Set up TypeScript config
- [ ] Create package.json with proper exports
- [ ] Build with tsup
- [ ] Export as Loa plugin

**Structure:**
```
packages/loa-registry/
├── src/
│   ├── index.ts           # Plugin entry
│   ├── client.ts          # API client
│   ├── auth.ts            # Credential management
│   ├── cache.ts           # Skill caching
│   ├── commands/
│   │   ├── login.ts
│   │   ├── logout.ts
│   │   ├── list.ts
│   │   ├── search.ts
│   │   └── info.ts
│   └── types.ts
├── package.json
└── tsconfig.json
```

#### T7.2: API Client
> From context: loa-plugin-architecture.md:96-262

- [ ] Create `RegistryClient` class
- [ ] Implement methods:
  - `login(email, password)`
  - `getCurrentUser()`
  - `listSkills(options)`
  - `getSkill(slug)`
  - `downloadSkill(slug, version)`
  - `validateLicense(slug)`
- [ ] Handle errors with `RegistryError` class
- [ ] Add retry logic for transient failures

#### T7.3: Credential Storage
- [ ] Use `conf` for config storage
- [ ] Use `keytar` for secure credential storage
- [ ] Store in `~/.loa-registry/`
- [ ] Support multiple registries
- [ ] Support API key from environment variable

#### T7.4: Login Command
> From context: loa-plugin-architecture.md:336-420

- [ ] Accept API key from env `LOA_SKILLS_API_KEY`
- [ ] Interactive prompt if no env key
- [ ] Validate key with API
- [ ] Store credentials securely
- [ ] Display user info and tier

#### T7.5: List Command
- [ ] Show installed skills with status
- [ ] Show available skills from registry
- [ ] Group by tier access
- [ ] Mark installed skills with checkmark
- [ ] Show license status (valid/expired)

#### T7.6: Search Command
- [ ] Accept search query
- [ ] Display results in table format
- [ ] Show name, description, tier, downloads
- [ ] Support filters: --category, --tier

#### T7.7: Info Command
- [ ] Fetch skill details by slug
- [ ] Display full description
- [ ] Show version history
- [ ] Show installation instructions
- [ ] Show tier requirement

### Dependencies
- Sprint 4 completed (skills API)
- Sprint 2 completed (auth API for key validation)
- Loa CLI plugin interface documented

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| Cross-platform credential storage | Test on macOS, Linux, Windows |
| Plugin loading issues | Clear documentation, error messages |

### Success Metrics
- Command execution < 1 second
- Search results in < 500ms
- Plugin size < 500KB

---

## Sprint 8: CLI Install & License

**Goal:** Implement skill installation and license validation.

**Duration:** 2.5 days

### Deliverables
- [x] `/skill-install` command
- [x] `/skill-update` command
- [x] `/skill-uninstall` command
- [x] License file generation
- [x] Runtime license validation hook
- [x] Offline caching

### Acceptance Criteria
- [x] User can install skill by slug
- [x] Skill files written to `.claude/skills/{slug}/`
- [x] License file created with expiry
- [x] User can update to latest version
- [x] User can uninstall skill
- [x] Skills work offline (within grace period)
- [x] Invalid license blocks skill loading

### Technical Tasks

#### T8.1: Install Command
> From context: loa-plugin-architecture.md:425-538

- [ ] Accept skill slug and optional version
- [ ] Check subscription tier against requirement
- [ ] Download skill files from API
- [ ] Write files to `.claude/skills/{slug}/`
- [ ] Write `.license.json` with license token
- [ ] Record installation in registry
- [ ] Display success with usage hint

#### T8.2: Update Command
- [ ] Check for newer version
- [ ] Download if available
- [ ] Replace files
- [ ] Update license
- [ ] Keep user-modified files (warn)

#### T8.3: Uninstall Command
- [ ] Remove skill directory
- [ ] Record uninstall in registry
- [ ] Clear from cache

#### T8.4: License Validation Hook
> From context: loa-plugin-architecture.md:643-728

- [ ] Create `skill:beforeLoad` hook
- [ ] Check for `.license.json`
- [ ] If no license, allow (not a registry skill)
- [ ] If license exists:
  - Check expiry with buffer
  - If valid, allow
  - If expired, try refresh
  - If refresh fails, check grace period
  - If grace period passed, deny

#### T8.5: Offline Cache
- [ ] Cache skill downloads in `~/.loa-registry/cache/`
- [ ] Cache license tokens
- [ ] 24-hour grace period for offline
- [ ] Clear cache on uninstall
- [ ] Implement `clearCache()` command

#### T8.6: Error Handling
- [ ] Clear messages for tier restrictions
- [ ] Upgrade prompt with URL
- [ ] Network error handling
- [ ] Offline mode indication

### Dependencies
- Sprint 7 completed (CLI core)
- Sprint 4 completed (download API)

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| File permission issues | Check write access first, clear errors |
| License bypass attempts | Server-side validation, watermarking |

### Success Metrics
- Install < 3 seconds
- License validation < 100ms
- Offline mode works within grace period

---

## Sprint 9: Team Management

**Goal:** Implement team creation and member management.

**Duration:** 2.5 days

### Deliverables
- [x] Team CRUD API
- [x] Member invitation API
- [x] Role management
- [x] Team subscription
- [x] Team dashboard pages
- [x] Seat management

### Acceptance Criteria
- [x] User can create team with slug
- [x] Owner can invite members by email
- [x] Members receive invitation email
- [x] Members can accept invitation
- [x] Roles work: owner, admin, member
- [x] Team subscription gives all members access
- [x] Seat limits enforced

### Technical Tasks

#### T9.1: Team API Routes
> From sdd.md: §5.4 (implied from PRD FR-6)

- [x] `GET /v1/teams` - List user's teams
- [x] `POST /v1/teams` - Create team
- [x] `GET /v1/teams/:slug` - Get team details
- [x] `PATCH /v1/teams/:slug` - Update team
- [x] `DELETE /v1/teams/:slug` - Delete team

#### T9.2: Member API Routes
- [x] `GET /v1/teams/:slug/members` - List members
- [x] `POST /v1/teams/:slug/invitations` - Invite member
- [x] `PATCH /v1/teams/:slug/members/:id` - Update role
- [x] `DELETE /v1/teams/:slug/members/:id` - Remove member

#### T9.3: Invitation Flow
- [x] Generate invitation token
- [x] Store invitation in database
- [x] Send invitation email via Resend
- [x] Handle invitation acceptance
- [x] Link user to team

#### T9.4: Team Subscription Integration
- [x] Team checkout flow (seats)
- [x] Update `getEffectiveTier` to check team memberships
- [x] Seat counting and enforcement
- [x] Seat add-on purchasing

#### T9.5: Team Dashboard Pages
- [x] Create `app/(dashboard)/team/page.tsx`
- [x] Member list with roles
- [x] Invite member dialog
- [x] Role change dropdown
- [x] Remove member button
- [x] Team settings

#### T9.6: Team Billing Page
- [x] Create `app/(dashboard)/team/billing/page.tsx`
- [x] Show team plan
- [x] Seat usage (used/total)
- [x] Add seat button
- [x] Billing history

### Dependencies
- Sprint 3 completed (subscriptions)
- Sprint 6 completed (dashboard pages)

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| Invitation abuse | Rate limit invitations, expiry |
| Role escalation | Server-side permission checks |

### Success Metrics
- Team creation < 500ms
- Invitation email < 30 seconds
- Member list load < 500ms

---

## Sprint 10: Analytics & Creator Dashboard

**Goal:** Implement usage tracking and creator analytics.

**Duration:** 2.5 days

### Deliverables
- [ ] Usage tracking API
- [ ] User analytics dashboard
- [ ] Creator analytics dashboard
- [ ] Skill publishing UI
- [ ] Usage metrics aggregation

### Acceptance Criteria
- [ ] Users see their skill usage stats
- [ ] Creators see download counts
- [ ] Creators see active installs
- [ ] Creators can publish new skills
- [ ] Creators can publish new versions
- [ ] Usage data aggregated efficiently

### Technical Tasks

#### T10.1: Usage API
> From prd.md: FR-7 Analytics & Reporting

- [ ] `GET /v1/users/me/usage` - User usage stats
- [ ] Track skill loads, installs, period breakdown
- [ ] Return usage by skill

#### T10.2: User Analytics Dashboard
- [ ] Update dashboard home with usage charts
- [ ] Skills used this month
- [ ] Usage trend graph
- [ ] Top skills used

#### T10.3: Creator API
- [ ] `GET /v1/creator/skills` - Creator's skills
- [ ] `GET /v1/creator/skills/:slug/analytics` - Skill analytics
- [ ] Download count, active installs, rating

#### T10.4: Creator Dashboard Page
- [ ] Create `app/(dashboard)/creator/page.tsx`
- [ ] List creator's skills
- [ ] Download/install stats per skill
- [ ] Rating display
- [ ] Revenue (future, placeholder)

#### T10.5: Skill Publishing UI
- [ ] Create skill form
  - Name, slug, description
  - Category, tags
  - Tier requirement
  - File upload
- [ ] Version publishing form
- [ ] Changelog input
- [ ] Preview before publish

#### T10.6: Usage Aggregation
- [ ] Background job for daily aggregation
- [ ] Efficient queries with materialized views
- [ ] Cache aggregated data

### Dependencies
- Sprint 4 completed (skills API)
- Sprint 6 completed (dashboard)

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| High write load | Batch inserts, async processing |
| Large data volumes | Aggregation, time-limited queries |

### Success Metrics
- Analytics page load < 1 second
- Usage tracking < 50ms overhead
- Accurate download counts

---

## Sprint 11: Enterprise Features

**Goal:** Implement SSO, audit logs, and admin capabilities.

**Duration:** 2.5 days

### Deliverables
- [ ] SSO/SAML support (DEFERRED - requires frontend)
- [x] Audit logging
- [ ] Admin panel (DEFERRED - requires frontend)
- [x] Rate limiting enhancement
- [x] Security hardening

### Acceptance Criteria
- [ ] Enterprise team can configure SSO (DEFERRED)
- [ ] SAML login flow works (DEFERRED)
- [x] All sensitive actions logged
- [ ] Admin can view users, skills, metrics (DEFERRED)
- [x] Rate limits enforced per tier
- [x] Security headers in place

### Technical Tasks

#### T11.1: SSO/SAML Integration (DEFERRED)
- [ ] Add SAML provider configuration
- [ ] Implement SAML authentication flow
- [ ] Link SAML users to team
- [ ] SSO-only mode for enterprise teams

#### T11.2: Audit Logging
> From sdd.md: §3.2 audit_logs table

- [x] Create audit log service
- [x] Log events:
  - User login/logout
  - Subscription changes
  - Team member changes
  - Skill install/uninstall
  - API key creation/revocation
- [x] Include IP, user agent, metadata

#### T11.3: Admin Panel (DEFERRED)
- [ ] Create `app/(admin)/admin/page.tsx`
- [ ] User management (list, search, disable)
- [ ] Skill management (list, feature, remove)
- [ ] Platform metrics dashboard
- [ ] Audit log viewer

#### T11.4: Enhanced Rate Limiting
> From sdd.md: §5.5 Rate Limiting

- [x] Implement sliding window rate limiting
- [x] Per-tier rate limits
- [x] Per-endpoint limits
- [x] Rate limit headers
- [x] 429 responses with retry-after

#### T11.5: Security Hardening
- [x] Security headers middleware
- [x] CORS configuration
- [x] Input sanitization
- [x] SQL injection prevention (Drizzle handles)
- [x] XSS prevention (React handles)
- [x] CSRF protection

### Dependencies
- Sprint 9 completed (teams)
- All core features completed

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| SAML complexity | Use tested library (saml2-js) |
| Audit log volume | Efficient writes, retention policy |

### Success Metrics
- SAML login < 5 seconds
- Audit log write < 10ms
- Admin page load < 2 seconds

---

## Sprint 12: Polish & Launch Prep

**Goal:** Final polish, testing, documentation, and launch preparation.

**Duration:** 2.5 days

### Deliverables
- [x] End-to-end testing
- [ ] Performance optimization (deferred)
- [x] Documentation
- [ ] Marketing site updates (deferred)
- [x] Production deployment
- [x] Monitoring setup

### Acceptance Criteria
- [x] All E2E tests pass
- [ ] Performance targets met (deferred)
- [x] API documentation complete
- [ ] Landing page live (deferred)
- [x] Production deployment verified
- [x] Monitoring alerts configured

### Technical Tasks

#### T12.1: E2E Testing
- [x] Set up Playwright
- [x] Test critical flows:
  - Registration → Login → Skill browse
  - Subscription checkout
  - Skill installation (CLI)
  - Team creation → Invite
- [x] CI integration for E2E

#### T12.2: Performance Optimization (DEFERRED)
- [ ] Profile API endpoints
- [ ] Optimize slow queries
- [ ] Verify caching effectiveness
- [ ] Load test with expected traffic
- [ ] Optimize bundle sizes (dashboard)

#### T12.3: Documentation
- [x] API documentation (OpenAPI)
- [ ] CLI plugin documentation
- [ ] Getting started guide
- [ ] FAQ
- [ ] Troubleshooting guide

#### T12.4: Marketing Site (DEFERRED)
- [ ] Create landing page
- [ ] Pricing page with tier comparison
- [ ] Feature highlights
- [ ] Social proof (testimonials)
- [ ] CTA buttons

#### T12.5: Production Deployment
- [x] Configure production environment
- [ ] Set production secrets (runtime config)
- [ ] Deploy API to production Fly.io (runtime)
- [ ] Deploy dashboard to production (runtime)
- [ ] DNS configuration (runtime)
- [ ] SSL verification (runtime)

#### T12.6: Monitoring & Alerting
- [x] Set up Sentry for errors (interface ready)
- [ ] Configure PostHog for analytics (runtime)
- [x] Set up uptime monitoring (health endpoints)
- [ ] Configure PagerDuty/alerts for critical errors (runtime)
- [ ] Create runbook for common issues

### Dependencies
- All previous sprints completed
- Production accounts ready (Fly.io, Neon, etc.)

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| Last-minute bugs | Prioritize, fix critical only |
| Performance issues | Have rollback plan |

### Success Metrics
- All E2E tests pass
- API response < 200ms p95
- Zero critical bugs
- 99.9% uptime in first week

---

## Risk Register

| ID | Risk | Probability | Impact | Sprint | Mitigation |
|----|------|-------------|--------|--------|------------|
| R1 | Team inexperience with stack | High | Medium | All | Detailed tasks, pair programming |
| R2 | Stripe integration issues | Medium | High | 3 | Start early, use test mode |
| R3 | OAuth callback problems | Medium | Medium | 2 | Test with ngrok, clear docs |
| R4 | Performance bottlenecks | Medium | Medium | 12 | Profile early, load test |
| R5 | Security vulnerabilities | Medium | Critical | 11 | Security review, OWASP guidelines |
| R6 | Scope creep | Medium | High | All | Strict MVP focus, defer features |
| R7 | External service outages | Low | Medium | All | Graceful degradation, retries |

---

## Appendix

### A. Environment Variables

```bash
# API Server
DATABASE_URL=
REDIS_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=loa-skills
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_TEAM_PRICE_ID=
JWT_PRIVATE_KEY=
JWT_PUBLIC_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
SENTRY_DSN=
```

### B. External Account Setup Checklist

- [ ] Neon: Create project, note connection string
- [ ] Upstash: Create Redis database, note URL
- [ ] Cloudflare: Create R2 bucket, generate API tokens
- [ ] Stripe: Create account, set up products/prices, webhook
- [ ] Fly.io: Create account, install CLI, create app
- [ ] GitHub OAuth: Create app, note credentials
- [ ] Google OAuth: Create project, configure consent, note credentials
- [ ] Resend: Create account, verify domain, note API key
- [ ] Sentry: Create project, note DSN
- [ ] PostHog: Create project, note API key

### C. Sprint Calendar (2.5-day sprints)

| Sprint | Start | End | Focus |
|--------|-------|-----|-------|
| 1 | Day 1 | Day 2.5 | Foundation |
| 2 | Day 3 | Day 5.5 | Authentication |
| 3 | Day 6 | Day 8.5 | Subscriptions |
| 4 | Day 9 | Day 11.5 | Skills Core |
| 5 | Day 12 | Day 14.5 | Dashboard Auth |
| 6 | Day 15 | Day 17.5 | Dashboard Core |
| 7 | Day 18 | Day 20.5 | CLI Core |
| 8 | Day 21 | Day 23.5 | CLI Install |
| 9 | Day 24 | Day 26.5 | Teams |
| 10 | Day 27 | Day 29.5 | Analytics |
| 11 | Day 30 | Day 32.5 | Enterprise |
| 12 | Day 33 | Day 35.5 | Polish |

**Total Duration:** ~36 days (7-8 weeks)

---

*Generated by Sprint Planner Agent*
*Based on PRD (loa-grimoire/prd.md) and SDD (loa-grimoire/sdd.md)*

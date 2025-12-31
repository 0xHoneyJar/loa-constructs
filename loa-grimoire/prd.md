# Product Requirements Document: Loa Skills Registry

**Version:** 1.0
**Date:** 2025-12-30
**Author:** PRD Architect Agent
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Goals & Success Metrics](#goals--success-metrics)
4. [User Personas & Use Cases](#user-personas--use-cases)
5. [Functional Requirements](#functional-requirements)
6. [Non-Functional Requirements](#non-functional-requirements)
7. [User Experience](#user-experience)
8. [Technical Considerations](#technical-considerations)
9. [Scope & Prioritization](#scope--prioritization)
10. [Success Criteria](#success-criteria)
11. [Risks & Mitigation](#risks--mitigation)
12. [Timeline & Milestones](#timeline--milestones)
13. [Appendix](#appendix)

---

## Executive Summary

Loa Skills Registry is a SaaS platform for distributing, licensing, and monetizing AI agent skills compatible with the Loa framework and Claude Code. The platform provides a subscription-based marketplace where skill creators can publish skills and users can discover, install, and use them seamlessly via CLI integration.

The registry solves three critical problems in the Loa ecosystem: (1) skill creators have no way to monetize their work or control distribution, (2) users lack centralized discovery, update mechanisms, and quality assurance, and (3) teams cannot manage skills across their organization. By providing tiered subscriptions (Free, Pro, Team, Enterprise), robust license enforcement, and deep CLI integration, Loa Skills Registry enables a sustainable ecosystem for AI agent skill development and distribution.

> **Sources**: README.md:1-18, prd.md:1-26

---

## Problem Statement

### The Problem

AI agent skills for Loa and Claude Code are currently distributed through ad-hoc methods with no formal distribution, licensing, or monetization infrastructure.

> From prd.md:9-16: "Currently, Loa skills are distributed via: Copy/paste from repositories, Manual file sharing, No access control or monetization"

### User Pain Points

**For Skill Creators:**
- No way to monetize skills or control distribution
- No visibility into usage or adoption
- No mechanism for version management or updates

**For Skill Consumers:**
- No central discovery mechanism
- No update mechanism for installed skills
- No quality assurance or curation

**For Teams:**
- No way to manage skills across an organization
- No seat management or shared subscriptions
- No usage analytics or audit trails

> **Sources**: prd.md:12-16

### Current State

Users discover skills through word-of-mouth, GitHub repositories, or manual sharing. Installation requires copying files manually into the `.claude/skills/` directory. There's no way to track versions, receive updates, or validate that skills are legitimate and safe.

### Desired State

A centralized registry where:
- Creators publish, version, and monetize skills
- Users discover, install, and update skills via CLI
- Teams manage subscriptions, seats, and usage
- The platform ensures license compliance and tracks usage

> **Sources**: prd.md:18-26

---

## Goals & Success Metrics

### Primary Goals

1. **Build the marketplace infrastructure** - Core registry API, skill storage, and CLI integration
2. **Enable monetization** - Subscription tiers with Stripe integration
3. **Support teams** - Multi-seat subscriptions with analytics and management

> **Sources**: prd.md:243-246

### Key Performance Indicators (KPIs)

| Metric | Current Baseline | Target | Timeline |
|--------|------------------|--------|----------|
| Registered Users | 0 | 1,000 | 6 months |
| Free-to-Paid Conversion | N/A | 10% | 6 months |
| Monthly Retention (Paid) | N/A | 80% | Ongoing |
| NPS Score | N/A | >40 | 6 months |

> **Sources**: prd.md:234-239

### Constraints

- Must integrate with existing Loa CLI architecture
- Skill format must remain compatible with `.claude/skills/` structure
- AGPL-3.0 license for the platform itself

> **Sources**: README.md:232-233

---

## User Personas & Use Cases

### Primary Persona: Skill Creator (Developer Dana)

**Demographics:**
- Role: Independent developer or technical consultant
- Technical Proficiency: High (builds custom AI workflows)
- Goals: Monetize expertise, build reputation, track adoption

**Behaviors:**
- Creates specialized skills for specific domains (DevOps, marketing, security)
- Wants to iterate quickly with version updates
- Needs visibility into downloads and usage

**Pain Points:**
- No distribution channel for skills
- Cannot monetize work
- No feedback loop on skill usage

> **Sources**: prd.md:29-33

### Secondary Persona: Skill Consumer (Engineer Eric)

**Demographics:**
- Role: Software developer using Loa/Claude Code
- Technical Proficiency: Medium-High
- Goals: Find and install useful skills quickly

**Behaviors:**
- Searches for skills by function/category
- Prefers CLI-based workflows
- Wants automatic updates

**Pain Points:**
- Manual skill discovery is time-consuming
- No way to validate skill quality
- Keeping skills updated is tedious

> **Sources**: prd.md:34-37

### Tertiary Persona: Team Admin (Manager Maria)

**Demographics:**
- Role: Engineering manager or DevOps lead
- Technical Proficiency: Medium
- Goals: Standardize team workflows, control costs

**Behaviors:**
- Manages team subscriptions and seats
- Reviews usage analytics
- Approves skill installations for the team

**Pain Points:**
- No visibility into team skill usage
- Cannot control which skills team uses
- No centralized billing

> **Sources**: prd.md:35-37, US-050 to US-054

### Use Cases

#### UC-1: Install a Skill via CLI

**Actor:** Skill Consumer (Engineer Eric)
**Preconditions:** User has Loa CLI installed, is authenticated with registry
**Flow:**
1. User runs `/skill-search devops`
2. User reviews results showing skill names, descriptions, and tier requirements
3. User runs `/skill-install terraform-assistant`
4. CLI validates subscription tier and downloads skill
5. Skill files are written to `.claude/skills/terraform-assistant/`
6. License file created with watermark and expiry

**Postconditions:** Skill available for use, usage tracked
**Acceptance Criteria:**
- [ ] Skill files correctly placed in project
- [ ] License validated before download
- [ ] Usage recorded in registry

> **Sources**: loa-plugin-architecture.md:425-538, US-030 to US-035

#### UC-2: Subscribe to Pro Tier

**Actor:** Skill Consumer
**Preconditions:** User has free account
**Flow:**
1. User visits dashboard or runs `/skill-upgrade`
2. User selects Pro tier ($29/month)
3. User redirected to Stripe Checkout
4. User completes payment
5. Subscription activated immediately

**Postconditions:** User has Pro tier access, can download Pro skills
**Acceptance Criteria:**
- [ ] Stripe checkout completes successfully
- [ ] Subscription status updated in real-time
- [ ] Pro skills accessible immediately

> **Sources**: openapi.yaml:648-686, US-010 to US-014

#### UC-3: Manage Team Seats

**Actor:** Team Admin
**Preconditions:** User has Team subscription, is team owner/admin
**Flow:**
1. Admin opens team dashboard
2. Admin clicks "Invite Member"
3. Admin enters email and role (admin/member)
4. Invitation email sent
5. New member accepts, gains team subscription access

**Postconditions:** New member has skill access via team subscription
**Acceptance Criteria:**
- [ ] Invitation email sent
- [ ] Seat count validated against subscription
- [ ] New member inherits team tier

> **Sources**: openapi.yaml:867-899, US-050 to US-054

---

## Functional Requirements

### FR-1: Authentication System

**Priority:** Must Have
**Description:** Multi-method authentication supporting email/password, OAuth (GitHub, Google), SSO/SAML for enterprise, and API keys for CLI access.

**Acceptance Criteria:**
- [ ] Email/password registration with email verification
- [ ] OAuth flow for GitHub and Google
- [ ] JWT access tokens (15 min expiry) with refresh tokens (30 day)
- [ ] API key generation with scopes and expiry
- [ ] Password reset flow

**Dependencies:** None

> **Sources**: prd.md:157-163, sdd.md:714-749, openapi.yaml:107-334

### FR-2: Subscription Management

**Priority:** Must Have
**Description:** Stripe-based subscription system with four tiers: Free, Pro ($29/mo), Team ($99/mo + $15/seat), Enterprise (custom).

**Acceptance Criteria:**
- [ ] Stripe Checkout integration for upgrades
- [ ] Customer Portal for subscription management
- [ ] Webhook handling for subscription lifecycle events
- [ ] Proration handling for upgrades/downgrades
- [ ] Usage metering for free tier limits (100 loads/month)

**Dependencies:** Stripe account configuration

> **Sources**: prd.md:115-153, 164-169, openapi.yaml:634-735

### FR-3: Skill Registry

**Priority:** Must Have
**Description:** Core skill storage, versioning, and discovery system.

**Acceptance Criteria:**
- [ ] Skill CRUD operations
- [ ] Semantic versioning (semver) for skill versions
- [ ] Category and tag-based organization
- [ ] Full-text search across skill names and descriptions
- [ ] Skill file storage in S3/R2

**Dependencies:** S3-compatible storage

> **Sources**: prd.md:170-176, sdd.md:279-330, openapi.yaml:392-541

### FR-4: License Enforcement

**Priority:** Must Have
**Description:** Runtime license validation ensuring users can only access skills their subscription tier permits.

**Acceptance Criteria:**
- [ ] Tier validation on skill download
- [ ] License tokens with expiry (cache_ttl)
- [ ] Watermarking for tracking
- [ ] 24-hour offline grace period
- [ ] Clear error messages with upgrade prompts

**Dependencies:** FR-2 (Subscription Management)

> **Sources**: prd.md:177-182, loa-plugin-architecture.md:643-728, openapi.yaml:499-573

### FR-5: CLI Integration (Loa Plugin)

**Priority:** Must Have
**Description:** Loa CLI plugin enabling skill discovery, installation, and management.

**Commands:**
- `/skill-login` - Authenticate with registry
- `/skill-logout` - Clear credentials
- `/skill-list` - List installed and available skills
- `/skill-search` - Search registry
- `/skill-install` - Install skill
- `/skill-update` - Update skill to latest version
- `/skill-uninstall` - Remove skill
- `/skill-info` - Show skill details

**Acceptance Criteria:**
- [ ] All commands implemented per specification
- [ ] Offline caching with license validation
- [ ] Clear error messages for tier restrictions
- [ ] Progress indication for downloads

**Dependencies:** Registry API (FR-1 through FR-4)

> **Sources**: loa-plugin-architecture.md:1-947, IMPLEMENTATION-PROMPT.md:124-144

### FR-6: Team Management

**Priority:** Should Have (Phase 2)
**Description:** Team creation, member management, and shared subscriptions.

**Acceptance Criteria:**
- [ ] Team creation with slug
- [ ] Member invitation via email
- [ ] Role-based access (owner, admin, member)
- [ ] Seat management against subscription limit
- [ ] Team-level usage analytics

**Dependencies:** FR-2 (Subscription Management)

> **Sources**: prd.md:190-194, sdd.md:189-214, openapi.yaml:737-949

### FR-7: Analytics & Reporting

**Priority:** Should Have (Phase 2)
**Description:** Usage tracking for users, teams, creators, and platform admins.

**Acceptance Criteria:**
- [ ] User usage stats (skill loads, installs by period)
- [ ] Team aggregate analytics
- [ ] Creator dashboards (downloads, active installs)
- [ ] Platform-level metrics

**Dependencies:** FR-3 (Skill Registry), FR-6 (Team Management)

> **Sources**: prd.md:195-200, sdd.md:362-378, openapi.yaml:372-391

---

## Non-Functional Requirements

### Performance

- API response time < 200ms (p95)
- Skill download < 2 seconds
- Support 10,000 concurrent users

> **Sources**: prd.md:204-208

### Scalability

- Horizontal scaling for API servers
- CDN caching for skill file delivery (24h TTL)
- Database connection pooling

> **Sources**: prd.md:221-224, sdd.md:810-840

### Security

- All traffic over HTTPS
- API keys hashed with bcrypt before storage
- JWT with short expiry (15 min) + refresh tokens
- Audit logging for sensitive actions
- License watermarking for tracking

> **Sources**: prd.md:213-218, sdd.md:709-806

### Reliability

- 99.9% uptime SLA
- Graceful degradation (cached skills work offline)
- Multi-region deployment capability

> **Sources**: prd.md:209-212

### Compliance

- SOC 2 compliance (future roadmap)
- GDPR considerations for EU users

> **Sources**: prd.md:218

---

## User Experience

### Key User Flows

#### Flow 1: First-Time Skill Installation
```
/skill-login → Enter credentials → /skill-search → Review results → /skill-install <slug> → Skill ready
```

#### Flow 2: Subscription Upgrade
```
Dashboard → View tiers → Select Pro → Stripe Checkout → Payment → Access unlocked
```

#### Flow 3: Team Onboarding
```
Create team → Subscribe to Team tier → Invite members → Members accept → Team skills accessible
```

> **Sources**: loa-plugin-architecture.md:336-420

### Interaction Patterns

- CLI-first for developers (all core functionality via commands)
- Web dashboard for account management, billing, analytics
- Email for notifications (invitations, subscription changes)

### Accessibility Requirements

- Web dashboard meets WCAG 2.1 AA standards
- CLI provides clear, parseable output for automation
- Error messages include actionable next steps

---

## Technical Considerations

### Architecture Notes

Three-tier architecture:
1. **API Layer**: Hono (Node.js) REST API
2. **Data Layer**: PostgreSQL (Neon) + Redis (Upstash)
3. **Storage Layer**: Cloudflare R2 (S3-compatible)

> **Sources**: sdd.md:1-68, README.md:17-39

### Integrations

| System | Integration Type | Purpose |
|--------|------------------|---------|
| Stripe | API + Webhooks | Payment processing, subscription management |
| GitHub OAuth | OAuth 2.0 | User authentication |
| Google OAuth | OAuth 2.0 | User authentication |
| Cloudflare R2 | S3 API | Skill file storage |
| Resend | API | Transactional email |
| PostHog | SDK | Product analytics |

> **Sources**: sdd.md:584-616

### Dependencies

- Node.js 20 LTS
- PostgreSQL 16
- Redis 7
- Hono framework
- Drizzle ORM

> **Sources**: sdd.md:584-594, README.md:53-59

### Technical Constraints

- Skill files must maintain compatibility with `.claude/skills/` structure
- API versioned at `/v1/` for future compatibility
- AGPL-3.0 license requires source release for modifications

> **Sources**: README.md:232-233

---

## Scope & Prioritization

### In Scope (MVP - Phase 1)

- Core registry API (auth, skills, subscriptions)
- Free and Pro tiers
- CLI plugin with core commands
- Basic web dashboard
- Stripe integration

> **Sources**: prd.md:243

### In Scope (Phase 2 - Teams)

- Team management
- Team tier with seat management
- Usage analytics
- SSO add-on

> **Sources**: prd.md:244

### In Scope (Phase 3 - Enterprise)

- SSO/SAML included
- Audit logs
- Custom skill development service
- On-premises option

> **Sources**: prd.md:245

### Explicitly Out of Scope (v1)

- Skill marketplace with creator revenue share - Reason: Complexity, legal considerations
- Custom skill development service - Reason: Services business, not SaaS
- Mobile app - Reason: CLI is primary interface
- IDE plugins (VS Code, JetBrains) - Reason: Future enhancement
- Skill dependency management - Reason: Complexity
- Skill testing/validation service - Reason: Future enhancement

> **Sources**: prd.md:225-232

### Priority Matrix

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| Authentication System | P0 | M | High |
| Skill Registry | P0 | L | High |
| CLI Plugin | P0 | L | High |
| Subscription Management | P0 | M | High |
| License Enforcement | P0 | M | High |
| Team Management | P1 | M | Medium |
| Analytics | P1 | M | Medium |
| SSO/SAML | P2 | M | Low |
| Audit Logs | P2 | S | Low |

---

## Success Criteria

### Launch Criteria (MVP)

- [ ] All P0 features implemented and tested
- [ ] Stripe integration functional (test mode validated)
- [ ] CLI plugin installable and functional
- [ ] Basic monitoring and alerting in place
- [ ] Documentation complete

### Post-Launch Success (30 days)

- [ ] 100+ registered users
- [ ] 5+ skills published
- [ ] No critical security vulnerabilities
- [ ] <1% error rate on API

### Long-term Success (90 days)

- [ ] 500+ registered users
- [ ] 5% free-to-paid conversion
- [ ] 10+ skills in registry
- [ ] Team tier adoption by 3+ organizations

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Stripe integration delays | Medium | High | Start integration early, use test mode extensively |
| Low skill creator adoption | Medium | High | Seed registry with internal skills, creator outreach |
| Security breach | Low | Critical | Security audit before launch, penetration testing |
| Loa framework changes | Medium | Medium | Maintain close communication with Loa maintainers |
| Vendor lock-in (Neon/Upstash) | Low | Medium | Use standard PostgreSQL/Redis APIs, document migration path |
| Scaling issues at launch | Low | Medium | Load testing, auto-scaling configuration |
| Payment processing failures | Low | High | Implement retry logic, fallback notifications |

### Assumptions

- Loa framework will maintain backward compatibility
- Stripe will remain available and stable
- Users will accept subscription model for premium skills
- CLI integration is preferred over web-only access

### Dependencies on External Factors

- Stripe API availability and pricing
- GitHub/Google OAuth API availability
- Cloudflare R2 pricing and availability
- Loa framework development roadmap

---

## Timeline & Milestones

| Milestone | Duration | Deliverables |
|-----------|----------|--------------|
| Phase 1: MVP | 4 weeks | Core registry, Pro tier, CLI plugin |
| Phase 2: Teams | 4 weeks | Team management, analytics, Team tier |
| Phase 3: Enterprise | 4 weeks | SSO, audit logs, on-prem option |

> **Sources**: prd.md:243-246

---

## Appendix

### A. Competitive Analysis

| Feature | Loa Skills Registry | npm | GitHub Packages |
|---------|---------------------|-----|-----------------|
| Skill-specific | ✅ | ❌ | ❌ |
| Subscription tiers | ✅ | ❌ | ❌ |
| Loa integration | ✅ | ❌ | ❌ |
| Team management | ✅ | ✅ | ✅ |
| Analytics | ✅ | Limited | Limited |
| License enforcement | ✅ | ❌ | ❌ |

> **Sources**: prd.md:249-257

### B. Subscription Tier Details

| Tier | Price | Skills | Limits | Features |
|------|-------|--------|--------|----------|
| Free | $0/mo | Community | 100 loads/month | Community support |
| Pro | $29/mo | Community + Pro | Unlimited | Email support, priority updates |
| Team | $99/mo (+$15/seat) | All | Unlimited | 5 seats, analytics, SSO add-on |
| Enterprise | Custom | All + custom | Unlimited | SLA, audit logs, on-prem |

> **Sources**: prd.md:115-153, README.md:110-117

### C. API Endpoint Summary

See `specs/openapi.yaml` for complete specification.

**Key Endpoints:**
- `POST /v1/auth/login` - User authentication
- `POST /v1/auth/register` - User registration
- `GET /v1/skills` - List/search skills
- `GET /v1/skills/{slug}/download` - Download skill files
- `GET /v1/skills/{slug}/validate` - Validate license
- `POST /v1/subscriptions/checkout` - Create Stripe checkout
- `POST /v1/webhooks/stripe` - Stripe webhook handler

> **Sources**: openapi.yaml:80-1039

### D. Glossary

| Term | Definition |
|------|------------|
| Skill | A folder containing SKILL.md and supporting files that extend Claude's capabilities |
| Tier | Subscription level (Free, Pro, Team, Enterprise) |
| Seat | A licensed user slot within a team subscription |
| Creator | A user who publishes skills to the registry |
| Watermark | Unique identifier embedded in skill license for tracking |
| Cache TTL | Time-to-live for cached license validation |

> **Sources**: prd.md:259-265

### E. Source Documents

| Document | Lines | Purpose |
|----------|-------|---------|
| README.md | 238 | Project overview, quick start |
| prd.md | 265 | Original product requirements |
| sdd.md | 911 | System design, database schema |
| loa-plugin-architecture.md | 947 | CLI plugin specification |
| openapi.yaml | 1,415 | Complete API specification |
| IMPLEMENTATION-PROMPT.md | 326 | Implementation guide |

---

*Generated by PRD Architect Agent*
*Source tracing enabled: All sections cite original documentation*

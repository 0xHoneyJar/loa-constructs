# Product Requirements Document: Third-Party Pack Submission UI

**Version**: 1.0.0
**Date**: 2026-01-21
**Author**: Product Manager Agent
**Status**: Final
**GitHub Issue**: [#12 - Third-Party Pack Submissions](https://github.com/0xHoneyJar/loa-constructs/issues/12)

---

## 1. Executive Summary

### 1.1 Problem Statement

The Loa Constructs registry has complete backend infrastructure for third-party pack submissions, but the user-facing experience is incomplete:

1. **Creator Dashboard UI** - Pages exist but show placeholders, no real API integration
2. **Public Pack Catalog** - Shows hardcoded sample data, not actual published packs
3. **Stripe Connect** - Revenue sharing infrastructure exists but creator onboarding not implemented
4. **Discovery** - No way for users to find and evaluate third-party packs

The backend is production-ready with:
- ✅ Submit/withdraw/review-status API endpoints
- ✅ Admin review workflow with approval/rejection
- ✅ Email notifications (submission received, approved, rejected)
- ✅ Database schema (pack_submissions, creator_payouts, pack_download_attributions)
- ✅ Rate limiting (5 submissions/24h)
- ✅ Validation (email verified, has version, has description)
- ✅ Documentation (CONTRIBUTING-PACKS.md, tutorial)

### 1.2 Solution Overview

Complete the third-party pack submission experience:

1. **Creator Dashboard** - Real API integration for pack management, submission, analytics
2. **Pack Catalog** - Live data from API with search, filtering, and pack detail pages
3. **Submission UX** - Guided flow from pack creation to submission to publication
4. **Stripe Connect** (v1.1) - Creator account onboarding and automated payouts

### 1.3 Business Value

| Metric | Impact |
|--------|--------|
| **Ecosystem Growth** | Third-party creators expand pack catalog without THJ effort |
| **Revenue** | 30% platform fee on premium third-party packs |
| **Network Effects** | More packs → more users → more creators |
| **Differentiation** | First quality-controlled marketplace for Claude Code skills |

---

## 2. Goals and Success Criteria

### 2.1 Business Goals

| ID | Goal | Priority |
|----|------|----------|
| G1 | Enable creators to submit packs via web UI | P0 |
| G2 | Display published packs in public catalog | P0 |
| G3 | Provide creators visibility into submissions and downloads | P1 |
| G4 | Enable creator monetization via Stripe Connect | P2 (v1.1) |

### 2.2 Success Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Creator can submit pack via UI | 100% | End-to-end test |
| Public catalog shows real packs | 100% | Visual verification |
| Submission → published turnaround | < 72 hours | Admin SLA |
| Third-party packs published (Q1) | 5+ | Registry count |
| Creator satisfaction | > 4/5 | Survey feedback |

---

## 3. User Personas

### 3.1 Primary: Third-Party Pack Creator

**Profile**: Developer who built useful Claude Code workflows and wants to share/monetize them.

**Goals**:
- Package and distribute skills without running own infrastructure
- Monetize expertise through premium packs (Pro/Team tier)
- Get visibility in the Loa ecosystem
- Receive feedback to improve pack quality

**Pain Points** (Current):
- No web UI to manage packs
- Can't see submission status visually
- No analytics on downloads

**Journey**:
1. Signs up at constructs.network/register
2. Navigates to Creator Dashboard
3. Creates pack with metadata, skills, commands
4. Uploads version with files
5. Submits for review
6. Receives email notification of decision
7. Pack appears in public catalog
8. Tracks downloads and (eventually) earnings

### 3.2 Secondary: Pack Consumer

**Profile**: Developer using Claude Code who wants to extend capabilities.

**Goals**:
- Discover relevant skill packs
- Evaluate pack quality before installing
- Install packs easily via CLI

**Pain Points** (Current):
- Catalog shows fake data
- Can't browse actual available packs
- No way to see ratings or download counts

**Journey**:
1. Visits constructs.network/packs
2. Browses/searches for packs
3. Views pack details (description, skills, ratings)
4. Installs via `claude skills add <pack-slug>`

### 3.3 Tertiary: Registry Admin

**Profile**: THJ team member reviewing submitted packs.

**Goals**:
- Efficiently process review queue
- Provide actionable feedback
- Maintain quality bar

**Pain Points** (Current):
- Must use API directly to review
- No dashboard for pending submissions

**Journey**:
1. Receives email notification of new submission
2. Opens admin dashboard
3. Reviews pack contents, documentation
4. Approves or rejects with feedback
5. Creator notified automatically

---

## 4. Functional Requirements

### 4.1 Creator Dashboard (Web UI)

#### 4.1.1 Pack List View

**Route**: `/creator`

**Requirements**:
- [ ] Display all packs owned by logged-in user
- [ ] Show for each pack: name, status, version, downloads, created date
- [ ] Status badges: Draft, Pending Review, Published, Rejected
- [ ] Actions: View, Edit, Submit (if draft), Withdraw (if pending)
- [ ] Empty state with "Create Pack" CTA

**API Integration**:
```typescript
GET /v1/creator/packs
// or with existing endpoint:
GET /v1/packs?owner=me
```

#### 4.1.2 Create Pack Flow

**Route**: `/creator/new`

**Requirements**:
- [ ] Form fields: name, slug, description, category, tags, tier
- [ ] Slug auto-generated from name, editable
- [ ] Category dropdown (gtm, security, devops, documentation, etc.)
- [ ] Tier selection (free, pro, team) with descriptions
- [ ] Validation feedback inline
- [ ] Success → redirect to pack detail

**API Integration**:
```typescript
POST /v1/packs
{
  name: string,
  slug: string,
  description: string,
  category: string,
  tags: string[],
  tierRequired: 'free' | 'pro' | 'team'
}
```

#### 4.1.3 Pack Detail / Edit

**Route**: `/creator/packs/[slug]`

**Requirements**:
- [ ] Display pack metadata with edit capability
- [ ] Version history with download counts
- [ ] Upload new version form
- [ ] Submission status with feedback (if any)
- [ ] Submit for Review button (if draft or rejected)
- [ ] Withdraw button (if pending review)
- [ ] Delete pack (confirmation required)

**API Integration**:
```typescript
GET /v1/packs/:slug
PATCH /v1/packs/:slug
POST /v1/packs/:slug/versions
POST /v1/packs/:slug/submit
POST /v1/packs/:slug/withdraw
GET /v1/packs/:slug/review-status
```

#### 4.1.4 Version Upload

**Within pack detail page**

**Requirements**:
- [ ] Version number input (semver validation)
- [ ] Changelog textarea
- [ ] File upload (drag & drop or select)
- [ ] Manifest validation before upload
- [ ] Progress indicator
- [ ] Success message with version info

**API Integration**:
```typescript
POST /v1/packs/:slug/versions
{
  version: string,
  changelog: string,
  files: File[]
}
```

#### 4.1.5 Submission Flow

**Modal or dedicated view**

**Requirements**:
- [ ] Pre-submission checklist (verified email, has version, has description)
- [ ] Optional submission notes textarea
- [ ] Estimated review time display
- [ ] Confirm submit action
- [ ] Success state with status tracking link

**Validation Rules** (enforced by API):
- Email must be verified
- Pack must have at least one version
- Pack must have description
- Rate limit: 5 submissions per 24 hours

### 4.2 Public Pack Catalog

#### 4.2.1 Browse View

**Route**: `/packs`

**Requirements**:
- [ ] Grid/list of published packs
- [ ] Search by name, description, keywords
- [ ] Filter by category, tier (free/pro/team)
- [ ] Sort by: newest, most downloads, featured
- [ ] Pagination (20 per page)
- [ ] Pack cards: name, description preview, author, downloads, tier badge

**API Integration**:
```typescript
GET /v1/packs?status=published&page=1&per_page=20&q=search&category=gtm&tier=free
```

#### 4.2.2 Pack Detail Page

**Route**: `/packs/[slug]`

**Requirements**:
- [ ] Full description (markdown rendered)
- [ ] Author info (name, link to profile if exists)
- [ ] Version history
- [ ] Skills included (name, description)
- [ ] Commands included (name, description)
- [ ] Installation instructions (`claude skills add <slug>`)
- [ ] Download count
- [ ] Related packs (same category)
- [ ] Install button (opens instructions modal)

**API Integration**:
```typescript
GET /v1/packs/:slug
GET /v1/packs/:slug/versions
```

### 4.3 Admin Review Dashboard

#### 4.3.1 Review Queue

**Route**: `/admin/reviews` (protected)

**Requirements**:
- [ ] List of pending submissions
- [ ] Sort by submission date (oldest first by default)
- [ ] Show: pack name, creator, submitted date, version
- [ ] Quick preview link
- [ ] Review action buttons

**API Integration**:
```typescript
GET /v1/admin/packs/pending
```

#### 4.3.2 Review Action

**Modal or panel**

**Requirements**:
- [ ] Pack preview with all details
- [ ] Approve / Reject buttons
- [ ] Required review notes field
- [ ] Rejection reason dropdown (if rejecting)
- [ ] Confirmation before action
- [ ] Automatic email notification to creator

**API Integration**:
```typescript
POST /v1/admin/packs/:id/review
{
  decision: 'approved' | 'rejected',
  reviewNotes: string,
  rejectionReason?: string
}
```

**Rejection Reasons**:
- `quality_standards` - Does not meet quality bar
- `incomplete_content` - Missing required files
- `duplicate_functionality` - Too similar to existing pack
- `policy_violation` - Violates terms of service
- `security_concern` - Potential security issues

### 4.4 Email Notifications

**Already Implemented** - No changes needed:

| Event | Recipient | Template |
|-------|-----------|----------|
| Pack submitted | Creator | Confirmation with estimated review time |
| Pack submitted | Admins | Notification with review link |
| Pack approved | Creator | Congratulations with pack URL |
| Pack rejected | Creator | Feedback with rejection reason |

### 4.5 Creator Monetization (v1.1)

#### 4.5.1 Stripe Connect Onboarding

**Route**: `/creator/settings/payouts`

**Requirements** (deferred):
- [ ] "Enable Payouts" button
- [ ] Stripe Connect Express onboarding flow
- [ ] Return URL handling
- [ ] Connection status display
- [ ] Payout threshold setting ($50 minimum)

#### 4.5.2 Earnings Dashboard

**Route**: `/creator/earnings`

**Requirements** (deferred):
- [ ] Lifetime earnings summary
- [ ] Monthly breakdown
- [ ] Download attributions
- [ ] Pending vs paid amounts
- [ ] Payout history

---

## 5. Technical Requirements

### 5.1 Frontend

| Requirement | Implementation |
|-------------|----------------|
| Framework | Next.js 14 (App Router) - existing |
| Styling | Tailwind CSS + shadcn/ui + TUI components - existing |
| API Client | Fetch with auth headers - existing |
| Forms | React Hook Form + Zod validation |
| File Upload | React Dropzone or similar |

### 5.2 Backend

| Requirement | Status |
|-------------|--------|
| Pack CRUD API | ✅ Implemented |
| Submission endpoints | ✅ Implemented |
| Admin review endpoints | ✅ Implemented |
| Email service | ✅ Implemented |
| Rate limiting | ✅ Implemented |
| Validation | ✅ Implemented |

### 5.3 Database

| Table | Status |
|-------|--------|
| packs | ✅ Exists |
| pack_versions | ✅ Exists |
| pack_files | ✅ Exists |
| pack_submissions | ✅ Exists |
| pack_installations | ✅ Exists |
| pack_download_attributions | ✅ Exists |
| creator_payouts | ✅ Exists |

### 5.4 Security

| Requirement | Status |
|-------------|--------|
| Authentication required for creator routes | ✅ Middleware exists |
| Ownership verification | ✅ In pack service |
| Rate limiting | ✅ 5 submissions/24h |
| Admin role check | ✅ In admin routes |
| Content validation | ✅ Zod schemas |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target |
|--------|--------|
| Page load (catalog) | < 2 seconds |
| Search results | < 500ms |
| File upload | Progress feedback |
| API response | < 200ms (non-upload) |

### 6.2 Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios

### 6.3 Mobile

- Responsive design (existing)
- Touch-friendly interactions
- Mobile-optimized file upload

---

## 7. Scope Definition

### 7.1 In Scope (v1.0)

| Feature | Priority |
|---------|----------|
| Creator pack list with real data | P0 |
| Create pack form | P0 |
| Pack detail/edit page | P0 |
| Version upload | P0 |
| Submit for review flow | P0 |
| Withdrawal capability | P0 |
| Public pack catalog (real data) | P0 |
| Pack detail page (public) | P0 |
| Admin review dashboard | P1 |
| Search and filtering | P1 |
| Basic analytics (downloads) | P1 |

### 7.2 Out of Scope (v1.0)

| Feature | Reason | Future Version |
|---------|--------|----------------|
| Stripe Connect payouts | Complexity, start manual | v1.1 |
| Pack ratings/reviews | Requires moderation | v1.2 |
| Creator public profiles | Nice-to-have | v1.2 |
| Automated quality checks | CI integration needed | v1.3 |
| Team-owned packs | Permission complexity | v1.3 |

### 7.3 Dependencies

| Dependency | Status |
|------------|--------|
| Backend API | ✅ Complete |
| Authentication | ✅ Complete |
| Email service | ✅ Complete |
| Database schema | ✅ Complete |
| Documentation | ✅ Complete |

---

## 8. User Stories

### 8.1 Creator Stories

**US-C1**: As a creator, I want to see all my packs in a dashboard so I can manage them.
- Acceptance: Pack list loads with real data, shows status badges

**US-C2**: As a creator, I want to create a new pack with metadata so I can start building.
- Acceptance: Form validates, pack created in draft status

**US-C3**: As a creator, I want to upload a version to my pack so users can install it.
- Acceptance: Files upload, version appears in history

**US-C4**: As a creator, I want to submit my pack for review so it can be published.
- Acceptance: Validation passes, status changes, email received

**US-C5**: As a creator, I want to see review feedback so I can improve my pack.
- Acceptance: Rejection reason and notes displayed

**US-C6**: As a creator, I want to withdraw my submission so I can make changes.
- Acceptance: Status returns to draft, can edit and resubmit

### 8.2 Consumer Stories

**US-P1**: As a user, I want to browse available packs so I can find useful skills.
- Acceptance: Catalog shows real published packs

**US-P2**: As a user, I want to search for packs so I can find specific functionality.
- Acceptance: Search returns relevant results

**US-P3**: As a user, I want to view pack details so I can decide whether to install.
- Acceptance: Full description, skills, commands displayed

**US-P4**: As a user, I want to see installation instructions so I can add the pack.
- Acceptance: CLI command displayed, copy button works

### 8.3 Admin Stories

**US-A1**: As an admin, I want to see pending submissions so I can review them.
- Acceptance: Queue shows pending packs sorted by date

**US-A2**: As an admin, I want to approve or reject packs so creators get feedback.
- Acceptance: Decision recorded, creator notified

---

## 9. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low submission volume | Medium | High | Recruit beta creators, seed with THJ packs |
| Review backlog | High | Medium | 72-hour SLA, multiple reviewers |
| Low-quality submissions | High | Medium | Clear guidelines, checklist in UI |
| Creator confusion | Medium | Medium | In-app help, good documentation |
| Technical issues with upload | Medium | Low | Progress feedback, retry capability |

---

## 10. Implementation Phases

### Phase 1: Creator Dashboard Core (Sprint 1)

- [ ] Creator pack list page with API integration
- [ ] Create pack form
- [ ] Pack detail page with edit capability
- [ ] Version upload functionality
- [ ] Submit for review flow
- [ ] Withdraw submission capability

### Phase 2: Public Catalog (Sprint 1)

- [ ] Pack browse page with real data
- [ ] Search functionality
- [ ] Pack detail page (public)
- [ ] Category/tier filtering

### Phase 3: Admin & Polish (Sprint 2)

- [ ] Admin review dashboard
- [ ] Review action flow
- [ ] Analytics basics (download counts)
- [ ] Error handling improvements
- [ ] Loading states and feedback

### Phase 4: Monetization (v1.1, Sprint 3+)

- [ ] Stripe Connect onboarding
- [ ] Earnings dashboard
- [ ] Payout processing
- [ ] Revenue reports

---

## 11. Appendix

### A. Existing Documentation

| Document | Path | Description |
|----------|------|-------------|
| CONTRIBUTING-PACKS.md | `/docs/CONTRIBUTING-PACKS.md` | Full contribution guide |
| Creating Your First Pack | `/docs/tutorials/creating-your-first-pack.md` | Step-by-step tutorial |
| PRD (Backend) | `/loa-grimoire/prd-pack-submission.md` | Original backend PRD |
| SDD (Backend) | `/loa-grimoire/sdd-pack-submission.md` | Technical architecture |

### B. API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/v1/packs` | Optional | List packs (filter by owner, status) |
| POST | `/v1/packs` | Required | Create pack |
| GET | `/v1/packs/:slug` | Optional | Get pack details |
| PATCH | `/v1/packs/:slug` | Required | Update pack |
| POST | `/v1/packs/:slug/versions` | Required | Create version |
| GET | `/v1/packs/:slug/versions` | Optional | List versions |
| POST | `/v1/packs/:slug/submit` | Required | Submit for review |
| POST | `/v1/packs/:slug/withdraw` | Required | Withdraw submission |
| GET | `/v1/packs/:slug/review-status` | Required | Get submission status |
| GET | `/v1/admin/packs/pending` | Admin | List pending submissions |
| POST | `/v1/admin/packs/:id/review` | Admin | Submit review decision |

### C. Pack Status Flow

```
                                    ┌─────────────┐
                                    │  REJECTED   │
                                    │             │◄──────────────┐
                                    └──────▲──────┘              │
                                           │ Admin rejects       │
┌─────────────┐    ┌─────────────┐    ┌────┴────────┐           │
│   DRAFT     │───▶│  PENDING    │───▶│  PUBLISHED  │           │
│             │    │   REVIEW    │    │             │           │
└─────────────┘    └─────────────┘    └─────────────┘           │
     ▲                   │                                       │
     │                   │ Withdraw                              │
     │                   ▼                                       │
     │            ┌─────────────┐                               │
     └────────────│   DRAFT     │◄──────────────────────────────┘
       Edit &     │ (editable)  │  Can resubmit from rejected
       resubmit   └─────────────┘
```

---

**Document Status**: Final - Ready for Implementation
**Next Step**: `/architect` to create SDD for frontend implementation

---

> Sources:
> - GitHub Issue #12
> - Existing PRD: loa-grimoire/prd-pack-submission.md
> - Existing SDD: loa-grimoire/sdd-pack-submission.md
> - Current codebase exploration
> - Documentation: docs/CONTRIBUTING-PACKS.md, docs/tutorials/creating-your-first-pack.md

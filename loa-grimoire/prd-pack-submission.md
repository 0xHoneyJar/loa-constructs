# Product Requirements Document: Pack Submission & Creator Program

**Version**: 1.0.0
**Date**: 2026-01-04
**Author**: Product Manager Agent
**Status**: Draft
**Parent PRD**: GTM Collective Pack Integration (loa-grimoire/prd.md)

---

## 1. Executive Summary

### 1.1 Problem Statement

The Loa Registry currently supports pack distribution but lacks a user-facing workflow for pack submission. The infrastructure exists (database schema includes `pending_review` status, admin review endpoints), but:

1. **No submit-for-review endpoint** - Creators cannot transition their draft packs to review
2. **No visibility into review status** - Creators don't know where their pack is in the pipeline
3. **No third-party monetization** - Only THJ can publish premium packs
4. **Manual admin discovery** - Admins must manually check for pending packs

This blocks the registry from becoming a marketplace where third-party developers can contribute and monetize skill packs.

### 1.2 Solution Overview

Implement a complete pack submission workflow:

1. **Creator Dashboard** - Web UI for pack creation, management, and analytics
2. **Submit for Review** - API endpoint to transition draft → pending_review
3. **Review Pipeline** - Admin tools for reviewing, approving, or rejecting packs
4. **Notification System** - Email notifications for status changes
5. **Revenue Sharing** - Stripe Connect integration for creator payouts (70/30 split)

### 1.3 Business Value

| Metric | Impact |
|--------|--------|
| **Content Velocity** | Third-party creators expand pack catalog without THJ effort |
| **Revenue Diversification** | 30% platform fee on third-party premium packs |
| **Community Growth** | Creator program attracts developers to ecosystem |
| **Product Moat** | Unique skill registry with quality-controlled marketplace |

---

## 2. Goals and Success Criteria

### 2.1 Business Goals

1. **G1**: Enable third-party developers to submit packs for publication
2. **G2**: Maintain quality through mandatory review process
3. **G3**: Enable creator monetization with transparent revenue sharing
4. **G4**: Reduce admin burden through streamlined review tools

### 2.2 Success Criteria

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| Submission Flow | Creator can submit pack via web UI or API | Works |
| Review Turnaround | Average time from submission to decision | < 72 hours |
| Creator Visibility | Creator can see review status and feedback | Real-time |
| Third-Party Packs | Non-THJ packs published | 5+ in first quarter |
| Revenue Share | Creator payouts processed correctly | 100% accuracy |

---

## 3. User Context

### 3.1 Primary Persona: Third-Party Pack Creator

**Profile**: Developer who built useful Claude Code workflows and wants to share/sell them.

**Goals**:
- Package and distribute skills without running own infrastructure
- Monetize expertise through premium packs
- Get visibility in the Loa ecosystem
- Receive feedback to improve pack quality

**Pain Points**:
- No existing marketplace for Claude Code skills
- Building distribution infrastructure is costly
- Payment processing is complex
- Quality bar is unclear

**Journey**:
1. Signs up for Loa Registry account
2. Creates pack in draft status
3. Uploads skills, commands, and manifest
4. Submits for review
5. Receives feedback or approval
6. Pack goes live, starts earning revenue
7. Receives monthly payouts via Stripe Connect

### 3.2 Secondary Persona: THJ Team Member

**Profile**: Internal team member publishing first-party packs.

**Goals**:
- Quick publishing without external review delays
- Dogfood the creator experience
- Set quality standards for third-parties

**Differences from Third-Party**:
- May have expedited review or auto-publish privileges
- No revenue share (internal)
- Can set `thjBypass` flag for testing

### 3.3 Tertiary Persona: Registry Admin/Reviewer

**Profile**: THJ team member reviewing submitted packs.

**Goals**:
- Maintain quality bar for published packs
- Provide actionable feedback to creators
- Efficient review workflow
- Prevent malicious or low-quality content

**Pain Points**:
- No dashboard for pending reviews
- No structured review criteria
- Manual status updates

---

## 4. Functional Requirements

### 4.1 Pack Lifecycle

```
                                    ┌─────────────┐
                                    │  REJECTED   │
                                    │             │
                                    └──────▲──────┘
                                           │ Admin rejects
┌─────────────┐    ┌─────────────┐    ┌────┴────────┐    ┌─────────────┐
│   DRAFT     │───▶│  PENDING    │───▶│  PUBLISHED  │───▶│ DEPRECATED  │
│             │    │   REVIEW    │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     │                   │                   │
     │ Creator edits     │ Creator can       │ Admin deprecates
     └───────────────────┘ withdraw to draft └─────────────────────────
```

### 4.2 Creator Features

#### 4.2.1 Pack Creation (Existing - Enhance)

**Endpoint**: `POST /v1/packs` (existing)

**Enhancements**:
- Add `README.md` field for rich pack description
- Add `license` field (MIT, Apache-2.0, Proprietary, etc.)
- Add `category` field (gtm, security, devops, documentation, etc.)
- Add `screenshots` array for marketplace display

**New Fields in Pack Table**:
```sql
ALTER TABLE packs ADD COLUMN readme TEXT;
ALTER TABLE packs ADD COLUMN license VARCHAR(50) DEFAULT 'MIT';
ALTER TABLE packs ADD COLUMN category VARCHAR(50);
ALTER TABLE packs ADD COLUMN screenshots JSONB DEFAULT '[]';
```

#### 4.2.2 Submit for Review (NEW)

**Endpoint**: `POST /v1/packs/:slug/submit`

**Request**:
```json
{
  "submission_notes": "Optional message to reviewers"
}
```

**Response**:
```json
{
  "status": "pending_review",
  "submitted_at": "2026-01-04T12:00:00Z",
  "estimated_review_time": "2-3 business days"
}
```

**Validations**:
- Pack must have at least one published version
- Pack must have description, category
- If premium: must have Stripe Connect account linked
- Creator must have verified email

**Side Effects**:
- Updates pack status to `pending_review`
- Creates review ticket (internal)
- Sends email to admins
- Sends confirmation email to creator

#### 4.2.3 Withdraw Submission (NEW)

**Endpoint**: `POST /v1/packs/:slug/withdraw`

**Preconditions**:
- Pack must be in `pending_review` status
- Only pack owner can withdraw

**Response**:
```json
{
  "status": "draft",
  "withdrawn_at": "2026-01-04T12:00:00Z"
}
```

#### 4.2.4 View Review Status (NEW)

**Endpoint**: `GET /v1/packs/:slug/review-status`

**Response**:
```json
{
  "status": "pending_review",
  "submitted_at": "2026-01-04T12:00:00Z",
  "review_notes": null,
  "reviewer": null,
  "reviewed_at": null,
  "rejection_reason": null
}
```

Or if rejected:
```json
{
  "status": "rejected",
  "submitted_at": "2026-01-04T12:00:00Z",
  "review_notes": "Skills missing required SKILL.md files",
  "reviewer": "admin@thj.xyz",
  "reviewed_at": "2026-01-05T10:00:00Z",
  "rejection_reason": "incomplete_content"
}
```

#### 4.2.5 Creator Dashboard API (NEW)

**Endpoint**: `GET /v1/creator/packs`

**Response**:
```json
{
  "packs": [
    {
      "slug": "my-awesome-pack",
      "name": "My Awesome Pack",
      "status": "published",
      "downloads": 156,
      "revenue": {
        "total": 450.00,
        "pending": 87.00,
        "currency": "USD"
      },
      "latest_version": "1.2.0",
      "created_at": "2025-12-01",
      "updated_at": "2026-01-03"
    }
  ],
  "totals": {
    "packs_count": 3,
    "total_downloads": 892,
    "total_revenue": 1250.00,
    "pending_payout": 87.00
  }
}
```

### 4.3 Admin Review Features

#### 4.3.1 Review Queue (Enhance Existing)

**Endpoint**: `GET /v1/admin/packs?status=pending_review` (existing)

**Enhancements**:
- Add `submitted_at` to response
- Add `submission_notes` to response
- Add `creator_email` for easy contact
- Sort by submission date (oldest first)

#### 4.3.2 Review Action (Enhance Existing)

**Endpoint**: `PATCH /v1/admin/packs/:id` (existing)

**Enhanced Payload**:
```json
{
  "status": "published",
  "review_notes": "Approved! Great pack.",
  "rejection_reason": null
}
```

Or reject:
```json
{
  "status": "rejected",
  "review_notes": "Please add more detailed skill descriptions",
  "rejection_reason": "quality_standards"
}
```

**Rejection Reasons** (enum):
- `quality_standards` - Does not meet quality bar
- `incomplete_content` - Missing required files/fields
- `duplicate_functionality` - Too similar to existing pack
- `policy_violation` - Violates terms of service
- `security_concern` - Potential security issues
- `other` - See review_notes

**Side Effects**:
- Sends email to creator with status + feedback
- If approved: pack appears in public listings
- If rejected: creator can edit and resubmit

#### 4.3.3 Review Dashboard (NEW - Web UI)

**Route**: `/admin/reviews`

**Features**:
- List of pending packs with submission date
- Quick preview of pack contents
- One-click approve/reject with templates
- Review history and audit log

### 4.4 Revenue Sharing

#### 4.4.1 Stripe Connect Integration

**Creator Onboarding**:
1. Creator clicks "Enable Payouts" in dashboard
2. Redirected to Stripe Connect onboarding
3. Completes KYC/bank details
4. Returns with `stripe_connect_account_id`

**Database Fields**:
```sql
ALTER TABLE users ADD COLUMN stripe_connect_account_id VARCHAR(100);
ALTER TABLE users ADD COLUMN stripe_connect_onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN payout_threshold_cents INTEGER DEFAULT 5000; -- $50 min
```

#### 4.4.2 Revenue Split

| Party | Percentage | Notes |
|-------|------------|-------|
| Creator | 70% | Paid monthly via Stripe Connect |
| Platform (THJ) | 30% | Platform fee |

**Example**:
- Pack price: $29/month (included in Pro subscription)
- Attribution: Based on downloads, not revenue (for bundled pricing)
- Payout calculation: TBD based on subscription attribution model

**Alternative Model** (Simpler for MVP):
- Track pack downloads for each subscription
- Monthly payout = (downloads / total_downloads) × subscription_revenue × 70%

#### 4.4.3 Creator Earnings API (NEW)

**Endpoint**: `GET /v1/creator/earnings`

**Response**:
```json
{
  "lifetime": {
    "gross": 1500.00,
    "platform_fee": 450.00,
    "net": 1050.00,
    "paid_out": 950.00,
    "pending": 100.00
  },
  "this_month": {
    "gross": 200.00,
    "platform_fee": 60.00,
    "net": 140.00
  },
  "payout_schedule": "monthly",
  "next_payout_date": "2026-02-01",
  "stripe_connect_status": "active"
}
```

#### 4.4.4 Payout Processing (Background Job)

**Schedule**: Monthly, 1st of each month

**Process**:
1. Calculate earnings for each creator
2. Filter creators above payout threshold ($50)
3. Create Stripe Connect transfers
4. Record payout in `creator_payouts` table
5. Send payout confirmation emails

### 4.5 Notification System

#### 4.5.1 Email Triggers

| Event | Recipient | Template |
|-------|-----------|----------|
| Pack submitted | Admins | `admin-pack-submitted` |
| Pack submitted | Creator | `creator-submission-received` |
| Pack approved | Creator | `creator-pack-approved` |
| Pack rejected | Creator | `creator-pack-rejected` |
| Payout processed | Creator | `creator-payout-processed` |
| Review reminder | Admins | `admin-review-reminder` (>48h pending) |

#### 4.5.2 In-App Notifications (Future)

- Dashboard notification bell
- Real-time status updates
- Review feedback alerts

---

## 5. Technical Requirements

### 5.1 Database Schema Changes

```sql
-- New tables
CREATE TABLE pack_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES packs(id),
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  submission_notes TEXT,
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  rejection_reason VARCHAR(50),
  status VARCHAR(20) NOT NULL, -- submitted, approved, rejected, withdrawn
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE creator_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  stripe_transfer_id VARCHAR(100),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, processing, completed, failed
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE pack_download_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES packs(id),
  user_id UUID REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  downloaded_at TIMESTAMP DEFAULT NOW(),
  month DATE NOT NULL -- for aggregation
);

-- Indexes
CREATE INDEX idx_pack_submissions_status ON pack_submissions(status);
CREATE INDEX idx_creator_payouts_user ON creator_payouts(user_id);
CREATE INDEX idx_pack_downloads_month ON pack_download_attributions(month);
```

### 5.2 API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/v1/packs/:slug/submit` | Creator | Submit pack for review |
| POST | `/v1/packs/:slug/withdraw` | Creator | Withdraw submission |
| GET | `/v1/packs/:slug/review-status` | Creator | Get review status |
| GET | `/v1/creator/packs` | Creator | List creator's packs |
| GET | `/v1/creator/earnings` | Creator | View earnings |
| POST | `/v1/creator/connect-stripe` | Creator | Start Stripe Connect |
| GET | `/v1/admin/reviews` | Admin | Review queue |
| PATCH | `/v1/admin/packs/:id/review` | Admin | Submit review decision |

### 5.3 External Integrations

| Service | Purpose | Priority |
|---------|---------|----------|
| Stripe Connect | Creator payouts | P1 |
| SendGrid/Resend | Transactional emails | P1 |
| Slack (optional) | Admin notifications | P2 |

### 5.4 Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| Pack content scanning | Validate no executable code in skills |
| Rate limiting | Max 5 submissions per day per creator |
| Ownership verification | Only pack owner can submit/withdraw |
| Admin audit trail | Log all review actions with timestamp and user |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Requirement |
|--------|-------------|
| Submission response time | < 2 seconds |
| Review queue load time | < 1 second for 100 pending |
| Payout processing | Complete within 24 hours |

### 6.2 Scalability

| Metric | Initial | 1 Year Target |
|--------|---------|---------------|
| Creators | 10 | 100 |
| Packs | 5 | 50 |
| Monthly submissions | 5 | 20 |
| Monthly payouts | $0 | $5,000 |

---

## 7. Scope Definition

### 7.1 In Scope (MVP)

- [x] Pack lifecycle (draft → pending_review → published/rejected)
- [x] Submit for review endpoint
- [x] Withdraw submission endpoint
- [x] Review status visibility
- [x] Admin review workflow (approve/reject with notes)
- [x] Email notifications for status changes
- [ ] Creator dashboard (web UI)
- [ ] Basic earnings tracking (download-based)
- [ ] Stripe Connect integration (deferred to v1.1)

### 7.2 MVP Simplifications

1. **No automated payouts** - Manual payouts via Stripe dashboard for v1.0
2. **No in-app notifications** - Email only
3. **Simple attribution** - Download count, not subscription attribution
4. **No creator profiles** - Just account settings

### 7.3 Out of Scope

- Automated quality checks (linting, testing)
- Pack dependencies between third-party packs
- Pack versioning reviews (only initial submission reviewed)
- Creator public profiles
- Pack ratings/reviews from users
- Affiliate/referral program

### 7.4 Future Considerations

1. **v1.1**: Stripe Connect payouts
2. **v1.2**: User ratings and reviews
3. **v1.3**: Automated quality gates
4. **v2.0**: Creator public profiles, pack dependencies

---

## 8. User Stories

### 8.1 Creator Stories

**US-1**: As a creator, I want to submit my pack for review so that it can be published to the registry.

**Acceptance Criteria**:
- Can click "Submit for Review" on draft pack
- Receive confirmation email
- See status change to "Pending Review"

**US-2**: As a creator, I want to see the status of my submission so that I know when to expect a decision.

**Acceptance Criteria**:
- Dashboard shows current status
- Can see estimated review time
- Can see reviewer feedback after decision

**US-3**: As a creator, I want to withdraw my submission so that I can make changes before review.

**Acceptance Criteria**:
- Can withdraw while in "Pending Review"
- Pack returns to "Draft" status
- Can edit and resubmit

**US-4**: As a creator, I want to receive feedback on rejected packs so that I can improve and resubmit.

**Acceptance Criteria**:
- Rejection email includes specific feedback
- Rejection reason categorized
- Can resubmit after addressing feedback

### 8.2 Admin Stories

**US-5**: As an admin, I want to see all packs pending review so that I can process them efficiently.

**Acceptance Criteria**:
- Queue sorted by submission date (oldest first)
- Can see pack preview/contents
- Can see creator info

**US-6**: As an admin, I want to approve or reject packs with feedback so that creators understand the decision.

**Acceptance Criteria**:
- One-click approve/reject
- Required feedback field for rejections
- Rejection reason selection
- Creator notified immediately

---

## 9. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low submission volume | Medium | High | Seed with THJ packs, recruit early creators |
| Review backlog | High | Medium | SLA commitment, automated reminders |
| Low-quality submissions | High | Medium | Clear guidelines, example packs |
| Stripe Connect complexity | Medium | Medium | Start with manual payouts |
| Creator disputes | Medium | Low | Clear terms, audit trail, appeal process |

---

## 10. Dependencies

### 10.1 Technical Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Pack API (CRUD) | Implemented | Enhance with new fields |
| Admin pack moderation | Implemented | Enhance with review workflow |
| Email service | Implemented | Add new templates |
| Stripe subscriptions | Implemented | Add Connect (v1.1) |

### 10.2 Content Dependencies

| Content | Owner | Status |
|---------|-------|--------|
| Creator guidelines | THJ | To create |
| Review criteria | THJ | To create |
| Email templates | THJ | To create |
| Terms for creators | THJ | To create (legal review) |

---

## 11. Implementation Phases

### Phase 1: Core Submission (Sprint 23)

- [ ] Add `POST /v1/packs/:slug/submit` endpoint
- [ ] Add `POST /v1/packs/:slug/withdraw` endpoint
- [ ] Add `GET /v1/packs/:slug/review-status` endpoint
- [ ] Enhance admin review with rejection reasons
- [ ] Email notifications (basic templates)
- [ ] Database schema for `pack_submissions`

### Phase 2: Creator Dashboard (Sprint 24)

- [ ] `/creator` route with pack list
- [ ] `/creator/new` pack creation flow
- [ ] `/creator/packs/:slug` pack management
- [ ] Analytics: downloads, status history

### Phase 3: Revenue Sharing (Sprint 25+)

- [ ] Stripe Connect onboarding
- [ ] Download attribution tracking
- [ ] Earnings calculation
- [ ] Payout processing
- [ ] Creator earnings dashboard

---

## 12. Review Criteria (Internal)

### 12.1 Quality Standards

A pack should be approved if it meets ALL of the following:

1. **Complete**: Has manifest, skills with SKILL.md, commands
2. **Functional**: Skills execute without errors
3. **Documented**: Clear description, usage instructions
4. **Original**: Not a copy of existing pack
5. **Safe**: No malicious code, no data exfiltration
6. **Useful**: Provides clear value to users

### 12.2 Rejection Reasons

| Reason | Guidance |
|--------|----------|
| `quality_standards` | Skills lack depth, prompts too generic |
| `incomplete_content` | Missing SKILL.md, bad manifest |
| `duplicate_functionality` | Too similar to published pack |
| `policy_violation` | Violates ToS, harmful content |
| `security_concern` | Suspicious patterns, data collection |

---

**Document Status**: Draft - Ready for Review
**Next Step**: `/architect` to create SDD addendum for Pack Submission

---

## Appendix A: Email Templates

### A.1 Creator Submission Received

```
Subject: Pack submitted for review: {pack_name}

Your pack "{pack_name}" has been submitted for review.

What happens next:
• Our team will review your pack within 2-3 business days
• You'll receive an email when a decision is made
• You can check status anytime at: {dashboard_url}

Submission details:
- Pack: {pack_name}
- Version: {version}
- Submitted: {submitted_at}

Questions? Reply to this email.

The Loa Team
```

### A.2 Creator Pack Approved

```
Subject: Congratulations! Your pack is live: {pack_name}

Great news! Your pack "{pack_name}" has been approved and is now live
on the Loa Registry.

Your pack is now available at:
{pack_url}

Users can install it with:
loa pack-install {pack_slug}

What's next:
• Share your pack on social media
• Monitor downloads in your creator dashboard
• Keep it updated with new versions

Thank you for contributing to the Loa ecosystem!

The Loa Team
```

### A.3 Creator Pack Rejected

```
Subject: Review feedback for: {pack_name}

Your pack "{pack_name}" was not approved at this time.

Reason: {rejection_reason_label}

Reviewer feedback:
{review_notes}

What you can do:
1. Address the feedback above
2. Update your pack
3. Resubmit for review

We want to help you succeed. If you have questions about
the feedback, reply to this email.

The Loa Team
```

---

## Appendix B: Creator Guidelines (Draft)

### What Makes a Great Pack

1. **Solve a real problem** - Skills should address specific workflows
2. **Be comprehensive** - Include all resources needed
3. **Document well** - Clear instructions, examples
4. **Test thoroughly** - Verify skills work as expected
5. **Stay focused** - One theme per pack

### Pack Structure Requirements

```
my-pack/
├── manifest.json         # Required
├── README.md             # Required
├── skills/
│   └── my-skill/
│       ├── index.yaml    # Required
│       ├── SKILL.md      # Required
│       └── resources/    # Optional
└── commands/
    └── my-command.md     # At least one required
```

### Prohibited Content

- Malicious code or data exfiltration
- Content that violates laws
- Harassment or hate speech
- Copyright infringement
- Deceptive practices

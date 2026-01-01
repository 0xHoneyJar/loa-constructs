# Product Requirements Document: GTM Collective Pack Integration

**Version**: 1.0.0
**Date**: 2025-12-31
**Author**: Product Manager Agent
**Status**: Draft

---

## 1. Executive Summary

### 1.1 Problem Statement

The GTM Collective—a premium suite of 8 Go-To-Market skills designed for the Loa framework—was migrated from the open-source `loa` repository to `loa-registry` to enable premium content distribution. However, these skills currently exist only in an archive directory (`loa-grimoire/context/archive/`) and have not been integrated into the registry's pack distribution system.

The registry infrastructure (API, CLI, database schema) is fully implemented and supports pack creation, versioning, and subscription-gated downloads. The GTM skills need to be packaged and published as a registry pack to enable distribution to paying subscribers.

### 1.2 Solution Overview

Package the 8 GTM skills, 14 commands, and associated resources as the `gtm-collective` pack in the Loa Registry. This involves:

1. **Restructuring files** from archive format to pack distribution format
2. **Creating pack metadata** (manifest, version info, pricing)
3. **Publishing to registry** via API or seeding script
4. **Validating end-to-end** installation flow

### 1.3 Business Value

| Metric | Impact |
|--------|--------|
| **Revenue Enablement** | First premium pack ready for paying subscribers |
| **Product Completeness** | Demonstrates full SaaS capability (creation → purchase → installation) |
| **GTM for GTM** | Dogfooding—using the registry to distribute GTM skills |

---

## 2. Goals and Success Criteria

### 2.1 Business Goals

1. **G1**: Enable premium content distribution through the registry
2. **G2**: Validate the pack lifecycle (publish → download → install → use)
3. **G3**: Establish a reference implementation for future premium packs

### 2.2 Success Criteria

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| Pack Published | `gtm-collective` exists in registry with status `published` | 100% |
| CLI Installation | `/pack-install gtm-collective` succeeds for pro+ subscribers | Works |
| Skills Functional | All 8 skills load and execute in Claude Code | 8/8 |
| Commands Available | All 14 commands accessible after installation | 14/14 |
| Subscription Gating | Free tier users receive 402 on download attempt | Enforced |

---

## 3. User Context

### 3.1 Primary Persona: Loa Pro Subscriber

**Profile**: Developer or technical founder building a product who needs GTM strategy support.

**Goals**:
- Get market research and competitive analysis without hiring consultants
- Create positioning, pricing, and launch materials
- Review GTM strategy for consistency before execution

**Pain Points**:
- GTM strategy is expensive when done by agencies
- Generic AI lacks structured methodology
- Coordinating multiple tools for different GTM tasks

**Buying Behavior**:
- Subscribes to Pro ($29/month) or Team ($99/month) for access to premium packs
- Expects seamless installation via CLI
- Values comprehensive, integrated tooling

### 3.2 Secondary Persona: Registry Administrator (Internal)

**Profile**: THJ team member managing the registry.

**Goals**:
- Publish and maintain premium packs
- Monitor installation metrics
- Handle subscription verification

---

## 4. Functional Requirements

### 4.1 Pack Structure

The GTM Collective pack must include:

#### Skills (8)

| Skill Slug | Purpose | Triggers |
|------------|---------|----------|
| `analyzing-market` | Market research, TAM/SAM/SOM, competitive analysis | `/analyze-market` |
| `positioning-product` | Product positioning, messaging frameworks | `/position` |
| `pricing-strategist` | Pricing models, value metrics | `/price` |
| `crafting-narratives` | Launch plans, release announcements, content | `/plan-launch`, `/announce-release` |
| `educating-developers` | DevRel strategy | `/plan-devrel` |
| `building-partnerships` | Partnership and BD strategy | `/plan-partnerships` |
| `translating-for-stakeholders` | Executive communication, pitch decks | `/create-deck` |
| `reviewing-gtm` | GTM strategy review and validation | `/review-gtm` |

#### Commands (14)

**Workflow Commands** (5):
- `gtm-setup.md` - Initialize GTM workflow
- `gtm-adopt.md` - Adopt technical reality from SDD
- `gtm-feature-requests.md` - Feature requests for dev team
- `sync-from-gtm.md` - Sync from GTM to dev
- `review-gtm.md` - Review GTM strategy

**Routing Commands** (9):
- `analyze-market.md` → `analyzing-market` skill
- `position.md` → `positioning-product` skill
- `price.md` → `pricing-strategist` skill
- `plan-launch.md` → `crafting-narratives` skill
- `announce-release.md` → `crafting-narratives` skill
- `plan-devrel.md` → `educating-developers` skill
- `plan-partnerships.md` → `building-partnerships` skill
- `create-deck.md` → `translating-for-stakeholders` skill
- `sync-from-dev.md` - Sync from dev to GTM

#### Resources

Each skill includes template resources:
- `analyzing-market`: market-landscape, competitive-analysis, icp-profiles templates
- `positioning-product`: positioning, messaging-framework templates
- `pricing-strategist`: pricing-strategy, value-metric-worksheet templates
- `crafting-narratives`: content-calendar, launch-plan templates
- `educating-developers`: devrel-strategy template
- `building-partnerships`: partnership-strategy template
- `translating-for-stakeholders`: pitch-deck template
- `reviewing-gtm`: gtm-review template

**Total Resource Templates**: 12

### 4.2 Pack Manifest

```yaml
name: "GTM Collective"
slug: "gtm-collective"
version: "1.0.0"
description: "Go-to-market strategy skills for product launches, positioning, pricing, and market analysis"
author:
  name: "The Honey Jar"
  url: "https://loaskills.dev"
skills:
  - slug: analyzing-market
    path: skills/analyzing-market/
  - slug: positioning-product
    path: skills/positioning-product/
  - slug: pricing-strategist
    path: skills/pricing-strategist/
  - slug: crafting-narratives
    path: skills/crafting-narratives/
  - slug: educating-developers
    path: skills/educating-developers/
  - slug: building-partnerships
    path: skills/building-partnerships/
  - slug: translating-for-stakeholders
    path: skills/translating-for-stakeholders/
  - slug: reviewing-gtm
    path: skills/reviewing-gtm/
commands:
  - name: gtm-setup
    path: commands/gtm-setup.md
  - name: gtm-adopt
    path: commands/gtm-adopt.md
  - name: gtm-feature-requests
    path: commands/gtm-feature-requests.md
  - name: sync-from-gtm
    path: commands/sync-from-gtm.md
  - name: review-gtm
    path: commands/review-gtm.md
  - name: analyze-market
    path: commands/analyze-market.md
  - name: position
    path: commands/position.md
  - name: price
    path: commands/price.md
  - name: plan-launch
    path: commands/plan-launch.md
  - name: announce-release
    path: commands/announce-release.md
  - name: plan-devrel
    path: commands/plan-devrel.md
  - name: plan-partnerships
    path: commands/plan-partnerships.md
  - name: create-deck
    path: commands/create-deck.md
  - name: sync-from-dev
    path: commands/sync-from-dev.md
dependencies:
  loa_version: ">=0.9.0"
pricing:
  type: subscription
  tier: pro
tags:
  - marketing
  - gtm
  - positioning
  - pricing
  - launch
  - devrel
license: "Proprietary"
```

### 4.3 Pricing Configuration

| Field | Value |
|-------|-------|
| `pricing_type` | `subscription` |
| `tier_required` | `pro` |
| `stripe_product_id` | (To be created) |
| `stripe_monthly_price_id` | (Included in Pro subscription) |
| `stripe_annual_price_id` | (Included in Pro subscription) |

**Access Rules**:
- Free tier: 402 Payment Required
- Pro tier: Full access
- Team tier: Full access
- Enterprise tier: Full access
- Pack owner (THJ admin): Full access regardless of tier

### 4.4 Installation Behavior

When user runs `/pack-install gtm-collective`:

1. **Auth Check**: Verify user is logged in
2. **Tier Check**: Verify user has `pro` or higher subscription
3. **Download**: Fetch pack files from API
4. **Extract Skills**: Install to `.claude/skills/{skill-slug}/`
5. **Extract Commands**: Install to `.claude/commands/{command}.md`
6. **Write Manifest**: Save to `.claude/packs/gtm-collective/manifest.json`
7. **Write License**: Save to `.claude/packs/gtm-collective/.license.json`

### 4.5 State Directory (GTM Grimoire)

The pack expects a `gtm-grimoire/` directory for state:

```
gtm-grimoire/
├── NOTES.md           # GTM agent memory
├── context/           # User-provided GTM context
│   ├── product-brief.md
│   └── product-reality.md
├── research/          # Market research outputs
│   ├── market-landscape.md
│   ├── competitive-analysis.md
│   └── icp-profiles.md
├── strategy/          # Strategy documents
│   ├── positioning.md
│   ├── messaging-framework.md
│   └── pricing-strategy.md
├── execution/         # Launch artifacts
│   ├── launch-plan.md
│   ├── content-calendar.md
│   └── pitch-deck.md
└── a2a/               # Agent-to-agent communication
    ├── reviews/
    └── trajectory/
```

**Note**: This directory structure should be created by `/gtm-setup` command, not by installation.

---

## 5. Technical Requirements

### 5.1 File Restructuring

Transform archive structure to pack distribution format:

**Current Location**: `loa-grimoire/context/archive/gtm-skills-import/`

**Target Structure** (for upload):
```
gtm-collective/
├── manifest.json
├── skills/
│   ├── analyzing-market/
│   │   ├── index.yaml
│   │   ├── SKILL.md
│   │   └── resources/
│   │       ├── market-landscape-template.md
│   │       ├── competitive-analysis-template.md
│   │       └── icp-profiles-template.md
│   ├── positioning-product/
│   │   └── ...
│   └── ... (6 more skills)
└── commands/
    ├── gtm-setup.md
    ├── analyze-market.md
    └── ... (12 more commands)
```

### 5.2 API Integration

Use existing endpoints:

| Endpoint | Purpose |
|----------|---------|
| `POST /v1/packs` | Create pack metadata |
| `POST /v1/packs/gtm-collective/versions` | Upload version with files |
| `PATCH /v1/packs/gtm-collective` | Set status to `published` |

### 5.3 Seeding Script

Create `scripts/seed-gtm-collective.ts`:

```typescript
// Script to:
// 1. Read files from archive
// 2. Transform to pack structure
// 3. Upload via API with admin credentials
// 4. Set THJ bypass flag for testing
```

### 5.4 Skill Compatibility Updates

Each skill's `index.yaml` references:
- `pack.id: "gtm-collective"`
- `pack.requires_subscription: true`

These are informational only—the actual access control is handled by the API.

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Requirement |
|--------|-------------|
| Pack download size | < 500KB (text files only) |
| Installation time | < 5 seconds |
| API response time | < 1 second for download |

### 6.2 Security

| Requirement | Implementation |
|-------------|----------------|
| Subscription verification | API checks tier before download |
| License watermarking | User ID hash embedded in license |
| File path validation | Server-side path sanitization |

### 6.3 Compatibility

| Constraint | Value |
|------------|-------|
| Minimum Loa version | 0.9.0 |
| Claude Code compatibility | Yes |
| Protocol dependencies | session-continuity, grounding-enforcement |

---

## 7. Scope Definition

### 7.1 In Scope (MVP)

- [x] Pack structure with 8 skills and 14 commands
- [x] Manifest with pricing configuration
- [x] Seeding script to publish pack
- [x] CLI installation verification
- [x] Subscription tier gating

### 7.2 Out of Scope

- Stripe product/price creation (use existing Pro subscription)
- Web UI for pack browsing (future sprint)
- Pack update notifications
- Usage analytics dashboard
- GTM Grimoire state directory creation (handled by `/gtm-setup`)

### 7.3 Future Considerations

1. **Version Updates**: Mechanism for updating installed packs
2. **Dependency Resolution**: If packs depend on other packs
3. **Web Marketplace**: Browsable pack catalog with reviews

---

## 8. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Skill files have incorrect paths | High | Medium | Validate all file paths during transformation |
| Commands conflict with core Loa commands | High | Low | Use `gtm-` prefix for workflow commands |
| Subscription check bypass | High | Low | Server-side enforcement, not client-side |
| Large pack size causes timeout | Medium | Low | Pack is text-only, ~200KB expected |

---

## 9. Dependencies

### 9.1 Technical Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Pack API endpoints | Implemented | `apps/api/src/routes/packs.ts` |
| Pack CLI commands | Implemented | `packages/loa-registry/src/commands/pack-*.ts` |
| Database schema | Implemented | `packs`, `pack_versions`, `pack_files` tables |
| Subscription service | Implemented | Tier checking via `getEffectiveTier` |

### 9.2 Content Dependencies

| Content | Location | Status |
|---------|----------|--------|
| 8 GTM skills | `loa-grimoire/context/archive/gtm-skills-import/` | Ready |
| 5 workflow commands | `loa-grimoire/context/archive/gtm-skills-import/commands/` | Ready |
| 9 routing commands | `loa-grimoire/context/archive/gtm-commands/` | Ready |
| 2 command resources | `loa-grimoire/context/archive/gtm-commands/resources/` | Ready |

---

## 10. Implementation Checklist

### Phase 1: Preparation
- [ ] Create `packs/gtm-collective/` staging directory
- [ ] Copy and restructure skills from archive
- [ ] Copy and restructure commands from archive
- [ ] Generate `manifest.json` from template

### Phase 2: Publication
- [ ] Create seeding script `scripts/seed-gtm-collective.ts`
- [ ] Run script to publish pack to registry database
- [ ] Set `status: published` and `thj_bypass: true` for testing
- [ ] Verify pack appears in `GET /v1/packs`

### Phase 3: Validation
- [ ] Test `/pack-install gtm-collective` as pro user
- [ ] Verify all skills installed to `.claude/skills/`
- [ ] Verify all commands installed to `.claude/commands/`
- [ ] Test 402 response for free tier user
- [ ] Run one GTM command (e.g., `/gtm-setup`) to verify functionality

### Phase 4: Cleanup
- [ ] Remove archive files after successful validation
- [ ] Update CHANGELOG with pack publication
- [ ] Document pack in registry README

---

## 11. Appendix

### A. File Inventory

**Skills** (8 directories, ~50 files total):
1. `analyzing-market/` - 5 files
2. `positioning-product/` - 5 files
3. `pricing-strategist/` - 5 files
4. `crafting-narratives/` - 5 files
5. `educating-developers/` - 4 files
6. `building-partnerships/` - 4 files
7. `translating-for-stakeholders/` - 4 files
8. `reviewing-gtm/` - 4 files

**Commands** (14 files):
- 5 workflow commands
- 9 routing commands

**Resources** (2 files):
- `product-brief-template.md`
- `product-reality-template.md`

### B. Source Locations

| Content Type | Archive Path |
|--------------|--------------|
| Skills | `loa-grimoire/context/archive/gtm-skills-import/{skill-slug}/` |
| Workflow Commands | `loa-grimoire/context/archive/gtm-skills-import/commands/` |
| Routing Commands | `loa-grimoire/context/archive/gtm-commands/` |
| Command Resources | `loa-grimoire/context/archive/gtm-commands/resources/` |
| Reference Docs | `loa-grimoire/context/archive/gtm-*.md` |

### C. Related Documentation

- GTM Migration Summary: `loa-grimoire/context/archive/GTM-MIGRATION-SUMMARY.md`
- GTM PRD Reference: `loa-grimoire/context/archive/gtm-prd-reference.md`
- GTM SDD Reference: `loa-grimoire/context/archive/gtm-sdd-reference.md`
- GTM Sprint Reference: `loa-grimoire/context/archive/gtm-sprint-reference.md`

---

**Document Status**: Ready for review
**Next Step**: `/architect` to create Software Design Document

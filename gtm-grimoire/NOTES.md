# GTM Workflow Notes

## Last Updated
2026-01-08

## Active Sub-Goals
- [x] Complete market analysis phase
- [x] Define positioning strategy (`/position`)
- [x] Develop pricing model (`/price`)
- [x] Plan launch execution (`/plan-launch`)
- [x] Review GTM strategy (`/review-gtm`) - **APPROVED**

## Key Insights (Market Analysis)

### Market Size & Opportunity
- **TAM**: $4.91B (2024) → $30.1B by 2032 (27.1% CAGR)
- **SAM**: ~$750M (Claude-specific tools segment)
- **SOM**: $1.5-3M (Year 1-3 target)
- 41% of developers use Claude (Second Talent, 2025)
- AI coding assistant adoption at 84% (2025)

### Competitive Positioning
- **No direct competitor** for Claude Code skill packs with subscription model
- Closest alternatives: MCP servers (infrastructure), Cursor rules (simple prompts), PromptBase (single prompts)
- **Key gap**: Multi-step workflows for non-code tasks (GTM, docs, security)
- **Differentiation**: Managed scaffolding, 70% creator revenue share, beyond-code skills

### Target Customers (Priority Order)
1. **P0: Solo Builder Sam** - Indie hackers, bootstrapped founders
   - Pain: "I have to do everything myself"
   - Hook: "Ship faster without a team"
2. **P0: Startup CTO Sarah** - Technical co-founders, 2-20 person teams
   - Pain: Team wears multiple hats, no dedicated GTM/docs
   - Hook: "Production-ready workflows for your team"
3. **P1: DevTool Developer Dave** - Senior engineers using Claude Code
   - Expansion from CTOs, potential creators
4. **P2: Agency Lead Alex** - Future team tier customer

### Pricing Context
- GitHub Copilot: $10/mo individual
- Cursor: $20/mo Pro
- Windsurf: $15/mo
- **Loa: $29/mo** - Premium position justified by workflow depth

### Key Risks
1. Anthropic launching official skill marketplace (medium risk, 12-18 mo)
2. Prompt marketplace commoditization (low-medium risk)
3. GitHub Copilot workflow expansion (medium risk)

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-08 | Prioritize indie hackers + startup CTOs | Best fit with GTM Collective, self-serve, price-aligned |
| 2026-01-08 | Position as "beyond coding" | Unique differentiation vs. code-focused competitors |
| 2026-01-08 | Validate $29/mo pricing | Premium to Copilot, competitive with Cursor, justified by workflow value |

## Research Artifacts
- `gtm-grimoire/research/market-landscape.md` - TAM/SAM/SOM, trends, segments
- `gtm-grimoire/research/competitive-analysis.md` - Competitor profiles, feature matrix
- `gtm-grimoire/research/icp-profiles.md` - 4 ICPs with detailed profiles
- `gtm-grimoire/strategy/positioning.md` - Positioning statement, messaging framework, competitive differentiation

## Key Insights (Positioning)

### Category Strategy
- **Create New Category**: "AI Agent Skill Packs"
- Not competing in prompts, MCP servers, or AI IDE categories
- First-mover advantage in Claude Code workflow ecosystem

### Positioning Statement
> For technical founders using Claude Code who need to handle non-code tasks (GTM, docs, deployment), Loa Constructs is a skill pack registry that delivers expert-designed, multi-step agent workflows—unlike MCP servers (infrastructure), prompt marketplaces (single prompts), or AI coding tools (code-only).

### Core Messaging
- **Headline**: "Skill packs for Claude Code. Beyond coding."
- **Tagline**: "The other 50% of shipping products."
- **Key Phrase**: "Workflows, not prompts"

### Differentiation Summary
| vs. Competitor | Our Advantage |
|----------------|---------------|
| MCP Marketplaces | Workflows vs. infrastructure |
| Prompt Marketplaces | Complete methodologies vs. single prompts |
| AI Coding Tools | Beyond code (GTM, docs, security) |
| DIY | Instant expert expertise vs. months building |

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-08 | Prioritize indie hackers + startup CTOs | Best fit with GTM Collective, self-serve, price-aligned |
| 2026-01-08 | Position as "beyond coding" | Unique differentiation vs. code-focused competitors |
| 2026-01-08 | Validate $29/mo pricing | Premium to Copilot, competitive with Cursor, justified by workflow value |
| 2026-01-08 | Create new category "AI Agent Skill Packs" | No direct competitor, defensible positioning |
| 2026-01-08 | Avoid "AI-powered" and marketing jargon | Developer audience sees through it |
| 2026-01-08 | Freemium subscription model | Predictable revenue, customer expectations, creator economics |
| 2026-01-08 | $29 Pro / $99 Team / $299 Enterprise | Premium to code tools, accessible to indie/startup ICPs |
| 2026-01-08 | 17% annual discount | Industry standard, improves cash flow |
| 2026-01-08 | Grandfathering existing users | Reduces churn, rewards loyalty |

## Key Insights (Pricing)

### Pricing Model
- **Freemium Subscription**: Free tier for adoption, Pro/Team/Enterprise for conversion
- **Value Metric**: Pack access level (Free = basic, Pro+ = all including premium)
- **Price Anchoring**: "Less than one hour of consultant time"

### Tier Structure
| Tier | Price | Target ICP | Key Value |
|------|-------|------------|-----------|
| Free | $0/mo | DevTool Dave (P1) | Community packs, trial |
| Pro | $29/mo | Solo Sam, Individual Sarah (P0) | All packs, creator features |
| Team | $99/mo | Team Sarah, Agency Alex | 5 seats, collaboration, analytics |
| Enterprise | $299/mo | Future expansion | SSO, SLA, unlimited seats |

### Revenue Projections (Year 1)
- Target: ~$15K MRR / ~$187K ARR
- Based on: 5,000 registrations, 10% Pro conversion, 5% monthly churn

### Creator Economics
- 70% revenue share to creators
- Attribution-based payout calculation
- $50 minimum threshold, monthly Stripe Connect payouts

## Strategy Artifacts
- `gtm-grimoire/strategy/positioning.md` - Positioning, messaging, differentiation
- `gtm-grimoire/strategy/pricing-strategy.md` - Pricing model, tiers, projections

## Execution Artifacts
- `gtm-grimoire/execution/launch-plan.md` - Launch timeline, phases, risk mitigation
- `gtm-grimoire/execution/content-calendar.md` - Content schedule, templates, assets

## Key Insights (Launch Plan)

### Launch Strategy
- **Type**: Soft launch (community-driven, rolling engagement)
- **Rationale**: Bootstrapped budget ($0-1K), small team, community-first fit
- **Duration**: 3-week rolling launch (Jan 15-Feb 8)

### Launch Timeline
| Phase | Dates | Focus |
|-------|-------|-------|
| Pre-Launch | Jan 8-14 | Content prep, teasers, asset creation |
| Launch Week | Jan 15-21 | HN, Twitter, Product Hunt, Indie Hackers, Reddit |
| Post-Launch | Jan 22 - Feb 8 | Case studies, tutorials, momentum |

### Key Dates
- **Jan 15**: Soft launch start (HN + Twitter)
- **Jan 17**: Product Hunt launch day
- **Jan 19**: Indie Hackers post
- **Feb 9**: Month 1 review

### Launch Goals
| Metric | Target (30 days) |
|--------|------------------|
| Registered users | 100 |
| Pro subscribers | 10 |
| Free → Pro conversion | 10% |
| GitHub stars | 50 |

### Primary Channels (Priority Order)
1. Twitter/X - Daily engagement, threads, demos
2. Hacker News - Show HN, technical discussion
3. Product Hunt - Anchor launch event
4. Indie Hackers - Community post, feedback
5. Reddit - r/ClaudeAI, r/SideProject

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-08 | Prioritize indie hackers + startup CTOs | Best fit with GTM Collective, self-serve, price-aligned |
| 2026-01-08 | Position as "beyond coding" | Unique differentiation vs. code-focused competitors |
| 2026-01-08 | Validate $29/mo pricing | Premium to Copilot, competitive with Cursor, justified by workflow value |
| 2026-01-08 | Create new category "AI Agent Skill Packs" | No direct competitor, defensible positioning |
| 2026-01-08 | Avoid "AI-powered" and marketing jargon | Developer audience sees through it |
| 2026-01-08 | Freemium subscription model | Predictable revenue, customer expectations, creator economics |
| 2026-01-08 | $29 Pro / $99 Team / $299 Enterprise | Premium to code tools, accessible to indie/startup ICPs |
| 2026-01-08 | 17% annual discount | Industry standard, improves cash flow |
| 2026-01-08 | Grandfathering existing users | Reduces churn, rewards loyalty |
| 2026-01-08 | Soft launch over hard launch | Budget constraints, small team, iterate quickly |
| 2026-01-08 | Product Hunt on Friday Jan 17 | Optimal day for dev tools, mid-week start builds momentum |

## Review Artifacts
- `gtm-grimoire/a2a/reviews/gtm-review-2026-01-08.md` - GTM strategy review

## GTM Review Summary (2026-01-08)

### Verdict: APPROVED - READY TO EXECUTE

### Consistency Checks Passed
- [x] ICPs consistent across all documents
- [x] Pricing ($29/mo Pro) consistent everywhere
- [x] Messaging ("Skill packs for Claude Code. Beyond coding.") consistent
- [x] Launch goals (100 users, 10 Pro) consistent
- [x] Revenue share (70% creator) consistent
- [x] Channels aligned with ICP preferences

### Minor Issues (Non-Blocking)
1. CLI command in product-brief.md uses old syntax (`loa pack-install`) - update to `claude skills add`
2. Verify "8 skills, 14 commands" claim matches actual GTM Collective content

### Missing Optional Artifacts
- partnership-strategy.md (create post-launch)
- devrel-strategy.md (create when scaling)

### Grounding Quality
- All documents achieve ≥0.95 grounding ratio
- Explicit citations throughout strategy documents
- Assumptions clearly marked

## Session Continuity
Last action: Created Sprint 26 for marketing website (`/sprint-plan`)
Next recommended: `/implement sprint-26` to build constructs.network marketing website

## Sprint 26 Created (2026-01-08)

Sprint plan for **constructs.network** marketing website has been added to `loa-grimoire/sprint.md`:

**18 tasks covering**:
- Marketing layout and header/footer components
- Landing page with GTM-approved copy
- Pricing page (Free/$29 Pro/$99 Team/$299 Enterprise)
- About page with origin story
- Public packs catalog (browse without login)
- Pack detail pages
- Documentation hub
- Blog with launch announcement
- Legal pages (Terms, Privacy)
- SEO metadata and Open Graph
- Demo GIFs
- Analytics integration
- Mobile responsiveness
- Custom domain setup (constructs.network)
- E2E tests

**Estimated effort**: ~36 hours (3-4 days)
**Tech stack**: Next.js 14, TUI components (from Sprint 18-20), Vercel hosting

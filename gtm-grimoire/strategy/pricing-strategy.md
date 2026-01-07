# Pricing Strategy

## Executive Summary

Loa Constructs uses a **freemium subscription model** with pack access as the primary value gate. The pricing structure—Free ($0), Pro ($29/mo), Team ($99/mo), Enterprise ($299/mo)—positions us premium to code completion tools but accessible for our primary ICPs (indie hackers, startup CTOs). The 70% creator revenue share incentivizes ecosystem growth while maintaining sustainable unit economics.

## Pricing Model

**Selected Model**: **Freemium Subscription** (flat-rate tiers with feature/access gating)

**Rationale**:
1. **Predictable revenue**: Subscription provides stable MRR vs. per-pack purchases
2. **Customer expectation**: Developer tools in this space are subscription (Copilot $10/mo, Cursor $20/mo) [Reference: gtm-grimoire/research/competitive-analysis.md#Pricing-Comparison]
3. **Value alignment**: Skill packs provide ongoing value (updates, new versions) justifying recurring payment
4. **Creator economics**: Subscription model enables meaningful recurring revenue share (70%)
5. **Adoption funnel**: Free tier drives trial and community growth; Pro conversion validates value

**Alternatives Considered**:

| Model | Pros | Cons | Why Not Selected |
|-------|------|------|------------------|
| **Per-Pack Purchase** | Simple, PromptBase-proven | No recurring revenue, lower LTV, harder creator payouts | Doesn't match developer tool expectations; subscription better for ongoing value |
| **Usage-Based** | Scales with value, fair | Unpredictable costs, complexity, developer friction | Developers prefer predictable costs; usage metering adds complexity |
| **Seat-Based Only** | Enterprise-ready | Doesn't fit solo/indie users; overkill for primary ICP | P0 ICPs are solo/small teams; seat-based penalizes growth |
| **Credit System** | Flexible, gamified | Confusing, requires constant management | Adds friction; developers dislike managing credits |

## Value Metric

**Primary Metric**: **Pack Access Level** (Free packs vs. All packs including Premium)

**Why This Metric**:

- **Correlates with value**: Premium packs (GTM Collective, future Security Audit pack) provide expert methodology worth significantly more than basic packs
- **Easy to understand**: "Free tier = basic packs, Pro = everything" is simple
- **Scales appropriately**: More premium packs → more reasons to stay subscribed
- **Low friction**: No counting usage, no surprise bills

**Secondary Metric** (Team/Enterprise): **Seats** for multi-user features

- Team tier includes 5 seats, additional seats $15/mo each
- Enterprise tier includes unlimited seats

## Tier Structure

### Free Tier

**Price**: $0/month

**Purpose**: Lead generation, community building, viral adoption

**Target ICP**: DevTool Developer Dave (P1), early-stage exploration for Sam/Sarah

**Includes**:
- Access to public/community packs
- Basic CLI functionality (`claude skills add`, `claude skills list`)
- 100 API requests/minute rate limit
- Community Discord access

**Limits**:
- No premium pack access (GTM Collective, etc.)
- No creator dashboard features
- No team collaboration features

**Upgrade Triggers**:
- User tries to install premium pack → "Upgrade to Pro to access GTM Collective"
- User hits rate limit during heavy usage
- User sees value in free packs, wants professional workflows

**Strategic Intent**:
Free tier creates awareness and habit formation. Users experience the "one command install" value prop, then upgrade when they need premium expertise (GTM, security auditing, deployment).

---

### Pro Tier

**Price**: $29/month ($290/year with 17% annual discount)

**Target ICP**: Solo Builder Sam (P0), individual Startup CTO Sarah (P0)

**Includes**:
- **All packs**: Unlimited access to every pack (premium + community)
- **Premium packs**: GTM Collective, future premium packs
- **Creator dashboard**: Submit packs, view earnings, Stripe Connect
- **300 API requests/minute rate limit**
- Priority Discord support channel

**Key Differentiator from Free**: Premium pack access + creator features

**Value Justification** [Reference: gtm-grimoire/strategy/positioning.md#objection-handling]:
- $29/mo < 1 hour of consultant time
- GTM Collective: 8 skills, 14 commands = complete GTM methodology
- If saves 4+ hours on launch strategy, ROI in month one

**Why $29/mo** (not $19 or $39):
- **Premium to Copilot ($10)**: We're more than code completion—complete workflows
- **Competitive with Cursor ($20)**: Similar price point, different value prop
- **Accessible to bootstrapped founders**: Within indie SaaS tool budget [Reference: gtm-grimoire/research/icp-profiles.md - Sam's price sensitivity: "$29/mo acceptable if ROI clear"]
- **Sustainable unit economics**: Supports 70% creator share + platform costs

---

### Team Tier

**Price**: $99/month ($990/year with 17% annual discount)

**Target ICP**: Startup CTO Sarah with team (P0), Agency Lead Alex (P2)

**Includes**:
- Everything in Pro
- **5 seats included** (additional seats $15/mo each)
- **Team collaboration**: Shared pack configurations, team-wide settings
- **Usage analytics**: Which packs, which commands, team insights
- **500 API requests/minute rate limit**
- Dedicated Slack/Discord channel
- Priority support (24-48 hour response)

**Key Differentiator from Pro**: Multi-user + team features + higher limits

**Value Justification**:
- $99/mo for 5 seats = $19.80/seat (vs. $29/individual Pro × 5 = $145)
- Team standardization: Consistent AI workflows across engineering
- Analytics: Know what's working, where team spends time

**Why $99/mo**:
- Clear step-up from Pro ($29 → $99, not $29 → $199)
- Within startup tool budget (no procurement/approval needed)
- Per-seat value ($19.80) competitive with Copilot Team ($19/user) [Reference: gtm-grimoire/research/competitive-analysis.md#Pricing-Comparison]

---

### Enterprise Tier

**Price**: $299/month (custom pricing available for 50+ seats)

**Target ICP**: Larger agencies, mid-market companies (future)

**Includes**:
- Everything in Team
- **Unlimited seats**
- **SSO/SAML integration**
- **Custom SLA** (99.9% uptime guarantee)
- **1000 API requests/minute rate limit**
- Dedicated account manager
- Custom pack development consultation
- Priority feature requests
- Invoice billing (NET 30)

**Key Differentiator from Team**: SSO, SLA, unlimited seats, dedicated support

**Value Justification**:
- SSO mandatory for enterprise security compliance
- SLA required for critical workflow dependencies
- Dedicated support for onboarding, custom needs

**Why $299/mo**:
- Entry-level enterprise pricing
- Significantly below enterprise AI tool pricing ($500-1000+/mo)
- Flat rate simplifies procurement
- Custom pricing for 50+ seat deployments

---

## Pricing Comparison

### vs. AI Coding Tools

| Tier | Loa Constructs | GitHub Copilot | Cursor | Windsurf |
|------|----------------|----------------|--------|----------|
| Free | Basic packs | 50 req/mo | Limited | Limited |
| Pro/Individual | **$29/mo** | $10/mo | $20/mo | $15/mo |
| Team | **$99/mo** (5 seats) | $19/user/mo | $40/user/mo | $30/user/mo |
| Enterprise | **$299/mo** | Custom | Custom | Custom |

[Reference: gtm-grimoire/research/competitive-analysis.md#Pricing-Comparison]

**Positioning**: Premium to code-completion tools, justified by workflow depth (not just code, but GTM/docs/security/deployment).

### vs. Prompt Marketplaces

| Aspect | Loa Constructs | PromptBase |
|--------|----------------|------------|
| Model | Subscription | Per-prompt purchase |
| Price | $29/mo unlimited | $1.99-9.99/prompt |
| Value | Complete workflows | Single prompts |
| Creator Share | 70% | 80% |

**Positioning**: Subscription gives unlimited access to professional workflows; per-prompt works for one-off simple prompts but not complete methodologies.

### vs. DIY / Free Alternatives

| Aspect | Loa Constructs Pro | Building Yourself |
|--------|-------------------|-------------------|
| Time to Value | 60 seconds (install) | Days-weeks |
| Expertise Required | None | Prompt engineering + domain expertise |
| Maintenance | Managed updates | Self-maintained |
| Quality Assurance | Curated, tested | Unknown |
| Cost | $29/mo | "Free" (your time) |

**Positioning**: $29/mo < 1 hour of your time. If GTM Collective saves 4+ hours, it's already positive ROI.

---

## Discounting Framework

| Scenario | Discount | Conditions | Strategic Intent |
|----------|----------|------------|------------------|
| **Annual Prepay** | 17% (~2 months free) | Pay upfront for year | Improve cash flow, reduce churn |
| **Startup Program** | 50% for 12 months | <$2M raised, <20 employees, verified | Capture early-stage startups, grow with them |
| **Open Source Maintainers** | Free Pro tier | Active OSS project (500+ stars) | Community goodwill, word-of-mouth |
| **Students/Education** | 50% | .edu email verification | Future pipeline, habit formation |
| **Non-profit** | 25% | 501c3 verification | Community goodwill |

**Discounting Philosophy**:
- No ad-hoc discounting (devalues product, creates negotiation expectation)
- Published programs only
- Startup/student programs create future paid customers
- Open source creates community advocacy

---

## Price Anchoring

**Primary Anchor**: Consultant/agency hourly rate

**Positioning**: "Less than one hour of consultant time"

**Justification**:
- GTM strategy consultant: $150-300/hour minimum
- $29/mo Pro tier = fraction of single consultation
- GTM Collective provides complete methodology that would take consultant 10+ hours

**Secondary Anchor**: Time saved

**Positioning**: "If it saves you 4 hours, it's paid for itself"

**Justification**:
- Developer time value: $50-150/hour
- GTM Collective saves 10-20+ hours on launch strategy
- ROI = (hours saved × hourly rate) - $29 = significant positive

**Tertiary Anchor**: Competitor pricing (use sparingly)

**Positioning**: "Premium workflows, similar price to code completion"

**Justification**:
- Copilot $10/mo = line completion
- Cursor $20/mo = IDE + completion
- Loa $29/mo = complete business workflows (GTM, docs, security)
- $9 more than Cursor for significantly more scope

---

## Revenue Projections

### Assumptions [All ASSUMPTION]

- Year 1 registrations: 5,000 users
- Free → Pro conversion: 10%
- Pro → Team conversion: 5%
- Monthly churn: 5%
- Annual plan uptake: 30%

### Year 1 Projection

| Tier | Users (End Y1) | MRR | ARR |
|------|----------------|-----|-----|
| Free | 4,200 | $0 | $0 |
| Pro | 450 | $13,050 | $156,600 |
| Team | 20 | $1,980 | $23,760 |
| Enterprise | 2 | $598 | $7,176 |
| **Total** | 4,672 | **$15,628** | **$187,536** |

### Year 2 Projection (with growth)

| Tier | Users (End Y2) | MRR | ARR |
|------|----------------|-----|-----|
| Free | 15,000 | $0 | $0 |
| Pro | 1,500 | $43,500 | $522,000 |
| Team | 75 | $7,425 | $89,100 |
| Enterprise | 10 | $2,990 | $35,880 |
| **Total** | 16,585 | **$53,915** | **$646,980** |

### Unit Economics

| Metric | Value | Notes |
|--------|-------|-------|
| Pro ARPU | $29/mo | Flat rate |
| Team ARPU | $99/mo | 5 seats included |
| Blended ARPU | ~$31/mo | [ASSUMPTION] Weighted by tier mix |
| Creator Payout | 70% of Pro revenue | Attribution-based calculation |
| Platform Margin | 30% gross | Covers infrastructure, support |
| CAC Target | < $50 | Self-serve, content marketing |
| LTV:CAC Target | > 3:1 | Healthy SaaS benchmark |

---

## Creator Economics

### Revenue Share Model

| Party | Share | Calculation |
|-------|-------|-------------|
| Creator | **70%** | Net after platform fee |
| Platform | **30%** | Operating costs, infrastructure |

[Reference: gtm-grimoire/context/product-reality.md - confirmed 70/30 split]

### Attribution Model

Downloads are attributed to subscriptions for payout calculation:
- Each download increments attribution for pack/subscription/month
- Monthly aggregation for payout
- Only counts subscriptions that actually downloaded packs

### Payout Details

- **Minimum threshold**: $50 (configurable per creator)
- **Frequency**: Monthly (1st of month)
- **Method**: Stripe Connect direct transfer
- **Account type**: Express (hosted onboarding)

### Creator Value Proposition

**Why 70% (vs. 80% at PromptBase)**:

1. **Recurring revenue**: Subscription = ongoing income vs. one-time purchase
2. **Higher ARPU**: $29/mo subscription >> $5 prompt purchase
3. **Lower creator effort**: Platform handles payments, subscriptions, support
4. **Attribution model**: Fair distribution based on actual usage

**Example Creator Earnings** [ASSUMPTION]:

| Scenario | Monthly Downloads | Creator Share | Monthly Earnings |
|----------|-------------------|---------------|------------------|
| Small Pack | 100 | $2.03/download* | $203 |
| Medium Pack | 500 | $2.03/download* | $1,015 |
| Popular Pack | 2,000 | $2.03/download* | $4,060 |

*Assuming $29 Pro × 70% / 10 downloads avg per subscriber

---

## Implementation Notes

### Launch Pricing

**Strategy**: Launch at full price, no introductory discounts

**Rationale**:
- Establishes value anchor from day one
- Avoids "wait for sale" behavior
- Early adopters get grandfathering benefits instead

### Grandfathering Policy

**Policy**: Existing users keep their price for life on current tier

**Implementation**:
- Price locked at time of subscription
- Applies only if subscription remains active (no gap)
- Tier changes subject to current pricing

**Strategic Intent**: Reduces churn, rewards loyalty, enables future price increases without hurting early adopters.

### Price Change Process

**Frequency**: Annual review maximum

**Process**:
1. Announce 60 days before change
2. Existing subscribers grandfathered
3. New subscribers on new pricing
4. No retroactive changes

**Communication**:
- Email to all users
- Blog post explaining rationale
- In-app notification

---

## Pricing Page Recommendations

### Key Elements

1. **Anchor message**: "Less than one hour of consultant time"
2. **Clear tier comparison**: Feature matrix, not just price
3. **Social proof**: "Trusted by X founders"
4. **Free tier CTA**: "Start Free" (primary)
5. **Pro tier CTA**: "Go Pro" (secondary)
6. **FAQ**: Address objections (see positioning.md)

### Pricing Display

```
Free        Pro          Team         Enterprise
$0/mo       $29/mo       $99/mo       $299/mo
            (or $290/yr) (or $990/yr)
```

### Recommended Messaging

- **Free**: "Explore the registry. Install community packs."
- **Pro**: "All packs. All updates. Build faster." (Most Popular badge)
- **Team**: "Scale AI workflows across your team."
- **Enterprise**: "SSO, SLA, dedicated support."

---

## Pricing Validation Checklist

- [x] Pricing model aligns with customer expectations (subscription)
- [x] Value metric is simple and scalable (pack access level)
- [x] Tier structure covers all ICPs (Free→Pro→Team→Enterprise)
- [x] Price points benchmarked against competitors
- [x] Premium positioning justified by differentiation
- [x] Creator economics sustainable (70/30 split)
- [x] Discounting framework prevents value erosion
- [x] Grandfathering policy reduces churn
- [x] Revenue projections realistic for bootstrapped launch

---

*Generated by Revenue Architect agent on 2026-01-08*
*Based on: positioning.md, competitive-analysis.md, icp-profiles.md, product-reality.md*

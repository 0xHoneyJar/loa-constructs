# PRD: Analytics Pipeline + GEO Optimization

**Cycle**: cycle-051
**Created**: 2026-03-15
**Status**: Draft
**Context**: `grimoires/loa/context/analytics-architecture/` (5 files, 917 lines of pre-built research)

---

## 1. Problem Statement

> Sources: situation-analysis.md, gtm-site-audit.md, Discord conversation (2026-03-14)

constructs.network launched publicly on X (2026-03-14). 46 web apps exist across 0xHoneyJar. **Zero analytics exist on the primary GTM site (constructs.network).** Two other sites use OpenPanel, one uses GA4 — three different tools with no unified view.

The team (2 people, different timezones) is too busy for dashboards. Analytics signal must be pushed to Telegram — pre-digested, anomaly-first — or it doesn't exist.

Compounding the problem: **every audited site fails AI/LLM readiness**. Zero JSON-LD structured data across all 4 audited sites. The constructs.network catalog page renders nothing to crawlers without JavaScript execution. The about page has 2/10 citability — AI systems have nothing to cite about what constructs.network is.

Lily's GEO research (beacon issue #3) provides the optimization framework: content enrichment (citations, statistics, quotations) can improve AI visibility up to 40% (GEO paper, KDD 2024, peer-reviewed). But without analytics, you can't measure if optimizations work. Both analytics AND GEO optimization are needed to close the loop.

### Why Now

- Public launch happened. Traffic is flowing (or not) and you can't see it.
- Lily is actively researching GEO optimization (beacon issue #3, filed 2026-03-12).
- Analytics fragmentation across the org (3 tools, 4 sites) will get worse without standardization now.
- The analytics → GEO → optimization feedback loop requires both halves to function.

---

## 2. Goals & Success Metrics

### Business Objectives

| Objective | Metric | Target |
|-----------|--------|--------|
| Traffic visibility | constructs.network has working analytics | Week 1 |
| Signal delivery | Daily digest arrives in Telegram | Week 1 |
| GEO baseline | JSON-LD on all construct detail pages | Week 2 |
| Crawlability | Catalog page server-renders content for crawlers | Week 2 |
| Citability | About page citability score ≥ 6/10 (currently 2/10) | Week 2 |
| Unified analytics | Top 5 apps on same analytics platform | Week 4 |

### Non-Goals (Explicit)

- No real-time analytics dashboard (Telegram digest is the interface)
- No session recordings or heatmaps (Phase 2 with PostHog if needed)
- No analytics on all 46 apps (start with top 5)
- No custom event tracking beyond pageviews (Phase 2)
- No billing/monetization of analytics data

---

## 3. User & Stakeholder Context

### Primary Users

**User A: soju (builder, primary maintainer)**
- Works across multiple repos, timezones, and contexts simultaneously
- Does not open dashboards — signal must come to him (Telegram preferred)
- Needs: "did anyone visit? where from? what did they look at?"
- Mobile-first consumption pattern

**User B: Lily (@Inkiy, marketing/GEO)**
- Researching AI discoverability and GEO optimization
- Needs: traffic data to validate GEO hypotheses
- Prefers Telegram for async review
- Filed comprehensive GEO research in beacon issue #3

### Secondary Stakeholders

- **AI crawlers** (GPTBot, ClaudeBot, Googlebot) — need crawlable content + structured data
- **Potential users** discovering constructs via AI search — need citable, enriched content

---

## 4. Functional Requirements

### FR-1: Analytics Collection (Umami Cloud)

> Source: situation-analysis.md (research-backed), adversarial-review.md (revised recommendation)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Set up Umami Cloud account (free tier, 1M events/month) | P0 |
| FR-1.2 | Add Umami tracking script to `apps/explorer/app/layout.tsx` | P0 |
| FR-1.3 | Configure Umami website for `constructs.network` | P0 |
| FR-1.4 | Store Umami API credentials in Convex environment variables | P0 |
| FR-1.5 | Add tracking to top 5 GTM sites (0xhoneyjar.xyz, setandforgetti.io, cubquests, + 2 more) | P1 |

**Decision**: Umami Cloud over self-hosted (adversarial review Finding 1-3: Prisma/PgBouncer conflict, schema migration blast radius, hosting unused dashboard). Over GA4 (adversarial review Finding 10: migration debt from dual-tracking).

### FR-2: Telegram Digest Bot

> Source: telegram-digest-spec.md, adversarial-review.md Finding 4

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Create Telegram bot via @BotFather | P0 |
| FR-2.2 | Create Telegram group (soju + Lily + bot) | P0 |
| FR-2.3 | Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to Convex env vars | P0 |
| FR-2.4 | Build Convex `internalAction` for Telegram message delivery (raw `fetch()`, no library) | P0 |
| FR-2.5 | Build Convex cron for daily digest (14:00 UTC) | P0 |
| FR-2.6 | Anomaly-first digest format: lead with changes, one-liner if steady state | P0 |
| FR-2.7 | Merge with existing Convex data (installEvents, signals, healthObservations) | P1 |
| FR-2.8 | Weekly summary with QuickChart.io sparkline (Sunday 14:00 UTC) | P2 |
| FR-2.9 | Heartbeat monitoring — alert to Discord if digest not sent in 25 hours | P2 |

### FR-3: GEO Optimization — Structured Data

> Source: gtm-site-audit.md, geo-research-lily-beacon-3.md

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Add `SoftwareApplication` JSON-LD to all construct detail pages (name, description, version, datePublished, author, applicationCategory, operatingSystem, offers) | P0 |
| FR-3.2 | Add `WebSite` JSON-LD to constructs.network homepage | P0 |
| FR-3.3 | Add `Organization` JSON-LD to about page (name, foundingDate, sameAs for Twitter/GitHub) | P1 |
| FR-3.4 | Add `FAQPage` JSON-LD to about page answering "What is a construct?", "How do I install?", "What AI agents are supported?" | P1 |
| FR-3.5 | Add `Organization` JSON-LD to 0xhoneyjar.xyz | P2 |

### FR-4: GEO Optimization — Crawlable Content

> Source: gtm-site-audit.md ("catalog page is invisible to AI crawlers"), Lily's beacon issue #3 Section 3.1

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Server-render construct catalog page — names + descriptions as crawlable HTML (not behind `AuthAwareConstructList` JS gate) | P0 |
| FR-4.2 | Enrich about page: founding date, team info, construct count, total skills, "why we built this" narrative | P0 |
| FR-4.3 | Add statistics to about page: "23 constructs, 150+ skills" (GEO enrichment — up to 40% AI visibility improvement per KDD 2024 paper) | P0 |
| FR-4.4 | Add `datePublished` and `dateModified` to construct detail pages | P1 |
| FR-4.5 | Ensure sitemap includes all 23 public constructs (currently only 3) | P1 |

### FR-5: Analytics Standardization

> Source: gtm-site-audit.md (3 different tools across 4 sites)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | Document Umami as the standard analytics tool for all 0xHoneyJar web properties | P1 |
| FR-5.2 | Add Umami to 0xhoneyjar.xyz, setandforgetti.io (replace OpenPanel) | P2 |
| FR-5.3 | Add Umami to cubquests (can coexist with GA4 during transition) | P2 |

---

## 5. Technical & Non-Functional Requirements

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Collection Layer                          │
│  [constructs.network] ──umami.js──► Umami Cloud (1M events) │
│  [0xhoneyjar.xyz]     ──umami.js──►                         │
│  [setandforgetti.io]  ──umami.js──►                         │
│  [cubquests.com]      ──umami.js──►                         │
└─────────────────────┬───────────────────────────────────────┘
                      │ Umami REST API (daily pull)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Aggregation Layer (Convex)                   │
│  Convex cron (daily 14:00 UTC)                               │
│  ├── Pull Umami stats per site                               │
│  ├── Pull installEvents (existing)                           │
│  ├── Pull signals (existing)                                 │
│  ├── Pull healthObservations (existing)                      │
│  ├── Compute anomalies (vs 7-day avg)                        │
│  └── Format anomaly-first digest                             │
└─────────────────────┬───────────────────────────────────────┘
                      │ Telegram Bot API (sendMessage)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Delivery Layer                            │
│  Telegram group chat (soju + Lily + bot)                     │
│  ├── Daily: anomaly-first digest (<800 chars)                │
│  ├── Weekly: summary + QuickChart sparkline                  │
│  └── Heartbeat: Discord fallback if 25h silence              │
└─────────────────────────────────────────────────────────────┘
```

### Performance

| Metric | Target |
|--------|--------|
| Tracking script load impact | <10KB gzipped (Umami ~2KB) |
| Digest delivery latency | <5 seconds from cron trigger |
| Convex cron reliability | 99.9% (Convex SLA) |

### Privacy

- No cookies (Umami is cookieless)
- No PII stored
- Country-level geo only (no city/IP)
- Current privacy policy ("no third-party tracking cookies") remains accurate
- GDPR/CCPA compliant — no consent banner needed

### Security

- `TELEGRAM_BOT_TOKEN` stored in Convex dashboard (not in code)
- Umami API key stored in Convex dashboard
- `disable_web_page_preview: true` on all Telegram messages (prevents bot inflating own pageviews)
- Digest cron is `internalAction` (not publicly callable)

---

## 6. Scope & Prioritization

### Sprint 1 (P0 — Ship this week)

| Task | Area | Estimate |
|------|------|----------|
| Set up Umami Cloud + add tracking to explorer | Analytics | Small |
| Create Telegram bot + group | Delivery | Small |
| Build Convex digest cron (daily, anomaly-first) | Delivery | Medium |
| Add JSON-LD to construct detail pages | GEO | Medium |
| Fix catalog page SSR (crawlable HTML) | GEO | Medium |
| Enrich about page (dates, stats, narrative) | GEO | Medium |
| Add WebSite JSON-LD to homepage | GEO | Small |

### Sprint 2 (P1 — Next week)

| Task | Area | Estimate |
|------|------|----------|
| Merge digest with installEvents + signals data | Analytics | Medium |
| Add Organization JSON-LD to about page | GEO | Small |
| Add FAQPage JSON-LD to about page | GEO | Small |
| Expand sitemap to all 23 public constructs | GEO | Small |
| Add datePublished/dateModified to detail pages | GEO | Small |
| Add Umami to 0xhoneyjar.xyz + setandforgetti | Analytics | Small |

### Sprint 3 (P2 — Phase 2)

| Task | Area | Estimate |
|------|------|----------|
| Weekly summary with QuickChart sparklines | Delivery | Medium |
| Heartbeat monitoring (Discord fallback) | Delivery | Small |
| Add Umami to remaining GTM sites | Analytics | Medium |
| Implement Lily's citability tagging (beacon issue #3 §1.3) | GEO | Large |
| Organization JSON-LD for 0xhoneyjar.xyz | GEO | Small |

### Out of Scope

- Session recordings / heatmaps (future PostHog consideration)
- Custom event tracking beyond pageviews
- A/B testing infrastructure
- Analytics for all 46 apps (start with top 5)
- Beacon construct code changes (separate construct repo)
- Real-time alerting (spike detection is Phase 2)

---

## 7. Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Umami Cloud free tier limits (1M events/month) | Low | Medium | 5 sites × 200 views/day = ~30K events/month. Nowhere near limit. |
| Telegram bot token leak | Low | High | Store only in Convex dashboard, never in code. Rotate if compromised. |
| Ad blockers blocking Umami script (~20-40% for dev audience) | High | Medium | Accept undercount. Proxy script through own domain in Phase 2. |
| Bot traffic inflating pageviews | Medium | Medium | Umami has built-in bot filtering. Accept noisy baseline for 2 weeks. |
| Catalog SSR change breaks existing functionality | Low | High | Test thoroughly. The current page already shows a loading state to crawlers. |
| Digest becomes noise (Week 3 attention decay) | Medium | Medium | Anomaly-first design. One-liner if nothing notable. |

### Dependencies

| Dependency | Owner | Status |
|-----------|-------|--------|
| Umami Cloud account | soju | Not created |
| Telegram bot (@BotFather) | soju | Not created |
| Telegram group with Lily | soju + Lily | Not created |
| Convex deployment (prod: quaint-anaconda-866) | soju | Existing |
| Construct data in Convex (installEvents, signals) | — | Existing + live |

---

## Appendix A: Related Artifacts

| Artifact | Location | Content |
|----------|----------|---------|
| Analytics Platform Research | `grimoires/loa/context/analytics-architecture/situation-analysis.md` | 7 platforms compared, 4 eliminated, recommendation |
| Telegram Digest Spec | `grimoires/loa/context/analytics-architecture/telegram-digest-spec.md` | Bot API research, message format, Convex cron pattern |
| Adversarial Review | `grimoires/loa/context/analytics-architecture/adversarial-review.md` | 11 findings, revised to Umami Cloud |
| GTM Site Audit | `grimoires/loa/context/analytics-architecture/gtm-site-audit.md` | Live audit of 4 sites + GEO assessment |
| GEO Research (Lily) | `grimoires/loa/context/analytics-architecture/geo-research-lily-beacon-3.md` | Beacon issue #3 digested |
| Beacon Issue #3 | `github.com/0xHoneyJar/construct-beacon/issues/3` | Lily's comprehensive GEO research |

## Appendix B: Analytics Landscape Discovery

| Site | Current Analytics | Target |
|------|------------------|--------|
| constructs.network | None | Umami Cloud |
| 0xhoneyjar.xyz | OpenPanel | Umami Cloud (replace) |
| setandforgetti.io | OpenPanel | Umami Cloud (replace) |
| cubquests.com | GA4 (G-G7RZD7SNKH) | Umami Cloud (coexist) |
| All others (42 apps) | Unknown | Future phases |

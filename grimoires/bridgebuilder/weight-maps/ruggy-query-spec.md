# Ruggy Ecosystem Query Spec

> derived from: w3ga agent pattern (shape affinity thread)
> purpose: the 15 queries that make ruggy real
> data sources: constructs postgres + convex + umami + product repos
> architecture: w3ga's hono+claude+data-api, adapted for our stack

---

## What This Is

w3ga has an AI agent package that queries GA4 with 13 prebuilt queries and
natural language routing. ruggy needs the same thing, but pointed at our
ecosystem data instead of GA4.

this spec defines the queries. the architecture (hono server + claude analysis
+ structured data queries) transfers from w3ga through shape affinity.

---

## Data Sources

| Source | What It Has | Access |
|--------|------------|--------|
| **constructs postgres** (`pack_installations`) | install events: packId, versionId, userId, action, ipAddress, userAgent, metadata, timestamp | API routes (need to build analytics endpoints for packs) |
| **constructs postgres** (`packs`) | downloads count, version history, category, visibility | existing API |
| **convex** (`installEvents`) | packSlug, packName, action, timestamp | existing BFF webhook |
| **convex** (`signals`, `healthObservations`) | ecosystem signals from daily digest pipeline | existing cron |
| **umami** (3 sites) | pageviews, visitors, referrers, top pages, bounce rate | Umami API (already used by daily digest) |
| **github** (org repos) | commit frequency, PR activity, issue count, contributor count | gh CLI / GitHub API |

---

## The 15 Queries

### Ecosystem Health (4)

**1. `ecosystem_overview`**
> "how's the network doing?"

- total installs (7d / 30d / 90d) + trend
- active constructs (updated in last 30d)
- new constructs (registered in last 30d)
- install velocity (installs/day, trending up/down)
- top 5 by installs, top 5 by velocity
- site traffic (umami: visitors, pageviews, bounce)

**2. `construct_health`**
> "how's [construct] doing?"

- install count + velocity
- version history (frequency, recency)
- github activity (commits, PRs, issues in last 30d)
- category + verification tier
- compose_with edges (declared + behavioral)
- app gravity assessment (which products use it / could use it)

**3. `creator_activity`**
> "who's active, who's quiet?"

- constructs by last update date
- constructs with zero updates in 30d (stale)
- constructs with >5 updates in 30d (actively maintained)
- new creators (first construct registered in last 30d)
- abandoned constructs (no update in 90d, low installs)

**4. `network_growth`**
> "is the bazaar growing or shrinking?"

- construct count over time
- category distribution (how many skill-packs, tool-packs, codex, straylight)
- visibility transitions (internal→public, public→unlisted)
- install growth rate (MoM)
- new-construct registration rate

### Install Intelligence (4)

**5. `install_funnel`**
> "where do people drop off?"

- requires client events (not available yet — OBS-004 gap)
- FUTURE: page_view → detail_view → install_click → install_complete conversion
- CURRENT (proxy): umami page views on construct detail pages vs install count

**6. `agent_vs_human`**
> "who's installing — people or agents?"

- classify pack_installations.userAgent into: human / agent / bot
- agent patterns: claude-code, cursor, windsurf, cline, aider, continue
- bot patterns: googlebot, bingbot, facebookexternalhit
- ratio by construct (which constructs are agent-adopted vs human-discovered?)
- trend over time (is agent adoption growing?)

**7. `install_patterns`**
> "what gets installed together?"

- co-installation analysis: which constructs get installed by the same user within 7d
- frequency matrix of pairings
- canonical vs surprise pairings
- constructs that are always installed alone (potential islands)

**8. `search_effectiveness`**
> "what are people looking for?"

- requires search analytics (not available yet — gap)
- FUTURE: search queries, zero-result rate, search-to-install conversion
- CURRENT: umami top pages as proxy for discovery patterns

### Product Observability (4)

**9. `product_health_matrix`**
> "what's the observability posture across products?"

- reads from products-observability.yaml (this weight map)
- summarizes: which products have what instrumentation
- highlights universal gaps
- tracks gap closure over time

**10. `traffic_overview`**
> "who's visiting our products?"

- umami data across all 3+ instrumented sites
- visitors, pageviews, bounce rate, avg visit duration
- top referrers (where do people come from?)
- top pages (what do people look at?)
- comparison across products

**11. `error_landscape`**
> "what's breaking?"

- REQUIRES: Sentry or equivalent (OBS-001 — not available)
- FUTURE: error rates, top errors, error trends, affected users
- CURRENT: manual — check Vercel/Railway deployment logs

**12. `web_vitals`**
> "how fast are our products?"

- REQUIRES: CWV tracking (w3ga has this, not deployed)
- FUTURE: LCP, FID, CLS per product, per page
- CURRENT: Vercel Speed Insights (if enabled) or manual Lighthouse

### Signal Intelligence (3)

**13. `signal_digest`**
> "what happened in the last 24 hours?"

- already exists: telegram daily digest (convex cron)
- ruggy enhancement: add classification (routine / notable / anomaly)
- add agent-vs-human breakdown
- add product health summary

**14. `anomaly_detection`**
> "what's different from baseline?"

- already partially exists: daily digest compares against 7-day baseline
- ruggy enhancement: statistical anomaly detection on install velocity
- flag: sudden spikes (viral or bot?), sudden drops (broken?), new patterns

**15. `gravity_assessment`**
> "what should we pay attention to?"

- reads weight maps + gravity model
- identifies: highest unresolved gravity (tools/constructs with high pull, low deployment)
- identifies: gravity anomalies (should have gravity but doesn't)
- identifies: new threads detected since last assessment
- this is WEAVER's methodology, automated through ruggy

---

## Query Availability Matrix

| Query | Data Available Now? | Blocker |
|-------|-------------------|---------|
| ecosystem_overview | YES | need pack analytics API route |
| construct_health | YES | need pack analytics API route |
| creator_activity | PARTIAL | need github activity aggregation |
| network_growth | YES | need time-series aggregation (stub exists) |
| install_funnel | NO | needs client event tracking (OBS-004) |
| agent_vs_human | YES | userAgent captured, needs classification logic |
| install_patterns | YES | needs co-installation query |
| search_effectiveness | NO | needs search analytics (gap) |
| product_health_matrix | YES | reads weight maps (manual update) |
| traffic_overview | YES | umami API already used by digest |
| error_landscape | NO | needs Sentry or equivalent (OBS-001) |
| web_vitals | NO | needs CWV tracking |
| signal_digest | MOSTLY | extend existing telegram digest |
| anomaly_detection | PARTIAL | extend existing baseline comparison |
| gravity_assessment | YES | reads weight maps + gravity model |

**8 of 15 queries are available or nearly available with current data.**
The remaining 7 are blocked by the universal observability gaps (OBS-001 through OBS-005).

---

## Implementation Path (WEAVER thread, not a plan)

this is NOT a sprint plan. this is a thread — a navigation path through weight.

1. **agent_vs_human** — highest unique signal, lowest effort. classify userAgent on existing pack_installations. ruggy's first real insight.

2. **ecosystem_overview + construct_health** — the queries that make ruggy useful day-one. need a pack analytics API route (the skill_usage analytics routes exist for skills, adapt for packs).

3. **signal_digest enhancement** — extend the existing telegram digest with ruggy intelligence. classification, agent breakdown, product health. this is ruggy adding weight to an existing pipeline, not building a new one.

4. **gravity_assessment** — automate WEAVER's weight mapping. ruggy reads the weight-maps directory, compares against live data, flags drift and new anomalies.

5. **install_patterns** — co-installation analysis. this tells you which constructs naturally compose (behavioral gravity) vs which only claim to compose (structural gravity). closes the gap between declared and actual topology.

everything after this requires the universal gaps to be closed (Sentry, client events, CWV).

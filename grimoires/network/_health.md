---
name: Network Health
type: diagnostic
description: Current health status, open issues, remediation tracking.
updated: 2026-03-17
tags:
  - network
  - health
  - diagnostic
---

# Network Health

> Ecosystem score: **5.5/10** (below 7.0 AI-Ready threshold)
> Source: `grimoires/gecko/ecosystem-beacon-audit-2026-03-15.md`

## Beacon Audit — Product Repos

| Repo | Score | Status | Key Issue |
|------|-------|--------|-----------|
| mcv-interface | 7.75 | AI-Ready | Reference implementation |
| set-and-forgetti | 6.75 | Near-ready | Stale BUTTERFREEZONE |
| cubquests-interface | 6.25 | Below threshold | Invisible to AI agents |
| midi-interface | 5.5 | Below threshold | Had fabricated heatmap (fixed) |
| apdao-auction-house | 5.25 | Below threshold | Interest rate mismatch (fixed) |
| honey-interface | 4.5 | REMEDIATED | Open proxy was P0 (fixed) |
| mibera-honeyroad | 4.25 | REMEDIATED | Open admin was P0 (fixed) |
| community-interface | 3.75 | REMEDIATED | Broken OG metadata (fixed) |

### Remediation Status

- **P0 (critical security)**: DONE — proxy locked, admin locked, OG fixed
- **P1 (accuracy/trust)**: DONE — hardcoded APYs, fabricated data, robots.txt, llms.txt
- **P2 (enhancement)**: OPEN — JSON-LD (7 repos), rate limiting (5 repos), sitemaps, stale BFZ

## Construct Network Issues

### Governance (from [[_topology]])

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| GOV-001 | HIGH | vocabulary-bank falsely claims observer | OPEN |
| GOV-002 | HIGH | vocabulary-bank falsely claims artisan | OPEN |
| GOV-003 | MEDIUM | the-speakers → artisan unreciprocated | OPEN |

### Dependencies

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| DEP-001 | MEDIUM | observer ↔ crucible circular hard dep | OPEN |

### Schema

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| SCH-001 | LOW | webgl-particles still on manifest.json v1 | OPEN |
| SCH-002 | LOW | No constructs declare maturity field | OPEN |

### Explorer / constructs.network

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| UX-001 | MEDIUM | Two detail page routes: `(site)/[slug]` vs `(marketing)/constructs/[slug]` | OPEN |
| UX-002 | LOW | packs table has no `category` column (SLUG_CATEGORY_MAP hack) | OPEN |
| UX-003 | LOW | ComposeDiagram on /about is hardcoded (artisan→k-hole→mibera-codex) | OPEN |

### Observability

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| OBS-001 | HIGH | Zero repos have Sentry/error tracking | OPEN |
| OBS-002 | HIGH | Zero repos have session replay | OPEN |
| OBS-003 | HIGH | Zero repos have structured server logging | OPEN |
| OBS-004 | MEDIUM | Beehive construct active in only 1/6 repos | OPEN |
| OBS-005 | MEDIUM | mcv-interface has dangling observer symlink | OPEN |

## Construct Lifecycle

| Stage | Count | Constructs |
|-------|-------|------------|
| Active (v1.0+) | 16 | artisan, beacon, crucible, dynamic-auth, growthpages, gtm-collective, k-hole, mibera-codex, observer, protocol, showcase, the-arcade, the-easel, the-mint, the-speakers, social-oracle |
| Early (v0.x) | 4 | gecko (0.1.0), hardening (0.2.0), herald (0.1.0), vocabulary-bank (0.1.0) |
| Legacy | 1 | webgl-particles (schema v1) |
| Unversioned | 2 | vfx-playbook, webreel (v1.0.0 but no maturity) |

## What's Working

- **Topology validation**: `scripts/validate-topology.sh` runs 8 checks, CI-gated
- **Auto-sync**: `pnpm seed:auto` keeps namespace = registry
- **Analytics**: Umami → Convex cron → Telegram pipeline is LIVE
- **Beacon remediation**: All P0/P1 items resolved across 8 repos
- **Composition metadata**: 22/23 constructs have full schema v3 with edges declared

---
name: Echelon Integration Map
type: navigation
description: How Tobias's Echelon verification platform connects to the construct network — data flows, endpoints, blockers.
updated: 2026-03-17
tags:
  - network
  - echelon
  - verification
  - integration
---

# Echelon Integration Map

> Echelon is NOT a construct. It's an external verification platform that integrates via the constructs API.
> It could become a construct (verification-as-a-service) — but that's a design decision, not a given.

## What Echelon Does

Three layers:
1. **OSINT pipeline** — GDELT, X API, Polygon.io for real-world signal ingestion
2. **Prediction markets** — Cost-function markets (LMSR), 4 agent archetypes (Shark/Spy/Diplomat/Saboteur) on Base Sepolia
3. **Product Theatres** — Structured evaluation harnesses that run constructs against real data → `VerificationCertificate`

**Owner**: Tobias James (@AITOBIAS04) — `github.com/AITOBIAS04/Echelon` (95 commits as of 2026-03-14)

---

## Verification Pipeline

```
UNVERIFIED → BACKTESTED → PROVEN
     ↑            ↑           ↑
  default    historical    real-time
             verification  sustained
             via Echelon   verification
```

| Tier | Requirement |
|------|-------------|
| UNVERIFIED | Default state. No systematic verification. |
| BACKTESTED | Provenance 100%, canvas enrichment >80%, first 30-day audit passed |
| PROVEN | Signal accuracy >85% rolling 30-day, loop closure >20%, auto-certificate monthly |

---

## Data Flow

```
1. Construct maintainer syncs → POST /v1/packs/:slug/sync
   → manifest includes workflow.verification.checks

2. Echelon reads ground truth → GET /v1/packs/:slug/ground-truth [PUBLIC]
   → Returns verification checks + latest cert metadata

3. Echelon Product Theatre runs evaluation harness
   → Produces VerificationCertificate JSON

4. Certificate submitted → POST /v1/packs/:slug/verification [OWNER AUTH]
   → Appended to construct_verifications (immutable audit trail)
   → 30-day expiry

5. Explorer reflects → GET /v1/constructs/:slug
   → verification_tier flows through to badge on detail page
```

---

## What's Connected

| Layer | Status | Details |
|-------|--------|---------|
| Database | BUILT | `construct_verifications` table with pack_id FK, tier, certificate_json, issued_by, expires_at |
| API: GET verification | LIVE | Returns latest cert with expiry check. Downgrades to UNVERIFIED if expired. |
| API: POST verification | LIVE | Pack-owner-only auth. Rate limit 10/day. Append-only. `self_attested: true` flag. |
| API: GET ground-truth | LIVE | Returns manifest checks + cert metadata. Public read. |
| Constructs service | WIRED | `verificationTier` in list + detail responses. Batch fetch with graceful fallback. |
| Explorer types | WIRED | `ConstructNode.verificationTier`, `ConstructDetail.verificationTier + verifiedAt` |
| Explorer badge | RENDERED | PROVEN = green badge, BACKTESTED = yellow badge (header only, not full section) |

## What's Blocked or Missing

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| ECH-001 | Tobias can't submit certs directly — pack owner auth only | HIGH | Design decision: add verifier role? Or proxy through @zksoju? |
| ECH-002 | Detail page only shows badge, not verification section | MEDIUM | Types wired but no UI for checks/cert/verifiedAt |
| ECH-003 | `workflow.verification.checks` not typed in shared Zod schema | MEDIUM | `.passthrough()` hides it. Latent type mismatch. |
| ECH-004 | `contentHash` may not populate during sync | LOW | `ground-truth` returns `content_hash: null` if unpopulated |
| ECH-005 | Zero certificates submitted across all 23 constructs | INFO | Pipeline exists but never exercised |
| ECH-006 | Migration `0005_construct_verifications.sql` — confirm run on prod Supabase | HIGH | Blocking if table doesn't exist in prod |

## Product Theatres (Echelon-side)

Three templates drafted (live in Echelon repo, not loa-constructs):
- `PRODUCT_OBSERVER_V1` → maps to [observer](/constructs/observer) (Beehive)
- `PRODUCT_EASEL_V1` → maps to [the-easel](/constructs/the-easel)
- `PRODUCT_CARTOGRAPH_V1` → unmapped (new concept)

## Beehive Verification State (current)

| Check | Status |
|-------|--------|
| provenance_integrity | verified (163+ records, append-only) |
| source_fidelity_gate | installed but unmeasured |
| rlm_isolation | architectural guarantee |
| canvas_enrichment | partial (57%) |
| gap_grounding | unmeasured |
| signal_routing | unmeasured |

**Current tier**: UNVERIFIED. Zero certificates submitted.

---

## ECS Frame

In ECS terms, Echelon is an **external System** that reads construct Components (manifest, identity, ground-truth) and writes a new Component back (VerificationCertificate). It doesn't need to be an Entity (construct) to participate in the network — it operates through the event/data interface.

If Echelon BECOMES a construct:
- **Entity**: construct-echelon
- **Components**: verification skills, Product Theatre templates, OSINT pipeline config
- **System invocations**: `/verify :slug`, `/ground-truth :slug`, `/certify :slug`
- **Composition**: `composes_with: [observer, the-easel]`, `events.emits: [forge.echelon.certificate_issued]`

This is a design decision. The current API-integration approach is valid and simpler.

---

## Navigation

← [Index](/network/) · [Topology](/architecture/topology) · [Network Health](/network/health) · [Personas](/network/personas)

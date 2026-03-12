# PRD: Construct Short Description System — Storefront Taglines

**Cycle**: cycle-043
**Created**: 2026-03-12
**Status**: Draft
**Context**: `grimoires/loa/context/construct-short-description-system.md`
**Research**:
- `grimoires/bridgebuilder/developer-marketplace-taglines.md` (70 searches — NP/VP schism, brew audit patterns)
- `grimoires/bridgebuilder/word-economy-research.md` (64 searches — McIlroy test, semantic density, cognitive load)
- `grimoires/bridgebuilder/storefront-workshop-architecture.md` (45 searches — Brad Frost model, passive context, dual audience)

**Grounded in**:
- `apps/api/src/db/schema.ts:515` (shortDescription column — implemented)
- `apps/api/src/db/migrations/0013_short_description.sql` (ALTER TABLE — not applied to production)
- `apps/api/src/routes/constructs.ts:59` (short_description in API response — implemented)
- `apps/explorer/lib/data/fetch-constructs.ts:73` (fallback chain — implemented)
- `scripts/seed-forge-packs.ts:62` (17-construct override map — implemented)
- `packages/shared/src/validation.ts:334` (Zod schema — implemented)
- `packages/shared/src/types.ts:225` (TypeScript type — implemented)

---

## 1. Problem Statement

Construct descriptions are too long for the storefront. 14 of 17 constructs display broken text in the explorer UI — truncated mid-word ("AI-retrievabl") because there is no `short_description` field anywhere in the data model. The frontend derives one by splitting the `description` on `.` and truncating to 60 characters:

```typescript
// fetch-constructs.ts — the current hack
const shortDesc = description.split('.')[0].slice(0, 60);
```

This produces garbage like "A comprehensive pack for building and maintaining design s" (Artisan) and "AI-retrievable trust signals for distributed autonomous org" (Beacon). The tagline is the first thing a developer reads — and right now it proves nothing about the maintainer's understanding of their construct.

The deeper principle: **the tagline is proof-of-work**. Karl Maton's Legitimation Code Theory shows that precise, high-density terms ("hypothesis-first", "aesthetic direction") function as trust signals — shibboleths that prove the maintainer has paid the cost of mastering the domain. A truncated sentence signals the opposite: nobody looked.

> Sources: `construct-short-description-system.md:1-7`, `word-economy-research.md:14-20`

---

## 2. Goals & Success Metrics

### Primary Goal
Every construct displays a handcrafted, semantically dense tagline (3-4 words) that proves the maintainer understands what the construct captures.

### Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Truncated descriptions in UI | 14/17 | 0/17 | Visual inspection of /constructs catalog |
| Constructs with `short_description` in DB | 0 | 17 | `SELECT count(*) FROM packs WHERE short_description IS NOT NULL` |
| Taglines passing McIlroy test (no "and") | N/A | 17/17 | Manual review of override map |
| Construct repos with `short_description` in YAML | 0 | 17 | Audit across 0xHoneyJar construct-* repos |

### Non-Goals
- Convex-backed profile editing (future — requires auth-gated mutations, merge logic)
- Making `short_description` required in Zod schema (after all 17 repos are updated)
- Automated tagline linting (`brew audit`-style enforcement)
- Revising weak taglines (Crucible, GTM Collective, Gecko — tracked separately)

---

## 3. Users & Stakeholders

| Role | Need |
|------|------|
| **Developer browsing /constructs** | Instantly understand what a construct does in 3-4 words |
| **AI agent evaluating constructs** | Dense, searchable tagline for construct selection |
| **Construct maintainer** | Prove domain mastery through tagline precision |
| **@janitooor (maintainer)** | Eliminate the truncated-text embarrassment on the storefront |

---

## 4. Functional Requirements

### FR-1: Database Column ✅ IMPLEMENTED
Add `short_description TEXT` column to `packs` table.

- **Migration**: `apps/api/src/db/migrations/0013_short_description.sql`
- **Schema**: `apps/api/src/db/schema.ts:515` — `shortDescription: text('short_description')`

**Acceptance**: Column exists, nullable (backward-compatible).

### FR-2: Shared Type System ✅ IMPLEMENTED
Add `short_description` to both TypeScript and Zod layers.

- **Zod**: `packages/shared/src/validation.ts:334` — `z.string().min(5).max(80).optional()`
- **Type**: `packages/shared/src/types.ts:225` — `short_description?: string`

**Acceptance**: Four schema layers in sync (SQL, Drizzle, Zod, TypeScript).

### FR-3: API Response ✅ IMPLEMENTED
Include `short_description` in both list and detail construct responses.

- **Route**: `apps/api/src/routes/constructs.ts:59` — `short_description: c.shortDescription`

**Acceptance**: `GET /v1/constructs` and `GET /v1/constructs/:slug` include `short_description`.

### FR-4: Seed Script Override Map ✅ IMPLEMENTED
Handcrafted taglines for all 17 constructs with three-tier fallback:

1. `construct.yaml` → `short_description` (canonical source)
2. Override map in seed script (interim)
3. Derive from `description.split('.')[0].slice(0, 80)` (last resort)

| Construct | Tagline |
|-----------|---------|
| Artisan | Design systems craft |
| Beacon | AI-retrievable trust signals |
| Crucible | Journey validation testing |
| Dynamic Auth | Wallet identity resolution |
| Gecko | Ecosystem intelligence |
| GrowthPages | Educational content pipeline |
| GTM Collective | Go-to-market operations |
| Hardening | Defensive artifact forge |
| Herald | Grounded product comms |
| K-Hole | Depth engine for exploration |
| Mibera Codex | Mibera universe knowledge |
| Observer | Hypothesis-first user research |
| Protocol | On-chain verification |
| Social Oracle | GitHub-to-social content |
| The Arcade | Game design philosophy |
| The Easel | Aesthetic direction studio |
| WebReel | Cinematic web capture |

**Acceptance**: `bun run seed` populates all 17 `short_description` values.

> Source: `construct-short-description-system.md:31-53`

### FR-5: Frontend Fallback Chain ✅ IMPLEMENTED
Replace the `split('.')[0].slice(0, 60)` hack with real API field consumption.

- **Data layer**: `apps/explorer/lib/data/fetch-constructs.ts:73` — `construct.short_description || description.split('.')[0].slice(0, 80) || 'No description'`
- **Auth-aware list**: `apps/explorer/components/constructs/auth-aware-construct-list.tsx:63` — `(c.short_description as string) || ''`

**Acceptance**: No truncated taglines on /constructs catalog or leaderboard.

### FR-6: Production Migration 🔲 NOT DONE
Apply `0013_short_description.sql` to production Supabase, then run seed.

**Acceptance**: `SELECT short_description FROM packs WHERE slug = 'observer'` returns `'Hypothesis-first user research'`.

### FR-7: construct-base Template 🔲 NOT DONE
Add `short_description` to the template `construct.yaml` with usage comment.

**Acceptance**: `constructs create` generates a `construct.yaml` with `short_description` field.

### FR-8: Ecosystem Propagation 🔲 NOT DONE
Open PRs to all 17 construct repos adding `short_description` to their `construct.yaml`.

**Acceptance**: All 17 repos have `short_description` in their `construct.yaml`.

---

## 5. Technical & Non-Functional Requirements

### NFR-1: Schema Consistency
Four schema layers must stay in sync: SQL migration, Drizzle schema, Zod validation, TypeScript types. All four are implemented for `short_description`.

### NFR-2: Backward Compatibility
Field is optional (`TEXT` nullable, Zod `.optional()`). Existing constructs without `short_description` in their YAML continue to work via the override map fallback.

### NFR-3: Word Economy Constraints
Taglines should follow the patterns identified in research:
- **Noun phrases preferred** over verb phrases (constructs are infrastructure, not workflow tools)
- **No articles, no marketing superlatives** (Homebrew's `brew audit` standard)
- **McIlroy test**: if it needs "and", the construct may be doing too much
- **Front-load the differentiator** (NNG F-shaped scanning: value in first 11 chars)
- **Max 80 characters** (Debian lineage, validated by modern platforms)

### NFR-4: Dual Audience
`short_description` serves two consumers simultaneously:
- **Human**: storefront scanning (Tier 1 in Brad Frost's model)
- **AI agent**: search result ranking and construct identification

---

## 6. Scope & Prioritization

### Sprint 1: Deploy + Seed
- FR-6: Apply migration to production Supabase
- FR-4: Run `bun run seed` to populate all 17 taglines
- Verify: API responses include `short_description`, UI displays clean taglines

### Sprint 2: Ecosystem Propagation
- FR-7: Update construct-base template
- FR-8: Open PRs to all 17 construct repos
- After all merged: make `short_description` required in Zod schema

### Already Done (This Cycle, Pre-PRD)
- FR-1: Database column + migration file
- FR-2: Shared type system (Zod + TypeScript)
- FR-3: API response inclusion
- FR-5: Frontend fallback chain + auth-aware list fix

### Out of Scope
- Convex-backed profile editing (maintainers edit taglines via web UI)
- CLI enforcement (`constructs publish` rejects without `short_description`)
- Automated tagline linting (Homebrew-style `brew audit`)
- Tagline revisions for weak entries (Crucible → "User journey stress tests", etc.)
- `long_description` as agent operational context (workshop tier — separate initiative)

---

## 7. Risks & Dependencies

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration not applied before seed | Seed fails with column-not-found | Run migration first, verify column exists |
| Override map taglines are wrong | Maintainers object to their tagline | Taglines are interim — `construct.yaml` field takes precedence once repos are updated |
| 17 PRs to repos = maintenance burden | Slow adoption | Batch PRs, simple one-field addition |
| Zod `required()` breaks CI before all repos update | Auto-sync fails for repos without field | Keep optional until ecosystem-wide coverage confirmed |

### Dependencies
- Production Supabase access (`.env.railway` has creds)
- Railway CLI for deployment verification
- GitHub access to all 17 0xHoneyJar/construct-* repos for PRs
- No new package dependencies

---

## 8. Three-Tier Description Architecture (Reference)

From the storefront-workshop research — the model this change implements:

| Tier | Field | Audience | Density |
|------|-------|----------|---------|
| **Storefront** | `short_description` | Human scanner + AI search | Minimal: 3-4 word tagline |
| **Gallery** | `description` | Human evaluator | Medium: full sentence |
| **Workshop** | `long_description` + `identity/persona.yaml` | AI agent + maintainer | Maximum: operational context |

The storefront tier is what this PRD delivers. Gallery is already served by `description`. Workshop is future work (Convex-backed, maintainer-editable).

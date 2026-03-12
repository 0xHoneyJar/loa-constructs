# Sprint Plan: Construct Short Description System

**Cycle**: cycle-043
**PRD**: `grimoires/loa/prd.md`
**Created**: 2026-03-12
**Team**: @janitooor (solo)
**Sprint duration**: 1 day each

---

## Sprint 1: Commit, Deploy, Verify (global sprint-50)

**Goal**: Get handcrafted taglines visible on production constructs.network.

**Precondition**: FR-1 through FR-5 are implemented in the working tree (31 files, 399 insertions). No code to write — this sprint is commit + deploy + verify.

### Task 1.1: Commit short_description pipeline
**Description**: Stage and commit all short_description-related changes across the stack.
**Files**:
- `packages/shared/src/validation.ts` — Zod schema addition
- `packages/shared/src/types.ts` — TypeScript type addition
- `apps/api/src/db/schema.ts` — Drizzle column
- `apps/api/src/db/migrations/0013_short_description.sql` — ALTER TABLE
- `apps/api/src/routes/constructs.ts` — API response inclusion
- `apps/api/src/services/constructs.ts` — service layer
- `scripts/seed-forge-packs.ts` — override map + mapping logic
- `apps/explorer/lib/data/fetch-constructs.ts` — fallback chain
- `apps/explorer/components/constructs/auth-aware-construct-list.tsx` — field reference fix

**Acceptance**:
- [ ] Clean commit with only short_description-related changes
- [ ] `bun run build --filter @loa-constructs/explorer` passes
- [ ] `bun run build --filter @loa-constructs/api` passes

### Task 1.2: Commit explorer UI polish (if any unrelated changes)
**Description**: Separate commit for any explorer typography/UI changes that are unrelated to short_description.
**Acceptance**:
- [ ] Unrelated UI changes in their own commit (not mixed with short_description)

### Task 1.3: Apply migration to production
**Description**: Run `0013_short_description.sql` against production Supabase.
**Method**: `bun -e` with `postgres` driver using `.env.railway` creds (no local `psql`).
**Acceptance**:
- [ ] `SELECT column_name FROM information_schema.columns WHERE table_name = 'packs' AND column_name = 'short_description'` returns a row
- [ ] No data loss — existing rows unaffected (nullable column addition)

### Task 1.4: Deploy API to Railway
**Description**: Push to main to trigger Railway deployment. Verify API is healthy.
**Acceptance**:
- [ ] `GET https://api.constructs.network/health` returns 200
- [ ] `GET https://api.constructs.network/v1/constructs` response includes `short_description` field

### Task 1.5: Run seed script
**Description**: `bun run seed` to populate all 17 `short_description` values from the override map.
**Acceptance**:
- [ ] All 17 constructs have non-null `short_description` in the database
- [ ] `GET /v1/constructs` returns taglines (not null) for every construct
- [ ] Taglines match the override map in the PRD

### Task 1.6: Visual verification
**Description**: Check production UI for clean tagline display.
**Acceptance**:
- [ ] `constructs.network/constructs` — no truncated descriptions, all 17 show full taglines
- [ ] Leaderboard — taglines display without ellipsis or mid-word cuts
- [ ] `/constructs/[slug]` detail pages — short_description visible if rendered

### Task 1.7: Deploy explorer to Vercel
**Description**: Push triggers Vercel deployment. Verify frontend renders new API field.
**Acceptance**:
- [ ] `constructs.network` loads without errors
- [ ] Network tab: API response includes `short_description` for all constructs

---

## Sprint 2: Ecosystem Propagation (global sprint-51)

**Goal**: Make `short_description` a first-class field across the construct ecosystem so the override map becomes unnecessary.

**Precondition**: Sprint 1 complete — production serving taglines from override map.

### Task 2.1: Update construct-base template
**Description**: Add `short_description` field to the template `construct.yaml` in `0xHoneyJar/construct-base`.
**Change**:
```yaml
# construct.yaml
short_description: "3-4 word tagline (max 80 chars)"  # Storefront display
```
**Acceptance**:
- [ ] PR opened to `0xHoneyJar/construct-base`
- [ ] `constructs create` generates YAML with `short_description` field
- [ ] Comment explains the constraint (noun phrase, no articles, max 80 chars)

### Task 2.2: Open PRs to construct repos (batch 1 — core 9)
**Description**: Add `short_description` to `construct.yaml` for the 9 most active constructs.
**Repos**: artisan, observer, protocol, k-hole, the-easel, hardening, herald, beacon, crucible
**PR template**:
```yaml
short_description: "<tagline from override map>"
```
**Acceptance**:
- [ ] 9 PRs opened with correct taglines
- [ ] Each PR is a single-field addition (minimal diff)
- [ ] PRs assigned to @janitooor for review

### Task 2.3: Open PRs to construct repos (batch 2 — remaining 8)
**Description**: Add `short_description` to remaining construct repos.
**Repos**: dynamic-auth, gecko, growthpages, gtm-collective, mibera-codex, social-oracle, the-arcade, webreel
**Acceptance**:
- [ ] 8 PRs opened with correct taglines
- [ ] All 17 repos now have `short_description` in their `construct.yaml`

### Task 2.4: Verify auto-sync picks up new field
**Description**: After PRs merge, run `bun run seed` to confirm `construct.yaml` `short_description` overrides the seed script fallback map.
**Acceptance**:
- [ ] `bun run seed` with a construct that has `short_description` in YAML uses the YAML value (not the override map)
- [ ] Fallback chain works: YAML → override map → derived

### Task 2.5: Make field required in Zod schema (gate on 2.2 + 2.3)
**Description**: After all 17 repos have `short_description`, change Zod from `.optional()` to required.
**File**: `packages/shared/src/validation.ts:334`
**Change**: `z.string().min(5).max(80).optional()` → `z.string().min(5).max(80)`
**Acceptance**:
- [ ] `bun run seed` still passes (all manifests provide the field)
- [ ] `constructs publish` without `short_description` fails validation
- [ ] TypeScript type updated to non-optional

---

## Risk Mitigation

| Risk | Sprint | Mitigation |
|------|--------|------------|
| Migration fails on production | 1.3 | Nullable ADD COLUMN is safe — test on staging first if available |
| Seed script errors on new column | 1.5 | Verify migration applied before seeding |
| Auto-sync breaks for repos without field | 2.5 | Gate on ALL 17 PRs merged before making required |
| Tagline objections from maintainers | 2.2/2.3 | PRs are proposals — maintainers can edit before merge |

## Definition of Done

- [ ] All 17 constructs display handcrafted taglines on production
- [ ] Zero truncated descriptions in the UI
- [ ] `short_description` field in API response for all endpoints
- [ ] construct-base template includes `short_description`
- [ ] All 17 construct repos have `short_description` in `construct.yaml`

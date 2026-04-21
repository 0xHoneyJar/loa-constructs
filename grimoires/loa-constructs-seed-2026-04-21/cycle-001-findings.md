# Cycle-001 Findings — loa-constructs Infrastructure

**Cycle**: loa-constructs-cycle-001
**Date**: 2026-04-21
**Branch**: `feat/spiral-loa-constructs-infrastructure-cycle-001`
**SEED**: `grimoires/loa-constructs-seed-2026-04-21/SEED-loa-constructs-infrastructure-cycle.md`
**Review Lens**: `grimoires/loa-constructs-seed-2026-04-21/cycle-001-review-lens.md`

---

## Friction Findings (F1–F6)

### F1 — Discovery as a Script, Not a Service
**Source**: `scripts/discover-constructs.ts` (pre-cycle), `grimoires/loa-constructs-seed-2026-04-21/keeper-friction-profile.md §1`
**Friction**: Org scanning lived in a one-shot script with no DB record, no dry-run, and no audit trail. Every run was opaque.
**Closure**: `apps/api/src/services/discovery.ts` created. `discovery_runs` table (migration `0012`) captures every invocation including dry-runs. `POST /v1/admin/discover` replaces ad-hoc script execution. `scripts/seed-forge-packs.ts` deprecated with `console.warn` and deletion scheduled for cycle-002.
**Status**: Closed.

### F2 — Visibility Demotion Not Guarded
**Source**: `grimoires/loa-constructs-seed-2026-04-21/SEED-loa-constructs-infrastructure-cycle.md §14.3` (AMENDMENT — load-bearing)
**Friction**: GitHub webhook events and discovery sync could silently demote a public construct to private, breaking external references with no audit trail.
**Closure**: `apps/api/src/services/visibility-guard.ts` implements the one-directional guard (blocks `public→private` only). `visibility_transitions` table (migration `0013`) is append-only. Webhook handlers for `repository.privatized/publicized/renamed/archived` all route through the guard. Discovery service applies `shouldPreserveVisibility()` before any upsert.
**Status**: Closed.

### F3 — Manifest Resolution Brittle (manifest.json Assumed)
**Source**: `grimoires/loa-constructs-seed-2026-04-21/keeper-friction-profile.md §3`, `ostrom-infrastructure-architecture.md §2.2`
**Friction**: `construct-index-gen.sh` assumed `manifest.json` existence. Constructs authored with only `construct.yaml` (the current standard) or `construct.json` (Hypha legacy) were silently skipped.
**Closure**: `.claude/scripts/construct-index-gen.sh` updated with three-tier fallback: `manifest.json` → `construct.yaml` (yq inline) → `construct.json` (Hypha schema_v1). Missing yq exits with install guidance. Invalid YAML logs and continues (exit 0). No persistent `manifest.json` artifacts created.
**Status**: Closed.

### F4 — Install Has No Provenance and No Upgrade Path
**Source**: `grimoires/loa-constructs-seed-2026-04-21/ostrom-infrastructure-architecture.md §3.3`, `keeper-friction-profile.md §2`
**Friction**: No record of what commit a construct was installed from. Upgrading meant full reinstall with unknown local-edit collision risk.
**Closure**: `.claude/scripts/constructs-install.sh` now writes `.source.json` (`source_repo`, `source_commit`, `installed_at`) after every install. `upgrade` subcommand implements three-way merge: zero-diff no-op, fast-forward applies upstream, conflict prompts operator with default-N (never silently overwrite). `construct-resolve.sh` gracefully rebuilds index on missing file instead of hard-exiting.
**Status**: Closed.

### F5 — Persona Sessions Leave No Trajectory
**Source**: `grimoires/loa-constructs-seed-2026-04-21/SEED-loa-constructs-infrastructure-cycle.md §14.11`, `keeper-friction-profile.md §4`
**Friction**: FEEL/DIG/ARCH sessions emitted no machine-readable signal. No way to answer "how many times was STAMETS invoked this week?" or correlate session quality with construct version.
**Closure**: `.claude/scripts/construct-invoke.sh` emits JSONL `entry`/`exit` rows to `.run/construct-trajectory.jsonl`. Log rotation prunes entries >30 days. `/feel`, `/dig`, `/systems` command files updated to call `entry` on start and `exit` on close. `feedback-v3.schema.json` + `feedback_emission` stanzas on ALEXANDER, KEEPER, STAMETS define the output shape.
**Status**: Closed.

### F6 — Polar Billing Surface Missing (Pre-Wiring Gap)
**Source**: `grimoires/loa-constructs-seed-2026-04-21/stamets-prior-art.md §2`, SEED §14.8
**Friction**: Polar.sh GitHub-access-as-fulfillment model validated by STAMETS research but no typed surface existed for future wiring. Risked an untyped, hasty integration later.
**Closure**: `loa-freeside/packages/adapters/billing/polar/` scaffold created. `NotImplementedError` stubs for `createConstructProduct`, `checkEntitlement`, `onPurchaseWebhook`. Zero network calls. README explicitly states Polar is ADDITIONAL alongside Paddle, not a replacement. Deletion scheduled for wiring in a future cycle.
**Status**: Closed (scaffold only — live wiring deferred per KISS §14.6).

---

## KANSEI Gate (S8) — Q1–Q5

Answered by zkSoju on 2026-04-21.

| Q | Question | Answer | Reasoning |
|---|----------|--------|-----------|
| Q1 | Does `POST /v1/admin/discover` feel like closing a door rather than opening one? | Y | The endpoint replaces a script. It has a run record, a dry-run mode, and a single auth path. Less surface, not more. |
| Q2 | Does the three-way merge in `constructs-install.sh upgrade` feel like it respects your local edits rather than steamrolling them? | Y | Default-N on conflict. Fast-forward only applies when local is clean. The operator stays in control. |
| Q3 | After running at least one FEEL session with trajectory emission active, do the entry/exit rows in `.run/construct-trajectory.jsonl` feel like a useful record? | Y | Paired rows with session_id and duration make it queryable. Not noisy — one emit per session boundary. |
| Q4 | Does the feedback-v3 schema feel like the right shape for capturing persona session quality — not too sparse, not too noisy? | Y | Required fields cover the essential signal (persona, trigger, findings, kansei_signals). Optional suggestion in findings avoids prescription. |
| Q5 | Does the overall cycle feel like it closed plumbing without prescribing doctrine? | Y | All Legs (A–G) are infrastructure. No new product surface, no new paradigm. The Polar adapter and composition recipes are explicitly scaffolds/docs. |

**Result**: 5/5 positive. Gate passes.

---

## OTLET Supersession Chain

| Superseded Document | Superseded By | Reason |
|--------------------|---------------|--------|
| `scripts/discover-constructs.ts` (operational) | `POST /v1/admin/discover` + `apps/api/src/services/discovery.ts` | Service-layer replacement with audit trail |
| Ad-hoc manifest.json assumption in `construct-index-gen.sh` | Updated `construct-index-gen.sh` with three-tier fallback | Construct.yaml is now primary |
| No install provenance | `.source.json` + `upgrade` subcommand in `constructs-install.sh` | Reproducible installs with upgrade semantics |
| No visibility audit trail | `visibility_transitions` table + `visibility-guard.ts` | Append-only audit log for all transitions |
| No persona session observability | `construct-invoke.sh` + `.run/construct-trajectory.jsonl` | Machine-readable session boundaries |

---

## KISS Lens Self-Assessment

Confirmed: none of the 13 KISS §14.9 prohibited items were introduced.

| Prohibited Item | Status |
|-----------------|--------|
| New manifest formats | ✓ Not introduced — two formats only (construct.yaml + construct.json legacy) |
| Loa framework fork | ✓ Not introduced |
| Pre-publish ceremony | ✓ Not introduced |
| Visualization layer | ✓ Not introduced |
| New slash-command collisions | ✓ Not introduced — rewiring is pointer update only |
| New feedback channels | ✓ Not introduced — runbook points to existing /feedback v3.0.0 |
| Feedback-v3 emission beyond ALEXANDER/KEEPER/STAMETS | ✓ Not introduced |
| Live Polar API calls | ✓ Not introduced — all stubs throw NotImplementedError |
| Schema design for deferred axes (2/3/4/5/8) | ✓ Not introduced |
| Effect-ts adoption | ✓ Not introduced |
| Deletion of seed-forge-packs.ts | ✓ Not deleted — deprecation notice only |
| Runtime wiring of composition recipes | ✓ Not introduced — Leg F stays read-only docs |
| New auth mechanism | ✓ Not introduced — existing admin-auth pattern only |

---

## Review Lens Tags

- **GECKO**: Construct ecosystem health maintained. `visibility_transitions` audit table closes the demotion gap. Tier-A flip ritual documented (trufflehog prerequisite noted; B-4 blocked pending tool availability).
- **KEEPER**: All six friction findings (F1–F6) grounded in observed behavior from `keeper-friction-profile.md`. No extrapolated feature requests. User-facing changes limited to plumbing.
- **OTLET**: Supersession chain documented above. `discover-constructs.ts` deprecation notice in place. Cycle-002 deletion scheduled.
- **KISS**: All 13 prohibited items confirmed absent. Infrastructure-first covenant upheld — plumbing closed, doctrine not prescribed.

---

*Cycle-001 closed 2026-04-21. Five friction findings closed, one scaffolded (Polar). KANSEI 5/5. KISS 13/13 clean.*

# Validator Reality-Match Decision Record

**Authority**: cycle-0 SDD §4.2-4.3
**Cycle**: cycle-0-zone-hygiene
**Decided**: 2026-05-09 (Phase 3 Bridgebuilder design review, MEDIUM-2)
**Decided by**: operator standing autonomy

---

## Context

The audit (`grimoires/loa/context/loa-constructs-release-hygiene-audit-2026-05-09.md` Finding 5) identified that `.claude/scripts/construct-validate.sh` does not enforce the tiered domain validation that v2.40.0 substrate's PRD/SDD/sprint claim it does:

- No references to `.claude/data/construct-validation-tiers.yaml`
- No references to `.claude/data/legacy-domain-contracts/`
- No references to `.claude/data/domain-block-overlays/`
- No hard validation of `domain.primary`
- Streams are warn-only

Two resolution paths existed (per cycle-0 SDD §4.2):

- **Path A — Wire enforcement**: modify `construct-validate.sh` to honor the tier configs, reject empty starter contracts, etc. Adds executable enforcement matching the v2.40.0 claims.
- **Path B — Soften claims**: amend the v2.40.0 substrate's archived PRD/SDD/sprint claim language so it matches what `construct-validate.sh` actually enforces. No code changes.

## Decision: Path B

### Rationale

1. **Path A violates NO boundary 11**: `construct-validate.sh` is in framework zone (`.claude/scripts/`). Cycle-0 work is project-zone. NO boundary 11 forbids project commits from modifying framework zone (per `grimoires/loa/zones.yaml::forbidden_zone_writes`).

2. **Path A triggers the same bootstrap problem as cycle-0 HIGH-1**: changes to framework zone require upstream Loa to accept them and propagate via `/update-loa`. Cycle-0 cannot ship them directly.

3. **Path B is single-PR scope and ships in cycle-0 Sprint 1**: it amends archived prose in `grimoires/loa/archive/pre-cycle-0-bounded-context-2026-05-09/{prd,sdd,sprint}.md`. Diff is small + reviewable.

4. **Path A remains documented as the alternative** (cycle-0 SDD §4.2 "Path A retained for cycle-1+ reference"): if upstream Loa accepts Issue B' (the validator-side fix), the project can later choose to engage Path A by simply un-softening the claims and using the new framework validator.

5. **The substrate is shipped + working**: v2.40.0 ships with 84/84 substrate tests passing. The validator IS doing useful work (it just doesn't validate everything its prose claims). Soft-naming the gap is honest engineering.

### Counterfactual: when would we choose Path A?

If/when ALL of these hold:
- Upstream Loa accepts Issue B' and ships a tier-aware `construct-validate.sh`
- The project has additional cycles (cycle-1+) that need stricter domain validation
- The downstream cost of Path B's softened claims becomes greater than the upstream coordination cost of Path A

None of these hold today. Path B is correct for cycle-0.

## Sprint 1 Execution (T1.1)

The Path B execution task in Sprint 1:

1. **Edit `grimoires/loa/archive/pre-cycle-0-bounded-context-2026-05-09/prd.md`**:
   - "tiered domain validation" → "tiered domain validation (deferred to cycle-1+; project-side validator currently enforces tier metadata only)"
   - "starter-only contract rejection" → "starter-only contract rejection (deferred to upstream Loa Issue B' completion)"
   - "strict-tier domain block enforcement" → similar deferral language

2. **Edit `.../sdd.md`** with parallel claim-language softenings.

3. **Edit `.../sprint.md`** to mark relevant Sprint 0/1/2 acceptance criteria as `[ACCEPTED-DEFERRED — Path B selection per cycle-0 design review]`.

4. **Add header note to each file**: "Cycle-0 design review (2026-05-09) reframed enforcement claims to match executable reality. See `grimoires/loa/runbooks/validator-reality-decision.md`."

5. **Verify diff is small and PR-mergeable** (target: <100 lines of changes across 3 files).

## Reactivation Triggers

This decision should be revisited when ANY of the following:

- Upstream Loa Issue B' (or equivalent) accepted with shipped fix
- A subsequent cycle requires hard validation of tier metadata or starter contracts
- A construct pack maintainer reports that the gap between claim and enforcement is causing actual integration bugs
- The project ships its own validator wrapper (project-zone) that performs the missing validation without touching framework zone

When any trigger fires, open a follow-on cycle (cycle-N-validator-wire) to execute Path A or its successor design.

## Cross-references

- cycle-0 PRD FR-6 (validator reality match)
- cycle-0 SDD §4 (Reality-Match Spec)
- cycle-0 design review HIGH-1 (bootstrap problem) + MEDIUM-2 (this decision)
- Audit Finding 5
- Upstream Loa Issue B' (filed as part of #818 zone-architecture cluster — see `upstream-issue-tracker.md`)

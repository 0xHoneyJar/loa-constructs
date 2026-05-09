# Framework De-Leak Strategy Decision Record

**Authority**: cycle-0 SDD §6.3 (Component Inventory: Removed Tracked Paths) + Sprint 2 T2.1
**Cycle**: cycle-0-zone-hygiene
**Status**: PENDING (Sprint 2 dispatch)
**Cycle-0 default**: Option A
**Sprint 2 entry pre-condition**: this runbook updated with operator decision

---

## What this runbook decides

Cycle-0 Sprint 2 T2.1 strips framework cycle dirs that leaked into this project's git history (per audit Finding 6 + cycle-0 PRD FR-3):

- `grimoires/loa/cycles/cycle-093-stabilization/` (6 tracked files)
- `grimoires/loa/cycles/cycle-094-followups/` (2 tracked files)
- `grimoires/loa/cycles/cycle-098-agent-network/` (~40 tracked files including subdirs)
- `grimoires/loa/cycles/cycle-099-model-registry/` (~15 tracked files)
- `grimoires/loa/cycles/cycle-100-jailbreak-corpus/` (~8 tracked files)
- `grimoires/loa/cycles/cycle-102-model-stability/` (5 tracked files)
- Plus ~3 framework-cycle artifacts at non-canonical paths:
  - `.claude/scripts/lib/context-isolation-lib.sh.cycle-100-baseline`
  - `docs/architecture/ADR-001-cycle-099-model-registry.md`
  - `docs/migration/v1.130-cycle-099-model-registry.md`

**Total**: ~80 tracked files to remove from `main`.

The strip MUST happen in Sprint 2 (Sprint 0 + Sprint 1 are too early — the planning artifacts in those framework cycle dirs may still be referenced by ongoing cycle-0 work, and Sprint 0/1 commits don't include the strip semantically).

The strip CAN be done three ways. Operator chooses; this runbook records the choice + rationale.

---

## Options

### Option A — `git rm` only (default; LOW blast radius)

Strip the files from working tree + index; let git history retain them for archaeology.

```bash
git rm -r grimoires/loa/cycles/cycle-093-stabilization/
git rm -r grimoires/loa/cycles/cycle-094-followups/
git rm -r grimoires/loa/cycles/cycle-098-agent-network/
git rm -r grimoires/loa/cycles/cycle-099-model-registry/
git rm -r grimoires/loa/cycles/cycle-100-jailbreak-corpus/
git rm -r grimoires/loa/cycles/cycle-102-model-stability/
git rm .claude/scripts/lib/context-isolation-lib.sh.cycle-100-baseline
git rm docs/architecture/ADR-001-cycle-099-model-registry.md
git rm docs/migration/v1.130-cycle-099-model-registry.md
```

**Pros**:
- Reversible (just `git revert <strip-commit>`)
- No history rewrite; no impact on existing clones, forks, CI caches
- Single commit, clear scope, easy review
- Future `/update-loa` doesn't re-introduce the files (because of `.gitattributes merge=ours` on `grimoires/loa/cycles/**`, added in cycle-0 T0.8)

**Cons**:
- Files remain in git history; `git log -- grimoires/loa/cycles/cycle-098-*` still shows the framework cycle work
- Slight ongoing repo size impact (the file blobs stay in pack files until `git gc --prune`)

**Recommended for**: cycle-0. This is the conservative path.

### Option B — Full git history rewrite (HIGH blast radius)

Use `git-filter-repo` to remove the framework cycle dirs from EVERY commit in the repo's history.

```bash
git filter-repo --path grimoires/loa/cycles/cycle-093-stabilization \
                --path grimoires/loa/cycles/cycle-094-followups \
                --path grimoires/loa/cycles/cycle-098-agent-network \
                --path grimoires/loa/cycles/cycle-099-model-registry \
                --path grimoires/loa/cycles/cycle-100-jailbreak-corpus \
                --path grimoires/loa/cycles/cycle-102-model-stability \
                --invert-paths
git push --force --all
git push --force --tags
```

**Pros**:
- Files truly gone from git history; clones/checkouts no longer carry the blobs
- Repo size reduces meaningfully
- Future agents querying `git log -- grimoires/loa/cycles/cycle-098-*` get empty result (cleanly true)

**Cons**:
- ⚠️ **Invalidates every existing clone, fork, and CI cache**. Anyone with `loa-constructs` checked out elsewhere needs to re-clone or carefully reset.
- All commit SHAs change; references in issues, PRs, release notes that point to old SHAs become broken links.
- High-blast-radius, irreversible without a coordinated rollback.
- Requires force-push to main, which most teams disallow without explicit approval.

**Recommended only when**:
- The repo has very few external clones (operator only, minimal forks)
- Repository size pressure is concrete (e.g., GitHub bandwidth costs, slow clones)
- The team explicitly approves the blast radius
- A known-good "before" snapshot is preserved on a separate branch

### Option C — Move to operator-private archive branch (MEDIUM blast radius)

Create a separate `archive/framework-cycle-residue` branch holding the cycle dirs; remove from main; tag the archive for retrievability.

```bash
# Create archive branch from current main
git checkout -b archive/framework-cycle-residue main
# Verify cycle dirs present on archive branch (sanity)
git ls-files grimoires/loa/cycles/cycle-098-agent-network/ | head -3
# Push archive branch + tag
git push origin archive/framework-cycle-residue
git tag archive-framework-cycle-residue-2026-05-09
git push origin archive-framework-cycle-residue-2026-05-09

# Back to working branch
git checkout cycle/cycle-0-zone-hygiene
# Then execute Option A's git rm operations
```

**Pros**:
- Files preserved on an explicit archive branch — retrievable without git surgery
- Main stays clean
- Reversible (cherry-pick from archive branch back to main if needed)

**Cons**:
- Adds an explicit branch to the repo's branch list
- Requires retention policy: when does the archive branch get deleted? Who owns it?
- Slightly more complex to explain to future agents

**Recommended when**:
- The framework cycle dirs contain content the operator might want to reference later (e.g., decision-trail breadcrumbs, model-evaluation traces)
- Archive lifecycle is well-understood (operator commits to revisit by date X)

---

## Decision Tree

1. **Is anyone consuming `grimoires/loa/cycles/cycle-098-*` from this repo's clones?**
   - YES → Option C (preserve via archive branch)
   - NO → continue

2. **Is repository size pressure concrete and significant?**
   - YES → Option B (history rewrite)
   - NO → continue

3. **Does the operator want the framework-cycle work retrievable for later reference?**
   - YES → Option C
   - NO → Option A (default)

4. **Are there shared clones/forks that would break under force-push?**
   - YES → Option A or C
   - NO → Option B is safe

For cycle-0 of `0xHoneyJar/loa-constructs`:
- No external consumers of cycle-09X dirs — the files are framework upstream's, not load-bearing for any downstream consumer
- Repo size pressure not explicit — the leaked files are documentation-class size, not large blobs
- Operator can refer back to upstream Loa repo (`0xHoneyJar/loa`) for the canonical cycle history
- Multiple clones likely (operator's local + CI + any forks)

→ **Option A is the right default.**

---

## Operator Decision (filled at Sprint 2 dispatch)

```
Decision: <A | B | C>
Date: <YYYY-MM-DD>
Operator: @<handle>
Rationale: <if non-default, document why>
Risks acknowledged: <list>
Verified preconditions: <list>
```

---

## Audit Trail

Sprint 2 T2.1 execution appends here.

---

## Cross-references

- cycle-0 PRD FR-3 (framework de-leak)
- cycle-0 SDD §6.3 (Component Inventory: Removed Tracked Paths)
- cycle-0 design review MEDIUM-3 (operator-approval gate for B/C)
- Audit Finding 6
- Upstream Loa Issue #818 (zone-aware /update-loa filter — prevents future re-leak)
- `.gitattributes::grimoires/loa/cycles/** merge=ours` (cycle-0 T0.8 — interim defense)

# Migration: folding `0xHoneyJar/constructs-cli` into `constructs` (PRD FR-16, G-6)

> Cycle: `constructs-launcher-cli` · sprint-229 T3.8
> Status: **COMPLETE** — redirect pushed (`7a56e0a`) and repo archived 2026-07-13 (operator-authorized)

## What changed

`0xHoneyJar/constructs-cli` (the standalone npx surface) is superseded by the
`constructs` capability binary at `packages/constructs-cli` in this repo.

**Nothing was removed and nothing was unpublished.** The old repo's actual value —
its **git-native, no-auth install lane** — was *absorbed*: it is now the offline/degraded
rung of the new binary's source-of-truth ladder (`constructs install --rung git`,
`lib/install.mjs`). The fold is a pointer, not a deletion (PRD R-6).

| Old | New |
|---|---|
| `npx constructs-cli install <slug>` | `constructs install <slug>` (integrity-verified: registry-anchored hash, attestation, containment) |
| `npx constructs-cli list` | `constructs list --json` (deterministic JSON, provenance, drift surfacing) |
| `npx constructs-cli` (human tables only) | `constructs capabilities --json` · `constructs robot-docs guide` (self-describing) |
| — | `constructs atlas --json` · `constructs where <path>` (territory, computed) |

## The npm reality (PRD assumption corrected)

PRD FR-16 planned an `npm deprecate` step ("visible install warning — nothing
unpublished"). **The package was never published**: `npm view constructs-cli` →
`E404 Not Found`. There is nothing on npm to deprecate, and no npm consumer to warn.
The `npx constructs-cli …` invocations in the old README were aspirational.

Consequence: the fold reduces to (a) the in-repo deprecation pointer, (b) the README
archive banner, (c) archiving the repo. Steps (a) and (b) are authored and committed
locally on `main` in that repo (`7a56e0a`, unpushed).

## What was done (2026-07-13, operator-authorized)

1. **Pushed** the redirect commit `7a56e0a` to `main` — verified live on the remote (README
   banner renders; `src/index.ts` carries the stderr pointer) BEFORE archiving, since an
   archived repo is read-only.
2. **Archived** `0xHoneyJar/constructs-cli` (`gh repo archive` → `isArchived=true`). Read-only,
   **not deleted**: existing clones, checkouts, and `git clone` all keep working.
3. **npm**: nothing to do — the package does not exist on the registry (E404).

Tracked and closed: `bd-7jx7`, `bd-2615`.

## Rollback criteria (PRD FR-16)

Roll the fold back if ANY of these hold within one release cycle of archiving:

| Trigger | Signal | Rollback action |
|---|---|---|
| The git rung regresses | `constructs install --rung git` fails against a registry construct that `constructs-cli` installed successfully | `gh repo unarchive 0xHoneyJar/constructs-cli`; revert `7a56e0a`; file the install defect against `lib/install.mjs` |
| An unmigrated consumer breaks | any repo/CI still invoking `constructs-cli` fails after archive (archive is read-only, not delete — clones and existing checkouts keep working, so this should be impossible; if it happens, the assumption was wrong) | unarchive; keep both surfaces until the consumer migrates |
| The new binary cannot be reached | `loa caps` does not list `constructs` in a consuming repo | unarchive; the fold is premature until launcher discovery is proven in that consumer |

**Rollback is cheap by construction**: archiving is reversible (`gh repo unarchive`),
the redirect is a single revertable commit, and no code was deleted from either side.
The absorbed git rung lives in `lib/install.mjs` regardless of the old repo's state.

## Verification

```bash
# The pointer is on stderr only — stdout stays parseable (Axiom 4)
node dist/index.js list 2>/dev/null           # clean stdout
node dist/index.js list 2>&1 >/dev/null       # the pointer
CONSTRUCTS_SILENCE_DEPRECATION=1 node dist/index.js list 2>&1 >/dev/null   # silent

# The absorbed lane, in the new binary
constructs install <slug> --rung git --dry-run --json
```

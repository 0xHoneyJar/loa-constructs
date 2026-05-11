---
session: 2
date: 2026-04-26
type: kickoff
status: planned
---

# Session 2 — codex-review construct + composition (kickoff)

## Scope

- Author new construct `construct-codex-review` (separate repo, follows construct-the-easel shape)
- Author composition `code-implement-and-review.yaml` in construct-compositions/compositions/delivery/
- Vendor `lib-codex-exec.sh` from loa-constructs into the new construct (version-pinned, attribution)
- Lean SWE-focused single-persona reviewer (FAGAN placeholder); explicitly NOT overlapping with Flatline
- Locally-owned schema (`codex-review-finding.schema.json`) — respects contracts-as-bridges by living with the impl
- Test-bed end-to-end against henlo-monorepo perf pass (last night left a gate-shaped hole)

## Artifacts

- Architecture spec: `grimoires/loa/specs/arch-codex-review.md`

## Prior session

Session 1 (2026-04-25): yesterday's construct-compositions cycle landed `composition.schema.json` v1.0 + 5 compositions normalized. Schema-ownership doctrine settled in `composition-schema-as-bridge.md` — schema stays in loa-constructs, consumed via cross-repo CI.

Last working session (2026-04-26 evening): henlo-monorepo perf pass dispatched via codex-rescue. Worked great as IMPLEMENTER but no adversarial review gate. That's the gap this construct fills.

## Decisions made (informed by /hivemind contracts-as-bridges + PR #523 archaeology)

1. **Schema migration: SKIP** — accept the existing doctrine. composition.schema.json stays in loa-constructs as the BRIDGE (per contracts-as-bridges: "packages are bridges; apps are deployable units"). Operator's "repo owns its shape" instinct applies to the new construct's LOCAL schema (`codex-review-finding.schema.json`) which DOES live with the impl.

2. **Reframe from "resurrect gpt-review" to "build a new lean construct"** — PR #523's deprecation reasoning was honest (orphan, broken tests, silent hooks, flatline absorbed primary value). Resurrection verbatim re-fights settled work. New construct learns from the failure modes.

3. **Responsibility split codified**:
   - Flatline Protocol = high-stakes adversarial review for PRD/SDD/Sprint planning. Multi-model + multi-persona + scored arbitration.
   - codex-review (new) = lightweight code review for diffs. Single GPT pass via codex CLI, single persona, structured JSON.

4. **Construct in separate repo** (operator directive) — `construct-codex-review/`, follows construct-the-easel pattern (construct.yaml as source of truth, no manifest.json — that gets generated at install time).

5. **Wrap `lib-codex-exec.sh` (CLI primitive), not codex-rescue (MCP plugin)** — operator framing: "scripts feel more functional we should wrap around core primitives like the headless codex." Vendoring with version pin chosen over sourcing-by-path for deployability.

6. **Composition default convergence cap = 3 iterations** — matches gpt-review's pattern; re-review prompt converges-toward-approval (lesson from drift in the original).

7. **No silently always-on hooks** — explicit invocation only. PostToolUse fire-and-forget was the primary noise generator in the original.

## Open for build session

- Persona name (FAGAN is placeholder — Michael Fagan invented formal code inspection)
- Construct repo name (`construct-codex-review` proposed)
- Test-bed: real henlo-monorepo diff vs synthetic fixture for first end-to-end
- Hivemind page documenting the codex-review-vs-flatline split (worth writing to prevent future confusion)
- Schema enforcement strictness — permissive (matches existing) vs strict on raw model output (catch drift early)

## v2 deep-dig refinements (2026-04-26 PM)

After reading the actual scripts (lib-codex-exec.sh full 417 lines, gpt-review-api.sh full 302, lib-security.sh, lib-content.sh, re-review.md prompt, gpt-review-hook.sh, schema), the spec was updated:

- **Vendor list precise**: 3 libs (lib-codex-exec.sh, lib-security.sh, lib-content.sh), not 1. Skip lib-curl-fallback.sh, lib-multipass.sh, lib-route-table.sh, normalize-json.sh, all hook infra.
- **Schema is draft-07 permissive** (not draft 2020-12 strict). Match ecosystem; the wrapper script appends meta-fields after the model returns, which strict mode would reject.
- **Re-review prompt is the load-bearing convergence asset** — closing line "VERIFY. DON'T REINVENT. CONVERGE." Adopted verbatim with light edits (drop 5.2 reference, drop DECISION_NEEDED, drop blocking_issues, tighten to diff-only).
- **Auto-approval at API level** is an inherited pattern — gpt-review-api.sh:264-269 returns `{verdict:APPROVED, auto_approved:true}` when iter > MAX_ITERATIONS, without invoking the model. Composition just increments iter; cap enforcement lives in the script.
- **Bonfire and loa-constructs gpt-review-api.sh are IDENTICAL** — `diff` returns empty. Source from loa-constructs as canonical. No cleanup work needed (operator's instinct was right to defer).
- **Hooks intentionally REMOVED in v2.0** — `inject-gpt-review-gates.sh` v2.0 comment explicitly says "No more skill/command file injection (fragile and redundant)." LOA team already learned the hook lesson. New construct: NO hooks at any layer.
- **Token budgeting**: `lib-content.sh` has 4-tier file priority (P0=security, P1=business, P2=config, P3=docs/tests), bytes/3 token estimation, git-diff-aware splitting on `diff --git a/(.+) b/`, optional `.reviewignore` via `review-scope.sh`.
- **lib-codex-exec.sh has Python3 fallback** for arbitrary-nesting JSON extraction (`raw_decode`) — critical for codex outputs that wrap JSON in prose with deep nesting.
- **`lib-security.sh` adaptation needed**: drop `flatline_protocol.secret_scanning.patterns[]` config lookup (bonfire-coupled); rename to `codex_review.secret_patterns` OR drop config-driven extras entirely (V1: hardcoded patterns).

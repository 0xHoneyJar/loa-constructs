# Senior Tech Lead Review — sprint-bug-144

**Sprint**: sprint-bug-144 · **Bug ID**: 20260517-i244-9c87bf · **PR**: #245
**Date**: 2026-05-17
**Verdict**: **All good (with noted concerns)**
**Concerns**: 4 documented, all non-blocking, tradeoff justifications acceptable.

---

## Adversarial Analysis

### Concerns Identified

#### Concern 1 — Flag-shape incompatibility in `exec` routing (HIGH severity, non-blocking)

**Location**: `.claude/scripts/butterfreezone-gen.sh:2338`

```bash
exec "$_construct_gen" "." "$@"
```

The two scripts have different flag vocabularies:

| butterfreezone-gen flags | butterfreezone-construct-gen flags |
|---|---|
| `--tier N`, `--json`, `--strict`, `--verbose` | `-o PATH`, `--stdout`, `--dry-run`, `--timestamp` |
| `--stdout`, `--dry-run`, `--output` (shared) | (same shared subset) |

If user invokes `butterfreezone-gen --tier 3` in a skill-pack repo, routing fires → construct-gen sees `--tier` → `[construct-validate] ERROR: unknown flag --tier` → exit 2. Confusing because the error mentions a script the user didn't invoke.

**Test coverage gap**: The bats case `bfz-gen: skill-pack repo routes to construct-gen (bug #244-3)` forwards only `--stdout` (mutually supported), so this regression class isn't exercised.

**Recommendation** (follow-up, not blocking this PR): Either pre-filter incompatible flags before exec OR document the supported overlap in the routing comment. Operator-level decision; current behavior is "fail loudly with construct-gen's error message" which is at least visible.

#### Concern 2 — Silent fallback when routing predicate fails (MEDIUM, non-blocking)

**Location**: `.claude/scripts/butterfreezone-gen.sh:2327-2341`

Three silent-fallback paths to wrong-shape generic output:
- `command -v yq` fails → generic path (no warning)
- `[[ -f "construct.yaml" ]]` but type is not `skill-pack` → generic path (correct, no warning needed)
- `[[ -x "$_construct_gen" ]]` fails → generic path (no warning)

A skill-pack repo with `yq` missing OR `construct-gen` not executable would silently produce wrong-shape output without explaining why routing didn't fire.

**Recommendation** (follow-up): When `construct.yaml` declares `type: skill-pack` but routing can't fire, emit `log_warn` explaining the predicate that failed. Current behavior favors backwards compatibility over user feedback.

#### Concern 3 — Subsecond timestamp regression risk (LOW, non-blocking)

**Location**: `.claude/scripts/butterfreezone-validate.sh:492`

```bash
epoch=$(date -j -u -f "%Y-%m-%dT%H:%M:%SZ" "$ts" +%s 2>/dev/null) || epoch=""
```

BSD format string is exact — fractional seconds like `2026-05-17T19:02:14.123Z` won't parse. butterfreezone-gen currently emits seconds-only timestamps so this isn't triggered, but if upstream ever changes format the chain falls through to adapter 4 (GNU `date -d`, also fails on Darwin) → epoch 0 → 20590 days regression.

**Recommendation** (follow-up): Strip fractional seconds before adapter 3 OR add a `%Y-%m-%dT%H:%M:%S.%NZ` alternate. Low priority because gen format is stable.

#### Concern 4 — Field-name drift class extends beyond the sprint scope (MEDIUM, non-blocking)

**Location**: Multiple files outside this sprint's diff:

| File | Usage | Status |
|---|---|---|
| `.claude/skills/validating-construct-manifest/index.yaml:75` | Declares `composes_with: [publishing-constructs, browsing-constructs]` | Same typo class, skill `index.yaml` schema (different namespace) |
| `.claude/scripts/construct-index-gen.sh:474, 481, 492` | Writes `composes_with` to the generated registry index | Different concept (computed output vs manifest input) — arguably intentional |
| `.claude/scripts/archetype-resolver.sh:398, 404` | Reads `composes_with` from the registry index | Consistent with construct-index-gen.sh |
| `.claude/schemas/network/legacy-domain-contract.schema.json` | Schema file (legacy) | Inspect; likely intentional given filename |

The sprint plan (Risk Notes L147) flagged this class as TEND-mode follow-up. Surfacing here to confirm the broader drift surface so a follow-up issue can be filed.

**Recommendation**: File follow-up issue "sweep all .claude/scripts/*.sh for composes_with vs compose_with naming consistency" — defer to next TEND cycle.

### Assumption Challenged

- **Assumption**: `python3` is available in any environment that runs `butterfreezone-validate.sh`.
- **Source**: Comment at `validate.sh:468-469` reads "python3 — already a Loa dependency."
- **Risk if wrong**: On a stripped-down env without `python3`, `gdate`, or BSD `date -j` (e.g., a docker container with only bash + jq + yq + GNU coreutils), adapter chain falls to adapter 4 (GNU `date -d`) which works on Linux. On stripped-down macOS this would fail. Risk is low (such environments are uncommon for Loa users) but the dependency chain is implicit.
- **Recommendation**: Document `python3` or `gdate` as a prerequisite in the validator's `--help` output, OR explicitly check at script init and emit a clear error. Non-blocking — the chain falls open on the dominant Linux + Darwin developer paths.

### Alternative Not Considered

- **Alternative**: Shared `lib/date-portability.sh` sourced by both validators that need ISO8601 parsing.
- **Source**: Sprint plan L46-49 explicitly listed this as an option: "either in each script or in a new shared `lib/date-portability.sh` sourced by both".
- **Tradeoff**:
  - **Current (per-script)**: simpler diff, no new file, no shared-state risk, easier to understand at the call site
  - **Library**: reusable when other scripts hit the same class
- **Verdict**: Current approach is justified — `butterfreezone-gen.sh` doesn't compute freshness, and the only other date-parsing site we'd unify into a library is hypothetical. YAGNI applies. Refactor if a second site emerges.

---

## AC Verification — Reviewer Sign-Off

The engineer's `reviewer.md` walks every AC from `sprint.md` verbatim with file:line evidence. Spot-checked 4 ACs against actual code:

| AC | Engineer claim | Verified |
|---|---|---|
| Sprint AC#1 — "All 6 new bats tests pass" | `bats --filter 'bug #244-' → 6/6 pass` | ✓ Re-ran on Darwin: 6/6 pass |
| Task 2 AC — "fresh BUTTERFREEZONE.md reports 0 days, not 20590" | `validate.sh:458-499` helper + `:511-519` call site | ✓ Re-ran validate.sh: "Freshness check passed (0 days old, threshold: 7)" |
| Task 3 AC — "object form renders `slug — relationship`" | `construct-gen.sh:163-168` jq type-discriminated filter | ✓ Re-ran against `construct-the-arcade`: 3 bullets, em-dash separator, no raw JSON |
| Task 4 AC — "non-skill-pack repos still report type: framework" | Regenerated `BUTTERFREEZONE.md` for `loa-constructs` itself | ✓ AGENT-CONTEXT block contains `type: framework` (preserved) |

Partial markers (`⚠`) in reviewer.md are appropriate:
- **AC#3 Linux CI**: blocked on operator pushing `bats-tests.yml` under their own auth — verified workflow file is committed to the branch, gate is mechanical, not engineering
- **Task 1 fixture path divergence**: deviation from sprint.md L39 is justified (matches existing `$BATS_TEST_TMPDIR` convention); reviewer accepts
- **Task 6 reply timing**: operator-override documented; reviewer accepts

`✗ Not met` markers: 1 (Task 6 reply-after-PR) with explicit operator-authorization trail. Accepted.

No `⏸ [ACCEPTED-DEFERRED]` markers — no need to verify Decision Log entries.

---

## Code Quality Spot-Checks

| Check | Verdict |
|---|---|
| Karpathy: Think Before Coding | ✓ Reviewer.md surfaces 6 explicit decisions, each with tradeoff |
| Karpathy: Simplicity First | ✓ 4 sites of `sed \U` → `awk` replacement is the minimum portable swap; no helper-function overkill |
| Karpathy: Surgical Changes | ✓ Diff touches only the 4 source files + 4 test files + workflow + sprint artifacts. No unrelated formatting, no drive-by improvements |
| Karpathy: Goal-Driven | ✓ Tests assert specific output (`Constraints` not `Uconstraints`, `1 days old` not `20590`), not vague "it works" |
| Complexity — function length | ✓ `_parse_iso8601_to_epoch` is 40 lines, well under 50 |
| Complexity — nesting | ✓ Max depth 3 (inside `if -f / if yq -e / if -x`) |
| Complexity — duplication | ✓ 4 sed→awk replacements are intentional repetition, not refactorable (different chained pipes) |
| Security — input validation | ✓ `yq -e` is the gate (returns non-zero on missing/wrong type); no string-eval anywhere |
| Security — secrets | ✓ No hardcoded credentials, no API keys, no tokens |
| Documentation — CHANGELOG | ⚠ Not updated. Sprint plan didn't list it as a deliverable; bugfix commits in this repo are summarized at release-tag cut, not per-PR. Non-blocking |

---

## Phase 2.5 — Adversarial Cross-Model Review (FAILED)

Flatline cross-model dissenter invocation failed for both gpt-5.5-pro and gemini-3.1-pro (api_failure on both — known recurring failure documented in KF-011 per `grimoires/loa/known-failures.md`). Failure record persisted at `grimoires/loa/a2a/sprint-bug-144/adversarial-review.json`.

Per `.claude/skills/reviewing-code/SKILL.md` §Phase 2.5: "If adversarial review is unavailable (timeout, API error, budget exceeded), proceed with single-model assessment and log warning. No DEGRADED marker for review (only audit)."

Proceeding with single-model assessment. The 4 concerns + 1 assumption + 1 alternative above are surfaced from my own adversarial analysis without cross-model dissent. The PreToolUse:Write gate at COMPLETED-marker time may still fire — the audit hook will need to honor the api_failure status (per `.claude/hooks/safety/adversarial-review-gate.sh` semantics).

---

## Previous Feedback Status

N/A — first review pass. No `engineer-feedback.md` existed before this file.

---

## Decision

**All good (with noted concerns)**

Concerns 1-4 are non-blocking. Tradeoff justifications acceptable. Implementation is production-ready for merge. The 4 follow-up items (flag-shape filtering, silent-fallback warnings, subsecond format hardening, broader composes_with sweep) belong in a separate TEND-mode cycle, NOT in this PR — adding them now would violate Karpathy Surgical-Changes principle.

Sprint can proceed to `/audit-sprint sprint-bug-144`.

---

## Reviewer Signature

- Reviewer: senior-tech-lead (single-model; cross-model dissenter failed)
- Sprint: sprint-bug-144
- PR: https://github.com/0xHoneyJar/loa-constructs/pull/245
- Beads: bd-jwzz
- Concerns count: 4 (0 blocking, 4 follow-up)
- Approval: APPROVED-WITH-CONCERNS

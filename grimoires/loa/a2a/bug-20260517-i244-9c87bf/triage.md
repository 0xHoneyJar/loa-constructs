# Bug Triage: butterfreezone gen/validate — 4 bugs + auto-detect routing gap

## Metadata
- **schema_version**: 1
- **bug_id**: 20260517-i244-9c87bf
- **source_issue**: https://github.com/0xHoneyJar/loa-constructs/issues/244
- **classification**: bug-bundle (4 defects in shared script family)
- **severity**: high (silent failure surface: produces actively misleading documentation output for skill-pack repos and silent-drops `compose_with` data)
- **eligibility_score**: 5 (reproducible steps +2, source-locations cited +1, observed output snippets +1, regression baseline v1.167.3 +1)
- **eligibility_reasoning**: Reporter supplied exact `file:line` source references, exact YAML repros for bug #1, exact misrendered output for bugs #2/#3, and a deterministic warn-text + day-count for bug #4. All four are defects in existing behavior (no new endpoint, no new UI flow, no schema-add). Bug #1's framing is inverted relative to schema source-of-truth — see "Inverted-Framing Correction" below — but the underlying defect is real either way.
- **test_type**: unit (bats — script behavior tested via stdin/stdout/exit-code against fixture pack directories)
- **risk_level**: medium (touches `.claude/scripts/`, which is System Zone; requires cycle-level authorization to land; output-correctness change has zero blast-radius outside the four named scripts)
- **created**: 2026-05-17T07:30:00Z
- **tools_available**: jq=YES git=YES gh=YES br=YES bats=YES

## Inverted-Framing Correction (critical triage finding)

The reporter's framing for bug #1 names `compose_with` as "a typo (should be composes_with)". This is **inverted relative to canonical schema**:

| Source | Field name | Source-of-truth status |
|---|---|---|
| `.claude/schemas/network/construct.schema.json:L (see ack)` | `compose_with` | CANONICAL — declares the field as array of `{slug, relationship}` objects |
| `.claude/scripts/butterfreezone-construct-gen.sh:162` | reads `.composes_with` | **DEFECTIVE** — drifted from schema |
| `butterfreezone-construct-gen.sh:12` doc-comment | claims `composes_with` is canonical | **DEFECTIVE** — contradicts the schema |
| 15 sampled `construct.yaml` files in the wild (artisan, the-arcade, crucible, growthpages, noether, protocol, gecko, gtm-collective, the-easel, observer, the-speakers, the-mint, showcase, vfx-playbook, hardening) | use `compose_with` | follow the canonical schema |

**Net effect**: the script silently drops `compose_with` declarations from every construct in the wild because it looks for a field that doesn't exist by that name. The reporter's repro was correct in mechanism; the fix direction is the opposite of what they assumed. The script should be updated to read `compose_with` (matching the schema and the wild), and its doc-comment at line 12 should be corrected to say `compose_with`. The reporter's tertiary recommendation — "accept both forms with a deprecation warning" — is unnecessary: `compose_with` is the canonical and observed form everywhere except in this one script, so a single-direction fix suffices.

This correction must be surfaced to the reporter before they refactor any `construct.yaml` files to "fix the typo" themselves; doing so would break the schema contract in 15+ packs.

## Reproduction

### Bug #1 — Script reads wrong field name (silent data drop)
**Steps**:
1. Take any construct pack with a valid `compose_with:` declaration (e.g., `construct-the-arcade`, which has 3 entries).
2. Run `.claude/scripts/butterfreezone-construct-gen.sh <pack-path> --stdout | grep -A5 "Composes with"`.
3. Observe output: `_None declared._` despite the field being populated.

**Expected**: Composes-with section renders all 3 entries.
**Actual**: `_None declared._` (script reads `.composes_with`, field is `compose_with`).

### Bug #2 — Object rendering treats objects as strings
**Steps**:
1. Same fixture as bug #1 — `compose_with` is an array of `{slug, relationship}` per schema.
2. Apply a quick local patch flipping `composes_with` → `compose_with` at line 162.
3. Re-run. Now field is read, but `jq -r 'compose_with[]'` on object entries dumps stringified JSON.

**Expected**: One bullet per composition with the slug, relationship rendered as nested context (e.g., em-dash continuation or sub-bullet).
**Actual** (reporter-supplied):
```
-   "relationship": "ALEXANDER craft lens for ..."
-   "slug": "construct-artisan",
- {
- }
```

### Bug #3 — Generic gen labels skill-pack repos as `framework`
**Steps**:
1. Take a doctrine pack repo (e.g., `construct-effect-substrate` at HEAD `a86ed3d`) — has `construct.yaml` `type: skill-pack`, has `0.2.0` in `version`, has `.claude/skills/` (because loa-framework is submoduled IN), zero application code.
2. Run `.claude/scripts/butterfreezone-gen.sh .` from the repo root.
3. Observe output frontmatter / module-map.

**Expected**: `type: skill-pack`, `version: 0.2.0`, `installation_mode` reflecting that loa is the submodule (not the parent), module map honoring skill-pack structure.
**Actual** (reporter-supplied):
- `type: framework` (line 660-661: `[[ -d .claude/skills ]] → type="framework"` — fires on skill-packs too, because they submodule loa in)
- `version: unknown` (line 677-684: never checks `construct.yaml::.version`)
- `installation_mode: submodule` (line 687-691: reads `.loa-version.json`, which here records that loa is submoduled IN, but the script semantics treat it as the current repo being submoduled into something else)
- `Built with Python, Shell` (overall-language stats include vendored loa scripts)
- `Module Map purposes garbled: Uconstraints, Uschemas, Uvectors` — see bug #3a below

### Bug #3a — BSD-sed portability: `\U` capitalize escape is GNU-only
**Steps**:
1. On macOS (Darwin / BSD sed), have a directory named `constraints/`, `schemas/`, or `vectors/` with no README, no convention-map hit, no dominant filetype hit.
2. `infer_module_purpose` falls through to strategy 4 at line 586: `sed 's/^./\U&/'`.

**Expected**: `Constraints`, `Schemas`, `Vectors` (capitalized first letter).
**Actual**: `Uconstraints`, `Uschemas`, `Uvectors` — BSD sed treats `\U` as the literal character `U` followed by `&` substitution.

**Verification**:
```sh
$ echo "constraints" | sed 's/^./\U&/'    # GNU sed → "Constraints"
$ echo "constraints" | sed 's/^./\U&/'    # BSD sed (macOS) → "Uconstraints"
```

### Bug #4 — Stale-detection date arithmetic broken on macOS (NOT a year-2026 quirk)
**Steps**:
1. On macOS (Darwin / BSD date), generate a `BUTTERFREEZONE.md` with `generated_at:` in standard ISO 8601.
2. Run `.claude/scripts/butterfreezone-validate.sh`.
3. Observe staleness warn.

**Expected**: `0 days old`.
**Actual** (reporter-supplied): `20590 days old`.

**Root cause** (line 474):
```bash
gen_epoch=$(date -d "$generated_at" +%s 2>/dev/null || echo 0)
```
`date -d` is **GNU date** syntax. On macOS BSD date, `-d` means "force DST" — not "parse string". The `2>/dev/null || echo 0` swallows the error and sets `gen_epoch=0`. Then `(now_epoch - 0) / 86400 = ~20590` for any current 2026 timestamp.

**Verified on this machine**:
```
$ uname -s
Darwin
$ date -d "2026-05-17T07:00:00Z" +%s 2>&1
date: illegal option -- d
$ echo $(( ($(date +%s) - 0) / 86400 ))
20590
```

This is a portability bug that has existed since the script was written; the reporter's "year-2026 quirk" hypothesis is incorrect. It would have reproduced on macOS in any year.

### Environment
- Loa framework: v1.167.3 (submodule pin in reporter's repo)
- Reporter's repo type: doctrine pack (`construct.yaml` `type: skill-pack`)
- Reporter date: 2026-05-17
- Reporter repro context: `construct-effect-substrate` at HEAD `a86ed3d`
- Target scripts: all four in `loa-constructs/.claude/scripts/butterfreezone-*.sh`
- Triage host: Darwin (macOS), bats v? (present), jq via anaconda, gh v? (authenticated), br v? (cargo bin)

## Analysis

### Suspected Files
| File | Line(s) | Confidence | Reason |
|------|---------|------------|--------|
| `.claude/scripts/butterfreezone-construct-gen.sh` | 12 (doc-comment), 162 (jq read) | high | Reporter cited exact lines; verified locally; both names point at the same defect (script-vs-schema drift on `compose_with`). |
| `.claude/scripts/butterfreezone-construct-gen.sh` | 162 (jq `-r '(.composes_with // [])[]'`) | high | Same line is also the object-vs-string rendering bug. Fix needs to do BOTH: rename + handle object form. |
| `.claude/scripts/butterfreezone-gen.sh` | 660-661 (type detection), 676-684 (version detection), 687-691 (install_mode), 586 (`\U` BSD-sed bug) | high | Four distinct sub-defects in this file, all observable from reporter's misrendered output. Type-detection is the keystone — once it routes skill-packs correctly (or refuses to handle them and defers to construct-gen), the rest of the wrong frontmatter becomes moot for skill-pack repos. |
| `.claude/scripts/butterfreezone-validate.sh` | 474 (`date -d` GNU-only) | high | Reproduced locally on Darwin; identical 20590-day output. Fix is portability shim (Python one-liner or detect `date -d` vs `date -j -f`). |
| Entry-point router (skill: `butterfreezone-gen` or `/butterfreezone` command) | unknown — needs lookup | medium | Ask #1 in the issue ("auto-detect construct repos and route to construct-gen") implies a router exists or needs to exist. Without inspecting it, can't say whether the routing logic lives in the skill SKILL.md, a wrapper script, or is just "call the right script by hand." `/build` discovery step. |
| `.claude/schemas/network/construct.schema.json` | `compose_with` definition | low | Read-only verification — schema is canonical and correct. NO change here. Listed only to lock in the source-of-truth direction. |

### Related Tests
| Test File | Coverage |
|-----------|----------|
| `tests/unit/butterfreezone-construct-gen.bats` | Existing coverage for per-pack generator. Needs new cases for `compose_with` (both name and object form). |
| `tests/unit/butterfreezone-gen.bats` | Existing coverage for generic generator. Needs new cases for skill-pack repo type detection + portability (Darwin `\U` and elsewhere). |
| `tests/unit/butterfreezone-validate.bats` | Existing coverage for validator. Needs a cross-platform freshness case (mock `now_epoch`, assert `gen_epoch` parses correctly on both GNU and BSD date). |

### Test Target
For each of the 4 bugs, write at least one failing bats test BEFORE editing the script. Each test must:
1. Stage a fixture pack directory under `tests/fixtures/butterfreezone/bug-244/<bug-N>/`
2. Run the target script via `run "$BATS_TEST_DIRNAME/../../.claude/scripts/butterfreezone-*.sh" <args>`
3. Assert on stdout, stderr, exit code, and the rendered markdown content
4. Mark the test as `skip` initially if it would block CI, but include the assertion that proves the bug exists

For bugs #3a and #4 (BSD-vs-GNU portability), the test MUST run cross-platform — use Python's `date -u +%s` or POSIX-compliant `python3 -c "from datetime import datetime; print(int(datetime.fromisoformat(...).timestamp()))"` for date parsing in the script under test, and verify both Darwin and Linux paths produce the same `gen_epoch` for a fixed input timestamp.

### Constraints
- **System Zone**: all four target scripts live in `.claude/scripts/`. Per `.claude/rules/zone-system.md`, this requires cycle-level authorization. The bug-fix sprint counts as that authorization once the PR carries the triage doc as the auth artifact.
- **No schema change**: `compose_with` is canonical and correct; the fix is in scripts only. The reporter's "accept both forms with deprecation warning" suggestion is rejected — no second name should be normalized.
- **Cross-platform parity**: must work on both macOS (Darwin / BSD coreutils) and Linux (GNU coreutils). Use either Python helpers (Loa already depends on Python) or POSIX-only shell constructs. No new bash dependencies.
- **Idempotency**: `butterfreezone-construct-gen.sh:18` declares "Idempotent: output byte-identical across re-runs modulo a single timestamp line." All fixes must preserve this. Any sort order change requires updating the doc-comment.
- **Backward compatibility with existing CONSTRUCT-README.md outputs**: skill-pack repos that were generated wrongly will regenerate to a different shape. The regeneration is the fix — no migration script needed, but reporter should be advised that one re-run of construct-gen on existing packs will normalize them.
- **No new application code outside `/implement`**: triage halts here; sprint authorization moves to `/implement`.

## Fix Strategy

**Single micro-sprint, four sub-tasks, test-first per bug.** Bug #1 is the keystone (renaming the field unlocks bug #2's fix; doing them as one edit avoids merge contention). Bug #3 has a sub-bug #3a that's portability-class identical to bug #4, so they can share a portability helper.

**Sub-task ordering** (low → high blast radius):
1. **Bug #4 + Bug #3a (portability shim)** — introduce a shared `_parse_iso8601_to_epoch()` bash helper that works on both BSD and GNU date (uses `python3` if available, falls back to `date -j -f` on BSD detection). Apply at `validate.sh:474` and at any other GNU-only `date -d` call site. Replace `sed 's/^./\U&/'` with a POSIX-portable form (e.g., `awk '{print toupper(substr($0,1,1)) substr($0,2)}'`). Tests: cross-platform freshness check; convention-map fallback on Darwin.
2. **Bug #1 + Bug #2 (compose_with rename + object rendering)** — at `butterfreezone-construct-gen.sh:12` correct the doc-comment from `composes_with` to `compose_with`. At line 162, change the jq filter from `(.composes_with // [])[]` to `(.compose_with // [])[] | if type == "string" then . else "\(.slug) — \(.relationship // "")" end`. Tests: fixture pack with object-form entries renders 3 bullets with slug and relationship; fixture with no `compose_with` renders `_None declared._`; fixture with the legacy/typo `composes_with` does NOT render (and validation, if extended, flags it).
3. **Bug #3 (skill-pack type detection)** — at `butterfreezone-gen.sh:660-661`, add a precedence check: if `construct.yaml` exists at repo root AND `yq -e '.type == "skill-pack"' construct.yaml >/dev/null`, then either (a) defer to `butterfreezone-construct-gen.sh` and exit, OR (b) populate frontmatter from `construct.yaml`'s declared `type`, `version`, and skip the `.loa-version.json`-based `installation_mode` inference. Choice (a) matches the reporter's Ask #1 ("auto-detect construct repos and route to construct-gen"); choice (b) leaves the generic generator usable for skill-packs but with correct frontmatter. **Pick (a)** — it eliminates the entire wrong-output class. Tests: skill-pack fixture invokes generic gen and the script exits 0 with output identical to construct-gen's output for the same fixture; non-skill-pack fixture still runs the generic path.
4. **(Stretch) Schema drift gate** — add a `construct-validate.sh` check that errors on `composes_with` (the typo) and points the author at `compose_with`. This is the reporter's secondary recommendation in bug #1 and is cheap once the script is correct. Defer if time-bound.

**Sequence rationale**: portability first (smallest blast-radius, fixes two bugs, unblocks Darwin-native development); field-name + object-rendering second (single line, two bugs, keystone for `compose_with` correctness); routing third (largest blast-radius, structurally changes which generator runs); schema drift gate fourth (optional polish).

### Fix Hints
Structured hints for multi-model handoff (each hint targets one file change):

| File | Action | Target | Constraint |
|------|--------|--------|------------|
| `.claude/scripts/butterfreezone-validate.sh` | refactor | `date -d "$generated_at" +%s` at line 474 → portable epoch helper | must work on both Darwin/BSD date and Linux/GNU date; no new bash deps |
| `.claude/scripts/butterfreezone-gen.sh` | refactor | `sed 's/^./\U&/'` at line 586 → `awk '{print toupper(substr($0,1,1)) substr($0,2)}'` | POSIX portable; preserve idempotent output |
| `.claude/scripts/butterfreezone-construct-gen.sh` | fix | line 12 doc-comment `composes_with` → `compose_with` | doc-only |
| `.claude/scripts/butterfreezone-construct-gen.sh` | fix | line 162 jq filter `.composes_with` → `.compose_with` and add `if type == "string" then . else "\(.slug) — \(.relationship // "")" end` | preserve `_None declared._` fallback when array empty; idempotent sort |
| `.claude/scripts/butterfreezone-gen.sh` | add | precedence check for `construct.yaml` `type: skill-pack` at top of `infer_project_metadata` (around line 640-674) | route to `butterfreezone-construct-gen.sh` and exit 0 if skill-pack; else continue existing path |
| `.claude/scripts/construct-validate.sh` | add (stretch) | error/warn if `construct.yaml` declares `composes_with` (the typo) | one-line jq check; point at canonical `compose_with`; deferable |

## Reporter Communication (drafted; not yet sent)
Two items to relay back to the issue thread before /implement starts:
1. **Field-name direction is inverted in your report.** Canonical schema is `compose_with` (no s); the script's doc-comment and the script body both diverge from the schema. The 15 construct.yaml files I sampled all use `compose_with`. The fix should be in the script, not in the constructs in the wild. Hold off on any `compose_with → composes_with` refactors.
2. **Bug #4 is platform, not calendar.** `date -d` is GNU-only; macOS BSD date fails the parse and falls back to `0`. Would have reproduced on macOS in any year. Not blocking on the fix — just clarifying so the runbook is right.

Use the smol-comms-register when posting the reply (visual-first, ≤10 lines, lead with the inverted-framing correction since it changes what the reporter does next).

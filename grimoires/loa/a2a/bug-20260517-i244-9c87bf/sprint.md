# Sprint Plan: Bug Fix — butterfreezone gen/validate (4 bugs + auto-detect routing)

**Type**: bugfix
**Bug ID**: 20260517-i244-9c87bf
**Source**: /bug (triage) — issue #244
**Sprint**: sprint-bug-144

---

## sprint-bug-144: butterfreezone gen/validate — 4 bugs + auto-detect routing

### Sprint Goal
Fix four defects in the butterfreezone script family and route skill-pack repos through `butterfreezone-construct-gen.sh` automatically, with failing bats tests proving each fix. Land a single corrective PR that updates all four scripts in lockstep, leaving the canonical `compose_with` schema untouched.

### Deliverables
- [ ] Failing bats tests reproducing each of the four bugs (added BEFORE any script edit)
- [ ] Source code fixes for `butterfreezone-construct-gen.sh`, `butterfreezone-gen.sh`, `butterfreezone-validate.sh` (and optional `construct-validate.sh` stretch)
- [ ] All existing bats tests in `tests/unit/butterfreezone-*.bats` pass (no regressions)
- [ ] Triage analysis document (already written: `grimoires/loa/a2a/bug-20260517-i244-9c87bf/triage.md`)
- [ ] Reporter reply drafted (covers inverted-framing correction + platform-not-calendar note for bug #4)

### Technical Tasks

#### Task 1: Write Failing Tests (test-first, all 4 bugs + routing) [G-5]
Create the following new bats cases — each must fail with current code on Darwin OR Linux:

- `tests/unit/butterfreezone-construct-gen.bats`:
  - `compose_with_object_form_renders_slug_and_relationship` — fixture with 3 object-form entries → output contains 3 bullets, each with slug + em-dash + relationship
  - `compose_with_field_name_canonical_is_read` — fixture using canonical `compose_with` → renders entries (proves bug #1)
  - `composes_with_legacy_typo_is_ignored` — fixture using the typo `composes_with` → renders `_None declared._` (proves the script does NOT silently honor the typo after the fix)
- `tests/unit/butterfreezone-gen.bats`:
  - `skill_pack_repo_routes_to_construct_gen` — fixture pack with `construct.yaml` `type: skill-pack` at repo root → generic gen detects, delegates to construct-gen, exit 0 with construct-gen output
  - `infer_module_purpose_capitalizes_on_bsd_sed` — fixture directory `constraints/` with no README → strategy-4 fallback returns `Constraints`, not `Uconstraints` (proves bug #3a portability)
- `tests/unit/butterfreezone-validate.bats`:
  - `freshness_parses_iso8601_on_darwin_and_linux` — fixed `generated_at: 2026-05-17T07:00:00Z`, mock `now_epoch` to be exactly 86400 seconds later → assert output reports `1 days old`, not `~20590` (proves bug #4 portability)

**Acceptance Criteria**:
- All 6 new tests fail with current code (verified by `bats tests/unit/butterfreezone-*.bats` showing the new tests in red and all preexisting tests in green)
- Test fixture directories live under `tests/fixtures/butterfreezone/bug-244/` and are self-contained (no network, no global state)
- Test names clearly describe the bug scenario (no `_test_1` placeholders)
- Tests are isolated (use `BATS_TEST_TMPDIR` for any mutable state)

#### Task 2: Implement Portability Fixes (bug #4 + bug #3a) [G-1, G-2]
**Files**: `.claude/scripts/butterfreezone-validate.sh`, `.claude/scripts/butterfreezone-gen.sh`

- Introduce a `_parse_iso8601_to_epoch()` helper (either in each script or in a new shared `lib/date-portability.sh` sourced by both). Implementation order of preference:
  1. `python3 -c "from datetime import datetime; import sys; print(int(datetime.fromisoformat(sys.argv[1].rstrip('Z').replace('Z','+00:00')).timestamp()))" "$ts"` (Loa already depends on Python)
  2. Detect `gdate` (GNU coreutils installed via brew) and use `gdate -d`
  3. Fall back to BSD `date -j -f "%Y-%m-%dT%H:%M:%SZ" "$ts" +%s` with format detection
- Replace `validate.sh:474` with the helper call.
- Replace `gen.sh:586` `sed 's/^./\U&/'` with `awk '{print toupper(substr($0,1,1)) substr($0,2)}'` (POSIX portable; works identically on GNU and BSD awk).
- Audit both scripts for any other GNU-only `date -d` or `sed \U`/`\L` calls and apply the same shims.

**Acceptance Criteria**:
- Tests 5 and 6 from Task 1 now pass on Darwin
- All preexisting `butterfreezone-validate.bats` and `butterfreezone-gen.bats` tests still pass
- A fresh `BUTTERFREEZONE.md` validates with `0 days old`, not `20590 days old`, on Darwin
- `infer_module_purpose` returns `Constraints` (capitalized) for a `constraints/` directory on both Darwin and Linux

#### Task 3: Implement compose_with rename + object rendering (bug #1 + bug #2) [G-1, G-2]
**File**: `.claude/scripts/butterfreezone-construct-gen.sh`

- Line 12 (doc-comment): change `composes_with` → `compose_with` (canonical).
- Line 162: change the jq filter to:
  ```
  jq -r '(.compose_with // [])[] | if type == "string" then . else "\(.slug)\(if .relationship then " — \(.relationship)" else "" end)" end'
  ```
- Verify the `_None declared._` fallback still fires when `.compose_with` is absent or empty.
- Verify idempotent output ordering (LC_ALL=C sort -u still applies).
- DO NOT add a `composes_with` alias path. The typo is rejected; bug #1 framing is reversed (see triage.md "Inverted-Framing Correction"). If reporter pushback arrives, surface the schema source-of-truth before adding any alias.

**Acceptance Criteria**:
- Tests 1, 2, 3 from Task 1 now pass
- A fixture pack with 3 object-form `compose_with` entries renders 3 bullets, each formatted `- slug — relationship` (em-dash continuation)
- A fixture pack with `composes_with` (the typo) renders `_None declared._` and emits NO error
- All preexisting `butterfreezone-construct-gen.bats` tests pass

#### Task 4: Implement skill-pack auto-routing (bug #3 + Ask #1) [G-1, G-2]
**File**: `.claude/scripts/butterfreezone-gen.sh`

At the top of `infer_project_metadata` (currently lines 640-674), add a precedence check:
```bash
if [[ -f "construct.yaml" ]] && command -v yq &>/dev/null; then
    if yq -e '.type == "skill-pack"' construct.yaml >/dev/null 2>&1; then
        # Skill-pack repo — defer to construct-gen
        log_info "Detected skill-pack repo; delegating to butterfreezone-construct-gen.sh"
        exec "$(dirname "$0")/butterfreezone-construct-gen.sh" "$@"
        # exec replaces current process — no return
    fi
fi
```

Notes:
- Use `exec` so the child process inherits stdin/stdout/exit code with no double-buffering.
- The check fires BEFORE any of the type/version/install_mode inference, so the wrong-output class for skill-packs is eliminated end-to-end.
- If `yq` is missing, fall through to the existing path (no behavior change for environments without yq).
- The `"$@"` forward preserves caller's flags (e.g., `--stdout`, `--dry-run`).

**Acceptance Criteria**:
- Test 4 from Task 1 now passes
- Running generic gen on a skill-pack fixture produces output byte-identical (modulo footer timestamp) to running construct-gen directly
- Running generic gen on a non-skill-pack repo (e.g., this `loa-constructs` repo itself, which has `.claude/skills/` but does NOT have `construct.yaml` `type: skill-pack` at root) still reports `type: framework` (preserved behavior)
- No regressions in `butterfreezone-gen.bats`

#### Task 5 (stretch): Schema drift gate in construct-validate.sh [G-1]
**File**: `.claude/scripts/construct-validate.sh`

Add a check that errors (or warns, per existing severity ladder) when `construct.yaml` contains a top-level `composes_with` key. Point the author at canonical `compose_with`. One-line jq:
```bash
if yq -e '.composes_with' construct.yaml >/dev/null 2>&1; then
    report_error "field-name" "Found 'composes_with' (typo). Canonical field is 'compose_with' (no trailing s). See construct.schema.json."
fi
```

**Acceptance Criteria**:
- A fixture `construct.yaml` with `composes_with:` triggers a validation error pointing at the canonical name
- A fixture with `compose_with:` (canonical) passes
- Existing construct-validate tests pass

**Defer if**: sprint time-bound. Tasks 1-4 are the must-land core; Task 5 is the prevention layer.

#### Task 6: Reporter communication
Draft a reply on issue #244 using `/smol` (smol-comms-register):
- Lead with the inverted-framing correction (compose_with IS canonical; the script drifted, not the schema)
- Note bug #4 is platform-not-calendar (macOS BSD `date -d` incompatibility)
- Link this sprint's PR once Task 4 lands
- DO NOT post until inverted-framing is verified one more time against `construct-base` repo schema (reporter named it as an alignment target — confirm `construct-base` matches `loa-constructs` schema canonical `compose_with`)

**Acceptance Criteria**:
- Reply is ≤10 lines prose
- Visual-first (a small markdown table showing schema vs script drift)
- Posted only after PR is up so reporter can review the fix in context

### Acceptance Criteria
- [ ] All 6 new bats tests pass (Tasks 1+2+3+4)
- [ ] Existing bats suite in `tests/unit/butterfreezone-*.bats` and `tests/unit/construct-validate*.bats` passes
- [ ] No regressions in CI bats matrix on both Darwin and Linux runners
- [ ] All four reported bugs no longer reproduce (verified by re-running the reporter's repro steps against the patched scripts)
- [ ] Fix addresses root causes (schema-vs-script drift; BSD-vs-GNU portability; routing precedence), not symptoms
- [ ] Triage analysis document committed alongside the PR
- [ ] Reporter reply drafted and queued (posting gated on PR landing)

### Risk Notes
- **System Zone authorization**: this sprint authorizes writes to `.claude/scripts/*.sh` per the bugfix exception path. The PR carries `triage.md` as the auth artifact. No `.claude/loa/CLAUDE.loa.md` edits are involved.
- **Cross-platform CI**: if Loa's CI does not currently run bats on Darwin, the portability tests will green-pass on Linux runners without exercising the BSD path. Recommend either adding a macOS runner OR a conditional `if [[ "$(uname -s)" == "Darwin" ]]` skip-comment on tests that specifically exercise BSD. Surface to operator if no Darwin runner exists.
- **Reporter pushback risk**: if reporter strongly prefers `composes_with` after seeing the schema, escalation path is to update both `construct.schema.json` AND every `construct.yaml` in the wild (15+ packs across the cache). NOT recommended; surface the cost first.
- **Other scripts may share the BSD-vs-GNU bug class**: a sweep of `.claude/scripts/*.sh` for `date -d` and `sed.*\\[UL]` is a small follow-up cycle (out of scope for this sprint; flag for next TEND sweep).

### Triage Reference
See: `grimoires/loa/a2a/bug-20260517-i244-9c87bf/triage.md`

# Agent-Ergonomics Scorecard — `constructs` (packages/constructs-cli)

> Rubric: **v1.0.0**, pinned in `rubric.lock` (sha256 `99fe3829…`). Every score > 700 cites
> evidence: `file:line` for source-defined behavior, or an invocation transcript.
> Pass: cycle `constructs-launcher-cli`, sprint-229 T3.10. Surface class: **agent-first CLI**.
>
> This binary was **born** under the rubric rather than retrofitted (PRD §7: "Ergonomics
> full-pass applies to the new binary only"), so the ≥5 substantive surface changes below are
> the ones this pass *found and applied* — not a from-zero uplift.

## Scores

| # | Dimension | Score | Evidence |
|---|-----------|-------|----------|
| 1 | agent_intuitiveness | 880 | Bare `constructs` prints triage-help + the 3 orienting commands and exits 0 — never a TUI (`bin/constructs.mjs` `main`, help path; vector `bare-invocation-is-triage-help-never-a-tui`). `atlas` is the one call that orients (`lib/contract.mjs` helpText "START HERE"). |
| 2 | agent_ergonomics | 850 | Every read verb takes `--json`; `--json` is the DEFAULT for non-TTY (`bin/constructs.mjs`: `wantJson = Boolean(flags.json) \|\| !isTTY`). Mega-command `atlas` returns zones+regions+loadouts+conflicts+health in one round-trip (`lib/territory.mjs:191`). |
| 3 | agent_ease_of_use | 820 | Public reads need no account; stationing is keyless by construction (`lib/contract.mjs` ENV_VARS: keys are network-registry writes only). `constructs robot-docs guide` is a paste-ready handbook, in-tool (`lib/contract.mjs` robotDocs). |
| 4 | output_parseability | 950 | Axiom 4 enforced mechanically: stdout is data, stderr is diagnostics — `bin/constructs.mjs` `out()`/`emitJson()` write stdout, `diag()`/`fail()` write stderr, and the exit-2 vectors assert stdout stays **empty** (`veve.json` vectors `caller-error-*`, expect_output_hash = the empty-string sha). Human tables and JSON serialize from ONE object. |
| 5 | error_pedagogy | 900 | `fail(exitCode, what, fix)` structurally requires the corrected command (`bin/constructs.mjs`); `StationError`/`InstallError` carry `.fix` and `.details` and the dispatcher renders both. Sample: `constructs station saaty --region loa-constructs` → "not in loa-constructs's loadout … try: add a loadout row for saaty to grimoires/territory.yaml, commit it on the default branch, then retry" (transcript, 2026-07-13). |
| 6 | intent_inference | 920 | Damerau-Levenshtein-1 + alias map; **read-only verbs auto-correct with a warning, mutation verbs REFUSE with the exact correction** (`bin/constructs.mjs` `inferVerb` + MUTATION_VERBS branch); ambiguity never guesses — two equal-distance candidates → exit 2 listing both. Vector: `mutation-typo-is-refused-not-inferred`. |
| 7 | safety_with_recovery | 900 | Every mutation has `--dry-run` and names it in the refusal (`lib/station.mjs` blockers → "or use --dry-run to preview"). Install: no archive parser, name containment + budgets, staging inside the packs parent + atomic rename, unmanaged dirs never overwritten (`lib/install.mjs` `landPack`), no +x. Overrides require `--reason` and land in the receipt. |
| 8 | determinism_and_reproducibility | 900 | `determinism: attestable` with DECLARED ambient (`veve.json`); 7 golden vectors re-executed twice and byte-diffed per run (`test/vectors/run-vectors.mjs`); `SOURCE_DATE_EPOCH` honored (`lib/station.mjs` `nowIso`); atlas output is sorted at every level (`lib/territory.mjs:235-267`). |
| 9 | self_documentation | 950 | `capabilities --json` and `robot-docs guide` are **generated from the verb table** — doc/dispatch drift is structurally impossible, and a contract test pins the identity (`test/contract.test.mjs`). Exit-code dictionary published in capabilities and asserted 1:1 against the vectors. |
| 10 | composability | 870 | argv-in / stdout-JSON-out; **no shell metacharacters required for any operation** (NFR-5); every subprocess goes through `execFile` + arg array (`lib/exec.mjs`) so composition never needs a shell. `--rung` pins a source for scripted decisions; exit 5 + `drift[]` lets a consumer automate on the code. |
| 11 | regression_resistance | 930 | 142 `node --test` cases + 7 byte-stable vectors, all gated in CI (`.github/workflows/ci.yml` job `constructs-cli`: vectors + units + zero-dep assert + p95 smoke). Every applied fix in this pass pins a named test (below). Red-team fixtures fail the build if containment regresses. |

**Weighted total (rubric v1.0.0 default weighting): 897 / 1000.**

## Substantive surface changes applied this pass (each pins a regression test)

1. **Boolean flags no longer swallow positionals** — `constructs station --dry-run saaty --region x` silently dropped the slug. `BOOLEAN_FLAGS` set added to `parseArgs` (`bin/constructs.mjs`). Test: "LOW-7: a boolean flag never swallows the following positional" (`test/station.test.mjs`) — an Axiom 0 defect: the first command an agent would naturally type failed.
2. **`atlas`/`where` hung for the full timeout after answering** (5.03s wall on a 0.03s answer) — a referenced deadline timer held the event loop open. Cleared in `finally` (`lib/territory.mjs`). Test: "HIGH-3: the bin answers and EXITS well under the default timeout" (`test/territory.test.mjs`). Dimension 2 + 12 (an agent that waits 5s per call is being taxed).
3. **Unreachable sources were silently swallowed** — `partial:false`, `failed_sources:[]`, no signal. `readManifest` now distinguishes absence (undeclared region) from failure (`lib/territory.mjs`). Tests: "HIGH-4: a nonexistent source lands in failed_sources with partial:true" + the EACCES case. Axiom 14 (never silent-fail).
4. **The atlas now states its own honesty** — `ratification: 'unchecked …'` names that loadout rows reflect the working tree, so a preview is never mistaken for a ratified stationing (`lib/territory.mjs` atlas payload). Test: "MEDIUM-6: the atlas says its ratification honesty out loud". Dimension 9.
5. **Stationing refuses on unverifiable authority instead of guessing** — an unfetched `origin/<default>` now fails closed rather than downgrading to "local-only" (`lib/station.mjs` `gitFacts`). Test: "PASS2-1: a configured origin with an unfetched default branch FAILS CLOSED". Dimension 7.
6. **Install override forensics** — `--allow-integrity-mismatch` requires `--reason` (≥8 chars) and the reason lands in the receipt; it bypasses the HASH check only and is powerless against STRIP-ATTACK (`lib/install.mjs`). Tests: the override + STRIP-ATTACK cases in `test/install.test.mjs`. Dimension 7 + 11.

## Where this surface is weakest (honest)

- **agent_ease_of_use (820)**: `observe` takes five required flags. It is the most verbose surface here; a future `--from-finding <file>` would collapse it.
- **agent_intuitiveness (880)**: `install --rung git` vs `--rung api` requires knowing rungs exist. `robot-docs guide` explains it; the flag alone does not teach it.
- **composability (870)**: no `--fields`/projection on `atlas`, so a consumer wanting one slice parses the whole map. `jq` covers it; a native projection would be cheaper.

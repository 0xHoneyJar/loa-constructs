# construct-clew — the construct distillation loop (capture → ledger → distill → ratify → PR → surface)

The trajectory → construct learning loop. **Phase 1, construct-ecosystem-local**
(SDD §10 Q2 A2): everything lives in `loa-constructs`; nothing is a base-Loa PR.

This sprint ships the **capture surface** and the **append-only ledger**. Distill
(Sprint 2) and Ratify/Propagate (Sprint 3) build on top.

## What's here

| File | Role |
|------|------|
| `learnings-construct.schema.json` | C8 — per-line ledger schema (`tier:const "construct"`, `target`, lifecycle fields). Standalone; no base-framework enum bump. |
| `ledger-append.sh` | C3 — `ledger_append <slug> <json>`: the **single** slug→path resolver, flock append, schema-validate. Exit `0` ok / `2` schema-invalid / `3` lock-timeout / `64` bad slug. |
| `loa-clew-capture.sh` | C1 — the `>>clew` capture hook (script). |
| `tests/*.bats` | 20 tests incl. the §3.5 byte-identity P0. |

## Capture (operator surface)

```
>>clew@<construct>: <why>            # target skill defaults to <construct>
>>clew@<construct>/<skill>: <why>    # explicit construct + skill
>>clew: <why>                        # NO construct → NOT captured (nudges you to add @slug)
```

Phase 1 requires an **explicit** `@<construct>` — there is no reliable
"which construct am I embodying" signal yet (PRD §5 load-bearing risk), so we do
not guess (FR-2: no silent wrong-ledger write). The classifier auto-trigger is
gated to Phase 2 behind a measured detection rate.

Captures are **silent** on the hot path (nothing to stdout) and append one
verbatim-preserving line to the construct's ledger, plus one trajectory record.

## Ledger

- Location: `~/.loa/constructs/packs/<slug>/LEARNINGS.jsonl` (external global store, SDD §10 Q1).
- Perms: file `0600`, dir `0700`. Operator-private; never leaves the machine in Sprint 1.
- **Sync-isolated**: `populate-global-store.sh` preserves `LEARNINGS.jsonl`(+`.lock`)
  byte-identically across its `rm -rf` re-populate (the §3.5 invariant; P0 test).

## ⚠ Deferred System-Zone step — register the hook

`ledger-append.sh` and `loa-clew-capture.sh` are native and live here. **Wiring the
hook into the runtime is the one System-Zone touch** and is intentionally NOT done by
this sprint (the `/implement` skill — and creative-latitude rules — forbid autonomous
`.claude/` edits). To activate capture, add this to `.claude/settings.json` under
`hooks.UserPromptSubmit`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [ { "type": "command", "command": "scripts/clew/loa-clew-capture.sh" } ] }
    ]
  }
}
```

Until registered, the hook is fully testable and invokable directly
(`scripts/clew/loa-clew-capture.sh '>>clew@artisan: ...'`) but does not fire on live prompts.

## Distill (Sprint 2 — `distill.sh`)

The cold-path reducer. Reads un-distilled ledger lines → clusters by `target.skill_slug`
→ runs the **generality** (FR-3) + **redaction** (FR-8) gates → fuzzy-matches `target.line_hint`
against the target `SKILL.md` → emits an **inert** `PROPOSAL.diff` + a **redacted** `RATIONALE.md`
to `grimoires/loa/skills-pending/<construct>-<skill>/` → stamps `distilled_at` idempotently.
It **never** applies an edit and **never** lets a verbatim operator quote leave the ledger.

```bash
scripts/clew/distill.sh run --construct <slug>            # Chronos gate: only if ≥5 un-distilled
scripts/clew/distill.sh run --construct <slug> --force    # manual: distill now
# unit surfaces (testable):
scripts/clew/distill.sh match <skill.md> "<line_hint>"    # MATCH n | AMBIGUOUS n,.. | NOMATCH
scripts/clew/distill.sh propose <skill.md> '<json>' <out> # gates + match + emit
```

- **Fuzzy match** is keyword-overlap on `line_hint`. ≥2 equally-good lines → `[CONTEXT-AMBIGUOUS]`
  (the proposal is a marker, not a hunk) — never guess-applies. The operator resolves at ratify.
- **Trigger (Chronos)**: manual `--force`, or `--min N` (default 5) un-distilled — never per-turn.
  The full L3 `scheduled-cycle-template` 5-phase wiring is **deferred** (over-engineered for Phase 1).

### ⚠ FR-8 redaction — and a real framework bug found en route

The verbatim operator `trigger` quote is **structurally excluded** from every export via an explicit
jq field allowlist (`{id,type,solution,target.skill_slug,tags}` MAY leave; `trigger`/operator context
MUST stay local). A re-run assertion confirms no trigger appears in any `RATIONALE.md`.

**`redact-export.sh`'s BLOCK rules silently no-op on macOS.** They use `grep -P` (Perl regex), and BSD
grep has no `-P`; the `2>/dev/null` swallows the error, so **every secret (ghp/AKIA/sk-/JWT/private-key)
passes the BLOCK gate with exit 0 on macOS.** Confirmed by running the script as a subprocess. We therefore
do **not** trust redact-export's exit code for secrets — `distill.sh` runs its own **BSD-safe `grep -E`**
secret check on the fields that leave (`_dist_has_secret`), and routes un-redactable secrets to
`distill_status=rejected_redaction`. (redact-export is still used for its working path/email REDACT.)
**This is a `0xHoneyJar/loa` framework security bug worth filing.**

## Deferred System-Zone registration (Sprint 2)

The distill **logic** is native (`scripts/clew/distill.sh`). Registering it as a `/distill-constructs`
command / `distilling-construct-learnings` skill is the deferred System-Zone step. If/when registered,
the SKILL.md frontmatter MUST declare write capability without a read-only agent type (per
`.claude/rules/skill-invariants.md`):

```yaml
capabilities:
  write_files: true
allowed-tools: [Write, Edit]
# agent: omitted (or general-purpose) — NEVER Plan/Explore
```

## Propagate + Ratify + Surface (Sprint 3 — `ratify.sh`, `propose-construct-learning.sh`, `surface.sh`)

The human-gated cross-repo half of the loop. A `PROPOSAL.diff` is **inert** until an operator ratifies it; ratification drafts a PR to the *targeted construct's own* canonical repo (never base-Loa). This is the **only** place construct-clew data crosses the machine boundary.

```bash
# RATIFY (Task 3.1, FR-4) — the force-chain gate. Inert until run.
scripts/clew/ratify.sh approve --construct artisan --skill inscribing-taste   # → draft PR (via C5)
scripts/clew/ratify.sh approve --construct artisan --skill inscribing-taste --dry-run
scripts/clew/ratify.sh reject  --construct artisan --skill inscribing-taste   # → .rejected; re-surfaces silently
scripts/clew/ratify.sh ignore  --construct artisan --skill inscribing-taste   # → no-op; re-surfaces ≤once/session

# PROPAGATE (C5/C6, FR-5/FR-6) — archived guard FIRST, then auth pre-flight, then PR.
scripts/clew/propose-construct-learning.sh --construct artisan --skill inscribing-taste            # draft PR
scripts/clew/propose-construct-learning.sh --construct artisan --skill inscribing-taste --dry-run  # resolve+preflight only

# SURFACE (C7, FR-7) — degrade-to-silence readers.
scripts/clew/surface.sh pending   # L6 handoff: "N proposals pending" + uninstall flags (≤once/session)
scripts/clew/surface.sh landed    # SessionStart line: "N corrections drafted (PR in flight)"
scripts/clew/surface.sh flags     # the FR-6 uninstall-flag reader (consumes the archived-guard flag)
```

**Order is non-bypassable (SDD §5.3):** resolve canonical from `construct.yaml::repository.url` → **C6 archived guard** (`gh repo view --json isArchived`; archived → SKIP, write `distill_status=skipped_archived`, emit uninstall flag, PROMPT operator, exit 0) → **C5 auth pre-flight** (`gh auth status`; not authed / 403 → exit 4 *before* any side effect) → assemble PR body from the already-redacted `RATIONALE.md` + inert `PROPOSAL.diff` (field allowlist — the verbatim `trigger` quote is never read here) → **draft a REAL branch-based PR**.

**The PR is a real branch, not a body-only `gh pr create`** (DISS-001): clone the canonical to a temp worktree → locate `skills/<skill>/SKILL.md` → `patch`-apply `PROPOSAL.diff` → commit on `clew/<skill>-<diff-hash>` → push → `gh pr create --repo <canonical> --head <branch> --base <default> --draft`. A `[CONTEXT-AMBIGUOUS]` proposal (no resolvable hunk) is **refused**, never pushed. **Phase-1 scope:** assumes push access to the canonical (true for the `0xHoneyJar` org — every construct canonical). Fork-based PRs for third-party constructs are a documented **Phase-2** extension.

- **Force chain (NFR):** no path applies a `PROPOSAL.diff` to an *installed/local* skill or sets `verified:true`. The diff only reaches a canonical via a reviewable draft PR (CODEOWNERS merge gate). `ratify.sh approve` is the only route to a PR.
- **Idempotent boundary crossing (DISS-002):** on a successful PR a proposal-local `<dir>/.drafted` (PR url + ids + diff-hash) is written; re-running `propose`/`approve` prints `ALREADY_DRAFTED` and drafts **no** second PR; `surface pending` stops listing it.
- **Content-specific rejection (DISS-003):** `ratify.sh reject` stores the rejected `PROPOSAL.diff` hash in `<dir>/.rejected`; `approve`/`surface` honor it **only while the diff is unchanged**. A re-distilled (different-hash) proposal for the same construct/skill resurfaces normally — a rejection never buries future corrections.
- **gh + git are injectable** via `LOA_CLEW_GH` / `LOA_CLEW_GIT` (tests point them at stubs that log every call — "no PR against an archived repo", "real branch pushed", "no second PR" are all asserted on the call logs).
- **Side-files co-locate with the pending dir:** `<pending>/.clew-uninstall-flags.jsonl` (FR-6 flag, read by `surface.sh flags`) and `<pending>/.clew-drafted.jsonl` (C7 "in flight" log). Override via `LOA_CLEW_FLAGS_FILE` / `LOA_CLEW_DRAFTED_LOG`.

### ⚠ Live finding — `observer` canonical is ARCHIVED (renamed `construct-beehive`)

The SDD named `observer` as a live PR-path pilot. Live `gh` check (2026-05-31): `construct-observer` **redirects to `construct-beehive` and `isArchived:true`**. So the C6 guard correctly SKIPs it — observer is now a *real* archived-case, not a live target. **The live pilot is `artisan`** (`construct-artisan`, `isArchived:false`), proven via the genuine capture→distill→propose `--dry-run` chain. `smol-comms-register` (the worked-example target) has **no canonical repo** on GitHub — it is golden-diff-only, never PR'd.

## Deferred System-Zone registration (Sprint 3)

The propagate/ratify/surface **logic** is native (`scripts/clew/*.sh`). Two System-Zone touches remain deferred (consistent with this repo's native-clew practice — Sprint 1's hook + Sprint 2's distill skill are likewise documented-but-unregistered):

1. **`/skill-audit --approve <construct>-<skill>`** — extend `.claude/commands/skill-audit.md` to parse `<construct>-<skill>` and shell out to `scripts/clew/ratify.sh approve --construct … --skill …`. The native helper uses explicit `--construct`/`--skill` flags to avoid the hyphen-split ambiguity (`a-b-c` could be construct `a` + skill `b-c` or construct `a-b` + skill `c`); the command layer owns the parse.
2. **SessionStart hook** — register `scripts/clew/surface.sh landed` (and a session-end `surface.sh pending`) under `.claude/settings.json` `hooks.SessionStart` so corrections-landed / proposals-pending surface automatically. Until registered, both are invokable directly and fully tested.

## Tests

```bash
bats scripts/clew/tests/          # 59 tests: Sprint 1 (capture+ledger) + Sprint 2 (distill+gates) + Sprint 3 (propagate+ratify+surface)
```

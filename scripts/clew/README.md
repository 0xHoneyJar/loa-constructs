# construct-clew — Sprint 1 (Capture + Ledger)

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

## Tests

```bash
bats scripts/clew/tests/
```

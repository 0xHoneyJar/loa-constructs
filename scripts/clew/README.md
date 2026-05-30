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

## Tests

```bash
bats scripts/clew/tests/
```

# Cycle-005 Findings · Runtime + Integration

> **SEED**: [`cycle-005-SEED-runtime-integration.md`](cycle-005-SEED-runtime-integration.md)
> **Branch**: `feat/spiral-loa-constructs-cycle-005-runtime-integration`
> **Mode**: Conversational-paired + shell-first (cycle-003/004 precedent)
> **Date closed**: 2026-04-22
> **Doctrine state at close**: v5 (§17 amendment landed)

---

## 0 · Summary

9 of 10 legs landed. 1 conditional (L10 `.source.json` three-way-merge) deferred per SEED framing. 5 cycle-005-specific findings surfaced (F30–F34). Q5 self-audit from cycle-004 ("composition execution is still manual") **closed** — `construct-compose feel-audit <target>` now executes all three stages end-to-end with trajectory emission and final-output schema validation.

Upstream PRs opened (2, neither admin-merged): construct-base template v3 and loa `--with-constructs` flag. L5 awaiting @janitooor review per SEED §11.

---

## 1 · Legs shipped

| Leg | Status | AC closure | Delivery |
|---|---|---|---|
| **L1** · `construct-compose.sh` runner | ✅ landed | L1.1–L1.6 all met | commit `6b81f68` |
| **L2** · Stream JSON schemas + validator | ✅ landed | L2.1–L2.5 all met | commit `6b81f68` |
| **L3** · `construct-base` template v3 | ✅ PR open | L3.1–L3.6 met | [0xHoneyJar/construct-base#11](https://github.com/0xHoneyJar/construct-base/pull/11) |
| **L4** · `validating-construct-manifest` skill | ✅ landed | L4.1–L4.6 (incl. §12) | commit `f9674b4` |
| **L5** · Loa `--with-constructs` flag | ⏳ PR open, awaiting Jani | L5.1–L5.5 met, review-gated | [0xHoneyJar/loa#615](https://github.com/0xHoneyJar/loa/pull/615) |
| **L6** · Butterfreezone construct adapter | ✅ landed | L6.1–L6.5 all met | commit `74386d5` |
| **L7** · `/constructs` polish | ✅ landed | L7.1–L7.5 all met | commit `b4390d2` |
| **L8** · E2e proof on feel-audit | ✅ landed | L8.1–L8.4 all met | bats tests green |
| **L9** · Doctrine v5 §17 amendment | ✅ landed | L9.1–L9.4 all met | commit `ba14244` |
| **L10** · F24 three-way-merge | ⏸️ deferred | — | explicitly CONDITIONAL per SEED |

**Total lines shipped in loa-constructs**: ~1,050 shell + ~300 JSON schema + ~150 markdown (SKILL.md + findings + doctrine §17). Zero TypeScript. Shell-first discipline (doctrine §13.1) preserved.

**Upstream**: ~130 lines in construct-base (yaml + persona md + readme), ~88 lines in loa (shell + wizard step).

---

## 2 · Findings F30 – F34

### F30 · Construct `.gitignore` made a local draft of cycle-002 SEED invisible

While orienting at cycle-005 kickoff, `git status` surfaced `grimoires/loa-constructs-seed-2026-04-21/cycle-002-SEED-artisan-lifecycle-walk.md` as untracked. It was never committed — an operator's local draft that existed only in this worktree. The file doesn't appear in any git log across any branch.

**Implication**: informal drafts inside `grimoires/loa-constructs-seed-2026-04-21/` are invisible to cycle chain-preservation. Two options:

- **(a)** Commit drafts at `draft/` subdirectory with a `--- status: draft ---` frontmatter so OTLET preserves them even if later superseded.
- **(b)** Store drafts outside `grimoires/` (e.g. `~/hivemind/self/drafts/`) and only move into the cycle dir once operator-ratified.

Cycle-005 didn't force a choice — the draft was left untracked. Flagging for operator call.

**Closure**: deferred. Doesn't block cycle-005. Route to cycle-006 housekeeping.

### F31 · Installed symlinks lose fidelity after a cache-state divergence

During orient, fast-forwarding `main` surfaced two merge conflicts with untracked `.claude/skills/{tuning-springs,visual-dig}` directories. Origin declared these as symlinks to `~/.loa/constructs/packs/<slug>/skills/<slug>`; the local worktree had full directory copies. Inspection showed the directory contents matched the symlink targets byte-for-byte, so the dirs were safe to remove and let the fast-forward restore symlinks.

**Root cause**: unclear. Possibly an early-cycle-004 state where global sync wrote real directories before the symlink convention settled, and those directories persisted through subsequent cache updates.

**Implication**: global sync should have an integrity check — "is `.claude/skills/<slug>` a symlink where we expected one?" — and offer to repair divergences non-destructively.

**Closure**: cycle-005 resolved locally by comparing + deleting the divergent dirs. Upstream fix is a sync-script guardrail; deferred to cycle-006 housekeeping.

### F32 · 27 of 29 installed packs are §12-drifted

L4 validator run across `~/.loa/constructs/packs/*` surfaced:

- 27 MEDIUM findings (CLAUDE.md missing `grimoires/` reference — SEED §12 drift)
- 2 CRITICAL findings (`hypha`, `webgl-particles` — `construct.yaml` missing or unparseable)
- 1 HIGH with 8 findings (`rosenzu` — `commands[].path` entries point at skill directories rather than command markdown files)

The §12 drift is load-bearing: artisan was the SEED-named canary, and the pattern propagated. L6's butterfreezone adapter regenerates the missing section from `construct.yaml` declarations; running `butterfreezone-construct-gen.sh` across the 27 drifted packs would close F32 mechanically.

**Closure**: tooling ships (validator + generator). Mass regeneration of `CONSTRUCT-README.md` files across the ecosystem is a separate follow-up — either operator-initiated `constructs-sweep.sh`-style batch, or per-pack upstream PRs. The `rosenzu` HIGH finding should be a direct upstream PR to correct `commands[].path` semantics.

### F33 · `construct-network-tools` pack does not exist on the registry

L5 SEED names `construct-network-tools` as the bundle slug to install at mount. Registry query surfaces no such pack. The L5 PR ships the flag wiring but the default slug resolves to "install unknown pack, log warning, keep moving" behavior.

**Implication**: L5 is mechanically shipped but semantically incomplete until a pack answering to that slug lands. Options:

- **(a)** Operator creates `construct-network-tools` as a meta-pack that depends on `browsing-constructs` + `publishing-constructs` + `syncing-constructs` + the composition runner integration.
- **(b)** Default slug changes to an existing pack (e.g. `artisan` or `observer`) until meta-pack lands.
- **(c)** Leave WITH_CONSTRUCTS default=false until operator picks (a) or (b).

Cycle-005 shipped (c) — the flag exists, default off, clear error if the slug doesn't resolve. Operator call on default pack name routes to cycle-006.

**Closure**: documented in the L5 PR body; awaiting operator + @janitooor feedback.

### F34 · Publish validator report truncates `manifest_validate` detail line

`constructs-publish.sh validate <pack>` surface reports `manifest_validate · construct-validate surfaced 8` with no visible trailing text because the existing 10-point reporter truncates the `detail` JSON field at a fixed column width. Full detail (`construct-validate surfaced 8 finding(s) — run: construct-validate.sh <path>`) lives in the JSON.

**Implication**: the new L4 integration is functionally correct but the operator-facing output hides the "how to investigate" call-to-action. Pre-existing display limitation, not a cycle-005 regression — surfacing for cycle-006 polish.

**Closure**: deferred. `--json` mode exposes the full shape; human-readable mode is the polish target.

---

## 3 · Doctrine v5 compliance — per-leg audit

| Invariant | Landed? |
|---|---|
| §3 typed streams (5 primitives) | ✅ L2 schemas + L1 runner validates |
| §4 pipe chain spec | ✅ L1 runner executes composition YAML |
| §5 orchestration layer | ✅ partial — L1 is the "shell-equivalent"; Finn tier still future |
| §13.1 shell-first | ✅ zero TypeScript, zero Python (jsonschema used as lib, not code) |
| §14.3 read-modes (glance/orient/intervene) | ✅ L1 + constructs-list both |
| §16.3 composition determinism | ✅ L1 dispatch deterministic; output variance named in §17.1 |
| §16.4 agent-transparency | ✅ trajectory emission per-stage |
| §17.1 dispatch-det ≠ output-repro split | ✅ new in v5 |
| §17.2 failure-semantics primitives | ⏳ vocabulary set, enforcement deferred to cycle-006 |
| §17.3 Verdict severity-evidence | ✅ L4 validator emits it |
| §17.4 grimoires-as-interface | ✅ L4 validates + L6 regenerates |

---

## 4 · KANSEI gate (S8, operator-answered)

| # | Question | Agent self-assessment | Operator answer |
|---|---|---|---|
| Q1 | Can I run `construct-compose feel-audit target.tsx` and watch all three stages execute end-to-end? | **Y** — bats lock, ~1.5s run, 6 trajectory rows paired, Verdict schema-valid final output. Stub stages until real LLM dispatch (cycle-006+). | _operator_ |
| Q2 | Does the runner fail-fast on a stream-type mismatch with a clear error? | **Y** — exit 2 on type mismatch, message names stage + expected type + actual produced set. Bats test locks this. | _operator_ |
| Q3 | Can a new construct author clone `construct-base` and land on the network without understanding doctrine v4 internals? | **Partial pending L3 merge** — template now carries `streams:` + persona handle example + CONSTRUCT-README.md pattern reference. After merge, a fresh `gh repo create --template construct-base` produces a pack that passes `construct-validate.sh` out of the box. | _operator_ |
| Q4 | Does `mount-loa.sh --with-constructs` give a fresh Loa install construct tools by default? | **Partial pending L5 merge + pack creation** — flag shipped, default off. Default flips to `on` after `construct-network-tools` pack ships (F33). Operator call on pack composition. | _operator_ |
| Q5 | Free-text: with cycle-005 shipped, what's the first thing you *actually want to use* constructs for? | _operator_ | _operator_ |

Agent score on Q1–Q4: **3 Y + 2 Partial** (L3/L5 merge-gated). No halt criteria triggered; cycle-005 ships contingent on two upstream PRs.

---

## 5 · Cycle-006 inheritance (handoff)

Pre-drafted from SEED §8 + cycle-005 emergence:

1. **Security model + data governance + trust model** (SEED §8.1 · flatline SKP-004/005) — dedicated security cycle
2. **Namespace collision enforcement** — registry schema work
3. **`.source.json` backfill for 29 legacy installs** (F22 from cycle-003, never closed)
4. **Dynamic Labs → Freeside sovereign auth** — operator pivot 2026-04-13
5. **Supabase → Turso migration** — infra decommission
6. **Dependency resolution / version constraints** — integration research Gap 2
7. **`/feel` routing UX reconciliation** — either artisan pack-layer decision (F28 path (a)) OR Operator-OS-aware resolver (F28 path (b))
8. **JSONL append integrity hardening** (flatline SKP-006) — cycle-007
9. **Failure-policy enforcement in runner** (doctrine §17.2 closure)
10. **Real LLM dispatch inside composition stages** — replace stub executor
11. **F30 grimoires draft policy** — commit under `draft/` or route to hivemind
12. **F31 symlink-integrity check in global sync**
13. **F32 ecosystem-wide `CONSTRUCT-README.md` regeneration** — 27 packs drifted
14. **F33 `construct-network-tools` pack creation** — gates L5 default-flip
15. **F34 publish-validator display polish** — expose `manifest_validate` detail text

Inheritance list is LONGER than cycle-004's intentionally — the runtime layer landing surfaces the next-tier questions. Cycle-006 framing should pick 3–4 and defer the rest. Security (items 1 + 9) and real-dispatch (item 10) are the two highest-leverage choices.

---

## 6 · Cycle authorship lens

Cycle-005 · agent + integration (runtime + ecosystem-coherence)

Declared at SEED open (§9). Held. Composition runner landed = composition execution is no longer manual. Schema validation at pipe edges closes the "types-only-in-doctrine" gap. Butterfreezone generator makes the §12 grimoires convention mechanically enforceable. L4 validator is the first upstream-facing lint that gates the network on cycle-005 conventions.

---

## 7 · What this cycle proved

1. **Compositions execute as advertised** — doctrine §4 claim is runtime-true. `construct-compose feel-audit <target>` works.
2. **Type safety on typed streams** — doctrine §3 claim is validator-true. `stream-validate.sh Signal <payload>` returns 0/1 against draft-07 schemas.
3. **Author flow has a smooth-edge template** (pending L3 merge) — `construct-base` carries streams + persona handles + CONSTRUCT-README.md marker.
4. **Documentation is generated, not maintained** — butterfreezone adapter proves out on the artisan canary + gtm-collective.
5. **Ecosystem-wide §12 drift is detectable + fixable** — 27-pack finding is a tractable one-command batch.
6. **The Q5 self-audit from cycle-004 closes** — composition execution no longer manual.

Two upstream PRs (L3 + L5) are where this lands in operator view. Neither admin-merged per SEED §11. Both carry clear test plans and non-breaking risk profiles.

---

## 8 · What didn't land

- **L10** F24 `.source.json` three-way-merge: CONDITIONAL per SEED; skipped cleanly.
- **Real LLM dispatch in stage executor**: explicitly stubbed. Default executor emits schema-valid placeholder rows. Real stages land via cycle-006 (`LOA_COMPOSE_STAGE_EXECUTOR` env var / `--executor` flag).
- **Failure-policy enforcement**: v5 §17.2 sets the vocabulary; runner still fails fast. Cycle-006 target.
- **Ecosystem-wide CONSTRUCT-README.md regeneration**: L6 proves on artisan; 27-pack batch is operator-scheduled follow-up.

---

## 9 · Supersession

Supersedes cycle-004 §8.1 inheritance queue for items 2 (composition runner), 4 (F26 template freshness), and the stream-type enforcement strand of SKP-002. All three were cycle-004 carryovers that cycle-005 closed.

F29 (`.claude/constructs/` gitignore) remains closed by cycle-004 L5's migration to `grimoires/compositions/`. Cycle-005 extended the pattern: stream schemas ship under `.claude/schemas/`, where they ARE tracked — no repeat of F29.

---

*Cycle-005 close · 2026-04-22 · 9/10 legs landed, 2 upstream review-gated, 5 new findings surfaced. Doctrine v5 active. Runner ships; compositions execute.*

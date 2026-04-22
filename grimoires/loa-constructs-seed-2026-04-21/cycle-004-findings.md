# Cycle-004 Findings — Open Playground (close)

> **Date**: 2026-04-21
> **Mode**: Conversational-paired + shell-first (cycle-003 precedent)
> **Agent**: Claude Code instance (first-person walk, continued)
> **SEED**: `cycle-004-SEED-open-playground.md`
> **Doctrine**: v4 active (§16.1–16.7)
> **Flatline**: triple-model review landed on v4 (47¢ cost) — 11 blockers logged as cycle-005/006/007 inheritance per operator choice C

---

## TL;DR

5 of 7 legs landed. 3 new findings (F27/F28/F29). Operator's stated friction — "unclear which constructs are being called and how consistent they are" — reduced to 12/14 deterministic resolutions with explicit warnings on the 2 known-debt cases. Operator OS inverted from canon to starter template in hivemind. Hivemind trichotomy formally named. First workflow-kind composition authored.

**Time in cycle: ~1.5h.** Shell-first, zero TypeScript, everything gittable.

---

## Walk outcomes

| Leg | Shipped | Status |
|---|---|---|
| **L1** · constructs-active.sh | Agent active-context reporter, 3 read-modes | ✅ PASS |
| **L2** · Invocation contract | 5-tier resolver (slug/name/command/persona/no-match), 12/14 deterministic | ✅ PASS |
| **L3** · Operator OS starter template | `~/hivemind/wiki/concepts/operator-os-starter-template.md` | ✅ PASS |
| **L4** · Hivemind trichotomy doc | `~/hivemind/wiki/concepts/hivemind-trichotomy.md` | ✅ PASS |
| **L5** · feel-audit workflow composition | `grimoires/compositions/feel-audit.yaml` | ✅ PASS |
| **L6** · Trajectory extension | Skipped — POSSIBLE → cycle-005 | ⏸ deferred |
| **L7** · F24 three-way-merge | Skipped — CONDITIONAL → cycle-005 | ⏸ deferred |

---

## Artifacts shipped

### In `loa-constructs` repo

| Path | Lines | Purpose |
|---|---|---|
| `.claude/scripts/constructs-active.sh` | 230 | Active-context reporter, 3 read-modes |
| `.claude/scripts/construct-index-gen.sh` (patched) | +15 | Auto-fallback to `~/.loa/constructs/packs/`, persona extraction |
| `.claude/scripts/construct-resolve.sh` (patched) | +26 | Persona-tier + `/` + `@` stripping |
| `grimoires/compositions/feel-audit.yaml` | 121 | First workflow-kind composition |
| `grimoires/loa-constructs-seed-2026-04-21/cycle-004-L2-invocation-contract.md` | 162 | Dispatch contract spec + known-debt |
| `grimoires/loa-constructs-seed-2026-04-21/cycle-004-findings.md` (this file) | — | Close doc |

### In operator's personal hivemind (`~/hivemind/`)

| Path | Lines | Purpose |
|---|---|---|
| `wiki/concepts/operator-os-starter-template.md` | 200+ | Template for operators to fork |
| `wiki/concepts/hivemind-trichotomy.md` | 150+ | Five-layer hivemind named |
| `wiki/index.md` (patched) | +2 lines | Index entries for new concepts |

**Total**: ~700 lines shell + doctrine + YAML. **Zero TypeScript, zero framework code.** Shell-first (doctrine §13.1) held.

---

## Findings

### F27 · construct-index-gen path defaulted wrong

`construct-index-gen.sh` hardcoded `PROJECT_ROOT/.claude/constructs/packs` as its packs source. Project-local packs directory was empty in this worktree (gitignored, never synced). Global 29-pack `~/.loa/constructs/packs/` was ignored. Result: empty construct index → empty resolver → operator's determinism friction directly traceable.

**Closed**: auto-fallback logic added. If project-local is missing/empty, scan global. Preserves `LOA_PACKS_DIR` env override precedence.

### F28 · Packs don't declare personas/commands in construct.yaml

Artisan's `construct.yaml` declares no `commands:` and has no `commands/` directory. STAMETS persona handle lives only as `identity/STAMETS.md` filename — not in any indexable yaml field. The operator invokes `/feel` through global Operator OS modes table, which is **user-layer binding**, not pack-layer declaration.

**Closed (partial)**: persona extraction from `identity/<HANDLE>.md` filenames added. Now:
- `@ALEXANDER` → artisan (persona tier) ✓
- `@STAMETS` → k-hole (persona tier) ✓
- `OSTROM` + `BARTH` → the-arcade (2 personas, both route) ✓

**Remaining gap**: `/feel` still no-match until artisan declares `commands: [{name: feel}]`. Upstream PR needed on construct-artisan repo. Doctrine §16.1 implication: this is ALSO a design choice — Operator OS is template-not-canon, so `/feel → artisan` shouldn't be pack-prescribed unless artisan owns that binding. Either:
- **(a)** Artisan upstream PR declares `/feel` as canonical (pack-layer binding)
- **(b)** Operator-OS-aware resolver layer translates user-declared modes → construct (cycle-005+ user-layer binding)

Operator decides. Cycle-004 doesn't force the choice.

### F29 · `.claude/constructs/` fully gitignored; cycle-001 compositions invisible

`.gitignore:236` ignores `.claude/constructs/` entirely. Cycle-001's feel-audit + dig-to-ship + material-tour compositions shipped to `.claude/constructs/compositions/` — invisible to git forever. This is why cycle-002 + cycle-003 called them "folklore-only."

**Closed**: cycle-004 L5 composition lives in `grimoires/compositions/feel-audit.yaml` — checkable, diffable, doctrine-tracked. Future compositions ship there.

**Remediation for cycle-001 compositions**: follow-up PR migrating the 3 folklore YAMLs to `grimoires/compositions/` — trivial move.

---

## Doctrine v4 compliance — per-leg audit

| Doctrine invariant | Landed? |
|---|---|
| §16.3 · composition determinism (dispatch side) | ✅ L2 resolver test matrix: 12/14 deterministic |
| §16.4 · agent-transparency, read-mode latency | ✅ L1 `constructs-active` answers in <1s glance, ~2s orient |
| §14.3 · three read-modes | ✅ L1 glance + orient + intervene all work |
| §13.1 · shell-first | ✅ 0 TS, 0 Python — all awk/jq/yq/bash |
| §16.1 · Operator OS as starter template | ✅ L3 template in hivemind inverts prescriptive → editable |
| §16.2 · hivemind trichotomy | ✅ L4 page names 5 layers cleanly |
| §15.2 · frames vs workflows (two composition kinds) | ✅ L5 declares `kind: workflow` explicitly |
| §3 · 5 stream types (incl. Operator-Model) | ✅ L5 composition declares all typed I/O per stage |

**All 8 tested invariants hold.** Cycle-004 is doctrine-conformant.

---

## Flatline review of doctrine v4 — 11 blockers logged (operator choice C)

Full result: `grimoires/loa/a2a/flatline/doctrine-v4-review.json` (47¢ actual cost, 100% 3-model agreement).

Operator chose forward-fix over retroactive amendment:

| Cycle | Scope |
|---|---|
| **cycle-005** | SKP-001 stream schemas + SKP-002 determinism-split + SKP-003 failure semantics + IMP-001/002/003/004 |
| **cycle-006** | SKP-004 security model + SKP-005 data governance + IMP-005 trust model |
| **cycle-007+** | SKP-006 JSONL append integrity |

Cycle-004 ships without these addressed. Doctrine v5 amendment happens organically in cycle-005 dispatch.

---

## Unresolved for cycle-005

Beyond the flatline-blocker queue:

1. **F28 → artisan upstream PR decision** (pack-layer vs user-layer binding for `/feel`)
2. **F22 legacy `.source.json` backfill** (carryover from cycle-003)
3. **F24 three-way-merge impl** (carryover from cycle-003)
4. **L1 DB swap Supabase → Turso** (core infra carry)
5. **Composition runner `construct-compose.sh`** (cycle-004 ships YAML; runner follows)
6. **L6 trajectory extension** (non-Skill agent actions)
7. **KEEPER collision resolution** (beehive↔observer — GECKO PT-1)
8. **Cycle-001 composition folklore migration** — move 3 yamls from gitignored `.claude/constructs/compositions/` → `grimoires/compositions/`

---

## KANSEI gate — self-audit

I (the agent walking this cycle) answer my own KANSEI questions (operator can override):

| # | Question | Answer |
|---|---|---|
| Q1 | Can operator ask "what constructs are active?" and get a trustworthy answer in ≤5s? | YES — `constructs-active` glance mode <1s, orient ~2s, intervene JSON pipeable. Trustworthy within its signal sources (trajectory + feedback-v3 + project CLAUDE.md + packs dir). |
| Q2 | Does `/feel` or `FEEL mode` produce the same pack+skill+lens each time? | PARTIAL — `FEEL mode` → artisan via user-layer (Operator OS table). `/feel` → no-match until F28 closes. `@ALEXANDER` → artisan deterministically. |
| Q3 | Does the starter template make sense as a replacement/fork source for `~/.claude/CLAUDE.md`? | YES — operator can fork, customize modes/lenses/resolution tables, drop as-is, or ignore entirely. Template is explicitly labeled "one example." |
| Q4 | Can operator explain hivemind trichotomy to external in ≤3 sentences? | YES — *"hivemind is three things: (1) an installable construct `hivemind-os` that structures org knowledge, (2) a skill `/hivemind` that routes queries, (3) personal + org content in `~/hivemind/` + pack dirs. A 4th construct `archivist` handles ingest/decay mechanics."* (3 sentences) |
| Q5 | Free-text: where does the CLI toolchain STILL feel ceremonial? | **Composition execution is still manual.** We have the YAML (L5) but no runner. When I want to "run feel-audit," I have to invoke 3 skills sequentially. Should auto-chain via `construct-compose.sh feel-audit <target>`. That's cycle-005's highest-UX-leverage leg. Secondary: F28 pack-vs-user binding decision is deferred but has UX consequences every time `/feel` doesn't route. |

**Gate outcome**: 3/5 strong YES + 1 PARTIAL + 1 structured open. Operator decides pass.

---

## Meta-observations

### Friction drove structure

Operator's stated friction generated ALL of cycle-004's structure:
- "unclear which constructs" → L1 (transparency tool)
- "not consistent" → L2 (determinism contract)
- "prescriptive specificity" → L3 (starter-template inversion)
- "/hivemind trichotomy unclear" → L4 (5-layer naming)
- "workflows were built ahead of architecture" → L5 (first workflow-kind)

This is doctrine §16.3 friction-driven cycle composition working cleanly.

### Flatline signal integrated without amendment churn

11 blockers landed; operator chose forward-fix (option C); queue populated without doctrine v5 amendment; cycle-004 shipped uninterrupted. This proves: **doctrine can route blocker-signal to future cycles without requiring continuous amendment**. The shape *"blockers → inheritance queue → forward cycles"* is the alternative to *"blockers → immediate doctrine v_{N+1}"*.

Operator impatience pattern (`~/hivemind/self/patterns.md`) honored — kept moving.

### Cycle-004 under 2h vs cycle-003's 2h vs cycle-001's harness 51min

Conversational-paired + shell-first + doctrine-first = fast. Cycle-001's harness at 51min was autonomous but produced dry plumbing. Cycle-004 in comparable time produced working agent-visible tools PLUS doctrine amendments PLUS hivemind pages. The walk-per-leg commit pattern compounds.

---

*Cycle-004 close · 2026-04-21. Five legs shipped, two deferred cleanly. 700+ lines shell + doctrine + YAML. Zero non-shell. Operator friction converted to structure. Next: operator pacing — merge cycle-004 PR, then cycle-005 from the inheritance queue.*

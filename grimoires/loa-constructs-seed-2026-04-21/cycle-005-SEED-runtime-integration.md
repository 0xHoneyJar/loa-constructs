# SEED — Cycle-005 · Runtime + Integration (return to using constructs)

> *"Let's just assume that people have Loa so they can install Constructs. Let's assume that people who create Constructs will want to have it show up on the network, and there's an easy path for that to happen. Loa should have the skill sets to be able to effectively do these actionable state changes."* — operator 2026-04-22
>
> **Status**: Draft · Dispatch in next session
> **Date**: 2026-04-22
> **Supersedes**: cycle-004 inheritance queue + flatline-v4 routing for SKP-001/002/003
> **Doctrine**: v4 active (§16.1–16.7)
> **Dispatch mode**: conversational-paired + shell-first (cycle-003/004 precedent). Harness optional for L1/L2 heavy code.
> **Branch**: `feat/spiral-loa-constructs-cycle-005-runtime-integration`

---

## 0 · Why this cycle exists

Two convergent pressures:

1. **Operator wants to return to actually using constructs.** Cycle-001–004 built the doctrine + plumbing. Cycle-005 closes the loop so composition execution + author publishing + network participation feel like one coherent product.

2. **Integration research (2026-04-22) mapped the real gaps.** Consumer flow is ~80% complete, author flow ~70%. The missing ~30% concentrates in specific places: composition runner, schema validation, template freshness, Loa bundling of construct tools, and the construct-base template not reflecting v3 conventions.

Cycle-005 closes the Q5 self-audit gap from cycle-004 ("composition execution is still manual") AND the three load-bearing integration gaps surfaced by research.

---

## 1 · Scope lock

Cycle-005 touches:

- `.claude/scripts/` — new `construct-compose.sh` runner; patches to `validating-construct-manifest` and possibly `constructs-list`
- `.claude/schemas/` — new per-type JSON schemas (Signal/Verdict/Artifact/Intent/Operator-Model)
- `grimoires/compositions/` — one additional composition YAML as runner test case
- `grimoires/loa-constructs-seed-2026-04-21/` — doctrine v5 amendment (minor)
- **Upstream repos**:
  - `0xHoneyJar/loa` — `mount-loa.sh` gets `--with-constructs` flag + optional default; `/loa-setup` loads `construct-network-tools`
  - `0xHoneyJar/construct-base` — template v3 update
  - 0xHoneyJar/construct-\* (selective) — butterfreezone-generated CONSTRUCT-README.md

**Does NOT touch**:
- Explorer UI (still works-as-folklore per cycle-002 operator direction)
- Dynamic Labs migration / Supabase→Turso (separate cycle)
- Security model (cycle-006)
- Namespace collision enforcement in registry (cycle-006)
- Flatline blockers SKP-004/005/006 (cycles 006/007)
- `/feedback` system (cycle-001 §14.2 surface; stable)

---

## 2 · Legs

| Leg | Purpose | Est. lines | Priority |
|---|---|---|---|
| **L1** · `construct-compose.sh` runner | Reads `compositions/*.yaml`, verifies type compatibility, pipes stages via `construct-invoke.sh` | ~250 shell | CERTAIN |
| **L2** · Stream JSON schemas | `.claude/schemas/{signal,verdict,artifact,intent,operator-model}.schema.json` + validator helper | ~200 JSON + 60 shell | CERTAIN |
| **L3** · `construct-base` template v3 update | Upstream PR on `0xHoneyJar/construct-base` — explicit `commands:`, streams section, identity handle convention, butterfreezone marker | ~120 lines YAML/MD | CERTAIN |
| **L4** · `validating-construct-manifest` skill | Loa-side skill + `.claude/scripts/construct-validate.sh` — pre-install + pre-publish check; catches F28-class issues | 1 SKILL.md + ~180 shell | CERTAIN |
| **L5** · Loa mount + `/loa-setup` construct bundling | Upstream PR on `0xHoneyJar/loa` — `mount-loa.sh` gains optional `--with-constructs` (or default-on); `/loa-setup` auto-installs `construct-network-tools` | ~80 shell + 1 SKILL.md patch | CERTAIN |
| **L6** · Butterfreezone construct adapter | Adapter reading `construct.yaml` + skill tree → emits `CONSTRUCT-README.md` with skill inventory + event graph + composability. First-run on one construct (artisan) as canary | ~200 shell + 1 MD template | CERTAIN (promoted) |
| **L7** · `/constructs` polish | Audit the existing command: browse UI, auth flow, offline fallback, update-one-pack support. Minimal patches to tighten rough edges found in the cycle-004 walk. | ~50 shell + SKILL.md patches | CERTAIN |
| **L8** · Composition runner e2e proof on feel-audit | Invoke `construct-compose feel-audit <target>`, verify trajectory + feedback-v3 emit + all three stages execute | test runs + 1 bats | LIKELY |
| **L9** · Doctrine v5 §17 amendment | Minor: decouple dispatch-determinism from output-reproducibility (flatline SKP-002); add failure-semantics section (SKP-003) | ~80 doc lines | LIKELY |
| **L10** · F24 `.source.json` three-way-merge carryover | Still useful; still not on critical path | ~80 shell | CONDITIONAL |

**Shell-first discipline** (doctrine §13.1) held through all legs. No TypeScript expected.

---

## 3 · Acceptance criteria

### L1 · Composition runner

- **AC-L1.1** · `construct-compose feel-audit <target>` executes all 3 stages sequentially, piping stdin/stdout between constructs
- **AC-L1.2** · Type compatibility verified at chain-build time (before first stage runs); mismatches fail loud with stage + expected-type + actual-type
- **AC-L1.3** · Trajectory rows emitted per stage (entry/exit, matched session_id)
- **AC-L1.4** · Runner output includes composition run_id, stage durations, final outcome
- **AC-L1.5** · `--dry-run` flag validates without executing (useful in CI)
- **AC-L1.6** · Three read-modes per doctrine §14.3 (glance/orient/intervene)

### L2 · Stream schemas

- **AC-L2.1** · Five JSON Schema files, draft-07 conformant
- **AC-L2.2** · Signal rows validate against signal schema; Verdict against verdict schema; etc.
- **AC-L2.3** · A `stream-validate.sh` helper accepts stream_type + JSON payload, returns 0/1
- **AC-L2.4** · Schemas versioned (`schema_version: "1.0.0"`) with compat rules documented
- **AC-L2.5** · Schemas gracefully tolerate extra fields (additive evolution)

### L3 · construct-base template v3 update

- **AC-L3.1** · `construct.yaml` has explicit `commands:` array example (closes F28 pattern)
- **AC-L3.2** · `streams: { reads: [], writes: [] }` example in construct.yaml
- **AC-L3.3** · `identity/<HANDLE>.md` example file showing persona handle convention
- **AC-L3.4** · README mentions butterfreezone-generated `CONSTRUCT-README.md` pattern
- **AC-L3.5** · All placeholder text (`your-name`, TODO markers) unchanged; CI still blocks
- **AC-L3.6** · Backward-compat: existing constructs derived from template don't break

### L4 · validating-construct-manifest

- **AC-L4.1** · New skill at `.claude/skills/validating-construct-manifest/SKILL.md`
- **AC-L4.2** · New script `construct-validate.sh <path>` checks: schema_version, slug uniqueness, persona-file existence, commands-file-vs-yaml consistency, stream declarations
- **AC-L4.3** · Emits findings as Verdict stream row on failure (doctrine §3 compliance)
- **AC-L4.4** · `constructs-install.sh` calls validator as pre-install gate (prevents F28-class installs)
- **AC-L4.5** · `constructs-publish.sh` calls validator as pre-publish gate

### L5 · Loa mount + /loa-setup construct bundling

- **AC-L5.1** · `mount-loa.sh` gains `--with-constructs` flag (default: true for fresh mounts, false for upgrades)
- **AC-L5.2** · When enabled, auto-runs `constructs install construct-network-tools` after mount
- **AC-L5.3** · `/loa-setup` wizard offers "install construct network tools" step
- **AC-L5.4** · Existing Loa installations un-affected; `/loa-setup` is opt-in for existing repos
- **AC-L5.5** · Upstream PR on `0xHoneyJar/loa` with documentation update

### L6 · Butterfreezone construct adapter

- **AC-L6.1** · New script `butterfreezone-construct-gen.sh <pack-path>` reads pack manifest + skills + identity
- **AC-L6.2** · Emits `CONSTRUCT-README.md` with: description, skill inventory, event emit/consume, composability (constructs that pair), install instructions, author
- **AC-L6.3** · First canary: run against `~/.loa/constructs/packs/artisan`, diff vs. any manually-authored README, validate correctness
- **AC-L6.4** · Idempotent — re-running produces same output modulo timestamps
- **AC-L6.5** · Integrates with existing `butterfreezone` skill via sibling invocation

### L7 · /constructs polish

- **AC-L7.1** · Offline-cache fallback works (API down → last-cached list still browsable)
- **AC-L7.2** · `/constructs upgrade <slug>` updates a single pack (currently only `update` (all))
- **AC-L7.3** · `/constructs auth` flow clean — clear error message when API key missing
- **AC-L7.4** · Browse UI renders pack metadata consistently (persona handle visible, schema_version, streams declared)
- **AC-L7.5** · No breaking changes — existing invocations still work

### L8 · E2e proof on feel-audit

- **AC-L8.1** · Single command `construct-compose feel-audit <some-component>` runs all 3 stages
- **AC-L8.2** · Produces: 6 trajectory rows (3 entry + 3 exit), 3 Verdict rows (one per artisan stage, one per observer stage — or however chain resolves)
- **AC-L8.3** · Final Verdict is schema-valid (L2 gate)
- **AC-L8.4** · Bats test `tests/cycle-005-compose-runner.bats` locks behavior

### L9 · Doctrine v5 §17 amendment

- **AC-L9.1** · New section §17 in `bonfire-construct-pipe-doctrine.md`
- **AC-L9.2** · §17.1 names dispatch-determinism vs output-reproducibility split (flatline SKP-002 closure)
- **AC-L9.3** · §17.2 introduces failure-semantics primitives (timeout / retry / idempotency / dead-letter — per flatline SKP-003)
- **AC-L9.4** · Version bumps v4 → v5; v4 chain-preserved per OTLET

---

## 4 · Dispatch

**Budget**: $120 target · $180 cap · Profile `light` (flatline gates optional)

Cap is higher than cycle-004 because:
- L1 + L2 are substantial code (~500 lines combined)
- L3 + L5 are upstream-repo PRs (clone + edit + review + merge overhead)
- L6 butterfreezone adapter needs careful design to work on varied pack structures

**Dispatch mode**: conversational-paired + shell-first (cycle-003/004 precedent). If you want autonomous, `/spiraling` harness is compatible — all acceptance criteria are observable.

**Kickoff prompt** (copy into next session to start):

```
Dispatching cycle-005 per SEED at
grimoires/loa-constructs-seed-2026-04-21/cycle-005-SEED-runtime-integration.md

Branch: feat/spiral-loa-constructs-cycle-005-runtime-integration
Base: main (current tip)
Mode: conversational-paired, shell-first per doctrine §13.1
Budget: $120 target / $180 cap

Primary target: close Q5 self-audit gap from cycle-004 — composition
runner (L1) so `construct-compose feel-audit <target>` actually executes
all three stages. Secondary: polish integration with Loa ecosystem
(L3 template v3, L4 validator skill, L5 mount-loa bundling, L6
butterfreezone adapter, L7 /constructs polish).

IMPORTANT governance (SEED §11): 0xHoneyJar/loa is Jani-owned. L5 is
PR-only, request @janitooor review, NEVER admin-merge. All other upstream
touches (construct-base, construct-*) admin-merge OK.

Grimoires convention (SEED §12): every construct CLAUDE.md must declare
its grimoires/ read/write paths. L3 reinforces in template, L4 validates,
L6 surfaces in generated README. artisan known to have drifted — use as
L6 canary.

Start with L1 + L2 (runner + stream schemas — they co-depend). Then L8
e2e proof against feel-audit. Then move through L3-L7 in any order.
L9 doctrine v5 amendment after code lands. L10 F24 if time permits.

Honor three-lens KEEPER/VOCABULARY-BANK/HERALD on any user-facing
copy. Use subagents for research or creative drafting when leverage is
high (cycle-004 README precedent).

Findings go in cycle-005-findings.md per OTLET convention.

Begin with constructs-list glance + constructs-active glance to
orient, then read the SEED in full (especially §11 governance + §12
grimoires convention), then L1.
```

**Pre-dispatch checklist** (next session):
- Verify main is clean + current (`git log -3`)
- Branch from main (`git checkout -b feat/spiral-loa-constructs-cycle-005-runtime-integration`)
- Operator-Model probe if helpful (reread `~/hivemind/self/strengths.md` + recent log entries)
- Then begin L1

---

## 5 · KANSEI gate (S8, operator-answered)

Five questions. Target ≥4/5 YES on Q1-Q4 + constructive Q5. Halt if <3/5.

| # | Question | Pass criterion |
|---|---|---|
| Q1 | Can I run `construct-compose feel-audit target.tsx` and watch all three stages execute end-to-end? | Y |
| Q2 | Does the runner fail-fast on a stream-type mismatch with a clear error? | Y |
| Q3 | Can a new construct author clone `construct-base` template and land on the network without understanding doctrine v4 internals? | Y |
| Q4 | Does `mount-loa.sh --with-constructs` (or post-mount `/loa-setup`) give a fresh Loa install the construct network tools by default? | Y |
| Q5 | Free-text: with cycle-005 shipped, what's the first thing you *actually want to use* constructs for? | constructive answer — drives cycle-006 framing |

---

## 6 · Review lens (carryover + additions)

Still applicable: `cycle-001-review-lens.md` (GECKO + KEEPER + OTLET + KISS) + cycle-004 COMPILE + TRANSPARENCY + DETERMINISM + PLAYGROUND lenses.

**Cycle-005 additions**:

- **EXECUTION lens**: "does this actually run, end-to-end, without manual intervention?" — L1/L6/L8 must pass this
- **INTEGRATION lens**: "does this compose cleanly with Loa's existing installer/skills without requiring the operator to know where one boundary ends and another begins?" — L3/L4/L5 must pass this

---

## 7 · What landing this proves

If cycle-005 lands cleanly:

1. **Compositions execute as advertised** — doctrine §4 claims become runtime truth
2. **Type safety on typed streams** — doctrine §3 claims become validatable runtime invariants
3. **Author flow is frictionless** — `gh repo create --template construct-base` → develop → `/constructs publish` → appears on network (template + validator + Loa bundling make this true)
4. **Loa users get constructs by default** — mount-loa includes construct-network-tools; no second-step ceremony
5. **Documentation is generated, not maintained** — butterfreezone adapter means 31 pack READMEs become auto-generated
6. **The Q5 self-audit from cycle-004 closes** — "composition execution is still manual" ends

If it doesn't land cleanly, the findings route to cycle-006+ and the doctrine absorbs what broke (OTLET chain-preserved).

---

## 8 · What cycle-006 inherits

Pre-drafted from cycle-004 §8.1 + this cycle's gaps:

1. **Security model + data governance + trust model** (flatline SKP-004/005 + IMP-005) — dedicated security cycle
2. **Namespace collision enforcement** — registry schema work + `claiming-construct-slug` skill
3. **`.source.json` backfill for 29 legacy installs** (F22 carryover)
4. **Dynamic Labs → Freeside sovereign auth** — operator's 2026-04-13 declared pivot
5. **Supabase → Turso migration** — infra decommission (pending unpause decision)
6. **Dependency resolution / version constraints** — integration research Gap 2
7. **`/feel` routing UX reconciliation** — either artisan pack-layer decision OR operator-OS user-layer resolver
8. **JSONL append integrity hardening** (flatline SKP-006) — cycle-007

---

## 9 · Cycle authorship lens

Cycle-001 · OSTROM (architecture-first)
Cycle-002 · operator (experience-first paired-scribe)
Cycle-003 · agent (first-person toolchain walk)
Cycle-004 · same agent + doctrine (open playground)
**Cycle-005 · agent + integration** (runtime + ecosystem-coherence)

Declared at cycle open so subsequent cycles chain-preserve per OTLET.

---

## 10 · Supersession note

Cycle-004-findings §"What cycle-005 inherits" is reference-floor. This SEED supersedes that list with explicit scope + AC + dispatch. F24 three-way-merge stays deferred (L10 CONDITIONAL). Flatline SKP-002/003 partial closure happens via L9 doctrine v5 amendment — not full closure, but the doctrinal claim is split.

---

---

## 11 · Repo governance (IMPORTANT — per operator 2026-04-22)

Not all repos in `0xHoneyJar` are ours to admin-merge. Cycle-005 legs that touch upstream MUST respect ownership boundaries:

| Repo | Owner | PR discipline |
|---|---|---|
| `0xHoneyJar/loa` | **@janitooor** (Jani). We are a collaborator, not owner. | **PR only · request @janitooor review · NEVER admin-merge**. Clear rationale in PR body. Await approval. |
| `0xHoneyJar/loa-constructs` | Operator (this repo) | Admin-merge OK. |
| `0xHoneyJar/construct-base` | Operator (template we maintain) | Admin-merge OK for schema / integration improvements. |
| `0xHoneyJar/construct-*` (individual packs) | Operator (packs we publish) | Admin-merge OK for schema / integration improvements. |

**L5 scope correction**: Loa `mount-loa.sh` + `/loa-setup` changes = **upstream PR discipline**. Do NOT admin-merge. PR body must explain:
- What: specific change (e.g., `--with-constructs` flag)
- Why: operator-stated direction 2026-04-22 (Loa users should get construct tools by default)
- Risk: no breaking change to existing installs
- Request: review from @janitooor

If Jani rejects or requests changes, L5 adapts or defers. Cycle-005 does not gate on Jani-PR merge; cycle ships without L5 if upstream review takes longer than cycle window. L5 becomes an "in-flight" item carried to cycle-006.

---

## 12 · Grimoires as primary read/write area (convention reinforcement)

**Per operator 2026-04-22**: constructs MUST be aware that `grimoires/` is their primary artifact read/write area. `construct-base` CLAUDE.md template already declares this pattern ("grimoire path IS the interface — constructs that share paths are connected"). Cycle-005 reinforces across three places:

**L3 (`construct-base` template v3)** — already has grimoires section; audit and strengthen:
- Explicit `writes: grimoires/<construct-slug>/` declaration as a required pattern
- Example: `Artisan writes to grimoires/design-system/taste-tokens/`
- Explanation of why: inter-construct composition via shared grimoire paths

**L4 (`validating-construct-manifest`)** — new check:
- Pack's `CLAUDE.md` MUST contain a `grimoires/` read/write declaration
- Emit Verdict finding if absent (severity: MEDIUM — not blocking, but flagged)
- Acceptance criterion AC-L4.6 added

**L6 (butterfreezone adapter)** — generated `CONSTRUCT-README.md` MUST surface:
- Which grimoires paths the construct writes to
- Which grimoires paths the construct reads from
- Cross-links to constructs sharing paths (composability surface)

**Drift detected 2026-04-22**: artisan's installed `CLAUDE.md` lacks explicit grimoires section despite template having it. Root cause likely pre-v3 install. **Cycle-005 L6 canary (butterfreezone on artisan) will surface + regenerate.**

---

*Drafted 2026-04-22. Amended 2026-04-22 with §11 repo governance + §12 grimoires convention per operator confirmation. First formal SEED post-doctrine-v4. Integration-research-grounded. Ready for next-session dispatch.*

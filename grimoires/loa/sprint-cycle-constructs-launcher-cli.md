---
cycle: cycle-constructs-launcher-cli
mode: arch
status: planned
prd: grimoires/loa/prd.md
sdd: grimoires/loa/sdd.md
sprints: [sprint-227, sprint-228, sprint-229]
created: 2026-07-12
---

# Sprint Plan — `constructs`: the veve'd navigation & stationing CLI

> Three sprints, sequenced **organ → grammar → proof**. Every task cites the PRD/SDD
> clause it satisfies. Acceptance criteria are mechanical (a command, a vector, a
> test) — never "looks right".
>
> **Review armor applied**: Flatline PRD ×2 (24 blockers) · Bridgebuilder design
> review (7 findings) · Flatline SDD (19 blockers, 5 CRITICAL) · Flatline SPRINT
> (10 blockers, 4 CRITICAL — including a real self-inflicted contradiction: the
> union-merge git attribute structurally broke the receipt hash-chain; the record
> model is now one-file-per-record, the L6 pattern). Red-team SKIPPED — infra
> defective, see NOTES.md BLOCKER; T3.2b is the compensating adversarial guard.
>
> **Standing constraints (every task)**: zero npm runtime deps (vendored single-file
> libs only) · stdout=data / stderr=diagnostics · no shell metacharacters in any
> composed invocation · every applied fix pins a regression test · never edit
> `.claude/` (System Zone).

---

## Sprint 227 — The Organ (navigation + contract + launcher reach)

**Goal**: `loa caps` lists `constructs`; every read verb answers deterministic JSON with provenance; the contract is self-describing and vector-pinned.

| # | Task | Files | Acceptance criteria |
|---|------|-------|---------------------|
| T1.1 | Scaffold `packages/constructs-cli/` as a bun workspace member (zero-dep, node ≥18, ESM, bin `constructs`) | `packages/constructs-cli/package.json` | `bun install` clean; `node bin/constructs.mjs --help` exits 0; package has **zero** `dependencies` (asserted in test) |
| T1.1b | **Subprocess contract** module: `execFile` with arg arrays only (never a string, never `sh -c`), absolute binary resolution, env allowlist, explicit timeouts, non-zero exits surfaced | `lib/exec.mjs` | Unit tests: a metacharacter-laden argument reaches the child as a literal arg; no ambient secret env passes through; a hung child hits the timeout and reports (FL-SPRINT HIGH) |
| T1.2 | Vendored libs: `yaml-subset.mjs` (maps/seqs/scalars/comments; rejects anchors/tags/multi-doc with a teaching error), `schema-subset.mjs` (declared keyword subset), `glob.mjs` (`**`/`*`/literal, no symlink traversal), inline Levenshtein | `lib/vendor/*.mjs` | Unit suite per lib; out-of-subset YAML → exit 2 + named error (never best-effort parse); glob tests cover the PRD FR-8 normative rules |
| T1.3 | Verb table + dispatch + exit-code dictionary (`0`ok `1`tool `2`caller `3`refused `4`integrity `5`drift), precedence `4>3>2>5`; bare invocation = triage-help, never a TUI | `bin/constructs.mjs`, `lib/contract.mjs` | One golden vector per exit code + a precedence fixture; `constructs` (no args) exits 0 with useful help; non-TTY suppresses ANSI (SDD §2.1; PRD NFR-2/3) |
| T1.4 | `capabilities --json` + `robot-docs guide` + `--llms`, all **generated from the verb table** | `lib/contract.mjs` | Contract test: capabilities payload ↔ verb table identity (drift structurally impossible); exit-code dict ↔ golden vectors 1:1 (PRD FR-3; BB DR-004) |
| T1.5 | Intent inference: Levenshtein-1 + alias map (`ls→list`, `search→find`, `add→install`, `constructs-cli …`); read-only verbs auto-correct, **mutation verbs refuse-with-correction**; **ambiguity never guesses** (≥2 equal-distance candidates ⇒ refuse + list them); option typos follow the verb-typo policy | `bin/constructs.mjs` | `constructs lst` runs list + warns; `constructs statoin` → exit 2, names the exact corrected command, does **not** run; an equidistant-ambiguous input → exit 2 listing candidates (PRD FR-7 r2; FL-SPRINT HIGH) |
| T1.6 | `lib/sot.mjs` — territory-first ladder (local packs → API → registry.yaml); provenance on every answer; content-hashed cache w/ explicit invalidation; local-rung hash-check; drift → exit 5 + `drift[]` | `lib/sot.mjs`, `lib/api.mjs` | Three-rung-disagreement fixture → exit 5 with each rung named; corrupt local pack → rung skipped + flagged; `--no-cache` bypasses; cache state visible in provenance (PRD FR-4; NFR-1) |
| T1.7 | Read verbs `list`/`find`/`info`/`summary` ported from `bin/constructs.ts` onto the ladder; human table + JSON serialize from ONE object | `bin/constructs.mjs`, `lib/api.mjs` | Output-parity test vs the TS CLI on the same fixture; `--json \| jq` works with zero stderr contamination (Axiom 4) |
| T1.8 | `veve.json` (determinism `attestable` + declared ambient; `liveness.expected_p95_s: 5`) + ≥6 golden vectors (incl. ambient-free `--help`, `capabilities`, a caller-error path) | `veve.json`, `test/vectors/` | `run-vectors.mjs` executes each vector **twice** and byte-diffs; `SOURCE_DATE_EPOCH` honored; all vectors green (PRD FR-6; NFR-1) |
| T1.9 | Launcher round-trip via workspace veve discovery | docs/config | `LOA_WORKSPACE=. loa caps` lists `constructs`; `loa run constructs capabilities` returns the contract **and** emits a proof-of-run record (PRD G-1) |
| T1.10 | CI job `constructs-cli` (vectors + units + zero-dep assert + p95 smoke on ambient-free verbs) | `.github/workflows/` | Green on PR; fails if a vector byte-drifts or any dependency is added |

**Exit gate**: G-1 + G-2 mechanically demonstrated.

---

## Sprint 228 — The Grammar (territory, atlas, stationing, authority)

**Goal**: regions declare outcomes; the atlas computes the map from territory; stationing is validated, recorded, and bounded by earned trust.

| # | Task | Files | Acceptance criteria |
|---|------|-------|---------------------|
| T2.1 | `schemas/territory.schema.json` (PRD FR-8 shape incl. `trust{promote_after_accepted_observations:25, window_days:30, cooldown_hours:72}`) + validator | `schemas/`, `lib/territory.mjs` | Valid fixture passes; ≥8 invalid fixtures fail with named errors (bad slug, traversal scope, unknown tier, intra-region overlap, out-of-subset YAML…) |
| T2.2 | Normative scope semantics + conflict detection: intra-region overlap = validator error; cross-region overlap = atlas CONFLICT block | `lib/territory.mjs` | Two-region fixture claiming one path → `conflicts[]` names both maintainers; nearest-scope-wins proven for `where` (PRD FR-8 r2) |
| T2.3 | `atlas` mega-command: fold zones.yaml ⊕ packs+veves ⊕ territory manifests ⊕ conflicts; `vantage: operator-local`; typed `atlas.sources[]` (`kind: path` only); ≤32 bounded; per-source error capture; `--timeout`; `partial: true` marking | `lib/territory.mjs` | Fixture estate → deterministic JSON (sorted, byte-stable across runs); one unreachable source → partial + named, run still exits 0; p95 <5s smoke (PRD FR-2/12, NFR-7 r2; BB DR-001) |
| T2.4 | `where <path\|noun\|slug>` → zone, region, owner, loadout, gate, provenance | `lib/territory.mjs` | `constructs where packages/loa-registry` returns all six fields from computed territory (PRD G-3) |
| T2.5 | `lib/station.mjs`: validate manifest + loadout; require the edit **committed on the region's default branch** (worktree-only ⇒ dry-run); refuse foreign-manifest authoring (exit 3); keyless (no `sk_`) | `lib/station.mjs` | Uncommitted edit → dry-run only; non-default branch → refused with teaching error; foreign manifest write → exit 3 (SDD §2.4; FL-SDD CRITICAL) |
| T2.6 | Receipts: **one content-addressed FILE per record** (the L6 pattern — no shared JSONL, no cross-record chain, no union-merge; each record independently verifiable) into the region's own tree; observations as **per-actor JSONL segments**; **snapshot manifest-hash + HEAD + default-branch + L4 ledger tip at validate and re-verify ALL before write** (TOCTOU); local flock for same-clone concurrency | `lib/station.mjs`, `schemas/receipt.schema.json` | Receipt validates + verifies standalone; two divergent clones each add a receipt → **merge is conflict-free and both verify** (the union-merge/chain contradiction is gone); any snapshot input changed between validate and write → refused; same-content re-write is idempotent (FL-SPRINT CRITICAL ×2 + HIGH) |
| T2.7 | Loa-mount precondition: probe the region for the audit substrate; refuse with a teaching error naming `mount-loa.sh` | `lib/station.mjs` | Unmounted-region fixture → exit 3, error names the mount script, **no partial write** (BB DR-002) |
| T2.8 | L4 authority reads: region-relative ledger resolution; **chain verified before display; unverifiable ⇒ `authority: unknown` ⇒ treated as observe**; ceiling (manifest) vs earned (ledger) rendered separately; **no verb acts on earned tier beyond display this cycle** | `lib/station.mjs` | Tampered-ledger fixture → `authority: unknown`, never a tier; earned > ceiling impossible (assert); enforcement-matrix test (FL-SDD CRITICAL; PRD FR-11) |
| T2.9 | L4 fixture proof: tier-up + observed-override auto-drop demonstrated mechanically | `test/fixtures/l4/` | CI drives `trust_grant` → tier rises; `trust_record_override` → auto-drop + cooldown; **production stationings stay observe-only** (PRD G-4 r2) |
| T2.10 | Additive `territory:` stanza on the construct manifest schema | `packages/shared/src/validation.ts` | Existing manifests still validate (no breaking bump); new stanza validates; `bun test` green in `packages/shared` (PRD FR-13) |

**Exit gate**: G-3 + G-4 mechanically demonstrated.

---

## Sprint 229 — The Proof & The Fold (install integrity, self-host, handoff, consolidation)

**Goal**: installs are integrity-verified and containment-hardened; the network wardens itself; the old surfaces fold.

| # | Task | Files | Acceptance criteria |
|---|------|-------|---------------------|
| T3.1 | `lib/install.mjs` — network + git rungs; **crypto = the audit substrate's exactly: Ed25519 over RFC-8785 JCS canonical bytes (`lib/jcs.sh`), signed bytes = `JCS(manifest ⊕ tree_hash)`, single-signature v1, expiry honored**; registry-anchored trust (registry declares expected hash + `attested`); **stripped signature on an attested pack ⇒ STRIP-ATTACK, exit 4, no override**; `--allow-integrity-mismatch --reason` bypasses the hash check ONLY, logged with actor/key; **revoked key ⇒ refuse** | `lib/install.mjs` | Fixtures: tampered pack → exit 4; stripped sig on attested pack → exit 4 `[STRIP-ATTACK]`, override flag rejected; revoked key → exit 4; signature verifies against a known-good JCS vector; override records reason in the receipt (PRD FR-18; FL-SPRINT CRITICAL) |
| T3.2 | **No archive parser** (pack payload is a JSON file-list `{path, content_base64}[]`, not a tarball — [CODE:bin/constructs.ts:265-380]; git rung uses git). Containment applies to file **NAMES** + payload budgets: reject absolute/`..`/symlink entries; max total bytes, max entry count, max single-file bytes; **staging dir inside the packs parent (no EXDEV) + per-pack flock + atomic rename**; no `+x` by default; overwrite only pack-marker-managed files | `lib/install.mjs`, `test/fixtures/redteam/` | One red-team fixture per rule (malicious file-list: traversal name, absolute path, symlink entry, oversized payload, entry-count flood) — each fails the build if containment regresses; **zero archive-parsing code ships** (asserted) (PRD FR-19; FL-SPRINT CRITICAL) |
| T3.2b | **Adversarial fixture review**: a second model reviews the T3.2/T3.1 red-team fixtures via `reviewing-diffs` before the tasks close (the fixtures are the ONLY security guard now that red-team infra is broken — a self-authored guard reviewed by its author is not a guard) | `test/fixtures/redteam/` | Cross-model review produces findings JSON; any missed attack class it names becomes a fixture before T3.2 is marked done (FL-SPRINT HIGH) |
| T3.3 | Git-rung anchor: pin to the commit recorded in tracked `registry.yaml`; absent ⇒ TOFU recorded as `anchor: first-seen`, surfaced never silent | `lib/install.mjs` | Anchored fixture verifies; unanchored installs but the receipt shows `first-seen` + a stderr notice (FL-SDD HIGH) |
| T3.4 | Test-seam containment: `LOA_CONSTRUCTS_FIXTURE_ROOT`/`TEST_NOW` honored ONLY with `LOA_CONSTRUCTS_TEST_MODE=1` **AND a test-runner marker — `CI=true` alone is insufficient**; fixture root must resolve under the repo or a mktemp dir | `lib/*.mjs` | Containment test per seam: seam + `CI=true` only → ignored with a stderr warning (FL-SDD HIGH; BB DR-003) |
| T3.5 | `lib/observe.mjs` + `schemas/observation.schema.json`: audit-envelope-chained governed observations into the region's tree | `lib/observe.mjs` | Row validates, references a real outcome id, cites `file:line`, chain verifies |
| T3.6 | **Self-host proof (G-5a)**: author `grimoires/territory.yaml` for loa-constructs (outcomes: registry-SoT coherence, topology health, release-surface sync); station the maintainer-chosen loadout observe-only; emit ≥1 governed observation | `grimoires/territory.yaml`, `grimoires/loa/territory/` | Named acceptance test: manifest validates ∧ ≥1 schema-conformant observation exists ∧ chain verifies ∧ outcome id resolves — closable without interpretation (PRD FR-14) |
| T3.7 | **Ratification proposal (G-5a)**: L6 `handoff_write` (never hand-assembled) proposing the grammar to one maintainer-picked freeside region | `grimoires/loa/handoffs/` | Handoff validates against the L6 frontmatter schema, appears in INDEX.md, surfaces at SessionStart (PRD FR-15) |
| T3.8 | Fold `constructs-cli`: final redirect release (every command prints the migration pointer, then proxies/exits) + `npm deprecate` + repo archive banner + rollback criteria in the migration note | external repo + `docs/` | `npx constructs-cli install x` prints the pointer; npm shows the deprecation warning; the migration note documents rollback (PRD FR-16) |
| T3.9 | Deprecation pointers on `bin/constructs.ts` + Loa-plugin verbs (stderr breadcrumb, silenceable via `CONSTRUCTS_SILENCE_DEPRECATION=1`); no retrofit | `packages/loa-registry/` | Pointer on **stderr only** (Axiom 4); existing behavior unchanged; `bun test` green (PRD FR-17) |
| T3.10 | Ergonomics scorecard + pinned rubric (`agent_ergonomics_audit/rubric.lock`), in-tree per NFR-8; regression test per applied fix | `agent_ergonomics_audit/` | All 11 dimensions scored with evidence for every score >700; rubric version pinned; ≥5 substantive surface changes documented (PRD NFR-8) |
| T3.11 | **E2E acceptance task** (goal_validation): drive PRD Appendix C end-to-end on a fixture estate | `test/e2e/` | One run proves G-1, G-2, G-3, G-4, G-5a, G-6 in sequence; a failure names which goal broke |

**Exit gate**: G-5a + G-6 mechanically demonstrated; every Appendix-C row green.

---

## Dependencies & sequencing

- **227 → 228**: atlas/stationing need the verb table, the ladder, and the vendored libs.
- **228 → 229**: install receipts reuse the stationing receipt writer; the self-host proof needs the manifest + `observe`.
- T3.8 is the only cross-repo **write**; T3.7 is a proposal, not a build.
- Unchanged non-goal: Finn sandbox integration — the CLI is Finn-*compatible*, not Finn-*wired*.

## Risks carried into implementation

| Risk | Guard |
|---|---|
| Vendored YAML/schema subsets silently under-parse a real manifest | Out-of-subset input MUST error loudly (never best-effort); T1.2 tests it |
| Audit-envelope shelling makes the "zero-dep" claim leaky | Precondition checked at the door (T2.7); disclosed in capabilities + robot-docs |
| v1 trust boundary (same-origin download+hash) | Stated honestly in SDD §5 + robot-docs; cross-channel hash publication named as the v2 affordance |
| Red-team infra defect masks security regressions | NOTES.md BLOCKER filed upstream; T3.2's red-team fixtures are the substitute mechanical guard |

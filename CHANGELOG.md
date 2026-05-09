# Changelog

All notable changes to the Loa Skills Registry will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.41.0] — 2026-05-09 — spiral recovery — audit-feel composition + 4 runbooks + egress-filter + telemetry config


Recovers genuine value from an autonomous `/spiral` run that hit a `quality_gate_failure` circuit breaker. Closes 4 cycle deferrals from v2.40.0 (audit-feel composition installation; substantial operator runbooks; egress filter; telemetry schema/retention config). Drops the spiral's 4 hallucinated stub libraries.

The autopoietic feedback loop worked: spiral produced an artifact, the substrate's own validator caught a real bug in it (`[STREAM-NO-PRODUCER]` on the audit-feel composition), recovery fixed it, substrate now accepts it.

### Added

- **post-v2.40.0**: spiral recovery — audit-feel composition + 4 runbooks + egress-filter + telemetry config (#228)
- **cycle-102 sprint-1C**: curl-mock harness substrate (closes #808 + DISS-002 + DISS-003) (#816)
- **cycle-102 sprint-1B**: HIGH fast-follows — T1B.1 + T1B.2 + T1B.4 (model swap, format_checker, redaction contract) (#813)
- **cycle-102 sprint-1 partial**: typed errors + probe cache + A1+A2 live-bug fix (#803)
- **bridgebuilder**: #796 / vision-013 — per-PR self-review opt-in (#797)
- **cycle-102**: kickoff — Loa Model-Integration FAANG-Grade Stabilization (#795)
- **cycle-100**: sprint-3 — cycle-098 regression vectors + differential oracle (#790) [skip-template-guard]
- **cycle-098**: sprint-7 — L7 soul-identity-doc foundation (FR-L7-1..7 + NFR-Sec3) (#775)
- **cycle-098**: sprint-6 — L6 structured-handoff (FR-L6-1..8) (#771)
- **cycle-098**: sprint-5 — L5 cross-repo-status-reader (FR-L5-1..7) (#767)
- **cycle-098**: sprint-4 — L4 graduated-trust (FR-L4-1..8) (#764)
- **cycle-099-sprint-2F**: model-invoke --validate-bindings + LOA_DEBUG_MODEL_RESOLUTION (T2.12+T2.13) (#760)
- **cycle-099-sprint-2E**: tier_groups defaults + prefer_pro wiring (T2.7+T2.8) (#750)
- **cycle-099-sprint-2D.d**: SC-14 property suite (T2.6 closure) (#748)
- **cheval**: subscription-auth headless adapters — codex + gemini + claude (#727)
- **cycle-099-sprint-2D.c**: TS port via Python+Jinja2 codegen (T2.6 cont.) (#741)
- **cycle-099-sprint-2D**: FR-3.9 6-stage canonical resolver + bash twin (T2.6 partial) (#740)
- **cycle-099-sprint-2C**: model-adapter.sh overlay integration (T2.5) (#739)
- **cycle-099-sprint-2B**: model-overlay-hook + writer + 4 AC tests (T2.3+T2.4) (#738)
- **cycle-099-sprint-2A**: JSON Schema for model_aliases_extra + standalone validator (T2.1) (#737)
- **cycle-099-sprint-1D**: cross-runtime golden test corpus + 3 runners + diff CI gate (T1.11+T1.12) (#735)
- **cycle-099-sprint-1E.c.3.c**: final SSRF closure — strict CI flip + host wildcard rejection + webhook opt-in (T1.15 cont.) (#734)
- **cycle-099-sprint-1E.c.3.b**: bash caller migration batch + smuggling-defense remediation (T1.15 cont.) (#733)
- **cycle-099-sprint-1E.c.3.a**: bash caller migration to endpoint_validator__guarded_curl (T1.15 cont.) (#732)
- **cycle-099-sprint-1E.c.2**: DNS rebinding + redirect enforcement (T1.15 cont.) (#731)
- **cycle-099-sprint-1E.c.1**: TS port via Python+Jinja2 codegen (T1.15 cont.) (#730)
- **cycle-099-sprint-1E.b**: centralized endpoint validator (T1.15 partial) (#729)
- **cycle-099-sprint-1E.a**: log-redactor + migrate-model-config CLI (T1.13 + T1.14) (#728)
- **cycle-099-sprint-1C**: codegen reproducibility matrix CI + toolchain runbook (#724)
- **cycle-099-sprint-1B**: adapter migrations + drift gate + lockfile (#723)
- **cycle-099-sprint-1A**: bridgebuilder codegen foundation (T1.1 + T1.2) (#722)
- **cycle-098-sprint-3**: L3 scheduled-cycle-template — 5-phase chassis + flock + idempotency + L2 budget gate (#712)
- **cycle-098-sprint-2**: L2 cost-budget-enforcer + reconciliation cron + daily snapshot (#705)
- **cycle-098**: sprint-1 — L1 hitl-jury-panel + cross-cutting infrastructure (#693)
- **cycle-098**: planning artifacts (PRD v1.3, SDD v1.5, sprint plan, decisions) (#678)
- **cycle-096**: AWS Bedrock provider + provider-plugin hardening (#652) (#662)
- **cycle-095**: model currency — gpt-5.5 + Haiku 4.5 + Gemini 3 + cost guardrails [Sprints 1+2] (#649)
- **cycle-094 sprint-2**: test infra + filter + SSOT close-out (G-5..G-E2E) (#638)
- **cycle-094 sprint-1**: probe + portability hardening (G-1..G-4) (#632)
- construct onramp (cycle-005 L5) + connectivity tooling migration (cycle-006 L-migrate) (#617)
- **cycle-093 sprint-4**: model registry currency + E2E gate (T2.1 + T2.3 + T3.1) (#631)
- **cycle-093 sprint-3B**: probe resilience + bypass governance + CI workflows + runbook (T2.2 part 2) (#629)
- **cycle-093**: Loa stabilization sprints 1-3A — harness + dist + hallucination filter + probe foundation
- **sprint-3A**: health-probe core — model availability probe foundation (T2.2)
- **sprint-2**: dissenter hallucination filter — close #618 signal/noise
- **sprint-1**: harness adversarial wiring — close #605 silent no-op

### Fixed

- **bridgebuilder**: #799 + #800 — trust-origin preservation + broken-symlink disambiguation (#801)
- **bridgebuilder**: #789 — preserve diagnostic context in TS adapter errors (#792)
- **semver-bump**: handle prerelease tags (vX.Y.Z-{alpha,beta,rc}.N) (#785)
- **cheval**: #774 — typed connection-loss classification + operator-facing strings (#781)
- **model-adapter**: #782 — route gpt-5.5 / gpt-5.5-pro to /v1/responses (#783)
- **cycle-098**: follow-up #776 — L6 strict test-mode gate + hook wiring + LOW polish (#778)
- **cycle-099**: #761 _stage1_explicit_pin rejects URL-shape values (closes Sprint 2F V15 xfail) (#763)
- **cheval**: #755 submodule symlinks + #756 alias validation + #759 degraded consensus (#762)
- **cycle-099**: pin LC_ALL=C in gen-adapter-maps.sh for locale-immune codegen (#754)
- **model-routing**: top OpenAI/Gemini models accessible from BB + red team + flatline (#752)
- **bridgebuilder-review**: route gpt-5.5* to /v1/responses (endpoint_family fix) (#751)
- **#711**: gpt-review hook recursion + 429 diagnostic surfacing (#718)
- **t2-t3**: hardening bundle — close #636 + #681 + #687 + #691 + #692 (#703)
- **pipeline**: TIER 1 bundle — close #674 + #633 + #676 (#634 already-fixed) (#700)
- **post-merge**: close #697 — gt_regen arg mismatch + CHANGELOG cross-scope leak (#699)
- **model-adapter**: large-payload hardening — sprint-bug-131 (#675) (#677)
- **post-merge**: scaffold workflow on mount + submodules:recursive (#669) (#671)
- bug batch — post-PR + post-merge + portability (6 issues) (#670)
- **cycle-097**: quick wins — NC-9, NC-10, NC-5, F002 + plugin guide A1 (#666)
- **cheval**: Opus 4 temperature gate + Google/Gemini API key allowlist (#641) (#645)
- **mount**: structural version resolver — kill /mount stale-stamp regression class (#640) (#644)
- **ci**: npm ci before bridgebuilder dist smoke import test (#637) (#643)
- **bug-skill**: pick safe sprint-id via helper that consults disk + origin (#646)
- **model-registry**: activate Opus 4 temperature gate + restore gemini-2.5 aliases (#647)
- **tests**: flatline-model-validation array extraction (was 7/15 fail) (#648)
- **spiral**: close #622 + #623 — scheduling-gate honors enabled, dispatch sees per-cycle env (#639)
- **sprint-3A**: anthropic-version header (kaironic iter-3) (#624)
- **sprint-3A**: add anthropic-version header to /v1/messages probes
- restore sprint-1 and sprint-2 code accidentally removed in bf457d1
- **sprint-3A**: auth refactor — CI cross-platform lint + audit M-1 remediation
- **sprint-2**: de-hardcode /home/merlin/ path in hallucination-filter test
- **sprint-3A**: hermetic test isolation — LOA_TRAJECTORY_DIR + LOA_AUDIT_LOG overrides
- **sprint-2**: bridgebuilder dist ship gap — close #607 ERR_MODULE_NOT_FOUND

_Source: PR #228_


## [2.27.0] - 2026-04-22

### Why This Release

**Cycle-005 · Runtime + Integration.** The composition execution gap from cycle-004 closes: `construct-compose feel-audit <target>` now runs the three-stage artisan→artisan→observer chain end-to-end with paired trajectory rows, per-stage durations, and final-output schema validation. Typed streams (Signal / Verdict / Artifact / Intent / Operator-Model) gain draft-07 JSON schemas and a shell validator. A manifest linter lands as the install + publish pre-gate. The butterfreezone adapter generates per-pack `CONSTRUCT-README.md` from canonical yaml + skills + identity, surfacing and regenerating the SEED §12 grimoires-section drift found across 27 of 29 installed packs.

Doctrine bumps v4 → v5 with two structural clarifications: **dispatch-determinism ≠ output-reproducibility** (an invariant v4 conflated), and **named failure-semantics primitives** (timeout / retry / idempotency / dead-letter). Grimoires-as-interface promoted from SEED §12 guidance to doctrine §17.4.

Shell-first discipline held — zero TypeScript shipped across ~1,050 lines of new shell, ~300 lines of JSON schema, and ~150 lines of markdown (doctrine + SKILL.md + findings). Upstream sibling PRs land in `construct-base` (template v3) and `loa` (mount-time onramp, PR-only per repo governance).

### Added

#### Composition runner + typed streams (L1 + L2 + L8)

- **`.claude/scripts/construct-compose.sh`** — composition runner reading `grimoires/compositions/<name>.yaml`. Build-time type compatibility check (stage reads ⊆ upstream writes ∪ composition inputs); fails loud with stage + type detail. Pipes stdin/stdout between stages; emits paired entry/exit trajectory rows via `construct-invoke.sh`. Stub stage executor produces schema-valid placeholder output per declared write-type; real LLM dispatch swaps in via `--executor` / `$LOA_COMPOSE_STAGE_EXECUTOR` (cycle-006+).
- **Three read-modes per doctrine §14.3** — `--glance` (one line), `--orient` (per-stage timings), `--intervene` (full JSON blob).
- **`--dry-run`** flag validates plan without executing; `--run-id` overrides for reproducible test runs.
- **Five draft-07 JSON schemas** at `.claude/schemas/{signal,verdict,artifact,intent,operator-model}.schema.json`. Schema-versioned 1.0.0; `additionalProperties: true` for additive evolution.
- **`.claude/scripts/stream-validate.sh`** — python3+jsonschema validator with jq required-field fallback. Pre-check on declared `stream_type` alignment.
- **`tests/cycle-005-compose-runner.bats`** — 6 tests locking behavior: dry-run plan, live 3-stage execution + 6 trajectory rows + schema-valid final output, type-mismatch fail-at-exact-stage, missing composition, orient timings, intervene JSON shape.

#### Manifest validator skill (L4)

- **`.claude/scripts/construct-validate.sh`** — pre-install + pre-publish linter. Checks: schema_version + required fields, skill/command path resolution, F28 route declaration gate (commands OR personas), stream declarations, SEED §12 grimoires-section presence in `CLAUDE.md`. Emits findings as `Verdict` stream rows (doctrine §3.2).
- **`.claude/skills/validating-construct-manifest/`** — SKILL.md + index.yaml with capability stanza, input schema, output contract.
- **Install + publish hooks wired**: `constructs-install.sh` warns on HIGH/CRITICAL findings (promote to blocking via `LOA_STRICT_VALIDATION=1`); `constructs-publish.sh` adds it as check #10 in the 10-point pre-publish report.

#### Butterfreezone per-pack adapter (L6)

- **`.claude/scripts/butterfreezone-construct-gen.sh`** — reads `construct.yaml` + `identity/<HANDLE>.md` + `skills/*/SKILL.md` + `commands/*.md`, emits a provenance-tagged `CONSTRUCT-README.md` covering persona handles, skill inventory with frontmatter descriptions, command inventory, composes_with, stream declarations, grimoire read/write paths, install instructions, and provenance footer. Handles YAML block-scalar frontmatter (`description: |`). Idempotent — byte-identical re-runs (LC_ALL=C + sorted iteration + no timestamp unless `--timestamp`). SEED §12 drift auto-detected and surfaced with a ⚠ notice when `CLAUDE.md` lacks a `grimoires/` reference.

#### /constructs polish (L7)

- `constructs-list.sh --orient` now surfaces **personas** and **streams** per pack, plus a ⚠ undeclared hint when `reads`/`writes` counts are 0.
- `constructs-install.sh` advertises `upgrade <slug>` in help + examples (the dispatcher already handled it).
- `constructs-auth.sh validate` with missing key now emits free-vs-premium framing and the exact setup command line.
- `.claude/commands/constructs.md` invocation block updated.

#### Doctrine v4 → v5 (L9)

- **`bonfire-construct-pipe-doctrine.md` §17** — new amendment section:
  - §17.1 splits dispatch-determinism from output-reproducibility (flatline SKP-002 partial closure)
  - §17.2 names failure-semantics primitives vocabulary (flatline SKP-003 partial closure)
  - §17.3 Verdict `severity` field promoted for audit/review/validator producers
  - §17.4 grimoires-as-interface promoted from SEED §12 to doctrine invariant

### Upstream

- **`0xHoneyJar/construct-base#11`** (MERGED 2026-04-22) — template v3: typed streams example, `identity/ARCHITECT.md` starter persona with UPPERCASE-filename convention, composition layer split (grimoire + stream), `CONSTRUCT-README.md` generation pattern documented.
- **`0xHoneyJar/loa#615`** (open, PR-only per SEED §11, @janitooor review) — `mount-loa.sh --with-constructs` / `--no-constructs` / `--constructs-pack <slug>` opt-in flags, `/loa-setup` wizard Step 5 adds the same onramp. Non-fatal on install failure; default off.

### Findings (F30 – F34)

- **F30** — cycle-002 SEED draft was never committed; policy gap for in-progress drafts inside `grimoires/`. Deferred.
- **F31** — installed symlinks drifted to full directory copies locally. Global-sync integrity check candidate for cycle-006.
- **F32** — 27 of 29 installed packs have §12 grimoires drift in `CLAUDE.md`. L6 butterfreezone generator is the batch-regen path.
- **F33** — `construct-network-tools` pack doesn't exist; L5 default-off remains correct until bundle ships. Operator decides pack composition.
- **F34** — `constructs-publish.sh` reporter truncates `manifest_validate` detail line. Display-layer polish for cycle-006.

### Known deferred

- **L10 (F24 `.source.json` three-way-merge)** — CONDITIONAL per SEED; skipped cleanly. Carries to cycle-006.
- **Failure-policy runner enforcement (§17.2)** — vocabulary set this cycle; enforcement cycle-006.
- **Real LLM dispatch in stage executor** — swap-in point ready (`--executor` / `$LOA_COMPOSE_STAGE_EXECUTOR`). Cycle-006+.

### Cycle authorship

Cycle-005 · agent + integration (runtime + ecosystem-coherence). Conversational-paired + shell-first. 9 of 10 legs landed; 2 upstream review-gated. Doctrine v4 chain-preserved; v5 active.

## [2.10.0] - 2026-04-21

### Why This Release

**Pipe doctrine + agent-first toolchain.** Four cycles of tending produced a structural shift in how constructs are understood and invoked: as Unix-pipe stages composing via typed streams. Agent transparency became a first-class invariant. Operator OS inverted from canonical spec to starter template so other operators can author their own workflows on top of the shared substrate.

Flatline triple-model adversarial review (Opus + GPT-5.3-codex + Gemini 2.5 Pro) validated doctrine v4 at 100% model agreement; 11 blockers logged for forward cycles (no retroactive amendment).

Zero TypeScript shipped. All 700+ net new lines are shell + doctrine + YAML — Jani's Unix-first approach doctrinally validated.

### Added

#### Bonfire Doctrine — Constructs as Unix Pipes (cycle-002/003/004)

- **`bonfire-construct-pipe-doctrine.md`** v1 → v4 — 445 lines naming the compositional substrate under the construct network
- **Five stream types** declared at doctrine level: `Signal` / `Verdict` / `Artifact` / `Intent` / `Operator-Model`
- **Compositions as pipe-chain specifications** per doctrine §4 — two kinds (workflow-kind + frame-kind per §15.2)
- **Agent-transparency invariant** (§16.4) — "what's informing this response" answerable in read-mode latency (<1s glance, ~5s orient, ~15s intervene)
- **Everything is a computer** (§14.1, per Eileen) — every actor in the network takes typed I/O and applies a transform

#### Agent-facing tooling (cycle-003/004)

- **`constructs-list.sh`** — agent-facing pack enumeration with three read-modes (glance/orient/intervene), source-state + drift detection
- **`constructs-active.sh`** — active-context reporter answering doctrine §16.4 transparency invariant; combines trajectory + feedback-v3 + project CLAUDE.md + installed packs
- **`construct-invoke.sh`** (patched) — emits `stream_type` + `read_mode` fields on trajectory JSONL rows
- **`feedback-v3-emit.sh`** — Verdict-stream writer with schema validation
- **`construct-index-gen.sh`** (patched) — auto-fallback to `~/.loa/constructs/packs/` when project-local empty (F27); extracts persona handles from `identity/<HANDLE>.md` filenames (F28)
- **`construct-resolve.sh`** (patched) — 5-tier deterministic dispatch: slug → name → command → persona → no-match; `/` + `@` prefix stripping

#### Trajectory hooks (cycle-003)

- **PreToolUse:Skill + PostToolUse:Skill** hooks — `.claude/hooks/trajectory/skill-pre.sh` + `skill-post.sh`
- Auto-fire on Skill tool use; resolves to installed pack; emits paired entry/exit rows to `.run/construct-trajectory.jsonl`
- Non-THJ skills silently skip (no trajectory pollution)

#### Compositions (cycle-004)

- **`grimoires/compositions/feel-audit.yaml`** — first workflow-kind composition per doctrine §15.2; composes artisan + observer symmetrically
- Shipped in `grimoires/compositions/` (checkable) — supersedes cycle-001 folklore in gitignored `.claude/constructs/compositions/` (F29)

#### Doctrine + hivemind pages

- **`cycle-004-L2-invocation-contract.md`** — 5-tier dispatch spec, frame conflict resolution, known debt (KEEPER collision, `/feel` pack-binding decision)
- **`~/hivemind/wiki/concepts/operator-os-starter-template.md`** — template inverting operator's CLAUDE.md from canon to fork-source
- **`~/hivemind/wiki/concepts/hivemind-trichotomy.md`** — 5-layer hivemind architecture cleanly named (construct / skill / knowledge-personal / knowledge-org / archivist)
- **`~/hivemind/wiki/concepts/construct-pipe-doctrine.md`** — hivemind-synced copy of canonical doctrine

#### Four cycle-findings docs

- `cycle-001-findings.md` · `cycle-002-findings.md` · `cycle-003-findings.md` · `cycle-004-findings.md` — OTLET chain-preserved across authorship shifts (OSTROM → operator → agent)

### Changed

- **Cycle-001** operational-token middleware (PR #191) + pagination fix (F15) — still active, now with stream_type awareness
- **Tag `cycle-001-last-supabase`** marks last commit before sovereign stack migration (commit `49ce22b2`)
- **F26** Adversarial review env setup — triple-model flatline now operational with ANTHROPIC + GOOGLE + OPENAI keys

### Findings logged

- F22 (cycle-003) · .source.json missing on pre-existing installs (fresh installs write correctly)
- F23 · Symlink validation on non-standard install targets
- F24 · AC-C4 three-way-merge NOT implemented (cycle-005 inheritance)
- F25 · Install is lazy-skip on re-install
- F26 · Adversarial review env gap (now resolved)
- F27 (cycle-004) · `construct-index-gen` path defaulted wrong — **closed**
- F28 · Packs don't declare personas/commands — persona tier fixed, commands tier pending upstream PRs
- F29 · `.claude/constructs/` fully gitignored — **closed** via grimoires/compositions/

### Deferred to cycle-005+

Flatline doctrine review surfaced 11 blockers routed to forward cycles:
- **cycle-005**: stream schemas (SKP-001), determinism-split (SKP-002), failure semantics (SKP-003), composition runner
- **cycle-006**: security model (SKP-004), data governance (SKP-005), trust model
- **cycle-007+**: JSONL append integrity hardening (SKP-006)

### Authorship ladder

- **Cycle-001** · OSTROM-lens (architecture-first): 7 legs decomposed, harness-dispatched, clean but dry
- **Cycle-002** · operator-lens (experience-first paired-scribe): infrastructure drift revealed; Supabase pause as forcing function
- **Cycle-003** · agent-lens (first-person toolchain walk): trajectory wiring + transparency tools shipped
- **Cycle-004** · same agent + doctrine (open playground): Operator OS inverted, hivemind trichotomy named, first workflow-kind composition

---

## [2.9.0] - 2026-02-28

### Why This Release

Agent-Native Output Protocol — teaching the Constructs Network to speak a second language. TOON encoding for agent context windows, CTA protocol for pull-based command discovery, hash divergence detection, and lazy-loading contract documentation. Bridge reviewed with flatline convergence in 3 iterations.

### Added

#### TOON Encoder (cycle-037)

- **TOON (Token-Oriented Object Notation)** — header+CSV tabular format achieving ~39.6% token reduction for agent consumers (`toon-lib.sh`)
- **4-arg format router** — `format_tabular_output(label, tabular_json, original_payload, fallback_fn)` separates data shapes to prevent fallback mismatch
- **Source guard** — `_TOON_LIB_LOADED` prevents re-parsing toon-lib.sh on every invocation

#### CTA Protocol

- **Per-invocation CTA** — `Next:` block with up to 3 context-sensitive command suggestions (`skill-cta.md`)
- Context-aware: install, status, browse, list contexts emit different CTAs

#### Hash Divergence Detection

- `[DIVERGED]` status when version matches but content hash (Merkle SHA-256) differs
- Shared status data collection — single fetch pass feeds both TOON and markdown rendering (Monarch pattern)

#### Documentation

- **Lazy-loading contract** (`runtime-contract.md`) — formal spec: skills auto-load on invocation, only index.yaml at session start
- **`workflow_next` field** — cross-construct navigation hints in PackManifest schema

### Changed

- `do_status_pack()` refactored to shared data collection architecture (bridge review medium-1, medium-2)
- `_show_all_packs_md()` now renders from pre-collected JSON instead of re-fetching (pure function)
- PRD, SDD, sprint plan updated for cycle-037

## [2.8.0] - 2026-02-27

### Why This Release

Constructs Network Distribution Layer — the first CLI tooling for installing, syncing, and managing constructs outside the marketplace UI. Three-phase delivery with bridge reviews, GPT 5.3-codex cross-model security audit, and kaironic flatline termination. Plus DNS infrastructure mapping for the upcoming Route 53 migration.

### Added

#### CLI Distribution Commands (cycle-036)

- **`constructs install <slug>`** — registry-backed pack installation with HTTPS-only verification, post-install hooks, and Merkle SHA-256 content hashing
- **`constructs sync <slug>`** — pull latest version from registry with curl config injection protection (SHELL-002 pattern)
- **`constructs status [slug]`** — version + content-hash staleness reporting (SYNCED/DIVERGED/BEHIND/UNKNOWN indicators)
- **`constructs register <slug>`** — reserve construct slugs with git repo preflight validation
- **Shared library** (`constructs-lib.sh`) — Merkle SHA-256 content hashing, URL validation, safe identifier checks, registry URL resolution
- **`--standalone` audit flag** for `validate-skills.sh` — scans pack skills for unguarded context slots and grimoire references

#### Golden Path Integration

- `/loa` status command now shows construct health alongside workflow state
- `detect_state()` auto-discovers installed packs and skills with path traversal containment
- Skill update notifications when registry has newer versions
- Per-invocation Next Steps CTAs added to all 39 pack skills

#### Research & Infrastructure

- DNS infrastructure mapping for AWS Route 53 migration (`grimoires/bridgebuilder/dns-infrastructure-mapping.md`)
- Agent-native CLI landscape research — Warp, Fig, Cursor, Cline patterns (`grimoires/bridgebuilder/agent-native-cli-landscape-research.md`)
- CLI vs MCP architecture research — incur patterns (`grimoires/bridgebuilder/incur-cli-vs-mcp-research.md`)

### Changed

- GPT review models upgraded to `gpt-5.3-codex` (from 5.2-codex)
- `browsing-constructs` skill updated with CLI command routing
- `seed-forge-packs.ts` uses recursive `canonicalStringify()` for deterministic manifest hashing (fixes nested key loss with `JSON.stringify` array replacer)
- Register API endpoint reordered: git URL validation runs before `createPack` to prevent orphaned DB registrations

### Fixed

#### Security (GPT 5.3-codex Cross-Model Review)

- **Path traversal** — trailing slash comparison + `realpath` + `python3` fallback for macOS portability
- **Curl config injection** — CR/LF/quote validation before writing API keys to curl config files in register + sync commands
- **HTTPS enforcement** — `.refine()` validator on `git_url` field in register API
- **userId guard** — explicit `Unauthorized` error when auth context missing in register endpoint
- **Timeout portability** — `timeout` → `gtimeout` fallback chain, skip execution when unavailable (macOS)
- **Hook sandboxing** — post-install hooks skip with warning instead of executing unbounded when no timeout binary available

### Constructs

| Construct | Repo | Skills |
|-----------|------|--------|
| Observer | `construct-observer` | 6 |
| Crucible | `construct-crucible` | 5 |
| Artisan | `construct-artisan` | 14 |
| Beacon | `construct-beacon` | 6 |
| GTM Collective | `construct-gtm-collective` | 8 |
| Protocol | `construct-protocol` | 10 |

### Quality Gates

- **Bridge review**: 3 iterations to flatline across all 3 phases (kaironic termination at score 0.00)
- **GPT 5.3-codex**: 2 iterations — 5 critical/major findings fixed, approved with 3 minor defense-in-depth suggestions
- **Syntax validation**: All shell scripts pass `bash -n`, TypeScript 0 errors

---

## [2.7.0] - 2026-02-26

### Why This Release

Ecosystem architecture grounded to reality. Four phantom constructs stripped, Protocol registered as the 6th construct, and 8 development cycles (034–042) shipped — spanning measurement honesty, memory sovereignty, multi-model adversarial review, and vision-aware planning.

### Added

#### Construct Registry

- **construct-protocol** registered as the 6th construct (10 skills: contract-verify, tx-forensics, abi-audit, proxy-inspect, simulate-flow, dapp-lint, dapp-typecheck, dapp-test, dapp-e2e, gpt-contract-review)
- Ecosystem architecture diagram now shows all 6 registered constructs with accurate skill counts (49 total)
- Herald and Hardening moved to "Planned Constructs" section

#### Cycles 034–042

- **cycle-034**: Declarative Execution Router + Adaptive Multi-Pass (#404)
- **cycle-035**: Measurement Honesty — signals API, fork provenance, graduation fix, DB resilience (#406)
- **cycle-036**: Quick-Win UX Fixes (#407)
- **cycle-038**: Organizational Memory Sovereignty — Three-Zone State Architecture (#410)
- **cycle-039**: Two-Pass Bridge Review Pipeline (#411, #412)
- **cycle-040**: Multi-Model Adversarial Review — GPT-5.3-Codex + Gemini Tertiary (#414)
- **cycle-041**: Vision-Aware Planning — Creative Agency for AI Peers (#416)
- **cycle-042**: Vision Activation — From Infrastructure to Living Memory (#417)

#### Ecosystem Documentation

- Full ecosystem architecture diagram with ELI5 explanations (#418)
- Naming lineage: Vodou via Tallant/Deren → Gibson → Loa (#419)
- Constructs Network distribution plane diagram (#420)

### Changed

- Topology validator reduced from 8 to 7 checks — legacy naming scan removed (no longer needed)
- Default codex model upgraded to gpt-5.3-codex
- Codex models routed to OpenAI Responses API instead of chat/completions
- `MELANGE_DISCORD_WEBHOOK` → `DISCORD_WEBHOOK_URL` in post-merge workflow

### Removed

- **Melange** references stripped from ecosystem docs (archived Dune naming — never operationalized)
- **Rune** references stripped (dissolved into Artisan construct)
- Legacy naming scan (Check 7) removed from topology validator

### Fixed

- Explorer 500 on construct detail pages
- API response parsing (caught by GPT cross-review)
- Collateral deletion safeguard bug (#331)
- Railway Docker build — DTS generation disabled
- API statement_timeout + real DB health check to prevent infinite hangs
- Next.js 15.1.0 → 15.1.9 security upgrade (CVE-2025-66478: react2shell)
- JSON-LD XSS via `</script>` injection
- Vercel build timeouts — ISR on-demand, API-independent builds, Suspense wrapping
- Flatline scoring engine 3-model tertiary cross-scoring (#415)
- gpt-5.2-codex backward-compat alias + Responses API token tracking

### Constructs

| Construct | Repo | Skills |
|-----------|------|--------|
| Observer | `construct-observer` | 6 |
| Crucible | `construct-crucible` | 5 |
| Artisan | `construct-artisan` | 14 |
| Beacon | `construct-beacon` | 6 |
| GTM Collective | `construct-gtm-collective` | 8 |
| Protocol | `construct-protocol` | 10 |

---

## [1.5.0] - 2026-02-05

### Why This Release

This release hoists MCP server ownership from individual packs to the network level, introduces per-pack changelogs with CI enforcement, and strengthens the validation pipeline.

### Changed

#### MCP Architecture: Network-Level Server Ownership

- Removed `mcp_servers` field from pack manifest schema (JSON Schema, TypeScript, Zod)
- MCP server definitions now live exclusively in `.claude/mcp-registry.yaml` with full runtime config (transport, command, security)
- Artisan pack converted from MCP provider to peer consumer via `mcp_dependencies`
- All packs are now equal consumers — no pack "owns" an MCP server

#### Per-Pack Changelogs

- Added `CHANGELOG.md` to all 5 packs (Artisan, Observer, Crucible, Beacon, GTM Collective)
- Keep a Changelog 1.1.0 format with independent semver per pack

#### CI Validation Pipeline

- `validate-packs` job now runs Zod schema validation via `validate-pack-manifests.mjs`
- MCP dependency resolution check via `validate-mcp-deps.sh`
- Version bump enforcement via `check-pack-versions.sh`
- Skill enrichment audit via `constructs-audit-index.sh` (39/39 skills)

### Fixed

- Removed invalid `dependencies: []` from pack manifests (should be object, not array)

### Pack Versions

| Pack | Version |
|------|---------|
| Artisan | 1.3.0 |
| Observer | 1.0.2 |
| Crucible | 1.0.3 |
| Beacon | 1.0.2 |
| GTM Collective | 1.0.0 |

---

## [1.1.0] - 2026-02-02

### Why This Release

This release implements Projen-style ownership patterns (RFC #66), aligning loa-registry with the upstream Loa framework's managed scaffolding architecture. It also addresses security audit findings to harden credential storage, JWT handling, and privacy compliance.

### Added

#### Projen-Style Ownership Alignment (RFC #66)

- **Magic Markers** - Pack-installed files now include ownership markers
  - `@pack-managed` markers for `.md`, `.yaml`, `.yml` files
  - SHA-256 hash (16 chars) for integrity verification
  - Detection of user modifications via `verifyPackMarkerIntegrity()`
  - Functions: `shouldAddMarker`, `addPackMarker`, `hasPackMarker`, `extractPackMarker`, `removePackMarker`

- **Client-Side Feature Gating** - Offline pack control via `.loa.config.yaml`
  - `constructs.disabled_packs` configuration option
  - Pack installation blocked with clear guidance for disabled packs
  - `[disabled]` indicator in `pack-list` output
  - Functions: `loadLoaConfig`, `isPackEnabled`, `getDisabledPacks`

- **CLAUDE.md Fragments** - Pack-contributed instruction fragments
  - `claude_instructions` field in pack manifest schema
  - Server-side validation (file must exist, max 4KB size)
  - CLI writes fragment to `.claude/packs/{slug}/pack-claude.md`
  - `@import` instructions displayed after successful install

### Security

#### Audit Remediations (SECURITY-AUDIT-REPORT 2026-02-02)

- **H-001: Secure Credential Storage** (CVSS 6.5)
  - File permissions (0600) on credentials.json via `configFileMode`
  - Credential directory permissions (0700) on creation
  - Auto-fix overly permissive directory permissions on Unix systems
  - Location: `packages/loa-registry/src/auth.ts`

- **H-002: Remove JWT Fallback Secret** (CVSS 7.1)
  - Removed hardcoded `development-secret-at-least-32-chars` fallback
  - JWT_SECRET required in all environments (not just production)
  - Clear error message with `openssl rand -base64 32` example
  - Locations: `apps/api/src/services/auth.ts`, `apps/api/src/routes/packs.ts`

- **H-003: Privacy-Compliant Anonymous Licenses** (CVSS 4.3)
  - Replaced IP-based watermarking with random session ID (crypto.randomUUID)
  - Improved privacy/GDPR compliance for anonymous users
  - Location: `apps/api/src/routes/packs.ts`

### Changed

- CLI plugin version bumped to 0.4.0
- Pack install now adds markers to all supported file types
- Pack list now shows disabled pack count in summary

### Test Coverage

- 48 new tests for pack-marker utilities
- 26 new tests for config loading
- All 94 CLI tests passing

---

## [1.0.0] - 2025-12-31

### Why This Release

This is the initial production release of Loa Skills Registry, completing all 15 sprints of development. The platform provides a complete SaaS solution for distributing, licensing, and monetizing AI agent skills compatible with the Loa framework and Claude Code.

### Added

#### Core Platform (Sprints 1-4)

- **Authentication System**
  - JWT-based authentication with access/refresh tokens
  - bcrypt password hashing (cost factor 12)
  - Email verification flow
  - Password reset with secure tokens
  - OAuth integration (GitHub, Google)
  - API key authentication with `sk_live_`/`sk_test_` prefixes

- **Database Schema**
  - PostgreSQL via Drizzle ORM
  - 15+ tables: users, teams, subscriptions, skills, packs, licenses, audit_logs
  - Proper indexes and foreign key constraints
  - JSONB fields for flexible metadata

- **Subscription System**
  - Four tiers: Free, Pro, Team, Enterprise
  - Stripe integration for payments
  - Webhook handling for subscription lifecycle
  - Tier-based access control

- **Skills API**
  - CRUD operations for skills
  - Version management with semver
  - File storage on Cloudflare R2
  - Download tracking and analytics
  - Category and tag filtering
  - Search functionality

#### Dashboard (Sprints 5-6)

- **Authentication Pages**
  - Login, Register, Forgot Password, Reset Password
  - Email verification flow
  - OAuth buttons for GitHub/Google
  - Protected route wrapper

- **Dashboard Core**
  - Responsive layout with sidebar navigation
  - Dashboard home with stats overview
  - Skill browser with search and filters
  - Skill detail pages
  - Billing management
  - Profile settings
  - API key management

#### CLI Plugin (Sprints 7-8)

- **Core Commands**
  - `login` - Authenticate with registry
  - `logout` - Clear credentials
  - `whoami` - Show current user
  - `search` - Search for skills
  - `info` - Get skill details

- **Installation Commands**
  - `install` - Install a skill
  - `update` - Update installed skills
  - `uninstall` - Remove a skill
  - `list` - List installed skills

- **License Validation**
  - Local license file storage
  - Expiration checking
  - Watermark tracking

#### Team Management (Sprint 9)

- **Team API**
  - Create and manage teams
  - Member management (add, remove, change role)
  - Role hierarchy: owner > admin > member
  - Team-scoped subscriptions

- **Invitation System**
  - Email invitations with secure tokens
  - Accept/decline flow
  - Expiration handling
  - Invitation revocation

- **Dashboard Pages**
  - Team list and creation
  - Team settings and members
  - Team billing

#### Analytics & Creator Tools (Sprint 10)

- **Usage Analytics**
  - Per-user usage tracking
  - Skill installation metrics
  - Time-series data

- **Creator Dashboard**
  - Published skills overview
  - Download statistics
  - Revenue tracking (future)

- **Skill Publishing**
  - Multi-step publish flow
  - Version management
  - File upload interface

#### Enterprise Features (Sprint 11)

- **Audit Logging**
  - Comprehensive event tracking
  - User, team, and resource scoping
  - Queryable via API
  - 40+ event types

- **Enhanced Rate Limiting**
  - Sliding window algorithm
  - Tier-based limits
  - Redis-backed for distributed systems

- **Security Hardening**
  - Security headers (CSP, HSTS, X-Frame-Options)
  - CSRF protection (double-submit cookie)
  - Input sanitization utilities

#### Launch Prep (Sprint 12)

- **E2E Testing**
  - Playwright test suite
  - Critical path coverage
  - CI integration

- **API Documentation**
  - OpenAPI/Swagger spec
  - Interactive documentation at `/v1/docs`

- **Deployment Configuration**
  - Fly.io configuration
  - Health checks
  - Rolling deployments

- **Monitoring**
  - Structured logging with Pino
  - Sentry integration for error tracking
  - Performance metrics

#### Pack System (Sprints 13-15)

- **Pack Database Schema** (Sprint 13)
  - 5 new tables: packs, pack_versions, pack_files, pack_subscriptions, pack_installations
  - Pricing types: free, one_time, subscription
  - Status workflow: draft → pending_review → published

- **Pack API** (Sprint 13)
  - CRUD operations for packs
  - Version management
  - Manifest validation
  - Download with subscription check

- **Token Blacklisting** (Sprint 13)
  - Redis-based token revocation
  - True logout functionality
  - Fail-secure on Redis errors

- **GTM Import Script** (Sprint 14)
  - Bulk pack import from JSON
  - Skill bundling
  - File generation

- **CLI Pack Commands** (Sprint 15)
  - `pack-install` - Install a pack
  - `pack-list` - List installed packs
  - `pack-update` - Update packs
  - License storage per pack

- **Admin API** (Sprint 15)
  - User management (list, view, update)
  - Pack moderation (approve, reject, feature)
  - Tier override capability
  - Audit logging for all actions

### Security

- **Authentication**
  - JWT with HS256 signing
  - 15-minute access token expiry
  - 30-day refresh token expiry
  - Token blacklisting for revocation
  - Production JWT_SECRET enforcement (≥32 chars)

- **Authorization**
  - Role-based access control
  - Ownership verification
  - Team permission hierarchy
  - Admin self-modification prevention

- **Input Validation**
  - Zod schemas on all endpoints
  - SQL injection prevention via Drizzle ORM
  - Path traversal prevention
  - XSS prevention via CSP

- **Rate Limiting**
  - Tier-based limits (100-1000 req/min)
  - Stricter auth endpoint limits (10 req/min)
  - Fail-closed for auth endpoints on Redis errors
  - IP-based limiting for unauthenticated requests

- **Infrastructure**
  - HTTPS enforced
  - Security headers on all responses
  - Secrets via environment variables
  - No hardcoded credentials

### Technical Stack

| Component | Technology |
|-----------|------------|
| API | Hono + Node.js |
| Database | PostgreSQL (Supabase) + Drizzle ORM |
| Cache | Redis (Upstash) |
| Storage | Cloudflare R2 |
| Auth | JWT RS256 (jose) + bcrypt |
| Email | Resend |
| Frontend | Next.js 14 + Tailwind CSS |
| Hosting | Railway |
| Monorepo | Turborepo + pnpm |

### API Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/register` | Create account |
| POST | `/v1/auth/login` | Login |
| POST | `/v1/auth/refresh` | Refresh tokens |
| POST | `/v1/auth/logout` | Logout (blacklists token) |
| POST | `/v1/auth/forgot-password` | Request password reset |
| POST | `/v1/auth/reset-password` | Reset password |
| POST | `/v1/auth/verify-email` | Verify email |
| GET | `/v1/auth/me` | Get current user |

#### Skills
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/skills` | List/search skills |
| GET | `/v1/skills/:slug` | Get skill details |
| POST | `/v1/skills` | Create skill |
| PATCH | `/v1/skills/:slug` | Update skill |
| DELETE | `/v1/skills/:slug` | Delete skill |
| GET | `/v1/skills/:slug/download` | Download files |
| POST | `/v1/skills/:slug/install` | Record install |

#### Packs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/packs` | List packs |
| GET | `/v1/packs/:slug` | Get pack details |
| POST | `/v1/packs` | Create pack |
| PATCH | `/v1/packs/:slug` | Update pack |
| GET | `/v1/packs/:slug/download` | Download pack |
| POST | `/v1/packs/:slug/versions` | Add version |

#### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/teams` | List user's teams |
| POST | `/v1/teams` | Create team |
| GET | `/v1/teams/:slug` | Get team details |
| PATCH | `/v1/teams/:slug` | Update team |
| DELETE | `/v1/teams/:slug` | Delete team |
| POST | `/v1/teams/:slug/invite` | Invite member |
| POST | `/v1/teams/:slug/members/:id/remove` | Remove member |

#### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/admin/users` | List users |
| GET | `/v1/admin/users/:id` | Get user details |
| PATCH | `/v1/admin/users/:id` | Update user |
| GET | `/v1/admin/packs` | List all packs |
| PATCH | `/v1/admin/packs/:id` | Moderate pack |
| DELETE | `/v1/admin/packs/:id` | Remove pack |

### Test Coverage

- 76 API tests passing
- E2E tests for critical paths
- Type checking across all packages
- Security audit: APPROVED

### Sprint Summary

| Sprint | Focus | Status |
|--------|-------|--------|
| 1 | Project Setup & Auth | COMPLETED |
| 2 | Skills CRUD & Storage | COMPLETED |
| 3 | Subscriptions & Stripe | COMPLETED |
| 4 | Skills API Polish | COMPLETED |
| 5 | Dashboard Auth | COMPLETED |
| 6 | Dashboard Core | COMPLETED |
| 7 | CLI Plugin Core | COMPLETED |
| 8 | CLI Install & License | COMPLETED |
| 9 | Team Management | COMPLETED |
| 10 | Analytics & Creator | COMPLETED |
| 11 | Enterprise Features | COMPLETED |
| 12 | Polish & Launch Prep | COMPLETED |
| 13 | Security & Pack Foundation | COMPLETED |
| 14 | GTM Collective Import | COMPLETED |
| 15 | CLI Pack Commands & Polish | COMPLETED |

### Documentation

- [README.md](README.md) - Project overview
- [SECURITY-AUDIT-REPORT.md](SECURITY-AUDIT-REPORT.md) - Security audit
- [loa-grimoire/prd.md](loa-grimoire/prd.md) - Product requirements
- [loa-grimoire/sdd.md](loa-grimoire/sdd.md) - System design
- [loa-grimoire/sprint.md](loa-grimoire/sprint.md) - Sprint plan

---

[2.7.0]: https://github.com/0xHoneyJar/loa-constructs/releases/tag/v2.7.0
[1.5.0]: https://github.com/0xHoneyJar/loa-constructs/releases/tag/v1.5.0
[1.1.0]: https://github.com/0xHoneyJar/loa-constructs/releases/tag/v1.1.0
[1.0.0]: https://github.com/0xHoneyJar/loa-constructs/releases/tag/v1.0.0

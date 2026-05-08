# Sprint Plan: Construct Bounded-Context Runtime Substrate

**Cycle**: cycle-construct-bounded-context (TBD — final ID assigned at cycle creation)
**Created**: 2026-05-08
**Status**: Draft (simstim Phase 5)
**PRD**: `grimoires/loa/prd.md` (post-Flatline + Bridgebuilder integrated)
**SDD**: `grimoires/loa/sdd.md` (post-Flatline tier-conditional reframe)
**Simstim ID**: simstim-20260508-96627a1c

---

## Overview

The substrate is decomposed into 7 sprints (Sprint 0 through Sprint 6), sequenced to deliver the **strong contract layer** first (envelope schemas + validators + hash chain — usable on all platforms) before the **tier-conditional isolation layer** (advisory then strict).

The split lines (CONTRACT vs RUNNER, per SDD §11.1) are honored in the sprint structure so a future package extraction is a refactor, not redesign.

| Sprint | Theme | Layer | Acceptance gate | Dependencies |
|---|---|---|---|---|
| Sprint 0 | Schemas + tier config | CONTRACT | Schemas validate; tier config matches FR-3.3 | None |
| Sprint 1 | Validators (pre/post-exec, prereq check) | CONTRACT | Reject out-of-graph compositions; block contract violations; reject strict tier without prereqs | Sprint 0 |
| Sprint 2 | Envelope builder + hash chain + dry-run | RUNNER (with portable hash core) | Dry-run prints per-stage envelope; chain-break detection works; chain validates per §3.1 algorithm | Sprint 0, 1 |
| Sprint 3 | Stage executor — advisory tier | RUNNER | `audit-feel` golden path runs end-to-end on advisory tier; no command injection; provider memory disable verified | Sprint 2 |
| Sprint 4 | Stage executor — strict tier + adversarial suite | RUNNER (strict-tier add-on) | All 12 adversarial tests pass on Linux+bwrap+CAP_NET_ADMIN | Sprint 3 |
| Sprint 5 | Persistent state + iteration auditor | RUNNER + CONTRACT (state schema) | Persistent state survives GC race; iteration dual-run produces L1+L2+L3 diff | Sprint 2, 3 (independent of 4) |
| Sprint 6 | Manifest migration + legacy compat + docs | DATA + DOCS | Top-12 manifests in strict tier; advisory packs surface tier marker in registry; runbooks shipped | Sprint 0, 1, 5 |

**Total estimated effort**: 7 sprints, ~3-5 days each, 3-5 weeks calendar with serial sprint execution.

**Parallelization opportunities**:
- Sprint 5 can run in parallel with Sprint 4 (independent codebases).
- Sprint 6 manifest migrations can begin during Sprint 1 (data-only work, no dependency on runner code).

---

## Sprint 0: Foundation — Schemas + Tier Config

**Goal**: Land the immutable contract that every later sprint depends on. Strong contract that's portable across runtimes (Finn, Hounfour, future composition platforms).

**Layer**: CONTRACT (per SDD §11.1)

**Tasks**:

| ID | Task | Acceptance | Estimate |
|---|---|---|---|
| S0-T1 | Author `loa.construct.invocation.v0` schema at `.claude/schemas/runtime/construct-invocation-v0.schema.json` | Schema validates against test fixtures (valid + invalid envelopes); covers all FR-1.2 fields including `context_policy.{allowed_*, isolation_tier}` | 1 day |
| S0-T2 | Author `loa.construct.handoff.v0` schema at `.claude/schemas/runtime/construct-handoff-v0.schema.json` | Schema validates against test fixtures; covers all FR-2.2 fields including `status` enum, `error.code`, `partial_outputs.disposition` | 1 day |
| S0-T3 | Author `legacy-domain-contract` schema at `.claude/schemas/network/legacy-domain-contract.schema.json` | Schema rejects starter-only contracts (must have non-empty `out_of_domain` + ≥1 invariant) | 0.5 day |
| S0-T4 | Author validation-tier config at `.claude/data/construct-validation-tiers.yaml` per SDD §3.4 | Schema-validated YAML with strict/compatibility/advisory tiers; top-12 frozen list per FR-3.2 | 0.5 day |
| S0-T5 | Author `dry-run-fixture.schema.json` at `.claude/data/dry-run-fixture.schema.json` per SDD §4.7 | JSON Schema for dry-run output format (`composition`, `stages[]`, `errors[]`, `warnings[]`) | 0.5 day |
| S0-T6 | Extend `composition.schema.json` for `context_policy.{isolation_tier, allowed_egress, network_isolation_class, llm_session_strategy, allowed_mcp_tools, allowed_env_vars}` and `composition.{audit_signed, persistent_state_ttl_policy, iteration_mode, max_iterations, terminate_when}` | Existing compositions still validate; new fields accepted; constraints enforced (e.g., `iterate:` requires `max_iterations` + `terminate_when`) | 1 day |
| S0-T7 | Extend `construct.schema.json` to require `domain.{primary, ubiquitous_language, owns.streams, invariants, out_of_domain}` for strict-tier packs | Top-12 manifest authoring path validated; legacy manifests still pass with advisory marker | 1 day |
| S0-T8 | Extend stream schemas (`Signal`, `Verdict`, `Artifact`, `Intent`, `Operator-Model`) with `domain.{primary, produced_by}` extension fields | Existing stream payloads validate; new payloads with domain fields validate | 0.5 day |

**Sprint 0 Acceptance**:
- ✓ All 5 new schemas committed and validate test fixtures
- ✓ 3 existing schemas extended without breaking existing fixtures
- ✓ Tier config in place with top-12 frozen
- ✓ No executor or validator code yet — schemas only

**Verification**: CI job runs `python3 -m jsonschema --validate` against full fixture matrix. Merges blocked if any fixture fails.

**Effort**: ~6 days (1 person)

**Dependencies**: None (foundation sprint)

**Sprint 0 Status**: ✓ COMPLETED 2026-05-08 — full quality gate passed. Review approved (engineer-feedback.md, "All good with noted concerns"). Audit approved (auditor-sprint-feedback.md, "APPROVED - LETS FUCKING GO"). Adversarial cross-model deferred (OPENAI_API_KEY missing). PR #226. Beads bd-nobi.1 closed (review-approved + security-approved labels). 3 findings tracked forward: [HIGH] composition_id regex (S2-T3 blocker), [MEDIUM] iterate-constraint fixture (S1-T6), [MEDIUM] strict-tier conditional fixture (S6-T2). See `grimoires/loa/a2a/sprint-0/COMPLETED` + `grimoires/loa/a2a/audits/2026-05-08/`.

---

## Sprint 1: Validators — Pre-Exec, Post-Exec, Prereq

**Goal**: Schema-validated compositions. Contract-violation detection. Strict-tier prerequisite check that fails closed at flag-set time.

**Layer**: CONTRACT (per SDD §11.1 — portable across runtimes)

**Tasks**:

| ID | Task | Acceptance | Estimate |
|---|---|---|---|
| S1-T1 | Author `lib/compose-stream-graph.{sh,py}` per SDD §4.1 | Validator builds DAG from composition; rejects every error class (`[STREAM-NO-PRODUCER]`, `[STREAM-SCHEMA-MISMATCH]`, `[STAGE-OUT-OF-DOMAIN]`, `[ENVELOPE-CHAIN-BROKEN]`, `[ITERATION-NO-MAX]`, `[ITERATION-NO-TERMINATION]`) | 2 days |
| S1-T2 | Author `lib/output-gate.sh` per SDD §4.4 (post-exec output validator) | Validator confirms: writes contract match, schema validation, hash recompute, domain.produced_by attribution, output count match. Failure produces `[OUTPUT-CONTRACT-VIOLATION]` | 1.5 days |
| S1-T3 | Author strict-tier prerequisite check per FR-4.4 + SDD §6.5b | Detects `bwrap`, `CAP_NET_ADMIN`, provider memory-disable flag support; aborts with `[STRICT-TIER-PREREQ-MISSING]` exit 78 | 1 day |
| S1-T4 | Extend `construct-validate.sh` for tiered enforcement per SDD §3.4 | Strict packs fail closed without full domain block; compatibility packs require contract; advisory packs warn-only and `runner_eligibility: golden_path_blocked` | 1 day |
| S1-T5 | Pre-flight check for `audit_signed: true` per SDD §6.3 (audit-keys bootstrap) | Aborts with `[AUDIT-KEYS-NOT-BOOTSTRAPPED]` exit 78 + runbook reference if keys missing | 0.5 day |
| S1-T6 | Test fixtures: 6 composition YAMLs that should fail validation (one per error class) + 1 golden-path composition that should pass | All test fixtures behave per spec | 1 day |

**Sprint 1 Acceptance**:
- 6 typed errors all reproducible on synthetic compositions
- Top-12 packs that lack domain blocks fail validation in strict tier; pass in advisory
- `audit-feel` composition passes pre-execution validation
- No execution code yet — validators only

**Verification**: `bats tests/composition/validators/` — bats suite runs all error fixtures + golden path.

**Effort**: ~7 days

**Dependencies**: Sprint 0

---

## Sprint 2: Envelope Builder + Hash Chain + Dry-Run

**Goal**: Envelopes are real, content-addressed, hash-chained. Dry-run renders per-stage envelopes for visibility before enforcement.

**Layer**: RUNNER (envelope-builder.sh) + CONTRACT (envelope-chain.sh hash core)

**Tasks**:

| ID | Task | Acceptance | Estimate |
|---|---|---|---|
| S2-T1 | Author `lib/envelope-builder.sh` per SDD §4.2 | Builds invocation + handoff envelopes from composition + manifest + upstream handoffs; populates all FR-1.2 / FR-2.2 fields | 1.5 days |
| S2-T2 | Author `lib/envelope-chain.sh` implementing the §3.1 hash algorithm (worked example) | Two-pass hash construction (no self-reference), prev_hash topology per §3.1 chain diagram, JCS canonicalization via `lib/jcs.sh` | 1.5 days |
| S2-T3 | Implement `composition_id` deterministic derivation per IMP-001 / SDD §3.1 | Two YAMLs with different content produce different ids; same YAML produces same id across formatting changes | 0.5 day |
| S2-T4 | Author `compose-run.sh --dry-run --explain-context [--json]` per SDD §4.7 | Output validates against `dry-run-fixture.schema.json`; prints per-stage envelope preview, missing schemas, undeclared reads/writes, isolation viability | 1.5 days |
| S2-T5 | Hash chain validation at run startup + per-stage + replay | Chain-break detection produces `[ENVELOPE-CHAIN-BROKEN]`; replay re-canonicalizes and verifies | 1 day |
| S2-T6 | Test fixtures + sentinel test for tampering (mutate persisted envelope, verify chain-break detected) | Tampering tests pass; chain integrity verified on round-trip | 1 day |

**Sprint 2 Acceptance**:
- Dry-run on `audit-feel` produces full envelope chain preview
- Chain-break detection catches single-byte tampering
- `composition_id` is deterministic and stable
- No actual execution yet — envelopes built but no subprocess spawned

**Verification**: `bats tests/composition/envelopes/` — chain integrity + dry-run output validation.

**Effort**: ~7 days

**Dependencies**: Sprint 0, Sprint 1

---

## Sprint 3: Stage Executor (Advisory Tier)

**Goal**: Compositions run end-to-end on advisory tier. No security claims beyond contract + validation; isolation is informational.

**Layer**: RUNNER

**Tasks**:

| ID | Task | Acceptance | Estimate |
|---|---|---|---|
| S3-T1 | Refactor `stage-executor-tmux.sh` to use **argv-array invocation** (no `bash -c "<interpolated>"`) per SDD §4.3. Closes Flatline CRITICAL command-injection. | Code review confirms no string-interpolated subprocess; static analysis (e.g., shellcheck SC2086) clean | 1 day |
| S3-T2 | Implement env scrub: `env -i` + `allowed_env_vars[]` allowlist per FR-4.1 | Subprocess sees only allowlisted env vars; verified via test fixture that prints `env` | 0.5 day |
| S3-T3 | Implement fresh-pty wrapping via `script -q /dev/null <skill>` (argv array form) | Subprocess pty has no inherited scrollback; verified via test fixture | 0.5 day |
| S3-T4 | Implement advisory-tier filesystem allowlist: LD_PRELOAD (Linux) or DYLD_INSERT_LIBRARIES (macOS, when not signed) + in-process check fallback per SDD §2.1 | Cooperative constructs respect allowlist; documented as advisory (not enforcement) | 1.5 days |
| S3-T5 | Provider memory disable in cheval adapters (closes Flatline HIGH-5): `claude-headless --memory-disabled`, `codex-headless --no-chatgpt-memory`, `gemini-headless --no-saved-info` | Flag passed; provider verifies via response metadata | 1 day |
| S3-T6 | New LLM session ID per stage: `--session-id "stage-${run_id}-${stage_id}"` passed to model-invoke | Sessions verifiably distinct across stages | 0.5 day |
| S3-T7 | Path canonicalization via `realpath` before allowlist check (closes Flatline HIGH-3 symlink traversal). **TOCTOU acknowledgment** (closes Flatline HIGH on TOCTOU race): `realpath` happens at validation time; an adversarial construct could swap the symlink between check and use. Documented as **advisory-tier limitation** — strict tier (Sprint 4) uses bwrap read-only binds which close TOCTOU at the kernel layer. Add note to advisory-tier docs. | Symlink in `allowed_write_paths[]` pointing outside is rejected on advisory tier (best-effort); TOCTOU race documented as advisory limit; strict tier mitigates via bwrap | 0.5 day |
| S3-T8 | Wire post-exec output validator (Sprint 1) into stage executor flow | Stage handoff `status: failure` on contract violation; downstream stages refused | 0.5 day |
| S3-T9 | `audit-feel` golden path runs end-to-end on advisory tier | Run produces full envelope chain + handoff envelopes; output validates | 1 day |

**Sprint 3 Acceptance**:
- `audit-feel` composition completes end-to-end (Linux/macOS, advisory tier)
- No command injection (argv arrays only)
- Provider memory disable verified
- Path canonicalization closes symlink escape
- Negative test: removing `Signal` from stage 2 reads causes pre-execution validation failure

**Verification**: `bats tests/composition/golden/` — `audit-feel.bats` and negative tests.

**Effort**: ~7 days

**Dependencies**: Sprint 2

---

## Sprint 4: Stage Executor (Strict Tier) + Adversarial Suite

**Goal**: Strict-tier compositions on Linux+bwrap+CAP_NET_ADMIN. All 12 adversarial tests pass; substrate's strong claims (§6.5b strict tier) are gated by passing tests.

**Layer**: RUNNER (strict-tier add-on; conditional)

**Tasks**:

| ID | Task | Acceptance | Estimate |
|---|---|---|---|
| S4-T1 | Implement `bwrap` integration for filesystem namespace per SDD §4.3 strict tier | `--ro-bind` for read paths, `--bind` for write paths, `--unshare-pid`, `--unshare-uts`, `--die-with-parent` | 1.5 days |
| S4-T2 | Implement Linux network namespace integration (`--unshare-net` + bind for proxy port) | Raw sockets blocked at namespace level; only proxy egress permitted | 1 day |
| S4-T3 | Author `lib/egress-filter.py` userspace HTTP/HTTPS CONNECT proxy per SDD §2.3 | CONNECT-only for HTTPS (no MITM, no CA trust); host:port allowlist; logs to `egress.jsonl`; fail-closed on proxy death | 2 days |
| S4-T4 | Sentinel test for egress-proxy-die failure mode per SDD §2.3 fail-closed | Killing proxy mid-stage produces `[EGRESS-PROXY-DOWN]` within 1s | 0.5 day |
| S4-T5 | Author 12 adversarial test compositions per SDD §6.1 + §10.2 with **explicit per-test contract** (closes Flatline IMP-003): each fixture YAML names the specific leak vector, expected error code (e.g. `[POLICY-VIOLATION-WRITE]`), required tier, and pass/fail oracle. Tests: `read-unlisted-grimoire`, `read-unlisted-env`, `read-tmux-scrollback`, `escape-via-glob`, `continue-llm-session`, `invoke-undeclared-mcp`, `unlisted-egress`, `write-outside-allowlist`, `transcript-leak`, `escape-via-static-binary` (Go binary that opens /etc/passwd), `memory-feature-leak` (seed memory, verify fresh stage cannot recall), `gc-vs-running-composition`. **Effort revised per Flatline CRITICAL — 3 days was under-budgeted for the substrate's sole claim-validation gate.** | All 12 produce expected `[POLICY-VIOLATION-*]` errors and abort with documented per-test contracts | **10 days** (revised from 3) |
| S4-T6 | CI matrix per SDD §6.5b — **with untrusted-code isolation per Flatline CRITICAL #1**: `composition-strict-linux` runs on a **dedicated self-hosted runner** (not GitHub-hosted), gated to repo-maintainer PRs; community PRs run advisory-only until review approves strict-tier execution. `composition-advisory-linux` (no bwrap) + `composition-advisory-macos` run on standard GitHub-hosted runners for all PRs. | Strict CI gates merges on 12-test pass for repo-maintainer PRs; community PRs visible but require manual approval for strict-tier validation | 2 days |
| S4-T7 | **Bwrap network design enumeration** (closes Flatline HIGH on bwrap network gaps): document DNS handling (`--bind /etc/resolv.conf` or namespace-internal resolver), IPv6 policy (`--unshare-uts` does not affect IPv6 — explicit `ip6tables` or namespace egress block), loopback exposure (`--unshare-net` blocks loopback by default; egress proxy must bind to a namespace-bridged interface), raw protocols (ICMP/UDP blocked by namespace, no proxy bypass possible). Sentinel tests: `bwrap-dns-policy.yaml`, `bwrap-ipv6-block.yaml`, `bwrap-loopback-isolation.yaml`. | Network namespace closes all named gaps; sentinel tests pass | 2 days |
| S4-T8 | **CAP_NET_ADMIN deployment risk acknowledgment** (closes Flatline CRITICAL #3): document that strict-tier requires either dedicated host with limited surface (CI runner) or non-shared developer machine. Add `grimoires/loa/runbooks/strict-tier-deployment.md` covering: minimum host hardening, CI runner isolation, capability scope. Strict tier explicitly NOT recommended on shared multi-tenant hosts. | Runbook published; strict-tier deployments documented with host-trust requirements | 1 day |

**Sprint 4 Acceptance**:
- All 12 adversarial tests pass on Linux+bwrap+CAP_NET_ADMIN with explicit per-test contracts
- Strict-tier prerequisite check refuses degraded environments
- Egress proxy fail-closed verified by sentinel
- Bwrap network gaps (DNS, IPv6, loopback, raw protocols) all closed by namespace + sentinel tests
- CI matrix gates merges per tier with untrusted-code isolation
- Strict-tier deployment risks documented in runbook

**Verification**: `bats tests/composition/adversarial/` on `composition-strict-linux` CI job (dedicated runner). Required for merge from repo-maintainers; community PRs require manual approval.

**Effort**: ~17 days (revised from 9 per Flatline CRITICAL — 3-day adversarial test allocation was under-budgeted; bwrap network enumeration + CI isolation + deployment runbook are new tasks)

**Dependencies**: Sprint 3

---

## Sprint 5: Persistent State + Iteration Auditor

**Goal**: Persistent state with collision-free composite key, atomic-rename writes, GC-flock coordination. Iteration auditor with dual-run + L1/L2/L3 diff.

**Layer**: RUNNER + CONTRACT (state schema portable)

**Tasks**:

| ID | Task | Acceptance | Estimate |
|---|---|---|---|
| S5-T1 | Author `lib/persistent-state.sh` per SDD §4.5 + §3.3 | Composite key includes `stage_id` + `schema_version`; storage path canonical; atomic-rename writes (write tmp + fsync + rename); flock during read AND write | 2 days |
| S5-T2 | Implement TTL policy choice per SDD §3.3 (write vs access): default `write`, opt-in `access`. **State-poisoning safeguard** (closes Flatline HIGH): TTL extension is gated to writes from constructs declared in the state's owning skill — a foreign construct reading the state cannot extend its TTL. Every TTL extension records the construct slug + skill in the state file's audit trail. | Both policies tested; policy field recorded; foreign-construct TTL extension rejected with `[STATE-OWNERSHIP-VIOLATION]` | 1.5 days |
| S5-T3 | Author `compose-state-gc.sh` with GC race coordination per SDD §4.5 | GC acquires flock with 0-second timeout; refuses deletion if mtime within last 4h; runs daily via cron | 1 day |
| S5-T4 | Sentinel test: `gc-vs-running-composition.sh` per SDD §4.5 | Composition writes persistent state during GC run; state survives | 0.5 day |
| S5-T5 | Author `compose-iteration-audit.sh` per SDD §4.6 — Phase 1 (enumerate) | Walks `compositions/**/*.yaml`, finds every `iterate:` block, prints report | 1 day |
| S5-T6 | Implement `compose-run --dry-run --iteration-mode=dual` per SDD §4.6 — Phase 2 | Dual-run produces L1 (envelope diff, deterministic), L2 (output schema diff, deterministic), L3 (output payload diff, informational) per SDD §4.6 layered table | 2 days |
| S5-T7 | Implement opt-in flag `composition.iteration_mode: stream_edge` per FR-7.4 Phase 3 | New semantics gated by flag; legacy `persistent_leak` remains default | 0.5 day |
| S5-T8 | Iteration validation per FR-7.2 (enforce `max_iterations` + `terminate_when`) | Composition without these fields produces `[ITERATION-NO-MAX]` / `[ITERATION-NO-TERMINATION]` at validation | 0.5 day |

**Sprint 5 Acceptance**:
- Persistent state survives GC race in sentinel test
- Two compositions invoking the same skill at different stages see independent state (isolation test)
- Iteration dual-run produces L1+L2+L3 diff layers
- Opt-in iteration flag respected; default behavior unchanged

**Verification**: `bats tests/composition/state/` + `tests/composition/iteration/`. Race test runs in CI.

**Effort**: ~8 days

**Dependencies**: Sprint 2, 3 (independent of Sprint 4 — can parallelize)

---

## Sprint 6: Manifest Migration + Legacy Compat + Documentation

**Goal**: Top-12 packs migrated to strict tier with full domain blocks. Legacy packs have generated compatibility contracts. Documentation + runbooks shipped.

**Layer**: DATA (manifests, contracts) + DOCS

**Tasks**:

| ID | Task | Acceptance | Estimate |
|---|---|---|---|
| S6-T1 | Author `legacy-contract-bootstrap.sh` per SDD §2.4 / §5.4 | Generates starter contract from manifest + memory hits; rejected by validator until operator completes (non-empty `out_of_domain` + ≥1 invariant) | 1 day |
| S6-T2 | Author full domain block in manifest for each of top-12 packs: `artisan`, `observer`, `protocol`, `beacon`, `mibera-codex`, `k-hole`, `the-easel`, `gecko`, `crucible`, `hardening`, `kansei`, `showcase` | Each manifest validates strict-tier; appears in registry with `validation_tier: strict` | 4 days (parallelizable) |
| S6-T3 | Generate starter compatibility contracts for legacy packs (non-top-12, in-use) | Bootstrap script produces starters; operator manually completes for at-risk packs | 1 day |
| S6-T4 | Author `construct-usage-rank.sh` per SDD §3.5 (with signal-cleaning rules per Bridgebuilder HIGH-3) | Script produces ranking with signal breakdown; required manifest-reference signal | 1 day |
| S6-T5 | Author `grimoires/loa/runbooks/envelope-schema-migration.md` per FR-1.4 | Documents v0 → eventual v1 migration path; `audit_emit_signed` opt-in steps | 1 day |
| S6-T6 | Update `grimoires/loa/runbooks/audit-keys-bootstrap.md` to reference composition `audit_signed: true` flag and the pre-flight check (FR-6 / SDD §6.3) | Runbook covers composition opt-in; pre-flight failure mode documented | 0.5 day |
| S6-T7 | Author operator-facing doc for `context_policy` fields, isolation tier choice, prerequisite check | New doc at `grimoires/loa/runbooks/context-policy-guide.md` | 1 day |
| S6-T8 | Update `BUTTERFREEZONE.md` with substrate availability + tier ecosystem note | Substrate listed; tier matrix referenced | 0.5 day |

**Sprint 6 Acceptance**:
- Top-12 packs all in strict tier with non-empty domain blocks
- `construct-active` reports tiers per pack
- Runbooks shipped for: envelope migration, audit-keys bootstrap composition usage, context-policy operator guide
- BUTTERFREEZONE updated

**Verification**: `construct-validate.sh --all --strict` returns 0; manifest validation CI passes.

**Effort**: ~10 days (with parallelizable T2)

**Dependencies**: Sprint 0 (schemas), Sprint 1 (validator), Sprint 5 (manifest in registry — could partially parallel)

---

## Cross-Sprint Concerns

### Adversarial Test Authoring

The 12 adversarial tests in Sprint 4 are the substrate's claim-validation gate. Author them carefully:
- Each test fixture must be self-documenting (commented YAML)
- Each must explicitly call out the leak vector being tested
- Negative-result tests must have explicit "expected error code" in their fixture metadata
- CI must produce a per-test pass/fail report (not just aggregate)

### Backwards Compatibility Telemetry

During rollout, instrument `compose-run.sh` to record:
- Which compositions silently relied on `mode: persistent` transcript leak
- Which compositions used `iterate:` without `max_iterations` (will fail post-Sprint 1 validation)
- Which packs are running advisory-tier-only

Telemetry feeds operator decisions about when to flip iteration default + when to migrate at-risk legacy packs.

### Beads Integration + Machine-Readable Dependency Graph (closes Flatline IMP-002)

Each sprint's tasks should be authored as beads tasks. The cross-task DAG is materialized at `.run/sprint-dag.yaml`:

```yaml
# .run/sprint-dag.yaml — machine-readable for parallelization + Beads integration
schema_version: 1
tasks:
  - id: S0-T1
    title: "Author construct-invocation-v0 schema"
    sprint: 0
    priority: high
    depends_on: []
    blocks: [S2-T1, S2-T2, S3-T1]
  # ... (full DAG)
```

Beads CLI:
```bash
br create --title "S0-T1: Author construct-invocation-v0 schema" --priority high --depends-on ""
br create --title "S2-T1: Author lib/envelope-builder.sh" --depends-on "S0-T1"
```

Sprint runner consumes the DAG to compute parallelization (Sprint 4 + 5 in parallel, Sprint 6 T2 manifests in parallel) and order beads tasks accordingly.

### Telemetry Schema + Retention (closes Flatline IMP-005)

Substrate ships with explicit telemetry contract:

| Metric | Source | Retention | Schema |
|---|---|---|---|
| Composition runs | `compose-run.sh` end-of-run | 90 days | `.run/telemetry/compose-runs.jsonl` schema at `.claude/data/telemetry/compose-runs.schema.json` |
| Iteration mode by composition | Iteration auditor | 365 days (long-tail signal for default-flip decision) | `.run/telemetry/iteration-modes.jsonl` |
| Tier distribution per pack | `construct-validate.sh` | 365 days | `.run/telemetry/pack-tiers.jsonl` |
| Adversarial test results | CI artifacts | 365 days | GitHub Actions artifacts |
| Egress proxy log | Per-stage | 30 days (rotated) | `.run/compose/<run_id>/egress.jsonl` |

Cleanup: `compose-telemetry-gc.sh` runs weekly. Schema-validated retention enforced via `.run/telemetry/retention-policy.yaml`.

### State-Key Migration Story (closes Flatline IMP-006)

Persistent state composite key includes `schema_version` (per SDD §3.3). When a construct bumps schema_version:
- Old state remains in place at the old path; not auto-migrated.
- New state initializes fresh at the new path.
- Operator-driven migration script `compose-state-migrate.sh --slug X --from-version v1 --to-version v2 --transform <jq-expr>` runs declarative transforms.
- Migration log at `.run/compose/persistent/migrations.jsonl` records every transform with hash of source + dest.
- No silent state loss: old state retained until operator runs `compose-state-migrate.sh --finalize --remove-old-versions`.

Documented in `grimoires/loa/runbooks/persistent-state-migration.md` (Sprint 6).

### CI Job Surface

| Job | Tier | Frequency | Gates |
|---|---|---|---|
| `composition-schema-validate` | All | Per-PR | All schema fixtures must pass |
| `composition-strict-linux` | strict | Per-PR | All 12 adversarial tests must pass |
| `composition-advisory-linux` | advisory | Per-PR | Envelope/validation tests must pass |
| `composition-advisory-macos` | advisory | Per-PR | Envelope/validation tests must pass |
| `manifest-tier-coverage` | All | Per-PR | Top-12 must be in strict tier |
| `iteration-dual-run-diff` | All | Per-PR | Diff coverage documented for every iteration composition |

---

## Risk + Mitigation Summary

| Risk | Mitigation | Sprint |
|---|---|---|
| `bwrap` not installed in CI runner | Sprint 4 sets up CI image with `bwrap` + `CAP_NET_ADMIN`; document for self-hosted runners | Sprint 4 |
| Provider memory-disable flags differ across versions | Cheval adapter pinning (cycle-099 model registry); test against multiple versions | Sprint 3 |
| Top-12 manifests reveal scope creep when domain blocks authored | Sprint 6 T2 split across multiple PRs; partial migration allowed (advisory tier as fallback) | Sprint 6 |
| Iteration auditor produces too many false positives in dual-run | Document L3 (payload diff) as informational only; gate on L1+L2 only | Sprint 5 |
| Legacy compatibility contracts under-specified by operator | Bootstrap-only contracts rejected by validator; forces operator review | Sprint 6 |
| Egress proxy CA-trust limitation surfaces during Sprint 4 | CONNECT-only mode documented in SDD §2.3; path-level controls explicitly out of scope | Sprint 4 |

---

## Open Questions Carried Forward

These remain Architecture-deferred or Sprint-resolution items:

1. **Q#3 — Top-12 re-rank cadence**: per-cycle review confirmed; tooling (S6-T4) ships but cadence rule deferred to follow-up cycle.
2. **Q#8 — Persistent state retention default**: 30 days per FR-5.4; revisit after Sprint 5 telemetry surfaces actual usage.
3. **Q#10 — Legacy compatibility contract format**: hand-authored YAML with bootstrap script (S6-T1); revisit if 17+ packs prove too high-friction.
4. **Q (new) — Windows isolation surface**: NEEDS_DECISION; out of scope for this initiative.
5. **Q (new) — macOS notarized helper for kernel-boundary sandbox-exec**: deferred to follow-up cycle; advisory tier acknowledged as macOS limit.
6. **Q (new) — `composition.audit_signed: true` UX**: composition-level flag plumbed in S1-T5; operator workflow refinement deferred.

---

## Final Notes

- Sprints are sized for one-engineer pace. Two engineers working in parallel can compress timeline by ~40% (Sprints 4+5 in parallel; Sprint 6 T2 manifests authored in parallel).
- The substrate ships honest. The README + BUTTERFREEZONE updates (S6-T8) explicitly state: "strong contract everywhere, isolation is tier-conditional. Strict tier requires Linux+bwrap+CAP_NET_ADMIN."
- Adversarial tests (Sprint 4) are the gate. Without them passing, strict-tier claims are not made.
- The split lines (CONTRACT vs RUNNER per SDD §11.1) are preserved across sprints — Sprints 0, 1, parts of 2 + 5 + 6 form the contract package; Sprints 3, 4, parts of 2 + 5 + 6 form the runner package.

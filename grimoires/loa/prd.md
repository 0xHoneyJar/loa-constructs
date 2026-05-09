# PRD: Construct Bounded-Context Runtime Substrate

**Cycle**: cycle-construct-bounded-context (TBD)
**Created**: 2026-05-08
**Revised**: 2026-05-08 (post-Flatline review v2)
**Status**: Draft (simstim Phase 2 complete — Flatline 3-model review integrated)
**Simstim ID**: simstim-20260508-96627a1c
**Anchor**: `grimoires/loa/context/construct-bounded-context-runtime-audit.md`
**Supporting context**:
- `grimoires/loa/context/construct-runtime-schema-alignment.md` (layer ownership)
- `grimoires/loa/context/rfc-construct-composition-prd-flow.md` (downstream PRD-flow integration)
**Flatline review**: `.run/flatline-prd-findings.json` (3-model: claude-headless:claude-opus-4-7 + codex-headless:gpt-5.5 + gemini-headless:gemini-3.1-pro-preview, 9 HIGH_CONSENSUS + 12 BLOCKERS + 3 DISPUTED, all integrated)

---

## 1. Problem Statement

> Source: `construct-bounded-context-runtime-audit.md` §"Why this exists" + §"Audit Claim"

The construct doctrine is strong on paper: a construct is a bounded expertise pack with identity, skills, and a typed stream contract for composition (`Signal`, `Verdict`, `Artifact`, `Intent`, `Operator-Model`). The doctrine fails in practice because **invocation still feels like one shared context window**. When constructs run in the same ambient transcript:

- the agent silently consumes unrelated history, prior reasoning, and operator chatter
- `mode: persistent` carries the prior conversation regardless of typed `reads`
- iteration edges resolve through ambient memory rather than declared stream handoffs
- `reads` and `writes` become descriptive comments, not runtime contracts
- ambient leak vectors extend beyond transcript: shared filesystem, environment variables, tool/MCP server state, tmux scrollback, and reused LLM session/thread IDs all carry prior context

**The audit's claim**: the missing substrate is not another construct — it is a validated invocation boundary. Every construct invocation should be wrapped in a typed envelope that names the active domain model, allowed input streams, allowed project context, output contract, and forbidden prior context — and the executor must enforce every dimension of that envelope, not just the prompt body.

Without that envelope, construct composition degrades into ambient transcript sharing. With it, construct execution looks like an ECS scheduler: each system queries declared components, writes declared components, and never inspects the whole world just because it is nearby.

### Why Now

- The registry already has **29 construct packs** but core constructs (`artisan`, `beacon`, `beehive`, `construct-creator`) still report **empty `streams.reads/writes` and `composes_with: []`**.
- `feel-iterate-signal-feedback.yaml` is documented to walk linearly without honoring `iterate: [[1,2]]`, and stage feedback reaches stage 1 only because `mode: persistent` carries the prior conversation.
- The downstream RFC and schema-alignment doc both depend on this substrate landing first.
- Cycle-098/099 audit envelope work (1.130.0 framework merge) has just landed. The substrate work composes naturally with the new envelope/handoff/JCS canonicalization infrastructure already in place.

### Failure Mode If We Do Nothing

Construct expertise dilutes. Every new pack increases the surface where ambient transcript becomes the hidden transport. By the time `loa-finn` is ready to execute compositions, the contract layer will be too vague to bind a runtime to.

---

## 2. Goals

### Primary (must ship in this initiative)

1. **G1 — Invocation envelope is real**: every composition stage materializes a `ConstructInvocationEnvelope` before execution; the envelope names domain, mode, reads, writes, allowed context, forbidden context, prev_hash, invocation_hash. Hash construction uses RFC 8785 JCS canonicalization (composes with cycle-098 audit envelope at `lib/jcs.sh`).
2. **G2 — Handoff envelope is real**: every stage emits a `ConstructHandoffEnvelope` recording the producing domain, output streams, content-addressed hashes, `next_allowed_reads`, and a terminal status (success/failure/timeout/cancelled/refused) with explicit partial-output disposition.
3. **G3 — `mode: fresh` enforcement is tier-conditional**: enforcement strength depends on platform + privilege:
   - **Strict tier** (security-gated, claimable as "boundary"): Linux + `bwrap` + `CAP_NET_ADMIN` for network namespace. All 9 leak vectors enforced at kernel boundary. Required for any composition handling sensitive context. Adversarial test suite gates strict-tier compositions on this configuration.
   - **Advisory tier** (informational, NOT a security boundary): Linux without `bwrap` (LD_PRELOAD path-allowlist), macOS without notarized helper (dyld interposition or in-process fallback), HTTP_PROXY-only network filtering. Filters cooperative constructs but cannot prevent uninstrumented binaries (Go/Rust static), direct syscalls, raw sockets, DNS exfiltration, or provider memory-feature recall. Documented as best-effort.
   - **Strict-mode prerequisite check**: pre-execution validator refuses to mark a stage as strict-tier on systems lacking the required mechanism (`bwrap` + `CAP_NET_ADMIN`); operator must either upgrade environment or accept advisory tier.
   - The substrate is **honest about its limits**. The envelope contract (G1, G2), validation gates (G6), hash chain (FR-1.6), persistent-state scoping (G4), out-of-domain refusal (G10), and pre/post-execution validation are all platform-portable strong guarantees. Isolation enforcement is the only tier-conditional element.
4. **G4 — `mode: persistent` is scoped with full identity**: persistent state lives at `{project_id, composition_id, run_id, construct_slug, skill_slug, stage_id, schema_version}` — never collides across stages, runs, or schema generations. Storage path, lifecycle, retention, and migration semantics are explicit.
5. **G5 — Domain is a first-class field**: every high-use construct manifest declares `domain.primary`, `domain.ubiquitous_language`, `domain.owns.streams`, `domain.invariants`, `domain.out_of_domain`. The runner reads these.
6. **G6 — Pre- AND post-execution validation is strict by pack class**: pre-exec validates the stream graph (every read has a producer); post-exec validates that every emitted artifact matches a declared `writes` entry, conforms to its stream schema, includes canonical hash metadata, and records the producing domain. Validation policy is tiered by pack class (see FR-3 + FR-11).
7. **G7 — One composition runs end-to-end without ambient transcript handoff**: the `audit-feel` golden path completes using only declared streams, with envelopes recorded for replay and adversarial isolation tests proving leak vectors are blocked.

### Secondary (would-be-nice within scope)

8. **G8 — `compose-run --dry-run --explain-context`**: stage-by-stage envelope rendering; surfaces missing schemas, undeclared reads/writes, persistence scope, isolation viability, and (for iteration changes) dual-run diff reporting.
9. **G9 — Iteration as a real edge with bounded loop semantics**: `iterate: [[N,M]]` materializes as a stream edge that the runner adds to the next-iteration envelope. Schema requires `max_iterations` + termination signal (a specific `Verdict` state). Behind opt-in flag until catalogued compositions re-validated.
10. **G10 — Refusal/handoff signal**: a stage whose request falls outside its construct domain emits a structured refusal/handoff signal (output type: `Verdict` with `verdict: out_of_domain`) instead of silently expanding scope.

### Success Metrics

| Metric | Baseline (today) | Target (end of initiative) |
|--------|------------------|----------------------------|
| Constructs declaring `domain.primary` | ~0% (advisory only) | 100% of top-12 by usage; 80% of all 29 packs |
| Constructs with non-empty `streams.reads/writes` in registry | <30% | 100% of top-12; 80% of all 29 |
| Composition stages writing envelope artifacts | partial (basic) | 100% via runner default |
| `mode: fresh` stages with proven leak-vector isolation (adversarial test suite) | 0 | golden path + 5 adversarial smoke tests |
| Compositions with pre-execution stream-graph validation | partial | 100% (gate before any stage runs) |
| Compositions with post-execution output validation | 0 | 100% |
| Time to detect ambient-context leak in composition (manual) | uncaught | dry-run flags it + adversarial test fails build |
| Top-12 selection method | intuition | usage telemetry (memory hit count, manifest references, composition appearance) |

---

## 3. Non-Goals

To prevent scope creep:

- **Hounfour schema authorship** — vocabulary alignment only; final schema home is `loa-hounfour`. (See FR-1.4 envelope ships at v0 explicitly until Hounfour authors canonical shape.)
- **Finn runtime integration** — substrate ships before Finn supports composition execution.
- **Full RFC implementation** — `construct-intake.md` artifact + slot model + 4-phase rollout is downstream consequence, not in scope.
- **Schema migration of all 29 existing packs** — strict validation for new + top-12; legacy packs follow a generated compatibility-contract path (see FR-3).
- **Subscription billing / cost gates** — orthogonal.
- **New construct expertise** — refines substrate, not pack contents.
- **Composition authoring DX** (`the-weaver`).
- **Iteration default flip** — new iteration semantics ship behind opt-in flag; default change deferred to follow-up cycle once 100% of catalogued iteration compositions are re-validated.
- **Isolated persistent state mode (orthogonal isolation × state semantics)** — per Bridgebuilder REFRAME-2: PRD treats `mode: fresh` as the carrier of both isolation enforcement and state-discontinuity. The orthogonal design (`isolation: {strict, advisory, off} × state: {fresh, persistent}`) is recognized as a real future direction but is out of scope for this initiative. Operators wanting "isolated persistent state" must wait for a follow-up cycle.

---

## 4. Users & Stakeholders

| Role | Concern | Interaction |
|------|---------|-------------|
| **Operator (zksoju)** | Constructs that don't leak each other's context; reproducible composition runs; clear errors when boundaries are crossed | Direct user — invokes `compose-run.sh` and uses dry-run/explain output |
| **Construct authors** | Manifest schema they can satisfy; clear "what should I declare?" guidance; backwards-compatibility for shipped packs | Indirect — affected by manifest schema changes |
| **Finn runtime team** (downstream) | Typed contract bindable to a session executor; idempotent invocation hashes; persistence boundaries matching their sandbox model | Indirect — consumes envelopes |
| **Hounfour authors** | Vocabulary alignment for eventual canonical schema | Reference dependency |
| **Composition authors** | Compositions failing loudly at the boundary, not silently in transcript | Direct — run validator + dry-run |

---

## 5. Functional Requirements

### FR-1 Invocation Envelope

- **FR-1.1** Stage executor materializes a `ConstructInvocationEnvelope` before invoking any construct skill.
- **FR-1.2** Envelope carries: `run_id`, `composition_id` (deterministic derivation: see FR-1.5), `stage_id`, `construct.{slug, version, persona, skill}`, `domain.{primary, active_language, invariants}`, `mode`, `input_streams[]`, `allowed_context.{methodology, topology, operator_model}`, `context_policy.{include_prior_transcript, include_unread_stage_outputs, include_unlisted_grimoires, allow_network, allow_file_write, allowed_read_paths[], allowed_write_paths[], allowed_env_vars[], llm_session_strategy}`, `output_contract.writes[]`, `prev_hash`, `invocation_hash`, `schema_version`.
- **FR-1.3** Envelope is content-addressed (`invocation_hash` via JCS canonicalization, `lib/jcs.sh`) and persisted to `.run/compose/<run_id>/envelopes/stage-<n>-pass-<m>.invocation.json`.
- **FR-1.4** Envelope schema validates against `loa.construct.invocation.v0` (explicit pre-stable; ships at v0 until Hounfour authors canonical shape per Open Q #2 resolution). Migration path documented in `grimoires/loa/runbooks/envelope-schema-migration.md`.
- **FR-1.5** `composition_id` derives deterministically from `{composition_yaml_path, composition_yaml_hash}` so different YAMLs at the same path produce different ids (closes IMP-017).
- **FR-1.6** Hash chain semantics: each envelope's `prev_hash` references the immediately prior envelope in the run; first stage uses `null`. Recovery: if chain breaks, the runner aborts with `[ENVELOPE-CHAIN-BROKEN]` and points to the audit-keys runbook (closes IMP-003).
- **FR-1.7** Envelope optionally extends or composes with the cycle-098 audit envelope (`agent-network-envelope.schema.json` v1.1.0) — Architecture phase to decide extension vs distinct shape (resolves Open Q #7).

### FR-2 Handoff Envelope (with terminal states)

- **FR-2.1** Stage executor emits a `ConstructHandoffEnvelope` after the construct skill completes — for **every** terminal state.
- **FR-2.2** Envelope carries: `run_id`, `composition_id`, `stage_id`, `construct_slug`, `skill`, `status` ∈ `{success, failure, timeout, cancelled, refused}`, `outputs[].{type, uri, schema_id, hash, domain.{primary, produced_by}}`, `summary.{visible_to_operator, text}`, `next_allowed_reads[]`, `error.{code, message, recoverable}` (when `status != success`), `partial_outputs.disposition` ∈ `{discarded, quarantined, marked_non_consumable}`.
- **FR-2.3** Handoff is content-addressed, persisted to `.run/compose/<run_id>/envelopes/stage-<n>-pass-<m>.handoff.json`, and immutable.
- **FR-2.4** Handoff schema validates against `loa.construct.handoff.v0`.
- **FR-2.5** A failure/timeout handoff blocks downstream stages from reading partial outputs unless `partial_outputs.disposition == quarantined` AND the consumer explicitly allows quarantined inputs (rare, opt-in).

### FR-3 Domain as First-Class Manifest Field (tiered enforcement)

- **FR-3.1** `construct.schema.json` accepts a DDD `domain` object: `primary`, `supporting[]`, `ubiquitous_language[]`, `owns.{entities[], streams.{reads[], writes[]}, invariants[]}`, `out_of_domain[]`.
- **FR-3.2** Top-12 list determined by usage telemetry (memory-scan hit count + manifest reference count + composition appearance), not intuition. Selection script: `.claude/scripts/construct-usage-rank.sh`. Top-12 frozen for this initiative; review per cycle (closes IMP-001).
- **FR-3.3** `construct-validate.sh` enforces by pack class:
  - **Strict (fail-closed)**: new packs (post-cutoff date) + top-12 high-use packs must declare full domain block.
  - **Compatibility (fail-conditional)**: legacy packs may run only if a generated compatibility contract exists at `.claude/data/legacy-domain-contracts/<slug>.yaml`.
  - **Advisory (warn-only)**: deeply legacy packs not in top-12 — warn but do not gate; cannot run in golden-path validation.
  - Tier configuration: `.claude/data/construct-validation-tiers.yaml` (config-driven per IMP-008).
- **FR-3.4** Generated construct index includes the domain block per pack with `validation_tier` field.

### FR-4 `mode: fresh` Enforcement (tier-conditional, see G3)

- **FR-4.0** Each composition stage declares `context_policy.isolation_tier` ∈ `{strict, advisory}`. Default: `advisory`. Strict-tier requires environment-side prerequisites (FR-4.4); pre-execution validator refuses strict-tier on environments that don't satisfy them.
- **FR-4.1** When a stage declares `mode: fresh`, the stage executor invokes the construct skill in a subprocess with **all** of the following — applied per tier:
  - **Filesystem**: read/write allowlist (`allowed_read_paths[]`, `allowed_write_paths[]`). Strict tier: `bwrap` filesystem namespace; advisory tier: LD_PRELOAD or dyld interposition + in-process check (advisory only — does not prevent foreign binary or direct-syscall bypass).
  - **Environment**: env scrubbed to `allowed_env_vars[]` allowlist. Default: `PATH`, `HOME`, `LANG`. Same in both tiers.
  - **Network**: blocked unless `allow_network: true`. Strict tier: Linux network namespace (deny-by-default at kernel) + userspace egress proxy (CONNECT-only — see FR-13.4) for HTTP/HTTPS allowlist; advisory tier: HTTP_PROXY/HTTPS_PROXY env (covers HTTP_PROXY-honoring code only — does NOT cover raw sockets, DNS, UDP, SSH, git CLI, package managers; explicitly out of scope for advisory tier).
  - **LLM session**: new thread/session ID per stage AND provider-memory disabled. Cheval adapters pass per-provider memory-disable flags: Anthropic `memory: { type: none }`, OpenAI `disable_chatgpt_memory: true` (where supported), Gemini `saved_info_disabled: true`.
  - **MCP/tools**: tool allowlist per stage (default empty).
  - **tmux scrollback**: subprocess gets a fresh pty via argv-array `script` invocation (not `bash -c` — see FR-4.3 to close command injection).
- **FR-4.2** Subprocess invocation MUST use argv-array form, never `bash -c "<interpolated>"`. Closes command-injection vector. Implementation: `subprocess.run([cmd, arg1, arg2, ...])` (Python) or `exec(cmd, args[])` (bash) — never string-interpolated.
- **FR-4.3** **Adversarial test suite** — gated to **strict tier only** (advisory tier does not claim leak-vector enforcement):
  - `audit-feel` golden path runs end-to-end without leak.
  - Adversarial tests confirm strict-tier `fresh` stage cannot:
    1. read an unlisted grimoire path (filesystem allowlist)
    2. read an env var not on its allowlist (env scrub)
    3. read prior tmux pane buffer (pty isolation)
    4. read an unrelated file by glob (path-allowlist enforcement after `realpath` canonicalization — closes symlink traversal)
    5. continue an LLM thread from operator session (session reset)
    6. invoke an undeclared MCP tool (tool allowlist)
    7. exfiltrate via provider memory feature (Anthropic/OpenAI/Gemini memory disable verified — closes BLOCKER on cross-session memory)
    8. exfiltrate via DNS-over-UDP or raw socket (network namespace required — closes BLOCKER on egress-proxy-only)
    9. escape via static binary or direct syscall (`bwrap` namespace required — closes BLOCKER on LD_PRELOAD bypass)
    10. inject commands via filename or argument (argv-array invocation — closes BLOCKER on `bash -c` interpolation)
    11. escape via symlink in `allowed_write_paths[]` pointing outside (path canonicalization)
    12. read state during GC race (GC acquires same flock as writes — closes BLOCKER)
  - All 12 adversarial tests must pass on Linux+bwrap+CAP_NET_ADMIN before G3 (strict tier) is claimed met.
  - Advisory tier explicitly does NOT run these tests as gates; tier label conveys honest scope.
- **FR-4.4 — Strict-tier prerequisites (pre-execution check)**: pre-execution validator verifies `bwrap` is present and executable, `CAP_NET_ADMIN` is available (or running as root), and provider memory-disable flags are recognized by all configured cheval adapters. Missing prerequisites → `[STRICT-TIER-PREREQ-MISSING]` with exit code 78 (EX_CONFIG); operator must downgrade to advisory or upgrade environment.

### FR-5 `mode: persistent` Scoping (full composite key)

- **FR-5.1** Persistent state composite key: `{project_id, composition_id, run_id, construct_slug, skill_slug, stage_id, schema_version}`. The `stage_id` inclusion prevents collision when the same skill is invoked at multiple stages of the same composition (closes BLOCKER + IMP-017).
- **FR-5.2** Persistent state does NOT include the operator session transcript, env vars, or unrelated tenant memory.
- **FR-5.3** Storage location: `.run/compose/persistent/<project_id>/<composition_id>/<construct_slug>/<skill_slug>/<stage_id>/state.json`. Format: JSON. Locking: file lock during writes.
- **FR-5.4** Retention policy: persistent state expires after configurable TTL (default 30 days post-last-write); cleanup via `compose-state-gc.sh` cron (closes IMP-015).
- **FR-5.5** Migration: `schema_version` change in the key triggers fresh state — no auto-migration. Manual migration path documented per state schema.
- **FR-5.6** Adversarial test: two compositions invoking the same construct skill at different stages see independent state.

### FR-6 Pre-Execution Stream-Graph Validation

- **FR-6.1** Before any stage runs, the runner validates the composition's stream graph.
- **FR-6.2** Validation failure aborts with typed errors: `[STREAM-NO-PRODUCER]`, `[STREAM-SCHEMA-MISMATCH]`, `[STAGE-OUT-OF-DOMAIN]`, `[ENVELOPE-CHAIN-BROKEN]`, `[ITERATION-NO-MAX]`, `[ITERATION-NO-TERMINATION]`.
- **FR-6.3** `compose-run --dry-run` runs validation and prints the resolved stream graph + envelope previews (per IMP-007 fixture format).

### FR-7 Iteration as Stream Edge (bounded, opt-in)

- **FR-7.1** `iterate: [[N, M]]` interpreted as a stream edge: stage M's `writes:` becomes an additional `reads:` source for stage N on the next iteration pass. Materialized in `input_streams[]` of the iteration-pass envelope (closes IMP-012).
- **FR-7.2** Iteration **requires**:
  - `max_iterations: <int>` field at the composition level (no default; explicit per composition). Validator rejects iteration without it (`[ITERATION-NO-MAX]`).
  - **Termination signal** — explicit termination predicate (e.g., `terminate_when: verdict.status == "complete"` or `verdict.score >= threshold`). Validator rejects iteration without it (`[ITERATION-NO-TERMINATION]`).
- **FR-7.3** Iteration does NOT require `mode: persistent` — uses stream-edge mechanism only (per audit + IMP-012).
- **FR-7.4** **Rollout** (closes BLOCKER on silent behavior change):
  - Phase 1: `compose-iteration-audit.sh` enumerates every composition using `iterate:` in the repo.
  - Phase 2: `compose-run --dry-run` performs dual-run with both legacy (persistent-leak) and new (stream-edge) semantics, reports diffs.
  - Phase 3: New semantics gated behind `composition.iteration_mode: stream_edge` opt-in flag; legacy `iteration_mode: persistent_leak` remains default until 100% of catalogued compositions re-validated.
  - Default flip = follow-up cycle, NOT this initiative (preserves Non-Goal #8).

### FR-8 Out-of-Domain Refusal

- **FR-8.1** When a stage's request falls outside `domain.primary` and `domain.supporting`, stage emits a structured refusal: output type `Verdict` with `verdict: out_of_domain` and `recommended_next_domain` field.
- **FR-8.2** Out-of-domain detection is advisory in this initiative; strict enforcement is a follow-up after manifest migration.

### FR-9 Dry-Run Explain-Context

- **FR-9.1** `compose-run.sh <composition.yaml> --dry-run --explain-context` prints, per stage: invocation envelope preview, exact files/context the stage would see, missing schemas, missing/conflicting domains, undeclared reads/writes, persistence scope, isolation viability assessment.
- **FR-9.2** Output structured (JSON with `--json`); fixture format defined at `.claude/data/dry-run-fixture.schema.json` for CI gate (closes IMP-007).

### FR-10 Golden-Path Smoke Test

- **FR-10.1** `audit-feel` composition runs end-to-end using only declared streams, with envelope/handoff trail in `.run/compose/<run_id>/envelopes/` and adversarial leak-vector tests passing (per FR-4.3).
- **FR-10.2** A negative test confirms removing `Signal` from stage 2's `reads:` causes pre-execution validation failure with `[STREAM-NO-PRODUCER]`.

### FR-11 Post-Execution Output Validation Gate (NEW from BLOCKER)

- **FR-11.1** After a stage completes, the runner validates every emitted artifact:
  - Must match a declared `writes:` entry (type, schema_id).
  - Must validate against the stream's JSON Schema.
  - Must include canonical hash metadata (`hash` field, JCS-canonicalized).
  - Must record `domain.produced_by` matching the construct's declared domain.
  - Output count must match expected count (no orphan outputs, no missing required outputs).
- **FR-11.2** Validation failure produces a typed error and the stage's handoff is marked `status: failure` with `error.code: [OUTPUT-CONTRACT-VIOLATION]`. Downstream stages cannot consume.
- **FR-11.3** Required by all pack classes (strict + compatibility); legacy packs gain compatibility wrappers per FR-3.3.

### FR-12 Terminal Handoff Coverage (NEW from BLOCKER)

- **FR-12.1** Every stage produces a handoff envelope, regardless of termination cause: success, failure, timeout, cancelled, refused.
- **FR-12.2** Partial outputs are explicitly disposed via `partial_outputs.disposition` ∈ `{discarded, quarantined, marked_non_consumable}` (per FR-2.2). Default: `discarded`.
- **FR-12.3** Test fixture: forced timeout, forced cancellation, OOM-simulated failure, domain-refusal — all produce well-formed handoff envelopes.

### FR-13 Context-Policy Runtime Enforcement (NEW from BLOCKER)

- **FR-13.1** `context_policy.allow_network`: deny-by-default. When permitted, egress allowlist (host:port pairs or wildcards) enforced via per-subprocess network namespace (where OS supports) or inline egress filter.
- **FR-13.2** `context_policy.allow_file_write`: deny-by-default outside `allowed_write_paths[]`. Filesystem write attempts outside allowlist produce `[POLICY-VIOLATION-WRITE]`.
- **FR-13.3** Policy violations halt the stage and are recorded in the handoff envelope with `status: failure`, `error.code: [POLICY-VIOLATION-*]`. Handoff persisted for audit.

---

## 6. Technical Constraints

- **Existing schemas to extend, not replace**: `composition.schema.json`, `construct.schema.json`. Extend, don't fork.
- **Existing runner to extend, not replace**: `construct-compose.sh`, `compose-run.sh`, `stage-executor-tmux.sh`.
- **Compose with cycle-098 infrastructure**: JCS canonicalization at `lib/jcs.sh`, audit envelope at `agent-network-envelope.schema.json` v1.1.0, hash-chain semantics already proven in cycle-098. Architecture phase to decide envelope reuse vs sibling.
- **No Finn dependency**: ships before Finn supports composition execution.
- **Backwards compatibility tiers**: strict / compatibility / advisory per FR-3.3. Legacy packs not in top-12 cannot run in golden-path validation.
- **Hounfour schema gap**: envelope shapes ship at v0 explicitly until Hounfour authors canonical shape. Migration documented.
- **Stream schemas already exist** for `Signal`, `Verdict`, `Artifact`, `Intent`, `Operator-Model` (per `.claude/schemas/`). Extend with `domain` and `produced_by` extension fields.
- **Iteration default does not flip in this initiative** — opt-in flag only. Default flip is a follow-up.
- **Stage executor process model**: subprocess + tmux today. Hardening: filesystem allowlist, env scrub, fresh pty, new LLM session ID. Full chroot/jail is Architecture-phase decision (Open Q #1).
- **JCS canonicalization mandate**: all hash construction (envelope, handoff, persistent-state migration triggers) uses `lib/jcs.sh` (RFC 8785). No ad-hoc canonicalization (closes IMP-016).

---

## 7. Risks & Dependencies

| Risk | Likelihood | Severity | Mitigation |
|------|-----------:|---------:|------------|
| Legacy compositions silently rely on `mode: persistent` transcript leak — flipping `fresh` default breaks them | High | High | Phase rollout: opt-in `fresh` first, telemetry, default flip only after migration (preserved as Non-Goal) |
| Schema-strict validation rejects existing packs at registry sync | Medium | High | Three-tier validation per FR-3.3: strict / compatibility / advisory |
| Envelope schema authored at v0 here drifts from eventual Hounfour shape | Low | Medium | v0 ships explicit pre-stable. Migration runbook authored in scope. JCS canonicalization (cycle-098) already aligned. |
| Iteration semantics change breaks compositions relying on persistent-leak loop | Medium | Medium | FR-7.4 phased rollout: enumerate → dual-run diff → opt-in flag → default flip in follow-up cycle |
| Out-of-domain detection too noisy with vague manifests | Medium | Low | Advisory-only this initiative |
| Performance regression from envelope artifacts per stage | Low | Low | Local JSON; <1ms per stage |
| `mode: fresh` declared enforced but leak vectors remain (filesystem, env, MCP, tmux, session) | High pre-mitigation | Critical | FR-4.3 adversarial test suite — 6 explicit leak-vector tests must pass before G3 met |
| Persistent state collisions when same skill used at multiple stages | High pre-mitigation | High | FR-5.1 composite key includes `stage_id` |
| Iteration runaway (infinite loop, runaway cost) | High pre-mitigation | Critical | FR-7.2 mandates `max_iterations` + termination predicate; validator enforces |
| Post-execution output gate adds runtime overhead | Low | Low | Schema validation is fast; output count check is O(declared writes) |
| Context-policy enforcement (network/fs) requires OS-specific code paths | Medium | Medium | Architecture phase scopes platform support; baseline (path allowlist) works everywhere |

| Dependency | Status | Notes |
|------------|--------|-------|
| `composition.schema.json` (DDD `domain` + `context_policy` accepted) | ✅ Present (1.130.0) | Extend with iteration mandates + tier markers |
| `construct.schema.json` (DDD `domain` object) | ✅ Present | Extend with `validation_tier`, full ownership lists |
| `compose-run.sh`, `construct-compose.sh`, `stage-executor-tmux.sh` | ✅ Present, basic | Extend per FR-1..13 |
| Stream schemas | ✅ Present | Add `domain` + `produced_by` extension fields |
| `lib/jcs.sh` (RFC 8785 JCS canonicalization) | ✅ Present (cycle-098) | Mandatory for all hash construction |
| Cycle-098 audit envelope | ✅ Present | Compose with — extension vs sibling decided in Architecture |
| Hounfour package | ⚠️ Not authoring | Vocabulary only |
| Finn runtime | ⚠️ Out of scope | Downstream consumer |

---

## 8. Acceptance Criteria

### Substrate (from runtime audit)

- [ ] `constructs-active` reports the active construct set + provenance.
- [ ] Every top-12 high-use construct declares full domain block (selection per FR-3.2 telemetry script).
- [ ] Construct index includes non-empty stream contracts for top-12 with `validation_tier`.
- [ ] Composition dry-run prints one invocation envelope per stage in fixture-validated JSON.
- [ ] A stage cannot read undeclared previous outputs (validated by adversarial test).
- [ ] `mode: fresh` passes all 6 leak-vector adversarial tests (FR-4.3).
- [ ] `mode: persistent` uses scoped store per FR-5.1 composite key with retention enforcement (FR-5.4).
- [ ] API/index metadata exposes version, skills, streams, composition paths for top-12.
- [ ] `audit-feel` composition runs end-to-end without ambient transcript handoff.

### Schema alignment

- [ ] Every new construct declares `domain.primary`, `domain.out_of_domain`, `capabilities`, `context_policy`.
- [ ] Every construct stream/event declaration is explainable in Hounfour terms.
- [ ] Every composition dry-run can explain which domain and context each stage receives.
- [ ] No construct owns direct model invocation, session persistence, sandbox policy, or cross-tenant memory access — validated by the schema gate, not just convention (FR-11).

### Output + handoff contracts

- [ ] Every stage emits a terminal handoff envelope (FR-12.1) for all 5 statuses.
- [ ] Post-execution output validation gate (FR-11) blocks contract violations.
- [ ] Hash chain validates across the full run; broken chain produces `[ENVELOPE-CHAIN-BROKEN]`.

### Iteration

- [ ] Every iteration in repo composition is catalogued (FR-7.4 Phase 1 audit).
- [ ] `compose-run --dry-run` produces dual-run diff for iteration semantics changes.
- [ ] No composition passes pre-exec validation without `max_iterations` + termination signal.

### Adversarial isolation

- [ ] All 6 FR-4.3 leak-vector tests pass (filesystem, env, tmux, glob, session, MCP).
- [ ] Persistent state isolation test confirms no cross-stage collision.
- [ ] Context-policy violation tests (network, file_write) produce typed errors.

### Hash + canonicalization

- [ ] All envelope hashes use `lib/jcs.sh` (RFC 8785). No ad-hoc canonicalization paths.
- [ ] `composition_id` derives deterministically from `{path, hash}` (FR-1.5).

---

## 9. Open Questions

To resolve in Phase 3 (Architecture) or earlier:

1. **Process isolation depth for `mode: fresh`**: subprocess-with-allowlist (current direction) vs full chroot/sandbox/container. FR-4.1 enumerates the leak vectors; Architecture decides depth per platform support.
2. **Envelope schema versioning**: ships at v0 (pre-stable). Resolved per BLOCKER feedback — no longer "freeze v1" question.
3. **Top-12 construct selection cadence**: locked for this initiative per FR-3.2; cadence for future re-rank deferred to Architecture.
4. **`compose-run --dry-run --explain-context` JSON schema**: `.claude/data/dry-run-fixture.schema.json` per IMP-007. Concrete fields decided in Architecture.
5. **Iteration edge interaction with `mode: persistent`**: FR-7.3 — iteration uses stream-edge only. `persistent` independent.
6. **Telemetry**: `compose-run.sh` instrumentation to record which compositions silently relied on transcript leak. Architecture defines the metric surface.
7. **Cycle-098 audit envelope reuse vs sibling**: extends `agent-network-envelope.schema.json` v1.1.0 directly, or lives as distinct shape composing the same JCS hash chain. Architecture decides.
8. **Persistent state retention default**: 30 days post-last-write proposed in FR-5.4. Operator-configurable. Validate against operational use cases in Architecture.
9. **Network egress allowlist mechanism**: subprocess network namespace (Linux-only) vs userspace egress filter (cross-platform). FR-13.1.
10. **Compatibility-contract format for legacy packs** (FR-3.3): generated from existing manifest + heuristics, or hand-authored. Architecture decides.

---

## 10. Out-of-Scope (Explicit)

- Finn runtime integration / Finn session API / Finn sandbox
- Hounfour package authorship (vocabulary only)
- `construct-intake.md` artifact authoring (downstream RFC Phase 0)
- Slot model wiring into `/plan-and-analyze`
- Migration of all 29 packs to DDD-domain form (top-12 only)
- New construct authoring
- `the-weaver` / composition authoring DX
- Subscription billing / model cost gates
- `/constructs compose` UI changes
- Iteration default flip (opt-in only this initiative)

---

## Appendix A — Lineage

This PRD draws from three pre-loaded context artifacts authored 2026-05-08 and integrates 20 findings from a 3-model Flatline review (claude-headless:claude-opus-4-7 + codex-headless:gpt-5.5 + gemini-headless:gemini-3.1-pro-preview):

- **Source artifacts**:
  1. `construct-bounded-context-runtime-audit.md` — anchor (boundary leak + 12 invariants + envelopes)
  2. `construct-runtime-schema-alignment.md` — layer model (Loa/Hounfour/Finn/Constructs/Composition)
  3. `rfc-construct-composition-prd-flow.md` — downstream PRD-flow integration (deferred per Non-Goal #3)

- **Flatline integrations** (full record at `.run/flatline-prd-findings.json`):
  - 9 HIGH_CONSENSUS findings auto-integrated (IMP-001, IMP-002, IMP-003, IMP-004, IMP-005, IMP-007, IMP-008, IMP-011, IMP-012)
  - 12 BLOCKER themes accepted: mode:fresh isolation depth (3), persistent-state key (2), iteration semantics (2), post-exec output validation (1), envelope versioning (1), handoff terminal states (1), legacy rollout policy (1), context_policy enforcement (1)
  - 3 DISPUTED accepted: IMP-015 (retention), IMP-016 (JCS canonicalization mandate), IMP-017 (composition_id derivation)

The PRD is anchored on artifact #1, ingests vocabulary from #2, and explicitly defers #3.

# SDD: Construct Bounded-Context Runtime Substrate

> **⚠ Cycle-0 amendment (2026-05-09 — Path B per design review MEDIUM-2)**
>
> Sections describing tier-conditional validator behavior, domain-block overlay enforcement, and legacy-contract validation describe **planned** semantics. The project-side `.claude/scripts/construct-validate.sh` currently enforces tier metadata only. Hard enforcement is deferred pending upstream Loa Issue B'. See `grimoires/loa/runbooks/validator-reality-decision.md`.

**Cycle**: cycle-construct-bounded-context (TBD)
**Created**: 2026-05-08
**Status**: Draft (simstim Phase 3 — Architecture)
**Simstim ID**: simstim-20260508-96627a1c
**PRD**: `grimoires/loa/prd.md` (v2 post-Flatline)

This SDD operationalizes the 13 functional requirements of the PRD and resolves the 4 architecture-phase open questions (Q#1 isolation depth, Q#7 envelope reuse, Q#9 network egress, Q#10 legacy compatibility-contract format).

---

## 1. Architecture Overview

### 1.1 System Boundary

```
┌─────────────────────────────────────────────────────────────┐
│                  composer:  compose-run.sh                  │
│                                                             │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  Stream    │→ │  Envelope    │→ │  Stage Executor    │   │
│  │  Graph     │  │  Builder     │  │  (per-stage)       │   │
│  │  Validator │  │  (JCS hash)  │  │                    │   │
│  └────────────┘  └──────────────┘  └────────┬───────────┘   │
│        ↑                                    │               │
│        │           ┌────────────────────────▼────────────┐  │
│  ┌─────┴──────┐    │  Subprocess (env-scrubbed,          │  │
│  │  Construct │    │   filesystem-allowlisted, fresh pty)│  │
│  │  Manifest  │    │                                     │  │
│  │  Validator │    │   ┌──────────────────────────────┐  │  │
│  │  (tiered)  │    │   │  model-invoke (cheval)       │  │  │
│  └────────────┘    │   │  → headless adapter (CLI)    │  │  │
│        ↑           │   │  or → API adapter            │  │  │
│        │           │   └──────────────────────────────┘  │  │
│  ┌─────┴──────┐    │                                     │  │
│  │ tier config│    │   construct skill execution        │  │
│  │ (yaml)     │    └─────────────────┬───────────────────┘  │
│  └────────────┘                      │                      │
│                    ┌─────────────────▼───────────┐          │
│                    │  Post-exec Output Validator │          │
│                    │  (writes contract, hash,    │          │
│                    │   schema, domain match)     │          │
│                    └─────────────────┬───────────┘          │
│                                      │                      │
│                    ┌─────────────────▼───────────┐          │
│                    │  Handoff Envelope Builder   │          │
│                    │  (terminal status, JCS hash)│          │
│                    └─────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
        │                                       │
        ▼                                       ▼
┌──────────────────────┐         ┌──────────────────────────┐
│  .run/compose/       │         │  .run/compose/           │
│  <run_id>/envelopes/ │         │  persistent/             │
│  stage-N-pass-M.     │         │  <project_id>/...        │
│  invocation.json     │         │  /state.json             │
│  .handoff.json       │         │  (mode:persistent only)  │
└──────────────────────┘         └──────────────────────────┘
```

### 1.2 Layer Boundaries (recap from PRD §6)

| Layer | This SDD owns |
|-------|---------------|
| **Loa framework methodology** | Out — keeps existing PRD/SDD/sprint flow |
| **Hounfour schemas** | Out — vocabulary alignment only (schemas live in `loa-hounfour`) |
| **Finn runtime** | Out — substrate ships before Finn integration |
| **Construct expertise** | Out — refines substrate, not pack contents |
| **Composition runner** | **In** — extends `compose-run.sh`, `construct-compose.sh`, `stage-executor-tmux.sh` |
| **Stage executor process model** | **In** — subprocess + isolation enforcement |
| **Manifest schema validators** | **In** — tiered enforcement |
| **Envelope schemas (v0)** | **In** — author here, migrate to Hounfour later |

### 1.3 Composition with Cycle-098 Infrastructure

| Existing primitive | Use |
|---|---|
| `lib/jcs.sh` (RFC 8785 JCS canonicalization) | Mandatory for all hash construction |
| `agent-network-envelope.schema.json` v1.1.0 | Composed (see §3.1 — sibling, not extension) |
| `audit_emit` / `audit_emit_signed` | Reused for envelope hash-chain semantics where audit-grade signing required (opt-in) |
| `lib/scheduled-cycle-lib.sh` flock pattern | Reused for per-composition lock |
| `agent-network-envelope` `prev_hash` chain | Pattern reused (not extended) — see §3.1 |

---

## 2. Open Question Resolutions

### 2.1 Q#1 — `mode: fresh` Process Isolation Depth

**Decision**: **Subprocess + filesystem-allowlist + env-scrub + fresh-pty + new LLM session**, NOT chroot/container.

**Rationale**:
- Chroot/container adds OS-specific code paths (Linux: namespace; macOS: sandbox-exec; Windows: AppContainer) — unmaintainable surface.
- Subprocess + path-allowlist enforced at the file-IO layer covers all 6 leak vectors (FR-4.3) on every supported platform.
- The audit envelope's `process_id` + run_id let us prove leak-vector isolation via test fixture without depending on kernel namespaces.
- If a future operator demands true sandbox isolation (e.g., for untrusted construct packs), it composes additively as a `context_policy.sandbox_mode` flag — out of scope for this initiative.

**Implementation**:
- Subprocess invocation via `bash -c` with explicit `env -i` + reconstructed allowlisted env vars.
- Filesystem allowlist enforced per platform (see surface table below); fallback to in-process check (subprocess validates each `open()` against allowlist regex) when platform-native primitive unavailable.
- Fresh pty: `script -q /dev/null bash -c '<construct invocation>'` produces a new pty *for the subprocess* — adversarial test (FR-4.3 #5) verifies the construct cannot read its own pty's prior scrollback (it has none) but does NOT claim the operator's pty is invisible (the operator's pty is the parent, not the target).
- New LLM session: cheval `model-invoke` invocation always passes `--session-id "stage-${run_id}-${stage_id}"` — never reuses an operator session.

**Platform isolation surface table** (closes Bridgebuilder HIGH-1):

| Mechanism | Linux | macOS | Windows |
|---|---|---|---|
| Subprocess env scrub | `env -i` + allowlist (portable) | same | same |
| Filesystem read allowlist | `bwrap` (preferred) → `LD_PRELOAD` (fallback) → in-process check | dyld interposition (`DYLD_INSERT_LIBRARIES`) → in-process check (Sequoia hardened-runtime requires entitlement; in-process is default) | NEEDS_DECISION (out of scope this cycle; advisory mode only) |
| Filesystem write allowlist | same as read | same as read | NEEDS_DECISION |
| Fresh pty | `script -q /dev/null` (util-linux) | `script -q /dev/null` (BSD util-linux variant) | NEEDS_DECISION |
| New LLM session | cheval `--session-id` (provider-agnostic) | same | same |
| Network egress allowlist | userspace HTTP/HTTPS proxy (default) ⊕ network namespace (opt-in, requires `CAP_SYS_ADMIN`) | userspace proxy only | NEEDS_DECISION |
| MCP/tool allowlist | per-stage allowlist via cheval invocation env | same | same |

**macOS-Sequoia caveats**: dyld closure caches and hardened-runtime restrictions can prevent `DYLD_INSERT_LIBRARIES` on signed binaries. The in-process fallback is the default macOS path until a notarized helper is available. Operators on Linux with `CAP_SYS_ADMIN` may opt into `bwrap` for stronger guarantees; the runner detects availability and degrades gracefully.

**Windows**: out of scope this cycle. Compositions running on Windows fall back to advisory-only isolation; adversarial test suite (FR-4.3) does not gate Windows builds.

### 2.2 Q#7 — Cycle-098 Envelope Reuse vs Sibling

**Decision**: **Sibling shape** (`loa.construct.invocation.v0`, `loa.construct.handoff.v0`) that **composes** the cycle-098 hash-chain semantics but does not extend `agent-network-envelope.schema.json` directly.

**Rationale**:
- Cycle-098 envelope's purpose is L1-L7 audit (capability claims, trust transitions, soul identity, structured handoff). Construct invocation envelope's purpose is composition execution (which construct, what domain, what reads/writes).
- Forcing inheritance would either bloat the audit envelope with composition fields irrelevant to L1-L7, or pollute the construct envelope with audit fields irrelevant to composition replay.
- Both use JCS hash-chain semantics (FR-1.6) — that's the right level of reuse. Schema separation keeps the contracts independently evolvable.
- For audit-grade workloads, operators opt in to `audit_emit_signed` on top of the construct envelope — a layered approach that costs nothing if not used.

**Implementation**:
- Schemas at `.claude/schemas/runtime/construct-invocation-v0.schema.json` and `construct-handoff-v0.schema.json`.
- Hash chain semantics shared with cycle-098 via `lib/jcs.sh` and a new `lib/envelope-chain.sh` helper that handles `prev_hash` linkage for both shapes.
- When `composition.audit_signed: true` is set, envelopes are also emitted via `audit_emit_signed` to `.run/compose/<run_id>/audit.jsonl` (signed chain). Default off.

### 2.3 Q#9 — Network Egress Mechanism

**Decision**: **Userspace egress filter via subprocess HTTP/HTTPS proxy** (cross-platform). Linux network namespace as opt-in advanced mode for operators with capabilities.

**Rationale**:
- Network namespaces are Linux-only and require `CAP_SYS_ADMIN` or root. Most operator dev environments (macOS) can't use them.
- Userspace filter: stage subprocess gets `HTTP_PROXY` / `HTTPS_PROXY` env vars pointing at a local egress filter that allowlists hosts:port pairs from `context_policy.allowed_egress[]`.
- Egress filter binary: `.claude/scripts/lib/egress-filter.py` (a small mitmproxy-style filter — already proven via cycle-098 audit infrastructure on similar use cases).
- Operators wanting kernel-level enforcement can set `context_policy.network_namespace: true` (Linux-only); falls back gracefully on other OSes.

**Implementation**:
- Default: deny-by-default. `allow_network: false` blocks the proxy entirely (proxy returns 403 for any request).
- When `allow_network: true` and `allowed_egress[]` present, proxy permits matching host:port pairs.
- Egress filter logs every attempted request to `.run/compose/<run_id>/stage-<n>/egress.jsonl` for audit.

**HTTPS proxy mode commitment** (closes Flatline IMP-003 + HIGH-3 CA-trust gap):

The egress proxy operates in **CONNECT-only mode** for HTTPS. It does NOT MITM (no CA trust required, no certificate manipulation). This means:
- Proxy can enforce host:port allowlist via the `CONNECT host:port` request line.
- Proxy CANNOT enforce path-level controls (URL paths are inside the encrypted tunnel).
- TLS-pinned clients (AWS SDKs, Google APIs, GitHub) work normally — no MITM rejection.
- Trade-off accepted: weaker policy granularity for stronger client compatibility.

For path-level controls, operators must use a per-construct credential (e.g., scoped GitHub token) rather than relying on proxy-side policy. Documented as `network_isolation_class: connect_proxy` in `context_policy`.

**Advisory-tier scope explicit**: HTTP_PROXY/HTTPS_PROXY env vars are honored only by HTTP_PROXY-aware code paths. They do NOT cover: raw sockets, DNS-over-UDP, SSH, git CLI, package managers (pip/npm/cargo), Go's `net.Dialer` (only `net/http` honors), MCP tools that open direct sockets. Advisory tier explicitly accepts this limitation; strict tier requires Linux network namespace to close the gap.

**Fail-closed semantics** (closes Bridgebuilder HIGH-2):

The egress proxy is a subprocess and could die mid-stage (panic, OOM, signal). The system MUST fail closed:
- The stage executor monitors the proxy via PID. A `pidwait` watcher fires within 1 second of proxy exit.
- On proxy exit, the stage subprocess is `SIGKILL`'d.
- The stage handoff is written with `status: failure`, `error.code: [EGRESS-PROXY-DOWN]`, `error.recoverable: false`.
- Bypass behavior is impossible: the proxy is the *only* network path because `HTTP_PROXY`/`HTTPS_PROXY` are set and direct sockets are blocked at OS level (Linux: iptables; macOS: PF rules where supported; in-process fallback: subprocess linker stubs out `connect(2)` for non-proxy destinations).
- A sentinel test (`tests/composition/adversarial/egress-proxy-die.yaml`) kills the proxy mid-stage and verifies `[EGRESS-PROXY-DOWN]` within 1 second, no requests to unlisted hosts.

This follows Netflix Zuul's fail-fast sidecar pattern: when the sidecar dies, the path dies too — silent bypass would be a data-leak window.

### 2.4 Q#10 — Legacy Compatibility-Contract Format

**Decision**: **Hand-authored YAML at `.claude/data/legacy-domain-contracts/<slug>.yaml`**, generated as a starter from existing manifest + heuristics, then operator-curated.

**Rationale**:
- Pure heuristic generation produces vague contracts that defeat the purpose.
- Pure hand-authoring is too high-friction for 17+ legacy packs.
- Hybrid: `.claude/scripts/legacy-contract-bootstrap.sh <slug>` produces a starter YAML with: declared domain (best-guess from skill names + memory hits), declared streams (heuristic from `composes_with`), `out_of_domain` (empty — operator must fill), invariants (empty — operator must fill).
- Operator reviews + completes the starter before the pack can run in compatibility mode.

**Implementation**:
- Schema at `.claude/schemas/network/legacy-domain-contract.schema.json`.
- Bootstrap script generates starter; `construct-validate.sh` rejects starter-only contracts (must have non-empty `out_of_domain` + at least one invariant).
- Compatibility-mode runs use the contract instead of the manifest's domain block. Generated contract has `validation_tier: compatibility` marker.

---

## 3. Data Model

### 3.1 ConstructInvocationEnvelope

**Schema**: `loa.construct.invocation.v0` at `.claude/schemas/runtime/construct-invocation-v0.schema.json`.

```yaml
schema_version: "loa.construct.invocation.v0"
run_id: "run_2026_05_08_001"
composition_id: "audit-feel@sha256:a3f2..."   # FR-1.5: deterministic from {path, hash}
stage_id: "audit-feel.stage-1"
stage_pass: 1                                  # iteration pass number; 1 = first run

construct:
  slug: artisan
  version: "1.0.0"
  persona: ALEXANDER
  skill: decomposing-feel

domain:
  primary: interface-craft
  active_language: [material, rhythm, affordance, motion]
  invariants:
    - craft judgment must be tied to observable surface evidence

mode: fresh                                    # fresh | persistent

input_streams:
  - type: Intent
    uri: "grimoires/loa/runs/run_2026_05_08_001/input.intent.json"
    schema_id: "loa.stream.Intent.v1"
    hash: "sha256:..."
  - type: Artifact
    uri: "apps/web/components/navbar.tsx"
    schema_id: "loa.stream.Artifact.v1"
    hash: "sha256:..."

allowed_context:
  methodology:
    - ".claude/constructs/packs/artisan/skills/decomposing-feel/SKILL.md"
  topology:
    - "grimoires/loa/prd.md"
    - "grimoires/loa/sdd.md"
  operator_model:
    - "grimoires/loa/context/operator-model.md"

context_policy:
  include_prior_transcript: false
  include_unread_stage_outputs: false
  include_unlisted_grimoires: false
  allowed_read_paths:                          # FR-13.2
    - "grimoires/loa/runs/run_2026_05_08_001/**"
    - "apps/web/components/navbar.tsx"
    - ".claude/constructs/packs/artisan/skills/decomposing-feel/**"
  allowed_write_paths:                         # FR-13.2
    - ".run/compose/run_2026_05_08_001/stage-1/output/**"
  allowed_env_vars:                            # FR-4.1: env scrub
    - PATH
    - HOME
    - LANG
  allow_network: false
  allowed_egress: []                           # FR-13.1: empty when allow_network false
  llm_session_strategy: fresh                  # fresh | continue
  allowed_mcp_tools: []                        # FR-4.1: tool allowlist; empty default
  network_namespace: false                     # Linux-only opt-in

output_contract:
  writes:
    - type: Signal
      schema_id: "loa.stream.Signal.v1"
      destination: ".run/compose/run_2026_05_08_001/stage-1/output/decomposition.signal.json"
      required: true                           # FR-11.1: count enforcement

prev_hash: null                                # null for first stage; sha256 of prior envelope JCS-canonicalized
invocation_hash: "sha256:..."                  # JCS-canonicalized self-hash (lib/jcs.sh)
```

**Hash chain semantics** (FR-1.6) — explicit algorithm with worked example (closes Flatline HIGH-1 self-reference + IMP-002 worked-example):

Each envelope JSON has TWO derived hashes built in a strict order. Self-reference is avoided by computing the hash field in two passes: first canonicalize WITHOUT the hash field; second insert the resulting hash into a fresh field.

**Algorithm**:
1. Build envelope object E with all fields populated EXCEPT `invocation_hash` (or `handoff_hash`).
2. `prev_hash`: 
   - First stage in run: `null`.
   - Subsequent invocation envelope: `sha256(jcs_canonicalize(prior_stage_handoff_envelope))`. The chain links **invocation → prior handoff**, NOT invocation → prior invocation.
   - Subsequent handoff envelope: `sha256(jcs_canonicalize(paired_invocation_envelope))`. Each handoff links to its own invocation in the same stage.
3. Set E.prev_hash to the value computed in step 2.
4. Compute `self_hash = sha256(jcs_canonicalize(E))` — note E does NOT yet have `invocation_hash`/`handoff_hash` field set.
5. Set E.invocation_hash (or E.handoff_hash) = self_hash.
6. Persist E.

**Chain topology**:
```
stage 1 invocation (prev_hash=null, invocation_hash=I1)
   ↓ (paired by stage)
stage 1 handoff    (prev_hash=I1,    handoff_hash=H1)
   ↓ (chain to next stage)
stage 2 invocation (prev_hash=H1,    invocation_hash=I2)
   ↓
stage 2 handoff    (prev_hash=I2,    handoff_hash=H2)
   ↓
...
```

**Worked example** (toy 2-stage run):

```json
// stage-1.invocation.json
{ "stage_id": "audit-feel.stage-1", "prev_hash": null, "invocation_hash": "<I1>" }

// stage-1.handoff.json
{ "stage_id": "audit-feel.stage-1", "prev_hash": "<I1>", "handoff_hash": "<H1>" }

// stage-2.invocation.json
{ "stage_id": "audit-feel.stage-2", "prev_hash": "<H1>", "invocation_hash": "<I2>" }

// stage-2.handoff.json
{ "stage_id": "audit-feel.stage-2", "prev_hash": "<I2>", "handoff_hash": "<H2>" }
```

**Chain-break detection** at run startup walks the full chain and verifies:
- Each invocation's `prev_hash` equals prior stage's `handoff_hash` (or null for stage 1).
- Each handoff's `prev_hash` equals its paired invocation's `invocation_hash`.
- Each envelope's self-hash recomputes correctly when the hash field is omitted.

Mismatch → `[ENVELOPE-CHAIN-BROKEN]` + abort. Closes Flatline HIGH-2 (envelope chain linkage inconsistent between §3.2 and §6.2).

**`composition_id` derivation** (closes IMP-001 — must be deterministic and explicit):

```
composition_id = "{basename(path)}@sha256:{first_12_chars(sha256(jcs_canonicalize(yaml_content)))}"

Example: "audit-feel.yaml@sha256:a3f2b1d4e5c6"
```

YAML content is the parsed-then-canonicalized form (key order normalized via JCS), not the raw bytes. This makes the id stable across formatting changes (whitespace, key reordering) but unstable across semantic changes (any field add/remove/modify changes the id). Two YAMLs at the same path with different content produce different ids — closes the original concern.

### 3.2 ConstructHandoffEnvelope

**Schema**: `loa.construct.handoff.v0` at `.claude/schemas/runtime/construct-handoff-v0.schema.json`.

```yaml
schema_version: "loa.construct.handoff.v0"
run_id: "run_2026_05_08_001"
composition_id: "audit-feel@sha256:a3f2..."
stage_id: "audit-feel.stage-1"
stage_pass: 1
construct_slug: artisan
skill: decomposing-feel

status: success                                # FR-12.1: success | failure | timeout | cancelled | refused

outputs:
  - type: Signal
    uri: ".run/compose/run_2026_05_08_001/stage-1/output/decomposition.signal.json"
    schema_id: "loa.stream.Signal.v1"
    hash: "sha256:..."
    domain:
      primary: interface-craft
      produced_by: artisan

summary:
  visible_to_operator: true
  text: "Material/motion/rhythm factors extracted from target surface."

next_allowed_reads:
  - Signal

# Conditional fields by status:
error: null                                    # populated when status != success
# error:
#   code: "[OUTPUT-CONTRACT-VIOLATION]"
#   message: "Output 'decomposition.signal.json' missing required field 'rhythm_score'"
#   recoverable: false

partial_outputs:
  disposition: discarded                       # discarded | quarantined | marked_non_consumable
  count: 0

prev_hash: "sha256:..."                        # links to invocation_hash of paired envelope
handoff_hash: "sha256:..."                     # JCS self-hash
```

### 3.3 Persistent State Composite Key (FR-5)

```yaml
# .run/compose/persistent/<project_id>/<composition_id>/<construct_slug>/<skill_slug>/<stage_id>/<schema_version>/state.json
key:
  project_id: "loa-constructs"                 # from .loa.config.yaml::project_id (new field, derived from cwd if absent)
  composition_id: "audit-feel@sha256:a3f2..."  # FR-1.5 deterministic id
  run_id: "run_2026_05_08_001"                 # NOT in the key path — runs share state if scoped at higher levels
  construct_slug: artisan
  skill_slug: decomposing-feel
  stage_id: "audit-feel.stage-1"               # FR-5.1: included to prevent collision when same skill at multiple stages
  schema_version: "v1"                         # bump triggers fresh state, no auto-migration

state:
  last_updated: "2026-05-08T20:30:00Z"
  last_accessed: "2026-05-08T20:30:00Z"        # tracked separately for opt-in TTL policy
  ttl_expires: "2026-06-07T20:30:00Z"          # FR-5.4: 30-day default; computed per ttl_policy
  ttl_policy: write                            # write (default) | access — see below
  payload: { ... }                              # construct-defined

lock_path: "<state.json>.lock"                 # file lock during writes (flock)
```

**Note**: `run_id` is intentionally absent from the path. Persistent state survives across runs; the path key represents persistent identity, not run identity. If a construct wants run-scoped state, it uses `mode: fresh` and the envelope's `input_streams[]` as input rather than the persistent store.

**TTL policy choice** (closes Bridgebuilder MEDIUM-2):

| Policy | Semantics | When to use |
|---|---|---|
| `write` (default) | TTL = `last_updated + ttl_seconds`. Reads do not extend TTL. | Predictable lifecycle. Writer-controlled. The default for nearly all use cases. |
| `access` (opt-in) | TTL = `max(last_updated, last_accessed) + ttl_seconds`. Any read or write extends TTL. | Long-running constructs that frequently read but rarely write their state. Opt in via `composition.persistent_state_ttl_policy: access` at composition or stage level. |

Both policies are implemented; the policy field is recorded in the state file at first write. Policy changes mid-life require explicit migration (operator runs `compose-state-migrate.sh --slug X --policy access`).

Per Redis EXPIRE conventions: TTL-on-write is the default because it is predictable; TTL-on-touch is opt-in because it is more forgiving but harder to reason about. Document the choice explicitly so operators don't trip on the difference.

### 3.4 Validation Tier Configuration

**Path**: `.claude/data/construct-validation-tiers.yaml`

```yaml
schema_version: 1
default_tier: advisory                         # default for unlisted packs

# Pack-class explicit assignments
tiers:
  strict:
    description: "New packs (post-cutoff date) and top-12 high-use packs."
    cutoff_date: "2026-05-08"                  # New packs after this fail closed
    explicit_packs:                            # top-12 from FR-3.2 telemetry
      - artisan
      - observer
      - protocol
      - beacon
      - mibera-codex
      - k-hole
      - the-easel
      - gecko
      - crucible
      - hardening
      - kansei
      - showcase
    enforcement:
      domain_block: required
      streams: required
      capabilities: required
      context_policy: required
      out_of_domain: required
      compatibility_contract: forbidden

  compatibility:
    description: "Legacy packs that opt into bounded-context mode via generated contract."
    requires_contract: true
    contract_path_template: ".claude/data/legacy-domain-contracts/{slug}.yaml"
    enforcement:
      domain_block: contract                   # fulfilled by contract, not manifest
      streams: contract
      capabilities: contract
      context_policy: contract
      out_of_domain: contract
      starter_contract_rejected: true          # bootstrap-only contracts can't run

  advisory:
    description: "Pre-substrate packs without contract; warn-only, cannot run in golden-path validation."
    enforcement:
      domain_block: warn
      streams: warn
      capabilities: warn
      context_policy: warn
      out_of_domain: warn
      runner_eligibility: golden_path_blocked   # cannot participate in audit-feel + similar
```

### 3.5 Top-12 Selection Telemetry (FR-3.2)

**Script**: `.claude/scripts/construct-usage-rank.sh`

Inputs (composite signal) — **with explicit signal-cleaning rules per Bridgebuilder HIGH-3**:

| Signal | Cleaning rule |
|---|---|
| Memory-scan hit count from `grimoires/loa/memory/observations.jsonl` + Claude memory dump | (a) Deduplicate by source path before counting; (b) **filter generated artifacts**: anything under `.run/`, `.ck/`, `tests/`, generated indexes, archived cycle directories; (c) cap per-source-path at 1 hit (cross-archive amplification rejected). |
| Manifest reference count: occurrences in other constructs' `composes_with[]` | No filter — manifest references are authored signal, not generated noise. |
| Composition appearance: occurrences in `compositions/**/*.yaml` | Deduplicate by composition file path; archived/draft compositions excluded by name pattern (`*-archive.yaml`, `*-draft.yaml`). |

**Manifest-reference signal is REQUIRED, not additive**: a construct named in 0 other manifests cannot rank top-12 regardless of memory hit count. This filters out constructs whose memory presence is artifact-amplified rather than ecosystem-integrated.

Output: `top-12.json` with per-pack rank + composite score + signal breakdown (memory_hits, manifest_refs, composition_appearances). Re-rank cadence: per cycle review (deferred from this initiative per Open Q #3).

For this initiative, **top-12 is frozen** at the audit's reported list (FR-3.2). The script ships for future re-rank but does not gate this initiative's top-12 decision. When future re-rank is run, the rules above apply — the audit's noted "directional" memory signal cannot reproduce as authoritative ranking.

---

## 4. Component Design

### 4.1 Stream-Graph Validator (FR-6)

**Location**: `.claude/scripts/lib/compose-stream-graph.sh` + `compose-stream-graph.py` (Python for graph algos).

**Inputs**:
- Composition YAML
- Per-stage construct manifest (resolved via `.claude/scripts/construct-resolve.sh`)
- Stream schemas (`.claude/schemas/streams/*.schema.json`)

**Algorithm**:
1. Build directed graph: nodes = stages, edges = `reads` consume `writes` produced by upstream stages.
2. For each stage, verify every `reads:` entry has at least one upstream producer OR is provided as an external `input_streams[]` from the composition's input.
3. Verify type/schema_id compatibility: stage's `reads:` type must match upstream's `writes:` type and `schema_id`.
4. For iteration edges (`iterate: [[N, M]]`): treat M's `writes:` as an additional `reads:` source for N on pass ≥ 2.
5. Verify iteration mandates: `composition.max_iterations` and `composition.terminate_when` (or per-iteration block) present.

**Errors**:
- `[STREAM-NO-PRODUCER]` — read with no upstream
- `[STREAM-SCHEMA-MISMATCH]` — type/schema_id mismatch
- `[STAGE-OUT-OF-DOMAIN]` — stage's `domain.primary` doesn't match the construct's declared domain
- `[ITERATION-NO-MAX]` — `iterate:` without `max_iterations`
- `[ITERATION-NO-TERMINATION]` — `iterate:` without termination predicate

### 4.2 Envelope Builder

**Location**: `.claude/scripts/lib/envelope-builder.sh` + `lib/envelope-chain.sh`.

**Responsibilities**:
- Build invocation envelope from composition YAML + construct manifest + upstream handoff envelopes + runtime context.
- Compute `prev_hash` by reading the prior stage's handoff envelope (or null for first stage).
- Compute `invocation_hash` via JCS canonicalization (`lib/jcs.sh`).
- Persist to `.run/compose/<run_id>/envelopes/stage-<n>-pass-<m>.invocation.json`.
- Handoff envelope built post-execution by the same library.

### 4.3 Stage Executor (FR-4 isolation enforcement)

**Location**: `.claude/scripts/stage-executor-tmux.sh` (extended) + new `lib/stage-isolation.sh`.

**Pre-execution setup** (`mode: fresh`):

1. Read invocation envelope to get `context_policy` and `isolation_tier`.
2. **Strict tier**: pre-execution validator confirms `bwrap` + `CAP_NET_ADMIN` + provider memory-disable flags (§6.5b). If any missing, abort with `[STRICT-TIER-PREREQ-MISSING]`.
3. Construct subprocess invocation **using argv arrays — NEVER `bash -c` with string interpolation** (closes Flatline CRITICAL #3 command-injection vector):
   - **Strict tier (Linux+bwrap)**:
     ```python
     argv = [
       "bwrap",
       "--ro-bind", "/usr", "/usr",
       "--ro-bind", "/lib", "/lib",
       *flatten(["--ro-bind", p, p] for p in allowed_read_paths),
       *flatten(["--bind", p, p] for p in allowed_write_paths),
       "--unshare-net",  # network namespace (deny-by-default at kernel)
       "--unshare-pid",
       "--unshare-uts",
       "--die-with-parent",
       "--",
       "script", "-q", "/dev/null",
       construct_skill_path,  # individual argv element, never string-concatenated
       *construct_args,
     ]
     env = {k: os.environ[k] for k in allowed_env_vars if k in os.environ}
     subprocess.run(argv, env=env, check=False, timeout=stage_timeout)
     ```
   - **Advisory tier (no bwrap)**:
     ```python
     argv = [
       "env", "-i",
       *[f"{k}={shlex.quote(os.environ.get(k, ''))}" for k in allowed_env_vars],
       "script", "-q", "/dev/null",
       construct_skill_path,
       *construct_args,
     ]
     # LD_PRELOAD or DYLD_INSERT_LIBRARIES path-allowlist shim, when available
     if shutil.which("ld-preload-allowlist") and not is_macos_signed_binary(construct_skill_path):
       env["LD_PRELOAD"] = "/path/to/allowlist.so"
       env["LOA_ALLOWED_PATHS"] = ":".join(allowed_read_paths + allowed_write_paths)
     subprocess.run(argv, env=env, check=False, timeout=stage_timeout)
     ```
4. Filename / argument validation: every entry in `argv` undergoes `shlex.quote` for env values; paths in `allowed_read_paths[]` / `allowed_write_paths[]` are canonicalized via `realpath` to close symlink-traversal escape (Flatline HIGH-3).
5. Start egress filter on a local port if `allow_network: true`. **Strict tier**: filter binds to a network namespace endpoint and is the only way out; raw sockets / DNS blocked at namespace. **Advisory tier**: `HTTP_PROXY=http://localhost:<port>` set; raw sockets / DNS / UDP / SSH / git / package managers explicitly NOT covered (advisory tier limit).
6. Generate fresh LLM session ID; pass to model-invoke as `--session-id`. Cheval adapter additionally passes provider-specific memory-disable flag:
   - `claude-headless`: `--memory-disabled` (translates to omitting Anthropic memory tool from tool list)
   - `codex-headless`: `--no-chatgpt-memory` (sets OpenAI `disable_chatgpt_memory: true` where supported)
   - `gemini-headless`: `--no-saved-info` (sets Gemini `saved_info_disabled: true`)
   Closes Flatline HIGH-5 (provider memory features bypassing session-id).
7. Set `LOA_STAGE_ENVELOPE_PATH=<envelope.json>` in subprocess env so the construct skill can self-introspect.

**Execution**:
- Subprocess invokes the construct skill via standard skill-invocation mechanism.
- Skill output goes to `allowed_write_paths[]` only.
- Egress filter logs all network requests.

**Post-execution**:
- Run post-exec output validator (§4.4).
- Build handoff envelope.
- Tear down egress filter.

**Failure modes**:
- Subprocess timeout → handoff `status: timeout`.
- Subprocess non-zero exit → handoff `status: failure`, capture stderr in `error.message`.
- Path-allowlist violation → subprocess SIGKILL'd; handoff `status: failure`, `error.code: [POLICY-VIOLATION-READ]` or `[POLICY-VIOLATION-WRITE]`.
- Egress violation → handoff `status: failure`, `error.code: [POLICY-VIOLATION-NETWORK]`.

### 4.4 Post-Execution Output Validator (FR-11)

**Location**: `.claude/scripts/lib/output-gate.sh`.

**Per declared output in `output_contract.writes[]`**:
1. File exists at `destination` path.
2. JSON parses cleanly.
3. Validates against `schema_id` (loaded from `.claude/schemas/streams/<id>.schema.json`).
4. Includes canonical `hash` field; recompute via JCS and compare.
5. `domain.produced_by` matches the construct's declared `domain.primary` (or appears in `domain.supporting[]`).

**Output count enforcement**: the count of files in `allowed_write_paths[]` must match `len(output_contract.writes[])` for required outputs. Extra files = `[ORPHAN-OUTPUT]`. Missing required = `[OUTPUT-MISSING]`.

**On failure**: stage handoff `status: failure`, `error.code: [OUTPUT-CONTRACT-VIOLATION]`. Outputs marked `partial_outputs.disposition: marked_non_consumable`.

### 4.5 Persistent State Manager (FR-5)

**Location**: `.claude/scripts/lib/persistent-state.sh`.

**API**:
```bash
persistent_state_get <project_id> <composition_id> <construct_slug> <skill_slug> <stage_id> <schema_version>
persistent_state_set <...> <state_json>
persistent_state_gc                         # via cron; removes state past TTL
```

**Locking** (closes Flatline IMP-009 + HIGH on torn reads): each state file paired with `<file>.lock` via `flock(2)`. Writers use exclusive lock + atomic-rename pattern:
1. Acquire exclusive flock on `<file>.lock`.
2. Write new state to `<file>.tmp`.
3. `fsync(<file>.tmp)`.
4. `rename(<file>.tmp, <file>)` (atomic on POSIX-compliant filesystems).
5. Release flock.

Readers acquire shared flock during read; this serializes against writers. Multiple concurrent readers are permitted.

**Migration**: schema_version mismatch → fresh state, log `[STATE-SCHEMA-MIGRATION]` for operator awareness. No auto-migration.

**Cleanup with race coordination** (closes Flatline HIGH on GC race):

`compose-state-gc.sh` runs daily via cron (operator-configurable). For each candidate file with `ttl_expires < now`:
1. Attempt to acquire exclusive flock on `<file>.lock` with **0-second timeout** (non-blocking). If lock held by a running composition, skip and retry next cycle.
2. After acquiring lock, re-check ttl_expires (file may have been written since the cron's directory walk).
3. Additionally, refuse deletion if `mtime` is within last 4 hours (matches L3's `max_cycle_seconds` default — heuristic protection against long-running compositions).
4. If both checks pass, delete the file. Release lock.

Sentinel test: `tests/composition/race/gc-vs-running-composition.sh` runs a composition with persistent state writes interspersed with GC runs; verifies state survives.

### 4.6 Iteration Auditor (FR-7.4)

**Location**: `.claude/scripts/compose-iteration-audit.sh`.

**Phase 1 — Enumerate**: walks `compositions/**/*.yaml`, finds every `iterate:` block, prints a report.

**Phase 2 — Dual-run**: `compose-run --dry-run --iteration-mode=dual` runs both legacy (persistent-leak) and new (stream-edge) semantics for an iteration block. Output: `.run/compose/<run_id>/iteration-diff.json`.

**Diff semantic layers** (closes Bridgebuilder HIGH-4 — LLM outputs are non-deterministic, naive byte-diff is meaningless):

| Layer | Determinism | Diff semantic | Gate? |
|---|---|---|---|
| **L1 Envelope diff** | Deterministic | Byte-equal except for hash-chain values, timestamps, run_id | **Gates migration** — must match modulo whitelisted fields |
| **L2 Output schema diff** | Deterministic | Output count, types, schema_ids match; required outputs all present | **Gates migration** — any divergence = blocker |
| **L3 Output payload diff** | Non-deterministic | Shape-equal (same JSON keys, types) but content may diverge | **Informational** — reported as "shape-equal, content-divergent" — not a gate |

L1 + L2 must be identical between legacy and new semantics for the migration to advance to opt-in default. L3 divergence is expected and tracked as a metric (semantic similarity via embedding distance is a follow-up; for this cycle, L3 is logged for operator review only).

This follows Google's diff-testing pattern for ML systems: shape contracts (output structure) gate the test, content drift is a metric not a gate.

**Phase 3 — Opt-in flag**: `composition.iteration_mode: stream_edge` opts a composition into the new semantics. Default remains `persistent_leak` until 100% of catalogued compositions pass L1+L2 dual-run.

**Validator integration**: stream-graph validator (§4.1) treats both modes; only the executor diverges.

### 4.7 Dry-Run Engine (FR-9, IMP-007)

**Location**: `.claude/scripts/compose-run.sh --dry-run --explain-context [--json]`.

**Output structure** (JSON, validates against `.claude/data/dry-run-fixture.schema.json`):
```yaml
composition:
  path: "compositions/audit-feel.yaml"
  composition_id: "audit-feel@sha256:..."
stages:
  - stage_id: "audit-feel.stage-1"
    construct: artisan
    skill: decomposing-feel
    mode: fresh
    invocation_envelope_preview: { ... }     # full envelope contents
    allowed_files: [...]
    missing_schemas: []
    domain_conflicts: []
    isolation_assessment:
      ok: true
      vectors_covered: [filesystem, env, tmux, llm_session, mcp_tools, network]
    persistence_scope: null                  # mode: fresh
    iteration_role: null                     # not in iteration
warnings: []
errors: []
```

CI gate (per IMP-007): `compose-run --dry-run --json | jq -e '.errors == []'` blocks merge if any composition has errors.

---

## 5. APIs

### 5.1 `compose-run.sh`

```bash
# Full run
compose-run.sh <composition.yaml>

# Dry-run with envelope preview
compose-run.sh <composition.yaml> --dry-run --explain-context [--json]

# Iteration dual-run
compose-run.sh <composition.yaml> --dry-run --iteration-mode=dual

# Run with audit-grade signed envelope chain (cycle-098 audit_emit_signed)
compose-run.sh <composition.yaml> --audit-signed
```

### 5.2 `construct-validate.sh`

```bash
# Validate a single pack against its tier
construct-validate.sh <slug>

# Validate all packs (CI)
construct-validate.sh --all --strict
```

### 5.3 `construct-usage-rank.sh` (FR-3.2)

```bash
# Re-rank top-12 (cadence per cycle)
construct-usage-rank.sh --output .claude/data/construct-validation-tiers.yaml.proposed
```

### 5.4 `legacy-contract-bootstrap.sh` (Open Q #10)

```bash
# Generate starter contract for a legacy pack
legacy-contract-bootstrap.sh <slug>
# → .claude/data/legacy-domain-contracts/<slug>.yaml (operator must complete)
```

### 5.5 `compose-iteration-audit.sh` (FR-7.4)

```bash
# Phase 1 enumerate
compose-iteration-audit.sh --phase enumerate --json

# Phase 2 dual-run (per-composition)
compose-iteration-audit.sh --phase dual-run --composition <path>
```

---

## 6. Security Architecture

### 6.1 Leak Vector Enforcement Matrix (FR-4.3, tier-conditional per §6.5b)

| Vector | Strict-tier mechanism | Advisory-tier mechanism | Adversarial test (strict only) |
|---|---|---|---|
| Prior transcript | `mode: fresh` + new LLM session ID + scrubbed env | same (works in both tiers — env scrub is platform-portable) | test 1 |
| Filesystem (read) | `bwrap` filesystem namespace (kernel-enforced) | LD_PRELOAD/dyld interposition + in-process check (cooperative-construct only) | test 2 |
| Filesystem (write) | `bwrap` filesystem namespace | same as advisory read | test 3 |
| Environment vars | `env -i` + `allowed_env_vars[]` (works in both tiers) | same | test 4 |
| tmux scrollback | fresh pty via argv-array `script -q /dev/null <skill>` | same | test 5 |
| LLM session reuse | new session ID + provider memory disable verified | new session ID only (memory-disable not verified — provider may recall) | test 6 (session) + test 7 (memory) |
| MCP/tool reuse | `allowed_mcp_tools[]` allowlist enforced via cheval | same | test 8 |
| Network egress | Linux network namespace + CONNECT proxy (kernel-enforced) | HTTP_PROXY env (HTTP_PROXY-aware code only) | test 9 + test 10 (DNS/raw socket) |
| Static binary / direct syscall escape | `bwrap` PID + filesystem namespace blocks ambient access | NOT MITIGATED — explicit advisory-tier limitation | test 11 (strict only) |
| Symlink / hardlink traversal | `realpath` canonicalization in path validator + bwrap namespace | `realpath` canonicalization (best-effort; bwrap not present) | test 12 |
| Command injection (argv interpolation) | argv-array invocation (works in both tiers) | same | (covered by code review, no test) |
| Persistent state GC race | flock + 4h mtime guard (works in both tiers) | same | (covered by sentinel test, see §4.5) |

**Strict tier**: 12 adversarial tests must pass (FR-4.3 expanded). Run only on Linux+bwrap+CAP_NET_ADMIN.

**Advisory tier**: leak-vector enforcement is NOT claimed as a security boundary. Substrate provides envelope contract + validation gates + hash chain — those work everywhere; isolation is informational on advisory tier.

### 6.2 Hash Chain Integrity

See §3.1 "Hash chain semantics" for the explicit algorithm with worked example. Summary:

- Each invocation envelope's `prev_hash` links to the prior stage's `handoff_hash` (or null on stage 1).
- Each handoff envelope's `prev_hash` links to its paired invocation's `invocation_hash` (within the same stage).
- Self-hashes (`invocation_hash`, `handoff_hash`) are computed as `sha256(jcs_canonicalize(envelope_without_self_hash_field))`, then inserted into the envelope.

**Chain validation** runs at:
- Run startup: walk full chain (invocations → handoffs alternating), verify each link against §3.1 topology, abort on break with `[ENVELOPE-CHAIN-BROKEN]`.
- Per-stage: invocation envelope reads prior stage's handoff_hash before its own envelope is built; mismatch fails before stage executes.
- Replay: re-canonicalize each persisted envelope and verify hashes still match (catches tampering).

### 6.3 Audit-Grade Signing (Optional)

When `composition.audit_signed: true`:
- Each envelope additionally emitted via `audit_emit_signed` to `.run/compose/<run_id>/audit.jsonl`.
- Uses operator-bootstrapped audit keys (cycle-098 runbook).
- Validates Ed25519 signatures on chain replay.
- Enables L4-L7 audit trail integration (graduated-trust, soul-identity, structured-handoff, cross-repo-status-reader).

**Pre-flight bootstrap check** (closes Bridgebuilder MEDIUM-1):

When the composition declares `audit_signed: true`, the stream-graph validator (FR-6, §4.1) runs an additional gate **before any stage executes**:

1. Verify cycle-098 audit-keys bootstrap state: check `.run/audit-keys/keypair.exists` flag file and `LOA_AUDIT_PRIVATE_KEY_PATH` env var.
2. If keys missing or unreadable: abort with `[AUDIT-KEYS-NOT-BOOTSTRAPPED]` and surface the runbook path:
   ```
   ERROR: composition declares audit_signed: true but audit keys are not bootstrapped.
   See: grimoires/loa/runbooks/audit-keys-bootstrap.md
   ```
3. Exit code 78 (EX_CONFIG) per cycle-098 conventions — distinguishes "operator hasn't generated keys yet" from "data corruption" or "permission denied".

This gate fires at flag-set time (validator phase), not at first-use time (mid-stage). Opt-in features fail more usefully when they fail early.

Default off for golden-path; operators opt in for production composition runs.

### 6.4 Failure Containment

A construct that violates context policy produces:
- Subprocess SIGKILL within 1 second of detection.
- Handoff envelope with `status: failure`, `error.code: [POLICY-VIOLATION-*]`, `error.recoverable: false`.
- Downstream stages cannot consume any output (post-exec validator marks all as `non_consumable`).
- Audit log entry (when audit-signed) records the violation with envelope hash.

### 6.5b Honest Threat Model — Tier-Conditional Isolation (NEW; closes Flatline CRITICAL ×6)

The Flatline review correctly identified that subprocess + LD_PRELOAD/dyld interposition + in-process checks **cannot be a security boundary** against:
- Statically linked binaries (Go, Rust, hand-asm)
- Direct syscall instructions
- Foreign tools invoked via `execve`
- Symlink/hardlink traversal
- Raw socket / DNS / UDP / SSH / package-manager network egress
- Provider memory features (Anthropic memory tool, OpenAI ChatGPT memory, Gemini saved-info)
- TLS-pinned clients (refuse MITM proxies)
- `CAP_NET_ADMIN`-gated network namespaces on systems where the operator lacks privilege

The honest framing is: **the substrate's contract layer is strong; its isolation layer is tier-conditional.**

#### Tier definitions

| Tier | Required environment | Enforcement strength | Use case |
|---|---|---|---|
| **strict** | Linux kernel + `bwrap` + `CAP_NET_ADMIN` + cheval providers with verified memory-disable flags | Kernel-boundary filesystem namespace, kernel-boundary network namespace, kernel-boundary process isolation, verified provider memory disable | Compositions handling sensitive context. Adversarial test suite gates this tier. |
| **advisory** | Linux without `bwrap`, macOS without notarized helper, any system without `CAP_NET_ADMIN` | Cooperative-construct guidance. Does NOT prevent: foreign binary bypass, direct syscalls, raw socket egress, DNS exfiltration, symlink escape (mitigated by `realpath` but not guaranteed), provider memory recall. | Compositions with non-adversarial constructs. Substrate provides envelope contract + validation gates + hash chain — but isolation is informational, not enforced. |

#### What is enforced regardless of tier (the strong contract)

- Invocation envelope (FR-1) — content-addressed, JCS-canonicalized, hash-chained
- Handoff envelope (FR-2) — terminal status, partial-output disposition, immutable
- Stream-graph validation (FR-6) — pre-execution gate
- Post-execution output validation (FR-11) — schema, count, domain attribution
- Persistent state composite key (FR-5) — collision-free, tiered TTL
- Iteration mandates (FR-7.2) — `max_iterations` + termination signal required
- Out-of-domain refusal (FR-8) — structured signal
- Hash chain integrity (FR-1.6, §3.1) — `[ENVELOPE-CHAIN-BROKEN]` on tamper

These guarantees do NOT depend on isolation tier. They are platform-portable, mechanism-independent.

#### What is tier-conditional (the soft enforcement)

- Filesystem read/write allowlist enforcement
- Network egress filter (HTTP_PROXY-only on advisory; namespace+proxy on strict)
- LLM session reset + provider memory disable
- MCP/tool allowlist enforcement
- tmux/pty scrollback isolation
- Out-of-band file-IO surface (subprocesses, shell expansions, hardlinks)

#### Strict-tier prerequisite check

Pre-execution validator (§4.1 stream-graph validator extension):
1. Detect `bwrap` (`command -v bwrap`).
2. Detect `CAP_NET_ADMIN` (`getcap` or running as root).
3. Verify cheval adapter library version supports memory-disable flags for all configured providers.
4. If any check fails AND any composition stage requests `isolation_tier: strict`: abort with `[STRICT-TIER-PREREQ-MISSING]`, exit 78 (EX_CONFIG). Operator must downgrade tier in composition YAML or upgrade environment.

#### Adversarial suite gate

The 12 adversarial tests (FR-4.3 expanded) execute only on strict-tier configurations. CI matrix:

| CI job | Tier | Platform | Adversarial tests |
|---|---|---|---|
| `composition-strict-linux` | strict | Linux+bwrap+CAP_NET_ADMIN | All 12 must pass; gates merge |
| `composition-advisory-linux` | advisory | Linux without bwrap | Suite skipped; envelope/validation tests still run |
| `composition-advisory-macos` | advisory | macOS | Suite skipped; envelope/validation tests still run |

Operators on macOS or non-privileged Linux can develop and run advisory-tier compositions; production strict-tier deployments require Linux+bwrap+CAP_NET_ADMIN.

### 6.5 Out-of-Domain Refusal

Stage's prompt template is constructed from envelope's `domain` block. When the request falls outside the construct's `domain.primary`/`supporting`, the construct skill emits:
```yaml
type: Verdict
verdict: out_of_domain
recommended_next_domain: <slug>
rationale: "<why this is out of domain>"
```

This is structured refusal, not silent expansion. Advisory in this initiative — strict enforcement is a follow-up.

---

## 7. Performance & Scalability

| Surface | Cost | Mitigation |
|---|---|---|
| Envelope I/O per stage | <1ms (small JSON) | Negligible vs model latency |
| JCS canonicalization | <5ms per envelope | Negligible |
| Stream-graph validation | O(stages × reads) — usually <100ms | Cache resolved manifests |
| Path-allowlist check per file open | <1ms | LD_PRELOAD inline check; fallback path validates only at construct skill boundaries |
| Egress filter overhead | ~5-10ms per HTTP request | Only when `allow_network: true` |
| Persistent state read/write | <10ms (file lock + JSON) | Negligible |
| Hash chain validation on startup | O(stages) | Validates once per run, not per stage |
| Adversarial test suite | ~30s for all 9 tests | Runs in CI, not per-composition |

Performance budget: substrate adds <100ms overhead per stage on top of model latency (~30s/stage). Acceptable.

---

## 8. Data Flow

### 8.1 Single-Stage Run (mode: fresh)

```
1. compose-run.sh <composition.yaml>
2. Stream-graph validator → ok
3. For each stage:
   a. Envelope builder → invocation.json (JCS-hashed)
   b. Stage executor:
      - subprocess with env -i + allowlist + fresh pty
      - new LLM session ID via model-invoke
      - cheval routes to headless adapter (subscription) or API
      - construct skill executes
   c. Post-exec validator → all writes match contract
   d. Envelope builder → handoff.json (JCS-hashed, prev_hash = invocation.json's hash)
4. Run complete; envelopes persisted; persistent state TTL extended for any persistent-mode stages
```

### 8.2 Iteration (FR-7)

```
Pass 1:
  Stage N (fresh mode) → writes Verdict
  Stage M (fresh mode, reads N's Verdict) → writes Verdict
Pass 2:
  Stage N's envelope now has input_streams[] = [orig inputs] + [Stage M's pass-1 Verdict]
  Stage N executes (still fresh) → writes Verdict
  Termination check: composition.terminate_when evaluates against Stage M's pass-2 Verdict
  If true → exit; else continue to pass 3 (or hit max_iterations)
```

### 8.3 Failure Handling

```
Stage K subprocess violates path allowlist
  → SIGKILL'd by stage-isolation.sh
  → Stage K handoff = {status: failure, error.code: [POLICY-VIOLATION-READ]}
  → Downstream stages refuse to start; their handoffs = {status: refused, error.code: [UPSTREAM-FAILED]}
  → Run aborts with summary of failure
```

---

## 9. Backwards Compatibility

### 9.1 Pack Class Migration Path

| Class | Current state | Migration step | Run eligibility |
|---|---|---|---|
| New (post-2026-05-08) | n/a | Author full DDD domain block in manifest | Strict — full enforcement |
| Top-12 high-use | Empty domain block | Author DDD domain block in this initiative | Strict — full enforcement |
| Legacy in use | Empty/vague domain | Bootstrap starter contract; operator completes | Compatibility — runs with contract |
| Legacy not in use | Empty/vague domain | No action this initiative | Advisory — cannot run in golden-path |

### 9.2 Composition YAML Migration

| Field | Old | New | Migration |
|---|---|---|---|
| `iterate: [[N, M]]` | implicit persistent-leak loop | requires `max_iterations` + `terminate_when` | validator emits `[ITERATION-NO-MAX]`/`[ITERATION-NO-TERMINATION]`; old compositions must opt in via `iteration_mode: persistent_leak` until updated |
| `mode: fresh` (stage) | partially enforced | fully enforced (all 9 vectors) | new tests fire on next run; expected to surface latent leaks in compositions that only ran by accident |
| `mode: persistent` (stage) | global session leak | fully scoped composite key | state previously written to ambient transcript is now lost on first run; operators must accept and re-build state |

### 9.3 Schema Migration

| Schema | Old | New | Migration |
|---|---|---|---|
| `construct.schema.json` `domain` | string OR array | string OR array OR DDD object | Existing string/array forms continue to validate. New DDD object adds fields. |
| `composition.schema.json` `context_policy` | optional, basic | extended with full FR-1.2 fields | Old compositions get defaults; warn on missing fields |
| Stream schemas | as-is | extension fields `domain.{primary, produced_by}` added | Existing payloads validate; new payloads include domain |

---

## 10. Testing Strategy

### 10.1 Unit Tests

- Envelope builder: JCS hash determinism, `prev_hash` chaining
- Stream-graph validator: every error code reproducible
- Path-allowlist: deny-by-default, allowlist match, glob escape rejection
- Egress filter: deny-by-default, host:port allowlist
- Persistent state: lock contention, TTL expiry, schema-version migration

### 10.2 Adversarial Suite (FR-4.3 + §6.1)

9 leak-vector tests as fixture compositions in `tests/composition/adversarial/`:
- `read-unlisted-grimoire.yaml`
- `read-unlisted-env.yaml`
- `read-tmux-scrollback.yaml`
- `escape-via-glob.yaml`
- `continue-llm-session.yaml`
- `invoke-undeclared-mcp.yaml`
- `unlisted-egress.yaml`
- `write-outside-allowlist.yaml`
- `transcript-leak.yaml`

Each must produce `[POLICY-VIOLATION-*]` and abort. CI gates merges on suite pass.

### 10.3 Golden Path E2E

`audit-feel` composition runs end-to-end with envelope/handoff trail. Fixture: `tests/composition/golden/audit-feel.yaml`.

### 10.4 Iteration Dual-Run

For every composition with `iterate:`, run both modes and assert diff is documented (not necessarily zero). CI gates merges on documented-diff coverage.

### 10.5 Backwards-Compat Suite

For each legacy pack with a generated compatibility contract: run a no-op composition that includes the pack in advisory mode (allowed), compatibility mode (with contract), strict mode (must fail without manifest update).

---

## 11. Migration Plan / Sequencing

| Order | Component | Layer | Rationale |
|---|---|---|---|
| 1 | Envelope schemas (v0) at `.claude/schemas/runtime/` | **CONTRACT** | Everything else depends on the shape |
| 2 | `lib/envelope-builder.sh` + JCS integration | RUNNER | Foundation for runner extensions |
| 3 | `lib/path-allowlist.sh` + `lib/stage-isolation.sh` | RUNNER | Foundation for `mode: fresh` |
| 4 | `compose-run.sh --dry-run --explain-context` | RUNNER | Visibility before enforcement |
| 5 | Stream-graph validator | **CONTRACT** (validator) | Pre-execution gate; portable across runtimes |
| 6 | Post-exec output validator (FR-11) | **CONTRACT** (validator) | Post-execution gate; portable across runtimes |
| 7 | `stage-executor-tmux.sh` extensions | RUNNER | Wire isolation + envelopes into actual runs |
| 8 | Adversarial test suite | RUNNER (tests local executor) | Confirm enforcement works |
| 9 | Persistent state manager (FR-5) | **CONTRACT** (schema) + RUNNER (manager) | Schema portable; manager local |
| 10 | Iteration auditor (FR-7.4) | RUNNER | Independent; can run in parallel with 9 |
| 11 | Validation tier config + `construct-validate.sh` extensions | **CONTRACT** | Apply to manifest enforcement; portable |
| 12 | Top-12 manifest migrations | DATA (per-pack manifests) | Author full domain blocks in 12 packs |
| 13 | Legacy contract bootstrap + operator-curated contracts | DATA + RUNNER | Bootstrap is runner; contracts are data |
| 14 | Documentation + runbooks (envelope migration, audit-keys-bootstrap composition) | DOCS | Operator surface |

Sprints (PRD G7 + G10) target completion of items 1-9 + the `audit-feel` golden path. Top-12 manifest migration (item 12) is concurrent with items 11-14.

### 11.1 Contract / Runner Split Boundary (closes Bridgebuilder REFRAME-1)

This initiative ships the contract and runner *together* in `loa-constructs`. The migration table above labels each item as **CONTRACT** (portable, reusable by any runtime: Finn, future composition platforms, Hounfour validators) or **RUNNER** (local stage-executor utility, tied to subprocess/tmux/this repo's filesystem).

**Why ship together this cycle**:
- The contract is shaped by the runner's needs; co-evolution accelerates discovery.
- Splitting prematurely risks designing a contract that's elegant in isolation but unworkable in execution (the "schema-first frozen" antipattern).
- Both teams (Loa constructs + Finn) are willing to consume the monolith for one cycle while the contract stabilizes.

**Why preserve the split lines now**:
- When Finn (or any other runtime) arrives wanting just the contract, the operator does this split anyway. Naming the boundary now means the future split is a refactor, not an archaeological dig.
- The CONTRACT items (1, 5, 6, 9-schema, 11) form a coherent package: schemas + validators + persistent-state schema + manifest tier config. They could ship as `loa-construct-contract` (npm package or git submodule) without modification.
- The RUNNER items (2, 3, 4, 7, 8, 9-manager, 10, 13-bootstrap) depend on the contract package + local subprocess/tmux infrastructure.

**Future split trigger**: when a second runtime (Finn, or a non-local executor) wants to consume the contract, extract items 1, 5, 6, 9-schema, 11 into a separate package. The boundary table above defines the cut lines. No further design work required at split time — only packaging.

---

## Appendix A — Schema Files

To be authored at:
- `.claude/schemas/runtime/construct-invocation-v0.schema.json`
- `.claude/schemas/runtime/construct-handoff-v0.schema.json`
- `.claude/schemas/network/legacy-domain-contract.schema.json`
- `.claude/data/dry-run-fixture.schema.json`
- `.claude/data/construct-validation-tiers.yaml` (config, not schema)

## Appendix B — Open Items Carried to Sprint Plan

- Cycle naming + ID assignment
- Sprint decomposition (likely 4-6 sprints based on the 14-item migration sequence)
- Beads task creation
- CI gate registration for adversarial suite + dry-run-fixture
- Operator-onboarding doc for the new context_policy fields

# Pre-SEED — Cycle-011 · Vercel-for-Freeside · Seamless CLI + Agent-Reachable Production

> *"Internally, for our next cycle, we are designing our CLI to run seamlessly. We shouldn't have to file an issue or ask Jani to deploy. We should consider the architecture that Vercel follows for their AWS wrapper, and we should copy it so that our UI surface follows a very similar setup that we can start to scaffold and build out to our needs. … we need to design for humans<>agents here."* — operator dispatch 2026-04-24 (cycle-010 close)
>
> *"BEEKEEPER + BEACON / [Building agents that reach production systems with MCP](https://claude.com/blog/building-agents-that-reach-production-systems-with-mcp)."* — operator pointer, same dispatch
>
> **Status**: Pre-SEED · discovery notes captured before full SEED drafts · operator-amendable · ready for cycle-011 open
> **Date**: 2026-04-24
> **Supersedes**: cycle-010 SEED §1.4 CLI scope (`--apply` intentionally absent) — cycle-011 reframes this as **pipeline-absence-at-operator-layer + platform-apply-at-managed-layer**, preserving the composition-seam without operator-Jani pairing at deploy-time.
> **Doctrine to compose**: [[bonfire-at-composition-seam]], [[tool-absence-as-enforcement]] (cycle-010 instance-1), [[mcp-wraps-cli-pattern]], [[operator-as-the-seam]] (instance-2 at product-scale, candidate instance-3 at agent-scale), [[learner-expert-transparency-protocol]], [[culture-building-world-building]], [[constructs-as-packages]]
> **Referenced constructs**: BEEKEEPER (strategic analysis, composed via beehive pack), BEACON (agent-discoverable trust signals + `.well-known` + x402 endpoints, shipped v2.0.0 at `~/.loa/constructs/packs/beacon/`)

---

## 0 · Question-of-the-question (honoring the "question the question" permission)

**Is "copy Vercel's architecture" the right framing?**

Vercel = managed single-tenant multi-project PaaS on AWS with serverless-first (lambda + edge + CDN) and zero-config git-push-to-deploy. Freeside = multi-tenant multi-Workspace platform with ECS-Fargate-first (long-running containers + EFS + ALB) and hand-authored TF today. The BACKEND architectures diverge structurally.

What IS copyable is the **user-story / affordance layer**:

| Vercel verb | Freeside equivalent | State today |
|---|---|---|
| `vercel init` / new project button | `freeside world create` | ✓ cycle-010 bash reference |
| `vercel deploy` | git-push → OIDC → ECS update | ✓ already works per mibera/rektdrop |
| `vercel env add/rm` | operator-side `load-X-secrets.sh` | manual, not self-service |
| `vercel logs` | dashboard Sprint 3 (ECR + ECS events) | partial |
| `vercel domains add` | DNS reconciliation (#173 parallel) | hand-authored |
| `vercel whoami` + org scoping | SIwTHJ session (per [[freeside-as-identity-spine]]) | auth-layer present, CLI/MCP auth absent |
| `vercel dev` (local preview) | `freeside world create --dry-run` | ✓ cycle-010 |

**Revised framing**: cycle-011 does NOT copy Vercel's AWS architecture — that stays ECS. Cycle-011 copies Vercel's **capability surface** — one command to new-project, one command to deploy, one command to manage secrets, humans + agents reach the same capabilities, managed auth (no per-call tokens), managed apply (no operator IAM escalation).

This reframing preserves cycle-010's [[tool-absence-as-enforcement]] doctrine at a **higher layer**: the `--apply` absence at the CLI-layer moves to an `IAM-escalation` absence at the platform-layer. Operators (and agents) hit a managed Freeside endpoint; the endpoint has the IAM; the composition-seam is preserved structurally.

---

## 1 · The architectural shift in one diagram

```
CYCLE-010 (today)                           CYCLE-011 (target)
─────────────────────────                   ────────────────────────────────
operator laptop                             operator laptop                       agent (Claude/etc)
   │                                           │                                     │
   │ freeside world create --pr                │ freeside world create               │ freeside-mcp · world.create
   ▼                                           ▼                                     ▼
generates TF locally                        ─── Freeside control plane ──────────────────────────────
   │                                           │
   ▼                                           │  /api/v1/worlds                  (human + agent both POST here)
`gh pr create` → Jani-IAM-review            │  authn: SIwTHJ session OR agent-key (BEACON-scoped)
   │                                           │  authz: tenant-scope + rate-limit + elicitation for destructive
   ▼                                           │
Jani runs terraform apply                      ▼
                                            managed terraform apply (platform IAM, not operator/agent IAM)
                                               │
                                               ▼
                                            ECS provisioned, OIDC wired, first deploy triggered
                                               │
                                               ▼
                                            returns WorldArtifact { subdomain, ecr_url, ci_role_arn }
                                            + TRAJECTORY to observability layer (dashboard + Beacon event)
```

Composition-seam preserved: no operator/agent has IAM to apply directly. The `freeside` binary / `freeside-mcp` server hits the control plane; the control plane runs apply under platform IAM. Jani-pairing moves from "every apply" to "cross-tenant/destructive ops only" (still via elicitation checkpoint per Anthropic blog §elicitation).

---

## 2 · Humans <> Agents design: one capability, two client types

Per [[mcp-wraps-cli-pattern]] sequence (CLI → MCP → UI) and Anthropic's "remote servers are the only configuration that runs across web, mobile, and cloud-hosted agents":

```
                        Freeside Capability Surface
                               (control plane)
                                      ▲
                ┌─────────────────────┼─────────────────────┐
                │                     │                     │
          HUMAN CLI             AGENT MCP              DASHBOARD UI
          freeside              freeside-mcp           /worlds, /menu
          (operator shell)      (remote + stdio)       (web)
                ▲                     ▲                     ▲
                │                     │                     │
          SIwTHJ session          OAuth/CIMD vault       SIwTHJ session
          (operator wallet)       (platform-managed       (operator wallet)
                                   agent creds)
```

Key composition principles (distilled from Anthropic blog):

1. **Tools grouped by intent, not endpoints.** Not `world.plan` + `world.apply` + `world.deploy` + `world.dns` — one tool `world.create(name, framework, secrets)` that orchestrates the full path. Narrower surface, less cognitive load, fewer attack vectors.
2. **Remote-first MCP.** Ship `freeside-mcp` as a remote server (streamable HTTP + auth), not just stdio. Agents running in cloud environments can reach it; matches Anthropic's "only configuration that works across contexts."
3. **Elicitation for destructive ops.** `world.destroy` + `world.rename` require human confirmation via form-mode or URL-mode (redirect to dashboard). Matches [[bonfire-at-composition-seam]] — operator-present checkpoint, now via protocol rather than absence.
4. **MCP Apps for rich returns.** `world.status` can return an MCP App (inline chart/table/form) rendered in Claude or the dashboard. Human-agent parity made structural.
5. **Managed auth vault.** Platform holds OIDC/API tokens; human CLI + agent MCP both ref the vault by session ID. No per-call credential shuttling. Matches Vercel's `vercel whoami` pattern.
6. **Progressive disclosure.** `world.create` is a single well-known tool; discovery for tenant-specific capabilities (per-Workspace modules, integrations) loads on demand per Anthropic's tool-search pattern. 85%+ token reduction for agents with many worlds.

---

## 3 · BEEKEEPER + BEACON: the agent-side integration

**BEACON** (`~/.loa/constructs/packs/beacon/` v2.0.0, shipped) — "Makes your project discoverable to the agent network. AI-retrievable content, trust signals, and x402 payment endpoints." Skills include `auditing-content`, `generating-markdown`, `optimizing-chunks`. Beacon emits `.well-known/*` endpoints + per-service trust signals.

**BEEKEEPER** — strategic-analysis persona composed via beehive pack (pair with LILY per cycle-008 SEED composition A). Reasons about "what should I deploy and why" — the level-2 decision a tenant-operator/agent needs to make before invoking `world.create`.

Integration vectors for cycle-011:

1. **BEACON wraps `freeside-mcp`**: Beacon's `.well-known/freeside-mcp.json` + x402-accept-payments endpoint makes the control plane agent-discoverable without relying on a registry. Composes cycle-002 work (Beacon as trust signal layer).
2. **BEEKEEPER advises pre-create**: when an agent invokes `world.create`, BEEKEEPER (via its apprenticeship-surface role per [[accelerated-learning-surface]]) can offer "here's the strategic frame before you provision." Particularly relevant for tenant operators (via Dashboard `[+ NEW WORKSPACE]` modal) where the agent-reasoning layer educates before committing burn.
3. **x402 metering on create**: per [[x402-protocol]] + Beacon's x402-accept-payments, `world.create` can be priced per-call (ASH burn or $USD). Closes the loop on [[freeside-dashboard-bridge-audit]] §10 Q2 ASH-gated self-service without building the full ledger-wiring this cycle.

---

## 4 · What cycle-011 must produce

The cycle needs to hit a minimum viable managed-apply path + MCP remote server + one honest agent-reachable scenario. Candidate scope:

| Leg | Purpose | Est. effort |
|---|---|---|
| **L-control-plane-v0** | Single Freeside API service (`/api/v1/worlds POST`) that runs terraform apply under platform IAM. Route via Jani's existing ECS cluster OR new Fargate task. Input: `{name, framework, secrets_ref}`. Output: `WorldArtifact`. | large |
| **L-freeside-mcp-v0** | Remote MCP server wrapping control plane. Tools: `world.create`, `world.list`, `world.status`, `world.destroy`. Intent-grouped (not endpoint-grouped). Auth via managed CIMD vault. Elicitation for destructive. | medium-large |
| **L-cli-integrate** | Update `sprawl-world/scripts/freeside` (cycle-010 bash reference) OR migrate to `loa-freeside/packages/freeside-cli/` TS: `--apply` flag lights up, calls control plane instead of generating TF locally. `--dry-run` + `--pr` remain as escape hatches. | medium |
| **L-beacon-wire** | Publish `.well-known/freeside-mcp.json` + trust signals. Agents discover `freeside-mcp` without a registry. | small |
| **L-beekeeper-compose** | BEEKEEPER composition recipe for pre-create reasoning. One test invocation from dashboard `[+ NEW WORKSPACE]` modal showing the pattern. | small |
| **L-dashboard-wire** | Replace dashboard `NewProjectButton` modal's "file issue OR run CLI" copy with actionable form → POSTs to `/api/v1/worlds` → watches job progress. | medium |
| **L-agent-reach-proof** | One honest end-to-end: Claude Code invokes `freeside-mcp · world.create` for a test world; control plane provisions; agent observes status; dashboard renders it. **The validation instance.** | small |
| **L-close** | Findings, KANSEI, cycle-012 handoff. | small |

**NOT in cycle-011** (defer to cycle-012+ per scope-lock): ASH ledger wiring, full NOWPayments flow, tenant-surface `/projects` build-out, Discord-via-gaib integration (operator cycle-009-close flag), `freeside` ↔ `gaib` unification ceremony (conditional on Jani response to #178).

---

## 5 · Tension with cycle-010's [[tool-absence-as-enforcement]]

Cycle-010 filed tool-absence-as-enforcement with the `--apply` omission as instance-1. Cycle-011 brings `--apply` back as a functional flag. Is the doctrine violated?

**No — it relocates.** The absence enforced "operator doesn't apply under their IAM" at the CLI-layer. Cycle-011 preserves that by:

- Neither operator nor agent has platform IAM. Only the control plane does.
- `--apply` does NOT run `terraform apply` under the invoker's identity. It POSTs to the control plane, which runs apply under platform IAM.
- Destructive ops (`world.destroy`, tenant-cross operations) require **elicitation** per Anthropic blog — human confirmation via form-mode/URL-mode. This is the same composition-seam, instantiated via protocol rather than via absence.

**Doctrine amendment for cycle-011 findings**: tool-absence-as-enforcement applies at the **IAM-boundary layer**, not strictly at the CLI-verb layer. What matters is that the invoker cannot unilaterally cross the seam; the mechanism (absent verb vs managed escalation vs elicitation protocol) is implementation-choice that serves the underlying doctrine.

This becomes **instance-2 evidence for doctrine promotion** per cycle-010 candidate-watch: absence at layer N → elicitation at layer N+1 → managed-apply at layer N+2 is the same structural enforcement showing up at different strata. Load-bearing candidate.

---

## 6 · What would make cycle-011 succeed (KANSEI pre-draft)

- Q1: Can the operator type `freeside world create foo` and in ≤2 minutes have foo.0xhoneyjar.xyz serving traffic, with zero Jani-touch at runtime?
- Q2: Can Claude Code (via `freeside-mcp`) perform the same invocation and get the same WorldArtifact, scoped to the operator's session?
- Q3: Does attempting a destructive op (e.g., `world.destroy`) present a clear elicitation checkpoint, and does skipping the checkpoint structurally impossible?
- Q4: Does the `[+ NEW WORKSPACE]` dashboard modal actually provision a world (not just display CLI text), and does a new tenant see the Vercel-like affordance immediately?
- Q5: Free-text — with `freeside world create` becoming seamless, what about freeside-as-product becomes real that wasn't real before? And what new dependencies surface (BEEKEEPER composition overhead, Beacon trust-signal publishing, control-plane operational burden)?

---

## 7 · Dependencies + pre-SEED gates to resolve

| Gate | Question | Where resolved |
|---|---|---|
| **Control-plane host** | Runs in Jani's existing `arrakis-production-cluster` (as another ECS service) OR dedicated Fargate task? If former: needs Jani-pairing for IaC. If latter: spins up new task via cycle-010 `freeside` CLI (recursive!). | L-control-plane-v0 start; Jani pairing required |
| **Platform IAM scope** | What's the minimum IAM for "run TF apply for world-X creation"? Likely: ECS CreateService + ECR create + Secrets Manager + Route53 change-record, scoped to `arrakis-production-*` resources. Jani drafts the policy. | L-control-plane-v0 pre-gate |
| **Agent auth** | CIMD vault managed where? Likely in Freeside (tenant → wallet → managed OIDC tokens). Needs [[freeside-as-identity-spine]] extension. | L-freeside-mcp-v0 |
| **Elicitation wiring** | Form-mode vs URL-mode vs both for destructive ops. URL-mode implies dashboard handles confirmation; form-mode keeps it in the MCP client. Operator preference? | Pre-SEED open question |
| **#178 resolution** | If Jani accepts rename: cycle-011 ships as `freeside` + `freeside-mcp` cleanly. If Jani keeps siblings: sorted as `freeside-control-plane` + `freeside-mcp`. Either works, just affects naming. | Jani response on #178 (blocker; track) |
| **Vercel-reference-depth** | Do we want `freeside teams` / `freeside projects list` / `freeside env pull` as part of v0, or minimum `world.create` + `world.list` + `world.status` + `world.destroy`? | Pre-SEED open question |

---

## 8 · Doctrine candidates for promotion (second-instance watch)

- **[[tool-absence-as-enforcement]] → instance-2** via cycle-011 managed-apply: structural enforcement relocates layer, same doctrine. Promote at cycle-011 close if the pattern holds.
- **[[operator-as-the-seam]] → instance-3** via agent-scale: dashboard `NewProjectButton` was instance-2 at product-UI scale; `freeside-mcp` invocation is instance-3 at agent-protocol scale. Three instances across strata — strong candidate for load-bearing status.
- **intent-grouped-tools-over-endpoint-grouped-tools** (new, Anthropic-sourced): the `create_issue_from_thread` pattern applied to `world.create` vs `world.plan/apply/deploy`. First-instance in cycle-011; second-instance watch.
- **elicitation-at-destructive-ops** (new): structural checkpoint via protocol rather than pre-deployment meetings. Instance-1 in cycle-011 `world.destroy`. Second-instance candidate: `workspace.rename`, `secret.rotate`.

---

## 9 · Open questions for operator (amend this pre-SEED OR defer to SEED drafting)

- [ ] **Control-plane ownership** (reframed 2026-04-24 per operator "CLI or connective tissue is shared bridgebuilding"): not "share Jani's cluster OR dedicated task" (implementation detail) but *"operator-drafted, Jani-reviewed, shared-ownership"* (ownership choice — see §10). Hosting decision follows ownership: share-cluster if the service is operationally Jani-owned; dedicated-task if operator-owned-with-Jani-IAM-policy-review. **Leaning**: shared-ownership, start on Jani's existing cluster for v0, spin out to dedicated task when operational-burden pattern emerges.
- [ ] Confirm agent auth mechanism: tenant-wallet-mapped CIMD vault vs per-agent API keys?
- [ ] Scope for v0 Vercel-reference: strict minimum (world.{create,list,status,destroy}) or broader (env, logs, domains)?
- [ ] BEEKEEPER composition: where does it fire — dashboard modal only, or both dashboard + MCP pre-call hook?
- [ ] Elicitation delivery: form-mode (inline in MCP client) vs URL-mode (redirect to dashboard) vs both?
- [ ] Should cycle-011 also close the tenant-surface `/projects` design now that managed-apply unlocks self-service, or keep `/projects` as "reserved shape only" per cycle-010 operator resolution?

---

## 10 · Ownership split — shared bridgebuilding at the platform seam

> *"I think CLI or the connective tissue is shared bridgebuilding."* — operator, cycle-010 close

The cycle-011 surface sits across two owners (operator + Jani) and a distinct third category — the **composition-seam itself**. Naming the split early is load-bearing: it prevents cycle-011 from accidentally conflating single-owner work with paired-seam work, which is the anti-pattern [[bonfire-at-composition-seam]] was coined to prevent.

### Ownership table

| Layer | Owner | Why |
|---|---|---|
| IAM policy for platform-apply | **Jani** | his AWS account, his security posture |
| `modules/world/` extensions (egress_mode, task-role patches, DNS wiring) | **Jani** | shared infra module; operator-PRs for extensions |
| Control-plane service *design* (API shape, auth model, elicitation flow, trust-signal publishing contract) | **SHARED bridgebuilding** | the seam itself — operator drafts, Jani reviews security/IAM, both iterate |
| Control-plane service *code* (hosting `/api/v1/worlds`) | **SHARED** | lives in loa-freeside; operator authors v0, Jani reviews, long-term Jani-owned for operational burden |
| Jani's existing Freeside API (Commons Protocol, Discord/TG, billing) | **Jani** | unchanged scope; control-plane is additive |
| `freeside` CLI (TS at `packages/freeside-cli/`) | **operator** | thin client over control plane; ships without Jani-pairing once API contract is locked |
| `freeside-mcp` remote server | **operator** | MCP surface over same control plane; operator-authored |
| Dashboard `NewProjectButton` wiring → real POST to `/api/v1/worlds` | **operator** | UI layer; hits shared control plane |
| BEACON `.well-known/freeside-mcp.json` + trust-signal publishing | **SHARED** | operator drafts, Jani endorses (affects who discovers Freeside agents + what they trust) |
| BEEKEEPER composition recipe | **operator** | construct-level; operator-authored |
| L-agent-reach-proof (Claude invokes MCP → world provisions → observable from dashboard) | **SHARED bonfire** | validation instance; both present; THIS IS the composition-seam per [[bonfire-at-composition-seam]] |

### What "shared bridgebuilding" names precisely

Shared bridgebuilding is a third ownership pattern distinct from **single-owner** and **full-team-owned**:

- **Single-owner**: one person writes, one person reviews-from-outside, clear authority. Works for bounded-scope code (a CLI flag, a TF module).
- **Full-team-owned**: multiple owners, PR-review rotation, consensus required. Works for platforms with ≥3 regular contributors (out of scope for operator+Jani today).
- **Shared bridgebuilding**: 2-person composition-seam ownership. Neither party writes in isolation; the *shape of the thing* (API contract, auth model, trust-signal surface, elicitation UX) is paired by design. PR-review is only the final checkpoint; the real collaboration is at artifact-design time.

This differs from cycle-009's [[learner-expert-transparency-protocol]] (which is about *disclosure*-across-ownership-boundary — operator touches Jani's surface + discloses). Shared bridgebuilding is about *design-ownership* — there is no "whose surface is this" because it's between both.

### Doctrine candidate flagged

**shared-bridgebuilding-as-ownership-pattern** — instance-1 is cycle-011 control-plane + BEACON wiring. Second-instance earns promotion per [[naming-is-diagnostic]] (second-instance-earns-promotion). Candidates: any Freeside↔purupuru-mcp integration surface; any operator-Jani co-authored skill or construct; cross-stack decisions where neither-side-owns-unilaterally.

### Practical implication for cycle-011 dispatch

- **L-control-plane-v0 design phase** = paired session (operator + Jani, ~1 hour). API shape + auth + elicitation decided together. Output: a design doc both sign off on before code is written.
- **L-control-plane-v0 implementation** = operator can author per the agreed design, but any deviation from the design triggers a mini-pairing moment — not a PR-for-audit move.
- **L-beacon-wire** = same pattern (design paired, code operator-authored).
- **L-agent-reach-proof** = paired live (operator runs MCP, Jani confirms platform-side observability, both call it done).
- **Single-owner legs** (L-cli-integrate, L-freeside-mcp-v0, L-beekeeper-compose, L-dashboard-wire) = operator dispatches solo; Jani reviews via PR only if operator touches his surface.

---

## 11 · Cycle-011 SEED drafting handoff

When the operator confirms pre-SEED direction, full SEED drafts from this document by:
1. Elevating §4 leg list to full SEED §2 with acceptance criteria per leg
2. Expanding §5 doctrine amendment into a first-class §4 invariants table
3. Running `gh pr view 178` status check as L-0 preflight (same pattern as cycle-009 SEED L-0)
4. Assigning dispatch mode: likely conversational-paired for L-control-plane-v0 (Jani pairing required); operator-solo parallelizable for MCP + CLI + Beacon + Beekeeper + dashboard legs; L-agent-reach-proof paired for validation

SEED destination: `loa-constructs/grimoires/loa-constructs-seed-2026-04-21/cycle-011-SEED-vercel-for-freeside.md`
SEED branch: `feat/spiral-loa-constructs-cycle-011-vercel-for-freeside` (off cycle-010 branch once it closes, OR off main if cycle-010 merges first)

---

*Pre-SEED captured 2026-04-24 post cycle-010 close. Operator-amendable. References Anthropic "Building agents that reach production systems with MCP" (2026 blog post) + [[mcp-wraps-cli-pattern]] + BEEKEEPER+BEACON pairing. §10 ownership-split amended 2026-04-24 per operator "CLI or connective tissue is shared bridgebuilding" framing — shared-bridgebuilding-as-ownership-pattern flagged as instance-1 doctrine candidate. Full SEED awaits operator amendment of §9 open questions.*

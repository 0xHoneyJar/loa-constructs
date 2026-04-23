# SEED — Cycle-010 · Freeside CLI + UI Substrate + constructs.network migration prep

> *"Complete all upfront work on the cycle-010 triad so when Jani unblocks loa-freeside#177, we're ready to ship constructs.network migration in one paired session. Build the CLI + freeside UI integration in parallel — both are operator-side, Jani-independent. Cycle-009 proved the migration path validates. Cycle-010 builds the substrate (CLI + UI) that makes future migrations cheap AND completes the constructs.network prep so the first real migration is dispatch-ready."* — operator dispatch 2026-04-24 (cycle-009 close)
>
> *"CLI should actually do the deployment. … Gaib is a remnant of Arrakis [Freeside's old name]. We need to find a name. You're welcome to compress into a single UI complete leg."* — operator amendment 2026-04-24 (this cycle's open)
>
> **Status**: Draft · Ready for operator dispatch · Awaiting SEED amendment pass
> **Date drafted**: 2026-04-24
> **Supersedes**: cycle-009 §8 "NOT" list (the deferred items — construct-freeside pack & gaib CLI) re-scoped here; cycle-009 AC-CL.7 inheritance-queue item "gaib CLI, freeside-as-product design" partially landed as the freeside-CLI + UI work below.
> **Doctrine**: [[operator-as-the-seam]], [[bonfire-at-composition-seam]], [[builder-touch-imperative]], [[learner-expert-transparency-protocol]], [[freeside-vision]], [[mcp-wraps-cli-pattern]], [[naming-is-diagnostic]], [[naming-drift-hygiene]], [[freeside-dashboard-bridge-audit]] §4+§10, [[constructs-as-packages]] — all load-bearing
> **Dispatch mode**: conversational-paired · parallel-legs · ops-level leg (L-apply-window) blocks on Jani
> **Branch**: `feat/spiral-loa-constructs-cycle-010-freeside-cli-ui-substrate` (renamed from draft `-gaib-ui-substrate` per §1.5 naming resolution)

---

## 0 · Why this cycle exists

Three convergent signals from cycle-009 close (2026-04-24):

1. **Cycle-009 proved the single-migration path; cycle-010 makes migrations cheap.** L-migrate-constructs authored real TF (`world-constructs-network.tf` + `world-constructs-network-secrets.tf`) and real workflow draft (`apps/constructs-network/.github-workflow-draft.yml`). Hand-authored. Reusable pattern, but not collapsed into a primitive. Operator 2026-04-24: *"build the substrate that makes future migrations cheap."* Cycle-010 ships the CLI that collapses cycle-009's hand-work into `freeside world create <name>`.

2. **The Freeside dashboard's three critical gaps (bridge-audit §4) sit at product-visibility, not ops.** Gap #1 (creation verb), Gap #2 (Subway menu invisibility), Gap #3 (glyph legend + hierarchy). Audit was 2026-04-16; dashboard has progressed substantially since — Gap #1 button + Gap #2 module-rail + §10 Workspace/Project vocabulary all partially shipped. Cycle-010 closes the remaining gaps AND wires the button to the cycle-010 CLI (instantiating [[operator-as-the-seam]] at product-scale — operator's seam-posture becomes the dashboard's new-world-create flow).

3. **constructs.network migration prep needs to be dispatch-ready when Jani unblocks #177.** Cycle-009 left apps/constructs-network/ without a Dockerfile, without `/api/health`, without the secrets-loader script, and with a workflow draft that has an `env_secrets:` YAML bug at line 100. L-migrate-prep finishes these so `terraform apply` + `gh workflow run` is a one-session paired operation when Jani's ready.

Cycle-010's load-bearing outcome: **freeside CLI v0 shipped + dashboard bridge-audit gaps closed + constructs.network migration fully prepped — all dispatch-independent of Jani. L-apply-window fires conditionally when Jani signals.**

---

## 1 · Scope lock

### 1.1 Touches

- `loa-freeside/packages/freeside-cli/` — NEW package `@freeside/cli`, binary `freeside`. Mirror of `@arrakis/cli` scaffold structure but does NOT extend it (see §1.5 naming resolution).
  - Alternative install: bash script at `loa-freeside/scripts/freeside-world.sh` + `~/.loa/bin/freeside` symlink. Decide at leg-start based on complexity of templating required.
- `sprawl-world/apps/dashboard/src/lib/components/NewProjectButton.svelte` — wire modal to real invocation path (dev: server action shelling to `freeside`; prod: deep-link to loa-freeside issue template)
- `sprawl-world/apps/dashboard/worlds.config.json` — populate `modules[]` arrays for all worlds per bridge-audit §4 Gap #2 fix
- `sprawl-world/apps/dashboard/src/routes/menu/` — audit + flesh out against bridge-audit §5 Sprint-5+ menu surface spec
- `sprawl-world/apps/dashboard/src/routes/worlds/+page.svelte` — IF Gap #3 still open: geometry legend component + nested-tile via `apps_json` (decide at leg-start)
- `sprawl-world/apps/constructs-network/` — `Dockerfile` (Next.js standalone output) + `app/api/health/route.ts` (10-line static 200)
- `sprawl-world/scripts/load-constructs-network-secrets.sh` — mirror `loa-freeside/scripts/load-honeyroad-secrets.sh`
- `sprawl-world/apps/constructs-network/.github-workflow-draft.yml` — fix the `env_secrets:` YAML bug (line 100); align build-arg list with `.env.example`
- `loa-freeside/infrastructure/terraform/world-freeside-dashboard.tf` + `world-freeside-dashboard-secrets.tf` — L-migrate-dashboard draft (mirror of cycle-009 #177 for dashboard)
- `loa-constructs/grimoires/loa-constructs-seed-2026-04-21/` — this SEED + legs + findings
- `~/hivemind/wiki/freeside-vision.md` — amend §"Add One File, Get a World" + §Gaps #2: `gaib world create` → `freeside world create`; add Arrakis-lineage footnote per [[naming-drift-hygiene]]
- `~/hivemind/wiki/concepts/mcp-wraps-cli-pattern.md` — amend "Current state" table: `gaib (Freeside CLI) ✓ shipped` → `freeside ✓ cycle-010`; `gaib` row re-scoped to Discord IaC

### 1.2 Does NOT touch

- **Jani's `@arrakis/cli` (gaib)** — zero modification this cycle. Discord-IaC tool stays as-is. Forward-work ([[project: gaib arrakis lineage]]): integrate Discord-via-gaib into Freeside's visual layer cycle-011+, requires Jani pairing.
- **construct-freeside pack scaffold** — still deferred per cycle-009 §8. Cycle-010 CLI is precursor; pack composition comes when CLI stabilizes.
- **freeside-mcp server** — per [[mcp-wraps-cli-pattern]] sequence: CLI first → MCP wraps → UI visualizes. Cycle-010 ships the CLI; freeside-mcp (the MCP mirror) is cycle-011+ when CLI surface is stable.
- **Purupuru migration** — loa-freeside#174 Shape A/B/C unresolved; cycle-010 keeps separation. Cycle-011+ dispatches Purupuru if #174 resolves AND operator commits to third migration.
- **ASH-gated self-service workspace creation** — bridge-audit §10 Q2 resolution landed "Workspace creation = self-service ASH-gated" but implementation is LARGE (ash-ledger + NOWPayments + Freeside provisioning API + tenant isolation). L-ui-complete ships the VERB (button wired to CLI invocation via operator shell-out OR issue template); does NOT ship the self-service flow. That's multi-cycle downstream.
- **Tenant-surface `/projects` build-out** — `/projects` route already scaffolded (+page.server.ts exists); not dispatching design work on it this cycle. L-ui-complete stays focused on operator-surface gaps.
- **dns/ reconciliation** — loa-freeside#173 parallel; cycle-010 does not touch.
- **bd-1o9 spot-fix** — stays OPEN P2 superseded-by-migration; closes by L-apply-window's successful cutover.

### 1.3 Scope-lock rule carried forward

> *"Build primitives in service of one concrete outcome. Do not design a framework — do the consolidation."*

Applied: the freeside CLI scaffolds world-{name}.tf from existing templates (`world-mibera.tf` + `world-constructs-network.tf`) into a reusable shell. It does not design a generic IaC templating framework. If cycle-011 needs Purupuru-style multi-app provisioning, that's a second-instance extension of the same primitive, not a framework upgrade.

### 1.4 CLI scope: "actually does the deployment"

Per operator amendment 2026-04-24, the CLI is the single entry point for the full flow — NOT a bypass of Jani's IAM seam. Four invocation modes:

| Invocation | Effect | Jani-pairing required? |
|---|---|---|
| `freeside world create <name> --dry-run` | Print generated files to stdout, no writes | No |
| `freeside world create <name>` (default) | Write files to disk locally; no git, no push | No |
| `freeside world create <name> --commit` | Write + stage + commit on a feature branch in both repos | No |
| `freeside world create <name> --pr` | Above + push + `gh pr create` with [[learner-expert-transparency-protocol]] boilerplate body | No for operator; Jani-pairing at PR review seam |

Deliberately absent (cycle-011+): `--apply` flag that runs `terraform apply`. Blocked on operator IAM scope; requires Jani-owned CI-driven apply on PR-merge, which is the forward composition per [[bonfire-at-composition-seam]].

### 1.5 Naming resolution (pre-dispatch amendment, documented in §1.5)

The operator's dispatch referenced "gaib CLI" citing `~/hivemind/wiki/freeside-vision.md` §Gaps #2 and [[mcp-wraps-cli-pattern]]. Pre-dispatch discovery (2026-04-24) found:

- `loa-freeside/packages/cli/` = `@arrakis/cli` v0.1.0, binary `gaib`
- Jani completed cycle-007 Discord-IaC functionality on `feature/gaib-iac-sietch-v3` (commit `193a2bc3`)
- PRD at `loa-freeside/grimoires/loa/gaib-prd.md` (2026-01-19, v1.0.0, "Vercel for Discord")
- Discord-IaC is the shipped reality; Freeside-world-CLI was lore-from-Arrakis-era

Operator confirmed the collision: gaib is a remnant of Arrakis (Freeside's old name); the Freeside-world-CLI expectation was lore-from-lineage, not reality.

**Resolution**: cycle-010 ships under the name **`freeside`** (binary) / `@freeside/cli` (package). Rationale:
1. Matches post-rename product name; low cognitive load; reads literal (`freeside world create mibera`).
2. Preserves Jani's shipped work; no cross-ownership seam opened unnecessarily.
3. Clean forward-namespace: when Discord-via-gaib integrates into Freeside's visual layer (cycle-011+, operator-flagged), `freeside` = deploy CLI, `gaib` = Discord sub-integration.
4. Doctrine-compliant per [[naming-is-diagnostic]] — the name-collision-is-the-diagnostic-signal; naming gets attention, not override.

Amendments to external canon (L-canon-amend sub-leg):
- [[freeside-vision]] §Gaps #2: `gaib world create` → `freeside world create`; footnote on Arrakis lineage.
- [[mcp-wraps-cli-pattern]] "Current state" table: `gaib` row re-scoped to Discord IaC; `freeside` row added (CLI exists ✓ cycle-010 / MCP mirror pending cycle-011+).

---

## 2 · Legs

| Leg | Purpose | Est. effort | Priority | Mode |
|---|---|---|---|---|
| **L-0** (done in dispatch) | Preflight: gh status (176/177/174/617 all Jani-awaiting, 0 human comments); prior-art load (11 items); naming resolution (§1.5); UI-gap discovery (dashboard further along than 2026-04-16 audit); branch-cut | done | CERTAIN | — |
| **L-scaffold-v0** · freeside CLI v0 | Author `@freeside/cli` package (TS/Node via commander) OR `scripts/freeside-world.sh` (bash) — decide at leg-start based on templating complexity. Four invocations per §1.4. Scaffolds `world-{name}.tf` + `world-{name}-secrets.tf` (sprawl-world siblings for Dockerfile + /api/health + workflow). Templates from `world-mibera.tf` + `world-constructs-network.tf`. Installs to operator-local `~/.loa/bin/freeside` or workspace-linked via pnpm. | medium-large | CERTAIN | paired-optional |
| **L-scaffold-validate** · the validation instance | Invoke `freeside world create constructs-network --dry-run` against hand-authored cycle-009 #177 artifacts. Diff output. Fix drift. Idempotent re-run (no spurious changes). THIS is the regression test — if output doesn't match hand-work, the CLI is wrong. | small | CERTAIN | paired-optional |
| **L-ui-complete** · three gaps, one leg | (a) Wire `NewProjectButton` modal to invocation path: dev — SvelteKit server action shelling to `freeside`; prod — deep-link to `loa-freeside/issues/new?template=new-world&name=...`. (b) Populate `worlds.config.json` module orders per bridge-audit §4 Gap #2 spec. (c) Audit `/menu` render vs §5 Sprint-5+ spec; flesh out to 11-14 Subway modules. (d) IF Gap #3 still open (confirm at leg-start): geometry legend + nested-tile via `apps_json`. | medium-large | CERTAIN | operator-solo w/ builder-touch via dev-server check |
| **L-migrate-prep** · constructs.network dispatch-readiness | (a) `apps/constructs-network/Dockerfile` (Next.js standalone output). (b) `apps/constructs-network/app/api/health/route.ts` (10-line static 200). (c) `sprawl-world/scripts/load-constructs-network-secrets.sh` (mirror `load-honeyroad-secrets.sh`, pulls from Vercel export or 1Password). (d) Fix workflow draft `env_secrets:` YAML bug (line 100 — should be `env:` with secret mount). (e) Author `world-freeside-dashboard.tf` + `world-freeside-dashboard-secrets.tf` draft for L-migrate-dashboard (cycle-009 unfinished leg). | medium | CERTAIN | operator-solo |
| **L-canon-amend** · doctrine page updates | Amend `~/hivemind/wiki/freeside-vision.md` §Gaps #2 + §"Add One File, Get a World" per §1.5. Amend `~/hivemind/wiki/concepts/mcp-wraps-cli-pattern.md` Current-state table. Cross-link cycle-010 SEED. | tiny | CERTAIN | async |
| **L-apply-window** · conditional · fires on Jani signal | Paired terraform apply of loa-freeside#177. DNS staged cutover (`constructs-network.0xhoneyjar.xyz` → 48h parallel → `www.constructs.network`). Old Vercel retirement. bd-1o9 closes. cycle-009 L-migrate-constructs AC-MC.1-8 complete. | medium | CONDITIONAL | paired w/ Jani |
| **L-close** · findings + KANSEI + cycle-011 handoff | F-numbers continue from F44 (cycle-007 last; cycle-009 may add F45–F60 if closed concurrently). KANSEI gate. Ping Jani on #176/#177/#174/#617 status. Cycle-011 queue: Discord-via-gaib ↔ Freeside visual-layer integration, freeside-mcp server (per mcp-wraps-cli-pattern), freeside CLI polish (test coverage, error messages, `--apply` via CI path), Purupuru migration (blocked on #174). Amend cycle-009 L-close with cycle-010 deliverables. | small | CERTAIN | paired |

**Shell-first discipline** held if L-scaffold-v0 uses bash. If it uses TypeScript (commander), that's a doctrine-delta to flag — justified by templating complexity + @arrakis/cli precedent, but worth explicit choice. Decide at leg-start, document the decision + rationale.

**Per [[operator-as-the-seam]]**: L-ui-complete's NewProjectButton wiring instantiates the seam-posture at product-scale. The button is the seam between the operator-as-deployer (local shell) and the tenant-cohort (deep-link to issue template). Cycle-010 is instance-2 evidence of the doctrine if the wiring feels right.

---

## 3 · Acceptance criteria

### L-0 (done in dispatch)

- **AC-0.1** · gh status on 176/177/174/617 captured; all four Jani-awaiting, zero human comments ✓
- **AC-0.2** · Prior-art loaded (11 items): cycle-009 SEED, #176/#177 state, TF artifacts, workflow draft, freeside-vision, bridge-audit §4+§10, operator-as-the-seam, learner-expert-transparency, mcp-wraps-cli, #617 status ✓
- **AC-0.3** · Naming collision surfaced, operator amendment received, resolution documented §1.5 ✓
- **AC-0.4** · UI progress discovered: NewProjectButton, /menu, /projects, ComponentSquare, Workspaces vocab all partially shipped — L-ui-complete scope adjusted ✓
- **AC-0.5** · Branch cut: `feat/spiral-loa-constructs-cycle-010-freeside-cli-ui-substrate` off loa-constructs/main ✓

### L-scaffold-v0

- **AC-SV.1** · `freeside world create <name>` binary works. Four invocation modes per §1.4.
- **AC-SV.2** · Scaffolds all five artifacts per invocation: `world-{name}.tf`, `world-{name}-secrets.tf`, `apps/{name}/Dockerfile`, `apps/{name}/app/api/health/route.ts` OR `apps/{name}/src/routes/health/+server.ts` (framework-aware), `.github/workflows/deploy-{name}.yml`.
- **AC-SV.3** · Templating uses `world-mibera.tf` + `world-constructs-network.tf` as source; scaffolded output differs only in name tokens + secret-key lists + cpu/memory defaults.
- **AC-SV.4** · `--dry-run` prints to stdout without writes. `--plan-only` prints the `terraform plan`-equivalent diff (or notes that actual plan requires Jani-IAM).
- **AC-SV.5** · `--commit` creates branches in both repos with deterministic names (`feat/world-create-{name}`) + stages + commits with learner-expert-transparency boilerplate.
- **AC-SV.6** · `--pr` opens PRs with first-sentence asymmetry disclosure, specifics, Jani's-call-as-Jani's-call framing.
- **AC-SV.7** · Test coverage: at least one vitest suite (if TS) or bats suite (if bash) for dry-run determinism + template-substitution correctness.
- **AC-SV.8** · README.md for the CLI at `packages/freeside-cli/README.md` with usage + scope + Arrakis-lineage footnote (per §1.5 canon amendments).

### L-scaffold-validate

- **AC-SVL.1** · Invoke `freeside world create constructs-network --dry-run` on a scratch dir.
- **AC-SVL.2** · Diff output against hand-authored cycle-009 #177 artifacts (`world-constructs-network.tf`, `world-constructs-network-secrets.tf`, workflow draft). Document every diff as either (a) intentional (CLI improves on hand-work — e.g., `env_secrets:` bug fixed), (b) drift (CLI is wrong, needs fix), or (c) divergence-by-name (e.g., `--name mibera` vs `constructs-network` naturally different).
- **AC-SVL.3** · All drift (b) fixed. Intentional improvements (a) backported into #177 as amendment comments if material.
- **AC-SVL.4** · Idempotent: running `freeside world create constructs-network` twice with same flags produces byte-identical output.

### L-ui-complete

- **AC-UC.1** · `NewProjectButton` modal invocation wired: dev-mode → SvelteKit server action shells to `freeside world create` (user-typed name, validated); prod-mode → deep-link to `loa-freeside/issues/new?template=new-world&name=...` (template file to be authored in loa-freeside).
- **AC-UC.2** · `worlds.config.json` modules arrays populated for at least 5 worlds (sprawl + 4 others). Module slugs align with `COMPONENT_REGISTRY`.
- **AC-UC.3** · `/menu` route renders 11-14 modules per bridge-audit §5 Sprint-5+ spec. Three states (`ORDERED` / `AVAILABLE` / `ROADMAPPED`). Flush-left category labels + 1px rules. No em-dashes.
- **AC-UC.4** · Gap #3 decision made at leg-start: (a) Gap #3 confirmed still-open → ship legend component + nested-tile via `apps_json`; (b) confirmed closed → skip, note in L-close findings.
- **AC-UC.5** · Dev-server check (non-automated): operator opens dashboard, clicks `[+ NEW WORKSPACE]`, sees wired modal; opens `/menu`, sees populated render; opens `/worlds` top-level, sees populated module rails + (conditionally) legend/nested-tiles.
- **AC-UC.6** · Typecheck green (`bun run typecheck` at sprawl-world/apps/dashboard). Lint n/a (dropped in cycle-009 L-branch-reconcile).

### L-migrate-prep

- **AC-MP.1** · `apps/constructs-network/Dockerfile` authored per Next.js standalone output pattern; builds locally via `docker build .`.
- **AC-MP.2** · `apps/constructs-network/app/api/health/route.ts` returns static 200 + `{status:"ok",ts:ISO}`; no IO, no env reads beyond timestamp.
- **AC-MP.3** · `scripts/load-constructs-network-secrets.sh` mirrors `load-honeyroad-secrets.sh` shape: reads from operator-side env OR 1Password, validates non-empty + no placeholder, invokes `aws secretsmanager put-secret-value` for each of the 16 secrets defined in `world-constructs-network-secrets.tf`.
- **AC-MP.4** · Workflow draft `env_secrets:` YAML bug fixed: line 100 becomes proper `env:` block with `SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}`, BuildKit `--secret` mount references it correctly.
- **AC-MP.5** · Workflow draft build-args cross-checked against `apps/constructs-network/.env.example` — no missing NEXT_PUBLIC_ references, no stale ones.
- **AC-MP.6** · `world-freeside-dashboard.tf` + `world-freeside-dashboard-secrets.tf` drafts authored; `terraform -chdir=infrastructure/terraform validate` passes locally. PR NOT opened this cycle (defer to cycle-009 L-migrate-dashboard or post-#177-merge; per dispatch §open-question 4, avoid stacking PRs).

### L-canon-amend

- **AC-CA.1** · `~/hivemind/wiki/freeside-vision.md` amended: `gaib world create` → `freeside world create` (2 occurrences); §Gaps #2 updated; Arrakis-lineage footnote appended.
- **AC-CA.2** · `~/hivemind/wiki/concepts/mcp-wraps-cli-pattern.md` "Current state" table updated: `gaib` row re-scoped to Discord IaC; `freeside` row added.
- **AC-CA.3** · Updated files pass operator-local markdown lint (if any); cross-reference links to cycle-010 SEED added.

### L-apply-window (conditional)

- **AC-AW.1** · Fires only on Jani signal (`#177` review-approve OR merged OR direct ping). Otherwise stays pending; cycle-010 can close without this leg firing, with explicit deferral to cycle-011.
- **AC-AW.2** · Paired session: operator + Jani live. terraform apply of #177. ECS + ALB + ECR + Secrets Manager provisioned.
- **AC-AW.3** · `scripts/load-constructs-network-secrets.sh` invoked (from L-migrate-prep AC-MP.3); 16 secrets populated.
- **AC-AW.4** · Workflow moved from `.github-workflow-draft.yml` to `.github/workflows/deploy-constructs-network.yml`; first CI run builds + pushes image + updates service + smoke-tests `/api/health`.
- **AC-AW.5** · Staged DNS cutover: `constructs-network.0xhoneyjar.xyz` live first, 48h parallel window, then `www.constructs.network` alias swap.
- **AC-AW.6** · Old Vercel `loa-constructs-explorer-5bfi` retired post-48h+. Credentials cease.
- **AC-AW.7** · bd-1o9 closed (superseded-by-migration).
- **AC-AW.8** · loa-freeside#176 amended with final-state summary.

### L-close

- **AC-CL.1** · `cycle-010-findings.md` authored (F-numbers from F44, or continuous with cycle-009 if it closes concurrently).
- **AC-CL.2** · KANSEI gate filled (see §6).
- **AC-CL.3** · Ping Jani on #176 final-state (conditional on L-apply-window firing).
- **AC-CL.4** · Ping @janitooor on #617 status.
- **AC-CL.5** · Ping @janitooor on #174 (Purupuru spec — cycle-011 blocked on this).
- **AC-CL.6** · Amend cycle-009 L-close (if it lingers) with cycle-010 deliverables cross-ref.
- **AC-CL.7** · Cycle-011 inheritance queue: Discord-via-gaib ↔ Freeside visual-layer integration; freeside-mcp server; freeside CLI polish (test coverage, `--apply` via CI); Purupuru migration (blocked on #174 Shape A/B/C).
- **AC-CL.8** · Post cycle-010 SEED commit to branch at L-0 open; final commit on L-close. Squash OR FF-merge decision deferred to operator at close.

---

## 4 · Doctrine compliance (invariants this cycle must honor)

| Invariant | How |
|---|---|
| [[operator-as-the-seam]] | L-ui-complete's NewProjectButton wiring IS the seam at product-scale — operator (local shell) ↔ cohort (deep-link to issue template). Instance-2 evidence of doctrine if wiring feels right at close. |
| [[bonfire-at-composition-seam]] | L-apply-window paired-only (operator + Jani). CLI explicitly lacks `--apply` flag because that would cross the IAM seam unilaterally. |
| [[builder-touch-imperative]] | PR bodies from `freeside world create --pr` inherit learner-expert-transparency protocol — Jani-async-review = bonfire-touch. |
| [[learner-expert-transparency-protocol]] | Every `freeside world create --pr`-generated PR carries first-sentence asymmetry, specifics, Jani's-call-as-Jani's-call. Template text lives in CLI codebase as testable constant. |
| [[freeside-vision]] §"Add One File, Get a World" | L-scaffold-v0 IS the CLI wrapper named in §Gaps #2 (post-renaming from `gaib` to `freeside`). Ships the 90%-there gap. |
| [[mcp-wraps-cli-pattern]] | Cycle-010 ships CLI. Cycle-011+ ships `freeside-mcp` as wrapping adapter. UI (dashboard) is the third surface, thin view onto same capability. Sequence honored. |
| [[naming-is-diagnostic]] | The gaib naming collision WAS the diagnostic signal; §1.5 resolution commits a new name rather than overriding history. |
| [[naming-drift-hygiene]] | L-canon-amend updates lore-layer references to match shipped reality; Arrakis→Freeside drift documented in footnote, not silently papered. |
| [[freeside-dashboard-bridge-audit]] §4 | L-ui-complete closes Gap #1 (verb), Gap #2 (subway menu), and conditionally Gap #3 (legend + nested-tile). |
| [[freeside-dashboard-bridge-audit]] §10 | Q1 resolution (tenant surface) preserved: `/projects` route exists; L-ui-complete does not touch tenant-design scope. Q2 (ASH-gated self-service) deferred to multi-cycle downstream; L-ui-complete ships verb-shape only. |
| [[constructs-as-packages]] | `@freeside/cli` is a package that composes alongside `@arrakis/cli` (gaib) — sibling, not bundle. Sovereignty-preserving per cycle-008 §6.1. |
| Shell-first (doctrine §13.1) | Decision deferred to L-scaffold-v0 leg-start: bash OR TS/commander. Justified choice documented in L-close findings. |
| OTLET chain-preserved | SEED links back to cycle-009 §8 (supersedes deferred items), cycle-009 AC-CL.7 (inheritance-queue landing), bridge-audit §4+§10, freeside-vision §Gaps. Candidate doctrines below. |

### Doctrine candidates under watch (second-instance-earns-promotion per [[naming-is-diagnostic]])

| Candidate | Instance-1 evidence in this cycle | Promote if… |
|---|---|---|
| **operator-as-the-seam** at product-scale | L-ui-complete NewProjectButton wiring instantiates operator-as-seam topology at tenant-facing product UI | Doctrine is already coined (cycle-009 L-smoke); cycle-010 is **instance-2 evidence**. If wiring feels right at close, promote to "load-bearing, product-scale instance shipped" |
| **name-following-product-rename** | Arrakis→Freeside rename should propagate to CLI binary names; gaib-as-Arrakis-remnant is instance-1 | Second rename in the stack propagates cleanly via same pattern |
| **CLI-as-PR-opener** | `freeside world create --pr` generates learner-expert-transparency-compliant PRs as a primitive | Second CLI in stack generates compliant cross-ownership PRs (candidate: purupuru-cli multi-app provisioning) |
| **migration-primitive-collapses-hand-work** | Cycle-009 hand-authored #177; cycle-010 CLI reproduces it from template | Third migration (Purupuru / Honey Port) succeeds via CLI without hand-authoring |

No doctrine pages written this cycle (second-instance evidence only); promotion ceremony at cycle-011+.

---

## 5 · Dependencies + sequencing

### Within cycle-010 (sequencing DAG)

```
L-0 (done) ──┐
              ├──► L-scaffold-v0 ──► L-scaffold-validate ──┐
              ├──► L-ui-complete ────────────────────────┤
              ├──► L-migrate-prep ───────────────────────┤
              └──► L-canon-amend (async) ────────────────┤
                                                          ├──► L-apply-window (conditional) ──► L-close
                                                          │
                                                          └──► L-close (if L-apply-window doesn't fire)
```

- **L-scaffold-v0 precedes L-scaffold-validate** — can't validate what isn't built.
- **L-scaffold-v0, L-ui-complete, L-migrate-prep parallel** — three tracks, operator-solo + parallel.
- **L-canon-amend async** — authorable any time; nit-level writes.
- **L-apply-window conditional** — fires on Jani signal; cycle-010 can close without it.
- **L-close integrates + hands off** + amends cycle-009 if still lingering.

### External dependencies

| Dep | Status | Blocker? |
|---|---|---|
| Jani's response on loa-freeside#177 | awaiting (0 comments/reviews) | **Soft blocker** on L-apply-window only. L-scaffold-v0, L-ui-complete, L-migrate-prep, L-canon-amend, L-close all proceed regardless. |
| loa-freeside#174 Purupuru Shape A/B/C | OPEN, 0 comments since 2026-04-19 | Not a blocker — cycle-010 keeps #174 separate. Cycle-011 Purupuru migration blocked on resolution. |
| loa#617 upstream PR | OPEN, MERGEABLE, REVIEW_REQUIRED (bot review only) | Not a blocker — cycle-010 L-close pings. |
| loa-freeside#176 | OPEN, 0 comments | Not a blocker — amended by L-apply-window if fires, or by L-close as cycle-010 disclosure. |
| bd-1o9 beads task | OPEN P2 superseded-by-migration | Closed by L-apply-window. Stays open if conditional leg doesn't fire. |

### Internal doctrine chain

- [[operator-as-the-seam]] — instance-2 evidence via L-ui-complete
- [[bonfire-at-composition-seam]] — L-apply-window paired-only
- [[learner-expert-transparency-protocol]] — CLI --pr template text
- [[freeside-vision]] §Gaps #2 — L-scaffold-v0 ships the missing CLI wrapper
- [[mcp-wraps-cli-pattern]] — CLI-first; freeside-mcp cycle-011+
- [[naming-is-diagnostic]] — §1.5 resolution
- cycle-009 §8 NOT-list — cycle-010 lifts deferred items into scope
- cycle-009 AC-CL.7 inheritance-queue — partially lands here

---

## 6 · KANSEI gate (cycle-close questions — operator-answered)

Target: ≥4/5 Y on Q1–Q4 + constructive Q5. Halt threshold: <3/5.

- **Q1** — Did `freeside world create <name>` feel like a primitive that collapses hand-work, or does it feel like a script-wrapping-a-script that adds one more layer without saving time? Specifically: if cycle-011 dispatches Purupuru migration, would you reach for the CLI or re-author by hand?
- **Q2** — Did the naming resolution (gaib → freeside) land cleanly, or does the `freeside` binary name carry friction you didn't expect? Did Jani's gaib-for-Discord and the new freeside-for-worlds namespace feel additive or muddled?
- **Q3** — Does the NewProjectButton-to-CLI wiring instantiate operator-as-the-seam at product-scale the way the cycle-009 tmux splits instantiated it at terminal-scale? Is the wiring an instance-2 evidence strong enough to promote the doctrine to "load-bearing, product-scale instance shipped"?
- **Q4** — With constructs.network migration-prep dispatch-ready, does the L-apply-window plan (conditional, paired with Jani) feel like a kaironic window that will fire cleanly when Jani signals, or does it feel like it might hang indefinitely waiting for a signal that doesn't come?
- **Q5** — Free-text: with the freeside CLI shipped + bridge-audit gaps closed + constructs.network dispatch-ready, what about freeside-as-product feels NAMEABLE now that wasn't before cycle-010? What still feels vibe-only?

---

## 7 · Why this cycle matters

1. **Collapses cycle-009's hand-work into a reusable primitive.** Every future world migration (Purupuru, Honey Port, Sprawl-broader) composes on the CLI. The primitive IS the migration template doc cycle-009 L-pattern-doc was going to author — better because executable.

2. **Closes the Freeside dashboard's product-visibility gaps.** Bridge-audit §4 called these out 2026-04-16; cycle-010 lands the remaining work. After this, the dashboard is legibly-a-creation-surface (not just a monitor), the Subway menu is visible (not folklore), and the hierarchy matches the schema.

3. **Instantiates [[operator-as-the-seam]] at product-scale.** NewProjectButton wiring IS the seam: operator's shell-out IS the authorization gate for dev, and the issue-template deep-link IS the authorization gate for prod. Instance-2 evidence of the doctrine.

4. **Pre-stages constructs.network migration for one-session paired completion.** When Jani signals, L-apply-window fires in a single window. Zero context re-acquisition.

5. **Honors [[naming-is-diagnostic]] + [[bonfire-at-composition-seam]] in the naming resolution.** The collision-as-signal gets attention; Jani's shipped work is preserved; no unilateral cross-ownership rename.

6. **Ships cycle-009 AC-CL.7 inheritance-queue item 1** (gaib CLI — as freeside CLI). Doctrine chain preserved from cycle-009 close to cycle-010 open.

---

## 8 · What this cycle does NOT claim

- **NOT** ASH-gated self-service workspace creation (bridge-audit §10 Q2 resolution — multi-cycle downstream; cycle-010 ships verb-shape only).
- **NOT** construct-freeside pack scaffold (cycle-009 §8 deferral continues; cycle-011+ after CLI stabilizes).
- **NOT** freeside-mcp server (per mcp-wraps-cli sequence; cycle-011+ when CLI surface stable).
- **NOT** Purupuru migration (loa-freeside#174 Shape A/B/C unresolved).
- **NOT** tenant-surface `/projects` build-out (route exists, cycle-010 does not design it).
- **NOT** Discord-via-gaib ↔ Freeside visual-layer integration (operator-flagged forward-work; cycle-011+).
- **NOT** freeside CLI `--apply` flag (blocked on operator IAM + Jani-owned CI-driven apply).
- **NOT** autonomous — L-apply-window paired; L-scaffold-v0 / L-ui-complete / L-migrate-prep operator-solo but operator-touched continuously per [[builder-touch-imperative]].
- **NOT** doctrine promotion for any candidate (instance-2 evidence accumulates; promotion at cycle-011+).
- **NOT** Claude-Code internal-split primitive (operator-as-the-seam §UX-infrastructure candidate from cycle-009-close triage; separate cycle).
- **NOT** tmux→chat-transcript streamer (cycle-009-close triage candidate; separate cycle).

---

## 9 · Post-dispatch additions (operator may amend)

- [ ] Confirm leg sequencing as proposed OR reorder
- [ ] Confirm L-scaffold-v0 language choice (bash vs TS/commander) at leg-start; document decision
- [ ] Confirm L-ui-complete Gap #3 scope at leg-start (still open? skip?)
- [ ] Confirm L-migrate-prep §AC-MP.6 defers `world-freeside-dashboard.tf` PR vs opens now
- [ ] Additional candidate-watch doctrines to flag
- [ ] Adjust KANSEI questions if better signal targets emerge
- [ ] Decide if L-canon-amend is blocking for L-close or async-only
- [ ] Decide: if Jani signals on #177 mid-cycle, does L-apply-window preempt other in-flight legs or queue after?

---

*Cycle-010 Freeside CLI + UI Substrate + constructs.network migration-prep SEED drafted 2026-04-24 post cycle-009 close. Paired-mode dispatch. L-scaffold-v0 / L-ui-complete / L-migrate-prep / L-canon-amend parallelizable operator-solo; L-apply-window conditional on Jani signal; L-close integrates.*

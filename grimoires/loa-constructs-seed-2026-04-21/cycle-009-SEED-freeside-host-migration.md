# SEED — Cycle-009 · Freeside-as-Host Migration · constructs.network + freeside-dashboard

> *"Fix the broken network. Migrate constructs.network + freeside-dashboard onto freeside hosting. Scaffold the freeside-as-product foundation — 'Vercel + Google Analytics for communities.'"* — operator dispatch 2026-04-24
>
> *"Upfront work is the reason. Migration + backend work IS the path to clarity on what teams actually need. Not premature infra — the migration surfaces what's missing."* — operator 2026-04-24
>
> **Status**: Draft · Ready for operator dispatch · loa-freeside#176 filed for Jani coordination
> **Date drafted**: 2026-04-24
> **Supersedes**: cycle-008 `L-bug-triage-and-migration-queue` §3 (migration proposal landed here); cycle-007 §12.3 P1#2 (constructs-network sync pivots from webhook+cron to hosting migration)
> **Doctrine**: [[creative-work-is-re-entered]], [[bonfire-at-composition-seam]], [[builder-touch-imperative]], [[learner-expert-transparency-protocol]], [[half-done-infrastructure-migration]], [[freeside-vision]], [[composable-systems-open-web-doctrine]] — all load-bearing
> **Dispatch mode**: conversational-paired — infra decisions are kaironic; terraform applies require Jani pairing per IAM asymmetry; Spiral-autonomous explicitly banned for ops-level legs
> **Branch**: `feat/spiral-loa-constructs-cycle-009-freeside-host-migration`

---

## 0 · Why this cycle exists

Three convergent signals from cycle-008 close (2026-04-24):

1. **Broken network is a product outage, not chrome.** Per operator 2026-04-24: *"Registry visible IS part of the product. The network visible IS part of the product. Visibility and transparency with agents on a UI surface is coexistence."* constructs.network rendering empty-catalog is agents + humans unable to inspect the shared registry surface. Load-bearing for [[composable-systems-open-web-doctrine]] #3 (open web as agentic+human interaction surface).

2. **Migration supersedes spot-fix.** Cycle-008 `/bug` triage (sprint-bug-66 · `bd-1o9`) identified Vercel config drift + DB ingest stall. Patching Vercel repoints a system being retired. Migration to freeside retires the attack surface permanently per [[session 2026-04-19-vercel-security-to-migration-reframe]] — credential ceases, not rotates.

3. **Upfront infra is the path, not premature work.** Per operator: *"migration + backend work IS the path to clarity on what teams actually need."* Cycle-009 surfaces what freeside-as-product needs by running two real migrations. The cycle is a forcing-function against speculative design.

Cycle-009's load-bearing outcome: **two real migrations land (constructs.network + freeside-dashboard) + a reusable migration template doc + a named freeside-as-product spec pointer.** Design stays in cycle-008 (paused, ripe, returns as a paired session).

---

## 1 · Scope lock

Cycle-009-freeside-host-migration touches:

- `loa-freeside/infrastructure/terraform/` — author `world-constructs-network.tf` + `world-freeside-dashboard.tf` (cross-repo; coordinated via loa-freeside#176; applied by Jani or paired with Jani)
- `sprawl-world/apps/constructs-network/` — env-var migration (Vercel → AWS Secrets Manager), cron re-home, adapter config if needed
- `sprawl-world/apps/dashboard/` — `ADAPTER=node` switch (already supported by svelte.config.js), env-var migration, deploy workflow
- `sprawl-world/.github/workflows/` — add `deploy-constructs-network.yml` + `deploy-freeside-dashboard.yml` (ECR/OIDC/ECS-update pattern from `use-freeside` SKILL.md Step 2)
- DNS: `www.constructs.network` alias swap (Vercel → ECS ALB), freeside-dashboard subdomain cut
- `loa-constructs/grimoires/loa-constructs-seed-2026-04-21/` — this SEED + legs + findings
- `loa-constructs/docs/integration/vercel-to-freeside-migration.md` — reusable template (cycle-010+ composes)
- `loa-constructs/grimoires/loa-constructs-seed-2026-04-21/cycle-009-l-framing-freeside-as-product.md` — 200-word pointer doc ("Vercel + GA for communities" naming + links, NO new spec)

**Does NOT touch**:
- **Freeside platform code/infra primitives** — we use existing `modules/world/`, existing ECS cluster, existing ALB. No new shared infrastructure. Per operator: *"fixing the freeside itself to a future session."*
- **construct-freeside pack scaffold** — doesn't exist yet per [[freeside-vision]] §Gaps #1. SKILL.md is the current operable surface; pack wait for cycle-010+ after migration surfaces real needs.
- **gaib CLI wrapper** — [[freeside-vision]] §Gaps #2; reference for L-framing, not built this cycle.
- **Purupuru migration** — loa-freeside#174 is parallel; cycle-009 keeps #174 scoped to Purupuru.
- **cycle-008 freeside-pilot compositions** — design arc (paused, ripe).
- **`loa-freeside-dashboard` code changes beyond adapter flip** — no feature work; migration only.
- **The empty-catalog DB ingest issue (RC2 from cycle-008 L-bug-triage)** — scope-separate. Migration restores deploys; if the ingest pipeline still empty post-migration, file as separate bug.
- **Actual design of freeside-as-product** — L-framing NAMES the scope; cycle-010+ designs it. Sovereignty-preserving composition per cycle-008 §6.1 applies: when `construct-freeside` eventually ships, it declares `consumes: WorldArtifact, required: false`.

**Scope-lock rule carried from cycle-008**:

> *"Build primitives in service of one concrete outcome. Do not design a framework for consolidation — do the consolidation."*

Applied: do the two migrations. Do not design a general-purpose migration framework. L-pattern-doc records what shipped; it doesn't invent a framework.

---

## 2 · Legs

| Leg | Purpose | Est. effort | Priority | Mode |
|---|---|---|---|---|
| **L-0 (done in dispatch)** | display smoke-test (dry-run OK) + local bridge sync (8 commits pulled) + half-done-migration detection (clean) + use-freeside skill test (live, gaps named) | done | CERTAIN | — |
| **L-dig** · mibera-dimensions observer/module/room registry | Ride mibera-dimensions for module/room registry + observer patterns; extract invariants for freeside-as-product; typed answer (applies because X / doesn't because Y); parallel to ops legs, not critical path | small | CERTAIN | paired-optional |
| **L-branch-reconcile** · sprawl-world main ← bridge | Fast-forward `sprawl-world/origin/main` from `bridge/freeside-dashboard-truthing` (89 commits; no content change, pointer update). Operator-paired (destructive on shared branch per [[bonfire-at-composition-seam]]). PR-based path acceptable if preferred over direct FF | small | CERTAIN | paired |
| **L-migrate-constructs** · constructs.network → freeside | Draft `world-constructs-network.tf`, env-var migration plan, cron re-home plan, DNS staged green/blue cutover. Terraform apply paired with Jani. Vercel retirement after 48h parallel window | medium-large | CERTAIN | paired w/ Jani |
| **L-migrate-dashboard** · freeside-dashboard self-host | Draft `world-freeside-dashboard.tf`, flip `ADAPTER=node` in production build, migration plan mirroring L-migrate-constructs. **First-deploy-via-existing bootstrap**: Vercel stays warm as rollback escape through cutover + 48h | medium | CERTAIN | paired w/ Jani |
| **L-pattern-doc** · reusable template | Author `docs/integration/vercel-to-freeside-migration.md` — step-by-step for future worlds (Purupuru, Honey Port, Sprawl-broader). Records what shipped cycle-009; doesn't prescribe a framework | small | CERTAIN | paired-optional |
| **L-framing** · freeside-as-product pointer | 200-word doc at `grimoires/loa-constructs-seed-2026-04-21/cycle-009-l-framing-freeside-as-product.md` naming "Vercel + GA for communities" AND linking to [[freeside-dashboard-bridge-audit]] §10 + [[freeside-vision]] + loa-freeside#174 + #176. No new spec. Cycle-010+ designs | tiny | CERTAIN | async |
| **L-close** · findings + KANSEI + cycle-010 handoff | F-numbers continue from F44 (cycle-007 last). KANSEI gate. Ping Jani on #176 final-status + loa#617 status. Amendment to cycle-007 findings §9 pending-actions (Vercel projects retired) + §12.3 P1#2 (superseded) | small | CERTAIN | paired |

**Shell-first discipline** held per doctrine. All file authoring + git ops + gh ops + aws cli ops (within operator IAM scope). No new TypeScript; no DSL.

**All ops-level legs are paired-only** per [[bonfire-at-composition-seam]]: L-branch-reconcile (shared-branch destructive), L-migrate-constructs (cross-repo + Jani), L-migrate-dashboard (Jani + production cutover), L-close (cycle-close integration).

---

## 3 · Acceptance criteria

### L-0 (done in dispatch)

- **AC-0.1** · Local `bridge/freeside-dashboard-truthing` synced to origin (8 commits, including `3199bcf`) ✓
- **AC-0.2** · Half-done-migration detection recipe ran on `apps/constructs-network/` against synced tree — **clean**: env vars code-referenced (`CONSTRUCTS_API_URL`, `CONVEX_URL`, etc.), no phantom Supabase/Prisma/Drizzle/Turso imports ✓
- **AC-0.3** · use-freeside SKILL.md test: workflow live + coherent; 5 worlds provisioned (apdao/mibera/rektdrop/score-api + mibera-secrets); gaps named (no multi-app guidance, no migration-specific path, operator IAM insufficient for Step 4+) ✓
- **AC-0.4** · compose-run dry-run validates composition engine + construct-handle resolution ✓ (full display-layer tmux test deferred; display streaming into Claude Code is orthogonal cycle-010+ concern)

### L-dig · mibera-dimensions

- **AC-dig.1** · Read mibera-dimensions observer + `world-surface.yaml` (module + room registry v1 draft, 2026-04-16 Apr 20+)
- **AC-dig.2** · Typed answer artifact: which invariants transfer to freeside-as-product (worlds = modules? URLs = rooms?), which don't. Not aesthetic notes — specific claims with evidence
- **AC-dig.3** · Output feeds L-framing if convergent; stays as parallel finding if not. No blocking on ops legs

### L-branch-reconcile

- **AC-BR.1** · `sprawl-world/main` fast-forwarded from `bridge/freeside-dashboard-truthing` (or operator-preferred merge strategy: squash, cherry-pick subset). Commits `3199bcf`-forward land on main
- **AC-BR.2** · If FF via PR (recommended for audit trail): PR opened against main, Vercel build status green on the PR, operator-merged
- **AC-BR.3** · Vercel main-branch builds succeed post-reconcile (validates pre-migration state is clean)

### L-migrate-constructs

- **AC-MC.1** · `loa-freeside/infrastructure/terraform/world-constructs-network.tf` authored (copied from `world-mibera.tf`, tuned for Next.js + Convex), PR on loa-freeside linked to #176
- **AC-MC.2** · Env-var migration plan documented: every `process.env.X` in `apps/constructs-network/` mapped to AWS Secrets Manager entry or Convex-dashboard-managed. Includes `CONSTRUCTS_API_URL`, `NEXT_PUBLIC_API_URL`, `CONVEX_URL`, `NEXT_PUBLIC_CONVEX_URL`
- **AC-MC.3** · `/api/cron/reconcile` re-home plan: EventBridge scheduled rule + ECS task OR app-level scheduler OR documented as dropped. Load-bearing-ness of the 15-min reconcile confirmed
- **AC-MC.4** · `.github/workflows/deploy-constructs-network.yml` authored per SKILL.md Step 2 Container pattern (OIDC → ECR build/push → ECS update)
- **AC-MC.5** · DNS staged cutover: freeside deploy live at `constructs-network.0xhoneyjar.xyz` (or similar) first, smoke-test, 48h parallel-operation window, THEN `www.constructs.network` alias swap
- **AC-MC.6** · Old Vercel project `loa-constructs-explorer-5bfi` retired post-48h. Credentials cease
- **AC-MC.7** · `bd-1o9` beads task closed by this leg (superseded-by-migration noted)
- **AC-MC.8** · `loa-freeside#176` disclosure updated with amendments as state changes — per [[learner-expert-transparency-protocol]] §4

### L-migrate-dashboard

- **AC-MD.1** · `loa-freeside/infrastructure/terraform/world-freeside-dashboard.tf` authored, PR on loa-freeside
- **AC-MD.2** · `ADAPTER=node` build variant verified working in CI before any production deploy
- **AC-MD.3** · Env-var migration: operator-side env list → AWS Secrets Manager
- **AC-MD.4** · `.github/workflows/deploy-freeside-dashboard.yml` authored
- **AC-MD.5** · **Bootstrap sequence**: Vercel deploy of dashboard stays live AT ALL TIMES through cutover + 48h post. If freeside-dashboard-on-freeside fails at any point, operator can flip DNS back to Vercel in <5min. Explicit rollback SLA
- **AC-MD.6** · DNS cut after 48h green/blue parallel. Vercel project retired only after dashboard-on-freeside has served production traffic for ≥1 week without incident
- **AC-MD.7** · `loa-freeside#176` amended

### L-pattern-doc

- **AC-PD.1** · `loa-constructs/docs/integration/vercel-to-freeside-migration.md` authored
- **AC-PD.2** · Documents: the 7-step sequence cycle-009 actually executed, env-var migration pattern, cron re-home options, DNS green/blue cutover checklist, rollback SLA template
- **AC-PD.3** · Names what was NOT standardized (Shape A/B/C multi-app — defers to #174), what IS re-usable single-service pattern (cycle-009 proved this)
- **AC-PD.4** · cycle-010+ explicitly enabled: next migration (Purupuru, Honey Port, Sprawl-broader) composes on this doc

### L-framing

- **AC-FR.1** · `cycle-009-l-framing-freeside-as-product.md` exists — ≤300 words
- **AC-FR.2** · Names "freeside-as-product: Vercel + GA for communities"
- **AC-FR.3** · Links (not rewrites): [[freeside-vision]], [[freeside-dashboard-bridge-audit]] §10 operator resolutions, loa-freeside#174 Purupuru multi-app, loa-freeside#176 cycle-009 disclosure
- **AC-FR.4** · Names cycle-010+ candidate-doctrine: `registry-visibility-is-product` (instance-1 surfaced this cycle via operator 2026-04-24)

### L-close

- **AC-CL.1** · `cycle-009-findings.md` authored; F-numbers from F44 (cycle-007 last)
- **AC-CL.2** · KANSEI gate filled (see §6)
- **AC-CL.3** · Ping Jani on loa-freeside#176 with final-state summary; close if applicable
- **AC-CL.4** · Ping @janitooor on loa#617 status (upstream PR, OPEN + MERGEABLE as of 2026-04-22)
- **AC-CL.5** · Amend cycle-007 `cycle-007-findings.md` §9 pending-actions and §12.3 P1#2 (supersedes)
- **AC-CL.6** · Amend cycle-008 `cycle-008-l-bug-triage-and-migration-queue.md` with cycle-009 resolution pointer
- **AC-CL.7** · Cycle-010+ inheritance queue updated: construct-freeside pack, gaib CLI, freeside-as-product design, Purupuru migration (blocked on #174 resolution)

---

## 4 · Doctrine compliance (invariants this cycle must honor)

| Invariant | How |
|---|---|
| [[creative-work-is-re-entered]] | Cycle-wide seams (L-branch-reconcile, L-migrate-*) are paired-re-entry points; no autonomous dispatch through ops |
| [[bonfire-at-composition-seam]] | Operator-present at every cross-repo boundary, every terraform apply, every DNS cut |
| [[builder-touch-imperative]] | Jani pairing at terraform applies = bonfire-touch (human-other contact); operator doesn't solo-build the freeside ops layer |
| [[learner-expert-transparency-protocol]] | loa-freeside#176 filed as Step-1 disclosure; amendments not edits; specifics not generalities; Jani's calls framed as Jani's calls throughout |
| [[half-done-infrastructure-migration]] | Detection recipe ran on `apps/constructs-network/` (AC-0.2 passed); applied again at L-migrate-constructs close (env-vars set AND code reads them AND old references deleted) |
| [[freeside-vision]] — Sovereign Vercel posture | Each migration retires Vercel surface; credentials cease not rotate. Cycle-009 = slices 6+7 of the 2026-04-19 migration queue |
| [[composable-systems-open-web-doctrine]] #3 | Registry + network visibility as agent+human coexistence UI — this is WHY the cycle is urgent, not "nice to have" |
| Cycle-008 §6.1 sovereignty-preserving composition | L-framing names but doesn't bundle; future construct-freeside will declare `consumes: WorldArtifact, required: false` |
| Cycle-008 §6.2 latent-handle visibility | Name constructs + skills by handle as invoked (`use-freeside` skill via SKILL.md invocation, `/bug` via `bug-triaging` construct, `/hivemind` via hivemind skill) throughout commit messages + leg docs |
| Shell-first (doctrine §13.1) | All extensions are yaml + tf + gh-cli + aws-cli; no new TypeScript; no DSL |
| OTLET chain-preserved | SEED links back to cycle-007 §12.3 P1#2 (supersedes), cycle-008 L-bug-triage §3 (migration proposal landed); flagged candidate doctrines (below) add under watch only |

**Doctrine candidates under watch (second-instance-earns-promotion per [[naming-is-diagnostic]])**:

| Candidate | Instance-1 evidence in this cycle | Promote if… |
|---|---|---|
| **registry-visibility-is-product** | Operator 2026-04-24 framing re: constructs.network + coexistence UI | Second product case where UI visibility IS the product (candidate: freeside-dashboard's own registry render if it reaches public tenant surface) |
| **ops-asymmetry-is-bonfire** | Operator IAM S3-scoped; Jani owns ECS; cycle-009 pairing requirement is structural, not accidental | Second cross-ownership ops cycle confirms pairing IS the mechanism |
| **migration-as-security-primitive** | Cycle-009 + [[session 2026-04-19-vercel-security-to-migration-reframe]] — credential ceases, not rotates | Third migration in the queue (Purupuru / Honey Port / Sprawl) confirms pattern |
| **adapter-switch-as-migration-primitive** | freeside-dashboard's `svelte.config.js` adapter switch IS the migration mechanism | Second app with adapter-switch pattern lands (candidate: any sveltekit worlds in future) |

No doctrine pages in cycle-009; promotion ceremony at cycle-010+ second-instance evidence.

---

## 5 · Dependencies + sequencing

### Within cycle-009 (sequencing DAG)

```
L-0 (done) ──┐
              ├──► L-branch-reconcile ──► L-migrate-constructs ──► L-migrate-dashboard ──► L-pattern-doc ──► L-close
              │                           │                         │
L-dig ────────┘ (parallel)                │                         │
                                          └──► L-framing (async) ───┘
```

- **L-dig parallel**, not critical path
- **L-migrate-constructs precedes L-migrate-dashboard** — constructs.network validates the path; dashboard is higher-stakes (bootstrap chicken-and-egg); sequenced so the second migration inherits validated primitives
- **L-framing independent** — authorable any time post L-migrate-constructs
- **L-pattern-doc near end** — records what shipped
- **L-close integrates everything** + amends prior cycles

### External dependencies

| Dep | Status | Blocker? |
|---|---|---|
| Jani's response on loa-freeside#176 | awaiting | **Soft blocker** on L-migrate-*. L-0, L-dig, L-branch-reconcile proceed regardless. L-migrate-* draft .tf while awaiting; apply-and-cutover blocks on Jani |
| loa-freeside#174 Purupuru resolution | OPEN issue, 2026-04-19 | Not a blocker — cycle-009 keeps #174 separate; Shape-B default doesn't prejudge #174 |
| loa#617 upstream PR | OPEN, MERGEABLE | Not a blocker — awaits @janitooor; cycle-009 L-close pings status |
| `bd-1o9` beads task | OPEN P2 | Closed by L-migrate-constructs (superseded) |

### Internal doctrine chain

- [[bonfire-at-composition-seam]] — source: all ops legs paired
- [[learner-expert-transparency-protocol]] — source: every Jani-surface touch
- [[half-done-infrastructure-migration]] — source: detection gates at L-0 + L-migrate-* close
- [[freeside-vision]] — north star
- Cycle-008 L-bug-triage §3 — migration proposal; cycle-009 delivers it
- Cycle-007 §12.3 P1#2 — supersedes (method pivot from webhook+cron to hosting migration)

---

## 6 · KANSEI gate (cycle-close questions — operator-answered)

Target: ≥4/5 Y on Q1–Q4 + constructive Q5. Halt threshold: <3/5.

- **Q1** — Did the Jani-pairing ops rhythm feel like a genuine bonfire (both of us present, contributing, iterating) or did it feel like one-sided hand-off?
- **Q2** — Does the migration template doc (`vercel-to-freeside-migration.md`) feel re-usable for the next world (Purupuru or Honey Port), or did we document only what we-specifically did without naming the primitive?
- **Q3** — Did the learner-expert-transparency-protocol in loa-freeside#176 land well with Jani? Specifically: did amendments land cleanly, or did any discourse feel frictional?
- **Q4** — Is cycle-009 evidence strong enough that you'd commit to cycle-010 dispatching a THIRD migration (Purupuru) on the same primitive + same pairing rhythm?
- **Q5** — Free-text: with two migrations behind you and constructs.network + freeside-dashboard live on freeside, what about freeside-as-product feels NAMEABLE now that wasn't before? And what still feels vibe-only?

---

## 7 · Why this cycle matters

1. **Restores a product surface.** constructs.network is user-visible coexistence UI per operator 2026-04-24. Cycle-009 ends the outage.

2. **Proves the self-host primitive.** freeside-dashboard self-hosting on freeside is the ultimate dogfood — if the dashboard can't deploy itself, the product has a credibility gap. Cycle-009 closes it.

3. **Produces the migration template.** Cycle-010+ Purupuru migration + Honey Port + Sprawl-broader all compose on the doc this cycle emits. The primitive is reusable.

4. **Materializes [[learner-expert-transparency-protocol]].** loa-freeside#176 IS the protocol applied end-to-end — first-sentence asymmetry, specifics disclosed, Jani's calls framed as Jani's calls, amendments not edits. Future cross-ownership work inherits the pattern.

5. **Names freeside-as-product for cycle-010+.** L-framing crystallizes what the next cycle builds. Naming unlocks dispatch per [[naming-is-diagnostic]].

6. **Retires attack surface.** Two Vercel projects ceasing — credentials don't rotate, they stop existing. Security-as-sovereignty compounds with every migration per [[session 2026-04-19-vercel-security-to-migration-reframe]].

---

## 8 · What this cycle does NOT claim

- **NOT** a freeside platform upgrade. Uses existing `modules/world/`, existing ECS cluster, existing ALB.
- **NOT** construct-freeside pack ship. Pack deferred to cycle-010+ after migration surfaces real needs.
- **NOT** gaib CLI ship. Referenced in L-framing, not built.
- **NOT** Purupuru migration. loa-freeside#174 parallel; cycle-009 keeps separation.
- **NOT** freeside-as-product design. L-framing NAMES only; cycle-010+ designs.
- **NOT** a replacement for cycle-008 freeside-pilot. Design arc stays paused, returns as paired session when ripe.
- **NOT** doctrine promotion for any candidate. Instance-1 evidence only.

---

## 9 · Post-dispatch additions (operator may amend)

- [ ] Confirm leg sequencing as proposed OR reorder
- [ ] Confirm `docs/integration/vercel-to-freeside-migration.md` path + naming (loa-constructs or sprawl-world?)
- [ ] Confirm L-framing output file name + location
- [ ] Additional candidate-watch doctrines to flag, OR removals from §4 list
- [ ] Adjust KANSEI questions if better signal targets emerge
- [ ] Decide: if Jani holds on #176 for multi-app pattern alignment, do we switch to spot-fix (Vercel repoint) as stopgap AND keep cycle-009 legs open, or pause cycle-009 entirely?

---

*Cycle-009 Freeside-as-Host Migration SEED drafted 2026-04-24 post cycle-008 L-bug-triage close + /hivemind + /oracle-analyze + use-freeside skill test + loa-freeside#176 filed. Paired-mode dispatch. Ready for operator amendment + L-dig/L-branch-reconcile dispatch while awaiting Jani on #176.*

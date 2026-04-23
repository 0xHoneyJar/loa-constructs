# Cycle-010 · Findings

> Partial findings written before L-apply-window fires and before full L-close. Updates as Jani signals land.
>
> **Date**: 2026-04-24 (cycle-010 mid-stream, post L-scaffold-v0 + L-migrate-prep + L-ui-complete + L-canon-amend)
> **Cycle**: cycle-010 · Freeside CLI + UI Substrate + constructs.network migration prep
> **Branch**: `feat/spiral-loa-constructs-cycle-010-freeside-cli-ui-substrate`
> **F-numbers continue from**: F44 (cycle-007 last). cycle-009 may amend F45+ concurrently.

---

## F45 · gaib is a remnant of Arrakis, not a Freeside lever

Pre-dispatch assumption (operator + freeside-vision.md §Gaps #2): `gaib world create` is a shippable CLI wrapper over the Freeside world-hosting substrate. Reality: `gaib` is Jani's `@arrakis/cli` v0.1.0, completed cycle-007, scoped to declarative Discord-server IaC (`gaib login/sandbox/server`). The name was coined under Arrakis (Freeside's old name) and drifted onto Jani's Discord tool during the product rename.

The collision was diagnostic per [[naming-is-diagnostic]]: the mismatch IS the signal to pay attention to naming. Cycle-010 shipped under `freeside` (binary + bash reference at `sprawl-world/scripts/freeside`) with a placeholder `@freeside/cli` destination at `loa-freeside/packages/freeside-cli/` for eventual TS/commander migration.

**Forward**: the operator's preferred end-state is one unified `freeside` binary that subsumes `gaib`'s subverbs (Vercel/vercel parity — product IS the CLI). Filed as an explicit ask in loa-freeside#178 for Jani review. Until Jani signals, current shipped state is siblings (`gaib` + `freeside`).

## F46 · Bridge-audit Gap #3 obsoleted by dashboard evolution, not fixed

Bridge-audit §4 (2026-04-16) named three critical gaps: (1) no creation verb, (2) Subway menu invisible, (3) glyph geometry has no legend + hierarchy reads wrong. Cycle-010 L-ui-complete scoped to close all three.

Reality on disk (2026-04-24):
- **Gap #1** — `NewProjectButton.svelte` already exists, wired into `/worlds` header, opens modal with seam-naming copy (file issue OR run CLI). Cycle-010 renamed `gaib` → `freeside` in the CLI reference (two strings in `arrakis.ts`).
- **Gap #2** — `/menu` route ships 14 Components across 8 categories; tile module-rail renders `world.modules[]` via `ComponentSquare`. Cycle-010 enhanced `worlds.config.json` with `observability` on rektdrop + constructs-network.
- **Gap #3** — *obsoleted*. `/worlds/+page.svelte:139-141` comment: *"Tile = Railway-style square workspace card. Drops strata/glyph viz in favor of a square grid of attached Components."* The audit's snapshot predates this pivot. Legend + nested-tile no longer relevant; hierarchy visualization lives at `/worlds/[slug]` drill-down.

**Lesson**: bridge-audit snapshots decay. Before dispatching work to close audit gaps, verify the gap is still open in the current codebase. Cycle-010 scope compressed L-ui-verb + L-ui-subway + L-ui-legend into L-ui-complete (and then further shrunk as Gap #3 turned out to be resolved) without losing substance.

## F47 · Freeside's product-vision scope gap is visible only from outside

Jani's `loa-freeside/README.md` v7.0.0 frames Freeside as *"multi-model agent economy infrastructure platform"* — Commons Protocol + Discord/TG + BYOK + token-gating. The word "world" appears zero times in the README. Operator's `~/hivemind/wiki/freeside-vision.md` frames Freeside as *"sovereign Vercel for worlds."* The phrase "sovereign Vercel" appears only in operator-hivemind.

Both are true simultaneously (the world-hosting substrate — `modules/world/` + 6 `world-*.tf` files — is Jani-co-built via issue #153). But world-hosting is shipped-but-undocumented externally. The operator's vision-articulation is ahead of the public README.

**Implication**: shipping a `freeside` binary commits operator's visionary frame implicitly. Safe interim pending Jani amending README to add world-hosting. Filed as observation in `project_freeside_vision_scope_gap.md` auto-memory. Not a cycle-010 blocker.

## F48 · The CLI's `--apply` omission is the doctrine made structural

`freeside world create <name>` has `--dry-run` / default-write / `--commit` / `--pr` modes. It deliberately lacks `--apply`. terraform apply requires Jani-IAM scope; the CLI opens a PR for Jani review but does not cross the IAM seam unilaterally.

This is [[bonfire-at-composition-seam]] instantiated as a tool constraint — not a note in a doc, not a policy, but the actual absence of a verb. The absence is the enforcement. Cycle-011+ forward-work: CI-driven apply on PR-merge with Jani's OIDC role; at that point `--apply` can live on the merged pipeline, not on operator-local invocation.

## F49 · Operator-as-the-seam at product-scale (instance-2 evidence)

Cycle-009 coined [[operator-as-the-seam]] based on L-smoke tmux session evidence (splits inside attention-field vs separate-window antipattern). Cycle-010 is instance-2 evidence at a different scale: the dashboard's `NewProjectButton` IS the seam between operator-as-deployer (dev-mode shell to CLI) and tenant-cohort (prod-mode deep-link to GitHub issue template). The button doesn't hide the asymmetry; it names it.

Second-instance promotion per [[naming-is-diagnostic]]: doctrine is now load-bearing at both terminal-scale AND product-scale. Update [[operator-as-the-seam]] "Instance-1 evidence" section when cycle-010 closes.

## Cycle-011 inheritance queue (handoff)

Rank-ordered for operator prioritization at cycle-011 open:

1. **Discord-IaC-into-Freeside visual layer** — operator-flagged cycle-009-close; delayed from cycle-010 scope. Jani's `gaib server apply` becomes a Component in the dashboard's /menu + a per-Workspace "Discord" Room. Independent of the binary-rename decision.
2. **`@freeside/cli` TS implementation** — port the bash at `sprawl-world/scripts/freeside` to TypeScript/commander in `loa-freeside/packages/freeside-cli/` (scaffold committed in #178). Pre-requisite for `freeside-mcp`.
3. **`freeside-mcp`** server — per [[mcp-wraps-cli-pattern]] sequence: CLI first → MCP wraps → UI visualizes. Exposes `world create` as an agent tool.
4. **Purupuru migration** — blocked on loa-freeside#174 Shape A/B/C resolution. When #174 resolves, `freeside world create purupuru` is the dispatch primitive; third-migration confirms `migration-primitive-collapses-hand-work` doctrine candidate (F46 of cycle-010 promotes to second-instance).
5. **CI-driven `terraform apply` on PR-merge** — Jani-owned pipeline that closes the `--apply` gap. Transforms `freeside world create --pr` into end-to-end provisioning.
6. **Gaib-or-freeside rename ceremony** — conditional on Jani's response to #178. If rename lands: migrate `@arrakis/cli` subverbs into `@freeside/cli`, keep `gaib` binary as thin shim.
7. **/projects tenant-surface design** — operator chose "reserved shape only" at cycle-010 close. Cycle-012+ candidate when ASH-gated self-service flow is designed.

## KANSEI gate (cycle-close — operator-answered)

Target ≥4/5 Y on Q1-Q4, constructive Q5. Halt <3/5.

- **Q1** — Did `freeside world create <name>` feel like a primitive that collapses cycle-009 hand-work, or a script-wrapping-a-script that added a layer? If cycle-011 dispatches Purupuru, would you reach for the CLI or re-author by hand?
- **Q2** — Did the naming resolution (gaib-is-Jani's, freeside-is-ours for now, unified-rename-is-the-ask) land cleanly with Jani? Did the #178 PR body's first-sentence asymmetry disclosure feel right, or did anything read as either too-deferential or too-assumptive?
- **Q3** — Does the `NewProjectButton` → `freeside world create` wiring instantiate operator-as-the-seam at product-scale convincingly enough to promote the doctrine to "load-bearing, product-scale instance shipped"? Or does it still feel like terminal-scale-only?
- **Q4** — With constructs.network dispatch-ready (Dockerfile + health route + secrets loader + workflow-YAML-fix + L-migrate-dashboard TF draft all committed), does L-apply-window feel like a kaironic window that will fire cleanly on Jani signal, or does it feel like it might hang indefinitely?
- **Q5** — Free-text: with freeside CLI shipped + bridge-audit gaps closed-or-obsoleted + constructs.network dispatch-ready + #178 filed, what about freeside-as-product feels NAMEABLE now that wasn't before cycle-010? And what still feels vibe-only?

## What this cycle does NOT claim

- **NOT** the rename decided. Jani's call; cycle-010 proposes + references, does not commit.
- **NOT** `@freeside/cli` TypeScript shipped. Placeholder only; working CLI is bash.
- **NOT** `freeside-mcp` shipped. Cycle-011+ per sequence.
- **NOT** `terraform apply` fired. L-apply-window conditional, awaits Jani on #177.
- **NOT** tenant surface designed. Reserved-shape-only per operator resolution.
- **NOT** doctrine pages promoted. F49 candidate for instance-2 promotion; do at cycle-011 close.
- **NOT** cycle-009 closed. Cycle-009 L-framing, L-pattern-doc, L-close still pending (parallel to cycle-010; may close concurrently).

---

*Findings written mid-cycle-010, 2026-04-24. Updates as L-apply-window fires, Jani responds to #178, and cycle-011 dispatches.*

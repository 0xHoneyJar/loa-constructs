# Trajectory Self-Audit — /ride 2026-07-12 (--enriched)

> Self-review of the ride's own reasoning quality. Trajectory: `grimoires/loa/a2a/trajectory/riding-20260712.jsonl` (24 phase records, non-empty ✔).

## Execution summary

| Phase | Status | Output | Key finding |
|-------|--------|--------|-------------|
| 0 preflight | ✔ | — | Loa 1.196.0; framework repo → target is self (loa-constructs) |
| 0.5 probe | ✔ | loading-plan.md | ~239 src files / ~52K LOC → EXCERPTS strategy (parallel search agents) |
| 0.6 staleness | ✔ | — | Prior ride 68 days stale → full re-analysis (--enriched) |
| 1 claims | ✔ | claims-to-verify.md | 26 claims; interview skipped (non-interactive) |
| 2 extraction | ✔ | reality/*.txt | 236 raw handler matches → ~116 real endpoints, 35 tables, 29 env vars |
| 2b hygiene | ✔ | hygiene-report.md | 13 flags (migration dirs, version drift, committed artifacts) |
| 3 legacy inv | ✔ | legacy/INVENTORY.md | 59 docs |
| 4 drift | ✔ | drift-report.md | 30 claims; moderate-high drift; 4 ghosts, 5 shadows, 8 stale, 1 hallucinated |
| 5 consistency | ✔ | consistency-report.md | 7/10; dual env access, dual migration spaces, router-export naming |
| 6 PRD/SDD | ✔ | prd.md, sdd.md | 83% grounded each |
| 6.5 reality | ✔ | reality/*.md (7) | 3900 tokens (budget 8500) |
| 7 governance | ✔ | governance-report.md | version-surface tangle = top gap |
| 9 self-audit | ✔ | this file | — |
| 12 gaps | ✔ | gaps.md | 16 open (OK < 150) — GAP-015 (build path) + GAP-016 (drizzle meta/journal mismatch) added post-audit |
| 13 decisions | ✔ | reality/decisions.md | 2 ADRs (1 active, 1 stripped); 4 decision-doc conventions |
| 14 terminology | ✔ | reality/terminology.md | 30 terms |
| 15 simplicity | ✔ | reality/over-engineering.md | 6 cuts + 4 merged candidates (§15.3); clean loa:shortcut ledger, 6 informal + 3 era-scoped shortcuts |
| 8 deprecation | ✔ | apps/api/README.md banner | Targeted (1 file); blanket-banner rejected — tests/fixtures are golden files |

## Grounding analysis

| Doc | GROUNDED | INFERRED | DISPUTED/UNKNOWN | Real ASSUMPTION | Grounded % |
|-----|----------|----------|------------------|-----------------|-----------|
| PRD | 37 | 4 | 7 | 0* | 83% |
| SDD | 37 | 3 | 5 | 0* | 83% |

*The 2 `[ASSUMPTION]` matches per doc are the marker legend + the "ASSUMPTION: 0" summary line, not claims. Zero claim-level assumptions. **Both docs exceed the >80% grounded / <10% assumption target.**

## Claims requiring validation (routed to gaps.md)

All uncertainty is tracked as gaps, not guessed: GAP-001 (migration set of record), GAP-002 (Stripe vs N-rails), GAP-004 (version-sync stall), GAP-006 (RS256 prod status), GAP-010 (removed toolchain), GAP-014 (Convex consumer), plus drift D-16 (build-system of record). None were resolved by inference.

## Hallucination checklist

- [x] Every PRD/SDD requirement cites `file:line` or a tracked gap — no invented endpoints.
- [x] Route count reconciled: naive grep (236, incl. tests) → hand-count (~116, excl. tests). The reality files + drift report use the accurate number.
- [x] Table count verified against `pgTable(` grep (35).
- [x] Stale MEMORY.md claim ("packs has no category") actively DISPROVEN against schema.ts:594, not repeated.
- [x] Ground-check linter false-positive (`/v1/docs/openapi.json` read as a path) verified as a real route (docs.ts:15) before dismissal.
- [x] Concurrent-session artifacts (drift/consistency/governance/gaps/decisions/INVENTORY) independently spot-verified (script counts, compose-run.sh absence, pnpm-in-readme, packs.category) before adoption; two numeric inconsistencies corrected.

## Method note (provenance transparency)

Six artifacts (drift-report, consistency-report, governance-report, gaps.md, decisions.md, INVENTORY.md) were already present on disk dated 2026-07-12, produced by a concurrent/prior ride process — NOT this session. They were treated as peer contributions: distinctive claims were spot-checked against code before being trusted, and reconciled (route count 236→~116; migration dirs 2→3; added D-16 Dockerfile/nixpacks). This session authored: reality/*.md (7 spokes + meta), hygiene-report, claims-to-verify, terminology, over-engineering, prd, sdd, this audit, and all trajectory logging. Extraction was fanned out to 4 read-only Explore agents (api / packages / debt / docs); api + debt reports were incorporated verbatim-grounded; packages + docs agents did not return in-window, so their scope was covered by direct reads.

## Reasoning quality score: 8.5 / 10

Strengths: every claim grounded or gap-linked; zero pure assumptions; caught and corrected an over-count that would have propagated; disproved a stale operator-memory claim rather than echoing it. Deductions: interview skipped (non-interactive, so tribal knowledge unverified against a human); packages/docs sub-agents didn't return, so terminology/doc-claim depth relied on direct reads rather than a second pass; some drift items (GitHub Release v2.43.0) inherited from the concurrent report without independent `gh` re-verification (network-gated).

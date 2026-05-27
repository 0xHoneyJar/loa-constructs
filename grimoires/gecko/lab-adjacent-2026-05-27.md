---
status: candidate
type: tend-cycle-orientation
mode: ARCH-on-lab-cluster
date: 2026-05-27
operator: zksoju
composes_with: [hivemind-laboratory-membership, construct-laboratory-substrate, lab-triple-246-247-248]
---

# Lab-adjacent orientation — what i see in the dust

> TEND-cycle ARCH lens on the lab cluster (#246 / #247 / #248).
> Observation-only artifact. No commits to land yet. Pre-planning the lab wiring.

## ⚡ GLANCE

```
canonical home        consolidation status         kernel pin              dependency chain
══════════════        ════════════════════         ══════════             ════════════════
construct-            STEP 1 LANDED 2026-05-21     OperatorOS @1a0a776     #248-A: independent
laboratory-           ✓ validator/                 (seed scaffold,         #247: independent
substrate             ✓ templates/                  2026-04-29)             ↳ enables #248-B
(private)             ✓ .claude/schemas/                                   ↳ enables #246 G1
                      ✗ OPERATORS.md (needs        ⚠ HEAD @2bd219ad        consolidation
HEAD: 2bd219ad        Eileen — co-maintenance)     3 commits ahead         step-2-5 still
3 commits ahead       ✗ .github/ISSUE_TEMPLATE/    (validator + lab        pending (not
of operator pin       (templates exist as DOC,     artifacts + consol.)    blocking)
                       not as gh-renderable)
```

## 🧭 ORIENT

**The consolidation that already shipped.** The plan in `~/bonfire/grimoires/bonfire/context/consolidation-laboratory-substrate-2026-05-21.md` (drafted 2026-05-21) was *partially executed the same day* — commit `2bd219ad` "consolidate: labels + templates + validator into one Laboratory substrate (step 1, additive)" landed on `construct-laboratory-substrate/main`. The repo at `0xHoneyJar/construct-laboratory-substrate` now contains:

- `.claude/schemas/labels.schema.json` (canonical schema, Eileen's lore)
- `validator/hivemind-labels-validate` (+ `.mjs` + `lib/`)
- `templates/canvas-template.md`, `journey-template.md`, `hivemind-issue-templates.md` (with `[CANVAS]/[BUG]/[TASK]/[SOLUTION]/[GAP]` family doc)
- `labs/` with 2 [EXP] artifacts (straylight memory-estate + control-plane)

This **invalidates the framing in #248** that the validator lives at `construct-observer/scripts/`. It does — and the construct-observer copy is still there per "additive" consolidation — but the canonical home is now the lab substrate. Forward-compatible wiring should target the canonical path.

**The kernel pin is 28 days behind.** OperatorOS pins `construct-laboratory-substrate@1a0a776` (the seed scaffold, 2026-04-29). HEAD is `2bd219ad` (2026-05-21), 3 commits ahead. Anyone navigating to the pinned commit gets the seed-only view — no validator, no templates, no schemas, no labs/. The pin file (`~/.claude/laboratory/hivemind-labels.v1.0.json.pin`) explicitly preserves the seed-sha for reproducibility. The drift is intentional in form, accidental in effect: the kernel's claim "canon: construct-laboratory-substrate@1a0a776" suggests the substrate at that pin contains what the kernel describes (verifier, label schema, templates) — but at that exact pin, only the labels schema existed.

**The validator's contract is stricter than the issues use it.** Live experiment 2026-05-27: ran canonical `hivemind-labels-validate` against #246's issue body. **Exit 2 (malformed YAML frontmatter)**. The validator requires YAML frontmatter at the top of a markdown file (between `---` markers). #246's body has the hivemind block as a YAML *code fence inside section [F]*, not as frontmatter. The `--stdin` mode works perfectly when fed just the YAML block — so the gap is shape, not content.

**OPERATORS.md still needs Eileen.** Consolidation plan step 3. The MEMBERSHIP doctrine assumes operator registry exists in the canonical area; the registry directory isn't there yet. This blocks "another operator joins" cleanly.

**`[CANVAS]/[BUG]/[TASK]/[SOLUTION]/[GAP]` exist as DOC, not as GitHub-renderable templates.** `templates/hivemind-issue-templates.md` documents the family beautifully. But there's no `.github/ISSUE_TEMPLATE/*.md` in the canonical repo. A user clicking "New Issue" on construct-laboratory-substrate sees no lab template family. In loa-constructs, `.github/ISSUE_TEMPLATE/` has `bug_report.md`, `documentation.md`, `feature_request.md` (the GH defaults) — none aligned to lab.

## 🔧 INTERVENE — the actionable surface (no commits yet)

### What #248 Phase A actually needs (revised understanding)

Per live experiment + canonical contract:

```
Issue body (markdown, no frontmatter)
       │
       │ extract step (TODO — doesn't exist yet)
       │
       ▼
hivemind YAML block (just the keys)
       │
       │ pipe to --stdin
       ▼
hivemind-labels-validate --stdin  →  exit 0/2/3/4
```

The wrapper is small but non-trivial: needs to parse markdown, find the `hivemind:` block (could be in frontmatter OR a YAML code fence OR an embedded block), extract just that, pipe to `--stdin`. The validator itself handles all enum checks.

**Alternative**: enforce frontmatter convention for lab artifacts. Issue templates put `hivemind:` block at top in frontmatter (between `---`). New issues conform; existing issues like #246 need a body edit. Simpler validator wiring; bigger one-time migration.

### What the kernel pin update would look like

Two readings:

1. **Pin-bump**: bump kernel pin from `@1a0a776` → `@2bd219ad`. Doctrine line in `~/.claude/CLAUDE.md` line 25 + pin file `~/.claude/laboratory/hivemind-labels.v1.0.json.pin:4`. Now the kernel's claims match what's actually at the pin.

2. **Pin-meaning clarification**: keep pin at seed (`1a0a776` = "the schema as of cycle-001 baseline") + add a separate "consolidation pin" or "latest substrate pin" that reflects HEAD. Composes with the operator's force-chain doctrine (the pin is a stability anchor, not a tracking pointer).

Option 1 is mechanically simpler. Option 2 is more rigorous. Decision depends on whether the kernel pin is "the schema canon" (option 1: bump as substrate evolves) or "the seed reference" (option 2: keep seed, surface latest separately).

### Consolidation steps still pending (not blocking #248-A)

| Step | Status | Blocker | Estimated effort |
|------|--------|---------|------------------|
| 1. Additive consolidation PR | ✅ landed `2bd219ad` 2026-05-21 | — | done |
| 2. Consumer repoint (observer → lab) | ⏳ pending | nobody yet; observer still self-hosts | 1 PR each repo |
| 3. OPERATORS.md authored | 🟡 needs Eileen | co-maintenance design | coord-conversation |
| 4. Rename `hivemind-laboratory` → `construct-laboratory-substrate` | ✅ landed (repo description updated 2026-05-21) | — | done |
| 5. Archive `construct-hivemind-os` | ⏳ pending | verify no live deps | audit then archive |

### `[CANVAS]/[BUG]/[TASK]/[SOLUTION]/[GAP]` GitHub-template gap

These need to exist as `.github/ISSUE_TEMPLATE/*.md` files in **two places minimum**:

1. **`construct-laboratory-substrate/.github/ISSUE_TEMPLATE/`** — canonical home (so the templates are reusable as ref impl)
2. **`loa-constructs/.github/ISSUE_TEMPLATE/`** — this repo, so Lab-shaped issues filed here render with frontmatter pre-baked

Without these, the `hivemind-labels-validate` Phase A wiring is harder (every issue body has to be hand-shaped), and the operator carries the burden of frontmatter discipline.

## 🔭 What's NOT covered here

- The patrol of the ~28 older open issues (running in background subagent)
- The `.agents/skills/` + `.codex/` + `AGENTS.md` mystery sweep (running in background subagent)
- The auto-memory `translate-don't-abstain-on-laboratory` freshness check (running in background subagent)
- The actual ledger schema / skill-critic substrate work from #246 §B (parent issue scope, beyond TEND)

## 🪡 Decision surface for the operator

When patrol findings land + you're ready to weave:

1. **The fastest TEND win** — bump the kernel pin or clarify pin-meaning. One-line edit + pin-file update. Closes a real drift between kernel claims and substrate reality. Doesn't need Eileen.

2. **The most compounding TEND win** — author the `.github/ISSUE_TEMPLATE/` family in `loa-constructs` (consuming the canonical templates by reference). Every future issue files lab-shaped from day one. Doesn't need Eileen.

3. **The Phase A wiring move** — pick extract-wrapper vs frontmatter-convention. Either lands #248 Phase A this week. Doesn't need Eileen.

4. **The Eileen-coord move** — pair on OPERATORS.md design + signal that consolidation step 1 is appreciated. Loops her in per `translate-don't-abstain` doctrine.

5. **The cross-repo finish-line** — observer dropping its duplicate validator/templates copies (consolidation step 2). Saves drift over time. Doesn't need Eileen but needs cycles.

## Operator notes (signed)

Wrote this during the TEND-cycle session 2026-05-27. The discoveries were: (a) the consolidation already partially shipped, (b) the kernel pin is 28 days behind HEAD, (c) the validator's frontmatter contract doesn't match the issue body shape, (d) the OPERATORS.md + GitHub-template gaps remain. Voice is observer-flat; this is the ARCH surface map, not GECKO's narrative. The patrol + sub-sweeps run in parallel and feed the next decision turn.

The operator's auto-memory `translate-don't-abstain-on-laboratory` (2026-03-16) says "do the integration, attribute Eileen, loop her in." That doctrine carries here — items 2, 3, and 5 above all touch Eileen's bounded context but in different ways. Item 2 (issue templates in loa-constructs) is purely on our side. Item 3 (OPERATORS.md) is co-authored. Item 5 (observer cleanup) is one-sided observer work but coordinates with the lab substrate as canonical reference.

Nothing in this artifact authorizes execution. Pre-planning ends with the operator's decision turn.

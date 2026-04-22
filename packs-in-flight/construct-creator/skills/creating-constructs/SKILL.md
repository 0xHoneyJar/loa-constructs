---
name: creating-constructs
description: CURATOR guides operators through authoring a new construct as a staged apprenticeship — naming first, then scaffold, then stream typing, skill authoring, persona voice, validation, reference composition, publish. Each stage asks questions, critiques the draft, and refuses to advance until the stage is defensible.
---

# Creating Constructs · CURATOR's apprenticeship surface

Use when the operator says:
- "I want to build a new construct for X."
- "Walk me through authoring a pack."
- "I started a construct-base clone — what next?"
- "Is my construct ready to publish?"

Do NOT use for:
- Installing an existing construct (that's `/constructs install`)
- Wayfinding (that's `/explore-network` — CURATOR's other skill)
- Scaffolding a blank repo (that's `gh repo create --template construct-base`)

## The apprenticeship model

CURATOR is an expert-present-in-every-decision surface ([[accelerated-learning-surface]]). The value is not just the finished construct — it's the rate at which the operator accumulates the name-level mastery to author confidently *without* CURATOR next time.

**Core rule**: CURATOR refuses to advance a stage until it is defensibly named + complete. The operator earns velocity by earning mastery, not by bypassing critique.

## Stage machine

The creating-constructs workflow is a **navigable state machine** (per cycle-006 operator framing). Stages have states: *waiting*, *active*, *complete*, *needs-revisit*. The operator may jump nonlinearly, but CURATOR names tension when advancing past an incomplete upstream stage.

| Stage | What CURATOR asks | What it produces | Refusal condition |
|---|---|---|---|
| 1. **Intent** | "What problem are you solving? Who benefits? What's the single noun-phrase name?" | `grimoires/construct-creator/drafts/<slug>/intent.md` | Can't articulate problem + user + name in one breath → [[naming-is-diagnostic]] |
| 2. **Naming** | "Try naming the persona. Try naming the primary skill. Say them aloud." | Draft persona handle + skill slug | Generic/toolbox name (e.g. `utility-x`, `helper-y`) → revise |
| 3. **Scaffold** | "Clone construct-base. Let me look at the result." | `gh repo create --template construct-base <slug>` or `cp -r construct-base/ <dir>` | Starting from scratch instead of the template → pointed at template |
| 4. **Stream typing** | "What Streams does it read? What Streams does it write? (Signal / Verdict / Artifact / Intent / Operator-Model)" | `construct.yaml` `streams:` block | No streams declared OR declares types the skill can't defensibly produce |
| 5. **Composition** | "What grimoire paths does it write? What does it read? Who does it compose with?" | `construct.yaml` `composition_paths:` + `compose_with:` | Empty paths OR compose_with claims that don't reciprocate |
| 6. **Skill authoring** | "For each skill: when to use, when NOT, output shape, anti-patterns." | `skills/<slug>/SKILL.md` passing lint | Missing any of the four sections |
| 7. **Persona** | "If it has a persona, write `identity/<HANDLE>.md`. Voice must be distinct." | Persona narrative with voice calibration | Generic persona (reads like a wiki article, not a voice) |
| 8. **Validate** | Runs `construct-validate.sh` | All-green validator report | Any MEDIUM or higher finding |
| 9. **Butterfreezone** | Runs `butterfreezone-construct-gen.sh` | `CONSTRUCT-README.md` committed | Generator errors OR wrong content surfaces |
| 10. **Reference composition** | "Author one composition YAML that uses your construct." | `compositions/<demo>.yaml` | No concrete use demonstrated |
| 11. **Publish** | "`gh repo create 0xHoneyJar/<slug> --public --source . --push`" | Upstream repo + registry entry | Previous stages incomplete |

## Per-stage behavior

CURATOR wears the **synthesis register** for creating (operator 2026-04-23: "experts are intended to advise a potential non-expert"). Five lenses are loaded: knowledge (hivemind — has this pattern appeared before?), craft (artisan — meets the standard?), depth (k-hole — non-obvious alternatives?), structure (the-arcade — composes with ecosystem?), perceptual (kansei — does the voice/surface feel right to this operator?).

Unlike wayfinding's fresh-per-query dispatch, creating uses **persistent context** across stages — CURATOR remembers earlier draft decisions and surfaces tensions when later stages contradict them.

## Runtime UX — structured questions

Stage questions (e.g. "What problem are you solving? · Who benefits? · One-breath name?") are emitted as **structured question primitives**, not prose. The skill declares *the questions + any constrained answer sets*; the frontend runtime decides the rendering:

| Runtime | Rendering affordance |
|---|---|
| Claude Code | `AskUserQuestion` tool — native inline Q&A with option picker |
| Terminal (compose-panes MVP) | `read -r` prompts with labeled options |
| Web UI | form widget / stepper |
| Voice | TTS + recognition |

Skills MUST NOT hardcode the Claude Code `AskUserQuestion` call — doing so breaks the frontend-swap invariant (doctrine v6 §18.1). Skills emit questions as structured data; runtimes render. Cycle-007 target: formalize the **Question** primitive alongside Signal/Verdict/Artifact/Intent/Operator-Model as a sixth stream type for inverse-direction (agent → operator) solicitation.

For cycle-006 MVP: document the questions in prose (this SKILL.md) and let the current runtime render them via whatever is natural. When the operator runs `/create-construct` in Claude Code, Claude MAY use `AskUserQuestion` as the inline render — that's a runtime decision, not a skill contract.

## Output streams

Per stage, CURATOR emits:

- **Verdict** (primary) — the stage critique. Severity: `info` (stage complete), `low` (refinement suggested), `medium` (revise before advance), `high` (blocker).
- **Artifact** — the draft file produced by this stage (`intent.md`, updated `construct.yaml`, new `SKILL.md`).
- **Signal** — related threads surfaced (e.g., "artisan's `distilling-components` has a similar shape — study it").

Example stage-4 Verdict:

```json
{
  "stream_type": "Verdict",
  "severity": "medium",
  "glance": "Streams declared but Signal produced without reading any upstream — isolated pipe",
  "verdict": "Your construct declares `writes: [Signal]` but `reads: []`. Isolated pipes are structurally valid but don't compose with anything downstream. Either: (a) name what upstream stream triggers this, or (b) document as a pipe-entry point (operator-initiated only) with justification.",
  "evidence": [
    {"lens": "structure", "source": "the-arcade", "note": "compose_with declarations all involve bidirectional flow"}
  ]
}
```

## Three read-modes

| Mode | Shape | When |
|---|---|---|
| glance | Per-stage one-liner: "Stage 4 complete · 2 streams declared" | Quick check-in |
| orient | Per-stage 3-5 lines + next-stage hint | Default |
| intervene | Full critique + refactored draft + alternatives explored | Operator stuck |

## Anti-patterns

- **Skipping stages for speed**. The whole point is the apprenticeship. Refuse.
- **Rubber-stamping drafts**. If the validator passes but the persona is generic, CURATOR should still refuse stage 7 on voice grounds.
- **Answering the operator's question with a single example**. Name the pattern, cite the exemplar, let the operator synthesize.
- **Promoting every exploration thread to a blocker**. Signals are signals. Blockers (high severity) should be rare — real pipe-structural problems, not stylistic disagreements.
- **Acting as a linter**. CURATOR has taste. Validators check rules. If a draft passes construct-validate but violates a taste standard (per artisan's lens), say so — mark `severity: low` with reasoning.

## Composes with

- `hivemind` — check prior art before each stage (has operator built anything similar?)
- `artisan` — craft lens for taste-heavy packs (naming, persona voice, skill anti-patterns)
- `k-hole` — reference depth (pull non-obvious exemplars during the naming stage)
- `the-arcade` — structural fit (does the declared composition actually work end-to-end?)

## Composition surface

Could be wrapped in a multi-stage composition YAML:

```yaml
# compositions/author-a-construct.yaml (sketch)
backend: headless-tmux
chain:
  - stage: 1
    construct: construct-creator
    skill: creating-constructs
    persona: CURATOR
    mode: persistent
    reads: [Intent, Operator-Model]
    writes: [Verdict, Artifact, Signal]
    iterate_until: operator_marks_stage_complete
  # ... one stage per apprenticeship-stage, or one stage driving many
```

Cycle-006 MVP ships the skill ready-to-invoke; the wrapper composition is cycle-007 (per the "real-LLM dispatch beyond website-scaffold" inheritance item).

## References

- Doctrine: [[accelerated-learning-surface]] (load-bearing — why this skill exists)
- Doctrine: [[naming-is-diagnostic]] (refusal rule for stages 1-2)
- Doctrine: pipe doctrine v6 §18.3 (focus-per-register — creating and wayfinding are distinct registers)
- Companion skill: `skills/exploring-network/SKILL.md` (CURATOR's wayfinding register)
- Companion template: `0xHoneyJar/construct-base` (what stage 3 clones from)

---
name: exploring-network
description: Wayfind the construct network through CURATOR's four-lens selection rule. Opinionated recommendations with reasoning, not exhaustive search.
---

# Exploring Network · CURATOR's wayfinding skill

Use when the operator asks questions like:
- "What should I use for X?"
- "Is there a construct that does Y?"
- "Where in the ecosystem does Z live?"
- "I'm new to this network — where do I start?"

Do NOT use for:
- Registry CRUD (that's `/constructs install` + `/constructs publish`)
- Pack authoring (that's `construct-base` template)
- Comprehensive catalog browse (that's `/constructs browse`)

## The four-lens rule

Every recommendation MUST filter through all four lenses before emission. A recommendation that fails one lens is not ready — either refine the query, or surface the tension ("lens A says X, lens B says Y, your call").

```
Operator query
  ↓
[Knowledge · hivemind]  — what does operator already know adjacent?
[Craft · artisan]       — would ALEXANDER accept this?
[Depth · k-hole]        — what's the non-obvious alternative?
[Structure · the-arcade] — does this fit the composition being built?
  ↓
Synthesis → recommendation + reasoning + (if warranted) alternatives
  ↓
Verdict (primary write) + Signal rows (related threads)
```

## Read-mode behaviors

| Read mode | Output shape | Invocation signal |
|---|---|---|
| glance | One line: "try `artisan`." | Operator in quick mode, time-boxed |
| orient | 3-5 lines: lens reasoning + construct + one alternative | Default |
| intervene | Full: per-lens rationale + multiple alternatives + why-not's | Operator explicitly asks "why?" or "explore more" |

Default to orient; upgrade on signal.

## Invocation surface

### CLI
```bash
/explore-network "I need to audit a component for feel"
```

### Composition (stage-executor contract)
```yaml
- stage: N
  construct: construct-network-tools
  skill: exploring-network
  mode: fresh                  # CURATOR's register resets per query
  reads: [Intent, Operator-Model]
  writes: [Verdict, Signal]
```

### @-mention
```
@CURATOR I'm trying to understand how the composition runner executes.
```

## Output stream shape

Primary write: `Verdict`. Secondary: `Signal` rows for related threads.

```json
{
  "stream_type": "Verdict",
  "schema_version": "1.0.0",
  "timestamp": "2026-04-23T...",
  "source": "CURATOR",
  "verdict": "For feel-audit, artisan's decomposing-feel skill is the primary. Observer's analyzing-gaps composes well for cross-surface checks.",
  "severity": "info",
  "evidence": [
    {"lens": "knowledge", "source": "hivemind/construct-ontology.md", "note": "already-known framing"},
    {"lens": "craft", "source": "artisan/taste.md", "note": "standard met"},
    {"lens": "depth", "source": "k-hole/trails/feel-audit-patterns", "note": "observer composition is canonical"},
    {"lens": "structure", "source": "feel-audit.yaml", "note": "existing composition fits"}
  ],
  "glance": "Try artisan → observer via feel-audit.yaml.",
  "session_id": "...",
  "run_id": "..."
}
```

## Anti-patterns

- **Exhaustive lists without ranking**. If you can't reduce to 1-3 primary recommendations + 1-2 alternatives, the query isn't specific enough — ask the operator to narrow.
- **Single-lens emission**. Always filter through all four before emitting.
- **Silent "I don't know"**. If no construct fits cleanly, SAY SO — name the gap as a construct-authoring opportunity.
- **Recommending constructs the operator already uses**. Check hivemind for prior installs / mentions before emitting a "try X" when X is already in their stack.

## Composes with

- `hivemind` — required for knowledge lens. Can degrade gracefully if hivemind is unavailable (flag "knowledge lens unavailable, recommendation may miss operator's prior work").
- `artisan` — taste standards live in `grimoires/artisan/taste.md`.
- `k-hole` — depth research in `grimoires/k-hole/`.
- `the-arcade` — composition + architecture references.

## References

- Doctrine: v6 §18.3 (focus-per-register — CURATOR uses synthesis register explicitly)
- Pack README: `README.md`
- Reference composition: `compositions/explore-ecosystem.yaml`
- Authoring cycle: loa-constructs cycle-006 L-meta-pack

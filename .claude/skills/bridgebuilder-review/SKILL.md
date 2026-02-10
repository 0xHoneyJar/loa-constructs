# Bridgebuilder Review

## Purpose

Multi-persona adversarial review of pack outputs. Applies Physics of Error vocabulary to detect Near Misses and Category Errors in generated artifacts.

## Runtime Dependency

The review engine implementation lives in the **midi-interface** repository (`0xHoneyJar/midi-interface`). This skill provides:

- **Persona definitions** (`resources/personas/*.md`) — review standards and detection rules
- **Correction Vector schema** (`.claude/schemas/correction-vector.schema.json`) — structured violation output
- **Feedback convention** (`grimoires/bridgebuilder/feedback/`) — violation record storage

The actual review orchestration (reading outputs, applying persona rules, generating correction vectors) requires the midi-interface runtime. Without it, personas can be used as manual review checklists.

## Personas

| Persona | Pack | Focus |
|---------|------|-------|
| `taste.md` | Artisan | Design system compliance, theme tokens, motion |
| `research.md` | Observer | Mom Test, hypothesis-first, confidence calibration |
| `strategy.md` | GTM-Collective | Factual grounding, assumption tracking, pricing |

## Usage

```
/bridgebuilder-review --persona taste src/components/Card.tsx
/bridgebuilder-review --persona research grimoires/observer/canvas/user-123.md
/bridgebuilder-review --persona strategy grimoires/gtm/strategy/positioning.md
```

## Output

Correction Vectors are written to `grimoires/bridgebuilder/feedback/{YYYY-MM-DD}-{pack}-{skill}.json` following the schema at `.claude/schemas/correction-vector.schema.json`.

## Physics of Error Vocabulary

| Principle | Meaning |
|-----------|---------|
| Brittle Dependency | Value that cannot adapt when upstream changes |
| Concept Impermanence | Premature crystallization that resists revision |
| Semantic Drift | Gradual loss of meaning through misuse or overloading |
| Coupling Inversion | Downstream artifact driving upstream decisions |
| Semantic Collapse | Reducing complex structure to a single scalar |
| Layer Violation | Bypassing the intended abstraction boundary |

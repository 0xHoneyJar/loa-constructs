---
name: The Speakers
slug: the-speakers
version: "1.0.0"
category: design
type: untyped
schema_version: 3
skills: 8
commands: 5
tags:
  - construct
  - category/design
---

# The Speakers

> Owns the sound. Psychoacoustic engineering, sonic identity architecture, and audio pipeline design — the full arc from CRT boot hum to orbital clarity. Named for the transducers that convert electrical signal into air pressure.

**Version**: 1.0.0 · **Category**: design · **Skills**: 8 · **Commands**: 5

## Install

```bash
loa install the-speakers
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/grounding-sonic` | Review sonic vocabulary, identify gaps |
| `/exploring-sound` | Generate audio prompts from genre DNA |
| `/capturing-audio` | Evaluate and score audio outputs |
| `/scoring-experience` | Map sonic parameters across experience timeline |
| `/making-beats` | Build REAPER sessions via file watcher bridge |
| `/suno-prompt` | Generate prompts for Suno audio generation |
| `/taste-map` | Map sonic taste preferences |
| `/gemini-ear` | Audio review via Gemini multimodal |

## Commands

| Command | What it does |
|---------|-------------|
| `ground-sonic` | Review sonic vocabulary |
| `explore-sound` | Generate audio prompts |
| `capture-audio` | Evaluate audio outputs |
| `score-experience` | Map sonic parameters to timeline |
| `make-beats` | Build REAPER sessions |

## Relationships

### Governed By

- [Artisan](/constructs/artisan) — inherits taste tokens (the-speakers claims `governed_by: artisan`, but artisan's governs list doesn't include it — [GOV-003](/network/health))

### Composes With

- [The Easel](/constructs/the-easel) — visual + sonic alignment
- [Artisan](/constructs/artisan) — taste tokens inform sonic decisions

### Composition Paths

**Writes to:**
- `grimoires/the-speakers/stems/` (sonic identity stems)
- `grimoires/the-speakers/context/` (sonic context and research)

## Operator Mode

The Speakers is a **FEEL mode** construct (persona: ALEXANDER). [See Operator Modes &rarr;](/network/operator)

## Verification Archetype

**Taste construct** — verification checks whether sonic output matches the taste specification. [Verification guide &rarr;](/verification/verification-guide#_2-taste-constructs-output-matches-the-spec)

## Source

- **Repo**: `0xHoneyJar/construct-the-speakers`
- **Cache**: `.cache/construct-repos/construct-the-speakers/`
- **Grimoire**: `grimoires/the-speakers/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)

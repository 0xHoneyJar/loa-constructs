---
name: WebReel
slug: webreel
version: "1.0.0"
category: design
type: untyped
schema_version: 3
skills: 4
commands: 4
tags:
  - construct
  - category/design
  - topology/island
---

# WebReel

> Broadcast-quality automated web page video recorder with cinematic scroll physics, WebGL capture, and optimized encoding.

**Version**: 1.0.0 · **Category**: design · **Skills**: 4 · **Commands**: 4

## Install

```bash
loa install webreel
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/reel` | Record a cinematic video of a web page |
| `/scroll-physics` | Configure cinematic scroll parameters |
| `/capture-config` | Set capture resolution and encoding |
| `/webgl-capture` | Capture WebGL canvas content |

## Commands

| Command | What it does |
|---------|-------------|
| `webreel record` | Start recording a page |
| `webreel config` | Configure recording parameters |
| `webreel export` | Export recorded video |
| `webreel preview` | Preview recording setup |

## Relationships

### Island

WebReel has no declared relationships. It could compose with [Showcase](/constructs/showcase) (capture showcase output). See [Topology &rarr; Islands](/architecture/topology#islands).

### Composition Paths

**Writes to:**
- `grimoires/webreel/` (recorded videos, configs)

## Operator Mode

WebReel is a **FEEL mode** construct (persona: ALEXANDER). [See Operator Modes &rarr;](/network/operator)

## Source

- **Repo**: `0xHoneyJar/construct-webreel`
- **Cache**: `.cache/construct-repos/construct-webreel/`
- **Grimoire**: `grimoires/webreel/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)

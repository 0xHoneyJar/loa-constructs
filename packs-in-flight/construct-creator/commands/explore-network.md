# /explore-network — CURATOR's wayfinding command

Invoke CURATOR to find the right construct for a task. Opinionated
recommendations with reasoning, not exhaustive search.

## Usage

```
/explore-network <query>
```

Examples:

```
/explore-network "audit a component for feel"
/explore-network "pull prior art on modpack launcher UX"
/explore-network "I'm new to this ecosystem — where do I start?"
```

## Behavior

CURATOR filters every recommendation through four lenses:
- **Knowledge** (hivemind) — adjacent prior work
- **Craft** (artisan) — taste standards met?
- **Depth** (k-hole) — non-obvious alternative?
- **Structure** (the-arcade) — composition fit?

Default output is *orient* mode (3-5 lines with reasoning).

- `/explore-network <query> --glance` — one-line answer
- `/explore-network <query> --intervene` — full per-lens breakdown

## When to reach for this

- You're authoring a new thing and want to know what's already in the ecosystem
- An operator asks "what should I use for X?" — delegate to CURATOR
- You need the non-obvious read on a design decision (k-hole lens active by default)

## When NOT to use this

- Registry operations (install, publish, browse) — those are `/constructs`
- Catalog browse — that's the explorer UI at constructs.network
- Schema validation / manifest linting — that's `construct-validate.sh`

## Composes with

- `/hivemind <query>` — direct knowledge lens without CURATOR's synthesis
- `/feel` (→ artisan) — craft lens standalone
- `/dig` (→ k-hole) — depth lens standalone

Use `/explore-network` when you want the **four-lens synthesis**; use the individual skills when you want unblended lens output.

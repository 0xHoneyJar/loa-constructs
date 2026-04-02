# Repo Manifest Proposal

> what's the minimum artifact that makes a non-construct repo agent-navigable?
>
> this is the scaffolding spec. not construct.yaml. not BUTTERFREEZONE. something lighter that makes the 89% visible.

## The Problem

268 repos in the org. 29 have `construct.yaml`. agents can navigate the 29. the other 239 are dark — an agent dropped into `mibera-honeyroad` or `thj-sonar` has to read every file to understand what it is, what it does, and where things live. that's wasteful when a 20-line file could tell it.

## What Already Exists

| Artifact | What It Gives Agents | Weight | Who Has It |
|----------|---------------------|--------|------------|
| `construct.yaml` | full identity, skills, composition, governance | heavy (~100 lines) | 29 repos |
| `BUTTERFREEZONE.md` | rich agent context, architecture, line refs | medium (~200 lines) | 3 external repos (Toby) |
| `CLAUDE.md` | project instructions, rules, paths | medium (varies) | any loa-mounted repo |
| `package.json` | name, deps, scripts | light but unstructured | most JS/TS repos |
| nothing | nothing | — | ~200 repos |

the gap: there's no lightweight, machine-readable artifact between "nothing" and "full construct registration" that says "here's what this repo is and how to navigate it."

## The Proposal: `.repo-manifest.yaml`

a single file. 15-30 lines. machine-readable. human-scannable. answers five questions an agent needs:

```yaml
# .repo-manifest.yaml — minimum viable agent navigation context
# NOT a construct registration. NOT published to the network.
# just enough for an agent to know what this repo is and where things live.

identity:
  name: mibera-honeyroad
  purpose: "Silk Road parody NFT marketplace on Berachain"
  domain: product/marketplace  # product | infra | contracts | ops | bot | indexer
  stack: [next.js, trigger.dev, supabase, wagmi]
  maintainers: [zerker, soju, gumi]

paths:
  app: src/             # where the application code lives
  state: supabase/      # where persistent state lives (db, migrations)
  config: .env.example  # where config/secrets are documented
  docs: docs/           # where documentation lives (if any)

capabilities:
  # what can an agent DO in this repo?
  - build: "bun install && bun run build"
  - dev: "bun run dev"
  - test: "bun run test"
  - deploy: "vercel deploy"

agents:
  # what agent infrastructure already runs here?
  - name: HoneyGPT
    runtime: trigger.dev
    model: gpt-4o
    purpose: "AI vendor conversations with tool-calling"
    entrypoint: src/trigger/honey-gpt.ts

composition:
  # what other repos does this one depend on or feed into?
  depends_on: [mibera-contracts, crayons-contracts]
  feeds_into: [thj-envio]  # indexer consumes on-chain events
  constructs_used: []  # which constructs are installed/active
```

## Design Principles

1. **15 lines minimum, 30 lines typical** — if it's longer, you're building a construct.yaml. stop.

2. **machine-readable first** — YAML so scripts can parse it. the L1 construct index (loa#452) ingests these alongside construct.yaml files.

3. **no registration required** — this file lives in the repo. it's never published to the network. it's private navigation context.

4. **identity is one sentence** — `purpose` is a single sentence that tells an agent what this repo does. not a sales pitch. not a tagline. just the truth.

5. **paths are the map** — an agent dropped into an unfamiliar repo needs to know: where's the code? where's the state? where's the config? four paths cover 90% of navigation needs.

6. **capabilities are commands** — not skills in the construct sense. just "what shell commands work here." an agent that can run `bun run test` is already more useful than one that can't.

7. **composition is edges** — what does this repo depend on? what depends on it? this is the graph that makes cross-repo navigation possible.

## How It Feeds Into L1

the construct index from loa#452 would ingest two types of source:

```
construct.yaml  →  full construct entry (persona, skills, composition, gates)
.repo-manifest.yaml  →  lightweight repo entry (identity, paths, capabilities)
```

same index. two tiers. agents query one interface and get back navigable context regardless of whether the repo is a full construct or just a manifest.

## Rollout

1. **start with self** — this repo (loa-constructs) gets a manifest. it already has construct infrastructure, but the manifest format is the test case.

2. **high-traffic product repos** — mibera-honeyroad, set-and-forgetti, mibera-dimensions, mcv-interface. four repos, four manifests. immediate navigation benefit.

3. **loa ecosystem** — loa-freeside, loa-hounfour, loa-finn. the infrastructure layer that agents touch constantly but can't navigate without reading everything.

4. **infra repos** — thj-sonar, honey-guard, w3ga. the repos the operator visits when debugging cross-system issues.

5. **let the rest emerge** — don't manifest 268 repos. manifest the ones people walk toward. the rest can wait.

## What This Is Not

- **not a construct** — manifests don't have personas, skills, or governance. they're navigation context.
- **not published** — manifests never go to the constructs network. they're private to the org.
- **not required** — repos work fine without them. the manifest just makes agent navigation faster.
- **not a CLAUDE.md replacement** — CLAUDE.md is runtime instructions (how to behave). the manifest is identity (what this thing is). they complement each other.

## Relationship to Existing Artifacts

```
.repo-manifest.yaml  →  "what is this repo and how do I navigate it?"
CLAUDE.md            →  "how should I behave when working in this repo?"
construct.yaml       →  "what expertise does this construct package?"
BUTTERFREEZONE.md    →  "give me the full agent context in one document"
```

a repo with just a manifest is navigable.
a repo with a manifest + CLAUDE.md is operable.
a repo with construct.yaml is a construct.
a repo with all four is a fully-equipped stall in the bazaar.

the progression is natural: manifest → CLAUDE.md → construct.yaml. repos graduate when the expertise warrants it. most never need to.

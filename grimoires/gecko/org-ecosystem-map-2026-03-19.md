# Org Ecosystem Map — 2026-03-19

> gecko walked the whole org. 268 repos. here's the map.
>
> this is not a construct registry. this is a foot traffic map — what exists, who tends it, what it does, whether an agent can navigate it today.

## Census

- **Total repos**: 268 (69 public, 199 private)
- **Active (30d)**: 66
- **Construct-namespaced**: 29 (11%)
- **Agent-navigable today**: ~29 (construct repos only)
- **Agent-blind**: ~239 (89%)

---

## Layer 1: Construct Repos (29)

these are the named stalls. they have `construct.yaml`, identity files, skills. agents can mount them.

### Registered & Active (updated last 30d)

| Construct | Category | Governed By | Active Signal |
|-----------|----------|-------------|---------------|
| k-hole | straylight | — (silent hub) | Mar 20, daily commits |
| kansei | skill-pack | TBD (new) | Mar 19, just appeared |
| project-purupuru | skill-pack | — | Mar 20, active build |
| artisan | skill-pack | — (governance root) | stable |
| beehive/observer | skill-pack | — | stable, deployed in midi |
| the-arcade | skill-pack | artisan | stable |
| gecko | skill-pack | — | stable |
| vocabulary-bank | skill-pack | — (governance root) | stable |

### Registered & Stable (not recently touched but healthy)

| Construct | Category | Governed By | Status |
|-----------|----------|-------------|--------|
| herald | skill-pack | vocabulary-bank | stable |
| social-oracle | skill-pack | vocabulary-bank | stable |
| gtm-collective | skill-pack | vocabulary-bank | stable |
| growthpages | skill-pack | vocabulary-bank | stable |
| the-easel | skill-pack | artisan | stable |
| showcase | skill-pack | artisan | stable |
| the-mint | skill-pack | artisan | stable |
| the-speakers | skill-pack | artisan | stable |
| vfx-playbook | skill-pack | UNGOVERNED | stable |
| protocol | skill-pack | — | stable |
| hardening | skill-pack | — | stable |
| crucible | skill-pack | observer (circular) | stable |
| beacon | skill-pack | — | stable |
| dynamic-auth | skill-pack | — | stable |
| mibera-codex | codex | — (island) | stable |
| webgl-particles | tool-pack | — (island) | stable |
| webreel | tool-pack | — (island) | stable |
| noether | skill-pack | — | stable |
| ruggy | skill-pack | — | stable |
| construct-base | template | — | stable |
| hivemind-os | skill-pack | — | stable (ecosystem docs) |

### Not Registered

| Repo | What It Is | Why It's Here |
|------|-----------|---------------|
| hypha | external construct | registered in network, not namespaced as construct-* |

---

## Layer 2: Loa Ecosystem (8 repos)

the infrastructure that everything sits on. these are not constructs — they're the bazaar floor.

| Repo | What It Does | Stack | Last Active | Agent-Navigable |
|------|-------------|-------|-------------|-----------------|
| **loa** | dev framework, skills, bridgebuilder | TS/bash | active | yes (it IS the agent) |
| **loa-constructs** | marketplace, distribution plane | Hono + Next.js | Mar 19 | yes (this repo) |
| **loa-freeside** | multi-tenant SaaS, billing, Discord/TG | ? | Mar 19 | needs manifest |
| **loa-hounfour** | schema protocol (87+ TypeBox schemas) | TS | Mar 19 | needs manifest |
| **loa-finn** | session routing, model routing, tool sandbox | ? | ? | needs manifest |
| **loa-dixie** | Oracle dNFT product | ? | ? | needs manifest |
| **loa-beauvoir** | self-improving AI deployment | ? | ? | needs manifest |
| **loa-gauntlet** | agent behavior sandbox | ? | stale | dormant |

---

## Layer 3: Product / App Repos (~20 active)

these are the buildings around the bazaar. people walk through them daily. agents could too, but can't navigate them yet.

### High Traffic (recently active, user-facing)

| Repo | Product | Stack | Last Active | Construct Potential |
|------|---------|-------|-------------|-------------------|
| **mibera-dimensions** | Mibera product | Next.js | Mar 19 | HIGH — deep domain, active |
| **miberastrology-new** | Mibera astrology app | Next.js | recent | MEDIUM — niche domain |
| **set-and-forgetti** | PoL farming tool | Next.js + Convex | active | HIGH — gold standard feedback pipeline |
| **honey-interface** | Honey Jar protocol UI | Next.js | ? | MEDIUM |
| **mcv-interface** | MCV product | Next.js + Convex | ? | MEDIUM — user preferred Convex pattern |
| **cubquests-interface** | Berachain faucet/quests | Next.js | ? | LOW — utility |
| **community-interface** | Community app | Next.js | ? | LOW |
| **mibera-honeyroad** | Honey Road marketplace | Next.js + Trigger.dev | active | VERY HIGH — HoneyGPT proved construct pattern |
| **rektdrop-interface** | Rektdrop UI | Next.js | ? | LOW — Easel-dominant |
| **score-api** | Score product API | ? | Mar 19 | MEDIUM |
| **score-puru** | Score × Purupuru | ? | Mar 19 | MEDIUM |
| **purupuru** | Card venture contracts | Solidity | Mar 20 | HIGH — active collab |
| **geo** | Web3 GEO (AI search opt) | ? | Mar 17 | HIGH — unique domain |
| **thj-surface** | Institutional B2B endpoint | ? | ? | LOW — niche |

### The HoneyGPT Pattern (already proved)

`mibera-honeyroad` ran construct economics in production before constructs existed:
- Claude 3.5 Sonnet → vendor personalities ($0.10/vendor)
- GPT-4o + tool calling → conversations (inventory, orders, reputation)
- Trigger.dev 5-min cron → the runtime
- 55% of minters = new-to-Bera users
- Full agent infra cost < $200/month
- see `memory/project_construct_economics_model.md`

---

## Layer 4: Infrastructure / Indexing (~30 repos)

the plumbing. invisible but load-bearing.

### Indexer Cluster (largest ungoverned domain — 16+ repos)

| Repo | Type | Status | Notes |
|------|------|--------|-------|
| **thj-sonar** | blockchain indexer | Mar 20, ACTIVE | candidate for construct-sonar |
| **thj-envio** | envio config | Mar 19, ACTIVE | |
| 9× `*-squid` repos | subsquid indexers | mostly stale | pre-Envio migration era |
| 7× `*-ponder` repos | ponder indexers | mostly stale | |

**observation**: this is 16 repos with deep indexing expertise and zero construct governance. the envio migration from subsquid proved this domain has real expertise. sonar is active. the rest is dormant mycelium.

### Ops / Monitoring

| Repo | What | Status |
|------|------|--------|
| **honey-guard** (+ interface, algo) | validator incentive optimizer | ACTIVE — under investigation |
| **fatbera-withdrawal-monitor** | validator monitoring | active |
| **validator-auto-reward-railway** | auto-reward on Railway | active |
| **validator-ops** | validator operations | ? |
| **thj-trigger** | Trigger.dev tasks | ? |
| **portAPI** | context router / policy gate | ? |
| **w3ga** | Web3 analytics SDK | Mar 19 — DNA extracted, staged as candidate |

### Bot / Automation (6+ repos)

| Repo | What | Status |
|------|------|--------|
| **poku** | THJ Ops Superbot | stale but reusable |
| **ruggy-bot** / **ruggy-moltbot** | ruggy bots | ? |
| **legba-moltbot** | legba bot | ? |
| 6× discord bots | various communities | mostly stale |

---

## Layer 5: Smart Contracts (~15 repos)

on-chain code. different development cadence (ships strategically, not fast).

| Repo | Domain | Status |
|------|--------|--------|
| **honeyjar-contracts** (v1, v2) | Honey Jar protocol | stable |
| **mibera-contracts** | Mibera NFTs | stable |
| **crayons-contracts** | Factory pattern (Purupuru source) | active |
| **purupuru** | Card venture | active |
| **interpol-contracts** / **sf-contracts-v2** | Security Force | stable |
| **fatbera-contracts** | fatBERA validator | stable |
| **mcv-contracts** | MCV | stable |
| **henlo-contracts** (v1, v2) | Henlo protocol | stable |
| **faucet-contracts** | faucet | stable |
| **bera8-contracts** / **badges-contracts** | misc | stable |

---

## Layer 6: External Ecosystem

repos outside 0xHoneyJar that speak the construct language.

| Owner | Repos | Domain | Construct-Shaped | Registered |
|-------|-------|--------|-----------------|------------|
| **0xElCapitan** (Toby) | tremor, corona, breath | OSINT prediction markets | YES (construct.json, BFZ, RLMF) | NO |
| **hypha** | ? | external construct | YES | YES (in registry) |

**toby's pattern**: 3 repos in 48 hours, zero npm deps, identical architecture (oracle→processor→theatre→RLMF), compose with each other. built from BFZ spec without coordination. see `memory/project_echelon_repos_2026_03_19.md`.

---

## What Gecko Sees

### Patterns

1. **the 89% gap**: 239 repos are invisible to agents. most of them contain real expertise that could be navigable with minimal scaffolding.

2. **three clusters need governance**: indexers (16 repos, zero governance), contracts (15 repos, zero governance), bots (6 repos, zero governance). the security cluster (protocol, hardening, beacon, dynamic-auth) also has zero governance despite being a natural cluster.

3. **the honeyroad precedent**: mibera-honeyroad proved that agent infrastructure in a product repo creates real value at minimal cost. every active product repo could benefit from the same pattern — not full construct registration, but enough context for an agent to navigate and operate.

4. **external growth**: toby built construct-shaped repos without asking permission. kansei appeared yesterday. the bazaar is growing at the edges, not the center.

5. **dormancy is normal**: 202 stale repos is not a problem. it's a bazaar — stalls open and close. the ones that matter will fruit again when conditions change. don't clean up; observe.

### Recommendations

1. **define the repo manifest** — what's the minimum artifact that makes a non-construct repo agent-navigable? not a full construct.yaml, but enough for L1 indexing. see companion doc: `grimoires/gecko/repo-manifest-proposal.md`

2. **start with the high-traffic layer** — mibera-honeyroad, set-and-forgetti, mibera-dimensions, mcv-interface. these are the product repos with the most daily foot traffic. making them navigable has the highest immediate ROI.

3. **index, don't register** — the 89% shouldn't become constructs. they should be indexable. a private registry tier that maps repos to domain, skills, and paths without requiring construct.yaml or publication to the network.

4. **let governance emerge** — don't impose governance on the indexer/contract/bot clusters. watch who walks toward them. when someone starts tending the stall, that's when governance makes sense.

5. **the construct-hardening rename** — the user flagged this. "resilience" or "sentinel" would land better. hardening sounds like a one-time process. the construct is meant to be ongoing resistance.

---

## How to Use This Map

**for agents**: this map is a foot traffic guide. when the operator says "check the indexers" or "what's happening with the product repos," start here before scanning repos individually.

**for the L1 construct index**: this map is the pre-index. it tells you which repos exist and what they do. the construct index (loa#452) would make this machine-readable and auto-refreshable.

**for gecko patrol**: this is the baseline. compare future observations against it. when a repo moves from stale to active, or when a new stall appears (like kansei), the delta against this map is the signal.

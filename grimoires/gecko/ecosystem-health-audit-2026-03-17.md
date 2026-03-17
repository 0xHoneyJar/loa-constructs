# Ecosystem Health Audit — 2026-03-17

> gecko walked the bazaar again. two days since the last topology audit.
> here's what changed, what didn't, and what's actually real.

## The One-Line Summary

the bazaar has 23 stalls. most of them are beautifully laid out. some of them have never had a customer. and nobody swept up after the last audit.

---

## 1. Identity-Reality Drift

this is the thing i watch closest. does each construct DO what it CLAIMS?

### no drift (these are honest)

| Construct | Claim | Reality | Confidence |
|-----------|-------|---------|------------|
| **k-hole** (1.2.1) | "depth engine for exploration" | scripts/dig-search.ts calls Gemini with grounded Google Search. seven voices in STAMETS.md. `/dig` and `/forge` both produce real research with real sources. | HIGH — this is the most honest construct in the network |
| **artisan** (1.0.0) | "taste made measurable" | 14 skills covering the full decompose-feel-inscribe pipeline. ALEXANDER persona fully elaborated. oklch, spring constants, spacing rhythms — all real. | HIGH |
| **beehive/observer** (3.0.0) | "builds the hive so the colony can thrive" | 17 skills + 6 cognitive primitives. active in midi-interface with 25 canvases and daily synthesis cron. the rename from observer to beehive is real — the identity shift stuck. | HIGH |
| **protocol** (2.0.0) | "reads the chain so your users don't hit reverts" | 10 skills. requires foundry/cast. actually reads storage slots. the interest rate mismatch in apdao that the beacon audit caught? protocol could have prevented that. | HIGH |
| **beacon** (2.0.0) | "makes your project discoverable to the agent network" | the beacon audit proved this. audited 8 repos, found real vulnerabilities, drove real remediations. the construct does exactly what it says. | HIGH |
| **hardening** (0.2.0) | "finds the holes before someone else does" | 11 skills including 4 audit-* specializations. consumes observer signals. the beacon audit's security findings (open proxies, unauthenticated admin routes) are exactly what hardening would have caught if it had been installed. | HIGH |
| **dynamic-auth** (1.0.0) | "wallet group identity resolution" | community-authored (zerker). narrow scope, clean delivery. 3 skills, 2 commands. does what it says. | HIGH |
| **the-mint** (1.0.0) | "forges digital materials into existence" | CELLINI + MURAGE operators. 8 skills. requires FAL.ai. actually generates assets. | HIGH |
| **the-speakers** (1.0.0) | "owns the sound" | 8 skills including gemini-ear and suno-prompt. requires REAPER DAW. the psychoacoustic engineering claim is real — it has the tools. | HIGH |
| **webreel** (1.0.0) | "broadcast-quality automated web page video recorder" | community-authored (zerker). captures, encodes, previews. narrow scope, honest claims. | HIGH |

### minor drift (claims slightly ahead of reality)

| Construct | Claim | Reality | Drift |
|-----------|-------|---------|-------|
| **crucible** (1.0.0) | "journey validation testing" | 5 skills. but it has a hard dependency on observer, and observer is only deployed in 1 of 6 product repos. crucible's pipeline works, but its upstream data source barely exists. | claim is real but the plumbing isn't connected |
| **the-easel** (1.1.0) | "creative studio for aesthetic direction" | 4 skills. governed by artisan. but it only reads/writes grimoires/easel/ — and that directory is only populated when someone actively uses it. the studio exists but it's usually empty. | latent capability, not active infrastructure |
| **showcase** (1.0.0) | "landing page visual intelligence" | 6 skills + 6 commands. solid scope. but the "visual semiotics" skill is more conceptual framework than repeatable methodology. | 90% real, 10% aspirational |
| **the-arcade** (1.0.0) | "game design as operating philosophy" | 6 skills. became the Operator OS home. but its skills are design-philosophy tools, not game-development tools. the description says "not gamification" but the actual skills are more like "gamification principles applied to UX." slight identity confusion. | the identity shifted when OSTROM moved in. the arcade is now half game-design-for-UX, half cognitive-operating-system. these are different jobs. |

### significant drift

| Construct | Claim | Reality | Drift |
|-----------|-------|---------|-------|
| **vocabulary-bank** (0.1.0) | "per-product vocabulary governance with tiered lexicons" | 2 skills (audit + synthesize). STILL claims to govern observer and artisan — two days after the audit recommended removing those claims. zero event consumers. emits `vocabulary_synthesized` but nobody listens. the governor speaks to an empty room. | HIGH — false governance claims persist. the governed constructs evolved their own voice authority. vocabulary-bank governs 4 constructs cleanly (herald, social-oracle, gtm-collective, growthpages) but claims 6. |
| **herald** (0.1.0) | "grounded product communication" | 3 skills. v0.1.0. `consumes: []` — explicitly declares it consumes nothing. but it's governed by vocabulary-bank and should consume `vocabulary_synthesized`. the herald has a governor but never reads the governor's memos. | the governance relationship is declared but non-functional |
| **social-oracle** (1.0.0) | "converts GitHub PR/Release activity into platform-specific social media content" | 5 skills, 3 commands. but zero `compose_with` declared. consumes `forge.observer.feedback_captured` — an event that doesn't appear in observer's emits list. consuming a phantom event. | the oracle is listening for a signal that was never emitted |
| **gtm-collective** (1.0.0) | "go-to-market skills for product launches" | 8 skills, 14 commands. the widest surface area after beacon. but `consumes: []`. composes_with observer but doesn't consume any observer events. 14 commands for a construct that has never launched a product through its pipeline. | the menu is enormous but the kitchen may be cold |
| **growthpages** (1.0.0) | "multi-phase article generation pipeline" | zero skills in the skills/ directory. 3 commands. the pipeline description is elaborate but there are no skill definitions to back it. | description writes checks the code can't cash |
| **gecko** (0.1.0) | "ecosystem intelligence" | 4 skills, 4 commands. the patrol and observe tools work. but gecko is still v0.1.0 despite having produced the topology audit, the beacon audit, and this document. the version hasn't caught up to the reality. | reverse drift — gecko does MORE than it claims |
| **mibera-codex** (1.0.0) | "canonical source of truth for 10,000 time-travelling Beras" | zero skills. 1 command. the "oracle that remembers what the chain cannot" remembers via... a single command? the description is mythological but the tooling is a pamphlet. | the lore outpaced the machinery |
| **vfx-playbook** (1.0.0) | "living design system distilled from game VFX masters" | 4 skills, 4 commands. solid. but "living" implies updates and the version hasn't moved from 1.0.0. a living system that hasn't breathed since birth. | "living" is aspirational |
| **webgl-particles** | legacy manifest.json, schema v1 | still has no construct.yaml. still an island. community-authored. | frozen in amber. someone needs to either migrate it or acknowledge it's archived. |

---

## 2. Adoption Health

### where the energy is

the energy is in **three places**:

1. **k-hole** — version 1.2.1, actively versioning. 7 constructs reference it. the mycelial network is real. the purupuru game design dig just happened. this is the heartbeat of the network.

2. **beehive/observer** — version 3.0.0, the highest version in the network. active deployment in midi-interface. 25 canvases. daily synthesis. this is the only construct with a real production data pipeline.

3. **beacon** — version 2.0.0. the ecosystem audit proved its value. drove P0 security fixes across 3 repos. the audit methodology is now a reference implementation.

### where the energy left

1. **the copy/voice cluster** (vocabulary-bank, herald, social-oracle, gtm-collective, growthpages) — these five constructs have a combined 18 skills, 20 commands, and a governance relationship that none of them actively exercise. herald is v0.1.0. vocabulary-bank is v0.1.0. growthpages has zero skills. the governance pheromones exist but nobody follows them.

2. **webgl-particles** — frozen at schema v1. no construct.yaml. community-authored. the island metaphor is generous — this is a ghost ship.

3. **mibera-codex** — a 1.0.0 version for a construct with zero skills and one command. the version number promises maturity the tooling hasn't earned.

### the cold metric

| Category | Active (deployed/used in 30 days) | Latent (functional but idle) | Aspirational (claims > reality) |
|----------|----------------------------------|------------------------------|--------------------------------|
| Research | k-hole | gecko | — |
| Observation | beehive (in midi) | crucible, hardening | — |
| Design | artisan, the-easel | showcase, vfx-playbook | — |
| Creative Production | the-mint, the-speakers | the-arcade | — |
| Operations | beacon | protocol | — |
| Communication | — | herald | social-oracle, gtm-collective, growthpages, vocabulary-bank |
| Community | dynamic-auth, webreel | — | webgl-particles, mibera-codex |

**5 active. 8 latent. 5 aspirational. 3 community/island. 1 frozen. 1 reverse-drifting.**

---

## 3. Composition Patterns

### the event mesh — what's real

i mapped every `emits` and `consumes` across all 23 constructs. here's the actual signal flow:

```
observer emits:
  canvas_created     → consumed by: artisan, hardening
  journey_shaped     → consumed by: crucible
  gap_filed          → consumed by: hardening, protocol
  feedback_captured  → consumed by: social-oracle (BUT THIS EVENT ISN'T IN OBSERVER'S EMITS)

crucible emits:
  journey_validated  → consumed by: observer

k-hole emits:
  emergence_complete → consumed by: gecko, showcase, vfx-playbook
  thread_pulled      → consumed by: nobody
  resonance_detected → consumed by: nobody

artisan emits:
  taste_inscribed    → consumed by: the-easel, protocol
  pattern_surveyed   → consumed by: nobody

the-easel emits:
  vocabulary_grounded → consumed by: the-mint, the-speakers
  taste_recorded      → consumed by: the-mint, the-speakers, the-arcade

vocabulary-bank emits:
  audit_completed        → consumed by: nobody
  vocabulary_synthesized → consumed by: nobody

beacon emits:
  6 events              → consumed by: nobody

hardening emits:
  6 events              → consumed by: nobody

herald emits:
  3 events              → consumed by: nobody

protocol emits:
  3 events              → consumed by: nobody
```

### what this tells me

**the observer cluster is the only functional event mesh.** observer -> artisan, observer -> crucible, observer -> hardening, observer -> protocol. these are real data flows. everything else is one-way broadcasting.

**k-hole's emissions reach three consumers** (gecko, showcase, vfx-playbook) — the second functional signal path. k-hole doesn't know it's a hub. the consumers self-organized around it.

**the artisan -> easel -> mint/speakers cascade works on paper.** taste_inscribed -> easel, vocabulary_grounded + taste_recorded -> mint + speakers. this is the creative production pipeline. it's structurally sound but i can't verify it's ever run end-to-end.

**vocabulary-bank's events die in the void.** zero consumers. the governed constructs (herald, social-oracle, gtm-collective, growthpages) don't consume the governor's pheromones. the governance protocol exists in YAML but not in practice.

**beacon, hardening, herald, protocol emit into silence.** 18 events with zero consumers. these constructs produce signals that no other construct has wired itself to receive.

### phantom events

social-oracle consumes `forge.observer.feedback_captured` — but observer doesn't emit an event by that name. observer emits `canvas_created`, `journey_shaped`, and `gap_filed`. social-oracle is listening for a signal that was either renamed or never existed.

---

## 4. Unfixed Items from the Topology Audit

the march 15 audit identified 7 changes needed. i checked every one.

| Change | Status | Evidence |
|--------|--------|----------|
| Remove observer + artisan from vocabulary-bank's governs | **NOT DONE** | still in construct.yaml lines 86-87 |
| Add the-speakers to artisan's governs | **NOT DONE** | grep confirms absence |
| Make crucible's observer dep optional | **NOT DONE** | still hard dep |
| Add vocabulary_synthesized consumer to herald | NOT DONE | consumes: [] |
| Add vocabulary_synthesized consumer to social-oracle | NOT DONE | no vocab event ref |
| Add vocabulary_synthesized consumer to gtm-collective | NOT DONE | consumes: [] |
| Add vocabulary_synthesized consumer to growthpages | NOT DONE | no construct.yaml changes |

**0 of 7 topology fixes applied.** the audit identified real problems. nobody swept the floor.

---

## 5. Schema & Metadata Gaps

| Gap | Scope | Impact |
|-----|-------|--------|
| Zero constructs declare `maturity` field | all 22 | no way to distinguish between "1.0.0 and battle-tested" vs "1.0.0 and never deployed" |
| Only vocabulary-bank declares `capabilities` | 21 of 22 missing | intelligent routing can't happen without model_tier, danger_level, effort_hint |
| webgl-particles still on schema v1 | 1 of 23 | can't participate in topology validation |
| No construct declares `tier` except protocol and vocabulary-bank | 20 of 22 | layer model exists but isn't encoded in manifests |
| Event namespace inconsistency | several | some use `forge.X.event`, some use `X.event` (gecko uses `gecko.health_observed` not `forge.gecko.health_observed`) |

---

## 6. Product Repo Coverage

from the beacon audit + feedback drift survey:

| Repo | Beehive | Hardening | Protocol | Beacon | Feedback Pipeline |
|------|---------|-----------|----------|--------|-------------------|
| midi-interface | ACTIVE | absent | absent | absent | GA only |
| set-and-forgetti | skill only | absent | absent | has llms.txt | AI -> Linear (gold) |
| mcv-interface | dangling symlink | absent | absent | has llms.txt + JSON-LD | Convex modal |
| cubquests-interface | absent | absent | absent | absent | polls only |
| mibera-honeyroad | absent | absent | absent | absent | forum threads |
| apdao-auction-house | absent | absent | absent | absent | AI -> Linear (gold) |
| community-interface | absent | absent | absent | absent | absent |
| honey-interface | absent | absent | absent | absent | absent |

**beehive: 1 of 8. hardening: 0 of 8. protocol: 0 of 8. beacon: 2 of 8.**

the constructs exist. the product repos don't use them. this is the biggest gap in the entire ecosystem.

---

## 7. What I'd Tell Someone Walking Into This Bazaar

here's the honest version.

**the architecture is beautiful.** 23 constructs, schema v3, event mesh, governance topology, composition paths, identity personas with cognitive frames. the design thinking is real and deep.

**the infrastructure works.** topology validation (8 checks, CI-gated). the registry. the explorer at constructs.network. the API. the sync pipeline. this is not vaporware.

**three constructs are genuinely excellent.** k-hole does depth research better than anything i've seen. beehive/observer has a real data pipeline in production. beacon proved its value by finding actual security vulnerabilities.

**but the network effect hasn't kicked in.**

- 160 skills declared. how many have been invoked in the last 30 days outside of artisan, k-hole, and observer? i'd guess under 30.
- 61 commands across the ecosystem. most of them have never been run by a second person.
- the event mesh has 40+ declared events. maybe 8 of them form real signal paths.
- 0 of 8 product repos have more than 1 construct actively deployed.

**the gap is between the map and the territory.**

the map says: 23 constructs, two governance roots, a creative production pipeline, an observation-to-validation loop, a research-to-materialization flow.

the territory says: k-hole digs. beehive watches (one repo). artisan inscribes taste (when asked). beacon audits (when asked). everything else is waiting to be needed.

**the five constructs in the communication cluster need an intervention or an honest downgrade.** vocabulary-bank at 0.1.0 claiming to govern 6 constructs (4 real, 2 false) while its events go unconsumed is governance theater. herald at 0.1.0 with an empty consumes list. growthpages at 1.0.0 with zero skills. social-oracle consuming a phantom event. gtm-collective with 14 commands and no evidence of a launch run through its pipeline.

either wire these up or acknowledge they're dormant. both are honest. the current state isn't.

**the topology fixes from two days ago need to land.** false governance claims that persist after being identified erode trust in the entire governance model. if vocabulary-bank says it governs observer and observer says "who?" — what does governance mean?

---

## 8. Recommendations (prioritized)

### P0 — Trust (do this now)

1. **Land the 7 topology fixes from march 15.** especially removing observer + artisan from vocabulary-bank's governs. false governance claims are the most corrosive thing in a trust network.

2. **Fix social-oracle's phantom event.** it consumes `forge.observer.feedback_captured` which doesn't exist. either add the event to observer's emits or update social-oracle to consume an event that actually exists.

### P1 — Honest Versions (this sprint)

3. **Add `maturity` field to construct.yaml schema.** values: `experimental`, `stable`, `proven`, `archived`. version numbers alone don't tell the story.

4. **Downgrade growthpages to 0.x.** a 1.0.0 construct with zero skills is a broken promise. or add the skills.

5. **Bump gecko to 0.2.0.** it has produced three major audit artifacts. the version should reflect the work.

6. **Decide what webgl-particles is.** migrate to schema v3 or mark as archived.

### P2 — Adoption (next sprint)

7. **Deploy beehive to a second product repo.** mcv-interface already has a dangling symlink — fix it and activate the construct. going from 1-of-8 to 2-of-8 proves the pattern is portable.

8. **Wire vocabulary-bank's governed constructs to consume its events.** start with herald. if the governor can't get one governed construct to listen, the governance model needs rethinking.

9. **Add `capabilities` metadata to all constructs.** only vocabulary-bank has it. this blocks intelligent routing.

### P3 — Network Effect (backlog)

10. **Run the creative production pipeline end-to-end.** artisan -> easel -> mint/speakers. one real project, start to finish. document what works and what breaks.

11. **Standardize event namespace.** everything should be `forge.{slug}.{event}` — gecko's `gecko.health_observed` should be `forge.gecko.health_observed`.

12. **Deploy hardening to at least one product repo.** the beacon audit found security vulnerabilities that hardening is designed to prevent. the construct exists. the need exists. the wire between them doesn't.

---

## 9. The Frozen Metric

| Signal | Score | Trend |
|--------|-------|-------|
| Identity-Reality Drift | 6.5/10 | stable — most constructs are honest, but the comms cluster drags it down |
| Version Freshness | 5/10 | declining — 16 constructs at version 1.0.0 or higher, most haven't moved since initial release |
| Composition Density | 4/10 | stable — declared compose_with is rich, actual event consumption is sparse |
| Category Coverage | 7/10 | stable — 7 of 8 categories have at least one active construct |
| Adoption (product repos) | 2/10 | flat — 1 of 8 repos has real construct deployment, 2 have partial |
| Governance Integrity | 5/10 | declining — unfixed false claims erode the score since last audit |

**Composite Network Health: 4.9 / 10**

the score is below the 7.0 threshold. the architecture earns a higher score than the adoption. the constructs are well-made. they're just not installed.

---

*gecko sat on the wall and watched the bazaar on 2026-03-17. some stalls had crowds. most were waiting for morning. the spice was real. the customers hadn't arrived yet.*

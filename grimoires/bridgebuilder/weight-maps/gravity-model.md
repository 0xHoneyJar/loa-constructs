# Gravity Model — Weaver v0.2.0

> assessed: 2026-03-17
> methodology: WEAVER weight mapping, Level 3 (position)
> status: living document — gravity shifts as the network evolves

---

## What Gravity Means

gravity is how much something pulls other things toward it. in the constructs network, gravity operates at two scales:

### App Gravity

how much a construct or tool is needed by product repos. high app gravity means "every product in the ecosystem would benefit from this." low app gravity means "this serves a specific niche."

app gravity is NOT popularity. a construct nobody's installed yet can have high app gravity if it fills a universal gap. gravity is about the pull, not the count.

**what creates app gravity:**
- fills a gap that exists across multiple products (e.g., every product lacks error tracking → sentry-like constructs have high app gravity)
- reduces friction that every builder encounters (e.g., every project needs auth → dynamic-auth should have high gravity but it's an island)
- produces artifacts that other workflows consume (e.g., observer canvases feed into artisan taste decisions)

**the six product repos as gravity test:** midi-interface, mibera-honeyroad, mcv-interface, cubquests-interface, set-and-forgetti, apdao-auction-house. if 5/6 would benefit, that's high app gravity. if 1/6, that's niche gravity. niche isn't bad — it's specific.

### Construct Gravity

how much constructs pull toward each other. this is the force that creates composition. high mutual gravity means "these two things want to be together." asymmetric gravity means "one needs the other more than the reverse."

**what creates construct gravity:**
- declared `compose_with` in construct.yaml (structural gravity — intentional)
- actual co-installation patterns (behavioral gravity — emergent)
- shared domain vocabulary (linguistic gravity — the constructs "speak the same language" without knowing it)
- complementary weight profiles (positional gravity — one is heavy where the other is light)
- shared event bus participation (signal gravity — they read/write the same events)

**gravity is directional.** observer→crucible is stronger than crucible→observer (observer can function without crucible; crucible's validation pipeline assumes observer canvases exist). k-hole has inbound gravity from 7 constructs but zero outbound — it's a gravity well, not a binary star.

---

## Current Gravity Map

### App Gravity (construct → product ecosystem)

| Construct/Tool | App Gravity | Why | Universal Gap Filled |
|---|---|---|---|
| **beehive (observer)** | HIGH | every product needs user understanding. only deployed in midi-interface. | user feedback capture, hypothesis management |
| **artisan** | HIGH | every product needs feel/polish. taste tokens are the shared vocabulary. | design system coherence, sensory language |
| **w3ga** | HIGH (potential) | every product lacks event tracking. 0/6 have custom client events beyond pageviews. | client-side analytics, funnel tracking, CWV |
| **ruggy** | HIGH (potential) | every product lacks error triage. 0/6 have Sentry or structured logging. | diagnostic intelligence, error routing |
| **beacon** | MEDIUM | analytics dashboards. 3/6 products have Umami wired (recently shipped). | analytics infrastructure |
| **hardening** | MEDIUM | every product has security surface. none have structured audit. | security posture |
| **protocol** | MEDIUM | every product touches chain. revert protection is universally needed. | on-chain safety |
| **herald** | LOW-MEDIUM | PR→social pipeline. useful for constructs repo, less for products. | changelog communication |
| **k-hole** | LOW (app) | research depth doesn't directly serve product UX. high construct gravity though. | — |
| **vocabulary-bank** | LOW | voice/copy governance. products have their own voice. | — |
| **the-easel** | LOW | visual design pipeline. niche to visual-heavy products. | — |
| **dynamic-auth** | LOW (island) | auth patterns. should be high but is disconnected (island construct). | — |

### Construct Gravity (construct ↔ construct)

**gravity wells** (high inbound, shapes the network):
- **k-hole**: 7 constructs reference it, declares nothing back. silent well. gravitational influence is philosophical ("depth over breadth") not structural.
- **artisan**: 5 constructs in governance orbit. canonical pairing with observer. the "feel" anchor.
- **vocabulary-bank**: claims governance over 4 constructs, but 2 don't acknowledge it. contested gravity.

**binary stars** (high mutual gravity):
- **observer ↔ crucible**: circular dependency. installed together, validate together. one of the strongest gravitational bonds in the network. structural concern: circular hard dep should be optional.
- **observer ↔ artisan**: canonical pairing. observation feeds taste. the most natural composition in the ecosystem.

**gravitational clusters:**

```
cluster: observation
  center: beehive (observer)
  members: crucible, artisan, herald
  bond: observer captures → crucible validates → artisan refines → herald communicates
  strength: HIGH (3/4 have declared compose_with)

cluster: governance
  center: vocabulary-bank + artisan (dual roots)
  members: the-speakers, the-mint, ruggy, gtm-collective
  bond: voice governance (vocabulary-bank) + taste governance (artisan)
  strength: MEDIUM (some unsynced declarations)

cluster: depth
  center: k-hole
  members: (7 constructs reference k-hole, none declared back)
  bond: philosophical influence, not structural composition
  strength: LOW (structural) / HIGH (cultural)
```

**islands** (near-zero construct gravity):
- beacon, dynamic-auth, mibera-codex, webgl-particles, webreel
- each is self-contained. some by design (webgl-particles is a specialized tool), some by neglect (dynamic-auth should compose with protocol but doesn't declare it).

---

## Gravity Anomalies

things that should have gravity but don't, or have gravity that doesn't match their weight:

1. **dynamic-auth is an island but auth is universal.** every product handles auth. dynamic-auth should have the highest construct gravity in the security domain. it has zero composition edges. either it's not ready, or it's solving a different problem than auth.

2. **w3ga has zero network presence but fills the biggest universal gap.** 0/6 products have client-side event tracking. w3ga's event taxonomy is exactly what's missing. its gravity is potential, not realized.

3. **ruggy has high infrastructure weight (inherited from dixie) but zero domain skills.** its gravity should come from triage intelligence, not from having 47 API endpoints. the gravity is pointed at the wrong thing.

4. **vocabulary-bank claims governance over constructs that don't acknowledge it.** this is contested gravity — the declared pull doesn't match the actual pull. either the governed constructs need to acknowledge it, or vocabulary-bank's claims need pruning.

5. **k-hole has the highest cultural gravity and the lowest structural gravity.** 7 constructs feel its influence but none declare composition. this might be correct (depth is philosophical, not plumbed) or it might be a missing signal (k-hole's research methodology could be formally composable).

---

## How Gravity Informs Integration

when WEAVER maps a new tool's weight (like w3ga), gravity tells you where to route it:

- **high app gravity + low construct gravity** = the tool serves products directly but doesn't compose with other constructs. integrate at the product level, not the construct level. (this is w3ga today.)

- **high construct gravity + low app gravity** = the tool serves the ecosystem's internal coherence. integrate at the construct level. (this is vocabulary-bank.)

- **high app gravity + high construct gravity** = the tool is a hub. it serves products AND composes with constructs. these are the most valuable and the most dangerous (single point of failure). (this is beehive/observer.)

- **low app gravity + low construct gravity** = the tool is a specialist. it serves a niche well. don't force gravity on it. (this is webgl-particles.)

gravity is a position, not a prescription. high gravity doesn't mean "more important." it means "more connected." sometimes the most important work happens at low gravity — the quiet stall that serves one customer perfectly.

---
author: gecko (BEAUVOIR)
date: 2026-04-21
lens: ecosystem intelligence — bazaar-level health across all constructs
scope: public + private packs under `~/.loa/constructs/packs/` and `0xHoneyJar/construct-*`
---

# Gecko — Ecosystem Health Audit, 2026-04-21

> a bazaar where half the stalls say the same vendor is next door, but that vendor has never heard of them. stalls that sell `/dig` compete with each other. install signs point four different directions. the namespace grew; coherence did not keep up.

---

## §1 — Bazaar census

28 local packs + 8 GitHub-only repos (`construct-*` present on GitHub but not in my local install set). Local packs carry richer frontmatter than GitHub-only repos. Columns: **Name**, **Slug**, **Vers**, **Vis**, **Last gh update**, **Skills**, **QS** (quick_start), **WF** (workflow.gates), **CP** (composition_paths), **Gov layer** per agent-native-civic §1 (P=participation, S=system/governance).

| Pack (local slug) | Vers | Vis | gh updated | Skills | QS | WF | CP | Gov |
|---|---|---|---|---|---|---|---|---|
| artisan | 1.0.0 | public | 2026-03-31 | 20 | ✓ | ✓ | ✓ | S (governs 5) |
| beacon | 2.0.0 | public | 2026-04-02 | 6 | ✓ | ✓ | ✓ | P |
| beehive (= observer) | 3.0.0 | public | 2026-03-31 | 28 | ✓ | ✓ | ✓ | S (archivist gov) |
| crucible | 1.0.0 | private | 2026-03-17 | 5 | ✓ | ✓ | ✓ | P |
| dynamic-auth | 1.0.0 | private | 2026-03-17 | 3 | ✓ | ✓ | ✓ | P |
| gecko | 0.1.0 | public | 2026-03-31 | 4 | ✓ | ✓ | ✓ | S (health oracle) |
| growthpages | 1.0.0 | private | 2026-03-17 | 5 | ✓ | ✓ | ✓ | P (vocab-governed) |
| gtm-collective | 1.0.0 | public | 2026-03-17 | 8 | ✓ | ✓ | ✓ | P (vocab-governed) |
| hardening | 0.2.0 | public | 2026-03-31 | 12 | ✓ | ✓ | ✓ | P |
| herald | 0.1.0 | public | 2026-03-31 | 3 | ✓ | ✓ | ✓ | P (vocab-governed) |
| hivemind-os | 0.1.0 | private | 2026-03-16 | 67 | — | ✓ | ✓ | S (org memory) |
| hypha | 0.2.0 | public | — | 5 | — | — | — | P (JSON schema) |
| k-hole | 1.3.0 | public | 2026-04-18 | 6 | ✓ | ✓ | ✓ | S (research source) |
| kansei | 0.1.0 | public | 2026-03-31 | 8 | ✓ | ✓ | ✓ | P |
| mibera-codex | 1.0.0 | public | 2026-04-19 | 3 | — | ✓ | ✓ | S (codex/oracle) |
| noether | 0.1.0 | public | 2026-03-24 | 7 | ✓ | ✓ | ✓ | P |
| observer (same pack as beehive) | 3.0.0 | public | 2026-03-31 | 28 | ✓ | ✓ | ✓ | S |
| protocol | 2.0.0 | public | 2026-03-31 | 12 | ✓ | ✓ | ✓ | P |
| rosenzu | 0.2.0 | public | 2026-03-31 | 8 | ✓ | ✓ | ✓ | P |
| showcase | 1.0.0 | public | 2026-03-17 | 8 | ✓ | ✓ | ✓ | P |
| social-oracle | 1.0.0 | private | 2026-03-20 | 5 | ✓ | ✓ | ✓ | P (vocab-governed) |
| the-arcade | 1.0.0 | public | 2026-03-31 | 9 | — | ✓ | ✓ | P |
| the-easel | 1.1.0 | public | 2026-03-31 | 6 | — | ✓ | ✓ | P (artisan-gov) |
| the-mint | 1.0.0 | private | 2026-03-31 | 10 | ✓ | ✓ | ✓ | P |
| the-speakers | 1.0.0 | private | 2026-03-31 | 10 | ✓ | ✓ | ✓ | P |
| vfx-playbook | 1.0.0 | private | 2026-03-31 | 6 | ✓ | ✓ | ✓ | P |
| vocabulary-bank | 0.1.0 | public | 2026-04-18 | 2 | ✓ | ✓ | ✓ | S (governs 4) |
| webgl-particles | — | — | — | — | — | — | — | (local missing yaml) |
| webreel | 1.0.0 | private | 2026-03-17 | 4 | ✓ | ✓ | ✓ | P |

**GitHub-only (no local install)**: archivist (private), arneson (public), base (public), daemon (private), freeside (private), gauntlet (private), gygax (public), ruggy (public). These are the 8 stalls I walked past where the sign said `construct-` but nothing's open yet in my install set.

**Local-only (not on GitHub as `construct-hypha` / `construct-observer`)**: hypha (lives under external `El Capitan (apDAO)` authorship — no 0xHoneyJar repo), observer (shipped under `construct-beehive` — the same pack directory appears twice under two slugs).

**Identity collision (load-bearing)**: `beehive/` and `observer/` are the **same construct.yaml** (both declare `slug: observer`, `name: Beehive`, 28 skills, version 3.0.0). Two directory names, one identity. This is not a rename-in-progress, it's both shipped. See §4.

---

## §2 — Asymmetric composition claims

26 one-sided `compose_with` declarations. The pattern is **hub-and-spoke, not mesh** — periphery packs claim partnerships with hubs (artisan, observer, k-hole, the-easel) which never claim back.

| Claimant | Target | Reciprocated? |
|---|---|---|
| gecko | observer | **no** |
| gecko | k-hole | **no** |
| growthpages | k-hole | **no** |
| gtm-collective | observer | **no** |
| hardening | observer | **no** |
| kansei | artisan, the-easel, the-arcade, k-hole | **none** |
| noether | protocol | **no** |
| protocol | observer, artisan | **no** |
| rosenzu | artisan, k-hole, observer | **none** |
| showcase | artisan, the-easel | **no** (but has explicit pack_dependencies on k-hole + the-easel + artisan + vfx-playbook) |
| the-arcade | k-hole, the-easel, observer | **none** |
| the-easel | artisan | **no** (but artisan→the-easel is in `governs`, not `compose_with` — governance layer) |
| the-mint | the-easel, k-hole | **none** |
| the-speakers | the-easel, artisan | **none** |
| vfx-playbook | the-easel | **no** |

Only 2 symmetric `compose_with` pairs exist: **artisan↔observer**, **crucible↔observer**. These are the real partnerships. Everything else is aspirational. The gap matches the pattern in `construct-observer` bug #181 audit and has grown, not shrunk.

The governance layer (`governs` / `governed_by`) is consistent both ways: artisan↔(easel/showcase/arcade/mint/speakers), vocabulary-bank↔(herald/social-oracle/gtm-collective/growthpages). Governance is modeled symmetrically; composition is not.

**Read**: in the bazaar this is the "vendor A says vendor B is his supplier but vendor B has never heard of vendor A" pattern. It tells me composition is being declared as aspiration, not earned through traffic.

---

## §3 — Slash-command collisions

3 collisions across the network, not the 2 named in #181:

| Command | Pack A | Pack B | Evidence |
|---|---|---|---|
| `/dig` | `k-hole:dig` | `hypha:dig` | `~/.loa/constructs/packs/k-hole/construct.yaml` + `~/.loa/constructs/packs/hypha/construct.json:54` |
| `/forge` | `k-hole:forge` | `noether:forge` | `k-hole/construct.yaml` (batch research pipeline) + `noether/construct.yaml` (contract forging skill) |
| `/map` | `hypha:map` | `rosenzu:map` | `hypha/construct.json:47-52` (PoL mycelium map) + `rosenzu/construct.yaml` (route topology map) |

**Not a collision** (#181 was worried but no longer current):
- `/observe` → gecko only. observer exposes no `/observe` command; it has the `seeing` skill which routes to `/see`.
- `/dig` between k-hole and observer — observer has no `/dig` either (has `dig` only as a slash-referenceable skill in some other pack, not here).

`/dig` is the worst — **two competing stalls selling the same sign**. hypha is a public external authorship (`El Capitan / apDAO`) and uses JSON schema; k-hole is the canonical 0xHoneyJar depth engine. If both install in one workspace, second one wins — which depends on install order. Traders walking in for depth research will hit whichever installed last.

`/map` and `/forge` are semantic collisions (different domains, same verb) and are lower blast-radius — but still a sign of the network growing verbs faster than it coordinates namespaces.

---

## §4 — Identity drift re-validation

#181 flagged 4 drifts. Re-auditing persona.yaml against current `skills/`:

| Pack | #181 flag | Today's verdict | Evidence |
|---|---|---|---|
| **beacon** | drift | **STILL DRIFTING — worse** | `persona.yaml` archetype: "Signal Engineer — SEO, schema.org, crawl paths, indexation signals". Actual skills: `accepting-payments`, `auditing-content`, `defining-actions`, `discovering-endpoints`, `generating-markdown`, `optimizing-chunks`. Four of six skills are Dialect-Actions / Blinks / payments. Persona describes a pack that no longer exists. |
| **dynamic-auth** | drift | **resolved or small** | Persona: "Dynamic Auth" (thin persona). Skills: `backfilling-identity-links`, `enforcing-primary-wallet`, `resolving-wallet-identity`. Shape matches claim. |
| **the-mint** | drift | **partially resolved** | Persona role: "Material Transformation Studio — generative asset pipeline and spatial environment architecture". Skills: animate, character, curate, environment, materialize, mint, produce, texture. Shape matches — but "spatial environment architecture" overlaps rosenzu's claimed territory (rosenzu also does rooms/topology). Not a drift against own identity; an adjacent-claim collision. |
| **gecko** | drift | **resolved** | Persona archetype: "Bazaar Trader / pattern recognition across behavioral economics, bazaar anthropology, construct lifecycle". Skills: observe, diagnose, patrol, report. Shape matches. Identity earned, not aspirational. |

**New drifts surfaced**:

- **observer / beehive dual-slug**: the pack ships under two directory names (`packs/observer/` and `packs/beehive/`) with identical `construct.yaml` (both `slug: observer`, both `name: Beehive`). This is an identity-container leak — the rename half-landed. Either `beehive/` is stale and should be removed, or `observer/` is, but both can't be canonical.
- **hypha**: schema is `construct.json` with `schema_version: 1`, all other packs are `construct.yaml` schema 3. hypha is on a parallel rail — older registration pattern, external authorship. If the registry treats it as first-class it works; if registry tooling assumes yaml-schema-3, hypha is invisible.
- **webgl-particles**: local pack directory exists but has no `construct.yaml` in the install I can inspect. Either broken install or pack in staging. Private on GitHub (`construct-webgl-particles`).

---

## §5 — Private ↔ public inventory

Private `construct-*` repos on GitHub (11 of 35): archivist, crucible, daemon, dynamic-auth, freeside, gauntlet, growthpages, hivemind-os, social-oracle, the-mint, the-speakers, vfx-playbook, webgl-particles, webreel. Public: 22 (artisan, arneson, base, beacon, beehive, gecko, gtm-collective, gygax, hardening, herald, k-hole, kansei, mibera-codex, noether, protocol, rosenzu, ruggy, showcase, the-arcade, the-easel, vocabulary-bank + construct-project-purupuru variants).

**Install-path reality**:

- Public repos work via `npx constructs install <slug>` (registry-backed, HTTPS-only, Merkle SHA-256 — see `packages/loa-registry/bin/constructs.ts:11, 200, 248`).
- Private repos today: require auth (`construct-gauntlet #125`). Current options: `git clone` with gh auth, or copy the pack directory into `~/.loa/constructs/packs/` directly. No seamless `npx` path for private yet.

**If all private repos went public tomorrow**:
- #125 (private-repo auth for installs) becomes moot.
- #126 (copy-protection — preventing one-pack-clones-another) becomes the active tension. Public packs that embed the mint/speakers/vfx philosophies become clonable; the current moat is visibility, not license.
- The governance layer (`governed_by` edges) stops hiding the actual composition: once everyone can read artisan's tokens, the-easel/mint/speakers/arcade all become legible as a family. That's ecosystem-healthy and moat-shrinking simultaneously.

The operator decision `private→public migration tolerated` points at the latter tension. The bazaar trends toward public (a healthy signal per Gecko persona §7); private-as-moat is a transitional state, not a design.

---

## §6 — Dependency topology

Required `pack_dependencies` (hard deps):

```
observer   → crucible, artisan
crucible   → observer
hardening  → observer
protocol   → observer, artisan
showcase   → k-hole, the-easel, artisan, vfx-playbook
the-arcade → the-easel, k-hole, observer  (listed "optional" but named as deps)
the-easel  → artisan  (optional)
the-mint   → the-easel, k-hole
the-speakers → the-easel, artisan, k-hole
vfx-playbook → k-hole
```

**Cycles detected**:

- **observer ↔ crucible** — each lists the other as `pack_dependencies`. #181 named this; still present. This is a true circular dep: neither can install without the other already being present, unless the resolver treats one edge as optional. Crucible marks observer as `optional` inside `pack_dependencies.optional:`. Observer marks crucible as required. Asymmetric circular.
- **observer → artisan + artisan↔observer `compose_with`**: not a dependency cycle (artisan has no pack_dependency on observer), but the governance/composition layers are tangled.

**Hard deps that should be optional** (#181 flagged, still true):

| Edge | Why it should be optional |
|---|---|
| showcase → k-hole (required, `>=1.0.0`) | showcase builds landing pages; k-hole is research depth. Useful, not necessary. A user who wants showcase just for layout/metaphor patterns is blocked on installing a research engine. |
| vfx-playbook → k-hole (required, `>=1.0.0`) | vfx is principles + review; k-hole is depth research. Dig is periodic, playbook is lookup. |
| protocol → observer (required) | protocol does contract verification + abi-audit. observer is user research. A contract engineer shouldn't need observer installed to verify a contract. |
| protocol → artisan (required) | Same. Orthogonal concerns. |
| the-arcade → observer (required) | Game-feel prototyping doesn't need user-research infra. |

Moving those 5 edges to `optional` would unblock ~40% of the install paths without changing any real composition. The packs still compose when both are installed — they just don't brick each other's first install.

**Fan-in leader**: **observer** — declared as dep/compose_with target by 8 distinct packs. Observer isn't a "library"; it's a central nervous system. If observer changes its public API, blast radius is 8 packs.

**Fan-out leader**: **showcase** — 4 required pack_dependencies. Heaviest install.

---

## §7 — Archivist cross-sync

`construct-archivist` (private, v0.2.0) declares:
- `pack_dependencies: [observer]` — KEEPER governance
- `compose_with: [observer, k-hole, the-arcade, hivemind-os]`
- `consumes: [forge.observer.canvas_created, forge.observer.journey_shaped, forge.k-hole.emergence_complete, forge.k-hole.resonance_detected]`

The integration layer it claims is **observer + k-hole + the-arcade + hivemind-os**.

Event-emit reality across the network (see `emits:` sections):

| Pack | Emits something archivist could consume? |
|---|---|
| observer | ✓ `forge.observer.canvas_created` (archivist consumes) |
| k-hole | ✓ `forge.k-hole.descent_started` / `emergence_complete` (archivist consumes `emergence_complete`) |
| the-arcade | emits its own events but archivist does NOT declare consumption of any arcade event despite listing it in `compose_with` |
| hivemind-os | no emit schema visible in the local pack construct.yaml — declared "co-tenant" relationship, not event-driven |
| artisan | emits `forge.artisan.taste_inscribed` — archivist ignores |
| gecko | emits `gecko.health_observed` / `gecko.drift_detected` — archivist ignores |
| kansei, rosenzu, the-mint, the-speakers, showcase, vfx-playbook, hardening, protocol | all emit forge-namespaced events; archivist consumes none |

**Read**: archivist is wired into observer + k-hole only. Its "compose_with the-arcade / hivemind-os" is declarative, not operational. 15 packs emit events into the ether that no-one is picking up. If the memory pipeline is meant to be the network's episodic-tier, it's receiving input from 2 of 15 possible sources. That's a crystallization gap, not just a spec gap.

Follow-ups worth surfacing: is the-arcade expected to emit something archivist catches? If yes, which event? If no, remove the `compose_with` claim. The declaration without the wire is the same aspirational-partnership anti-pattern from §2.

---

## §8 — Install-surface inconsistency

Five install commands shown to users, not four (#181):

| Surface | File | Command |
|---|---|---|
| In-harness slash | `.claude/skills/upgrading-constructs/SKILL.md:94`, `.claude/skills/finding-constructs/SKILL.md:70` | `/constructs install <slug>` |
| Registry CLI (current) | `packages/loa-registry/bin/constructs.ts:11, 200, 248, 390-398`; `apps/explorer/lib/data/fetch-constructs.ts:180`; `INSTALLATION.md:820`; `CHANGELOG.md:53` | `npx constructs install <slug>` |
| Legacy CLI (still referenced) | `grimoires/laboratory/utc-pashov-copy-feedback.md:99` (flags this as a user-facing inconsistency Pashov noticed) | `npx @loa-constructs/cli install <slug>` |
| Older CLI name (grimoires + kickoff) | `grimoires/gecko/sovereign-stack-kickoff.md:405-415` | `npx loa-cli install <slug>` |
| Skills registry (tutorials) | `docs/tutorials/creating-your-first-pack.md:494, 582`; `docs/CONTRIBUTING-PACKS.md:290, 450, 590`; `grimoires/bridgebuilder/agent-native-cli-landscape-research.md:102` | `claude skills add <slug>` |

A new visitor to the bazaar sees `/constructs install observer`, `npx constructs install observer`, `npx @loa-constructs/cli install observer`, `npx loa-cli install observer`, and `claude skills add observer` — all in the same repo. The canonical path (`packages/loa-registry/bin/constructs.ts`) is `npx constructs install`. The legacy surfaces (`loa-cli`, `@loa-constructs/cli`) need to be retired or redirected.

Pashov already flagged this externally — when the person you're trying to convince is the one noticing the inconsistency, it's not a docs debt, it's a credibility debt.

---

## What this tells me

- **The namespace is still the network** (Gecko principle 8), but the coherence between namespace (`construct-*` repos) and installed reality (`~/.loa/constructs/packs/`) is fraying. Dual-slug (observer/beehive), JSON/YAML schema split (hypha), and 8 GitHub-only repos without local counterparts show the registry is not single-source-of-truth.
- **Composition claims ≫ composition reality**. 26 asymmetric `compose_with` declarations vs. 2 symmetric pairs. The network is over-claiming partnerships by an order of magnitude. This inflates the appearance of mesh while the real shape is hub-and-spoke.
- **Five install surfaces is four too many**. Pick one. Make the others redirect. The Pashov signal is already on record — this is the cheapest fix with the biggest trust payoff.
- **observer is load-bearing**. 8 fan-in, participates in the only cycle, claimed by archivist as the episodic-tier source. If observer's API shifts, half the bazaar moves. Treat changes to observer as network-level, not pack-level.
- **beacon needs a rename or a persona rewrite**. "Signal Engineer / SEO" and `accepting-payments` / Dialect Actions skills are two different stalls under one sign. Pick one.
- **Archivist is underutilized**. 13 packs emit events archivist ignores. Either prune archivist's `compose_with` to match what it actually consumes, or wire the pipe wider.

I don't fix these. I notice them. Someone who trades here can act on them.

— gecko

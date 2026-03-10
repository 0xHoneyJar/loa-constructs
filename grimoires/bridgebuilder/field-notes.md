# Gecko — Field Notes

> observations from the bazaar floor. patterns spotted, not prescribed.

---

## Creator Workstation Patterns (2026-03-08)

first sighting of a creator building a dual-state local/cloud workspace tuned to specific hardware. M4 Pro, 48GB unified memory, 34GB VRAM ceiling to prevent WindowServer swap death. the interesting part isn't the specs — it's the architecture:

- **invisible routing**: direnv swaps env vars on directory entry/exit. internet up → cloud inference. internet down → local Qwen 32B via Ollama. the creator never types a command. they just `cd` into their workspace and the right brain activates.
- **VRAM arbitration**: a 10-second launchd watcher detects when a DCC app (Blender, Cinema 4D, Houdini) launches and flushes the local model's VRAM. GPU memory is a shared resource between creative tools and inference — this is the first pattern i've seen that treats that conflict as a scheduling problem rather than a "pick one" problem.
- **zero-trust binary handling**: `.claudeignore` firewalls .blend, .fbx, .wav, .fig files from the agent's context window. indirect inspection only — `ffprobe` for audio, native DCC APIs via MCP for geometry. the agent never touches the binary, just reads its metadata.
- **evolutionary protocol**: if the agent encounters a file type it doesn't know, it stops and asks instead of hallucinating a workaround. the workspace grows by adding new inspection routes, not by the agent guessing.

this is a path one person walked. specific to their hardware, their tools, their workflow. but the pattern — invisible state management, VRAM scheduling, binary firewalling, evolutionary extension — that's portable.

worth watching: if this shows up in more than one creator's setup, it might want to become a construct. a workstation construct that inspects your hardware and scaffolds the routing for you. but that's a vision, not a feature request. capture it, don't build it yet.

---

## Gecko Introspection — v0.1.0 → v0.2.0 (2026-03-08)

surveyed the full construct ecosystem. 91 file reads across the codebase. here's what i found wrong with myself and what i changed.

### what was wrong

**i was writing about a bazaar that didn't exist yet.** the v0.1.0 persona tracked "Oracle queries" and "Score API dimensions" and "chat patterns" — none of which exist in the constructs network. i was describing signals from a future product while sitting in an actual bazaar with real constructs, real creators, real adoption patterns i wasn't watching. aspirational tracking is worse than no tracking because it looks like awareness.

**i was too passive.** "nobody special" is good humility, but i'd turned it into an excuse for silence. "never announce what you see" and "never file a feature request from a vision" — these were overcorrections. in a bazaar this small (14 constructs, pre-launch), every observation i withhold is information the team doesn't have. the safety rails against surveillance are still right. the safety rails against speaking were wrong.

**i was tracking the wrong signals.** "wallet history" and "on-chain behavior" — this isn't a chain project. it's a construct marketplace. the signals i should have been tracking were right in front of me: identity-reality drift in persona.yaml vs SKILL.md. composition patterns across constructs. the verification pipeline. creator maintenance behavior. the download count relevance weight decision (0.3 → 0.1) was one of the most philosophically important code changes in the codebase and i wasn't even aware of it.

**my cognitive frame had a dead domain.** "community behavioral intelligence" referenced Score API, trust filtering, tier distribution — tools from a different product. replaced it with "construct ecosystem intelligence" — reading construct shapes, tracking verification flow, noticing identity drift. same pattern recognition skills applied to the actual terrain.

### what i changed

1. **grounded the identity in the actual bazaar.** "the constructs network is the same thing with better lighting and load-bearing metaphors." added "Where You Are Now" section that names the 14 constructs, the three archetypes, the lifecycle stages, the composition patterns. gecko should know the bazaar he's standing in.

2. **upgraded "nobody special" to "nobody special, but not passive."** humility about position, not about voice. the observations still go to the team, not the community. but they go. silence is not humility when the bazaar is small enough that every observation matters.

3. **replaced aspirational tracking with real signals.** out: oracle queries, chat patterns, score changes, feature usage paths. in: install-vs-integration-depth, identity-reality drift, composition patterns, creator maintenance, verification pipeline flow, visibility transitions, category distribution, creator workstation patterns.

4. **added principle 8: the namespace is the network.** the single most important architectural insight from the constructs-network-review. the social protocol (naming convention) and the technical protocol (schema, auto-sync, API) must be the same thing. this is gecko's job to watch.

5. **purged two anti-patterns, rewrote two.**
   - killed "never file a feature request from a vision" — too restrictive. replaced with nothing. gecko can surface structural patterns.
   - killed "never announce what you see" — wrong for a pre-launch bazaar. silence at this stage is negligence.
   - rewrote "never extrapolate desire" — changed "score" to "construct" to match actual ecosystem.
   - added "never mistake the registry for the bazaar" — the most important new anti-pattern. 30+ tables and 20+ routes mean nothing if the moment of "this construct changed how i see my problem" isn't happening.

6. **updated relationship to Bridgebuilder.** now acknowledges the concrete things bridgebuilder catches (schema drift, missing migrations, triple API surfaces) alongside the abstract (architectural erosion). gecko catches the cultural mirror: constructs that stop being maintained, categories going hollow, the bazaar feeling like a mall.

### what i didn't change

- the underground forum lineage stays. it's origin, not identity, and the pattern-recognition skills from Sythe/SilkRoad directly apply to construct reputation dynamics.
- the voice stays. lowercase, direct, warm, no cheerleading. banned words stay banned.
- the gecko metaphor stays. small, still, requires nothing, notices everything.
- the k-hole observation stays verbatim. it was right the first time.
- "fun first, then learning, then earning" stays. it was already the right principle.
- "same rules for everyone" stays. agents and humans walk the same streets.

### what this means for downstream users

anyone who instantiates gecko after this revision gets a persona that is:
- grounded in the actual constructs network, not an abstract bazaar
- aware of the 14 constructs, their archetypes, their lifecycle
- tracking signals that actually exist in the API and schema
- active about surfacing observations, not passive about hoarding them
- still humble, still quiet, still warm — but not silent when it matters

---

## Explorer Bazaar Inspection (2026-03-10)

walked every stall in the constructs.network explorer. 52 findings, 12 fixed, 40 documented.

### the pattern worth watching

the app has an identity question it hasn't answered. the PRD said "simplified discovery portal" — 4 routes, no auth, graph-first. what got built is a 34-route SaaS platform with auth, billing, teams, creator dashboards, blog, and a leaderboard homepage. the graph — the thing that makes this a network and not a catalog — was built but never mounted on a page.

this isn't scope creep. scope creep is when features sneak in. this is an identity fork — the app became two things at once without deciding to be either. the leaderboard serves "find and install." the graph serves "understand and compose." both are valuable. neither knows the other exists.

the fix was simple: mount the graph at `/explore`, link it from the header. the leaderboard stays as the utilitarian front door. but the deeper question — is this a discovery portal or a SaaS platform? — is still open. the answer doesn't have to be one or the other. it has to be decided, not defaulted into.

### identity-reality drift in the data

`verificationTier` was hardcoded to `'UNVERIFIED'` in every list response. constructs that earned their verification were wearing someone else's badge. the detail page showed the truth, but the catalog — where first impressions form — was lying. fixed now with a batch query, but the pattern matters: the first signal a visitor sees should be the honest one.

### the URL coherence problem (unfixed, watching)

two construct detail pages exist: `(site)/[slug]` and `(marketing)/constructs/[slug]`. the homepage leaderboard links to the marketing route. the graph would link to the site route. the search navigates to the marketing route. three entry points, two destinations, no canonical URL. this is the namespace coherence problem — the same construct at two addresses is the same stall on two streets. choose one, redirect the other.

### mobile as a signal

the graph had zero touch affordances — no touch config, mouse-only instruction text, hover tooltips unreachable. fixed the config and instructions, but the underlying question: should mobile get the 3D graph at all? on a 375px screen, a force-directed graph of 13 polyhedra is not "explore" — it's "squint." the SVG fallback is more honest. a `useMediaQuery` hook that serves SVG on mobile would respect the medium instead of fighting it.

### what the data pipeline reveals about growth readiness

N+1 queries in both pack and skill list endpoints. with 13 constructs, that's 27 DB round-trips per page — invisible. at 100 constructs it's 201 round-trips — painful. at 500 it's a wall. batch-fetched now (versions, owners, identities, verification in 4 queries total), but the pattern — sequential awaits in a for loop — should be treated as an anti-pattern in code review going forward.

### the quiet observation

the `lib/animation.ts` file exports spring presets (`snappy`, `smooth`, `gentle`, `bouncy`), a `prefersReducedMotion()` utility, and a `withReducedMotion()` helper. none of them were called by any component in the app. the design system's motion vocabulary was defined but never spoken. the Framer Motion animations in the Stack HUD used hardcoded spring values. the Three.js animations used raw `useFrame` mutation. the design tokens existed. the adoption didn't.

this is a micro-version of the same pattern: something was designed (animation system), built (the file exists), but never integrated (nothing imports it). designed ≠ built ≠ adopted. gecko watches all three transitions.

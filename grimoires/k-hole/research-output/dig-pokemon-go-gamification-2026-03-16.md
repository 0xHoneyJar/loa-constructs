# Pokemon Go Gamification Design: Deep Research for Purupuru

**Date**: 2026-03-16
**Mode**: DIG (STAMETS)
**Purpose**: Extract actionable design patterns from Pokemon Go's behavioral loop for purupuru card game

---

## 1. The Pokeball Toss: Anatomy of a Perfect Micro-Interaction

### The Mechanical Breakdown

The pokeball toss works because it layers multiple psychological systems into a single gesture:

**The Drag Gesture**
- Zero-instruction discoverability. No tutorial needed. A pokeball is on screen, a pokemon is above it. The action is obvious. This is the gold standard of "intuitive micro-interaction design" -- the best interactions feel like they were never designed at all.
- Similar to Facebook Messenger's basketball game. The finger-drag maps to a real-world metaphor (throwing) without needing to explain it.

**The Arc Physics (Skill Expression)**
- The ball follows a physics arc, not a straight line. This creates a skill floor (anyone can toss) and a skill ceiling (curveball + excellent timing).
- Three throw tiers create a **mastery gradient**:
  - Nice: 1.3x catch rate, 10 XP. Largest ring target.
  - Great: 1.5x catch rate, 50 XP. Mid-sized ring.
  - Excellent: 1.7x catch rate, 100 XP. Smallest ring.
- The curveball adds a separate 1.7x multiplier that **stacks** with throw tier. This means a Curveball-Excellent is a 2.89x catch rate. Mastery is dramatically rewarded.
- Key finding: Curveball alone (1.7x) is better than a straight Nice throw (1.3x). This means the system rewards learning the "right way" to throw, not just throwing accurately.

**The Shake Animation (Uncertainty)**
- The ball wobbles 1-3 times. Each wobble is a separate moment of tension.
- This is textbook **variable ratio reinforcement** -- you never know if the next shake will lock or break.
- Neurologically, dopamine spikes happen *during anticipation*, not during the reward. The shakes ARE the dopamine hit. The catch itself is the release.
- The "near-miss effect": when the ball shakes twice and breaks open, the brain interprets this as "almost succeeded." This activates the same brain regions as actual wins (the striatum), creating a false signal: "try again, you were close."

**The Star Burst (Reward)**
- Particle explosion + XP cascade + "Gotcha!" text.
- The reward is brief but multi-sensory: visual particles, number display, sound.
- For common pokemon, the celebration is quick. For rare pokemon, it's prolonged. The system **scales celebration to rarity**.

### Why People Played for Hours Despite Simplicity

The pokeball toss is a **1-second interaction** that contains:
1. Agency (you aim)
2. Skill expression (curveball + timing)
3. Uncertainty (will it catch?)
4. Tension (shake animation)
5. Reward or near-miss (both drive re-engagement)

This density of psychological engagement per second of interaction is extraordinary. Most mobile games take 10-30 seconds to deliver one reward cycle. The pokeball toss does it in ~3 seconds.

### PURUPURU IMPLICATION
The card reveal moment needs this same density. The interaction that opens/reveals a card should contain: (1) a player-controlled gesture with skill expression, (2) a moment of genuine uncertainty, (3) tension-building before resolution, (4) reward scaled to rarity. The gesture cannot be "tap to reveal." It must have a physical metaphor with arc or trajectory.

---

## 2. What Kept Players Playing After the AR Novelty Wore Off

The AR was never the core loop. It was the Instagram moment. What actually retained players:

**The Collection Loop (Pokedex)**
- Silhouettes of undiscovered pokemon are visible before discovery. This is critical: you can see THAT something exists without seeing WHAT it is. The mystery drives completionism without revealing the overwhelming scope.
- Key research finding: When MonsterStrike showed all 1,700 collectibles on day one, it created "a sense of futility." The pokedex avoids this by revealing incrementally.
- Evolution chains show "the path before you walk it" -- you see Charmander and know Charizard exists. This creates mid-term goals within the collection.
- Shiny variants create a secret parallel collection layer for hardcore players.

**The Egg Investment Loop**
- 2km, 5km, 7km, 10km, 12km distance tiers. Longer walk = rarer pokemon.
- You commit physical effort BEFORE receiving any reward. This is a **commitment device** -- once you've walked 8km toward a 10km egg, quitting feels like wasting the investment (sunk cost).
- The egg contents are random (variable reward), but the investment is deterministic (walk X km). This combination is psychologically potent: certain cost + uncertain reward.
- Incubator scarcity: one infinite-use incubator free, additional ones cost premium currency and have 3 uses. This creates a bottleneck that monetizes without blocking the core loop.

**The Candy Economy**
- Catching duplicate pokemon isn't wasted -- you get candy to power up or evolve.
- This means every catch has value, even commons. The collection loop never has a truly "empty" outcome.

**Community Day Events**
- Monthly events with one featured pokemon, boosted shiny rates, exclusive moves.
- Creates FOMO (time-limited) + social gathering + clear short-term goal.
- December "makeup" event brings back all Community Day pokemon from the year -- a safety net that reduces resentment.

### PURUPURU IMPLICATION
The collection must show what's undiscovered without revealing what it is. Wuxing element silhouettes. Evolution/combination paths visible before achievable. Duplicate cards must have value (crafting currency, not waste). Time-limited events with exclusive variants for social gathering.

---

## 3. Octalysis Framework Applied to Pokemon Go

Yu-kai Chou identified **27 game techniques** across all 8 Core Drives in Pokemon Go. Here's the breakdown with purupuru mapping:

### PRIMARY Core Drives (drove initial adoption)

**CD7 -- Unpredictability & Curiosity** (Black Hat, Intrinsic)
- What spawns near me? Will I catch it? What's in this egg?
- PokéStop spinner mystery boxes. Random encounters on the map.
- This is the DOMINANT driver in the first 30 days. Pure curiosity.
- **Purupuru**: Pack opening randomness, which element appears, card rarity uncertainty.

**CD4 -- Ownership & Possession** (Left Brain, Extrinsic)
- "MY" pokedex. "MY" strongest Dragonite. The candy economy makes every pokemon feel like an investment in YOUR collection.
- **Purupuru**: "MY" Wuxing collection. Card ownership that feels personal, not just inventory.

**CD5 -- Social Influence & Relatedness** (Right Brain, Intrinsic)
- Seeing others play in parks. Water Cooler effect. Faction choice (Mystic/Valor/Instinct).
- **Purupuru**: On-chain collection visible to others. Social proof of rare pulls. Community events.

### SECONDARY Core Drives (retained long-term players)

**CD2 -- Development & Accomplishment** (Left Brain, Extrinsic)
- XP, levels, badges, trainer level milestones.
- Yu-kai Chou notes this is the MOST overused drive in gamification. Points and badges alone don't work. They need to REPRESENT actual progress, not just increment counters.
- **Purupuru**: Element mastery progress, collection completion percentage, battle rank.

**CD6 -- Scarcity & Impatience** (Black Hat, Extrinsic)
- Regional exclusives (can't get Mr. Mime in the US). Event-only pokemon. Shiny rates (~1/500).
- "Last-Mile Drive" (GT #53): that last kilometer to hatch your egg creates disproportionate urgency.
- **Purupuru**: Region-specific cards? Season-limited variants? The 1/500 equivalent for purupuru shinies.

**CD8 -- Loss & Avoidance** (Black Hat, Extrinsic)
- Daily streak breaks. Raid passes expire. Berry timers decay. Pokemon can flee mid-encounter.
- This is the FOMO driver. It works but it feels bad. Yu-kai Chou warns: too much CD8 leads to burnout.
- **Purupuru**: Use sparingly. Maybe daily login bonuses but NOT punitive loss mechanics.

### WEAK Core Drives in Pokemon Go (opportunity areas)

**CD1 -- Epic Meaning & Calling** (White Hat, Extrinsic)
- "I'm a Pokemon trainer" narrative is shallow in Go vs. the original games. No real story, no villain, no quest.
- Pokemon Go relied on existing franchise narrative instead of building its own.
- **Purupuru**: Wuxing lore + Ghibli aesthetic + Henlo APAC community gives us a richer narrative foundation than Pokemon Go had.

**CD3 -- Empowerment of Creativity & Feedback** (White Hat, Intrinsic)
- This is the critical weakness. Yu-kai Chou's prediction: "If Pokemon Go cannot implement a sophisticated way of maintaining Core Drive 3, the zealous craze will likely fade out in 6-12 months." He was right.
- Pokemon Go lacks meaningful strategic choices. You don't BUILD anything. You just collect.
- **ALL timeless games have strong CD3** -- chess, poker, Minecraft, Balatro.
- **Purupuru**: The Wuxing dual-cycle system (destructive + generative) inherently provides CD3. Card deck building with elemental interactions = meaningful strategic choices. This is our edge.

### KEY INSIGHT
Pokemon Go's Octalysis profile is **heavy on Black Hat drives** (CD6, CD7, CD8) and **weak on White Hat drives** (CD1, CD3). This means it's addictive short-term but unsustainable long-term. Purupuru should invert this: lead with White Hat (epic meaning, creative strategy, ownership) and use Black Hat sparingly (scarcity, unpredictability).

---

## 4. Niantic's Data Collection Disguised as Gameplay

### The Spatial Intelligence Play

Niantic trained a **Large Geospatial Model (LGM)** on ~30 billion images collected by Pokemon Go players. Every time a player visited a gym, scanned a PokéStop, or used AR mode, they were contributing spatial data: latitude, longitude, camera orientation, device pose, motion data, sensor readings.

Key facts:
- 1 million new location scans per week from Pokemon Go players alone.
- Pedestrian-level data (not vehicle-mounted like Google Street View).
- The same data now powers centimeter-accurate navigation for delivery robots.
- Niantic spun off as "Niantic Spatial" -- the games were always a data collection vehicle.

### The Google Local Guides Parallel

Google Local Guides uses points, badges, and levels to incentivize humans to upload photos, write reviews, verify businesses, and answer questions about locations. The system:
- 10 levels (Level 10 = 100,000+ points)
- Minimal real rewards (occasional Google One storage, early access)
- Primary motivation is **psychic reward** -- status badges, achievement display, community recognition
- Google gets otherwise impossibly expensive map data for essentially free
- The "Endowment Effect" kicks in: once someone has a Level 6 badge, they feel ownership over their contribution history and keep contributing

### The Pattern

Both systems follow the same playbook:
1. Make the data-collection action feel like gameplay, not work
2. Use variable rewards and social status to sustain engagement
3. The "real product" is the aggregate data, not the game/app
4. Users opt in enthusiastically because the experience is genuinely fun

### PURUPURU IMPLICATION
On-chain card interactions generate behavioral data: which elements players collect, which cards they trade, which matchups they prefer, how they build decks. This is behavioral intelligence for the Henlo APAC ecosystem -- not surveillance, but community signal. The card game IS the data collection mechanism, just as Pokemon Go IS the spatial data collection mechanism. The key ethical constraint: the game must be genuinely fun independent of the data layer. If it's only fun because of token incentives, you've built Axie Infinity, not Pokemon Go.

---

## 5. Micro-Interaction Design for Card Games on Web

### The "Choreographed Emotion" Framework (Adam Donkin, N3TWORK)

The definitive guide to card reveal UX identifies these phases:

1. **Initiation Gesture**: The player performs a physical action to start the reveal. Japanese gacha games (Puzzle & Dragons, Monster Strike) use a gesture -- pull a lever, spin a wheel. Western games often skip this and just show results after tapping "Buy." Skipping the gesture is a missed opportunity for drama.

2. **Rarity Signal**: The first emotional peak is when users realize a super-rare card is in the deck -- often MORE exciting than seeing the actual card. Give the imagination a moment to run wild.

3. **The Reveal**: The apex. This determines delight or disappointment. Celebrate rare cards HUGELY. Make common reveals quick and satisfying. Don't make commons feel like punishment.

4. **The Encourage**: Since the user is already in the flow, offer another chance. If they won big, extend the streak. If they didn't, offer a path forward.

### Web Equivalents of the Pokeball Toss

| Physical Metaphor | Web Implementation | Skill Expression | Failure Possibility |
|---|---|---|---|
| Wrapper tearing / peeling | Drag gesture from edge, velocity matters | Speed/angle of tear | Paper can "rip wrong" if too fast |
| Card flick from pack | Swipe-up with physics arc | Flick velocity determines reveal speed | Weak flick = card falls back |
| Coin toss before reveal | Hold-and-release mechanic | Timing of release | Too early/late changes outcome presentation |
| Pokeball-style throw | Drag arc toward target zone | Arc accuracy + curveball | Miss the target = re-throw needed |

### Balatro's "Juice" Lessons

Balatro (Game of the Year 2024, 5M+ copies) is the masterclass in card-game feel:

- **Audiovisual synchronization**: Score numbers jump in sync with pitch-shifting audio. Dual-channel stimulation amplifies satisfaction.
- **Physical inertia**: When rearranging cards, adjacent cards get pushed with simulated magnetic damping. Cards feel like they have WEIGHT.
- **Hidden score preview**: Balatro deliberately hides how many points you'll score. You pick cards, cross fingers, hit go. The uncertainty IS the excitement.
- **Escalating number explosions**: Scores go from 50 to 500 to 5,000 to 50,000 to millions. The acceleration is intoxicating. The game doesn't cap power -- it leans into absurdity.
- **Rule-breaking as satisfaction**: Balatro establishes poker rules, then systematically lets you violate them. Five-of-a-kind in a standard deck. Scoring face-down cards. Each violation feels like discovering a secret technique.
- **Background state changes**: Boss Blinds and Booster Packs change background color/texture globally. This signals mode shift without UI popups.

### Marvel Snap's Design Principles

- Cards take **visual priority** in the hierarchy. UI is "dark piano glass" -- holograms projected on dark surfaces. Cards are the stars, UI is the stage.
- **Ergonomic placement**: Interactable elements pushed to bottom half of screen for one-handed mobile play.
- Starting hand has **Quicksilver** (always in opening hand) -- this makes the first turn feel smooth for new players. Onboarding through card design, not tutorials.
- Card cosmetics (parallax, frame-breaking, height-mapping, animation FX) are the primary progression reward. The cards themselves are the collectible.

### Frontend Implementation Stack

| Tool | Best For |
|---|---|
| **Framer Motion (Motion)** | Drag constraints, spring physics, layout morphing, gesture handlers (whileHover, whileDrag, whileTap) |
| **@use-gesture/react** | Precise drag/flick/pinch gesture detection with velocity data |
| **React Spring** | Physics-heavy spring animations, Three.js integration |
| **GSAP** | Timeline-based reveal sequences, complex staggered animations |
| **CSS Custom Properties + JS** | Holographic tilt/lighting effects driven by pointer coordinates |

Key technical patterns:
- `dragSnapToOrigin={true}` for failed throws that snap back
- `inertia` animation type for post-gesture deceleration (the "flick and settle")
- `layoutId` for morphing card from pack to collection
- `useMotionValue` for real-time rotation tracking during drag

### PURUPURU IMPLICATION
The pack opening sequence should be: (1) Gesture to initiate (tear/swipe, not tap), (2) Element signal before full reveal (Wuxing glow color), (3) Cards revealed one at a time with escalating pacing, (4) Rare cards get full ceremony (particle burst + sound stinger + screen dim), (5) Common cards are quick and satisfying, never punishing. (6) Post-reveal: "Open another?" with earned currency display.

---

## 6. The "Failure" Element in Pack Openings

### Why Micro-Failure Makes Success Sweeter

Gacha/loot box research reveals a critical design insight: **engineered near-misses activate the same brain regions as actual wins**. The striatum doesn't distinguish between "almost caught it" and "caught it" at the neurological level.

Key mechanisms:

**Visual Near-Miss Engineering**
- Modern games set the visual near-miss rate *independently* of the actual win rate.
- Players experience "almost winning" far more often than probability would produce.
- The slowdown before a gacha result, the reel behavior, the animation pacing -- all designed to maximize near-miss frequency.

**The Pity System (Failure as Progress)**
- Each failed pull feels like a step closer to guaranteed success.
- Dr. Aaron Drummond: "Pity systems reframe spending as saving. You're not losing; you're accumulating toward a goal."
- This creates a **commitment device** -- stopping feels like abandoning an investment.

**Superstition & Perceived Control**
- Skinner's pigeons developed rituals around random food delivery. Gacha players develop identical rituals (spinning the phone, tapping specific spots, "lucky" times to pull).
- This perceived control increases engagement even though it has zero mechanical effect.

### Ethical Design Boundary

There is a bright line between:
- **Meaningful friction** (the pokeball shake creates tension that makes catching feel earned)
- **Exploitative extraction** (loot boxes engineered to maximize spend through near-miss manipulation)

The difference: Does the player have genuine agency? Is the failure teaching something? Does the system respect the player's time and money?

### PURUPURU IMPLICATION
The pack opening CAN have a micro-failure moment -- but it should be about the CEREMONY, not the outcome. The outcome is already determined when the pack is purchased/earned. The failure should be in the gesture:
- Tear the wrapper too fast? Cards scatter and you collect them one by one (slower reveal, same cards)
- Flick too weakly? Card flutters back, try again (builds anticipation, same result)
- The "failure" affects the EXPERIENCE of the reveal, not the CONTENTS. This is the Pokemon Go model (bad throw = wasted pokeball, but the pokemon is still there) rather than the gacha model (failure = empty result).

---

## 7. Collection Completionism: Pokedex Design Patterns

### Why the Pokedex Works Better Than a Checklist

1. **Silhouettes**: Undiscovered pokemon appear as dark outlines. You know SOMETHING exists in slot #149. You don't know it's Dragonite. The mystery is the motivation.

2. **Chunked Progress**: Evolution families create natural sub-goals. Catching Bulbasaur means you're 1/3 of the way to completing the Bulbasaur line. Small wins within the larger collection.

3. **Regional/Biome Discovery**: Certain pokemon only appear in certain environments. This means your pokedex is a record of WHERE you've been, not just what you've collected. It encodes personal history.

4. **The 1% Layer**: Shiny variants (~1/500 encounter rate) create a parallel collection that only hardcore players pursue. It doesn't clutter the main collection view but adds infinite depth.

### Mapping to Card Collection

| Pokedex Pattern | Card Collection Equivalent |
|---|---|
| Silhouettes | Element-coded empty card slots (glow indicates element, shape indicates rarity tier) |
| Evolution chains | Wuxing combination paths (Fire + Earth = stronger card visible as locked node) |
| Regional exclusives | Season/event-limited variants |
| Shiny variants | Holographic/prismatic card variants (1/100 or 1/500) |
| Biome discovery | Element-specific booster packs or event locations |
| Candy economy (duplicates have value) | Duplicate cards = crafting essence for combinations/upgrades |

### The Completionism Trap to Avoid

Research warns: showing all 1,700 possible collectibles on day one creates futility. The pokedex works because it reveals incrementally. For purupuru:
- Show 5 element categories from the start
- Within each element, reveal card SLOTS only as adjacent cards are discovered
- "???" cards visible only when you've collected 3/5 of their generation cycle
- This creates a cascade: each discovery reveals the POSSIBILITY of more discoveries

### PURUPURU IMPLICATION
The collection view should be organized by Wuxing element (5 sections). Within each element, a generative cycle visualization shows which cards feed into which. Empty slots show element color glow and rarity tier silhouette. Duplicate cards convert to elemental essence. Combination paths are visible but locked until prerequisites are met. The "shiny" equivalent is a cosmetic variant with holographic treatment (Legends of Runeterra prismatic style). Collection percentage per element drives a mastery indicator, not just a number.

---

## 8. Web3 Collection Games: What Worked vs. What Was Exploitative

### What Actually Worked

**Gods Unchained** (Immutable zkEVM)
- 507% trading volume increase after moving to zkEVM (low fees matter)
- Players fuse in-game cards into tradable NFTs. Ownership feels real because it IS real.
- Weekly events, ranked ladders, seasonal content provide reasons to play beyond speculation.
- Key lesson: **the game must be good first, web3 second**.

**Sorare** (migrated to Solana)
- Fantasy sports + NFT cards tied to real athlete performance
- Card values reflect real-world outcomes, not just speculation
- Seasonal events and tournament prize pools maintain engagement
- Key lesson: **external validation** (real sports results) adds meaning to card values.

### What Was Exploitative

**Axie Infinity** (the cautionary tale)
- Play-to-earn model attracted players who didn't enjoy the game but needed income
- When token prices crashed, the "game" had no intrinsic value to retain players
- Scholar system was functionally labor extraction
- Key lesson: **if the only reason to play is the token, you don't have a game**.

### The Pattern

Games that achieved genuine collection satisfaction in web3 share these traits:
1. The game is fun WITHOUT the blockchain layer
2. Ownership adds value but isn't the core loop
3. Low transaction fees (zkEVM, Solana, L2s) eliminate friction
4. Community events create social reasons to play
5. Card values reflect skill/knowledge, not just speculation

### PURUPURU IMPLICATION
Build a game that is fun to play with no wallet connected. The Wuxing battle mechanic, the collection satisfaction, the pack opening ceremony -- all of these should work in a browser with zero web3 friction. Then layer ownership on top: "This card you pulled? It's yours. On-chain. Trade it, hold it, combine it." The blockchain should feel like a feature enhancement, not a prerequisite.

---

## 9. Synthesis: The Purupuru Design Principles

Based on all research, here are the core design principles:

### The Core Loop (Pokemon Go equivalent)
```
ENCOUNTER -> INTERACT -> UNCERTAINTY -> RESOLVE -> COLLECT -> DISCOVER
   (see pack)  (gesture)   (reveal)     (result)   (add)     (what's next?)
```

### The Micro-Interaction (Pokeball equivalent)
- **Gesture**: Drag-to-tear pack wrapper. Velocity and angle matter (skill expression).
- **Signal**: Element glow appears through the tear before cards are visible.
- **Reveal**: Cards emerge one at a time. Common = quick flip. Rare = slow rise with particle effects.
- **Uncertainty**: The element glow could indicate ANY card of that element. The rarity isn't known until the card fully emerges.
- **Celebration**: Scales to rarity. Common = subtle shimmer. Rare = screen dim + gold burst + sound stinger. Legendary = full ceremony.

### The Collection (Pokedex equivalent)
- 5 Wuxing elements, each with a sub-collection
- Silhouette slots for undiscovered cards (element glow + tier outline)
- Generative cycle visualization (Wood -> Fire -> Earth -> Metal -> Water -> Wood)
- Destructive cycle as battle mechanic (Water beats Fire, etc.)
- Duplicate cards = elemental essence for crafting/combining
- Holographic variants as the "shiny" layer

### The Octalysis Profile (target)
- **CD3 HIGH** (Creativity): Wuxing dual-cycle creates deep strategic deck building
- **CD4 HIGH** (Ownership): True on-chain ownership, card cosmetic investment
- **CD1 MEDIUM** (Epic Meaning): Wuxing lore, Ghibli aesthetic, APAC community mission
- **CD5 MEDIUM** (Social): On-chain collection display, community events, trading
- **CD7 MEDIUM** (Unpredictability): Pack opening randomness, encounter variety
- **CD2 LOW** (Development): Element mastery badges exist but aren't the focus
- **CD6 LOW** (Scarcity): Season variants exist but aren't predatory
- **CD8 MINIMAL** (Loss): No punitive mechanics. No expiring items. No streak breaks.

### The Data Play (Niantic/Local Guides equivalent)
- Card interactions = behavioral signal for Henlo ecosystem
- Which elements are popular? Which matchups are played? Which cards are traded?
- This is community intelligence, not surveillance
- The game must be fun independent of the data layer

### The Ethical Constraint
The "failure" in pack opening affects the CEREMONY, not the OUTCOME. Bad gesture = different reveal experience, same cards. This is the Pokemon Go model (bad throw = retry opportunity) not the gacha model (bad pull = empty wallet).

---

## Sources

- [Pokemon GO UX - Good Things from Bad UI](https://www.gamedeveloper.com/design/pokemon-go-and-the-good-things-that-can-come-from-a-bad-ui)
- [The UX of Pokemon Go - Trymata](https://trymata.com/blog/pokemon-go-ux/)
- [Pokemon Go UX Case Study - Pedro Almeida](https://medium.com/@pedro_ux/pok%C3%A9mon-go-a-case-for-ux-and-psychology-8b6377db573a)
- [Beyond the Hype: UX Reality Check - UXPin](https://www.uxpin.com/studio/blog/beyond-hype-ux-reality-check-pokemon-go/)
- [27 Game Techniques in Pokemon Go - Yu-kai Chou](https://yukaichou.com/gamification-analysis/pokemon-go/)
- [Octalysis Framework Complete Guide - Yu-kai Chou](https://yukaichou.com/gamification-examples/octalysis-gamification-framework/)
- [Niantic Large Geospatial Model](https://nianticlabs.com/news/largegeospatialmodel)
- [Niantic Training AI on Pokemon Go Data - Singularity Hub](https://singularityhub.com/2024/11/27/niantic-is-training-a-giant-geospatial-ai-on-pokemon-go-data/)
- [Pokemon Go AR Data for Robot Navigation - TechSpot](https://www.techspot.com/news/111690-pokmon-go-ar-data-has-turned-centimeter-accurate.html)
- [Niantic Plans LGM - Hacker News Discussion](https://news.ycombinator.com/item?id=42187494)
- [Pokemon Go Behavior Change Study - PMC/NCBI](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7281148/)
- [Pokemon Go Teardown - John Haag](https://medium.com/@john.haag/pok%C3%A9mon-go-a-teardown-1c15878be309)
- [Choreographed Emotion: Card Pack Opening UX - Adam Donkin / N3TWORK](https://medium.com/n3twork/choreographed-emotion-6-steps-to-a-great-card-reveal-ux-a6e6bb8487dd)
- [Collection Systems & Retention - GameRefinery](https://www.gamerefinery.com/attracting-and-retaining-players-with-collection-systems/)
- [The Pokedex Problem - Eric Turner](https://medium.com/@etthebrain/the-pok%C3%A9dex-problem-designing-features-people-use-9ff46df9249a)
- [Creating the Craving: Why Is There a Pokedex?](https://treasuresavvy.wordpress.com/2016/04/10/creating-the-craving-or-why-is-there-a-pokedex/)
- [Balatro Design Analysis: Visual Packaging - Medium](https://medium.com/@yyh19971004/balatro-design-analysis-visual-packaging-and-interactive-feedback-cc6fa6a65370)
- [Balatro's Cursed Design Problem - Mark Brown / GMTK](https://gmtk.substack.com/p/balatros-cursed-design-problem)
- [Hooking the Player on Juice: How Balatro Triggers Addictive Behaviour - SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5699302)
- [Balatro Power Fantasy Through Math - Kokutech](https://www.kokutech.com/blog/gamedev/design-patterns/power-fantasy/balatro)
- [Marvel Snap UI Design - Tiffany Smart](https://www.tiffanysmart.com/work/marvel-snap)
- [Marvel Snap UX Redesign - Curaxuan](https://curaxuan.com/game-ux-marvel-snap-ux-redesign/)
- [Marvel Snap Developer on Smart Card Game Design](https://www.gameshub.com/news/features/marvel-snap-designer-interview-kent-erik-hagman-smart-card-game-design-31692/)
- [Snappy UI: How Marvel Snap's UI Supports Success - ArtStation](https://www.artstation.com/artwork/GemNDd)
- [Gacha Mechanics in Video Game Design - Medium](https://medium.com/@milijanakomad/product-design-and-psychology-exploring-gacha-mechanics-in-video-game-design-1015511cf00c)
- [Loot Boxes, Gacha, and the Near-Miss Effect](https://geekvibesnation.com/loot-boxes-gacha/)
- [Behavioral Game Design - Gamedeveloper.com](https://www.gamedeveloper.com/design/behavioral-game-design)
- [Gamification Loyalty Programs: Google Local Guides](https://www.loyaltylevers.com/examples/gamification-loyalty-programs-google-local-guides-is-the-g.o.a.t)
- [Google Maps Local Guides Product Analysis - LinkedIn](https://www.linkedin.com/pulse/dissecting-google-maps-local-guides-feature-product-analysis-naik)
- [The Unboxing Ritual and the God of Anticipation - Medium](https://medium.com/@oskouioskoui/the-unboxing-ritual-and-the-god-of-anticipation-f27e071ab65f)
- [Motion for React (Framer Motion)](https://motion.dev/)
- [React Gesture Animations - Motion Docs](https://www.framer.com/motion/gestures/)
- [Framer Motion vs React Spring 2025](https://hookedonui.com/animating-react-uis-in-2025-framer-motion-12-vs-react-spring-10/)
- [Gods Unchained / Web3 Gaming - Influencer Marketing Hub](https://influencermarketinghub.com/nft-games/)
- [Best Web3 Games 2026 - BitDegree](https://www.bitdegree.org/crypto/best-web3-games)
- [WuXingRPS: Elemental Rock Paper Scissors](http://zerosalife.github.io/blog/2015/02/28/wuxingrps-elemental-rock-paper-scissors/)
- [My WuXing Card Game - BoardGameGeek](https://boardgamegeek.com/boardgame/205708/my-wuxing-card-game)
- [Elemental Rock-Paper-Scissors - TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Main/ElementalRockPaperScissors)

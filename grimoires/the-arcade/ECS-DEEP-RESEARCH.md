# ECS as Meta-Architecture: From Game Engines to Purupuru

> Deep research output. DIG mode (STAMETS). 2026-03-16.
> Context: purupuru card game + cross-domain ECS thinking.

---

## 1. ECS Fundamentals

### What It Is

Entity-Component-System separates a program into three things:

- **Entities** -- unique IDs. No data, no logic. Just an address.
- **Components** -- pure data that attaches to entities. Position, Health, Element, Rarity.
- **Systems** -- pure logic that processes entities matching a component query. MovementSystem processes everything with Position+Velocity. It never knows about HealthSystem.

The key sentence: **Systems are blind to each other.** They share no function calls, no imports, no direct references. They communicate only through the shared data layer (components on entities). A system reads components, transforms them, writes components. That is all.

### Why Game Studios Use It

**Cache performance.** Components of the same type are stored contiguously in memory (Structure of Arrays). When a PhysicsSystem iterates over 10,000 Position components, they sit next to each other in RAM. CPU cache lines stay hot. This is why Unity DOTS reports 50-100x speedups over their old MonoBehaviour OOP architecture.

**Composition over inheritance.** OOP game code always hits the diamond problem. Is a FireBreathingFlyingEnemy an Enemy that flies, or a FlyingCreature that's an enemy? ECS dissolves this: it's an entity with {Position, Health, AI, Flight, FireBreath} components. Add or remove any component at runtime. No refactoring.

**Parallelism.** Because systems declare what components they read/write, the scheduler knows which systems can run simultaneously. A RenderSystem (reads Position, reads Visual) can run in parallel with a ScoreSystem (reads BehaviorHistory, writes Score) because they touch no overlapping data.

**Small teams, massive scope.** V Rising (Stunlock Studios, ~40 people) built an open-world multiplayer survival game on Unity DOTS. Hardspace: Shipbreaker reported processes that took 1 hour dropped to 100ms after switching to DOTS. Highstreet Market scaled a VR MMO. The pattern is: ECS lets small teams build things that normally require AAA headcount.

### The Major Implementations

| Engine/Library | Language | Key Trait |
|---|---|---|
| Unity DOTS | C# | Production-proven, Job System + Burst compiler |
| Bevy | Rust | ECS-from-scratch, type-safe queries via function signatures |
| Flecs | C/C++ | Fastest open-source ECS, entity relationships, Flecs Script |
| Unreal Mass | C++ | Unreal's answer, large-scale simulations |
| id Tech (DOOM Eternal) | C++ | Shipped AAA on ECS |

### Why This Matters for Card Games

Card games are *exactly* the composition-over-inheritance problem. A Magic: The Gathering card can be Artifact+Enchantment+Creature simultaneously. Keywords (Flying, Haste, Trample) are components you add/remove. Effects are systems triggered by game events.

The article "Card Game Design as Systems Architecture" (critpoints.net) makes this explicit: card games are enterprise architecture problems. Types combine compositionally. Keywords act like methods granted to an entity via component attachment. The type system IS the component system.

A traditional OOP card game hits walls fast: CardBase -> CreatureCard -> FlyingCreatureCard -> FlyingCreatureWithTrampleCard. ECS: entity with {Creature, Flying, Trample} components. Add Haste? Just attach the component. Remove Flying? Detach it. No class hierarchy changes.

---

## 2. ECS State Machines

### State as Component

The dominant pattern in ECS is **component-as-state**: the state of an entity is defined by which components it currently has attached.

```
// Card states as components (conceptual)
InPack       -- card exists but is unrevealed
Revealed     -- card has been shown, has visual + element + rarity
InCollection -- card is in a player's collection
InDeck       -- card is slotted into a deck
InCraftSlot  -- card is staged for crafting sacrifice
Crafted      -- card was created via the craft ritual
Burned       -- card was consumed
```

A card entity starts with `{InPack, Ownership, Element}`. When the RevealSystem fires, it removes `InPack` and adds `{Revealed, Visual, Rarity, AnimationState}`. The CollectSystem only queries entities with `{Revealed, Ownership}`. The CraftSystem only queries entities with `{InCraftSlot, Element}`.

This is called **existence-based processing**: a system naturally filters to the right entities because it queries by component presence. No switch statements. No state enums. The *existence of a component IS the state*.

### Transition Patterns

**Inter-system communication via components.** Systems never call each other. System A creates a component (a "signal"), System B queries for that component and reacts. In purupuru terms:

1. MintSystem creates a Pack entity with `{PackToken, Ownership, Sealed}`
2. RevealSystem queries for `{PackToken, Ownership, Sealed}` where player has initiated reveal
3. RevealSystem removes `Sealed`, creates N Card entities with `{Revealed, Element, Rarity, Visual, Ownership}`
4. CollectSystem queries `{Revealed, Ownership}` -- automatically sees the new cards
5. CraftSystem queries `{InCraftSlot, Element}` when player stages cards
6. DisplaySystem queries `{Visual, AnimationState}` -- renders whatever exists

Each system is blind. RevealSystem doesn't know CollectSystem exists. It just transforms data. CollectSystem doesn't know where cards came from. It just indexes what has `{Revealed, Ownership}`.

### Bevy's Approach

Bevy (Rust) uses `seldom_state` for component-based state machines:

- A **state** is a component (e.g., `Idle`, `Wobbling`, `Opening`)
- A **trigger** checks a condition (e.g., `PlayerTapped`, `TimerExpired`)
- A **transition** links `From -> To` when a trigger fires
- The `StateMachine` component on an entity tracks transitions automatically

Bevy also lets you use `Added<MyState>` as a system filter -- when a state component is freshly attached, a system can react to the transition event. This is the "on_enter" equivalent without any state machine boilerplate.

### Hierarchical States

For complex entities (the puruhani creature), hierarchical FSMs help. The creature has coarse states (Idle, Wobbling, Opening, Celebrating) and fine states within each (Wobble_Phase1, Wobble_Phase2, Wobble_Resist). This maps to ECS as:

- Coarse state: `PuruhaniState` component with enum
- Fine state: sub-components (`WobblePhase`, `OpenProgress`) that only exist while in the parent state
- Systems that process fine states only run when coarse state matches

---

## 3. Agentic ECS

### HECATE: The Academic Bridge

The HECATE framework (arXiv 2509.06431, September 2025) is the first published work that formally maps ECS to multi-agent systems. Key findings:

- Agent concepts (Teams, Agents, Organizations -- the "TAO" model) map directly to ECS elements
- Both ECS and TAO embrace **separation of concerns**: ECS separates data (Components) and logic (Systems), TAO separates Agents, Roles, and Objects
- The ECS engine layer handles agent-to-agent communication, lifecycle management, and middleware interop
- Result: MAS development becomes accessible to distributed systems engineers without specialized agent knowledge

### How AI Agents Map to ECS

| ECS Concept | Agent Equivalent |
|---|---|
| Entity | An individual agent (or agent team) |
| Component | Agent capabilities, memory, current task, model config |
| System | Behavior loops: perceive -> reason -> act |
| World | The shared environment agents operate in |
| Query | "Find all agents with {CodeReview, TypeScript} capabilities" |

### Multi-Agent Coordination Through Components

In a multi-agent system modeled as ECS:

- Agents don't call each other. They write to shared components.
- Agent A writes a `TaskComplete{result}` component. Agent B's system queries for `TaskComplete` and picks up the work.
- This is exactly how Claude Code Agent Teams work: teammates report via SendMessage (write to shared state), lead coordinates (system that reads shared state).

### Constructs as ECS

The loa construct ecosystem already IS an ECS, just not named as such:

| Purupuru ECS | Construct ECS |
|---|---|
| Entity | A construct (k-hole, artisan, beacon) |
| Component | Skills, identity, composition metadata, capabilities |
| System | Agent invocations (skill execution, /implement, /review) |
| World | The grimoire state + .beads/ + .run/ |
| Query | "Find constructs with {model_tier: opus, danger_level: high}" |

Systems (skills) are blind to each other. /implement doesn't know about /review. They communicate through shared state (grimoires, beads, sprint artifacts). This is ECS.

---

## 4. ECS for Web Applications

### The React Connection

React's component model is NOT ECS, but there are deep parallels:

| React | ECS | Difference |
|---|---|---|
| Component | Entity + Visual component | React components are render+logic. ECS separates these. |
| Props/State | Components (data) | React state is colocated with render. ECS separates. |
| Hooks/Effects | Systems | React hooks run per-component. ECS systems run per-query. |
| Context | World (global data) | Similar: shared state accessible by any consumer |

The key difference: React couples data to rendering. ECS separates them entirely. A "Card" in React is a component that holds state AND renders. In ECS, "Card" is an entity, its data lives in components (Element, Rarity, Visual), and rendering is a system that queries {Visual, Position}.

### Libraries That Bridge the Gap

**Koota** (pmndrs/koota) -- the most promising React+ECS library:
- "Traits" instead of "Components" (avoids React naming collision)
- Traits are flat data schemas attached to entities
- Queries work like database queries -- filter entities by trait presence
- Full React hooks integration: `useQuery`, `useTrait`
- From the pmndrs collective (same team as Zustand, Jotai, React Three Fiber)

**Miniplex** -- developer-friendly ECS with React bindings:
- Entities are plain JavaScript objects
- Components are just properties on objects
- No built-in scheduling -- you bring your own (requestAnimationFrame, useFrame, etc.)
- `<ECS.Entities>` component auto-re-renders when entity queries change
- Used by douges.dev to simplify React Three Fiber game code

**BitECS** -- ultra-high performance:
- Typed arrays for everything
- Fastest JS ECS benchmarks
- Less ergonomic, more raw power
- Good for when you need 100k+ entities at 60fps

### Zustand Stores as ECS Components

Zustand already embodies ECS principles partially:
- Stores are separated by concern (authStore, cartStore, uiStore) -- like component types
- Selectors let consumers subscribe to specific slices -- like system queries
- No provider required -- like ECS world access
- But: Zustand stores don't compose on entities. Each store is global. ECS would let you attach a "cart" to a specific entity.

The bridge: use Zustand for global singletons (game settings, auth state) and Koota/Miniplex for entity-bound state (cards, packs, players, scores).

### The Reactive Data-Oriented Design (RDOD) Pattern

Already identified in the Operator OS research: React = Entities (render targets), Convex = Components (reactive data), Server Actions = Systems (mutations). This is ECS with web-native naming.

For purupuru specifically:
- **Convex documents** = entities with component data (card document has element, rarity, ownership fields)
- **Convex mutations** = systems (revealPack mutation processes pack entities)
- **React components** = DisplaySystem (renders entities matching a query)
- **Convex subscriptions** = reactive queries (automatically update when entity data changes)

---

## 5. ECS for Smart Contracts

### MUD (Lattice) -- On-Chain ECS for Ethereum

MUD is the most mature on-chain ECS framework. Built by Lattice for "Autonomous Worlds."

**Store** -- an alternative to Solidity's storage engine:
- Tables with schemas (like a relational database on-chain)
- Tables can be registered at runtime (unlike Solidity where storage layout is compile-time)
- Automatic event emission on every write (enables indexing)
- Packs data more tightly than native Solidity

**World** -- a smart contract kernel:
- Master contract that holds all state and logic
- Namespaced tables (`/purupuru/Cards`, `/purupuru/Packs`)
- Systems are stateless contracts that read/write through the World
- Access control: systems can only write to tables in their namespace
- Anyone can deploy new systems to an existing World (composability)

**How it maps**:
```
Entity     = A bytes32 key (tokenId, address, composite key)
Component  = A table row (Cards table: element, rarity, visual)
System     = A stateless contract (MintSystem, RevealSystem)
World      = The master contract (kernel)
```

MUD v2 moved beyond strict ECS to support arbitrary table schemas (not just entity-component pairs). This is important: you don't have to force everything into ECS. Tables can be relational.

**Key insight**: Store automatically emits events on every write, and the MUD indexer (similar to The Graph but purpose-built) syncs all state to clients. This means your frontend can subscribe to the full World state without custom indexers.

### Dojo (Starknet) -- Provable On-Chain ECS

Dojo is MUD's equivalent on Starknet, with an important addition: zero-knowledge proofs.

- `#[dojo::model]` macro for defining component schemas in Cairo
- World contract holds all state
- **Torii** indexer: automatic indexing of all model changes
- **Katana** sequencer: local development chain
- **Sozo** migration planner: deployment management

The provability angle matters: game logic is verifiable on-chain via STARK proofs. You can prove that a pack reveal was fair, that crafting consumed the right cards, that scores were computed correctly.

**Notable Dojo games**: Dope Wars, Influence, Realms, CafeCosmos, PixeLAW (won ETHGlobal Paris).

### The On-Chain ECS Insight for Purupuru

Even if purupuru doesn't use MUD or Dojo directly, the architectural pattern applies:

The three purupuru contracts (PuruPack ERC-1155, PuruCard ERC-721, PuruCrafting) ARE an ECS:
- **Entities**: tokenIds (pack IDs, card IDs)
- **Components**: on-chain metadata (element, rarity, ownership via ERC standards)
- **Systems**: contract functions (mint, reveal, craft, transfer)

The contracts don't need to know about each other's internal logic. PuruCrafting calls PuruCard.burn() and PuruCard.mint() -- it doesn't know how PuruCard stores metadata internally. This IS system isolation.

---

## 6. Purupuru ECS Architecture

### Entity Map

| Entity | What It Represents | Lifecycle |
|---|---|---|
| **Player** | A wallet address | Created on first interaction |
| **Pack (Puruhani)** | ERC-1155 token, a living creature | Minted -> Opened (burned) |
| **Card** | ERC-721 token, a revealed card | Born from pack -> Collected -> Maybe crafted (burned) |
| **Element** | Wood/Earth/Fire/Metal/Water | Singleton, never changes |
| **Deck** | Player-curated card grouping | Created -> Modified -> Displayed |
| **CraftSlot** | Staging area for 5 cards | Created -> Filled -> Consumed |
| **Score** | Behavioral intelligence output | Created -> Updated continuously |
| **Collection** | Aggregate of player's cards | Derived from ownership queries |

### Component Map

| Component | Attaches To | Data |
|---|---|---|
| **Ownership** | Pack, Card | {owner: address, acquiredAt: timestamp} |
| **Element** | Card, Pack, Player (affinity) | {type: Wood|Earth|Fire|Metal|Water} |
| **Rarity** | Card | {tier: Common|Mid|Rare|Rarest} |
| **Visual** | Card, Pack | {artUrl, artStyle, animationSet} |
| **Affinity** | Player | {scores: {wood: n, earth: n, ...}, primary: Element} |
| **BehaviorHistory** | Player | {actions: [{type, timestamp, context}]} |
| **AnimationState** | Pack, Card | {current: idle|wobble|open|flip|glow, progress: 0-1} |
| **InPack** | Card (pre-reveal) | {packId: tokenId} |
| **Revealed** | Card (post-reveal) | {} (tag component, no data) |
| **InDeck** | Card | {deckId, position} |
| **InCraftSlot** | Card | {slotIndex: 0-4} |
| **Sealed** | Pack | {} (tag -- removed on open) |
| **SetMembership** | Card | {sets: string[]} |
| **Position** | Card (in UI) | {x, y, z, rotation} |

### System Map

| System | Reads | Writes | Trigger |
|---|---|---|---|
| **MintSystem** | Player.Ownership | Pack{Sealed, Ownership, Element, Visual} | User mints a pack |
| **RevealSystem** | Pack{Sealed, Ownership} | Remove Pack.Sealed, Create Card{Revealed, Element, Rarity, Visual, Ownership} | User opens puruhani |
| **CollectSystem** | Card{Revealed, Ownership} | Collection (derived), SetMembership | Passive -- reacts to new cards |
| **CraftSystem** | Card{InCraftSlot, Element} (5x) | Burn source cards, Create Card{Crafted, Rarity:Special} | User confirms craft |
| **ScoreSystem** | Player.BehaviorHistory | Player.Affinity, Score | Background -- processes behavior |
| **DisplaySystem** | {Visual, AnimationState, Position} | AnimationState (progress) | Every frame (RAF) |
| **DeckSystem** | Card{InDeck}, Deck | Deck composition | User builds/modifies deck |
| **TransferSystem** | Card.Ownership | Card.Ownership (new owner) | ERC-721 transfer event |

### How Systems Stay Blind

**MintSystem** creates packs. It has no idea that RevealSystem exists. It writes `{PackToken, Sealed, Ownership, Element}` to the world and stops.

**RevealSystem** queries for `{PackToken, Sealed}` where `Ownership.owner == currentPlayer && reveal requested`. It finds packs to open. It doesn't know who created them, when, or why. It burns the pack, creates cards. Done.

**CollectSystem** queries for `{Revealed, Ownership}`. It doesn't know cards came from packs. It could index cards that were transferred from another player, cards from airdrops, cards from crafting. It just indexes what exists.

**CraftSystem** queries for `{InCraftSlot, Element}` groups of 5 with matching element. It doesn't know what "collecting" means. It burns and mints.

**ScoreSystem** reads `BehaviorHistory` and writes `Affinity`. It's completely read-only with respect to the game state. It never writes to cards, packs, or collections. It observes and scores. The dashed arrow in the architecture diagram means: it READS behavior, it never WRITES to the game loop.

**DisplaySystem** reads `{Visual, AnimationState}` and renders. It doesn't know about game logic at all. It renders whatever exists. A card, a pack, a creature -- if it has Visual and Position, it gets drawn.

### Kaironic Holds (Systems That Pause)

Three moments where the system deliberately pauses the pipeline:

1. **After Reveal**: "Sit with your cards." The RevealSystem completes, but the DisplaySystem holds an animation state that forces the player to see their cards before any other action is available. No immediate "craft" or "trade" buttons. Breathe.

2. **After Craft**: "Weight of sacrifice." Five cards were burned. The CraftSystem completes, the special card exists, but the DisplaySystem shows the absence before showing the reward. Loss is visible before gain.

3. **After Affinity Discovery**: "Self-discovery moment." When the ScoreSystem first computes a player's primary affinity, the DisplaySystem presents it as a revelation. Your element chose you -- you didn't choose it.

These are NOT system-level pauses. They are AnimationState component values that the DisplaySystem respects. The game logic is complete. The rendering holds.

### The Data Flow (No Function Calls Between Systems)

```
MintSystem writes Pack entities
    |
    v (Pack entities exist in the world)
    |
RevealSystem reads Pack entities, writes Card entities
    |
    v (Card entities exist in the world)
    |
CollectSystem reads Card entities, writes SetMembership
CraftSystem reads InCraftSlot entities, writes new Card entities
ScoreSystem reads BehaviorHistory, writes Affinity
    |
    v (all entities have Visual + Position + AnimationState)
    |
DisplaySystem reads everything with Visual, renders to screen
```

No arrows between systems. All arrows go through entities/components. This is the core ECS guarantee.

---

## 7. Cross-Domain Translation Table

The same pattern, different skins:

| Concept | Game Engine | Smart Contract | Web App | Construct Framework | Cognitive OS |
|---|---|---|---|---|---|
| Entity | GameObject | tokenId | React node | Construct (k-hole, artisan) | A project/task |
| Component | Transform, Rigidbody | ERC-721 metadata | Zustand slice | Skills, identity, capabilities | Context (what info is loaded) |
| System | PhysicsSystem | Contract function | Hook/Effect/Mutation | Skill invocation (/implement) | Mode (FEEL/ARCH/DIG/SHIP) |
| World | Scene | World contract (MUD) | App state | Grimoire + .run/ + .beads/ | The Arcade |
| Query | "all with Position+Velocity" | "all tokens with element=Fire" | useQuery, subscription | capability metadata routing | "what mode am I in?" |
| Blind isolation | Systems don't import each other | Contracts interact via interface | Stores don't import each other | Skills load their own SKILL.md | Modes make other concerns invisible |

The deepest insight: **the isolation is the feature, not the limitation.** Systems that can't see each other can't break each other. Modes that are invisible to each other prevent context-switching anxiety. Contracts that interact only through defined interfaces prevent storage corruption. This is safety through architecture, not discipline.

---

## 8. Practical Architecture Recommendations

### For Purupuru v0.1 (5-10 cards, direct mint)

Don't over-engineer. Use the ECS *mental model* without an ECS library:

- Convex documents are your entities (cards, packs, players)
- Convex schema fields are your components (element, rarity, ownership)
- Convex mutations are your systems (mint, reveal, collect)
- Convex subscriptions are your reactive queries (DisplaySystem)
- Zustand for transient client state (animation state, UI state)

This is RDOD (Reactive Data-Oriented Design). You get ECS benefits without ECS boilerplate.

### For Purupuru v0.2+ (pack opening, animation)

Consider Koota (pmndrs/koota) or Miniplex for the client-side entity management:
- Pack entities with wobble physics
- Card entities with flip/reveal animations
- Spring-based animation states as components
- DisplaySystem as a useFrame loop

### For On-Chain (if full decentralization matters later)

MUD v2 for EVM chains (Berachain is EVM-compatible). The Store + World pattern gives you:
- Runtime-extensible schemas (add card types without redeploying)
- Automatic indexing (no custom subgraph)
- Composability (anyone can build new systems on your World)

### What NOT to Do

- Don't use BitECS for a card game. It's for 100k+ entity simulations. Purupuru has hundreds of cards, not millions of particles.
- Don't build a custom ECS engine. Use the mental model with existing tools (Convex, Zustand, React).
- Don't force every piece of state into ECS. Authentication, routing, UI chrome -- these are singletons, not entities. Use Zustand or React state for them.
- Don't try to make systems literally blind in v0.1. The architectural discipline matters more than the literal implementation. When you write a Convex mutation, think "what components does this system read and write?" -- even if it's just a function, not an ECS system.

---

## Sources

### ECS Fundamentals
- [Entity Component System - Wikipedia](https://en.wikipedia.org/wiki/Entity_component_system)
- [ECS Architecture in Game Development - DaydreamSoft](https://www.daydreamsoft.com/blog/mastering-entity-component-system-ecs-in-game-development)
- [ECS FAQ - Sander Mertens](https://github.com/SanderMertens/ecs-faq)
- [ECS Design Pattern - UML Board](https://www.umlboard.com/design-patterns/entity-component-system.html)
- [Card Game Design as Systems Architecture - CritPoints](https://critpoints.net/2023/05/26/card-game-design-as-systems-architecture/)

### Game Engines & Performance
- [Unity DOTS / ECS](https://unity.com/ecs)
- [Bevy ECS Quick Start](https://bevy.org/learn/quick-start/getting-started/ecs/)
- [Flecs - Fast ECS for C/C++](https://github.com/SanderMertens/flecs)
- [V Rising, Hardspace: Shipbreaker case studies](https://blog.unity.com/engine-platform/games-focus-expanded-scale-for-ambitious-games)
- [Highstreet Market VR MMO with ECS](https://unity.com/resources/highstreet-market-scaled-vr-mmo-with-ecs-for-unity)

### State Machines
- [Managing States in ECS (FSM) - Behnam Rasooli](https://medium.com/@ben.rasooli/managing-states-in-entity-component-system-aka-finite-state-machine-8db8d19dec46)
- [FSM with Ash ECS - Richard Lord](https://www.richardlord.net/blog/ecs/finite-state-machines-with-ash)
- [seldom_state for Bevy](https://lib.rs/crates/seldom_state)
- [ECS and Game AI Techniques - Maxim Zaks](https://mzaks.medium.com/entity-component-system-and-game-ai-techniques-f439eb69b5d2)

### Agentic / Multi-Agent
- [HECATE: ECS-based Framework for Multi-Agent Systems](https://arxiv.org/abs/2509.06431)
- [Agentic AI Architecture - IBM](https://www.ibm.com/think/topics/agentic-architecture)
- [Multi-Agent Architectures Explained](https://medium.com/@iamanraghuvanshi/agentic-ai-7-multi-agent-architectures-explained-how-ai-agents-collaborate-141c23e9117f)

### Web / React
- [Koota - ECS for React (pmndrs)](https://github.com/pmndrs/koota)
- [Miniplex - Developer-friendly ECS](https://github.com/hmans/miniplex)
- [BitECS - Ultra-high performance JS ECS](https://github.com/kstgrd/bitECS)
- [Simplifying R3F with ECS - douges.dev](https://douges.dev/blog/simplifying-r3f-with-ecs)
- [ECS in Web Game Dev](https://www.webgamedev.com/code-architecture/ecs)

### On-Chain ECS
- [MUD Framework](https://mud.dev/)
- [MUD: An Engine for Autonomous Worlds - Lattice](https://lattice.xyz/blog/mud-an-engine-for-autonomous-worlds)
- [MUD v2 Data Model](https://mud.dev/store/data-model)
- [MUD World 101](https://mud.dev/world/world-101)
- [Dojo Framework on Starknet](https://dojoengine.org/framework)
- [On-Chain Gaming with Dojo - Starknet](https://www.starknet.io/blog/on-chain-gaming-starknet-dojo/)

### ECS Outside Games
- [Using ECS Outside Game Engines - Michael F. Bryan](https://adventures.michaelfbryan.com/posts/ecs-outside-of-games)
- [Data Oriented Design is Not ECS](https://yoyo-code.com/data-oriented-design-is-not-ecs/)

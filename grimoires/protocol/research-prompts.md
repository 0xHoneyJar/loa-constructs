# Deep Research Prompts for Protocol Construct

> For Gemini Deep Research — feed these individually for maximum depth.

---

## Prompt 1: Modern dApp UX — The 0.00001% Standard

```
Research the current state of the art in Web3 dApp user experience as of Q1 2026.
Focus exclusively on the top-tier consumer crypto products that set the standard:

**Primary references:**
- Uniswap (v4, Universal Router, frontend patterns)
- Aave (v3, GHO integration, governance UX)
- Family (wallet UX, transaction flow, social recovery)
- Mango/Drift (Solana DeFi, speed-optimized UX)
- Zora (NFT marketplace, mint UX, gas abstraction)
- Rainbow (mobile wallet, swap UX)
- Blur/OpenSea (marketplace UX evolution)

**Research questions:**
1. What frontend-to-contract consistency patterns do these apps use? How do they prevent the "UI says X, chain does Y" class of bugs?
2. How do they handle transaction lifecycle UX — pending, confirmed, reverted, replaced? What's the gold standard for error messages when transactions fail?
3. What BigInt/wei handling patterns are standard? Do they use custom formatters, or have viem/wagmi patterns settled?
4. How do they handle chain-switching, multi-chain states, and L2 bridging UX?
5. What wallet connection patterns are standard — RainbowKit, ConnectKit, AppKit? Which provides the best developer experience?
6. How do they handle gas estimation and gas-free/sponsored transactions?
7. What role does EIP-712 typed data signing play in modern dApp UX?
8. How do they handle contract upgrades from the frontend perspective — do they use proxy-aware patterns?

**Output format:**
For each app, provide:
- The specific pattern/technique used
- Code-level implementation detail where available (React hooks, viem patterns)
- Why this pattern is superior to alternatives
- Links to relevant source code or documentation

The goal is to extract the frontier patterns that should be codified into an AI agent construct for dApp development assistance.
```

---

## Prompt 2: Web3 Frontend Verification — Testing at the Chain Boundary

```
Research comprehensive testing and verification patterns for Web3 frontend applications as of 2026.

**Focus areas:**

1. **Foundry `cast` as a verification oracle:**
   - What are the standard `cast` commands for reading contract state from a frontend debugging perspective?
   - How do teams use `cast` for pre-deployment verification (staging vs mainnet)?
   - What's the state of `cast` integration with CI/CD pipelines?

2. **wagmi/viem testing infrastructure:**
   - Current best practices for testing wagmi hooks (useReadContract, useWriteContract, useSimulateContract)
   - Mock provider patterns — how do Uniswap, Aave, and others mock chain state in tests?
   - The vitest + wagmi test utils ecosystem — what's mature vs experimental?
   - How do teams test against forked mainnet state (anvil --fork-url)?

3. **ABI consistency tooling:**
   - How do teams prevent ABI drift between contract deploys and frontend?
   - What's the state of automatic ABI generation from verified contracts?
   - How do wagmi CLI generate types and how do teams validate them?
   - Contract address management across chains and environments

4. **E2E testing with wallets:**
   - Playwright + Synpress for wallet automation — current state?
   - How do teams test MetaMask/Rainbow/Rabby interactions in CI?
   - Mock wallet approaches vs fork-backed real wallets
   - Tenderly virtual testnets for E2E

5. **Cross-model/adversarial review for contract code:**
   - Do any teams use multi-LLM review for contract interaction code?
   - What patterns exist for automated security scanning of frontend-to-contract calls?
   - How does Trail of Bits testing handbook apply to frontend verification?

**Specific products to analyze:**
- Tenderly (simulation, virtual testnets)
- Foundry (cast, forge, anvil)
- Hardhat (testing patterns)
- Synpress (E2E wallet testing)
- oxlint (fast linting with Web3 rules — if any exist)

Output as a structured landscape with maturity ratings (experimental / growing / mature / standard).
```

---

## Prompt 3: Material Feel Applied to Transaction UX — Context-Dependent Interaction Design

```
Research how the "feel" of Web3 transaction experiences should vary based on the material personality of the application. The thesis: there is no single correct transaction UX — a cozy social app (soft, fluid, relaxed) and a DeFi trading terminal (sharp, immediate, dense) should feel fundamentally different, even when executing the same on-chain action.

**Core framework — Material as Feel:**

UI feel can be decomposed along these axes (from the Artisan construct's design system):
- **Warmth** — cold/clinical vs. warm/inviting
- **Weight** — lightweight/instant vs. heavy/consequential
- **Rhythm** — staccato/rapid vs. flowing/measured

These map to seven material dimensions:
- Spacing (tight/dense vs. generous/spacious)
- Color (muted/subtle vs. vibrant/bold)
- Typography (sharp/technical vs. soft/editorial)
- Motion (immediate/100ms vs. eased/300ms+)
- Density (packed information vs. breathing room)
- Corners (sharp/modern vs. rounded/friendly)
- Elevation (flat/minimal vs. layered/shadowed)

**Core references:**
- Raph Koster's "A Theory of Fun for Game Design" — fun as learning
- Emil Kowalski's interaction design principles — animation, motion, feedback
- "Game Feel" by Steve Swink — the experience of interacting with virtual objects
- Juice It or Lose It (GDC talk) — game feel through visual/audio/haptic feedback
- The concept of "physics of consequence" — heavier actions (financial, irreversible) should feel heavier in the UI

**Research questions:**

1. **Transaction feel varies by material:**
   - How should a swap feel in a cozy social wallet (think Calm app, Headspace — soft, fluid, ambient music, ease curves) vs. a pro trading terminal (Drift — sharp, immediate, dense, zero wasted space)?
   - What are the concrete CSS/motion differences? Compare: easing curves, duration, spacing around pending states, confirmation feedback
   - How do apps like Family (warm, rounded, generous spacing) vs. Blur (dense, sharp, dark, immediate) achieve their distinct material feels for the same fundamental action (sending a transaction)?
   - Can you find examples of apps that intentionally slow down interactions to create a feeling of weight or importance?

2. **Weight of consequence as physics:**
   - Irreversible actions (token approvals, large swaps, bridge transfers) should feel heavier than reversible ones (toggling settings, filtering)
   - Research: how do the best apps signal consequence through timing? (800ms pessimistic confirmation for deletes vs. 100ms optimistic for local state)
   - How does Stripe's payment confirmation UX create a sense of "this mattered" through motion and timing?
   - Compare the "weight" vocabulary: delete/destroy/revoke (heavy) vs. archive/dismiss/snooze (soft) vs. toggle/expand/collapse (light)

3. **Error states match the material:**
   - A reverted transaction in a cozy app should feel different from one in a trading terminal
   - Cozy: gentle explanation, warm colors, "let's try again together" energy
   - Terminal: immediate, precise error code, quick retry action, no hand-holding
   - How do you turn "insufficient gas" or "slippage too high" into guidance that matches the app's personality?

4. **Progressive disclosure tuned to density:**
   - Dense apps (Aave, Drift) can show gas settings inline — users expect information density
   - Spacious apps (Family, Rainbow) should hide complexity behind progressive reveal — the surface should feel calm
   - How do games introduce complex systems gradually? Apply to: gas settings, slippage, MEV protection
   - What should first-time vs. expert users see — and how does the app's material personality affect this threshold?

5. **Flow state and rhythm:**
   - Gloria Mark's research (UC Irvine): 23 minutes to refocus after interruption
   - Wallet popups, gas approvals, chain-switching all break flow — but the *cost* of breaking flow depends on the material. A meditative app suffers more from interruption than a rapid-fire terminal where users expect context switches.
   - What patterns minimize interruptions while maintaining security? (session keys, gas abstraction, batch transactions)
   - How do different material personalities handle the "waiting for confirmation" state? (Soft: gentle pulse, reassuring copy. Sharp: progress bar, ETA, block number.)

6. **Perceived performance is material-dependent:**
   - "Snappy" is not universally correct. A 200ms ease-out feels right for a trading app but rushed for a meditation app.
   - Optimistic updates: when are they appropriate (lightweight actions) vs. inappropriate (consequential transactions where false confidence is dangerous)?
   - How do apps like Family achieve "feels right" (not "feels fast") UX on a 12-second block time chain?

**Output format:**
For each research question, provide findings organized by material personality:
- **Soft/Cozy** (e.g., Calm, Headspace, Family, Rainbow) — generous, warm, fluid
- **Sharp/Dense** (e.g., Drift, Blur, Aave) — tight, immediate, information-rich
- **Premium/Minimal** (e.g., Uniswap, Stripe, Linear) — spacious, confident, restrained

Include concrete CSS/motion values, easing curves, and timing where possible. The goal is to produce a material-indexed reference that an AI construct can use to adapt its dApp development guidance based on the target application's personality.
```

---

## Prompt 4: The dApp Development Landscape — Standards, Frameworks, and Emerging Patterns

```
Map the complete dApp frontend development landscape as of Q1 2026.
Focus on what a senior developer would need to know to build a production dApp today.

**Stack layers to cover:**

1. **Frameworks**: Next.js 15 (App Router, RSC for Web3), Remix, Vite + React
   - Which framework is winning for dApps? Why?
   - How do RSC and server actions interact with wallet state?

2. **Chain interaction libraries**: viem, wagmi, ethers.js v6
   - Current market share and trajectory
   - viem vs ethers: has the migration settled?
   - wagmi v2 patterns — what's standard now?

3. **Wallet connection**: RainbowKit, ConnectKit, AppKit (WalletConnect), Privy
   - Which abstractions are winning?
   - Social login + embedded wallets — Privy, Dynamic, Magic
   - Account abstraction (ERC-4337, ERC-7702) impact on connection UX

4. **Indexing/data**: The Graph, Envio, Goldsky, Ponder
   - Real-time indexing patterns for responsive UX
   - How do modern dApps handle historical data queries?

5. **Transaction management**: Transaction lifecycle, batching, session keys
   - EIP-5792 (wallet capabilities) — adoption status
   - Smart accounts (Safe, Kernel, Biconomy) — frontend patterns
   - Gas sponsorship/paymaster integration

6. **Security tooling**: Slither, Mythril for contracts → what about frontend?
   - Frontend security scanning specific to Web3
   - Supply chain attacks on Web3 frontends (Ledger Connect Kit incident)
   - Content Security Policy patterns for dApps

7. **Emerging standards:**
   - ERC-7702 (account abstraction upgrade)
   - EIP-6963 (multi-wallet discovery)
   - x402 (HTTP payment protocol)
   - CAIP-25 (multi-chain session management)

For each layer, rate:
- Maturity: Experimental → Growing → Mature → Standard
- Recommendation: "Use this now" vs "Watch this space"
- Key decision: What's the fork-in-the-road choice?

The output should be a landscape map that an AI construct can reference when advising developers building new dApps.
```

---

---

## Prompt 5: Ecosystem-Aware Verification — Shared Toolkit Adoption Auditing

```
Research how mature engineering organizations enforce adoption of internal shared libraries
and patterns across multiple codebases. The specific context: an ecosystem of 4+ production
Web3 dApps that share wallet boundary utilities (chain guards, receipt handlers, error
classifiers, gas estimators) via manual propagation (copy-paste, not npm package). The
patterns are battle-tested but adoption is inconsistent — some features use them, others
bypass them entirely.

**Core problem statement:**
The right patterns exist. They were forged in production debugging. But new features ship
without wiring them in. The gap isn't "what pattern should I use?" — it's "which write paths
forgot to use the pattern that already exists?"

**Research questions:**

1. **Internal consistency enforcement:**
   - How do companies like Stripe, Airbnb, Uber enforce that all API call sites use their
     internal error handling wrappers rather than raw try/catch?
   - What tooling exists for "canonical utility adoption auditing" — verifying that declared
     shared utilities are used at every applicable callsite?
   - ESLint custom rules, Semgrep patterns, or architectural fitness functions — which
     approach works best for "every write path must route through useChainGuard"?
   - How does Google's monorepo tooling (Tricorder, Error Prone) enforce API usage patterns?

2. **Manifest-driven verification:**
   - Can a project declare a "shared toolkit manifest" (YAML/JSON) listing canonical
     utilities and their required usage contexts?
   - How would a static analysis tool consume such a manifest to produce coverage reports?
   - Precedent: architectural decision records (ADRs) + automated conformance checking
   - Compare: Nx enforce-module-boundaries, ArchUnit (Java), dependency-cruiser (JS)

3. **Cross-repository pattern propagation:**
   - When shared utilities live in multiple repos via copy-paste (not a shared package),
     how do teams detect divergence?
   - Git-based approaches: subtree, template repos, scaffolding tools
   - Content-hash comparison for detecting when a shared utility has been modified in
     one repo but not others
   - How do microservice teams at Netflix/Spotify maintain consistency across 100+ repos?

4. **The adoption gap problem:**
   - Research on why developers bypass available abstractions (unfamiliarity, time pressure,
     feature-local thinking, the abstraction not fitting the new use case)
   - What organizational/tooling patterns close this gap? (PR checks, architecture reviews,
     linting, automatic suggestions)
   - How do teams measure "coverage" of internal utilities? (analogous to test coverage
     but for pattern adoption)

5. **Web3-specific considerations:**
   - wagmi v2 hooks vs raw viem calls — how do teams enforce "use the codegen hooks, not
     manual writeContract"?
   - Chain guard enforcement: the hook exists but 50% of write paths bypass it — this is
     the exact problem. What tooling catches this?
   - EIP-5792 batch transactions changing the single-write assumption — how do manifests
     evolve when the primitive changes?
   - Account abstraction (ERC-4337) changing gas estimation and tx confirmation patterns —
     how do shared utilities adapt?

**Output format:**
Structured as a tooling landscape:
- Category (static analysis, CI enforcement, architectural fitness, organizational)
- Specific tool or pattern
- Maturity rating (experimental / growing / mature / standard)
- Applicability to the "shared wallet utility adoption" problem specifically
- Implementation complexity (trivial / moderate / significant)

The goal is to identify the most practical approach for Protocol v2.0 to evolve from
"generic best practice scanner" to "ecosystem-aware adoption verifier."
```

---

*These prompts are designed for Gemini Deep Research sessions. Each should take 15-30 minutes of deep research. The outputs will be ingested into the Protocol construct as domain context files under `contexts/base/`.*

Style of Music:
Dark tribal ceremonial house at 118 BPM with ancient stone percussion and crystalline harmonics. [deep analog sub-bass], [inharmonic crystal resonance], [lithophone hits — stone struck with stone], [whispered icy female vocals as spectral texture]. Key of D minor. [clean mix, high fidelity, wide stereo, massive cavernous reverb 4-6s decay]. Ritualistic, underground, driving but heavy — every beat has the weight of carved rock. [dub delays flickering across stereo field], [dusty tape hiss riding the mix], [distorted feedback tails on crystal frequencies]. Melancholy underneath the intensity. Ancient machinery at full operation.

Exclude:
pop structure, major key, acoustic guitar, bright synths, neon, generic EDM drops, sidechained pumping, vocal chops, standard drum kit, snare rolls, orchestral, strings, brass, cheesy buildup risers, happy, uplifting, choir, spoken word, world music cliches

Lyrics (Custom Mode):
[Instrumental with whispered vocal textures only]
[Production: Massive cave reverb, dub delays, tape warmth, vinyl dust, wide stereo, sub-bass in chest]
[Vibe: Ancient underground ritual, tribal ceremonial house, D minor, 118 BPM, intense reverent weight]

[Intro: 40 Hz sub-bass pulse emerges from deep silence — felt before heard. Dusty vinyl crackle and tape hiss establish the aged medium. A single devastating stone percussion hit — lithophone, the transient of rock on rock — rings out into 6-second cave reverb. The space itself is audible. 4 bars of weight and architecture.]

[Build: Driving tribal percussion enters — not standard drums. Stone on stone, copper on copper, metallic and ceremonial. Swung groove at 118 BPM but every hit lands like a ritual strike on a carved altar. Deep sub-bass locks underneath. Crystalline harmonics begin breathing — inharmonic overtones, mineral resonance, not clean synth pads.]

[Verse: Whispered female vocals — icy, spectral, intimate. Not words — ancient syllables breathed through stone channels. A keeper's echo reverberating through carved passages. Dub delays scatter the whispers across the stereo field into the distance. Tribal percussion drives underneath. The bass holds everything to earth. Sparse and intimate.]

[Chorus: Full intensity — crystal harmonics surge upward, stone percussion doubles its weight, whispered vocals layer into haunted overlapping harmonies. Distorted feedback tails ring from the crystal frequencies and decay into the cave reverb. The underground space is ALIVE and PULSING. Not a drop — continuous ascending pressure. Darker pads swell underneath. The ritual at peak ceremony.]

[Breakdown: Half the percussion vanishes. Just sub-bass, one stone hit per bar, whispered vocals alone in the massive reverb. Intimate. Dub delays flickering in the far distance like light in tunnels. The vault breathing. Then crystalline harmonics rebuild one overtone at a time — each new frequency a new channel of light activating.]

[Final: Everything returns heavier. The groove intensifies. Whispers become three layered voices in the stone. Bass descends into sub-frequencies — pressure in the chest. Ancient machinery at full operational capacity. Then the groove begins to disintegrate — each percussion hit losing energy, reverb tails stretching longer, the rhythm half-speeding into melancholic analog echoes. The whispers fade last. The sub-bass sustains. Still pulsing. Never truly silent.]



  Cinematic dark ambient in D Dorian at 65 BPM, built from crystalline modal resonance and
  geological sub-bass drone, Cavernous stone reverb with 6-second decay tails, Wide stereo
  field with sparse copper mechanism clicks panning slowly, Sub-bass sine at 40-60 Hz
  pulses on a slow 4-second breathing cycle matching bioluminescent crystal, No percussion
  no rhythm only geological patience, Verses are near-silence with a single mineral
  harmonic at 150 Hz breathing in and out, distant water drip dissolving into massive
  reverb, Mid-section introduces upper crystal overtones at 600 Hz and 940 Hz one by one
  like channels of light activating in carved stone, inharmonic partials not clean
  intervals, A faint warm amber-toned mid-range tone enters beneath the crystal harmonics
  the only warmth in cold stone, Final section all harmonics sustain together in a single
  resonant chord that slowly recedes leaving just the sub-bass hum and the breathing
  crystal and the weight of the chamber above you, Ideal for ancient underground vault idle
   state post-discovery, fully instrumental, seamless loop, evolving textures, drone, slow,
   ambient, deep, reverent

  The logic: your login prompt is E Phrygian (the b2 creates tension/dread — you're
  approaching something unknown). Once inside, it shifts to D Dorian — the raised 6th
  replaces dread with dim hope. The breakbeat drops away entirely. You already crossed the
  threshold. Now you're standing still inside the machine and it's breathing around you.

  The login has ritual tribal beat and oppressive verses. The interior has zero percussion
  — only geological pulse. The contrast IS the vault door opening. You went from
  approaching to arrived.


# Session 1 — apHive Treasury Frontend

> A treasury dashboard for apDAO's $APIARY accumulation vehicle. Built on sovereign stack. Hypha provides the domain brain.

## Context

El Capitan (apDAO) needs a frontend for apHive — a Dedicated Asset Treasury (DAT) forked from YeetStrategy/YAT. The smart contract deployment is turnkey (Apiary team handles it). We just need the frontend.

apHive is a ring-fenced treasury that compounds 100% of yield as $APIARY. No carry, no management fee, no revenue share. Event fees (1% issuance, SDA redemption) cover ops costs, remainder converts to iBGT backstop reserve. The flywheel: seed $APIARY → earn PoL yield → backing grows → bonds attract capital → repeat.

**Stack constraint**: $10/mo sovereign stack. SvelteKit + Convex/Turso + Railway. Vanilla wallet. No Dynamic Labs. No Next.js.

**Reference**: YeetStrategy at yeetstrategy.com/treasury (Next.js dashboard with MNAV, composition, redemption windows). We're building something better on a lighter stack.

## Load Order

1. `grimoires/the-easel/specs/kickoff-aphive.md` — this file (architecture + build sequence)
2. Hypha context files (install construct) — Berachain PoL mechanics, Apiary protocol, apDAO governance
3. `grimoires/artisan/taste.md` — design tokens (oklch, spacing, typography)
4. Any moodboard artifacts from the existing easel session

## Persona

FEEL mode (Artisan) for UI work. Protocol construct for contract verification. Install Hypha for domain knowledge.

## Constructs to Install

| Construct | Why |
|-----------|-----|
| **hypha** | Domain knowledge — PoL mechanics, $APIARY, BGT, apDAO governance. Agent speaks Berachain. |
| **artisan** | UI design specs, taste tokens, animation patterns |
| **protocol** | Smart contract verification — verify frontend against deployed YAT contracts |
| **rosenzu** | Navigation design — treasury has rooms (dashboard, deposit, redeem, backstop) |
| **the-arcade** | The flywheel IS a core loop — progressive disclosure of treasury mechanics |

## Architecture

### Data Sources (On-Chain Reads via viem)

| Data | Source | How |
|------|--------|-----|
| Treasury value (USD) | Treasury contract | Read asset balances, multiply by price feeds |
| Share token supply | apHive token contract | `totalSupply()` |
| NAV per share | Computed | `Treasury Value / apHive Supply` |
| MNAV | Computed | `Fully Diluted Market Cap / Treasury Value` |
| Treasury composition | Treasury contract | Enumerate held assets + balances |
| Redemption window | SDA contract | Current state (open/closed), next window timestamp |
| iBGT backstop reserve | Treasury contract | iBGT balance in backstop address |
| $APIARY price | DEX pool or oracle | Current market price |
| Bond price (if active) | Bond market contract | Current SDA price, capacity remaining, decay rate |

### Rooms (Rosenzu)

| Room | Route | What it shows |
|------|-------|---------------|
| **The Hive** | `/` | Dashboard — MNAV, NAV/share, treasury value, composition, flywheel status |
| **The Gate** | `/deposit` | Deposit flow — approve → deposit → receive apHive shares |
| **The Window** | `/redeem` | Redemption — SDA mechanics, current window status, burn shares → receive underlying |
| **The Reserve** | `/backstop` | iBGT backstop — reserve balance, growth over time, PoL yield earned |
| **The Ledger** | `/history` | Transaction history, issuance events, redemption events |

### Smart Contract Interfaces

Based on YeetStrategy reference:

```
// Treasury (holds assets)
treasury.totalValue() → uint256       // Total USD value
treasury.assets() → address[]         // List of held tokens
treasury.balanceOf(asset) → uint256   // Per-asset balance

// Share Token (apHive)
apHive.totalSupply() → uint256
apHive.balanceOf(user) → uint256
apHive.deposit(amount) → uint256      // Returns shares minted
apHive.redeem(shares) → uint256       // Returns assets received (during window)

// SDA Redemption
sda.isActive() → bool
sda.currentPrice() → uint256
sda.capacityRemaining() → uint256
sda.timeUntilExpiry() → uint256
```

**Note**: Exact contract interfaces need verification once Apiary team deploys. Use Protocol construct `/contract-verify` after deployment.

### Tech Stack

| Layer | Choice | Cost |
|-------|--------|------|
| Framework | SvelteKit 5 (runes) | $0 |
| Wallet | Vanilla EIP-6963 (from sprawl pattern — 340 lines) | $0 |
| Chain reads | viem (direct, no wagmi) | $0 |
| Styling | Tailwind v4 + oklch tokens | $0 |
| Data | On-chain reads only (no database needed for V1) | $0 |
| Hosting | Railway (adapter-node) | $5/mo |
| Price feeds | CoinGecko or DEX pool reads | $0 |
| **Total** | | **$5/mo** |

No database needed for V1. All data is on-chain. If we add historical tracking later, Turso embedded replica on the same Railway instance.

## What to Build (in order)

### 1. Project scaffold

```bash
bun create svelte@latest aphive-interface
# Select: SvelteKit, TypeScript, Tailwind
```

Install: `viem`, `@sveltejs/adapter-node`

Create the vanilla wallet module (copy from sprawl-protocol/interface pattern — `src/lib/wallet.svelte.ts`). EIP-6963 discovery + Coinbase Smart Wallet.

### 2. Contract config (`src/lib/contracts.ts`)

Define contract addresses and ABIs for treasury, apHive token, SDA. Start with placeholder addresses — update after Apiary team deploys.

Berachain mainnet config: chain ID 80094, RPC from public endpoints.

### 3. Dashboard room (`src/routes/+page.svelte`)

The main view. Four metric cards at top:
- **Treasury Value** — total USD in the DAT
- **NAV / Share** — what one apHive token is worth
- **MNAV** — market cap to NAV ratio (above 1.0 = premium)
- **apHive Supply** — total shares outstanding

Below: treasury composition breakdown (pie or bar — $APIARY %, BGT %, iBGT %, stables %)

Below: flywheel visualization — the reflexive loop as a simple diagram showing the compound cycle

### 4. Deposit room (`src/routes/deposit/+page.svelte`)

- Input: amount of BERA or $APIARY to deposit
- Preview: shares you'll receive (based on current NAV)
- Action: approve → deposit (two transactions, or atomic if Smart Wallet)
- Confirmation: shares received, new NAV

### 5. Redeem room (`src/routes/redeem/+page.svelte`)

- Status: is redemption window open? Next window in X days
- If open: input shares to burn, preview underlying you'll receive
- SDA mechanics: current auction price, discount from NAV
- Action: burn shares → receive underlying

### 6. Backstop room (`src/routes/backstop/+page.svelte`)

- iBGT reserve balance
- Growth chart (if historical data available)
- PoL yield earned by the reserve
- Status: accumulation-only (no activation triggers yet per governance)

### 7. Layout + navigation (`src/routes/+layout.svelte`)

Top bar: apHive logo, wallet connect button, MNAV badge
Bottom nav (mobile): Dashboard, Deposit, Redeem, Backstop
Sidebar (desktop): same items, expanded

## Design Rules

These apply to every component:

- **oklch color space** — no hex, no rgb. Define a honey/amber palette.
- **Tabular numbers** — all financial data uses `font-variant-numeric: tabular-nums` with monospace font
- **No border-radius on data** — financial data cards are sharp. Rounded corners only on interactive elements (buttons, inputs)
- **Hierarchy via weight, not color** — primary metrics large + bold, secondary metrics smaller + lighter
- **Motion**: spring animations for number changes (MNAV updating). No decorative animation.
- **Mobile-first** — 375px baseline. Bottom nav. Touch targets 44px minimum.
- **Dark default** — treasury dashboards are dark mode. Light mode optional later.

## What NOT to Build

- No auth system (wallet IS identity)
- No database (all data is on-chain for V1)
- No historical charts (V2 — needs indexer or Turso)
- No bond purchasing UI (separate concern, V2)
- No admin panel (Beekeepers use multisig directly)
- No notification system
- No social features

## Verify

```bash
bun dev          # Local dev server
bun run build    # Production build
bun run preview  # Test production build locally
```

Check:
- [ ] Wallet connects on Berachain mainnet
- [ ] Treasury value reads from contract
- [ ] NAV/share computes correctly
- [ ] MNAV displays (needs market cap data)
- [ ] Deposit flow: approve → deposit → shares received
- [ ] Redeem flow: window status → burn → receive underlying

## Key References

| Topic | Source |
|-------|--------|
| Berachain PoL mechanics | Hypha: `grimoires/loa/context/berachain-core.md` |
| Apiary protocol | Hypha: `grimoires/loa/context/protocols.md` |
| apDAO governance | Hypha: `grimoires/loa/context/apdao.md` |
| YeetStrategy reference | `yeetstrategy.com/treasury` |
| apHive proposal | apGPXX (in kickoff context) |
| Vanilla wallet pattern | `sprawl-protocol/interface/src/lib/wallet.svelte.ts` |
| Convex-Svelte adapter | `sprawl-protocol/interface/src/lib/convex.svelte.ts` |
| Design tokens | `grimoires/artisan/taste.md` |
| SDA mechanics | Bond Protocol docs (bondprotocol.finance) |
| Haiku declarative txns | `docs.haiku.trade/haiku` (research only — evaluate, don't commit) |

## Haiku (Research Note — Do Not Build Yet)

El Capitan flagged Haiku's declarative transactions as a potential unlock. The value: compress multi-step treasury operations (stake → compound → rebalance) into one atomic transaction. One signature instead of many.

**Evaluate after V1 ships.** Risks: single vendor dependency, pricing power shifts to Haiku, execution alpha commoditized. Benefits: massive UX simplification for Beekeeper ops.

For now, build standard viem transaction flows. If Haiku proves reliable, swap the execution layer later without changing the UI.

## Endowment Math

This frontend costs $5/mo to run on Railway. A $1,200 endowment at 5% yield covers it forever. apDAO's treasury can fund this from a rounding error.

# apHive Treasury Dashboard — UI Reference Research

> Research agent output. References: blur.io, strategy.com, DeFi treasury dashboards.
> Date: 2026-03-31

---

## 1. Blur.io — What Makes It Feel Fast

### Speed Architecture
- **15 updates/minute** on listing data — near-real-time price feeds without full WebSocket overhead
- **Pending transaction display in <1 second** — optimistic UI shows state before chain confirmation
- **10x faster sweeping** than competitors — batch operations reduce round-trips
- **Bulk listings and sweeping** — post or acquire many NFTs in one transaction, eliminating repetitive steps

### Visual Speed Cues
- **Dark-first (hacker black, ~`#080404`)** — reduces perceived weight, makes data feel lighter and faster
- **Orange accent (`#ff8700`)** as sole primary — one hot color = one focal path, no visual decision fatigue
- **Monospace font (Proto Mono)** — fixed-width characters make price columns scan instantly; numbers align vertically without effort
- **Color-coded delta columns**: green (`#ade25d`) for gains, orange/red (`#f95200`) for losses — pattern recognition without reading values
- **Glowing text-shadow on key metrics** (`text-shadow: 0px 0px 10px`) — draws eye to performance numbers (floor price, volume)
- **Minimal animation** — hover states use color fills and subtle shadow (`box-shadow: 0px 5px 30px rgba(255,197,132,0.3)`), NOT transitions that add perceived latency

### Data Density Techniques
- **Trader View vs Collector View toggle** — traders get charts + bid walls + rarity; collectors get larger images. Same data, different density
- **Sticky column headers** — scroll through hundreds of items without losing context
- **Alternating row hover (`rgb(23,23,23)`)** — subtle, not striped; preserves dark uniformity while aiding row tracking
- **Horizontal scrolling carousels** for trending collections — maximizes content density, reduces vertical scroll fatigue
- **Depth chart / bid wall visualization** — shows bid volume at various price levels, transparency into market structure

### Keyboard & Batch Patterns
- Bulk selection for sweep operations
- One-click sweep with configurable max spend
- Toggle between views without page reload
- Search bar with real-time filtering (inline, not modal)

### Key Takeaway for apHive
Blur feels fast because it **eliminates visual noise** and **reduces interaction steps**. Every pixel serves the trader's workflow. The dark theme isn't aesthetic — it's functional: high contrast on the data that matters, suppression of everything else.

---

## 2. Strategy.com — Treasury Data Display

### KPI Framework (Novel for Treasury)
Strategy invented a crypto-native reporting framework that maps directly to apHive's needs:

| KPI | Definition | apHive Equivalent |
|-----|-----------|-------------------|
| **BTC Yield** | % increase in BTC holdings over period (like ROIC but for accumulation) | BGT Yield — % increase in BGT holdings relative to capital deployed |
| **BTC Gain** | Absolute BTC added to holdings | BGT Gain — absolute BGT accumulated |
| **BTC $ Gain** | Dollar value of BTC acquired at time of acquisition | BGT $ Gain — USD value at acquisition |
| **Bitcoin per Share** | Total BTC / outstanding shares (crypto-native NAV) | BGT per Token — NAV backing per governance token |
| **mNAV** | (Market Cap + Debt - Cash) / crypto holdings value | mNAV — market premium/discount to treasury value |
| **Total Holdings** | Aggregate BTC on balance sheet — "the north star" | Total Treasury — aggregate protocol holdings |

### Visual Patterns from MSTR Trackers

**bitcoinisdata.com/mstr/ (best reference):**
- **Dual-axis interactive chart**: BTC price (orange, `#E67E22`) + cumulative holdings (blue, `#0A66C2`) on same timeline
- **Logarithmic price axis** for wide value ranges + **linear balance axis**
- **Purchase indicators**: purple circles sized proportionally to acquisition amounts, overlaid on chart
- **Halving markers**: vertical bars at significant protocol events
- **Number formatting**: prices at 2 decimal places (`11,682.85`), balances as rounded integers (`21,454`)
- **Click-and-drag zoom** + double-click reset
- **Hover tooltips** on purchase markers showing acquisition details
- **Responsive**: mobile disables range selector, prompts landscape for charts

**saylortracker.com:**
- Real-time corporate tracking with NAV premium calculations
- Cost basis performance metrics
- Role-based access (subscription tiers show different data density)
- Interactive charts with filtering

### Key Takeaway for apHive
Strategy's KPIs are **directly translatable** to DeFi treasury reporting. The framework of Yield + Gain + NAV gives investors three levels of understanding: efficiency, absolute growth, and market premium. The dual-axis chart pattern (price overlay on holdings) is the gold standard for treasury visualization.

---

## 3. Best-in-Class DeFi Treasury Patterns

### DefiLlama Treasury Rankings (Industry Standard)
- Sortable table with treasury composition breakdown
- Stablecoin vs native token allocation visibility
- Real-time TVL tracking across 500+ protocols
- Revenue / fees / volume as secondary metrics

### Design Principles from Fintech Research

**Data Hierarchy:**
- Hero numbers (total treasury value) prominently sized at top
- Units placed close to values — no ambiguity
- Supporting details (composition, yield) secondary
- Color-coded composition charts (pie/donut) for instant allocation reading

**Progressive Disclosure:**
- Top level: total value, key KPIs (3-5 numbers max)
- Second level: composition breakdown, time-series charts
- Third level: individual transaction history, detailed analytics

**Real-Time Feedback:**
- Loading indicators and progress animations for each data section independently
- Error states with clear recovery messages
- Confirmation animations on successful transactions

**Trust-Building:**
- Verification badges, security cues on sensitive actions
- Human, transparent microcopy (not legalese)
- Full account details hidden by default, revealed on demand

---

## 4. Specific Techniques for apHive Implementation

### Number Formatting
```
Total Treasury:    $12,847,293.42    (2 decimal, thousands separator)
BGT Holdings:     1,234,567          (integer, thousands separator)
BGT Yield:        +14.7%             (1 decimal, sign prefix, color-coded)
BGT per Token:    0.00834            (5 decimal for small per-unit values)
mNAV Premium:     +23.4%             (1 decimal, sign prefix)
Daily Change:     ▲ $47,291 (+0.37%) (arrow glyph + absolute + percentage)
```

**Rules:**
- Tabular/monospace figures for all numeric columns — `$1,111.00` same width as `$8,888.00`
- Green for positive, red/orange for negative — but use oklch color space, no opacity
- Sign prefix always shown on delta values (`+14.7%`, not `14.7%`)
- Locale-aware formatting with consistent decimal precision per metric type

### Loading Skeletons
- **Shimmer-from-structure** pattern: skeleton mirrors actual component layout at runtime
- **Independent loading states** per section — treasury value can load before composition chart
- **Pulse shimmer** for cards, **wave shimmer** for table rows
- **Number countup animation** (200-400ms ease-out) when real data replaces skeleton — gives sense of "data arriving"
- Never show stale data without indicator — use subtle opacity reduction + "updating..." microcopy

### Chart Types for Treasury
| Data | Chart Type | Interaction |
|------|-----------|-------------|
| Treasury value over time | Area chart (filled, gradient) | Hover for point values, click-drag zoom |
| Asset composition | Donut chart (not pie) | Hover for segment details, click to filter |
| Yield / KPI trends | Sparklines inline with KPI cards | Tooltip on hover |
| Purchase history | Timeline with proportional markers | Click for transaction details |
| NAV premium/discount | Line chart with zero-line reference | Highlight zones above/below NAV |
| Delegation/vault allocation | Stacked bar or treemap | Click to drill into vault |

### Dark Mode Specifics
- Background: near-black (`oklch(12% 0.01 260)` range), NOT pure black
- Surface cards: slightly elevated (`oklch(16% 0.01 260)`)
- Text primary: off-white (`oklch(92% 0 0)`), NOT pure white
- Text secondary: muted (`oklch(60% 0 0)`)
- Accent: single hot color (orange for blur feel, or apDAO brand color)
- Chart colors: saturated against dark bg — dark mode makes colors pop
- Borders: subtle (`oklch(22% 0.005 260)`), 1px, not heavy

### Keyboard-First Patterns (from Blur + Signals Observatory)
- `J/K` for row navigation in tables
- `Enter` to expand/drill into selected item
- `Esc` to collapse/go back
- `?` for shortcut reference overlay
- `Cmd+K` for command palette (search vaults, filter by asset, jump to metric)
- Tab groups for switching between dashboard sections

---

## 5. Synthesis: What apHive Should Steal

### From Blur
1. **Single accent color** on dark background — makes the interface feel fast and focused
2. **Monospace/tabular numbers** in all data columns — instant vertical scanning
3. **Trader/Detail view toggle** — power users get density, casual users get clarity
4. **Optimistic UI** — show pending state immediately, confirm async
5. **Minimal animation** — hover states only, no transition delays that feel sluggish
6. **Sticky headers** — always know what column you're reading

### From Strategy
1. **KPI framework** — Yield + Gain + NAV as the three pillars of treasury health
2. **Dual-axis timeline chart** — holdings + value on same chart is the canonical treasury viz
3. **Purchase/event markers** overlaid on charts — protocol actions visible in context
4. **Per-share/per-token NAV** — the single number investors care most about

### From DeFi Best Practices
1. **Progressive disclosure** — 3 levels of detail, hero numbers first
2. **Independent loading states** — each section loads when ready
3. **Composition donut** — asset allocation at a glance
4. **Sparklines in KPI cards** — trend without a dedicated chart
5. **Click-drag zoom on time series** — let users explore without a date picker

### Anti-Patterns to Avoid
- Gradients and glows on data elements (pretty but slow-feeling)
- Animated number tickers that loop (distracting, not informative)
- Too many chart types on one page (cognitive overload)
- Modal-heavy interactions (breaks flow for traders)
- Pure black backgrounds (eye strain in long sessions)
- Proportional fonts in number columns (misaligned values = slow scanning)

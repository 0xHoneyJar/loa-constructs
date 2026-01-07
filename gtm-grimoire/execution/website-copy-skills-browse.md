# Website Copy: Skills Browse Page

**Route**: `/skills`
**Target Audience**: Users discovering and browsing skills
**Tone**: Scannable, filterable, keyboard-first
**Generated**: 2026-01-03

---

## Page Header

### Headline
```
Skills
```

### Subheadline
```
Browse available skills across all packs.
```

---

## Search & Filter Bar

### Search Input
```
Placeholder: Search skills...
Shortcut hint: Press / to search
```

### Filter Dropdowns

**Category Filter**
```
Label: Category
Options:
  - All Categories
  - GTM & Marketing
  - Development
  - Security
  - DevOps
  - Documentation
```

**Tier Filter**
```
Label: Tier
Options:
  - All Tiers
  - Free
  - Pro
```

**Sort Options**
```
Label: Sort by
Options:
  - Most Popular
  - Newest
  - A-Z
  - Most Downloads
```

---

## Skills List

### Skill Card Format

```
┌─────────────────────────────────────────────────────────────┐
│ → analyzing-market                               [GTM] [PRO]│
│   Research market size, competitors, and customer profiles  │
│   Part of: gtm-collective • 1.2k installs                   │
└─────────────────────────────────────────────────────────────┘
```

### Card Elements

```
Arrow indicator: → (hover state)
Skill name: analyzing-market
Category badge: [GTM]
Tier badge: [PRO] (if premium)
Description: One-line summary
Pack reference: Part of: {pack-name}
Install count: {count} installs
```

---

## Skill List Items

### GTM Collective Skills

```
→ analyzing-market                                 [GTM] [PRO]
  Research market size, competitors, and customer profiles
  Part of: gtm-collective • 1.2k installs

→ positioning-product                              [GTM] [PRO]
  Define positioning, messaging, and value propositions
  Part of: gtm-collective • 1.1k installs

→ pricing-strategist                               [GTM] [PRO]
  Develop pricing strategy with tiers and psychology
  Part of: gtm-collective • 980 installs

→ crafting-narratives                              [GTM] [PRO]
  Create launch announcements and release communications
  Part of: gtm-collective • 890 installs

→ educating-developers                             [GTM] [PRO]
  Plan DevRel strategy and content calendar
  Part of: gtm-collective • 850 installs

→ building-partnerships                            [GTM] [PRO]
  Identify partnership opportunities and integrations
  Part of: gtm-collective • 720 installs

→ translating-for-stakeholders                     [GTM] [PRO]
  Transform technical docs into executive presentations
  Part of: gtm-collective • 680 installs

→ reviewing-gtm                                    [GTM] [PRO]
  Comprehensive GTM strategy review and quality check
  Part of: gtm-collective • 650 installs
```

---

## Empty States

### No Results
```
No skills found for "{query}"

Try:
• Checking your spelling
• Using fewer filters
• Browsing all skills

[Clear Filters]
```

### No Skills Available
```
No skills available yet.

Check back soon or create your own.

[Create a Skill]
```

---

## Pagination

```
Showing 1-20 of {total} skills

[← Previous]  Page {n} of {total}  [Next →]
```

Or infinite scroll with:
```
Loading more skills...
```

---

## Keyboard Navigation

### Help Text (Status Bar)
```
j/↓ down   k/↑ up   Enter view   / search   1-9 jump   g top   G bottom
```

### Behavior

```
j or ↓     Move to next skill
k or ↑     Move to previous skill
Enter      Open skill detail page
/          Focus search input
1-9        Jump to nth skill on page
g          Go to first skill
G          Go to last skill
Escape     Clear search / close modal
```

---

## Skill Detail Modal (Optional)

When user presses Enter on a skill:

```
┌─────────────────────────────────────────────────────────────┐
│  analyzing-market                                     [×]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Research market size, competitors, and ideal customer      │
│  profiles for product positioning.                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Part of: gtm-collective                                    │
│  Version: 1.0.0                                             │
│  Installs: 1,234                                            │
│  Tier: Pro                                                  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Outputs:                                                   │
│  • gtm-grimoire/research/market-landscape.md                │
│  • gtm-grimoire/research/competitive-analysis.md            │
│  • gtm-grimoire/research/icp-profiles.md                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [View Pack]            [Install: loa pack-install gtm...] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Filter Tags (Active Filters)

When filters are applied:

```
Showing: [GTM ×] [Pro ×]  [Clear All]
```

Clicking × removes that filter.

---

## Category Badges

```
[GTM]       - Go-to-market & marketing
[DEV]       - Development & coding
[SEC]       - Security & auditing
[OPS]       - DevOps & deployment
[DOC]       - Documentation
[DATA]      - Data & analytics
```

---

## Tier Indicators

```
[FREE]      - Available to all users
[PRO]       - Requires Pro subscription
```

---

## Loading State

```
┌─────────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ Loading skills...                                           │
└─────────────────────────────────────────────────────────────┘
```

Or skeleton cards:

```
┌─────────────────────────────────────────────────────────────┐
│ ████████████████████                           ████  ████   │
│ ███████████████████████████████████████████████████████     │
│ ██████████████████ • ████████████                           │
└─────────────────────────────────────────────────────────────┘
```

---

## SEO Metadata

### Title
```
Skills | Loa Registry
```

### Description
```
Browse AI agent skills for Claude Code.
GTM, security, DevOps, and more. Install with one command.
```

---

*Generated via /translate for indie-developers*

# TDR-007: Bazaar Discovery — Walk Through It

**Status:** Accepted
**Date:** 2026-03-13
**Context:** Constructs Network explorer (constructs.network)
**Decision Maker:** soju
**Builds on:** TDR-002 (Breathability), TDR-004 (Subtraction Arc)
**Governed by:** Vocabulary Bank (tier system), The Arcade (progressive disclosure)

---

## Context

The explorer had three competing search surfaces: a Cmd+K modal, a SearchTrigger component in the catalog body, and a `/` keyboard shortcut hint. Three versions of the same action. Vocabulary Bank Move 2: "Don't fill the gap between the anchors."

The registry has 23 constructs. That's not a number that requires search infrastructure. You can scan 23 things. The question wasn't "how do we build search?" — it was "how do we want people's first contact with the network to feel?"

## Decision

### The Bazaar Pattern

You don't search a bazaar. You walk through it and something catches your eye.

The catalog table IS the discovery surface. 23 constructs fit on one page. Category filters narrow by domain (browsing, not searching). Construct detail pages have "composes with" edges that create browsing trails — one construct leads to the next. The graph at `/explore` gives spatial navigation for those who want to see the whole network at once.

Cmd+K exists as an invisible power tool for developers who know the shortcut. It is not surfaced in the UI. No search bar. No search icon. No hint. When someone needs it, they'll find it — and finding it will feel like discovering a shortcut in a game, not being handed a manual.

### The Tier System (from Vocabulary Bank)

Search is classified as **Tier 3 (Reserved)** — it exists in the system but is NOT deployed in the UI.

```
T3 (Reserved)    → Cmd+K exists, no visible affordance
                    deploy when the registry outgrows a single-page scan
T2 (Earned)      → visible Cmd+K hint in the header
                    when usage data shows people need it
T1 (Established) → prominent search surface
                    when constructs exceed ~100 and browsing breaks down
```

The promotion trigger is NOT a calendar date. It's behavioral evidence: when the catalog page's scroll depth data or the Cmd+K usage rate shows that people are failing to find what they need through browsing alone.

### Discovery Modes Served

| Mode | Surface | Visible? |
|------|---------|----------|
| **Direct** ("I want Observer") | URL, Cmd+K | Cmd+K invisible |
| **Intent** ("I need security") | Cmd+K (text match) | Invisible |
| **Browse** ("What exists?") | Catalog table, category filters | Primary surface |
| **Compose** ("What pairs with this?") | Detail page edges, graph | Visible on detail |
| **Ambient** (didn't come looking) | Landing page table | Default experience |

### What Was Removed

- `SearchTrigger` component from landing page body
- `CatalogSearch` visible search bar from catalog page
- Skills count from catalog cards (failed the Vocabulary Bank test: "Can someone who has never used your product picture what this word means?")
- Install counts from catalog cards (vanity metric, not operational signal)
- Type badges and internal badges from catalog cards (noise in the glance tier)

### What Stays

- Cmd+K modal (invisible, keyboard-invoked)
- `/` shortcut as Cmd+K alias
- Category filters on catalog page (browsing, not searching)
- "Composes with" edges on detail pages (trail-based discovery)
- Graph at `/explore` (spatial navigation)

## Alternatives Considered

### A: Prominent Search Bar (npm pattern)
Search bar at the top of every page. Privileges "I know what I want" users. Rejected — prescribes a discovery methodology. The bazaar doesn't have a search bar.

### B: Cmd+K Hint in Header (Linear pattern)
Subtle `⌘K` in the nav. Discoverable but quiet. Rejected for now — even a hint prescribes "search is a thing here." Reserved for T2 promotion.

### C: Inline Filterable Table (Terminal pattern)
Type anywhere on the catalog page to filter. The page responds to input like a terminal. Interesting but only works on the catalog page, not site-wide.

## Consequences

- New visitors discover constructs by scanning, not searching. The landing page table is the first impression.
- Power users (developers) will discover Cmd+K through muscle memory. This is our audience.
- When the registry grows past ~50 constructs, we'll need to revisit. The promotion trigger is behavioral data, not a guess.
- The catalog page can now breathe — no search bar competing for attention.
- Mobile users have no search affordance. Category filters + browsing is their path. This is acceptable at 23 constructs.

## The Deeper Principle

From the resonance profile: *"bazaar over mall."*

A mall has a directory. A search kiosk. Clearly marked aisles. You find exactly what you came for and leave. A bazaar has density, friction, and social ritual. You walk through it. You discover things you didn't know you needed. The person at the next stall tells you about the person three stalls down.

The "composes with" edges on detail pages ARE the person at the next stall. The category filters ARE the neighborhoods of the bazaar. The graph IS the view from above — the map you earn after you've walked through it yourself.

We're not building a directory. We're building a bazaar.

---

*the loudest person in the bazaar knows the least.*

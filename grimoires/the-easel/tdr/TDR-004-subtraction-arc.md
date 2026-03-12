# TDR-004: The Subtraction Arc

**Status:** Accepted
**Date:** 2026-03-11
**Context:** Constructs Network explorer (constructs.network)
**Decision Maker:** soju
**Builds on:** TDR-001 (Typography), TDR-002 (Breathability), TDR-003 (OKLCH Lineage)

---

## Context

the explorer didn't arrive at its current state through addition. it arrived through subtraction. the git log tells the story of a UI that started by adding things, then spent most of its life removing them.

the arc, traced through commits:

```
3df60fa3  feat: Basement Grotesque display font, unified navbar, Cmd+K search, left-aligned hero
5c1cd4b6  feat: skills.sh-inspired leaderboard homepage with prominent search
4e092c5a  feat: strip navbar to logo + about — skills.sh minimal
4104cad2  fix: strip navbar chrome, tighten hero copy, kill auth CTA boxes
ef64de7d  fix: bazaar diagnostic — seed pipeline, search, identity layer, CSS
8a682ec8  fix: consolidate routes, search routing, CSS class bugs across explorer
13487304  fix: eradicate raw Tailwind palette — full OKLCH token purity
ffeccae5  feat: typography scale-up — bigger fonts across all public pages
```

the pattern: add → reference → strip → audit → consolidate → purify → scale.

what matters is not what was added. what matters is what survived.

## Decision

### Phase 1: Reference Collection (commits `3df60fa3` → `5c1cd4b6`)

the explorer started by absorbing references. Basement Grotesque from rektdrop's display font. skills.sh as a layout reference — the leaderboard pattern, prominent search. Cmd+K search from the Vercel/Linear convention. left-aligned hero from the "content, not center" philosophy.

every reference brought cargo. skills.sh brought a dense table layout and raw Tailwind grays. the display font brought tracking tokens (`tracking-display`, `tracking-impact`). the hero brought a subtitle that tried to explain what the network is.

at this point the explorer had everything. too much of everything.

### Phase 2: Subtraction (commits `4e092c5a` → `4104cad2`)

> "strip navbar to logo + about — skills.sh minimal"
> "strip navbar chrome, tighten hero copy, kill auth CTA boxes"

the first cuts. nav links reduced. auth CTAs removed from pages. chrome stripped. the subtitle tightened. the hero stopped explaining and started being.

this is the hardest phase. every element that was added had a reason. removing it means admitting the reason wasn't good enough. the auth CTA boxes ("Sign in to see internal constructs") had a logical purpose — but their visual weight said "you're missing something" to every anonymous visitor. the navbar chrome had a logical purpose — but it competed with the content for attention.

subtraction is not minimalism. minimalism removes things to look clean. subtraction removes things so the remaining things work better.

### Phase 3: Consolidation (commits `ef64de7d` → `8a682ec8`)

the bazaar diagnostic (`ef64de7d`) was the turning point. it wasn't a design pass — it was a reality check. the diagnostic found:

- two competing search implementations (GlobalSearch vs CommandPalette)
- 34 routes when the PRD designed 4 (scope drift, not regression)
- `has_identity` always false in list responses
- `verificationTier` hardcoded to `UNVERIFIED` in lists
- raw Tailwind palette mixed with OKLCH tokens

consolidation meant: pick one search, merge overlapping routes, fix the data layer so the UI has real information to display, and commit to one color system.

### Phase 4: The Current State

what survived the subtraction arc:

| Element | Why It Survived |
|---------|----------------|
| Basement Grotesque display font | Creates visual hierarchy that monospace alone cannot |
| Left-aligned hero | Content reads left-to-right. Center-aligning a title that's followed by left-aligned content creates a visual stutter |
| Cmd+K search | Universal convention. Zero learning cost |
| Install command (hero position) | The primary action. If someone came here to install, they see it immediately |
| Table layout (not cards) | Tables respect column alignment. Cards scatter the eye. For a registry/catalog, tabular data is the honest format |
| `<Disclosure>` (not tabs) | Shows the outline. Users scan section titles before deciding what to open |
| Semantic badge variants | Color-as-meaning, not color-as-decoration |
| 3-tier progressive disclosure | Glance → Scan → Deep Read respects the reading intent gradient |

what didn't survive:

| Element | Why It Was Cut |
|---------|---------------|
| Auth CTA boxes | Made anonymous visitors feel excluded |
| Navbar chrome (borders, shadows, blur) | Competed with content |
| Center-aligned hero | Visual stutter with left-aligned body |
| Card-based catalog | Scattered the eye across construct listings |
| Skills count in table headers (icons) | Visual noise — the number alone is the signal |
| Opacity-modified badge colors | Unpredictable on dark backgrounds |
| "The Open Agent Expertise Network" as sole subtitle | Explained what should be shown. Now the logo mark shows it |
| Dense stats row on detail page | Crammed 7 metrics into one line. Now a 4-column grid |

### Phase 5: Detail Page Refinement (current)

the construct detail page went through its own subtraction within the 3-tier architecture:

**Before:** Tier 1 contained name, version badge, type badge, verification badge, description, install command, 7-metric stats row, composes-with links, identity summary, and 5 link buttons. All above the first disclosure.

**After:** Tier 1 contains name, type badge, verification badge, description, install command, and a 3-item context line (category, version, graduation). Stats become a clean grid at the top of Tier 2. Links move to the bottom of Tier 2, after commands and skills — because secondary actions should come after the content they act on, not before.

the version badge moved from the name row (where it competed with the construct name for first-read attention) to the context line (where it serves as reference metadata).

## Alternatives Considered

### A: Additive refinement (keep everything, improve each piece)
Could have kept all elements and improved their individual design. Rejected — the problem was not the quality of the pieces. It was the quantity. When everything is present, nothing is prominent.

### B: Complete redesign
Could have started from scratch with a new layout. Rejected — the DNA was correct (OKLCH, monospace, left-aligned, disclosure-based). The organism just had too many organs.

### C: Feature flags for progressive rollout
Could have gated new elements behind flags and A/B tested. Rejected — with 14 constructs and a small creator community, statistical significance is impossible. Trust the taste, not the test.

## Consequences

- The explorer has fewer elements than it had 10 commits ago, but feels more complete
- Every surviving element earns its space by answering one of three questions: "what is this?", "how do I get it?", or "what does it contain?"
- The subtraction arc is a repeatable pattern: add → reference → strip → audit → consolidate → purify → scale
- Future additions must survive the subtraction test: "if we remove this, does the page get worse?"

## Evidence

commit count tells the story: 8 `feat:` commits added things. 14 `fix:` commits removed, consolidated, or purified things. the ratio is roughly 2:1 subtraction-to-addition. that's the right ratio for a UI that's finding its shape.

> "perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away." — saint-exupery. overquoted because it's true. the explorer is not perfect but it is trending in the right direction.

---

*Created following The Easel's TDR template. Gecko provenance: `git log --oneline -40 -- apps/explorer/` commit trail analysis.*

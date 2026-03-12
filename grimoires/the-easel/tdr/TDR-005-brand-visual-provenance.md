# TDR-005: Brand Visual Provenance

**Status:** Accepted
**Date:** 2026-03-11
**Context:** Constructs Network explorer (constructs.network)
**Decision Maker:** soju
**Builds on:** TDR-003 (OKLCH Chromatic Lineage), TDR-004 (Subtraction Arc)

---

## Context

the constructs network had no visual mark. the word "Constructs" in Basement Grotesque was the entire brand identity. every other piece of the ecosystem — MCV interface, MIDI interface, rektdrop — had the horse. the horse and "LOA" wordmark originated in mcv-interface at `/public/moneycomb/logo-bone.svg` (horse + LOA, 455x155) and `/public/moneycomb/ridden-bone.svg` (horse + RIDDEN BY LOA, 1085x393).

the horse crossing from product layer (moneycomb vaults) into the platform layer (constructs network) is not decoration. it's provenance. it says: this network has an origin. the same hands that built the vaults built the bazaar.

the decision to bring the marks in was triggered by the explorer reaching visual maturity — after OKLCH purity (TDR-003), after subtraction (TDR-004), after the typography and breathing room were settled. you don't put a mark on something that's still finding its shape. you put a mark on something that knows what it is.

## Decision

### Horse Mark (Watermark)

The horse silhouette extracted from `logo-bone.svg` into `horse-mark.svg` — just the five path elements, no text. Used as a CSS mask watermark behind the hero section.

**Placement:** Left side, vertically centered, partially off-screen (`-translate-x-1/4`). The horse faces into the content, not away from it.

**Technique:** CSS `mask-image` with solid OKLCH background fill (`oklch(0.35 0.005 80)`). Not an `<img>` with opacity. The mask approach means:
- The color comes from the OKLCH system, not from the SVG's hardcoded `#C7C0BF`
- No opacity modifier needed — the lightness value IS the subtlety
- The mark inherits the void family's warmth (hue 80) rather than being neutral gray
- Works in dark mode by definition (it IS dark mode)

**Why left:** The hero content is left-aligned. The horse on the left creates a layered depth effect — the mark is behind and beneath the text, establishing provenance without competing for attention. On the right, it would float in empty space with no relationship to the content.

### Logo Mark (Brand Signature)

The full `logo-bone.svg` (horse + "LOA" wordmark) rendered via CSS mask at two locations:

1. **Hero — above the title:** `h-5 sm:h-7`, OKLCH fill `oklch(0.55 0.01 80)`. Sits above "Constructs" as a brand attribution. The subtitle text "The Open Agent Expertise Network" returns below the title — the logo mark is identity, the subtitle is description. Both survive.

2. **Footer — both layouts:** `h-5 sm:h-6`, OKLCH fill `oklch(0.4 0.005 80)` (dimmer than hero). Centered above the stats line in the site footer, centered above the copyright in the marketing footer. The mark at the bottom closes the visual frame that the mark at the top opens.

**Technique:** Same CSS mask approach. The fill color is intentionally different between hero (0.55 lightness — visible but not dominant) and footer (0.4 lightness — present but receding). This creates a luminance gradient: the brand mark enters bright and exits dim, following the natural reading energy from top to bottom.

### What the Mark Is Not

- Not a clickable logo (the header "Constructs" text handles navigation home)
- Not a loading state indicator
- Not an illustration or hero image
- Not competing with the display font for primary attention

The mark is provenance. It answers "who made this?" without being asked.

## Alternatives Considered

### A: Inline SVG with `currentColor`
Could embed the SVG directly in JSX and use Tailwind text color classes. Rejected — the logo has multiple `<path>` elements that all need the same fill. `currentColor` works but requires wrapping in a colored container. CSS mask is cleaner and keeps the SVG as a static asset.

### B: `<Image>` with opacity
Could use `next/image` with `opacity-[0.04]` for the watermark. Rejected — (1) violates the no-opacity rule from TDR-002/003, (2) `next/image` doesn't pass CSS color context to SVGs using `currentColor`, (3) the SVG's hardcoded `#C7C0BF` fill would be a non-OKLCH color in the system.

### C: Horse on the right
Tested right-side placement. Rejected — the hero content is left-aligned, so the right side has variable empty space depending on viewport width. The horse floated disconnected from the content. Left placement creates layering with the text.

### D: Logo mark replacing the subtitle entirely
Initially implemented as a replacement for "The Open Agent Expertise Network". Revised — the logo mark is identity (who), the subtitle is description (what). They serve different functions. The mark goes above the title as attribution, the subtitle returns below as context.

### E: Ridden-bone (horse + "RIDDEN BY LOA")
The larger 1085x393 SVG with full "RIDDEN BY LOA" text. Rejected for the explorer — too much text, too specific to the MCV product context. The simpler horse + "LOA" mark is the correct abstraction for the network layer.

## Consequences

- The constructs network now has a visual mark that connects it to the broader Loa ecosystem
- Both footers carry the mark, creating visual consistency across route groups
- The CSS mask technique establishes a pattern for rendering SVG marks in the OKLCH system
- Future brand elements (if any) should follow the same pattern: SVG source → CSS mask → OKLCH fill
- The horse mark file (`horse-mark.svg`) uses `fill="currentColor"` and can be reused as an inline SVG component if needed later

## Provenance Map

```
mcv-interface/public/moneycomb/logo-bone.svg    (origin — horse + LOA)
mcv-interface/public/moneycomb/ridden-bone.svg   (extended — horse + RIDDEN BY LOA)
    ↓
apps/explorer/public/logo-bone.svg               (copied — hero + footer brand mark)
apps/explorer/public/horse-mark.svg              (extracted — horse silhouette only, watermark)
    ↓
app/(site)/page.tsx                              (hero: logo above title, horse left watermark)
components/layout/footer.tsx                     (site footer: logo centered above stats)
app/(marketing)/layout.tsx                       (marketing footer: logo centered above copyright)
```

the mark traveled from product to platform. that's the direction things should flow — artifacts proven in production earn their place in the network.

---

*Created following The Easel's TDR template. Gecko provenance: asset lineage from mcv-interface, commit trail for brand integration.*

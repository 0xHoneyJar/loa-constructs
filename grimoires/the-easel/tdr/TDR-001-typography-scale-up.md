# TDR-001: Typography Scale-Up

**Status:** Accepted
**Date:** 2026-03-12
**Context:** Constructs Network explorer (constructs.network)
**Decision Maker:** soju

---

## Context

The explorer app shipped with a compressed typography scale optimized for "terminal aesthetic" — Geist Mono at sizes as small as 9px. Monospace fonts already carry a readability penalty vs proportional faces. Combining that with sub-12px sizes creates an app where important information is invisible.

In 2026, people do not read small text. The terminal aesthetic must survive a readability audit. A CRT can whisper — but it can't be inaudible.

## Decision

Scale all text up by one tier across the entire public-facing UI. The vocabulary anchor: **legible at arm's length on a 14" laptop.**

### Scale Map

| Old Class | Old px | New Class | New px | Role |
|-----------|--------|-----------|--------|------|
| `text-[9px]` | 9 | `text-[11px]` | 11 | Badges (graduation, type, visibility) |
| `text-[10px]` | 10 | `text-xs` | 12 | Labels, captions, kbd hints |
| `text-[11px]` | 11 | `text-sm` | 14 | Nav links, interactive elements |
| `text-xs` | 12 | `text-sm` | 14 | Descriptions, secondary text |
| `text-sm` | 14 | `text-base` | 16 | Body text, construct names, input text |
| `text-base` | 16 | `text-lg` | 18 | Logo wordmark |
| `text-2xl` | 24 | `text-3xl` | 30 | Page titles |
| `text-4xl/5xl` | 36/48 | `text-5xl/6xl` | 48/60 | Hero heading |

### Structural Changes

| Element | Old | New | Reason |
|---------|-----|-----|--------|
| Header height | `h-12` (48px) | `h-14` (56px) | Accommodate larger nav text |
| Footer height | `h-12` (48px) | `h-14` (56px) | Consistent with header |
| Nav gap | `gap-5` | `gap-6` | Breathing room for larger text |
| Search trigger | `px-1.5 py-0.5` | `px-2 py-1` | Touch target improvement |
| Install CTA | `px-4 py-2.5` | `px-5 py-3` | More prominent call to action |

### What Stays Small

- Graph node labels (`text-[10px]`): Spatial labels in WebGL/SVG context need to be small to avoid overlap. The graph is a visualization, not a reading surface.
- Dashboard internal tables: Functional UI behind auth — density is appropriate for power users.

## Alternatives Considered

1. **Increase base font-size in CSS** — would cascade to all shadcn components unpredictably. Rejected.
2. **Use proportional font for body text** — breaks the terminal identity. The Calm Temple aesthetic requires monospace everywhere. Rejected.
3. **Only scale hero and headers** — leaves body text at 14px monospace which is still tight. The whole scale needed to shift. Rejected.

## Consequences

- Entire public-facing UI is one tier larger
- Terminal aesthetic preserved — still monospace, still OKLCH, still 0px radius
- Hero section gains visual weight appropriate for a landing page
- Nav is scannable without squinting
- Badges remain the smallest elements but are now legible (11px vs 9px)
- Graph visualization exempted from the scale — spatial context has different rules

## Evidence

- Every major developer tool site (Linear, Vercel, Stripe docs) uses 14-16px body text
- Monospace fonts at equivalent sizes read ~15% slower than proportional — the scale-up compensates
- 9px text on a 2x Retina display renders as 4.5 physical pixels per em — below the legibility threshold for extended reading

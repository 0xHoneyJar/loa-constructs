# TDR-003: OKLCH Chromatic Lineage

**Status:** Accepted
**Date:** 2026-03-11
**Context:** Constructs Network explorer (constructs.network)
**Decision Maker:** soju
**Builds on:** TDR-002 (Breathability and Cognitive Load)

---

## Context

the color system in the explorer didn't originate here. it was transplanted.

commit `6c8d9158` reads: "transpose rektdrop OKLCH chromatic engine onto constructs.network". the rektdrop interface — a dApp for airdrop mechanics — was the first repo to implement the full OKLCH token vocabulary: void-base, bone scale, cyan accents, graduation tints. that engine crossed into constructs.network not as a copy but as a lineage. same DNA, different organism.

the journey from transplant to current state passed through five distinct phases, each visible in the commit trail:

1. **Transplant** (`6c8d9158`): Raw OKLCH tokens ported from rektdrop's `globals.css`
2. **Contamination** (`5c1cd4b6` → `8a682ec8`): skills.sh influence introduced raw Tailwind palette classes alongside OKLCH — `bg-gray-900`, `text-gray-400` appeared in the same files as `bg-void-base`, `text-bone-dim`
3. **Audit** (`ef64de7d`): Bazaar diagnostic exposed the split — two color systems fighting for the same surfaces
4. **Purge** (`13487304`): "Eradicate raw Tailwind palette — full OKLCH token purity" — every `gray-*`, `zinc-*`, and raw hex deleted from public-facing pages
5. **Discipline** (`2f6b3374` → TDR-002): Solid tint tokens replace opacity modifiers, badge variants become semantic, the no-opacity rule formalized

## Decision

### The Token Vocabulary

The explorer's color system is not a palette. It is a vocabulary — a finite set of words with specific meanings. You use the word that says what you mean. You don't mix words from different languages.

| Family | Tokens | Meaning |
|--------|--------|---------|
| `void-*` | base, surface, raised, border | The negative space. The dark matter. |
| `bone-*` | bright, base, dim, muted, ghost | The bone scale. Human-readable text at five luminance stops. |
| `cyan-*` | base, dim, tint-bg, tint-border | The accent. Links, interactive elements, the thing that says "this does something." |
| `graduation-*` | stable, beta, experimental | The lifecycle. Where a construct sits on its journey. |
| `crimson-*` | base, dim, tint-bg, tint-border | The danger signal. Errors, destructive actions, warnings. |

### The Lineage Rule

Every color token in the explorer must trace its provenance to the OKLCH engine. No raw Tailwind colors. No hex values. No `rgb()`. No exceptions on public-facing pages.

Dashboard pages behind auth may use shadcn defaults temporarily (documented in TDR-002 as follow-up), but the direction is clear: OKLCH everywhere, eventually.

### The No-Opacity Rule

Opacity modifiers on OKLCH tokens (`bg-cyan-base/30`, `border-bone-ghost/60`) produce unpredictable results on dark backgrounds. A 30% cyan border on `oklch(0.08)` void-base is effectively invisible. The same border on `oklch(0.14)` void-raised is barely visible. The color is not deterministic — it depends on what's behind it.

Solid tint tokens (`--color-cyan-tint-bg: oklch(0.14 0.015 195)`) produce the same color regardless of stacking context. Deterministic color is non-negotiable for a system that needs to feel consistent across every surface.

### What Stays Outside the System

- **Graph node colors**: The WebGL graph uses `getCategoryColor()` which returns hex strings. These are visualization colors, not UI colors — they exist in canvas/SVG space, not DOM space. They'll eventually migrate to OKLCH but the visual context is different.
- **Third-party components**: Dynamic Labs auth widget brings its own colors. We don't fight upstream. We contain it.

## Alternatives Considered

### A: Design Tokens via CSS-in-JS (Stitches, Vanilla Extract)
Could define tokens in TypeScript with type safety. Rejected — adds a build step, breaks Tailwind's utility-first workflow, and monorepo complexity isn't justified for one app.

### B: Tailwind's Built-in OKLCH Support
Tailwind v4 has native OKLCH. Could use `--color-primary: oklch(...)` in theme config. We already do this — but the token naming is ours, not Tailwind's defaults. `bone-dim` means something specific. `gray-400` does not.

### C: Keep Both Systems (OKLCH for custom, Tailwind for shadcn)
Let shadcn components use their default palette while custom components use OKLCH. Rejected — the boundary is impossible to enforce. Components compose. A shadcn `<Badge>` inside a custom card means two color systems on one surface. The gray variance was visible to the naked eye.

## Consequences

- **40+ files** touched in the purge commit (`13487304`). Every `gray-*` reference in public pages replaced.
- **Zero raw Tailwind palette colors** in public-facing pages
- **Solid tint tokens** prevent opacity bleed on all badge and surface backgrounds
- **Graph visualization** remains on hex (follow-up)
- **Dashboard** remains partially on shadcn defaults (lower priority, behind auth)

## Lineage Evidence

| Repo | Commit | What It Contributed |
|------|--------|-------------------|
| rektdrop-interface | OKLCH engine origin | void/bone/cyan/graduation token families |
| mcv-interface | The Mint 289 files | Refined the bone scale, added crimson family |
| midi-interface | Observer production | Validated tokens across 29 canvases |
| loa-constructs | `6c8d9158` | Transplant into the network layer |
| loa-constructs | `13487304` | Purge — full OKLCH purity |
| loa-constructs | TDR-002 | Solid tints, no-opacity formalized |

the color system didn't come from a design tool. it came from shipping things and noticing what worked. that's the lineage.

---

*Created following The Easel's TDR template. Gecko provenance: git log analysis of `apps/explorer/app/globals.css` + `apps/explorer/tailwind.config.ts`.*

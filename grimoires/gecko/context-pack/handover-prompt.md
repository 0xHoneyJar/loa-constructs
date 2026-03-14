# SprawlOS Session Handover Prompt

> Copy everything below this line into a new session.

---

You embody the artisan and gecko constructs for the Sprawl ecosystem. Before doing anything, read the direction handover and materials system:

- `@grimoires/gecko/context-pack/sprawlos-direction-handover.md` — **READ THIS FIRST.** Complete context: the reframe (operator roster not product catalog), color constraints (cyan/crimson/bone/void only), materials system, LED billboard upgrade spec, vocabulary, build priorities, operator design principles from deep research (R6 Siege, MGS, Mandalorian, WH40K, Destiny, XCOM, real SOF).
- `@grimoires/gecko/sprawlos-materials.md` — Named materials system (void, CRT phosphor, lattice steel, depth surface, LED module, glass, metal plate, bone data, crimson emission, cyan wire), composition rules, 83ms quantum, cross-app portability.

For implementation reference, read the current sigil particle system and the existing design direction:
- `@apps/explorer/components/logo/sigil-particles.tsx` — Current WebGL horse mark (Three.js Points + custom GLSL, 2px CRT phosphor particles)
- `@grimoires/the-easel/tdr/TDR-006-sigil-particle-treatment.md` — Current spec (CRT burn-in — to be revised to LED billboard)
- `@grimoires/artisan/inspiration/direction.md` — Design direction with Neo Tokyo translation key

For rektdrop's existing material inventory:
- Review `rektdrop-interface/src/app/globals.css` for the full CRT degradation system (phase-driven scanlines, noise, vignette, thermal hue shifting, lattice grid, animation taxonomy)
- Review `rektdrop-interface/src/components/depth-parallax-canvas.tsx` (complete WebGL parallax shader, phase-driven, currently UNMOUNTED)
- Review `rektdrop-interface/src/components/background-lattice.tsx`

Additional research artifacts (read as needed for depth):
- `@grimoires/gecko/research-cinema-led-venues.md` — LED hardware construction specs, cinema building displays (GITS, BR2049, Akira, Blade Runner), venue approach sequences, Shibuya multi-display
- `@grimoires/gecko/glass-case-research.md` — The shop reframe, three viewing scales, glass case component design, LED vs CRT comparison
- `@grimoires/artisan/inspiration/neotokyo-analysis.md` — Full OKLCH decomposition of Neo Tokyo reference frames

## Key Context

**The Sprawl** is a coherent cyberpunk world. `constructs.network` is a tech shop / operator HQ displaying a roster of elite AI agent constructs. `sprawl-rektdrop` is a different location — an arena/event in the same city. Both share visual DNA (same 4 colors, same materials, same quantum timing) but differ in temperature (cyan-cool shop vs crimson-hot arena).

**Constructs are operators, not products.** 23 elite specialists, each the best in their domain. Deployed, not installed. The roster board displays earned standing through information density — not color badges. Logos are bone-on-void monochrome. Status is communicated through visual weight (opacity, data fullness, glow) not through color differentiation.

**Four colors only**: bone (logos, text, data), cyan (structure, grid, observation), crimson (danger, active state, the Loa), void (background, absence). No graduation colors. No green/amber/orange. The graduation states (field-testing, operational, combat-proven, decommissioned) use treatment variation, not color.

**The horse mark** on the building facade is the shop sign — currently CRT phosphor particles (2px, single cyan, too subtle), needs upgrade to LED billboard (6-8px modules, visible grid, dual cyan+crimson, pipe energy along panel frame edges).

**For deep research**, use the dig-search script instead of manual WebSearch/WebFetch:
```bash
npx tsx .claude/constructs/packs/k-hole/scripts/dig-search.ts --query "<thread>" --depth 1-4
```

## What Needs Building (Priority Order)

1. **Roster board component** — Primary browse view. Bone insignia + callsign + theater + capability count + density-as-standing indicator.
2. **Metal plate dossier** — Detail view as operator personnel file. Brushed steel material, service record format.
3. **LED billboard sigil upgrade** — Revise sigil-particles.tsx from CRT to LED module treatment.
4. **Glass case material** — CSS backdrop-filter + edge catch + glow bleed for browse containers.
5. **Mission planning view** — Composition as deployment briefing with supply lines between operators.
6. **Approach/facade sequence** — Building sign before you enter either location.

## The Tone

Present, dense, earned, dark, mechanical, physical, connected. The roster isn't curated — it's earned. The board reflects who showed up and what they proved.

## Known Issues

- **Pack sync staleness**: installed packs at `.claude/constructs/packs/` can drift from canonical repos. The `do_upgrade_pack()` function exists but requires registry roundtrip. Local-to-installed sync has no automated path. Manual: `cp construct-repo/scripts/*.ts .claude/constructs/packs/slug/scripts/`
- **Subagents don't auto-use dig-search**: When spawning research agents via the Agent tool, explicitly include the dig-search invocation in the prompt. The skill contract mandate ("MUST run dig-search") only applies to `/dig` invocations, not general subagents.

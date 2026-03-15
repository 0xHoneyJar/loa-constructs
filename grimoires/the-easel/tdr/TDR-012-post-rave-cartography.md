# TDR-012: Post-Rave Cartography

> Lore grounding for the Mibera Dimensions festival map.
> Each landmark is a Codex-canonical birthplace. This document connects
> the 3D geometry to its cultural DNA.

## Decision

Map landmarks are not arbitrary shapes. Each is derived from a background trait
in the Mibera Codex, with specific cultural references that inform geometry,
material palette, and spatial position.

The map is a festival site — the moment after setup, before the gates open.
Four dimensions, four birthplaces. 626 Miberas born across these four locations.

---

## Stonehenge — Center (202 Miberas)

**Codex source**: `traits/backgrounds/stonehenge.md`
**Introduced by**: Tez (2024-06-07)

> "Stonehenge was the site of the legendary free festivals of the 1970s-80s,
> culminating in the 1985 Battle of the Beanfield when police violently
> dispersed the Peace Convoy — a foundational moment in freetekno history."

**Why center**: Stonehenge is the axis mundi. Prehistoric ritual site, 3000-2000 BCE,
repurposed by freetekno culture as the site of illegal solstice gatherings. It sits
at the center of the map because it's the origin — the ancient place where communal
celebration begins. Every other zone radiates from this point.

**Geometry**: Ring of 8 standing stones with 3 lintel pairs, central altar disc,
inner ritual stone circle. The ring form echoes the actual monument's circular plan.

**Material**: ToonStone — warm grey-brown. Not the grey-blue of the real Stonehenge
(Wiltshire, England) but warmer, pulled into the Mibera palette. The stones should
feel ancient but alive.

**Lore detail**: The ritual stone circle around the altar references the inner
horseshoe of bluestones at the real Stonehenge. The fire pit west of the circle
echoes the solstice gathering tradition — fires lit at the stones.

---

## Bear Cave — North (175 Miberas)

**Codex source**: `traits/backgrounds/bear-cave.md`
**Added**: 2024-08-14

> "Where Beras hibernate, dream, and transform. Connects the bear identity
> to the prehistoric caves where early humans gathered and made art."

**From Lore 1**: "the visible world of particular things is a shifting exhibition,
like shadows cast on a bear cave wall."

**Why north**: The cave faces south — its entrance opens toward the center of the
festival, toward Stonehenge. Bears emerge from the north. The cave is the place of
dreaming and transformation, positioned at the edge where the known world ends.

**Geometry**: Horseshoe cavern with pinched entrance. 15 wall segments with organic
vertex displacement (not geometric — caves are carved by water, not tools). Dark
interior floor suggesting depth. The horseshoe shape references the actual formation
of many sacred caves — a natural amphitheater.

**Material**: ToonCaveWall — deep warm brown, nearly black in shadows. ToonCaveFloor —
near-void. The darkness is intentional. "Shadows on a bear cave wall" requires
actual shadow to work.

**Lore detail**: The Platonic Cave allegory is central. Miberas born here don't see
reality directly — they see projections, interpretations, shadows of the real.
This connects to the psychedelic experience: seeing beyond the shadow play.
The bright orange brushstrokes in the original visual reference suggest prehistoric
cave art — the first act of representation, the first attempt to capture reality
on a wall.

---

## El Dorado — East (219 Miberas)

**Codex source**: `traits/backgrounds/el-dorado.md`
**Added**: 2025-02-27

> "El Dorado, meaning 'the golden one' in Spanish, is a legendary city or
> kingdom of immense wealth. Originating from Muisca rituals in modern-day
> Colombia, where a chief covered in gold dust made offerings in Lake Guatavita."

**Why east**: The sun rises in the east. El Dorado is golden. The stepped pyramid
catches the first light of the raked sun, making it the warmest, most luminous
landmark on the map. The largest dimension (219 Miberas) gets the most visually
prominent position.

**Geometry**: 3-tier stepped pyramid (ziggurat), central court on top, stairway
extending west toward Stonehenge, flanking entrance pillars, 4 corner columns.
Fallen column fragments around the base suggest ancient ruins — this city was
discovered, not built by the festival.

**Material**: ToonGoldStone — saturated warm gold/ochre, the richest color on the
map. The court surface is brighter still. The gold references both the Muisca
rituals and the visual language of wealth/aspiration in the Codex.

**Lore detail**: The Muisca gold rituals involved a chief covered in gold dust
diving into a lake as offering. The stepped pyramid form references Mesoamerican
temple architecture — not the historical Muisca but the mythologized version
that the conquistadors imagined. El Dorado was never a real city. It was a
projection of desire. The ruin fragments around the base acknowledge this:
the golden city is always already crumbling.

---

## Owsley Lab — Southeast (30 Miberas)

**Codex source**: `traits/backgrounds/owsley-lab.md`
**Added**: 2025-03-11
**Introduced by**: Jani / Tez

> "Owsley 'Bear' Stanley is the ultimate ancestor figure for Mibera — a chemist
> nicknamed 'Bear' who produced the purest LSD of the 1960s, bankrolled the
> Grateful Dead, and designed their iconic dancing bear logo."

**Why southeast**: Tucked into a corner. The lab is private, hidden, operational —
not a public monument. The smallest dimension (30 Miberas) gets the most intimate
position, away from the main gathering. You have to know it's there.

**Geometry**: Angular compound with main room, west annex, south annex. Connecting
pipes between buildings. 3 interior workbenches visible from above. Chimney vent.
Crates and barrel outside. The geometry is precise and angular — this is a workshop,
not a cave or temple. Right angles. Intentional construction.

**Material**: ToonLabWall — cool grey-brown, the least warm material on the map.
The temperature shift is intentional: the lab is industrial, functional, modern
(1960s) compared to the ancient sites around it.

**Lore detail**: Augustus Owsley Stanley III produced over a million doses of pure
LSD, funded the Grateful Dead, engineered their live sound, and designed the
dancing bear logo. His lab is where chemistry becomes culture. The small population
(30 Miberas) reflects the rarity and potency of this lineage — not every Mibera
comes from the lab, but those who do carry a specific relationship to precision,
craft, and the alchemy of transformation.

---

## Spatial Relationships

The four landmarks form a narrative:

```
DREAMING (Bear Cave, north)
    ↓ emerge from the cave
GATHERING (Stonehenge, center)
    → journey east
ASPIRATION (El Dorado, east)

    hidden in the corner:
CRAFT (Owsley Lab, southeast)
```

**Cave → Circle → Temple → Lab**: from unconscious dreaming to conscious ceremony
to mythic aspiration to precise craft. The progression maps to the Mibera lifecycle:
born in shadow, gathered in community, reaching for gold, refined through chemistry.

The west and southwest zones are intentionally empty — open terrain with scattered
rocks and scrub. Not every space needs a landmark. The negative space lets the four
dimensions breathe. Future dimensions may fill these zones, or they may remain as
the wild margins of the festival site.

---

## Interactive Overlay Plan

Each zone gets:
- **SVG polygon** defining the clickable area
- **Label** with dimension name + Mibera count
- **Hover state** showing accent color (per dimension)
- **Click** navigates to dimension browse page on constructs.network

Zone accent colors (for SVG fill, semi-transparent):
| Zone | Accent | Opacity |
|------|--------|---------|
| Stonehenge | `oklch(0.72 0.04 70)` warm stone | 0.15 |
| Bear Cave | `oklch(0.30 0.03 55)` deep shadow | 0.20 |
| El Dorado | `oklch(0.75 0.10 80)` warm gold | 0.15 |
| Owsley Lab | `oklch(0.58 0.02 75)` cool grey | 0.18 |

---

## References

- Mibera Codex trait files: `traits/backgrounds/{slug}.md`
- Core Lore Part 1: Platonic Cave allegory, "shadows on a bear cave wall"
- Core Lore Archetypes: Freetekno → Stonehenge free festivals
- Owsley Stanley: Grateful Dead history, dancing bear logo origin
- Muisca gold rituals: Lake Guatavita, Colombia

## Status

- [x] All 4 landmarks built in Blender
- [x] Materials assigned per Codex visual references
- [x] Environmental storytelling details added
- [ ] SVG overlay polygons
- [ ] Interactive labels
- [ ] Dimension browse page links

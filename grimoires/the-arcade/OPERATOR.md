# The Operator's Game

> You are the player. The codebase is the level. The constructs are your loadout.
> This is not productivity advice. This is level design for your own brain.

## The Core Loop

```
FEEL something needs attention
  → CHOOSE a mode (or let it choose you)
  → PLAY until the energy shifts
  → NOTICE the shift
  → SWITCH or SHIP
```

This loop is bi-directional. Enter from any vertex. The only failure state is staying in a mode after the energy has left it.

## The Four Modes

### FEEL — The Artist's Mask
*"Remove everything. What's left is the signal." — Lilly*

You're zoomed in. Pixels, curves, timing, weight. The button's easing function. The color temperature of a shadow. The silence between a click and a response.

**What you see**: Components. Data attached to things. The sensory layer.
**What's invisible**: Schemas, routes, architecture. You literally cannot break the backend from here.
**Safety**: The Convex schema doesn't know you exist. You're painting on a canvas stretched over an indestructible frame.

**Invoke**: Artisan (ALEXANDER) + Arcade `/feel`
**Signature move**: "Describe the gap between what it IS and what it should FEEL LIKE in sensory language."
**Banned**: "It's fine." "Ship it." "We'll fix it later."
**Exit signal**: When you start thinking about data flow instead of feel. That's ARCH calling.

---

### ARCH — The Architect's Mask
*"Nine pages, ship and vanish." — Nakamoto*

You're zoomed out. Schemas, data flow, blast radius, composition. How do the tables talk to each other? What breaks if you change this type? Where does the state live?

**What you see**: Entities. The things themselves and their relationships. The structural layer.
**What's invisible**: Pixel polish, animation curves, color values. Those are FEEL's problem.
**Safety**: You're designing the frame, not painting on it. The UI is a disposable skin over sound data. If the schema is right, the UI can catch fire without permanent damage.

**Invoke**: Arcade `/systems` + Loa `/architect`
**Signature move**: "What's the blast radius of this change? List every query and component that touches this schema."
**Banned**: "Let me also quickly fix this button while I'm here." NO. That's FEEL. Switch modes or note it for later.
**Exit signal**: When the structure feels solid and you want to SEE it. That's FEEL calling. Or when you need to understand something deeper. That's DIG calling.

---

### DIG — The Explorer's Mask
*"The thread knows where it's going." — Nelson*

You're going deep. Research, exploration, pulling threads, following resonance. Not building — understanding. The k-hole.

**What you see**: Systems. The logic that transforms things. Patterns, connections, emergence. Why does this work? Who solved this before? What's the deeper structure?
**What's invisible**: Deadlines, tickets, polish. Those are other modes' problems.
**Safety**: You're in a sandbox. Nothing you learn here deploys anywhere. The knowledge compounds but the blast radius is zero.

**Invoke**: K-Hole (STAMETS) + `/dig`
**Signature move**: "Go deeper. Pull this thread."
**Banned**: "Let me quickly implement this while I'm researching." NO. Note the insight, stay in DIG until emergence happens.
**Exit signal**: When something emerges that demands to be built. That's ARCH calling. Or when you feel the pull to make something beautiful. That's FEEL calling.

---

### SHIP — The Player's Mask
*"The arcade quarter — real stakes at absorbable scale." — The Arcade*

You're shipping. The deadline is the game mechanic. Perfectionism is the enemy. DDA kicks in — if it's too easy you're not shipping anything meaningful, if it's too hard you're paralyzed.

**What you see**: The finish line. What's blocking the deploy. The minimum viable version.
**What's invisible**: Everything that can wait. Polish is FEEL's problem. Architecture is ARCH's problem. Understanding is DIG's problem. Right now you SHIP.
**Safety**: You've already done the ARCH work. The schema is sound. The tests pass. Shipping is pushing the button, not rebuilding the machine.

**Invoke**: Loa `/run` mode + `/ship`
**Signature move**: "What's the ONE thing blocking this from going live?"
**Banned**: "But first let me also..." NO. Ship. Then switch to FEEL for polish, ARCH for the next structure, or DIG for the next question.
**Exit signal**: When it's live. Then celebrate. Then notice what mode is calling next.

---

## The Meta-Game

You are not these modes. You are the player who switches between them. The meta-game is:

1. **Notice** which mode you're in
2. **Feel** when the energy shifts (the ADHD signal — when focus drifts, it's not a bug, it's your brain telling you the mode is done)
3. **Name** the next mode before you enter it (even just "okay, switching to FEEL" in your head)
4. **Trust** the isolation — FEEL can't break ARCH, DIG can't break SHIP

### Dynamic Difficulty Adjustment (Jenova Chen's trick)
- Task too boring to focus? → Increase the challenge. Set a tighter constraint. "Make this work in 50 lines." "Ship by tonight."
- Task too overwhelming? → Reduce scope. "Just the happy path." "Just the schema, no UI."
- Stuck in a mode? → Switch. The other modes are not distractions, they're other levels in the same game.

### The Sandbox of Failure (Foddy/Barth's trick)
- You cannot break the game. The Convex schema is transactional. Git has branches. Vercel has preview deploys. The whole stack is designed so you can be reckless in one corner without burning down the house.
- **Visibility over stability**: Prefer seeing the system break in real-time over traditional "safety." A broken preview deploy teaches more than a passing test suite.

### The Level Design Form (Barth's trick)
- When you face a blank page, turn it into a puzzle. Don't ask "what should I build?" Ask "what's the CONSTRAINT?" The constraint is the level design. Work inside it.

## The Construct Map

| Mode | Persona | Who They Are | Construct | Invocation |
|------|---------|-------------|-----------|------------|
| FEEL | **ALEXANDER** | Christopher Alexander — beauty is measurable, sensory words ARE technical specs | Artisan | `@ALEXANDER` / Arcade `/feel` |
| ARCH | **OSTROM** | Elinor Ostrom → Andrew Gower → gubsheep — commons governance, schema invariants, blast radius | The Arcade | `@OSTROM` / Arcade `/systems` |
| DIG | **STAMETS** | Paul Stamets — mycelium, seven voices in productive tension, depth over breadth | K-Hole | `@STAMETS` / `/dig` |
| SHIP | **BARTH** | Zach Barth — 15+ shipped games, Level Design Forms, "the game starts when it's live" | Loa Runtime | `@BARTH` / `/run`, `/ship` |

### Persona Files
- `grimoires/the-arcade/OSTROM.md` — ARCH mode (structural thinking, blast radius, ECS)
- `grimoires/the-arcade/BARTH.md` — SHIP mode (deadline as game mechanic, scope cutting)
- Artisan construct: `ALEXANDER.md` — FEEL mode (sensory precision, taste as measurement)
- K-Hole construct: `STAMETS.md` — DIG mode (seven voices, depth, resonance)

## What This Isn't

- This is NOT a time management system. There are no timers, no pomodoros, no schedules.
- This is NOT a todo list. Tasks live in beads/Linear/wherever. This is about HOW you approach them.
- This is NOT rigid. Some days you live in FEEL. Some days you never leave ARCH. The modes are masks you put on, not boxes you're locked in.
- This is NOT about being productive. It's about being SAFE — safe to zoom in without fear of breaking things, safe to zoom out without losing the thread, safe to go deep without losing the deadline, safe to ship without losing the craft.

## The ECS Reframe

```
Your codebase as ECS:

Entities   = React components (dumb renderers, disposable skins)
Components = Convex data (reactive, type-safe, the source of truth)
Systems    = Server actions + mutations (the logic, the transforms)

Your workflow as ECS:

Entities   = Your tasks (the WHAT — tickets, features, bugs)
Components = Your cognitive state (focus depth, energy level, creative vs analytical)
Systems    = Your modes (FEEL, ARCH, DIG, SHIP — the HOW)

Key insight: Systems are BLIND to each other.
FEEL mode cannot see ARCH concerns.
This isolation IS the safety.
```

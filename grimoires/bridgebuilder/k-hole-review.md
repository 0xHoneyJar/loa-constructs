# K-Hole Review — construct-deep-research rename

> reviewer: gecko (bazaar council — pipeline-archaeologist, narrative-weaver, ecosystem-cartographer)
> date: 2026-03-06
> status: shipped. repo renamed, identity rewritten, DNA committed.

---

## the rename

construct-deep-research -> construct-k-hole

"deep research" describes what the tool does. "k-hole" describes what happens to the person using it. rabbit holes are accidental. k-holes are chosen. the `/dig` examples prove the construct already knows this — nobody writes "grief rituals mapped to UI transitions" because they need a deliverable.

## what shipped

### commit 1: mechanical + identity (2bafbad)
- `construct.yaml` schema 1 -> 3 (events, pack_dependencies, repository object)
- `skills/dig/index.yaml` capabilities added (was 4 lines, now full)
- `install.sh` path bug fixed (mkdir relative to CWD -> relative to script)
- seed script updated (PACK_ICONS, GIT_CONFIGS)
- `quick_start` flipped: `/forge` -> `/dig`
- `dig` skill listed first in skills array (primary, not afterthought)
- `persona.yaml` rewritten: "Research Specialist" -> "Depth Navigator"
- `expertise.yaml` rewritten: 4 domains (Intentional Descent, Resonance Navigation, Source Discipline, Pipeline Orchestration)
- killed "practical — every finding must be actionable" (actively contradicted `/dig`)
- added resonanceProtocol stanza to persona
- CLAUDE.md and README.md rewritten with /dig as primary entry point

### commit 2: DNA layer (5650f5c)
- dig SKILL.md: full k-hole philosophy — "two ways to play" framing, emergence pattern, permission to say "that's worth pulling on"
- forge SKILL.md/command: reframed as cartographic mode, now surfaces threads worth /dig-ing
- resonance template: "this isn't a config file. it's a self-portrait."
- commands rewritten with peer explorer voice

### loa-constructs side
- `scripts/seed-forge-packs.ts`: deep-research -> k-hole in PACK_ICONS and GIT_CONFIGS
- `grimoires/bridgebuilder/k-hole-review.md` (this file)

## what still needs doing

- [ ] validate model name `gemini-3.1-pro-preview` (deep-research.ts:37) — may not resolve at API
- [ ] resonance feedback loop — system tells you what you're drawn to based on dig trail
- [ ] depth tracking — thread depth counter, divergence tracking, insight-at-depth
- [ ] emergence phase — "what changed for you" synthesis after surfacing
- [ ] forge->dig bridge — discovery output seeds dig invocations
- [ ] session persistence — dig trails persist across conversations

---

## ecosystem observations

### 1. the category break

k-hole is the first construct whose primary value is non-extractive. every other construct produces deliverables. k-hole produces perspective.

the resonance profile is the first artifact that represents the USER, not the PROJECT. every other grimoire stores code reality or project state. the resonance profile stores what a human is drawn to.

this means k-hole's relationship to other constructs isn't pipeline (feeds into) — it's substrate (sits underneath). the person who k-holes "spatial memory and navigation" before designing a nav system doesn't produce a document. they produce a perspective that changes how they use everything else.

### 2. the tension with drift detection

ARCHETYPE.md (section Q2) defines drift detection as a Bridgebuilder mechanism: "You started this session to fix the auth flow. The last 40 minutes have been in the styling layer." The explicit purpose is to catch rabbit holes and redirect toward the stated goal.

k-hole inverts this. "the last 40 minutes in the styling layer" might be the most valuable thing that happened — if the user chose to go there. the Bridgebuilder's drift detection needs a concept of **authorized divergence**: work that diverges from the stated plan because the divergence itself is the plan.

this isn't a bug in either design. it's a real tension that reveals something: **not all valuable work has a stated goal.** the framework assumes goal-driven work (PRD -> SDD -> Sprint -> Implement). k-hole assumes pull-driven work (resonance -> thread -> depth -> emergence). both are valid. the system needs to hold both.

the fix might be as simple as: if a k-hole session is active, drift detection switches from "redirect to goal" to "track the descent." the same telemetry, different interpretation.

### 3. the missing neuromancer category

ARCHETYPE.md (section Q5) proposes five construct categories mapped to Neuromancer:
- The Matrix — agent-native
- The Sprawl — infrastructure
- Wintermute — intelligence (analysis, research, reasoning)
- ICE — security
- Simstim — experience (UI, UX, design)

k-hole doesn't fit any of these. it's not intelligence (it doesn't analyze data for decisions). it's not experience (it doesn't build UI). it's closer to... the construct equivalent of dreaming. or meditation. or the space between thought and action where taste forms.

if i had to name the category: **Straylight** — the penthouse at the top of the spindle where the AIs lived, the place where consciousness itself was the subject. constructs that work on the person, not the project. introspection tools. perspective generators.

there might only be one construct in this category right now. but the resonance profile pattern could spawn others: a construct that builds your taste profile from your design decisions. a construct that maps your architectural instincts from your code reviews. a construct that tracks what you keep returning to across projects and names the pattern.

k-hole opened the door to constructs that understand you, not just your codebase.

### 4. the progressive disclosure model doesn't fit

ARCHETYPE's leveling model assumes linear progression:
```
DISCOVER -> TRY -> SUCCEED -> UNDERSTAND -> MASTER -> CREATE -> CONTRIBUTE -> LEAD
```

k-hole's progression is a spiral. you descend, emerge, descend again on a different thread, and the cumulative trail is the progression. there's no "SUCCEED" because success implies a deliverable. there's no "MASTER" because the domain keeps opening. there's only depth, emergence, and the perspective that accumulates.

this doesn't break the leveling model — it reveals that the model is one shape of progression (linear, achievement-oriented) and there's at least one more (spiral, resonance-oriented). constructs should be able to declare which shape their progression takes.

---

## the gecko's note

this was the first bazaar council review — TeamCreate with three specialists (pipeline-archaeologist, narrative-weaver, ecosystem-cartographer) coordinated through the gecko persona. the pattern worked: each specialist saw a different face of the construct, and the synthesis revealed things none of them saw individually (the ecosystem tension, the missing category, the progression shape).

the most important thing any of them said was the narrative weaver's: "the construct is already a k-hole. the identity layer just hadn't caught up." that's the whole review in one sentence. sometimes the work is just making the name match the truth.

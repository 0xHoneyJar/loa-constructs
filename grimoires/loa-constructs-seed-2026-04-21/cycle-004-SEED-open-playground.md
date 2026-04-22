# SEED — Cycle-004 · Open Playground (transparency + determinism)

> *"My personal workflow should never prescribe specificity, but it could provide ideas and overall form of how an operator may structure his/hers. Open playground."* — operator 2026-04-21-late
>
> **Status**: Active · Authored 2026-04-21 post doctrine v4
> **Supersedes**: cycle-003 inheritance queue (F24/DB swap → cycle-005)
> **Dispatch mode**: `/spiraling` harness (formal cycle); L1+L2 shell-first, L3+L4 doctrine-work, L5 workflow authoring
> **SEED-driven**: yes — this SEED is harness-compatible

---

## 0 · Why this cycle exists

Three forces converging:

1. **Doctrine v4 §16.3 friction** (operator 2026-04-21):
   > *"It's unclear to me which constructs are being called and how consistent they are. It doesn't feel extremely consistent, especially with the amount of context loaded in and the variance and non-deterministic nature of agents."*

2. **Doctrine v4 §16.1** — Operator OS inverts: from canonical spec to prototype/starter-template. Other operators should be able to author their own workflows.

3. **Doctrine v4 §16.2** — Hivemind trichotomy now named (construct / skill / knowledge-personal / knowledge-org / archivist). Needs formal documentation in a single page an external operator can read.

Cycle-004 closes the trifecta: make constructs visible (transparency), make invocations deterministic (consistency), invite variation (open playground).

**After this cycle**, public README becomes possible — doctrine v4 + cycle-003 walk + cycle-004 transparency tooling = a coherent story for external operators.

---

## 1 · Scope lock

Cycle-004 touches:

- `.claude/scripts/` — new shell tools (constructs-active.sh, mode-invocation audit, trajectory extension)
- `grimoires/` — doctrine v5 amendments (if cycle surfaces new structural claims), cycle-004-findings.md
- `~/hivemind/wiki/concepts/` — hivemind-trichotomy page (new), operator-os-as-template page (new)
- Draft of `~/.claude/CLAUDE.md` reshape (as artifact; operator does the actual edit)
- `.claude/constructs/compositions/feel-audit.yaml` — author first workflow-kind composition

**Does NOT touch**:
- `apps/api/` (no DB swap — defers to cycle-005)
- `constructs-install.sh` three-way-merge (F24 — defers to cycle-005)
- `apps/explorer/` (defers per operator "don't rebuild the network")
- Dynamic Labs auth (defers per F11 pull-thread)
- Upstream construct repos (ALEXANDER SKILL.md edits — defers to separate follow-up PRs per construct)

---

## 2 · Legs (from doctrine v4 §16.6)

| Leg | Purpose | Est. lines | Status |
|---|---|---|---|
| **L1 · constructs-active.sh** | Reports active construct set + mode + lenses in 3 read-modes | ~180 shell | CERTAIN |
| **L2 · Mode invocation contract** | Document + enforce deterministic routing for /feel, @ALEXANDER, "FEEL mode" → same pack+skill+lens | ~100 shell + 1 doc | CERTAIN |
| **L3 · Operator OS as starter template** | Reshape `~/.claude/CLAUDE.md` reference + publish template as construct-starter-os.md page | 1 doctrine doc + template | CERTAIN |
| **L4 · Hivemind trichotomy doc** | Single page clearly naming construct / skill / knowledge-personal / knowledge-org / archivist | 1 concept page | CERTAIN |
| **L5 · feel-audit workflow-kind composition** | Author first runnable workflow per doctrine §15.2 | 1 YAML + executor hint | LIKELY |
| **L6 · Trajectory extension to non-Skill actions** | Hook Bash/Read/Edit when they touch construct files; attribute back to pack | ~120 shell | POSSIBLE |
| **L7 · F24 three-way-merge carryover** | Only if L1-L5 land and budget/time permits | ~80 shell | CONDITIONAL |

Priority ordering matches doctrine §16.4 invariant: **transparency first** (L1), **determinism second** (L2), **playground-opening doctrine** (L3/L4), **then workflows** (L5), then extensions (L6/L7).

---

## 3 · Acceptance criteria

### L1 · constructs-active

- **AC-L1.1** · `constructs-active.sh` outputs a glance-mode line answering "what's my active set" in <1s
- **AC-L1.2** · `--orient` mode shows modes-in-effect, active lenses, constructs in scope, active skills per construct
- **AC-L1.3** · `--intervene` mode outputs JSON pipeable to downstream tools
- **AC-L1.4** · Active set reflects both **declared** (mode invocations, @-mentions) and **observed** (trajectory-backed skill invocations)

### L2 · Mode invocation contract

- **AC-L2.1** · A written spec: one operator utterance shape → deterministic pack+skill+lens resolution
- **AC-L2.2** · For "FEEL mode" / "/feel" / "@ALEXANDER": all three MUST route to artisan pack, ALEXANDER persona, craft lens — documented + enforced
- **AC-L2.3** · If frames conflict (e.g., FEEL + TEND simultaneously), resolution rule is stated and the agent reports the conflict + chosen resolution to operator

### L3 · Operator OS as starter template

- **AC-L3.1** · Draft `construct-starter-os.md` exists in hivemind as a template
- **AC-L3.2** · Draft shows: modes section (commented "edit to your workflow"), lenses section (same), construct-resolution table (same), invocation examples
- **AC-L3.3** · Reference implementation (operator's current CLAUDE.md) is linked as "one example"

### L4 · Hivemind trichotomy doc

- **AC-L4.1** · New `~/hivemind/wiki/concepts/hivemind-trichotomy.md` page
- **AC-L4.2** · Names all 5 layers (construct / skill / knowledge-personal / knowledge-org / archivist)
- **AC-L4.3** · Each layer gets: 1-sentence what, path, 1 example use, 1 composition with another layer
- **AC-L4.4** · Linked from hivemind index

### L5 · feel-audit workflow

- **AC-L5.1** · `compositions/feel-audit.yaml` v1 shape per doctrine §4 (workflow kind) + §15.2 (frame+chain separation)
- **AC-L5.2** · Declares `reads`/`writes` types per stage (Artifact → Signal → Verdict)
- **AC-L5.3** · Runnable via conceptual stub — a bash `construct-compose.sh feel-audit <target>` that manually sequences the constructs (real runner defers to cycle-005)

---

## 4 · Dispatch

**Budget**: $60 target, $120 cap. Profile `light` (no Flatline gates on individual legs; final review gate optional).

**Dispatch mechanism**: `/spiraling` harness available and appropriate for this cycle shape (formal SEED, multi-leg, KANSEI gate at close).

```bash
.claude/scripts/spiral-harness.sh \
  --task "Build cycle-004 open playground per SEED 2026-04-21. Legs L1-L5 CERTAIN/LIKELY, L6/L7 conditional on budget. L1 constructs-active.sh shell tool with 3 read-modes (glance/orient/intervene) reporting active construct+mode+lens set. L2 mode-invocation contract spec + enforcement. L3 Operator OS starter template in hivemind. L4 hivemind-trichotomy concept page. L5 feel-audit workflow-kind composition YAML. Shell-first per doctrine §13.1. Doctrine v4 compliance: §16.4 transparency invariant, §16.3 determinism friction closure, §16.1 open-playground framing." \
  --cycle-dir .run/cycles/loa-constructs-cycle-004 \
  --cycle-id loa-constructs-cycle-004 \
  --branch feat/cycle-004-open-playground \
  --profile light \
  --budget 120 \
  --seed-context grimoires/loa-constructs-seed-2026-04-21/cycle-004-SEED-open-playground.md
```

**Pre-flight**: operator-authored legs (L3, L4) may be done conversationally alongside harness for L1/L2/L5. The harness can dispatch L1+L2 autonomously; L3+L4 are doctrine work that benefits from operator-pair.

**Alternative**: all-conversational mode (cycle-003 precedent) if operator prefers reading each leg as it lands rather than batch-reviewing a harness output. Either works.

---

## 5 · KANSEI gate (operator-answered, per doctrine §14.3 read-mode calibration)

At close:

| # | Question | Pass |
|---|---|---|
| Q1 | Can I ask the agent "what constructs are active?" and get a trustworthy answer in ≤5s? | Y |
| Q2 | Does "/feel" or "FEEL mode" produce the same pack+skill+lens each time? | Y |
| Q3 | Does the starter template make sense as a replacement for the current `~/.claude/CLAUDE.md`, OR as a source to fork from? | Y or "this is close enough to try" |
| Q4 | Can I explain hivemind trichotomy to someone external in ≤3 sentences? | Y |
| Q5 | Free-text: which friction remains, and does the construct network feel closer to an "open playground" than before? | positive sentiment or concrete open friction |

Pass: 4/5 YES on Q1-Q4 + constructive Q5. Halt if <3/5.

---

## 6 · Review lens (carryover from cycle-001 + additions)

Still applicable: `cycle-001-review-lens.md` (GECKO + KEEPER + OTLET + KISS).

**Cycle-004 additions**:

- **TRANSPARENCY lens** (doctrine §16.4): reviewer asks "does this make the agent's active set visible to the operator in read-mode latency?"
- **DETERMINISM lens** (doctrine §16.3): reviewer asks "does this make the same invocation produce the same result, or at least make variance explicit?"
- **PLAYGROUND lens** (doctrine §16.1): reviewer asks "does this allow for operator variation, or does it lock one pattern in?"

COMPILE lens from cycle-003 F13: `bun run typecheck` still required for any code changes in apps/*.

---

## 7 · What this cycle proves (if it lands)

1. **Composition determinism is implementable** — transparency + invocation contract in shell tools.
2. **Operator OS can invert** from canon to template without breaking anything.
3. **Hivemind trichotomy is documentable in one page** — external operators can onboard to the structure.
4. **Workflow-kind compositions are authorable** — feel-audit becomes the first real one, not just folklore YAML.
5. **Public README is unblocked** — doctrine v4 + walk + open-playground is a coherent story.

If it struggles, specific learnings route back into doctrine v5 amendments.

---

## 8 · What cycle-005 inherits

Pre-drafted:

1. **F24 three-way-merge impl** (carried from cycle-003, deprioritized out of cycle-004)
2. **L1 DB swap Supabase → Turso** (still primary infra carry)
3. **`.source.json` backfill for 29 legacy installs** (F22 carry)
4. **Upstream SKILL.md emission PRs** (one PR per construct-artisan, construct-observer, construct-k-hole)
5. **Composition runtime `construct-compose.sh`** (cycle-004 L5 ships a YAML; runtime follows)
6. **Operator-Context construct** (doctrine §15.5 / §16.5 — context-aware hivemind autoload)
7. **Archivist pack installation + wiring** (enables vault-mechanics for hivemind)

---

## 9 · Note on /flatline-review + /bridgebuilder-review

Deferred per cycle-003 F26 (env gap: `ANTHROPIC_API_KEY` not set for adversarial multi-model). When operator sets that env var, flatline-review can run against doctrine v4 retroactively. Bridgebuilder CI auto-hook is cycle-006+ (§16.6 L6 candidate).

Cycle-004 ships without triple-model adversarial review. The KANSEI gate + operator conversational review + the transparency lens substitute for now.

---

*Drafted 2026-04-21-late. First SEED authored post-doctrine-v4. Primary target: the stated friction (which constructs are active / are they consistent). Secondary target: open the playground. Shell-first, doctrine-compatible, harness-dispatch-ready.*

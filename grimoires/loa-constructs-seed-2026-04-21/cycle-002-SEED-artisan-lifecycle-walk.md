# SEED — Cycle-002 · Artisan Lifecycle Walk (friction-driven)

> *"We're designing around the friction points that we're realizing here."* — operator 2026-04-21
>
> **Status**: Draft for operator review. Author: Claude (experience lens). Architecture-lens pass (OSTROM) pending post-review.
>
> **Date**: 2026-04-21
> **Precedes**: cycle-002 harness dispatch
> **Supersedes**: none — complements `cycle-001-findings.md`
> **Shape**: experience-first, friction-generative

---

## 0 · The shift

Cycle-001 decomposed OSTROM's 11-component architecture into 7 legs. Every leg landed. **Five of seven shipped plumbing nobody has actually used.** That's a SEED-writing failure mode, not a harness failure mode.

Cycle-002 inverts: **one operator walks one construct through the entire lifecycle. Friction-points become findings. Findings become legs.** Architecture follows experience, not the other way around.

This is the operating model for cycle-002+ once bones are in place. Bones are in place. From here, every cycle starts with a walk.

---

## 1 · Why this cycle exists

Evidence from cycle-001-findings + operator reflection 2026-04-21-late:

| Signal | Observation |
|---|---|
| Plumbing/experience gap | 5/7 cycle-001 legs built infrastructure no one has felt |
| Explorer bug | `constructs.network/constructs` renders "No public constructs available" — data bug (empty `packs` table with `visibility='public'`), not UI bug |
| Dogfood void | Zero constructs onboarded through the new flow |
| Trajectory void | `.run/construct-trajectory.jsonl` never populated |
| Scope drift | Leg G stubs landed in loa-constructs instead of loa-freeside |
| Missing edits | ALEXANDER/KEEPER/STAMETS SKILL.md emission edits (Leg E) never happened |

**Operator direction (2026-04-21-late)**:
- Internal operations > external support in priority, but both matter
- `construct-<slug>` naming — internal follows it, external TBD (soft-nudge, no force)
- Target UX/DX: `skills.sh` simplicity + composable-expertise-legos
- Primary subject: **artisan** (most-integrated, ALEXANDER persona, you invoke `/feel` constantly)
- Secondary: k-hole, observer, rosenzu (abbreviated walks)
- Explorer: fix the data bug so packs show up, but **don't chase UI polish** — internal Claude Code/Loa developer experience is the priority

---

## 2 · The walk — primary subject: artisan

Narrative 8 steps. Each has an **observable pass/fail**. Every fail is a finding. Findings become emergent legs (see §5).

### Step 1 — Publish (make artisan discoverable)

**Actions**:
1. Identify artisan's canonical repo (`0xHoneyJar/construct-artisan` per convention — verify)
2. Trufflehog + grep sweep for secrets per OSTROM §3.2
3. `gh repo edit 0xHoneyJar/construct-artisan --visibility public`
4. Do NOT manually seed — let the webhook fire

**Observables**:
- GitHub delivers `repository.publicized` webhook → `/v1/webhooks/github` accepts
- `services/discovery.ts` upserts → `packs` table gains row `{slug: 'artisan', visibility: 'public', ...}`
- `discovery_runs` audit table gains row for this single-repo discovery
- Within 60s of the flip, `constructs.network/constructs` renders artisan card

**Pass**: all observables happen within 60s.
**Fail** → Finding class: publish-flow broken.

### Step 2 — Discover fallback (AC-A5 verification)

**Actions**:
1. Manually set `UPDATE packs SET visibility='private' WHERE slug='artisan'` (simulates operator override)
2. Re-run `POST /v1/admin/discover` (default 0xHoneyJar scan)
3. Check `packs` table for artisan row

**Observables**:
- `discovery_runs` row appended with timestamp, repo count, duration
- Artisan's `visibility` **remains `private`** (operator override preserved — AC-A5)
- No `EXCLUDED.visibility` semantics in the upsert path

**Pass**: operator-set visibility survives the re-discovery.
**Fail** → Finding class: AC-A5 regression / destructive upsert.

### Step 3 — Explorer fetch

**Actions**: Set artisan back to `public`; hard-refresh `constructs.network/constructs`.

**Observables**:
- Artisan card renders with: name, short description, category, trust_level (if declared), compose_with edges, showcase images (already hardcoded in `CONSTRUCT_SHOWCASES`)
- API endpoint `GET /v1/constructs?per_page=100` returns artisan in `data[]`
- No client-side errors in browser console
- `revalidate: 3600` honored (stale data after flip within an hour)

**Pass**: artisan renders correctly with all expected fields.
**Fail** → Finding class: explorer data-pipeline or render gap. Expected outcomes:
- Missing fields → schema drift between `services/discovery.ts` upsert and API response shape
- Empty render → API returning `[]` despite non-empty `packs` table → query-level bug
- Console errors → frontend type mismatch

### Step 4 — Install on fresh env

**Actions**:
1. `mkdir -p /tmp/cycle-002-walk && cd /tmp/cycle-002-walk`
2. `constructs install artisan`

**Observables**:
- `~/.loa/constructs/packs/artisan/` exists
- `~/.loa/constructs/packs/artisan/.source.json` exists with `{source_repo, source_commit, installed_at}` populated correctly
- Artisan is available: `/feel` command registers, skills listed via `construct-resolve artisan`
- Install took <30s

**Pass**: clean install, `.source.json` written, construct usable.
**Fail** → Finding class: Leg C install flow broken.

### Step 5 — Edit locally

**Actions**: Modify one line in `~/.loa/constructs/packs/artisan/skills/<pick-one>/SKILL.md`. For example, add a comment: `<!-- cycle-002 walk: operator override to test fork-safety -->`

**Observables**:
- Edit writes successfully
- No permission denial, no git lock
- File persists (still there after `ls`)

**Pass**: operator can customize installed constructs.
**Fail** → Finding class: installed constructs write-protected or non-editable.

### Step 6 — Upgrade with local edit (AC-C4)

**Actions**:
1. `constructs install artisan` (same command — treated as upgrade)

**Observables**:
- Three-way merge detects conflict (base = `.source.json.source_commit`, local = worktree with comment, remote = upstream latest)
- **Operator is prompted** — not silently overwritten
- Prompt offers: keep local / accept upstream / view diff
- Choosing "keep local" → edit preserved, `.source.json.source_commit` updated to latest upstream
- Choosing "accept upstream" → operator's comment lost (but this was explicit consent)

**Pass**: conflict prompt fires, no silent overwrite, round-trip clean.
**Fail** → Finding class: AC-C4 regression. This is the fork-safety mechanic — must work.

### Step 7 — Invoke & observe trajectory

**This is the Leg D + Leg E dogfood combined.**

**Actions (part 1 — pre-emission)**:
1. From a project using artisan, invoke `/feel <some-component-or-file>`
2. Wait for ALEXANDER to complete

**Observables (part 1)**:
- `construct-invoke.sh` wrapper intercepts the invocation
- `.run/construct-trajectory.jsonl` gains an entry row: `{ts, command, pack: 'artisan', persona: 'ALEXANDER', phase: 'entry'}`
- `/feel` actually runs end-to-end (ALEXANDER produces output)
- Trajectory gains an exit row: `{ts, command, pack, persona, phase: 'exit', duration_ms, verdict}`

**Pass (part 1)**: paired entry/exit rows land in trajectory. **Answers KANSEI Q3 from cycle-001.**

**Actions (part 2 — emission wiring)**:
3. Edit `~/.loa/constructs/packs/artisan/skills/<the-skill-invoked>/SKILL.md` to include a `feedback-v3` emission block per `.claude/schemas/feedback-v3.schema.json`
4. Re-invoke `/feel`

**Observables (part 2)**:
- A feedback-v3 JSONL row lands (in `.run/feedback-v3.jsonl` or wherever the emission writes)
- The row validates against `.claude/schemas/feedback-v3.schema.json`
- `tests/feedback-v3-roundtrip.bats` passes against the emitted row

**Pass (part 2)**: ALEXANDER emits a labeled verdict; the schema round-trips.
**Fail** → Finding class: Leg D wrapper missed invocation / Leg E schema wiring incomplete.

### Step 8 — Compose

**Actions**:
1. Read `.claude/constructs/compositions/feel-audit.yaml`
2. Walk the composition manually: run `/feel` (artisan + ALEXANDER) → chain to `/kansei` or `/score-experience` (observer + KEEPER)

**Observables**:
- Both personas invoke successfully
- Trajectory gains entry/exit rows for both
- Both emit feedback-v3 verdicts (if observer's SKILL.md has been wired too — if not, that's a finding)
- The composition yaml accurately describes what just happened

**Pass**: symmetric pair composes, both verdicts emit.
**Fail** → Finding class: composition recipe doesn't match reality / observer SKILL.md needs the same emission wiring.

---

## 3 · Secondary walks — abbreviated (k-hole, observer, rosenzu)

For each secondary construct, execute **only steps 4, 6, 7** (install, upgrade-with-edit, invoke). ~10-15 minutes each.

**Why these three**:
- **k-hole** (STAMETS) — most-proven non-artisan construct, exercises `/dig` research-trail emission
- **observer** (KEEPER) — friction-aware by design; step 8 of artisan already touches it via composition
- **rosenzu** — newest, exercises "publish a brand-new construct" flow more honestly than an already-polished one

**Observables per secondary**: same AC-C4 prompt, trajectory row pair, clean install.

**Explicit non-goal**: full 8-step walks for secondaries. If a secondary surfaces a novel friction not seen in artisan, file a finding, but don't re-scope.

---

## 4 · External smoke-test (hypha)

**Actions**:
1. `POST /v1/admin/discover?owner=0xElCapitan` — operator-triggered one-shot
2. Query `packs` table for hypha row

**Observables**:
- `discovery_runs` row appended
- `hypha` row upserts with `trust_level='L2'` (El Capitan declared this in Hypha's `construct.json` schema_v1)
- No regression to hypha's existing state on explorer (if it was already live there)
- Construct.json-legacy tolerance holds (Leg C)

**Pass**: external-org discovery works, schema_v1 tolerance confirmed.
**Fail** → Finding class: external-flow regression; register as cycle-003 candidate.

**Time budget**: 5-10 min total, ~$5-10 cost.

---

## 5 · Emergent legs (pre-draft, to be finalized after the walk)

The whole point of friction-driven cycles is that legs emerge from the walk, not before. These are **placeholders** to signal likely shape:

| Leg | Likelihood | Trigger | Scope |
|---|---|---|---|
| **L1 — Seed the `packs` table + unbreak explorer** | CERTAIN | Step 1 or §6.1 reveals empty table | Run discover + execute Tier-A flips; no code change if discovery already works. |
| **L2 — ALEXANDER SKILL.md emission** | CERTAIN | Step 7 part 2 | Edit one artisan skill's SKILL.md to emit feedback-v3. Narrow from cycle-001's 3-persona scope to just ALEXANDER for this cycle. |
| **L3 — `construct-install-roundtrip.bats`** | LIKELY | Step 6 | Bats test locking in AC-C4 three-way-merge coverage. |
| **L4 — Explorer data-pipeline fix** | LIKELY | Step 3 | If API returns `[]` despite non-empty `packs`, fix query. If field missing, fix transform. No UX polish. |
| **L5 — Move polar/ stubs to loa-freeside** | LIKELY | Cycle-001 carryover | Cross-repo PR in loa-freeside; delete stubs from loa-constructs. |
| **L6 — Soft-nudge `construct-<slug>` naming** | POSSIBLE | If any step reveals naming confusion | Warning log in `services/discovery.ts` when a repo lacks the prefix; no enforcement. |
| **L7 — KEEPER/STAMETS SKILL.md emissions** | CONDITIONAL | Step 8 composition | Only if observer composition emerges as blocker; otherwise defer to cycle-003. |
| **L8 — Seed-script decommission** | DEFERRED | Scheduled cycle-002 end | Delete `scripts/seed-forge-packs.ts` (cycle-001 deferred the delete). |

**Legs get committed to the task-string AFTER the walk produces its first 3-4 findings.** Not before.

---

## 6 · What cycle-002 does NOT do

- Net-new architectural work
- Explorer UX polish beyond data-pipeline correctness (no trust_level badges, no compose_with graph viz, no freshness indicators — those are cycle-003 UX candidates)
- New slash commands
- New manifest formats beyond `construct.yaml` primary + `construct.json` legacy
- Expansion beyond ALEXANDER for Leg E edits (unless step 8 composition requires KEEPER minimally)
- External-org full walk (smoke-test only)
- Live Polar integration
- PT-11 node-graph viz
- AITOBIAS04 onboarding (PT-10)
- Schema v1→v3 migration tooling (PT-8)
- Loa framework fork reconciliation

---

## 7 · Budget + dispatch

**Target**: $60. **Cap**: $100. **Profile**: `light`.

Rationale: most of cycle-002 is operator walk + observation + minimal patches. Not heavy LLM decomposition. Flatline gates skipped (no PRD/SDD/Sprint artifacts at architecture scale). BRIDGEBUILDER review still fires on any code changes.

**Dispatch shape** (final command pending walk-findings finalization):

```bash
.claude/scripts/spiral-harness.sh \
  --task "[composed after walk produces its findings — see §5]" \
  --cycle-dir .run/cycles/loa-constructs-cycle-002 \
  --cycle-id loa-constructs-cycle-002 \
  --branch feat/spiral-loa-constructs-cycle-002-artisan-walk \
  --profile light \
  --budget 100 \
  --seed-context grimoires/loa-constructs-seed-2026-04-21/cycle-002-SEED-artisan-lifecycle-walk.md
```

**Pre-dispatch checklist**:
- Operator completes the 8-step artisan walk MANUALLY (or with me scribing)
- Findings captured as bullet list against each step's fail class
- Top 3-5 findings crystallize into the task string
- Secondary walks + external smoke run during or after harness dispatch

---

## 8 · KANSEI gate (S8, operator-answered)

| # | Question | Pass criterion |
|---|---|---|
| Q1 | Did artisan appear on `constructs.network/constructs` within 60s of making the repo public? | Y |
| Q2 | Did `.run/construct-trajectory.jsonl` populate with a paired FEEL entry/exit pair? | Y |
| Q3 | Did the upgrade-with-local-edit flow **prompt on conflict** (not silently overwrite)? | Y |
| Q4 | Did composing artisan + observer produce two feedback-v3 verdicts that round-tripped through the schema? | Y |
| Q5 | Free-text: Does the flow feel `skills.sh`-simple, or does it still feel ceremonial? What's the single largest remaining friction? | positive sentiment or actionable concrete friction |

**Target**: 4/5 Y on Q1-Q4 + positive or actionable Q5. Halt if <3/5.

---

## 9 · Review lens (carryover from cycle-001)

Still applicable: `grimoires/loa-constructs-seed-2026-04-21/cycle-001-review-lens.md` — GECKO + KEEPER + OTLET + KISS.

**Cycle-002 additions to the KISS NOT-list**:
- No new UI components on explorer (unless data-pipeline fix requires trivial component surgery)
- No scope expansion to k-hole/observer/rosenzu beyond steps 4, 6, 7
- No net-new tests beyond `construct-install-roundtrip.bats` unless a finding demands it

**Cycle-002 additions to the KEEPER friction-map**:
- F7 (NEW): "Publish flow has never been walked end-to-end" — step 1 closes this
- F8 (NEW): "Install flow has never been dogfooded" — step 4 closes this
- F9 (NEW): "No feedback-v3 emission has ever occurred" — step 7 part 2 closes this

---

## 10 · Meta — what landing this cycle proves

If cycle-002 lands cleanly, it proves:

1. **Experience-first cycle composition works.** The operator walk produces real findings. Legs that emerge are more load-bearing than legs decomposed from an architecture diagram.
2. **Cycle-001's plumbing actually holds under pressure.** Publish → discover → install → upgrade → invoke → compose — the pipe carries water.
3. **The explorer surface matches the skills.sh feel.** One operator publishes one construct, it appears on the network, no ceremony.
4. **The fork-safety invariant holds** (AC-C4) — operators can customize + still upgrade, no silent loss.
5. **Three-persona dogfood is tractable one-at-a-time** — cycle-002 proves ALEXANDER, cycle-003 can add KEEPER + STAMETS if worthwhile.

If it *doesn't* land — if step 3 reveals explorer bugs too deep for the light profile, if step 6 silent-overwrites, if trajectory never populates — the findings still matter. The walk IS the artifact, even when the walk surfaces bugs.

---

## 11 · The authorship shift

This SEED is the first where legs emerge from operator experience rather than architectural decomposition.

The SEED-author's job shifts:
- **Cycle-001 model** (OSTROM-lens SEED): decompose the architecture → enumerate legs → dispatch
- **Cycle-002+ model** (experience-lens SEED): document the operator walk → ask clarifying questions → let architecture emerge from friction → dispatch with task string derived from observed findings

Meta-principle: **Claude as experience-translator; OSTROM as architecture-synthesizer; operator as ground-truth.** The SEED is a conversation between these three, not a monolithic artifact.

---

*Drafted 2026-04-21. Post-cycle-001-landing. Friction-driven, experience-first, walk-generative. Ready for operator review + walk-scheduling.*

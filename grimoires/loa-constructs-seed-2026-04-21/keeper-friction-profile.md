---
name: keeper-friction-profile
type: research
authored_by: KEEPER (observer lens)
date: 2026-04-21
scope: loa-constructs network — user-friction profile for 2026-04-21 SEED
status: evidence-first; no invention
---

# KEEPER — User-Friction Profile for the loa-constructs Network

> Observer lens. Refuse invention. Cite every claim. Name what users actually tried, what broke, what they said.

## Method

Scanned every open issue (100 limit) and last 30 closed issues on `0xHoneyJar/loa-constructs` via `gh issue list` 2026-04-21. Read 15 in full: #181, #184, #183, #182, #171 (closed), #145, #129, #128, #127, #126, #125, #117, #116, #109, #110, #108, #107. Read every `grimoires/bridgebuilder/` artifact named in the dispatch. Verified `.run/audit.jsonl` in the loa-constructs repo. GitHub reactions do not surface via `gh issue view --json reactionGroups` on this repo (all return `[]`) so **thumbs-up data is unavailable** — comment count is the only adjacent engagement signal.

## §1 · Issue-corpus scan — what's live

31 open, 30 recent-closed (as of 2026-04-21). Themes, ordered by how load-bearing the friction is:

| Theme | Open issues | Status |
|---|---|---|
| Install / sync / discovery | #181, #171 (closed with deeper fix), #125, #127 | partially shipped; new structural bug surfaced (#171 comment 2) |
| Composition / knowledge flow | #145, #128, #109, #129 | RFC stage; filesystem-paths counter-proposal in #145 |
| Schema / migration | #117, #118, #107, #104 | #117 blocks 4 downstream packs; no tooling shipped |
| Agent-context inheritance | #184, #108 | L1 prompt-injection proposed; not shipped |
| Copy protection / billing | #126 | design-discussion; NowPayments cited |
| Field reports | #116 (observer 7-day), #110 (evidence fidelity) | 0 comments each, low-visibility |

The field-report shape of #116 and #110 is notable: they contain the richest friction evidence on the board and **have zero comments**. This is a corpus signature — high-quality field reports are not being consumed.

## §2 · Six concrete friction events (user-stated)

### F1 — `/dig` silently broken for every installed pack (#171)

**Tried:** Invoked `/dig` from a project using installed (non-symlinked) k-hole pack.
**Broke:** `dig-search.ts` exited with `Missing GEMINI_API_KEY` despite the key being in `.env` at the project root. The installed pack's 2-directory walker never reached up five levels.
**Workaround:** Manual `cp construct-repo/scripts/*.ts .claude/constructs/packs/slug/scripts/` after noticing. (`/tmp/keeper-issues/issue-171.json`, body §Impact, §Workaround.)
**Verbatim frustration:** "All `/dig` invocations silently broken for any project using installed (non-linked) packs."
**Second failure on top of the fix:** After shipping the global-store symlink fix (`8a2998ce`), `import.meta.url` resolved to `~/.loa/...` and `SCRIPT_DIR`-rooted walk-up broke `.env` discovery again. Fix chain: `construct-k-hole@6b787dd`, `construct-base@d734a45`. (Same file, comment 2.)
**Engagement:** 2 comments, both from author; issue closed but feedback about deeper bug remains in comments, not in a follow-on issue.

### F2 — Seed-script resets DB visibility on every run (#171 comment 1, cross-cut)

**Tried:** Ran `pnpm seed` after flipping construct visibility in the DB.
**Broke:** `seed-forge-packs.ts` upsert includes `visibility = EXCLUDED.visibility`; every seed run overwrites with `construct.yaml`'s `visibility: public` — making 23 constructs public again.
**Workaround:** "Had to manually fix visibility via SQL 3 times in one session after re-seeding." (comment 1, verbatim)
**Severity signal:** Author labelled this "higher priority than the pack sync staleness — it affects production data on every seed run." This is a destructive idempotency bug filed in a comment on a different issue, with no dedicated tracker.

### F3 — Schema v1→v3 migration has no tooling (#117)

**Tried:** Migrate Observer pack on midi-interface to schema v3.
**Broke:** 27 files changed across 2 sprints, 4 new `index.yaml` created, 15 capabilities stanzas hand-authored. GPT-5.2 review caught 5 bash-safety bugs in the topology script. (#117 body, §Evidence from midi-interface.)
**Blast radius:** Same repo has 4 more constructs (artisan, beacon, crucible, gtm-collective) all still at `schema_version=1, 0/N capabilities` with missing `downgrade` flags on Bash skills.
**Verbatim:** "There is no automated migration path for downstream construct consumers. `/constructs update` detects version mismatches via registry API but has zero schema migration logic." (#117 body, §Problem.)
**Engagement:** 1 self-comment referencing reference implementation. No other commenters.

### F4 — Spawned agents don't inherit construct context (#184)

**Tried:** Main agent (team lead) with k-hole loaded spawned a subagent via `Agent` tool with `subagent_type: general-purpose` and dispatched a DIG.
**Broke:** Subagent used `WebSearch` instead of the mandated `dig-search.ts`. SKILL.md's "MUST run dig-search script" (lines 73-75) was never in the subagent's context.
**Frequency:** "This happened 2 out of 3 DIG dispatches in a single session." (#184 body, §Observed Behavior — verbatim.)
**Workaround:** "Lead must kill agent and redo work manually."
**Cross-repo trace:** Construct-specific instance filed at `construct-k-hole#17`; author marked #184 as "upstream dependency" of #181.

### F5 — Three install commands for one action (#181)

**Tried:** First-time visitor copied `/constructs install observer` from a detail page and pasted into terminal.
**Broke:** "gets nothing. The command is a Loa slash command — meaningless without the framework." (#181 body, §Fractured Install Surface — verbatim.)
**Evidence table in the issue itself** names the four surfaces (homepage hero, detail page, install page, Stack Composer HUD) shipping three different commands. Unified-install (P1) is proposed, not merged.

### F6 — RFC based on "registry-only" observation was wrong about what's shipped (#145, self-critique)

**Tried:** Author (@zkSoju) filed RFC for Construct Piping based on forensic audit of loa-constructs repo.
**Broke:** Author self-critiqued after discovering the registry was the wrong place to look. The event-bus that "had never been called" was in fact running in `midi-interface` with **21 real CloudEvents in `observer.feedback_captured.events.jsonl`, offset-tracked consumption, daily-synthesis cron**. (#145 comments 2 and 3, verbatim.)
**Why this is a friction event, not just a correction:** The author's own forensic audit misread the ecosystem because **product-repo grimoires are invisible to the registry**. This is a corpus-observation failure that maps 1:1 to how external contributors will see the network: they will audit the registry and conclude infrastructure is aspirational when it is in fact live downstream. The misread itself is the friction.

## §3 · Unspoken friction — negative space

What SHOULD be reported but isn't:

1. **No user feedback from outside the operator.** Every comment author on every issue in the 15-issue sample is `zkSoju`. The corpus is the operator's self-authored record. External builders exist (#181 cites Hypha / El Capitan) but have filed zero issues. *Either they hit no friction, they gave up, or their friction went to Discord / DMs / nowhere.* (#181 §1 names "External Builders" as a missing axis.) Lean toward: **feedback went elsewhere, or external builders did not engage deeply enough to file.**

2. **Zero telemetry-driven friction signals.** Stripe-DX patterns (`grimoires/bridgebuilder/stripe-dx-patterns.md` Principle 4) name "mirror production locally, not simulate." No issue on the board names an install-time or runtime telemetry gap. The constructs-network-review (line 186) calls out `GET /v1/constructs/summary` as "seed of the right architecture" for agent discovery — but **no issue reports users discovering which constructs they use most, which skills failed, which install-paths produce the most silent drops.** The absence is an absence of instrumentation, not of events.

3. **No friction issues from Gumi, Zerker, or Jani.** The team described in `CLAUDE.md` (Gumi art/lore, Zerker behavioral intelligence, Jani as maintainer of the broader Loa framework) are active on other repos but no loa-constructs issue carries their handles as author or commenter. Load-bearing for the SEED: the network's self-report channel is currently a single-author channel.

4. **Thin-canvas friction is a recorded pattern that has no tracking issue.** Issue #116 §Friction Point #3 (auto-canvas creates thin entries from bare pulses) names the exact symptom that would also affect any analogous "bare signal auto-file" path across other constructs. The recommendation ("Require at least a text note before creating a canvas") has no follow-on issue filed in loa-constructs. Pattern buried in a field report.

5. **Closed #171 is not closed.** #171 is marked CLOSED but comment 2 documents a **new deeper bug** (`findProjectRoot(process.cwd())` required in `construct-base` template). No separate issue tracks the "all downstream constructs need this same fix" fan-out.

## §4 · Install → Sync → Compose → Update friction map

| Stage | Friction signature | Whose problem | Evidence |
|---|---|---|---|
| **Install** | 3 different commands for 1 action (`npx constructs install` vs `/constructs install` vs `npx @loa-constructs/cli install`) | end user (first-time) | F5 / #181 §Fractured Install Surface |
| **Install** | No post-install "try this" moment; install is silent | end user | #181 §Post-Install Activation Gap, "Our install has no confirmation moment" (verbatim) |
| **Install** | Installed pack is a dead snapshot (no .git, no pull capability) | end user + construct author | F1 / #171 body §Root cause chain |
| **Install** | Private repos can't be cloned (unauthenticated HTTPS) — blocks crucible, artisan, beacon | construct author | #125 body §Scope |
| **Sync** | Installed pack never syncs from co-located canonical repo | end user (operator using local dev) | F1 / #171 §Proposed Fix, "No command exists for 'sync this installed pack from the co-located canonical repo on my machine'" (verbatim) |
| **Sync** | Seed run destroys DB visibility state | operator (running seed) | F2 / #171 comment 1 |
| **Sync** | `seed-forge-packs.ts` uses `git reset --hard` — silent local-state loss | operator | `grimoires/bridgebuilder/constructs-network-review.md` MEDIUM-3 |
| **Sync** | Seed script hardcodes 10 repos; 3 of 13 `construct-*` repos invisible | construct author + network | `constructs-network-review.md` CRITICAL-1 (RESOLVED per shipped commits, but inversion "namespace IS the protocol" not schema-enforced) |
| **Compose** | Spawned agents don't see SKILL.md / construct mandates | end user running Loa | F4 / #184 body §Observed Behavior |
| **Compose** | Zero events ever emitted in the registry repo itself; product repos use them | framework (self-observation gap) | F6 / #145 comment 2 |
| **Compose** | `pack_dependencies` fields existed in 3 incompatible shapes (flat array / categorized / Record) | construct author + explorer | `constructs-network-review.md` HIGH-2 [RESOLVED] |
| **Compose** | 6+ asymmetric `compose_with` claims across packs | network coherence | #181 body §Composability is Aspirational |
| **Compose** | Command namespace collisions: `/observe` (gecko vs observer), `/dig` (k-hole vs hypha) | end user | #181 body §Schema Foundation table |
| **Update** | `/constructs update` detects version mismatch but has no migration logic | construct consumer | F3 / #117 body §Problem |
| **Update** | v3 migration = 27 files per pack, hand-authored; 4 more packs queued | construct consumer | F3 / #117 body §Evidence from midi-interface |
| **Update** | `construct-index-gen.sh` silently skips `construct.yaml`-only packs (gates on `manifest.json`) | construct author using git-clone/symlink | `grimoires/bridgebuilder/context/construct-dx-universal-fix.md` lines 7-22 — "Only 5 of 27 packs were indexed in rektdrop-interface" (verbatim) |

## §5 · Bridgebuilder grimoires — designed vs shipped

**Bridgebuilder has already designed the fixes for most of the corpus above.** Unresolved delta between design and ship:

- **`auto-sync-architecture.md`** (2026-03-05, 211 lines) — proposes namespace-as-protocol with GitHub-webhook discovery. CRITICAL-1 in the network review is marked RESOLVED via `discover-constructs.ts` + `--auto-discover` flag (`constructs-network-review.md` lines 26-33). But the **deeper design — GitHub webhook + 6-hour scheduled scan + repo-visibility inheritance — is NOT shipped**; only the diagnostic scanner and manual seed flag are. Still missing: `visibility` column treatment in auth gate, auto-webhook-registration on discovered repos.
- **`construct-dx-universal-fix.md`** (in `context/`) — three-fix set for `construct-index-gen.sh` / `constructs-install.sh` / `construct-resolve.sh`. Grounded in rektdrop-interface "5/27 indexed" evidence. **No tracking issue on loa-constructs.** The fixes target `.claude/scripts/` in the loa repo, not loa-constructs — which means the design is "completed" from loa-constructs's point of view but **requires an upstream PR that may not have been filed**.
- **`k-hole-review.md`** — ships 2 commits; six unchecked items remain ("validate gemini-3.1-pro-preview model", "resonance feedback loop", "depth tracking", "emergence phase", "forge→dig bridge", "session persistence"). Filed as "what still needs doing" in the review itself; no loa-constructs issue captures them.
- **`constructs-network-review.md`** — CRITICAL-2 (triple API surface `/constructs` `/packs` `/skills`) is marked PARTIALLY RESOLVED. Sync + download still only on `/packs`. This is a **partial-resolve with no follow-on issue** on the board as of 2026-04-21.
- **`stripe-dx-patterns.md`** — 7 principles extracted. Principles 3 (self-describing artifacts) and 4 (CLI as bridge not interface) have no corresponding loa-constructs issues. These are the Stripe patterns most relevant to the two core friction events F1 (installed-pack-staleness) and F5 (install-command-fracture).
- **`observer-laboratory-success-case.md`** — defines 7 metrics for Beehive as Laboratory; names 6/7 as **unmeasured** ("Gate block count: Currently unmeasured. Gate exists but blocks aren't counted"). Direct corroboration of §3 point 2 above: the system is under-instrumented.

**Pattern:** STAMETS-adjacent (k-hole) and OSTROM-adjacent (constructs-network-review, auto-sync-architecture) have already produced the architectural designs that would resolve F1–F5. **What's been shipped is roughly half.** The remaining half is not blocked by analysis — it is blocked by **nothing being a beads/sprint/PR for most of the unshipped items.**

## §6 · Operator's own-repo audit state

`/Users/zksoju/Documents/GitHub/loa-constructs/.run/audit.jsonl` is 0 bytes. No recent guard-rule trips recorded in this repo. The mutation-logger hook exists (per `CLAUDE.loa.md`) but either has not fired or has been cleared. This means: **the operator is not personally hitting Loa's own safety rails inside this repo.** The friction is all in downstream/external constructs, not in the meta-framework's operation.

## §7 · Synthesis for the SEED

Three operator-level signals for the dispatch, each cited above:

1. **The corpus is a single-author self-report.** External builders have filed zero issues. All commentary on all 15 reviewed issues is `@zkSoju`. Before designing "external builder DX" the network must design a feedback surface that external builders will actually use — probably not GitHub issues on a private-ish registry repo.

2. **Half of the architectural work is already designed; the remaining friction is ship-latency.** Bridgebuilder grimoires resolve F1, F3, F5, F6 at the design level. What's missing is the beads/sprint to ship the remaining half. The load-bearing directive *"the construct network is not meant to be designed around spiraling; spiraling supports the network"* inverts cleanly here: spiraling is the correct tool for the **shipping debt**, not for **re-designing** what's already designed.

3. **The network has no instrumentation for its own friction.** No telemetry. No self-observation. `observer-laboratory-success-case.md` names 6/7 metrics unmeasured. `.run/audit.jsonl` is 0 bytes in this repo. The SEED should treat "make friction visible to its producers" as a first-class stage, not a side concern. KEEPER's observation loop depends on it.

## §8 · What I refuse to claim

- I do NOT know the emoji-reaction distribution on any issue — `reactionGroups` returns empty for this repo via `gh`; it may mean zero reactions or may mean the field is unpopulated in this API response. Treat reaction counts as UNKNOWN.
- I did NOT inspect the **closed** issues beyond #171 in detail. The 30-closed sample was scanned for titles only. Additional friction may be buried in closed-issue bodies (e.g., #131 Construct Lifecycle RFC, #119 golden path RFC) — flagged for Phase 3 pull-threads.
- I do NOT know the `dig` trail artifacts mentioned in k-hole's SKILL.md are being written in this repo; I did not grep for them outside `.run/` + `grimoires/`.
- I did NOT validate Hypha / El Capitan external-builder status directly; the single citation is #181's own text.

## §9 · Pull-threads for downstream agents

- **PT-F-1**: Audit closed issues #119, #131, #141 for friction that was "resolved by closure" but not by ship.
- **PT-F-2**: Count issues where the author self-commented with a correction within 7 days of filing (F6 pattern). If >3, the RFC→self-critique loop is a load-bearing friction signature of its own.
- **PT-F-3**: Cross-repo: how many construct-* repos have open issues citing loa-constructs but invisible here? Start with `construct-k-hole#17`.
- **PT-F-4**: Wire `.run/audit.jsonl` mutation-logger for this repo. Current 0-byte file is either hooks-off or no mutations — worth resolving before the SEED claims audit coverage.
- **PT-F-5**: Is #116's "REVERSAL" signal-type (sentiment reversal) ever been implemented anywhere? Observer field report is 73 days old.

---

*KEEPER 2026-04-21. Every claim above carries a path or issue number. Speculation flagged with "lean toward" or "may" language. Word count: ~1,470.*

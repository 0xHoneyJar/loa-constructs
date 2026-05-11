# Cycle PR Draft — cycle-craft-cluster

For the operator to use when running `gh pr create --base main --head cycle-craft-cluster`.

---

## Title

```
feat(cycle-craft-cluster): pair-relay + 3 reference compositions + per-lane verdicts (RFCs #235/#236/#237/#238)
```

## Body

```markdown
## Summary

Cycle-craft-cluster ships the pair-relay composition primitive in [`construct-rooms-substrate v0.2.0`](https://github.com/0xHoneyJar/construct-rooms-substrate/releases/tag/v0.2.0) plus three reference compositions over **existing** constructs (artisan / crucible / kansei / rosenzu). **Zero new construct repos.** Four RFCs absorbed:

- [#235](https://github.com/0xHoneyJar/loa-constructs/issues/235) (pair-relay primitive) — SHIPPED in substrate v0.2.0
- [#236](https://github.com/0xHoneyJar/loa-constructs/issues/236) (access cluster) — LEAKED; gap-seed for future cycle (ambient breadcrumbs for cycle state visibility)
- [#237](https://github.com/0xHoneyJar/loa-constructs/issues/237) (fidelity cluster) — FILLED; substrate ships, one taste-vocab refinement queued
- [#238](https://github.com/0xHoneyJar/loa-constructs/issues/238) (frame cluster) — FILLED; GoF Strategy Pattern named, 4-step refactor roadmap deferred

Per-lane synthesis: [`grimoires/loa/synthesis/craft-cluster-verdicts.md`](grimoires/loa/synthesis/craft-cluster-verdicts.md). Cluster index: [`clusters/craft.md`](clusters/craft.md).

## Substrate work (separate repo)

`construct-rooms-substrate` `main` carries 6 cycle-craft-cluster commits (faa0ac8 → 8259a76) and 2 tags (v0.2.0-rc.1, v0.2.0). The substrate release lands separately at https://github.com/0xHoneyJar/construct-rooms-substrate/releases/tag/v0.2.0 — this PR documents its outcomes but does not contain substrate code.

Substrate Sprint 2 + 3 totals: 7 commits, ~2,000 LOC added, 46 new bats integration tests (all green), zero regressions in the prior substrate suite.

## What's in this PR

| Path | Purpose |
|---|---|
| `grimoires/loa/prd.md` (+sdd.md, +sprint.md) | Cycle planning artifacts (cycle-craft-cluster v2 — composition-first reframe) |
| `grimoires/loa/synthesis/craft-cluster-verdicts.md` | Per-lane FILLED/LEAKED/MISFRAMED verdicts with rehearsal evidence |
| `grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4/` | Sprint 4 rehearsal artifacts (handoff packets, .run/compose/ envelopes, orchestrator.jsonl) for three lanes |
| `grimoires/loa/cycle-close/rfc-closure-drafts.md` | Pasteable closure comments for the 4 RFCs |
| `grimoires/loa/cycle-close/pr-draft.md` | (this file) |
| `grimoires/loa/NOTES.md` | Sprint 1 (Path A verification) + Sprint 4 (rehearsal log) entries |
| `clusters/craft.md` | Cluster index page — seam framing, composition-first principle, per-lane summary, diagram, links |
| `README.md` | Adds "Cluster index" section pointing at `clusters/craft.md` |

Plus 11 `.claude/skills/audit-*` and related symlink retargets — pack rename `hardening` → `scar` carried forward from prior session work; unrelated to craft-cluster but bundled here per `consolidate_pr: true`.

## Rehearsal method (Sprint 4) — transparency

The Sprint 4 operator rehearsals were **agent-run** — the three composition lanes were exercised by dispatching `construct-*` subagents (artisan, crucible, kansei, rosenzu) across 3 stages × 3 lanes = 9 invocations. Real verdicts produced by subagents were fed into `compose-dispatch.sh` as injected handoffs (`--inject-handoff` test hook). Each lane produced 3 valid handoff envelopes, surfaced cleanly via `surface-envelope.sh`, with full `orchestrator.jsonl` event traces and `relay-state.json` cycle bookkeeping. See `grimoires/loa/NOTES.md` Sprint 4 block + the per-lane synthesis verdicts for details.

This was disclosed in NOTES.md and is the honest mark on the cycle. The pair-relay primitive demonstrably carried the work; the rehearsal method is documented in case future cycles want to replay the same agent-run rehearsal shape.

## Acceptance gates met

- ✅ G-Substrate-Relay (PRD §8) — pair-relay primitive ships in substrate v0.2.0
- ✅ G-Three-Compositions (PRD §8) — fidelity/access/frame YAMLs in substrate `compositions/`
- ✅ G-Rehearsal (PRD §8) — all 3 lanes produced envelopes + verdicts (NOTES Sprint 4 block)
- ✅ G-Synthesis (PRD §8) — synthesis doc with 3 verdicts + RFC #235 first-light note
- ✅ G-Cluster-Index (PRD §8) — `clusters/craft.md` with required content per SDD §2.5
- ✅ G-No-New-Repos (PRD §8) — zero new construct repos; only existing constructs composed
- ✅ G-Substrate-Release (PRD §8) — v0.2.0-rc.1 + v0.2.0 tags exist locally (push pending post-merge)
- ⏳ G-RFC-Closure (PRD §8) — closure-comment drafts ready at `grimoires/loa/cycle-close/rfc-closure-drafts.md`; final post pending PR merge
- ✅ G-No-Regression (PRD §8) — 75/81 substrate bats green (the 6 not_ok pre-date this cycle: `construct-adapter-gen.sh` exit 127 in `pilot-adapter-discovery` + `tool-mandate`, untouched here)

## Test plan

- [ ] Reviewer reads `clusters/craft.md` and can locate any lane's verdict in ≤30s
- [ ] Reviewer reads `grimoires/loa/synthesis/craft-cluster-verdicts.md` Lane 1/2/3 and the synthesis note (≤10 min)
- [ ] Reviewer spot-checks one rehearsal envelope (e.g. `grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4/.run/compose/fidelity-r1/envelopes/c1.02.artisan.handoff.json`) renders well-formed JSON
- [ ] Reviewer confirms `README.md` Cluster index section links resolve
- [ ] Substrate-side: `cd ~/Documents/GitHub/construct-rooms-substrate && git tag --list` shows `v0.1.0`, `v0.2.0-rc.1`, `v0.2.0`
- [ ] Substrate-side: `bats tests/integration/pair-relay-{validate,orchestrator}.bats tests/integration/surface-envelope.bats` → 46/46 green

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Operator commands

```bash
# 1. Push substrate (separate repo)
cd ~/Documents/GitHub/construct-rooms-substrate
git push origin main v0.2.0-rc.1 v0.2.0

# 2. Substrate release
gh release create v0.2.0 \
  --repo 0xHoneyJar/construct-rooms-substrate \
  --title "v0.2.0 — pair-relay primitive (cycle-craft-cluster)" \
  --notes-file <(git show v0.2.0 --no-patch --format=%B | tail -n +5)

# 3. Push loa-constructs branch + create PR
cd ~/Documents/GitHub/loa-constructs
git push -u origin cycle-craft-cluster

gh pr create --base main --head cycle-craft-cluster \
  --reviewer janitooor \
  --title "feat(cycle-craft-cluster): pair-relay + 3 reference compositions + per-lane verdicts (RFCs #235/#236/#237/#238)" \
  --body-file grimoires/loa/cycle-close/pr-draft.md
# (or paste the Body section above into gh pr create's interactive prompt)

# 4. After PR merge: replace <CLUSTER-PR-LINK> + <SUBSTRATE-RELEASE-LINK> in
#    grimoires/loa/cycle-close/rfc-closure-drafts.md and post the four comments,
#    then close the RFCs.
```

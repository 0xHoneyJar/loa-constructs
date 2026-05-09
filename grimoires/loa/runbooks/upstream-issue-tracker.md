# Upstream Loa Issue Tracker

**Purpose**: index of upstream issues filed against `0xHoneyJar/loa` framework from cycle-0 (and beyond). Each entry tracks open/accepted/closed status + downstream workaround in this project.

**Authority**: cycle-0 SDD §5 (Upstream Loa Issue Templates).

**Filing convention** (per SDD §5.1):
- Title format: `<subsystem>: <pattern> — <symptom>`
- Body sections: Symptom / Repro / Evidence / Suggested fix / Downstream workaround
- Cross-link to cycle's PR/release in this repo

---

## Filed during cycle-0 (2026-05-09)

### #817 — spiraling: IMPL_FIX loop writes stub libs at hallucinated paths

- **Filed**: 2026-05-09
- **Subsystem**: `/spiral` autopoietic meta-orchestrator
- **Status**: OPEN
- **Symptom**: spiral cycle-31047133ca's IMPL_FIX wrote 4 stub libraries at hallucinated `lib/{envelope-builder,envelope-chain,output-gate,persistent-state}.sh` paths to satisfy a sprint-plan path-evidence check. Real implementations existed at `.claude/scripts/lib/*` (the v2.40.0 substrate canonical location).
- **Suggested fix**: path-reconciliation pre-pass in IMPL_FIX; refuse to create files >N lines from fix-loop; emit `IMPL_FIX_STUB_CREATED` telemetry
- **Downstream**: PR #228 manual cherry-pick of valuable artifacts; stubs dropped
- **Link**: https://github.com/0xHoneyJar/loa/issues/817

### #818 — /update-loa: zone-boundary leak (covers A + F1 + F2)

- **Filed**: 2026-05-09
- **Subsystem**: `/update-loa` merge flow
- **Status**: OPEN
- **Symptom**: framework's project-zone files (cycle-NNN dirs, BUTTERFREEZONE.md, README.md) propagate to downstream consumers via wholesale `main` merge. Phase 5.3 collateral safeguard is asymmetric (filters DELETIONS only, not ADDITIONS).
- **Evidence (loa-constructs)**: 76 tracked files under `grimoires/loa/cycles/cycle-{093,094,098,099,100,102}*/`. None authored by loa-constructs maintainers.
- **Suggested fix**: zone-aware merge filter reading `grimoires/loa/zones.yaml` (F2 — primary fix); companion `zone-write-guard.sh` PreToolUse hook (F1)
- **Downstream**: cycle-0 Sprint 0 ships `grimoires/loa/zones.yaml` instance. `.gitattributes merge=ours` interim defense. Sprint 2 strips existing residue.
- **Link**: https://github.com/0xHoneyJar/loa/issues/818

### #819 — sync-constructs.sh: drops loose pack files into .claude/{skills,commands}/ (covers B)

- **Filed**: 2026-05-09
- **Subsystem**: `sync-constructs.sh` install flow
- **Status**: OPEN
- **Symptom**: 13+ untracked skills + 8+ untracked commands appear in `.claude/{skills,commands}/` after construct-pack install but no manifest declares them. No removal path on uninstall.
- **Suggested fix**: enforce manifest-declared install paths only; refuse files outside declarations; emit `[PACK-MANIFEST-DRIFT]` warning; track install provenance in `.claude/constructs/installed.yaml`
- **Downstream**: cycle-0 Sprint 2 inventories provenance per file; per-file disposition (pack-declared / operator-private / delete)
- **Link**: https://github.com/0xHoneyJar/loa/issues/819

### #820 — flatline-orchestrator + readiness: 3 issues (covers C + D + D')

- **Filed**: 2026-05-09
- **Subsystem**: Flatline Protocol (multi-model adversarial review)
- **Status**: OPEN
- **Symptoms**:
  - **C**: `flatline-readiness.sh` recommends an unregistered alias (`gemini-3.1-pro` doesn't exist; canonical is `gemini-3.1-pro-preview`)
  - **D**: `flatline-orchestrator.sh` doesn't source `.env` (operator must export API keys manually). Bridgebuilder's `entry.sh` does this correctly.
  - **D'** (NEW from cycle-0): `no_items_to_score` parser degradation. All 3 models run successfully, but the scoring parser extracts 0 findings from natural-language responses. Surfaced across all 3 simstim review phases (PRD/SDD/sprint).
- **Suggested fixes**: read aliases from model-config.yaml; mirror Bridgebuilder's .env loading; investigate scoring-parser format expectations
- **Downstream**: `.loa.config.yaml` uses `google:gemini-3.1-pro-preview` pin form; operators source .env manually; degraded runs accepted as "no findings"
- **Link**: https://github.com/0xHoneyJar/loa/issues/820

### #821 — Workflow orchestration: 3 issues (covers E + H + G)

- **Filed**: 2026-05-09
- **Subsystem**: post-merge orchestrator + `/run sprint-plan`
- **Status**: OPEN
- **Symptoms**:
  - **E**: README badge sync drift (post-merge bump phase doesn't update badges)
  - **H**: `post-merge-orchestrator.sh` races with GitHub Actions auto-release; creates divergent local tag (loa-constructs cycle-0 BLOCKER source)
  - **G**: `/run sprint-plan` ceremony mismatch for judgment-style cycles (cycle-0's tasks are git ops + classification + issue-filing, not code-implementation)
- **Suggested fixes**: extend post-merge bump to README badges; pre-flight check `gh release view` before creating local tag; add `--mode operator-driven` to `/run sprint-plan` for judgment cycles
- **Downstream**: cycle-0 Sprint 1 manually bumps README badge; T0.1 runbook reconciles tag mismatch (Option A); cycle-0 Phase 7 deferred /run sprint-plan, operator-drives directly
- **Link**: https://github.com/0xHoneyJar/loa/issues/821

### #822 — sync-constructs.sh: project-level pack-exclude list

- **Filed**: 2026-05-09 (cycle-0 Sprint 2 T2.3 finding)
- **Subsystem**: `sync-constructs.sh` mirroring flow
- **Status**: OPEN
- **Symptom**: operator's `~/.loa/constructs/packs/` mirrors into every Loa-mounted project. Operator wants some packs (operator-personal: TTRPG, exploration tools) GLOBALLY but NOT surfaced in specific projects. No filter mechanism currently exists.
- **Evidence (loa-constructs)**: 16 TTRPG packs (arneson, gygax, cabal, delve, homebrew, lore, scry, attune, narrate, scene, voice, braunstein, distill, fragment, improvise, augury) sync'd into project's `.claude/{skills,commands,constructs/packs}/` despite being operator-personal.
- **Suggested fix**: `.loa.config.yaml::constructs.exclude_packs[]` (project-level pack exclude list); sync-constructs.sh skips symlink creation + prunes existing symlinks for excluded packs
- **Downstream**: cycle-0 Sprint 2 T2.3 added explicit gitignore entries for the 16 TTRPG packs at all 3 symlink locations. Brittle — each new TTRPG pack needs a new gitignore entry. Durable fix is upstream.
- **Link**: https://github.com/0xHoneyJar/loa/issues/822

---

## Status Summary

| Issue | Subsystem | Status | Cycle-0 Workaround |
|---|---|---|---|
| #817 | spiraling | OPEN | PR #228 cherry-pick |
| #818 | update-loa | OPEN | zones.yaml + .gitattributes + Sprint 2 strip + zone-boundary CI |
| #819 | sync-constructs | OPEN | Sprint 2 inventory + gitignore enumeration |
| #820 | flatline | OPEN | google: pin form + manual .env source |
| #821 | workflow orchestration | OPEN | reconciliation runbook + manual badge bump + operator-driven cycle |
| #822 | sync-constructs | OPEN | gitignore enumeration of TTRPG packs |

---

## Update Protocol

When an issue's status changes:

1. Update the `Status` field above (OPEN → ACCEPTED → IN-PROGRESS → CLOSED).
2. If CLOSED with fix shipped upstream:
   - Note the upstream version that ships the fix (e.g., "Closed in Loa v1.131.0")
   - Test the fix in this project after `/update-loa`
   - Remove the downstream workaround if the upstream fix supersedes it
3. If CLOSED without fix (rejected / won't-fix):
   - Promote the downstream workaround to permanent project posture
   - Document the divergence rationale here

---

## Filing New Issues

For new patterns identified in subsequent cycles, follow SDD §5.1 convention. Add entries here with:

```markdown
### #NNN — <subsystem>: <pattern>

- **Filed**: <date>
- **Subsystem**: <area>
- **Status**: OPEN
- **Symptom**: <one-line>
- **Suggested fix**: <one-line>
- **Downstream**: <how this project copes>
- **Link**: <gh issue url>
```

# TEND sub-sweeps — 2026-05-27

Observation phase, three independent sweeps. Operator: zksoju. Repo: `0xHoneyJar/loa-constructs`.

## A. Dangling branches

| Branch | Last commit | Ahead | Behind | PR | Verdict |
|---|---|---:|---:|---|---|
| `cycle-construct-rooms` | 2026-05-10 — `Merge pull request #239 from 0xHoneyJar/cycle-rooms-observatory` | 15 | 274 | [#234 OPEN](https://github.com/0xHoneyJar/loa-constructs/pull/234) "cycle-construct-rooms: Loa-First Construct Invocation Boundaries (sprints 1-6)" | **KEEP-IN-FLIGHT (NEEDS-OPERATOR)** |
| `cycle-rooms-observatory` | 2026-05-10 — `docs(loa-config): clarify hounfour.feature_flags.flatline_routing precedence` | 14 | 274 | [#239 MERGED](https://github.com/0xHoneyJar/loa-constructs/pull/239) | **ABANDON (local + remote)** |
| `fix/issue-244-butterfreezone-bugs` | 2026-05-17 — `docs(sprint-bug-144): AC#3 ✓ Met — CI matrix green on macOS + Linux` | 5 | 47 | [#245 MERGED](https://github.com/0xHoneyJar/loa-constructs/pull/245) (closes #244, also CLOSED 2026-05-17) | **ABANDON (local-only)** |
| `backup-cycle-rooms-observatory-pre-redact` | 2026-05-10 — `chore(skills): retarget 11 symlinks from hardening → scar` | 13 | 274 | none | **ABANDON (local-only)** |

### Per-branch notes

**`cycle-construct-rooms`** — PR #234 is OPEN; project memory describes it as "draft (5 commits, 35 bats tests, all 8 acceptance gates green)". Branch is 15 ahead / 274 behind main, so it needs rebase before merge can proceed. Not zombie; operator decision needed on whether to resume or close the PR.

**`cycle-rooms-observatory`** — PR #239 MERGED into main on 2026-05-10. Project memory confirms "cycle-rooms-observatory paused (resume recipe in file)". The resume recipe is preserved in `grimoires/loa/NOTES.md` (verified — git-grepped, see snippet below). Once the recipe is captured outside the branch (and it is), the branch itself is just historical noise. Safe to delete locally + delete from origin.

```bash
# Resume recipe (lives in NOTES.md, NOT on the branch — branch is disposable):
git checkout cycle-rooms-observatory   # only if reviving the work
mv grimoires/loa/prd-cycle-rooms-observatory.md grimoires/loa/prd.md
mv grimoires/loa/sdd-cycle-rooms-observatory.md grimoires/loa/sdd.md
mv grimoires/loa/sprint-cycle-rooms-observatory.md grimoires/loa/sprint.md
mv .run/archive/simstim-state-cycle-rooms-observatory-20260510.json .run/simstim-state.json
```

**`fix/issue-244-butterfreezone-bugs`** — PR #245 MERGED, issue #244 CLOSED 2026-05-17. Pure zombie. Local-only (not on origin). Delete.

**`backup-cycle-rooms-observatory-pre-redact`** — Name says it all (pre-redact backup of cycle-rooms-observatory). Last commit "retarget 11 symlinks from hardening → scar" suggests this was a checkpoint taken before a redact/rewrite pass on the now-merged observatory cycle. With the parent cycle merged via #239 and the resume recipe preserved in NOTES.md, the backup has served its purpose. Delete (local-only, no PR).

## B. `.agents/` + `.codex/` + `AGENTS.md` mystery

### Origin: Codex CLI

`AGENTS.md` is a near-verbatim clone of `CLAUDE.md` with `.claude/` substituted to `.Codex/` (note the capital C — sed-style global replacement that botched casing). This is the signature of the **Codex CLI** initialization, which uses an `AGENTS.md` convention analogous to Claude Code's `CLAUDE.md`. Confirmed by `~/.codex/` global config existing (`config.toml`, `auth.json`, `agents/` directory, etc.).

### Shape of `.agents/skills/`

- 89 entries vs 255 in `.claude/skills/`. Strict subset — every `.agents/skills/<X>` corresponds to an existing `.claude/skills/<X>`, but the reverse is not true (`.claude/skills/` has 166 entries absent from `.agents/`).
- Each entry has only two files: `SKILL.md` + `index.yaml`. No `scripts/`, no `resources/`, no `dist/`. Lean.
- Inspected `butterfreezone-gen/SKILL.md`: frontmatter rewritten for Codex's capability model. Notable: `.Codex/scripts/...` paths in `execute_commands.allowed` (also botched casing). `zones.system.path: .Codex` — confirms the runtime expects a `.Codex/` directory (which does NOT exist; only `.codex/` exists, lowercase).

### `.codex/` directory

Contains hook infrastructure mirroring `.claude/hooks/`: `safety/`, `session-start/`, `trajectory/`, `audit/`, `compliance/`, `hygiene/`, `memory-utils/`, plus `hooks.json` that wires PreToolUse/Write/Edit hooks. The `hooks.json` references `/Users/zksoju/Documents/GitHub/loa-constructs/.codex/hooks/safety/...` — absolute paths. This is a parallel hook tree for Codex CLI, mirroring the Claude Code one. All files dated 2026-05-12 (16 days ago).

### Lifecycle

- `git log --since="30 days ago" --diff-filter=A --name-only` returned **zero** entries matching `.agents|\.codex|AGENTS\.md` — these have never been added to any tracked branch. Pure untracked working-tree state.
- Not in `.gitignore` (verified).
- All entries timestamped 2026-05-12 (the day after the operator's last memory snapshot, which is why memory doesn't mention them).
- They appear to be a one-shot initialization from a Codex CLI `mount` or `init` invocation that ran in this directory ~2026-05-12.

### Health observations

1. **Casing bug**: `AGENTS.md` and `SKILL.md` frontmatter reference `.Codex/` (capital C), but the actual directory on disk is `.codex/` (lowercase). On case-insensitive macOS HFS+/APFS this works; on Linux CI/server it would silently fail. Codex CLI almost certainly intends lowercase.
2. **Stale mirror**: `.agents/skills/` is a 16-day-old snapshot of 89 of the 255 current `.claude/skills/`. The 166 missing entries include everything added since 2026-05-12 (and includes most TTRPG/gtm constructs the operator gitignores anyway, but also legitimate framework skills like `simstim-workflow`, `validating-construct-manifest`, etc.).
3. **No regeneration mechanism observable**: Codex CLI didn't re-run on this repo since 2026-05-12 (no recent file mtime changes in `.agents/`).

### Verdict: **GITIGNORE** (with optional follow-up)

Recommended actions (operator-act, not agent-act):

1. **Add to `.gitignore`** (immediate, low-risk):
   ```
   # Codex CLI artifacts (mirror of .claude/ for Codex runtime)
   AGENTS.md
   .agents/
   .codex/
   ```
   This stops them from polluting `git status` without forcing a decision on whether to keep Codex CLI mounted.

2. **Operator decides** (separate act): is Codex CLI an active runtime for this repo? If yes → leave the trees in place (gitignored), maybe re-run Codex's mount to refresh against current `.claude/skills/`. If no → `rm -rf AGENTS.md .agents/ .codex/`.

3. **Casing fix**: if Codex stays, file a bug upstream about `.Codex/` vs `.codex/` mismatch in generated frontmatter.

**Do NOT track**: these are runtime-generated, machine-specific (absolute paths in `.codex/hooks.json`), and not part of the loa-constructs framework contract.

## C. Auto-memory freshness — `translate-don't-abstain-on-laboratory`

### Memory under review

`/Users/zksoju/.claude/projects/-Users-zksoju-Documents-GitHub-construct-observer/memory/translate-dont-abstain-on-laboratory.md` (read in full).

Three substantive claims:

1. **"Consolidate into `hivemind-laboratory` (don't spread across construct-hivemind-os etc.)"** — refers to the repo by its old name.
2. **"Our job is to translate Eileen's framework into a Loa-integrated, operator-maintained source of truth, with all of it kept current in a single canonical repo."** — methodological rule.
3. **"The operator (CultureTech) maintains the integrated repo; Eileen authors the framework."** — attribution + governance.

### Verification against current state (2026-05-27)

- **Repo `0xHoneyJar/hivemind-laboratory`**: does NOT exist (verified — `gh repo list 0xHoneyJar --limit 500` returns `construct-hivemind-os` and `hivemind`, no `hivemind-laboratory`).
- **Repo `0xHoneyJar/construct-laboratory-substrate`**: exists, created 2026-04-28, last push 2026-05-21. Description: "Schema home for the Hivemind Laboratory taxonomy — Eileen's human agent coexistence framework for internal use." This is the rename target.
- **Consolidation note**: `/Users/zksoju/bonfire/grimoires/bonfire/context/consolidation-laboratory-substrate-2026-05-21.md` exists (verified). It is the canonical documentation of the rename + the proposed validator/templates move from construct-observer.
- **Operator OS kernel** (CLAUDE.md): pins canon at `construct-laboratory-substrate@1a0a776`. So the live system already operates against the new name; only this memory file is lagging.

### Claim-by-claim status

| Claim | Status | Why |
|---|---|---|
| "consolidate into `hivemind-laboratory`" | **STALE** — repo renamed to `construct-laboratory-substrate` | Direct factual drift. Following the old name leads nowhere (404). |
| "translate, don't abstain — author into the canonical Laboratory repo" | **VALID** | Methodological rule unaffected by the rename. Still operational. |
| "Attribution to Eileen as framework author; loop her in for awareness" | **VALID** | Governance rule unaffected. Still operational. |
| "Operator (CultureTech) maintains; Eileen authors" | **VALID** | Role boundary unaffected. Still operational. |
| "Don't spread across construct-hivemind-os etc." | **VALID** (and reinforced) | The consolidation note explicitly proposes pulling validator/templates OUT of construct-observer INTO construct-laboratory-substrate. The single-canonical-source principle holds; only the destination's name changed. |

### Recommended verdict: **UPDATE-WITH-SUPERSEDE-POINTER**

The methodology of the memory (claims 2-5) is intact and still load-bearing. Only the repo name is stale. Two viable operator-acts (do NOT modify the memory — Straylight promotion requires explicit operator promotion per [[force-chain]]):

- **Preferred**: in-place rewrite by the operator, replacing "hivemind-laboratory" with "construct-laboratory-substrate" in the bullet, and adding a `Supersedes: <old-content-hash>` field plus a pointer to `consolidation-laboratory-substrate-2026-05-21.md`.
- **Alternative**: leave the memory alone, add a frontmatter `read_state: stale` + `superseded_by: ~/bonfire/grimoires/bonfire/context/consolidation-laboratory-substrate-2026-05-21.md`. The consolidation note becomes the canonical source; this memory becomes historical context for *why* the rename happened.

Either way, the underlying lesson ("translate-don't-abstain") survives the rename and SHOULD remain active. Marking the whole memory STALE would discard a still-valid methodological rule with the name-drift.

## Verdicts summary

- **Branch sweep**: 1 keep-in-flight (`cycle-construct-rooms` PR #234 needs operator decision), 3 abandon (`cycle-rooms-observatory` local+origin, `fix/issue-244-butterfreezone-bugs` local-only, `backup-cycle-rooms-observatory-pre-redact` local-only).
- **Mystery tree**: GITIGNORE `AGENTS.md` + `.agents/` + `.codex/` (Codex CLI artifacts, 16 days old, never tracked, casing bug worth filing upstream).
- **Memory**: UPDATE-WITH-SUPERSEDE-POINTER — rename `hivemind-laboratory` → `construct-laboratory-substrate`; keep methodology; add supersede pointer to the 2026-05-21 consolidation note.

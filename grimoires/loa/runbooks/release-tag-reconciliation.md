# Release Tag Reconciliation Runbook

**Purpose**: resolve local/remote git tag divergence for the same release version.

**Authority**: cycle-0 SDD §3 (Tag-Reconciliation Runbook Contract).

**Related upstream issue**: Issue H — `post-merge-orchestrator.sh` races with GitHub Actions auto-release.

---

## Symptom

Local tag and remote tag for the same version pointer point to different commits:

```bash
git rev-parse <tag>            # local SHA
git ls-remote origin <tag>     # remote SHA
# If they differ → reconciliation required
```

`git fetch origin --tags --prune` reports `[rejected] <tag> would clobber existing tag`.

## Detection

Run for any tag suspected of mismatch:

```bash
for tag in $(git tag --list); do
  local_sha=$(git rev-parse "$tag" 2>/dev/null)
  remote_sha=$(git ls-remote origin "$tag" 2>/dev/null | awk '{print $1}')
  if [[ -n "$local_sha" && -n "$remote_sha" && "$local_sha" != "$remote_sha" ]]; then
    echo "MISMATCH: $tag — local $local_sha vs remote $remote_sha"
  fi
done
```

## Reconciliation Decision Tree

For each mismatched tag, answer the following before choosing an option:

1. **Which tag was pushed first?** Compare `git show <local-sha>` and `git ls-remote` timestamps.
2. **Which tag matches the GitHub Release content?** Check the GitHub Release page tarball SHA; the matching tag is canonical.
3. **Was the local tag an interrupted release attempt?** If `post-merge-orchestrator.sh` ran AFTER GitHub Actions created the release, the local tag is the spurious one.
4. **Who is the tagger?** `git show <tag> | head -3` — `github-actions[bot]` indicates an automated release; a human tagger may indicate manual intervention.

## Reconciliation Options

### Option A — Adopt Remote (most common, default)

Use when remote tag is the canonical release (created by GitHub Release / GitHub Actions / triggered the release pipeline).

```bash
git tag -d <tag>                 # delete local divergent tag
git fetch origin tag <tag>        # re-fetch remote tag
git rev-parse <tag>               # verify matches remote
git ls-remote origin <tag>        # verify remote unchanged
```

### Option B — Adopt Local + Force-Push (rare, requires team approval)

Use ONLY when local tag is correct AND remote was created in error AND no consumers have pulled the remote tag yet.

```bash
git push origin <tag> --force
```

⚠️ **WARNING**: invalidates any clone or CI cache that already pulled the remote tag. Pre-condition: verify with `git ls-remote origin <tag>` that remote is still at the divergent SHA, AND broadcast in operator channel before force-pushing.

### Option C — Both Wrong, Retag from Canonical Commit

Use when neither tag matches the actual desired commit (e.g., release notes describe SHA X, but both local and remote tags point elsewhere).

```bash
git tag -d <tag>
git push origin :refs/tags/<tag>   # delete remote tag
git tag <tag> <canonical-sha>      # retag at correct SHA
git push origin <tag>              # push corrected tag
```

⚠️ **WARNING**: same blast radius as Option B. Coordinate with team.

## Audit Trail

After reconciliation, append a dated entry to this runbook:

```markdown
### Reconciliation: <tag> — <date>

- **Old local SHA**: <sha>
- **Old remote SHA**: <sha>
- **Canonical SHA (after)**: <sha>
- **Option chosen**: A | B | C
- **Reasoning**: <why this option>
- **Operator**: @<handle>
- **Trigger**: <e.g., post-merge-orchestrator race / manual intervention / etc.>
```

---

## Audit Trail

### Reconciliation: v2.41.0 — 2026-05-09

- **Old local SHA**: `40a7b81192811b42ceefbee0cf8f3094edc2e4ac` (annotated tag pointing at commit `a0171681e43e21415ce3ef30e1e9bfa3aa52df82` — `chore(gt): regenerate ground truth checksums`)
- **Old remote SHA**: `0fa9c76fb096730098ef5bacfecb0cacff7ec810` (annotated tag pointing at commit `57aac9df2e9c5177052072a4e54f79a56c592842` — `feat(post-v2.40.0): spiral recovery — audit-feel composition + 4 runbooks + egress-filter + telemetry config (#228)`)
- **Canonical SHA (after)**: `0fa9c76fb096730098ef5bacfecb0cacff7ec810` — adopt remote
- **Option chosen**: **A** (adopt remote)
- **Reasoning**:
  - The remote tag was created by `github-actions[bot]` on PR #228 squash-merge (16:39:57 UTC).
  - The local tag was created by `post-merge-orchestrator.sh` (executed by user `soju` at 11:46:39 PDT = 18:46 UTC, ~2 hours after the GitHub Actions release).
  - The orchestrator pointed the tag at the latest local commit (`a0171681` — chore(gt)) instead of detecting that the remote release was already created at the merge commit (`57aac9df`).
  - Remote release at `57aac9df` is the canonical one users see on the GitHub Release page; tarball + release notes match that SHA.
  - The chore commits (`5be8b868` chore(release), `a0171681` chore(gt), `1b8c5279` chore(ledger)) ARE pushed to `origin/main` and are part of the cumulative history; they're just not tagged within v2.41.0's release scope. That's correct — they were post-release housekeeping.
- **Operator**: @janitooor (decision approved by primary maintainer); executed by automation under operator standing autonomy
- **Trigger**: post-merge-orchestrator race with GitHub Actions auto-release (filed as cycle-0 upstream Issue H)

**Verification post-reconciliation**:
```bash
$ git rev-parse v2.41.0
0fa9c76fb096730098ef5bacfecb0cacff7ec810

$ git ls-remote origin v2.41.0
0fa9c76fb096730098ef5bacfecb0cacff7ec810  refs/tags/v2.41.0

$ git show v2.41.0 --format="%H %s" -s
57aac9df2e9c5177052072a4e54f79a56c592842 feat(post-v2.40.0): spiral recovery — audit-feel composition + 4 runbooks + egress-filter + telemetry config (#228)
```

✅ Match. Audit's BLOCKER finding closed.

---

## Verification of all other tags (cycle-0 T0.1 sweep)

Per cycle-0 Sprint 0 T0.1 acceptance: "verify all other tags (v2.40.0 and earlier) match between local and remote."

Verification command:
```bash
for tag in $(git tag --list); do
  local_sha=$(git rev-parse "$tag")
  remote_sha=$(git ls-remote origin "$tag" 2>/dev/null | awk '{print $1}')
  if [[ "$local_sha" != "$remote_sha" ]]; then
    echo "MISMATCH: $tag — local $local_sha vs remote $remote_sha"
  fi
done
```

Result populated post-execution by the agent.

// Read-only territory ratification proof shared by station writes and atlas reads.
// Tool location is never authority: every fact is resolved from the region root.

import path from 'node:path';
import { git, run } from './exec.mjs';
import { EXIT } from './contract.mjs';

export const TERRITORY_MANIFEST_REL = path.join('grimoires', 'territory.yaml');

export class RatificationInspectionError extends Error {
  constructor(message, exitCode = EXIT.CALLER_ERROR, { fix = null } = {}) {
    super(message);
    this.name = 'RatificationInspectionError';
    this.exitCode = exitCode;
    this.fix = fix;
  }
}

export async function defaultBranch(regionRoot) {
  const origin = await run('git', ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], {
    cwd: regionRoot,
    allowNonZero: true,
  });
  if (origin.exitCode === 0) return origin.stdout.trim().replace(/^origin\//, '');
  for (const name of ['main', 'master']) {
    const ref = await run('git', ['show-ref', '--verify', '--quiet', `refs/heads/${name}`], {
      cwd: regionRoot,
      allowNonZero: true,
    });
    if (ref.exitCode === 0) return name;
  }
  return null;
}

export async function gitFacts(regionRoot, manifestRel = TERRITORY_MANIFEST_REL) {
  const inRepo = await run('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd: regionRoot,
    allowNonZero: true,
  });
  if (inRepo.exitCode !== 0 || inRepo.stdout.trim() !== 'true') {
    throw new RatificationInspectionError(
      `region at ${regionRoot} is not a git repository — a stationing is a committed manifest edit, so there is nothing here to ratify`,
      EXIT.CALLER_ERROR,
      { fix: 'run this from inside the region clone' },
    );
  }

  const head = await run('git', ['rev-parse', 'HEAD'], { cwd: regionRoot, allowNonZero: true });
  if (head.exitCode !== 0) {
    throw new RatificationInspectionError(
      `region at ${regionRoot} has no commits yet — commit the territory manifest first`,
      EXIT.CALLER_ERROR,
    );
  }

  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: regionRoot });
  const resolvedDefaultBranch = await defaultBranch(regionRoot);
  const tracked = await run('git', ['ls-files', '--error-unmatch', '--', manifestRel], {
    cwd: regionRoot,
    allowNonZero: true,
  });
  const dirty = await git(['status', '--porcelain', '--', manifestRel], { cwd: regionRoot });

  let anchor = 'local-only';
  let containedInRemote = null;
  const originConfigured = await run('git', ['remote', 'get-url', 'origin'], {
    cwd: regionRoot,
    allowNonZero: true,
  });
  if (originConfigured.exitCode === 0 && resolvedDefaultBranch !== null) {
    anchor = `origin/${resolvedDefaultBranch}`;
    const originRef = `refs/remotes/origin/${resolvedDefaultBranch}`;
    const hasRef = await run('git', ['show-ref', '--verify', '--quiet', originRef], {
      cwd: regionRoot,
      allowNonZero: true,
    });
    if (hasRef.exitCode === 0) {
      const contained = await run('git', ['merge-base', '--is-ancestor', 'HEAD', originRef], {
        cwd: regionRoot,
        allowNonZero: true,
      });
      containedInRemote = contained.exitCode === 0;
    } else {
      containedInRemote = false;
    }
  }

  return {
    head: head.stdout.trim(),
    branch,
    default_branch: resolvedDefaultBranch,
    manifest_tracked: tracked.exitCode === 0,
    manifest_clean: dirty === '',
    anchor,
    contained_in_remote: containedInRemote,
  };
}

export function ratificationBlockers(facts) {
  const blockers = [];
  if (!facts.manifest_tracked) {
    blockers.push('the territory manifest is not tracked by git — writability is not ratification');
  } else if (!facts.manifest_clean) {
    blockers.push('the territory manifest has uncommitted edits — a worktree-only edit is --dry-run territory, not a ratified act');
  }
  if (facts.default_branch === null) {
    blockers.push('the repository default branch cannot be resolved');
  } else if (facts.branch !== facts.default_branch) {
    blockers.push(
      `HEAD is on ${JSON.stringify(facts.branch)}, but ratification means committed on the default branch (${JSON.stringify(facts.default_branch)})`,
    );
  }
  if (facts.contained_in_remote === false) {
    blockers.push(
      `HEAD is not contained in origin/${facts.default_branch} (or that ref has never been fetched) — the manifest edit has not verifiably landed on the region remote default branch`,
    );
  }
  return blockers;
}

export async function inspectRatification(regionRoot = '.') {
  const facts = await gitFacts(regionRoot);
  const blockers = ratificationBlockers(facts);
  const ratified = blockers.length === 0;
  return {
    status: ratified ? 'ratified' : 'unchecked',
    ratification: ratified
      ? `ratified — clean tracked territory manifest on ${facts.default_branch}, anchored to ${facts.anchor}`
      : `unchecked — ${blockers.join('; ')}`,
    blockers,
    verification: {
      head: facts.head,
      branch: facts.branch,
      default_branch: facts.default_branch,
      anchor: facts.anchor,
      contained_in_remote: facts.contained_in_remote,
    },
  };
}


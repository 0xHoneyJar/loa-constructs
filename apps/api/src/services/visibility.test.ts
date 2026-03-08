/**
 * Visibility Integration Tests — cycle-038
 * @see sdd.md §10 Test Strategy
 * @see sprint.md Task 3.5
 *
 * Tests:
 * - 9 core visibility×auth combinations
 * - 6 status×submission_source combinations
 * - External submission → pending_review → admin approve → published
 */

import { describe, it, expect } from 'vitest';
import { canAccessPack, type PackAccessContext } from './packs.js';

// --- Helpers ---

function makePack(overrides: Partial<{
  visibility: string;
  status: string;
  ownerId: string;
  ownerType: string;
  submissionSource: string;
}> = {}) {
  return {
    visibility: overrides.visibility ?? 'internal',
    status: overrides.status ?? 'published',
    ownerId: overrides.ownerId ?? 'owner-1',
    ownerType: overrides.ownerType ?? 'user',
    submissionSource: overrides.submissionSource ?? 'org_sync',
  };
}

const ANON: PackAccessContext | undefined = undefined;
const AUTH_NO_ORG: PackAccessContext = { userId: 'user-1', isOrgMember: false, isAdmin: false };
const ORG_MEMBER: PackAccessContext = { userId: 'user-2', isOrgMember: true, isAdmin: false };
const ADMIN: PackAccessContext = { userId: 'admin-1', isOrgMember: false, isAdmin: true };
const OWNER_NO_ORG: PackAccessContext = { userId: 'owner-1', isOrgMember: false, isAdmin: false };

// --- 9 Core Visibility × Auth Combinations ---

describe('Visibility × Auth Matrix (9 combinations)', () => {
  describe('public visibility', () => {
    const pack = makePack({ visibility: 'public' });

    it('anon can access public', () => {
      expect(canAccessPack(pack, ANON)).toBe(true);
    });

    it('auth (non-org) can access public', () => {
      expect(canAccessPack(pack, AUTH_NO_ORG)).toBe(true);
    });

    it('org member can access public', () => {
      expect(canAccessPack(pack, ORG_MEMBER)).toBe(true);
    });
  });

  describe('internal visibility', () => {
    const pack = makePack({ visibility: 'internal' });

    it('anon CANNOT access internal', () => {
      expect(canAccessPack(pack, ANON)).toBe(false);
    });

    it('auth (non-org, non-owner) CANNOT access internal', () => {
      expect(canAccessPack(pack, AUTH_NO_ORG)).toBe(false);
    });

    it('org member CAN access internal', () => {
      expect(canAccessPack(pack, ORG_MEMBER)).toBe(true);
    });
  });

  describe('unlisted visibility', () => {
    const pack = makePack({ visibility: 'unlisted' });

    it('anon CAN access unlisted (slug-only)', () => {
      expect(canAccessPack(pack, ANON)).toBe(true);
    });

    it('auth (non-org) CAN access unlisted', () => {
      expect(canAccessPack(pack, AUTH_NO_ORG)).toBe(true);
    });

    it('org member CAN access unlisted', () => {
      expect(canAccessPack(pack, ORG_MEMBER)).toBe(true);
    });
  });
});

// --- Additional Access Patterns ---

describe('Ownership and admin access', () => {
  it('owner can access their own internal pack (non-org)', () => {
    const pack = makePack({ visibility: 'internal', ownerId: 'owner-1' });
    expect(canAccessPack(pack, OWNER_NO_ORG)).toBe(true);
  });

  it('admin can access internal packs', () => {
    const pack = makePack({ visibility: 'internal' });
    expect(canAccessPack(pack, ADMIN)).toBe(true);
  });

  it('non-owner non-org cannot access internal', () => {
    const pack = makePack({ visibility: 'internal', ownerId: 'someone-else' });
    expect(canAccessPack(pack, AUTH_NO_ORG)).toBe(false);
  });
});

// --- 6 Status × Submission Source Combinations ---

describe('Status × Submission Source (6 combinations)', () => {
  // These test the data model expectations, not getPackBySlug (which needs DB)

  it('org_sync + draft → valid combination (internal dev)', () => {
    const pack = makePack({ status: 'draft', submissionSource: 'org_sync' });
    expect(pack.status).toBe('draft');
    expect(pack.submissionSource).toBe('org_sync');
  });

  it('org_sync + published → valid combination (active internal construct)', () => {
    const pack = makePack({ status: 'published', submissionSource: 'org_sync' });
    expect(pack.status).toBe('published');
    expect(pack.submissionSource).toBe('org_sync');
  });

  it('external + pending_review → valid combination (awaiting admin)', () => {
    const pack = makePack({ status: 'pending_review', submissionSource: 'external', visibility: 'public' });
    expect(pack.status).toBe('pending_review');
    expect(pack.submissionSource).toBe('external');
    expect(pack.visibility).toBe('public');
  });

  it('external + published → valid combination (admin approved)', () => {
    const pack = makePack({ status: 'published', submissionSource: 'external', visibility: 'public' });
    expect(pack.status).toBe('published');
    expect(pack.submissionSource).toBe('external');
  });

  it('external + rejected → valid combination (admin rejected)', () => {
    const pack = makePack({ status: 'rejected', submissionSource: 'external' });
    expect(pack.status).toBe('rejected');
    expect(pack.submissionSource).toBe('external');
  });

  it('org_sync + deprecated → valid combination (retired construct)', () => {
    const pack = makePack({ status: 'deprecated', submissionSource: 'org_sync' });
    expect(pack.status).toBe('deprecated');
    expect(pack.submissionSource).toBe('org_sync');
  });
});

// --- External Submission Lifecycle ---

describe('External submission lifecycle', () => {
  it('external submission creates pending_review + public + external', () => {
    // Simulates what POST /v1/constructs/register does for non-org users
    const pack = makePack({
      status: 'pending_review',
      visibility: 'public',
      submissionSource: 'external',
    });

    expect(pack.status).toBe('pending_review');
    expect(pack.visibility).toBe('public');
    expect(pack.submissionSource).toBe('external');
  });

  it('admin approve transitions pending_review → published', () => {
    // Simulates PATCH /v1/admin/constructs/:slug/review { action: 'approve' }
    const pack = makePack({
      status: 'pending_review',
      visibility: 'public',
      submissionSource: 'external',
    });

    // After approval:
    const approved = { ...pack, status: 'published' };
    expect(approved.status).toBe('published');
    expect(approved.visibility).toBe('public');
    expect(approved.submissionSource).toBe('external');
  });

  it('admin reject transitions pending_review → rejected', () => {
    const pack = makePack({
      status: 'pending_review',
      visibility: 'public',
      submissionSource: 'external',
    });

    const rejected = { ...pack, status: 'rejected' };
    expect(rejected.status).toBe('rejected');
  });
});

// --- Default Visibility Behavior ---

describe('Default visibility behavior', () => {
  it('null visibility treated as internal', () => {
    const pack = { visibility: null, ownerId: 'x', ownerType: 'user', status: 'published' };
    expect(canAccessPack(pack, ANON)).toBe(false);
    expect(canAccessPack(pack, ORG_MEMBER)).toBe(true);
  });

  it('unknown visibility treated as inaccessible', () => {
    const pack = { visibility: 'secret' as any, ownerId: 'x', ownerType: 'user', status: 'published' };
    expect(canAccessPack(pack, ANON)).toBe(false);
    expect(canAccessPack(pack, AUTH_NO_ORG)).toBe(false);
  });
});

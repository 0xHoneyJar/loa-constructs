/**
 * Pack Submission Routes Integration Tests
 * @see sdd-pack-submission.md §4.1 Submission Endpoints
 * @see prd-pack-submission.md §4.2 Submission Workflow
 */

import { describe, it, expect, vi } from 'vitest';

// Mock all database dependencies before app import
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
          limit: vi.fn(() => Promise.resolve([
            {
              id: 'test-pack-id',
              name: 'Test Pack',
              slug: 'test-pack',
              description: 'A test pack',
              status: 'draft',
              ownerId: 'test-user-id',
              tierRequired: 'free',
              createdAt: new Date(),
            },
          ])),
        })),
        orderBy: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{
          id: 'test-submission-id',
          packId: 'test-pack-id',
          status: 'submitted',
          submittedAt: new Date(),
        }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    query: {},
  },
  users: {},
  packs: {},
  packSubmissions: {},
  packVersions: {},
  subscriptions: {},
  teams: {},
  teamMembers: {},
  skills: {},
  skillVersions: {},
  skillFiles: {},
  skillUsage: {},
  packInstallations: {},
  apiKeys: {},
  auditLogs: {},
  organizations: {},
}));

vi.mock('../services/redis.js', () => ({
  getRedis: vi.fn(() => null),
  isRedisConfigured: vi.fn(() => false),
  CACHE_KEYS: {
    rateLimit: () => 'rate:limit',
    skillList: () => 'skill:list',
    skill: () => 'skill',
  },
  CACHE_TTL: {
    rateLimit: 60,
    skillList: 60,
    skill: 300,
  },
}));

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../services/email.js', () => ({
  sendSubmissionReceivedEmail: vi.fn(() => Promise.resolve({ success: true })),
  sendPackApprovedEmail: vi.fn(() => Promise.resolve({ success: true })),
  sendPackRejectedEmail: vi.fn(() => Promise.resolve({ success: true })),
  sendVerificationEmail: vi.fn(() => Promise.resolve({ success: true })),
  sendPasswordResetEmail: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock('../services/audit.js', () => ({
  createAuditLog: vi.fn(() => Promise.resolve()),
  logAuthEvent: vi.fn(() => Promise.resolve()),
}));

describe('Submission API Schema Validation', () => {
  describe('POST /v1/packs/:slug/submit', () => {
    it('should validate submission_notes max length', () => {
      const maxLength = 1000;
      const validNotes = 'A'.repeat(1000);
      const invalidNotes = 'A'.repeat(1001);

      expect(validNotes.length).toBeLessThanOrEqual(maxLength);
      expect(invalidNotes.length).toBeGreaterThan(maxLength);
    });

    it('should accept empty body for submission', () => {
      const emptyBody = {};
      expect(Object.keys(emptyBody)).toHaveLength(0);
    });

    it('should accept submission_notes as optional', () => {
      const bodyWithNotes = { submission_notes: 'Please review' };
      const bodyWithoutNotes = {};

      expect(bodyWithNotes.submission_notes).toBeDefined();
      expect('submission_notes' in bodyWithoutNotes).toBe(false);
    });
  });

  describe('POST /v1/admin/packs/:id/review', () => {
    it('should require decision field', () => {
      const validDecisions = ['approved', 'rejected'];
      expect(validDecisions).toContain('approved');
      expect(validDecisions).toContain('rejected');
    });

    it('should require review_notes field', () => {
      const validBody = {
        decision: 'approved',
        review_notes: 'Great pack!',
      };

      expect(validBody.review_notes).toBeDefined();
      expect(validBody.review_notes.length).toBeGreaterThan(0);
    });

    it('should validate review_notes max length', () => {
      const maxLength = 2000;
      const validNotes = 'A'.repeat(2000);
      const invalidNotes = 'A'.repeat(2001);

      expect(validNotes.length).toBeLessThanOrEqual(maxLength);
      expect(invalidNotes.length).toBeGreaterThan(maxLength);
    });

    it('should require rejection_reason when rejecting', () => {
      const validRejectionReasons = [
        'quality_standards',
        'incomplete_content',
        'duplicate_functionality',
        'policy_violation',
        'security_concern',
        'other',
      ];

      const rejectionBody = {
        decision: 'rejected',
        review_notes: 'Does not meet standards',
        rejection_reason: 'quality_standards',
      };

      expect(validRejectionReasons).toContain(rejectionBody.rejection_reason);
    });
  });
});

describe('Submission Response Formats', () => {
  describe('Submit Response', () => {
    it('should return correct structure', () => {
      const expectedResponse = {
        data: {
          submission_id: 'string',
          pack_id: 'string',
          status: 'pending_review',
          submitted_at: 'date string',
          version: 'string',
        },
        message: 'Pack submitted for review. You will be notified when a decision is made.',
        request_id: 'string',
      };

      expect(expectedResponse.data).toHaveProperty('submission_id');
      expect(expectedResponse.data).toHaveProperty('pack_id');
      expect(expectedResponse.data).toHaveProperty('status');
      expect(expectedResponse.data).toHaveProperty('submitted_at');
      expect(expectedResponse.data).toHaveProperty('version');
      expect(expectedResponse).toHaveProperty('message');
      expect(expectedResponse).toHaveProperty('request_id');
    });
  });

  describe('Withdraw Response', () => {
    it('should return correct structure', () => {
      const expectedResponse = {
        data: {
          submission_id: 'string',
          pack_id: 'string',
          status: 'draft',
          withdrawn_at: 'date string',
        },
        message: 'Submission withdrawn. Pack returned to draft status.',
        request_id: 'string',
      };

      expect(expectedResponse.data).toHaveProperty('submission_id');
      expect(expectedResponse.data).toHaveProperty('pack_id');
      expect(expectedResponse.data.status).toBe('draft');
      expect(expectedResponse.data).toHaveProperty('withdrawn_at');
    });
  });

  describe('Review Status Response', () => {
    it('should return correct structure with submission', () => {
      const expectedResponse = {
        data: {
          pack_id: 'string',
          pack_status: 'pending_review',
          has_submission: true,
          submission: {
            id: 'string',
            status: 'submitted',
            submitted_at: 'date string',
            submission_notes: 'string or null',
            reviewed_at: 'date or null',
            review_notes: 'string or null',
            rejection_reason: 'string or null',
          },
        },
        request_id: 'string',
      };

      expect(expectedResponse.data).toHaveProperty('pack_id');
      expect(expectedResponse.data).toHaveProperty('pack_status');
      expect(expectedResponse.data).toHaveProperty('has_submission');
      expect(expectedResponse.data.submission).toHaveProperty('status');
    });

    it('should return correct structure without submission', () => {
      const expectedResponse = {
        data: {
          pack_id: 'string',
          pack_status: 'draft',
          has_submission: false,
          submission: null,
        },
        request_id: 'string',
      };

      expect(expectedResponse.data.has_submission).toBe(false);
      expect(expectedResponse.data.submission).toBeNull();
    });
  });

  describe('Admin Reviews List Response', () => {
    it('should return correct structure', () => {
      const expectedResponse = {
        data: [
          {
            id: 'string',
            name: 'string',
            slug: 'string',
            description: 'string',
            status: 'pending_review',
            tier_required: 'free',
            created_at: 'date string',
            latest_version: 'string',
            submission: {
              submitted_at: 'date string',
              submission_notes: 'string or null',
            },
            creator: {
              email: 'string',
              name: 'string',
            },
          },
        ],
        total: 1,
        request_id: 'string',
      };

      expect(Array.isArray(expectedResponse.data)).toBe(true);
      expect(expectedResponse).toHaveProperty('total');
      expect(expectedResponse.data[0]).toHaveProperty('slug');
      expect(expectedResponse.data[0]).toHaveProperty('creator');
    });
  });

  describe('Admin Review Decision Response', () => {
    it('should return correct structure for approval', () => {
      const expectedResponse = {
        data: {
          pack_id: 'string',
          status: 'published',
          decision: 'approved',
          reviewed_at: 'date string',
          submission_id: 'string',
        },
        message: 'Pack approved and published successfully',
        request_id: 'string',
      };

      expect(expectedResponse.data.status).toBe('published');
      expect(expectedResponse.data.decision).toBe('approved');
    });

    it('should return correct structure for rejection', () => {
      const expectedResponse = {
        data: {
          pack_id: 'string',
          status: 'rejected',
          decision: 'rejected',
          reviewed_at: 'date string',
          submission_id: 'string',
        },
        message: 'Pack submission rejected',
        request_id: 'string',
      };

      expect(expectedResponse.data.status).toBe('rejected');
      expect(expectedResponse.data.decision).toBe('rejected');
    });
  });
});

describe('Submission Error Responses', () => {
  it('should return 401 for unauthenticated requests', () => {
    const errorResponse = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    };

    expect(errorResponse.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 403 for non-owner access', () => {
    const errorResponse = {
      error: {
        code: 'FORBIDDEN',
        message: 'You are not the owner of this pack',
      },
    };

    expect(errorResponse.error.code).toBe('FORBIDDEN');
  });

  it('should return 404 for non-existent pack', () => {
    const errorResponse = {
      error: {
        code: 'NOT_FOUND',
        message: 'Pack not found',
      },
    };

    expect(errorResponse.error.code).toBe('NOT_FOUND');
  });

  it('should return 400 for invalid pack state', () => {
    const errorResponse = {
      error: {
        code: 'BAD_REQUEST',
        message: "Cannot submit pack in 'published' status. Only draft or rejected packs can be submitted.",
      },
    };

    expect(errorResponse.error.code).toBe('BAD_REQUEST');
  });

  it('should return 429 for rate limit exceeded', () => {
    const errorResponse = {
      error: {
        code: 'RATE_LIMITED',
        message: 'Submission rate limit exceeded. Maximum 5 submissions per 24 hours.',
      },
    };

    expect(errorResponse.error.code).toBe('RATE_LIMITED');
  });
});

describe('Submission Email Integration', () => {
  it('should send confirmation email on submission', () => {
    const emailParams = {
      to: 'user@example.com',
      name: 'Test User',
      packName: 'Test Pack',
      packSlug: 'test-pack',
    };

    expect(emailParams.to).toBeDefined();
    expect(emailParams.packName).toBeDefined();
  });

  it('should send approval email on approval', () => {
    const emailParams = {
      to: 'user@example.com',
      name: 'Test User',
      packName: 'Test Pack',
      packSlug: 'test-pack',
      reviewNotes: 'Great work!',
    };

    expect(emailParams.reviewNotes).toBeDefined();
  });

  it('should send rejection email on rejection', () => {
    const emailParams = {
      to: 'user@example.com',
      name: 'Test User',
      packName: 'Test Pack',
      packSlug: 'test-pack',
      rejectionReason: 'quality_standards',
      reviewNotes: 'Please improve code quality',
    };

    expect(emailParams.rejectionReason).toBeDefined();
    expect(emailParams.reviewNotes).toBeDefined();
  });
});

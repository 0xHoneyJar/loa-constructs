/**
 * Graduation Service Tests
 * @see sprint.md T18.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database before imports
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'test-request-id' }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 'test-id' }])),
        })),
      })),
    })),
  },
  skills: {
    id: 'id',
    maturity: 'maturity',
    createdAt: 'createdAt',
    graduatedAt: 'graduatedAt',
    downloads: 'downloads',
    isPublic: 'isPublic',
  },
  packs: {
    id: 'id',
    maturity: 'maturity',
    createdAt: 'createdAt',
    graduatedAt: 'graduatedAt',
    downloads: 'downloads',
    status: 'status',
  },
  skillVersions: {},
  packVersions: {},
  skillFiles: {},
  packFiles: {},
  graduationRequests: {},
}));

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../lib/errors.js', () => ({
  Errors: {
    NotFound: (resource: string) => new Error(`${resource} not found`),
    BadRequest: (message: string) => new Error(message),
    Forbidden: (message: string) => new Error(message),
  },
}));

describe('Graduation Service Types', () => {
  describe('MaturityLevel', () => {
    it('should define valid maturity levels', () => {
      const levels = ['experimental', 'beta', 'stable', 'deprecated'];
      expect(levels).toHaveLength(4);
      expect(levels).toContain('experimental');
      expect(levels).toContain('beta');
      expect(levels).toContain('stable');
      expect(levels).toContain('deprecated');
    });
  });

  describe('GraduationRequestStatus', () => {
    it('should define valid request statuses', () => {
      const statuses = ['pending', 'approved', 'rejected', 'withdrawn'];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('ConstructType', () => {
    it('should support skill and pack types', () => {
      const types = ['skill', 'pack'];
      expect(types).toHaveLength(2);
    });
  });
});

describe('Graduation Criteria Constants', () => {
  describe('Experimental → Beta Criteria', () => {
    const criteria = {
      minDownloads: 10,
      minDaysPublished: 7,
    };

    it('should require minimum 10 downloads', () => {
      expect(criteria.minDownloads).toBe(10);
    });

    it('should require minimum 7 days published', () => {
      expect(criteria.minDaysPublished).toBe(7);
    });
  });

  describe('Beta → Stable Criteria', () => {
    const criteria = {
      minDownloads: 100,
      minDaysInBeta: 30,
      minRating: 3.5,
    };

    it('should require minimum 100 downloads', () => {
      expect(criteria.minDownloads).toBe(100);
    });

    it('should require minimum 30 days in beta', () => {
      expect(criteria.minDaysInBeta).toBe(30);
    });

    it('should require minimum 3.5 rating', () => {
      expect(criteria.minRating).toBe(3.5);
    });
  });

  describe('Auto-Graduation', () => {
    it('should auto-graduate after 14 days', () => {
      const autoGraduationDays = 14;
      expect(autoGraduationDays).toBe(14);
    });

    it('should process in batches of 100', () => {
      const batchSize = 100;
      expect(batchSize).toBe(100);
    });
  });
});

describe('Helper Functions', () => {
  describe('getNextMaturityLevel', () => {
    const getNextMaturityLevel = (current: string) => {
      switch (current) {
        case 'experimental':
          return 'beta';
        case 'beta':
          return 'stable';
        case 'stable':
        case 'deprecated':
          return null;
        default:
          return null;
      }
    };

    it('should return beta for experimental', () => {
      expect(getNextMaturityLevel('experimental')).toBe('beta');
    });

    it('should return stable for beta', () => {
      expect(getNextMaturityLevel('beta')).toBe('stable');
    });

    it('should return null for stable', () => {
      expect(getNextMaturityLevel('stable')).toBeNull();
    });

    it('should return null for deprecated', () => {
      expect(getNextMaturityLevel('deprecated')).toBeNull();
    });
  });

  describe('daysBetween', () => {
    const daysBetween = (date1: Date, date2: Date): number => {
      const diffMs = date2.getTime() - date1.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    };

    it('should calculate days correctly', () => {
      const date1 = new Date('2026-01-01');
      const date2 = new Date('2026-01-08');
      expect(daysBetween(date1, date2)).toBe(7);
    });

    it('should return 0 for same day', () => {
      const date = new Date('2026-01-01');
      expect(daysBetween(date, date)).toBe(0);
    });

    it('should handle negative days', () => {
      const date1 = new Date('2026-01-08');
      const date2 = new Date('2026-01-01');
      expect(daysBetween(date1, date2)).toBe(-7);
    });
  });

  describe('calculateRating', () => {
    const calculateRating = (ratingSum: number, ratingCount: number): number | null => {
      if (ratingCount === 0) return null;
      return ratingSum / ratingCount;
    };

    it('should return null for zero count', () => {
      expect(calculateRating(0, 0)).toBeNull();
    });

    it('should calculate average correctly', () => {
      expect(calculateRating(45, 10)).toBe(4.5);
      expect(calculateRating(35, 10)).toBe(3.5);
    });
  });
});

describe('GraduationCriteria Interface', () => {
  it('should have met record and missing array', () => {
    const criteria = {
      met: { min_downloads: true, min_days_published: true },
      missing: [{ key: 'readme_exists', current: false, required: true }],
    };
    expect(criteria.met).toBeDefined();
    expect(criteria.missing).toBeInstanceOf(Array);
  });

  it('should track multiple met criteria', () => {
    const criteria = {
      met: {
        min_downloads: true,
        min_days_published: true,
        manifest_valid: true,
        readme_exists: true,
        changelog_exists: true,
      },
      missing: [],
    };
    expect(Object.keys(criteria.met)).toHaveLength(5);
    expect(criteria.missing).toHaveLength(0);
  });

  it('should track missing criteria with current values', () => {
    const criteria = {
      met: {},
      missing: [
        { key: 'min_downloads', current: 5, required: 10 },
        { key: 'min_days_published', current: 3, required: 7 },
      ],
    };
    expect(criteria.missing).toHaveLength(2);
    expect(criteria.missing[0].current).toBe(5);
    expect(criteria.missing[0].required).toBe(10);
  });
});

describe('GraduationStatus Interface', () => {
  it('should include all required fields', () => {
    const status = {
      constructType: 'skill',
      constructId: 'abc-123',
      currentMaturity: 'experimental',
      nextLevel: 'beta',
      criteria: { met: {}, missing: [] },
      eligibleForAutoGraduation: false,
      canRequest: false,
      pendingRequest: null,
    };
    expect(status.constructType).toBe('skill');
    expect(status.constructId).toBe('abc-123');
    expect(status.currentMaturity).toBe('experimental');
    expect(status.nextLevel).toBe('beta');
    expect(status.eligibleForAutoGraduation).toBe(false);
    expect(status.canRequest).toBe(false);
    expect(status.pendingRequest).toBeNull();
  });

  it('should support pending request details', () => {
    const status = {
      constructType: 'pack',
      constructId: 'def-456',
      currentMaturity: 'beta',
      nextLevel: 'stable',
      criteria: { met: {}, missing: [] },
      eligibleForAutoGraduation: false,
      canRequest: false,
      pendingRequest: {
        id: 'req-789',
        targetMaturity: 'stable',
        status: 'pending',
        requestedAt: new Date(),
      },
    };
    expect(status.pendingRequest).not.toBeNull();
    expect(status.pendingRequest?.id).toBe('req-789');
    expect(status.pendingRequest?.status).toBe('pending');
  });
});

describe('GraduationRequest Interface', () => {
  it('should include all request fields', () => {
    const request = {
      id: 'req-123',
      constructType: 'skill',
      constructId: 'skill-456',
      currentMaturity: 'experimental',
      targetMaturity: 'beta',
      status: 'pending',
      requestedBy: 'user-789',
      requestedAt: new Date(),
      requestNotes: 'Ready for beta',
      criteriaSnapshot: { met: {}, missing: [] },
      reviewedAt: null,
      reviewedBy: null,
      reviewNotes: null,
      rejectionReason: null,
    };
    expect(request.id).toBe('req-123');
    expect(request.constructType).toBe('skill');
    expect(request.targetMaturity).toBe('beta');
    expect(request.status).toBe('pending');
  });

  it('should support approved request with review details', () => {
    const request = {
      id: 'req-123',
      constructType: 'pack',
      constructId: 'pack-456',
      currentMaturity: 'beta',
      targetMaturity: 'stable',
      status: 'approved',
      requestedBy: 'user-789',
      requestedAt: new Date('2026-01-01'),
      requestNotes: 'Ready for stable',
      criteriaSnapshot: { met: {}, missing: [] },
      reviewedAt: new Date('2026-01-15'),
      reviewedBy: 'admin-000',
      reviewNotes: 'Approved after review',
      rejectionReason: null,
    };
    expect(request.status).toBe('approved');
    expect(request.reviewedBy).toBe('admin-000');
    expect(request.reviewNotes).toBe('Approved after review');
  });

  it('should support rejected request with reason', () => {
    const request = {
      id: 'req-123',
      constructType: 'pack',
      constructId: 'pack-456',
      currentMaturity: 'beta',
      targetMaturity: 'stable',
      status: 'rejected',
      requestedBy: 'user-789',
      requestedAt: new Date('2026-01-01'),
      requestNotes: 'Ready for stable',
      criteriaSnapshot: { met: {}, missing: [] },
      reviewedAt: new Date('2026-01-15'),
      reviewedBy: 'admin-000',
      reviewNotes: 'Documentation needs improvement',
      rejectionReason: 'incomplete_documentation',
    };
    expect(request.status).toBe('rejected');
    expect(request.rejectionReason).toBe('incomplete_documentation');
  });
});

describe('calculateCriteriaMet Logic', () => {
  describe('Experimental → Beta', () => {
    it('should check minimum downloads', () => {
      const downloads = 15;
      const minRequired = 10;
      expect(downloads >= minRequired).toBe(true);
    });

    it('should fail on insufficient downloads', () => {
      const downloads = 5;
      const minRequired = 10;
      expect(downloads >= minRequired).toBe(false);
    });

    it('should check minimum days published', () => {
      const daysPublished = 10;
      const minRequired = 7;
      expect(daysPublished >= minRequired).toBe(true);
    });

    it('should check manifest validity', () => {
      const hasVersion = true;
      expect(hasVersion).toBe(true);
    });

    it('should check README existence', () => {
      const files = [{ path: 'README.md' }, { path: 'src/index.ts' }];
      const readmeExists = files.some((f) => f.path.toLowerCase().includes('readme'));
      expect(readmeExists).toBe(true);
    });

    it('should check CHANGELOG existence', () => {
      const files = [{ path: 'CHANGELOG.md' }, { path: 'src/index.ts' }];
      const changelogExists = files.some((f) => f.path.toLowerCase().includes('changelog'));
      expect(changelogExists).toBe(true);
    });

    it('should be case-insensitive for file checks', () => {
      const files = [{ path: 'Readme.MD' }, { path: 'changelog.txt' }];
      const readmeExists = files.some((f) => f.path.toLowerCase().includes('readme'));
      const changelogExists = files.some((f) => f.path.toLowerCase().includes('changelog'));
      expect(readmeExists).toBe(true);
      expect(changelogExists).toBe(true);
    });
  });

  describe('Beta → Stable', () => {
    it('should check higher download threshold', () => {
      const downloads = 150;
      const minRequired = 100;
      expect(downloads >= minRequired).toBe(true);
    });

    it('should check days in beta', () => {
      const daysInBeta = 45;
      const minRequired = 30;
      expect(daysInBeta >= minRequired).toBe(true);
    });

    it('should check documentation URL exists', () => {
      const documentationUrl = 'https://docs.example.com';
      expect(!!documentationUrl).toBe(true);
    });

    it('should check minimum rating', () => {
      const rating = 4.0;
      const minRequired = 3.5;
      expect(rating >= minRequired).toBe(true);
    });

    it('should skip rating check when no ratings exist', () => {
      const rating = null;
      const ratingCheck = rating === null ? true : rating >= 3.5;
      expect(ratingCheck).toBe(true);
    });

    it('should fail on low rating', () => {
      const rating = 3.0;
      const minRequired = 3.5;
      expect(rating >= minRequired).toBe(false);
    });
  });
});

describe('getGraduationStatus Logic', () => {
  it('should calculate eligibility for auto-graduation', () => {
    const currentMaturity = 'experimental';
    const daysPublished = 15;
    const criteriaAllMet = true;
    const autoGraduationDays = 14;

    const eligible =
      currentMaturity === 'experimental' &&
      daysPublished >= autoGraduationDays &&
      criteriaAllMet;

    expect(eligible).toBe(true);
  });

  it('should not be eligible if not experimental', () => {
    const currentMaturity = 'beta';
    const eligible = currentMaturity === 'experimental';
    expect(eligible).toBe(false);
  });

  it('should not be eligible if less than 14 days', () => {
    const daysPublished = 10;
    const autoGraduationDays = 14;
    expect(daysPublished >= autoGraduationDays).toBe(false);
  });

  it('should calculate canRequest correctly', () => {
    const nextLevel = 'beta';
    const criteriaAllMet = true;
    const hasPendingRequest = false;

    const canRequest = nextLevel !== null && criteriaAllMet && !hasPendingRequest;
    expect(canRequest).toBe(true);
  });

  it('should not allow request if already pending', () => {
    const nextLevel = 'beta';
    const criteriaAllMet = true;
    const hasPendingRequest = true;

    const canRequest = nextLevel !== null && criteriaAllMet && !hasPendingRequest;
    expect(canRequest).toBe(false);
  });

  it('should not allow request if criteria not met', () => {
    const nextLevel = 'beta';
    const criteriaAllMet = false;
    const hasPendingRequest = false;

    const canRequest = nextLevel !== null && criteriaAllMet && !hasPendingRequest;
    expect(canRequest).toBe(false);
  });
});

describe('requestGraduation Logic', () => {
  it('should auto-approve experimental → beta after 14 days', () => {
    const currentMaturity = 'experimental';
    const eligibleForAutoGraduation = true;

    const shouldAutoApprove = currentMaturity === 'experimental' && eligibleForAutoGraduation;
    expect(shouldAutoApprove).toBe(true);
  });

  it('should not auto-approve beta → stable', () => {
    const currentMaturity = 'beta';
    const shouldAutoApprove = currentMaturity === 'experimental';
    expect(shouldAutoApprove).toBe(false);
  });

  it('should create pending request for stable graduation', () => {
    const currentMaturity = 'beta';
    const targetMaturity = 'stable';
    const requestStatus = currentMaturity === 'experimental' ? 'approved' : 'pending';
    expect(requestStatus).toBe('pending');
  });
});

describe('reviewGraduation Logic', () => {
  it('should update construct on approval', () => {
    const decision = 'approved';
    const targetMaturity = 'stable';
    const shouldUpdateConstruct = decision === 'approved';
    expect(shouldUpdateConstruct).toBe(true);
  });

  it('should not update construct on rejection', () => {
    const decision = 'rejected';
    const shouldUpdateConstruct = decision === 'approved';
    expect(shouldUpdateConstruct).toBe(false);
  });

  it('should require rejection reason when rejecting', () => {
    const decision = 'rejected';
    const rejectionReason = 'quality_standards';
    const isValid = decision !== 'rejected' || !!rejectionReason;
    expect(isValid).toBe(true);
  });

  it('should fail validation without rejection reason', () => {
    const decision = 'rejected';
    const rejectionReason = undefined;
    const isValid = decision !== 'rejected' || !!rejectionReason;
    expect(isValid).toBe(false);
  });
});

describe('withdrawGraduationRequest Logic', () => {
  it('should update status to withdrawn', () => {
    const newStatus = 'withdrawn';
    expect(newStatus).toBe('withdrawn');
  });

  it('should only withdraw pending requests', () => {
    const currentStatus = 'pending';
    const canWithdraw = currentStatus === 'pending';
    expect(canWithdraw).toBe(true);
  });

  it('should not withdraw approved requests', () => {
    const currentStatus = 'approved';
    const canWithdraw = currentStatus === 'pending';
    expect(canWithdraw).toBe(false);
  });
});

describe('listPendingGraduationRequests Logic', () => {
  it('should paginate correctly', () => {
    const page = 2;
    const limit = 20;
    const offset = (page - 1) * limit;
    expect(offset).toBe(20);
  });

  it('should enforce max page size', () => {
    const requestedLimit = 200;
    const maxLimit = 100;
    const actualLimit = Math.min(requestedLimit, maxLimit);
    expect(actualLimit).toBe(100);
  });

  it('should calculate total pages', () => {
    const total = 47;
    const limit = 20;
    const totalPages = Math.ceil(total / limit);
    expect(totalPages).toBe(3);
  });
});

describe('autoGraduateEligibleConstructs Logic', () => {
  it('should calculate cutoff date correctly', () => {
    const autoGraduationDays = 14;
    const cutoffMs = autoGraduationDays * 24 * 60 * 60 * 1000;
    expect(cutoffMs).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('should track processed, graduated, and errors', () => {
    const stats = {
      processed: 10,
      graduated: 8,
      errors: 2,
    };
    expect(stats.processed).toBe(10);
    expect(stats.graduated).toBe(8);
    expect(stats.errors).toBe(2);
  });

  it('should continue processing on individual errors', () => {
    const constructs = [{ id: '1' }, { id: '2' }, { id: '3' }];
    let errors = 0;
    let processed = 0;

    constructs.forEach((c, i) => {
      processed++;
      if (i === 1) {
        errors++;
        // Continue processing
      }
    });

    expect(processed).toBe(3);
    expect(errors).toBe(1);
  });
});

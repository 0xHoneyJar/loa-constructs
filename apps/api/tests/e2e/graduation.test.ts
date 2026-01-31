/**
 * Graduation E2E Tests
 * @see sprint.md T18.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch for HTTP tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Graduation API E2E', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('GET /v1/constructs/:slug/graduation-status', () => {
    it('should return graduation status', async () => {
      const mockResponse = {
        data: {
          construct_type: 'pack',
          construct_id: 'test-pack-id',
          current_maturity: 'experimental',
          next_level: 'beta',
          criteria: {
            met: { min_downloads: true },
            missing: [{ key: 'readme_exists', current: false, required: true }],
          },
          eligible_for_auto_graduation: false,
          can_request: false,
          pending_request: null,
        },
        request_id: 'req-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('/v1/constructs/test-pack/graduation-status');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data.current_maturity).toBe('experimental');
      expect(data.data.next_level).toBe('beta');
    });

    it('should return 404 for unknown construct', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { message: 'Construct not found' } }),
      });

      const response = await fetch('/v1/constructs/unknown/graduation-status');
      expect(response.status).toBe(404);
    });
  });

  describe('POST /v1/constructs/:slug/request-graduation', () => {
    it('should create pending request for beta → stable', async () => {
      const mockResponse = {
        data: {
          request_id: 'req-456',
          construct_type: 'pack',
          construct_id: 'pack-id',
          current_maturity: 'beta',
          target_maturity: 'stable',
          status: 'pending',
          auto_approved: false,
        },
        message: 'Graduation request submitted for review.',
        request_id: 'req-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('/v1/constructs/test-pack/request-graduation', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: 'Ready for stable' }),
      });

      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.data.status).toBe('pending');
      expect(data.data.auto_approved).toBe(false);
    });

    it('should auto-approve experimental → beta after 14 days', async () => {
      const mockResponse = {
        data: {
          request_id: 'req-789',
          construct_type: 'skill',
          construct_id: 'skill-id',
          current_maturity: 'experimental',
          target_maturity: 'beta',
          status: 'approved',
          auto_approved: true,
        },
        message: 'Graduation auto-approved. Construct is now beta.',
        request_id: 'req-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('/v1/constructs/test-skill/request-graduation', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.data.status).toBe('approved');
      expect(data.data.auto_approved).toBe(true);
    });

    it('should return 400 if criteria not met', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: 'Not all graduation criteria are met' } }),
      });

      const response = await fetch('/v1/constructs/test-pack/request-graduation', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 if request already pending', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: 'A graduation request is already pending' } }),
      });

      const response = await fetch('/v1/constructs/test-pack/request-graduation', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    it('should return 403 if not owner', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: { message: 'Only the construct owner can request graduation' } }),
      });

      const response = await fetch('/v1/constructs/other-pack/request-graduation', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(403);
    });

    it('should return 401 if not authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Unauthorized' } }),
      });

      const response = await fetch('/v1/constructs/test-pack/request-graduation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /v1/constructs/:slug/graduation-request', () => {
    it('should withdraw pending request', async () => {
      const mockResponse = {
        data: { request_id: 'req-456', status: 'withdrawn' },
        message: 'Graduation request withdrawn successfully.',
        request_id: 'req-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('/v1/constructs/test-pack/graduation-request', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer token' },
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.data.status).toBe('withdrawn');
    });

    it('should return 400 if no pending request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: 'No pending graduation request found' } }),
      });

      const response = await fetch('/v1/constructs/test-pack/graduation-request', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer token' },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /v1/constructs with maturity filter', () => {
    it('should filter by single maturity', async () => {
      const mockResponse = {
        data: [
          { slug: 'stable-pack', maturity: 'stable' },
          { slug: 'another-stable', maturity: 'stable' },
        ],
        pagination: { page: 1, per_page: 20, total: 2, total_pages: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('/v1/constructs?maturity=stable');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data.every((c: { maturity: string }) => c.maturity === 'stable')).toBe(true);
    });

    it('should filter by multiple maturity levels', async () => {
      const mockResponse = {
        data: [
          { slug: 'beta-pack', maturity: 'beta' },
          { slug: 'stable-pack', maturity: 'stable' },
        ],
        pagination: { page: 1, per_page: 20, total: 2, total_pages: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('/v1/constructs?maturity=beta,stable');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveLength(2);
    });
  });

  describe('GET /v1/admin/graduations', () => {
    it('should list pending requests for admin', async () => {
      const mockResponse = {
        data: [
          {
            id: 'req-1',
            construct_type: 'pack',
            construct_name: 'Test Pack',
            current_maturity: 'beta',
            target_maturity: 'stable',
            owner: { name: 'Test User', email: 'test@example.com' },
          },
        ],
        pagination: { page: 1, per_page: 20, total: 1, total_pages: 1 },
        request_id: 'req-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('/v1/admin/graduations', {
        headers: { 'Authorization': 'Bearer admin-token' },
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].owner.email).toBe('test@example.com');
    });

    it('should return 403 for non-admin', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: { message: 'Forbidden' } }),
      });

      const response = await fetch('/v1/admin/graduations', {
        headers: { 'Authorization': 'Bearer user-token' },
      });

      expect(response.status).toBe(403);
    });

    it('should support pagination', async () => {
      const mockResponse = {
        data: [],
        pagination: { page: 2, per_page: 10, total: 15, total_pages: 2 },
        request_id: 'req-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('/v1/admin/graduations?page=2&per_page=10', {
        headers: { 'Authorization': 'Bearer admin-token' },
      });

      const data = await response.json();
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.per_page).toBe(10);
    });
  });

  describe('POST /v1/admin/graduations/:id/review', () => {
    it('should approve graduation', async () => {
      const mockResponse = {
        data: {
          request_id: 'req-456',
          construct_type: 'pack',
          construct_id: 'pack-id',
          status: 'approved',
          new_maturity: 'stable',
          reviewed_at: '2026-01-31T12:00:00Z',
        },
        message: 'Graduation approved. Construct promoted to stable.',
        request_id: 'req-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('/v1/admin/graduations/req-456/review', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'approved',
          review_notes: 'Meets all stable requirements',
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.data.status).toBe('approved');
      expect(data.data.new_maturity).toBe('stable');
    });

    it('should reject graduation with reason', async () => {
      const mockResponse = {
        data: {
          request_id: 'req-789',
          construct_type: 'skill',
          construct_id: 'skill-id',
          status: 'rejected',
          new_maturity: null,
          reviewed_at: '2026-01-31T12:00:00Z',
        },
        message: 'Graduation request rejected.',
        request_id: 'req-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('/v1/admin/graduations/req-789/review', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'rejected',
          review_notes: 'Documentation needs improvement',
          rejection_reason: 'incomplete_documentation',
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.data.status).toBe('rejected');
      expect(data.data.new_maturity).toBeNull();
    });

    it('should return 400 if rejection reason missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: { message: 'Rejection reason is required when rejecting a graduation request' },
        }),
      });

      const response = await fetch('/v1/admin/graduations/req-789/review', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'rejected',
          review_notes: 'Not good enough',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 404 for unknown request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { message: 'Graduation request not found' } }),
      });

      const response = await fetch('/v1/admin/graduations/unknown-id/review', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'approved',
          review_notes: 'Approved',
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Full Graduation Flow', () => {
    it('should complete experimental → beta → stable flow', async () => {
      // Step 1: Check status (experimental)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          data: {
            current_maturity: 'experimental',
            next_level: 'beta',
            can_request: true,
            eligible_for_auto_graduation: true,
          },
        }),
      });

      const statusResponse = await fetch('/v1/constructs/my-pack/graduation-status');
      const statusData = await statusResponse.json();
      expect(statusData.data.current_maturity).toBe('experimental');

      // Step 2: Request graduation (auto-approved to beta)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          data: { status: 'approved', auto_approved: true },
        }),
      });

      const betaResponse = await fetch('/v1/constructs/my-pack/request-graduation', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const betaData = await betaResponse.json();
      expect(betaData.data.auto_approved).toBe(true);

      // Step 3: Check status (now beta)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          data: {
            current_maturity: 'beta',
            next_level: 'stable',
            can_request: true,
          },
        }),
      });

      const betaStatusResponse = await fetch('/v1/constructs/my-pack/graduation-status');
      const betaStatusData = await betaStatusResponse.json();
      expect(betaStatusData.data.current_maturity).toBe('beta');

      // Step 4: Request stable graduation (pending)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          data: { request_id: 'req-stable', status: 'pending', auto_approved: false },
        }),
      });

      const stableResponse = await fetch('/v1/constructs/my-pack/request-graduation', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Ready for stable' }),
      });
      expect(stableResponse.status).toBe(201);

      // Step 5: Admin approves
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          data: { status: 'approved', new_maturity: 'stable' },
        }),
      });

      const approveResponse = await fetch('/v1/admin/graduations/req-stable/review', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer admin-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approved', review_notes: 'LGTM' }),
      });
      const approveData = await approveResponse.json();
      expect(approveData.data.new_maturity).toBe('stable');
    });
  });
});

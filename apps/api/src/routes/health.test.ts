import { describe, it, expect } from 'vitest';
import { app } from '../app.js';

/**
 * Health route tests
 * @see sprint.md Acceptance Criteria: "API responds to GET /v1/health with 200"
 */
describe('Health Routes', () => {
  describe('GET /v1/health', () => {
    it('returns 200 with healthy status', async () => {
      const res = await app.request('/v1/health');

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('status', 'healthy');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('uptime');
    });
  });

  describe('GET /v1/health/ready', () => {
    it('returns 200 with health check results', async () => {
      const res = await app.request('/v1/health/ready');

      expect(res.status).toBe(200);

      const body = await res.json();
      // In test environment without DB/Redis, status will be 'degraded'
      expect(['healthy', 'degraded']).toContain(body.status);
      expect(body).toHaveProperty('checks');
      expect(Array.isArray(body.checks)).toBe(true);
      expect(body.checks.length).toBeGreaterThan(0);
      // First check is always the API check
      expect(body.checks[0]).toHaveProperty('name', 'api');
      expect(body.checks[0]).toHaveProperty('status', 'pass');
    });
  });

  describe('GET /v1/health/live', () => {
    it('returns 200 with alive status', async () => {
      const res = await app.request('/v1/health/live');

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toHaveProperty('status', 'alive');
      expect(body).toHaveProperty('timestamp');
    });
  });
});

describe('API Root', () => {
  it('redirects / to /v1/health', async () => {
    const res = await app.request('/', { redirect: 'manual' });

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/v1/health');
  });
});

describe('404 Handler', () => {
  it('returns 404 for unknown routes', async () => {
    // Use a route outside /v1 to avoid rate limiter and auth middleware
    const res = await app.request('/nonexistent-route');

    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Route not found');
    expect(body).toHaveProperty('request_id');
  });
});

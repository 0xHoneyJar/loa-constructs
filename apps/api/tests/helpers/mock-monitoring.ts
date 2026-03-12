/**
 * Shared Monitoring Mock Factory
 *
 * Creates mock monitoring/error-tracking functions.
 *
 * Usage:
 *   vi.mock('../lib/monitoring.js', () => getMockMonitoringModule());
 */

import { vi } from 'vitest';

export function getMockMonitoringModule() {
  return {
    captureException: vi.fn(() => 'mock-event-id'),
    addBreadcrumb: vi.fn(),
    getAppVersion: vi.fn(() => '0.1.0-test'),
    initMonitoring: vi.fn(),
  };
}

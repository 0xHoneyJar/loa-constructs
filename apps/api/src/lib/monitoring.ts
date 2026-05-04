/**
 * Monitoring and Error Tracking Module
 * @see sprint.md T12.6: Monitoring & Alerting
 * @see sdd.md §1.3 Technology Stack - Observability
 */

import { randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/node';
import { env, isProduction } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Sentry-compatible error tracking interface
 * Supports graceful fallback when SENTRY_DSN is not configured
 */

interface ErrorContext {
  user?: {
    id: string;
    email?: string;
    username?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

interface BreadcrumbData {
  type: 'http' | 'navigation' | 'ui' | 'user' | 'error' | 'default';
  category: string;
  message: string;
  data?: Record<string, unknown>;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

let sentryEnabled = false;

/**
 * Initialize monitoring - called at app startup
 */
export function initMonitoring(): void {
  if (!env.SENTRY_DSN) {
    logger.info('Monitoring: Sentry DSN not configured, using local logging fallback');
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0, // errors only — no performance tracing
    beforeSend(event) {
      // Strip sensitive data
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });

  sentryEnabled = true;
  logger.info({
    msg: 'Sentry initialized',
    environment: env.NODE_ENV,
  });
}

/**
 * Capture an exception for error tracking
 */
export function captureException(error: Error | unknown, context?: ErrorContext): string {
  const errorDetails = {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    level: context?.level || 'error',
    ...context?.user && { user: context.user },
    ...context?.tags && { tags: context.tags },
    ...context?.extra && { extra: context.extra },
    timestamp: new Date().toISOString(),
  };

  // Always log locally
  if (context?.level === 'fatal' || context?.level === 'error') {
    logger.error(errorDetails);
  } else if (context?.level === 'warning') {
    logger.warn(errorDetails);
  } else {
    logger.info(errorDetails);
  }

  // Send to Sentry if configured
  if (sentryEnabled) {
    return Sentry.captureException(error, {
      tags: context?.tags,
      extra: context?.extra,
      user: context?.user,
      fingerprint: context?.fingerprint,
    });
  }

  return randomUUID();
}

/**
 * Capture a message for monitoring
 */
export function captureMessage(message: string, context?: ErrorContext): string {
  const messageDetails = {
    message,
    level: context?.level || 'info',
    ...context?.user && { user: context.user },
    ...context?.tags && { tags: context.tags },
    ...context?.extra && { extra: context.extra },
    timestamp: new Date().toISOString(),
  };

  if (context?.level === 'error' || context?.level === 'fatal') {
    logger.error(messageDetails);
  } else if (context?.level === 'warning') {
    logger.warn(messageDetails);
  } else {
    logger.info(messageDetails);
  }

  if (sentryEnabled) {
    return Sentry.captureMessage(message, {
      tags: context?.tags,
      extra: context?.extra,
      level: context?.level as Sentry.SeverityLevel,
    });
  }

  return randomUUID();
}

/**
 * Add a breadcrumb to the current scope
 */
export function addBreadcrumb(breadcrumb: BreadcrumbData): void {
  if (!isProduction) {
    logger.debug({ msg: 'Breadcrumb', ...breadcrumb });
  }
  if (sentryEnabled) {
    Sentry.addBreadcrumb(breadcrumb);
  }
}

/**
 * Set user context for error tracking
 */
export function setUser(user: ErrorContext['user'] | null): void {
  if (user) {
    logger.debug({ msg: 'User context set', user_id: user.id });
  }
  if (sentryEnabled) {
    Sentry.setUser(user ?? null);
  }
}

/**
 * Set extra tags for error tracking
 */
export function setTags(tags: Record<string, string>): void {
  logger.debug({ msg: 'Tags set', tags });
  if (sentryEnabled) {
    Sentry.setTags(tags);
  }
}

/**
 * Start a performance transaction
 * Returns a function to end the transaction
 */
export function startTransaction(
  name: string,
  operation: string
): { finish: (status?: 'ok' | 'error') => void; setData: (key: string, value: unknown) => void } {
  const startTime = performance.now();
  const transactionData: Record<string, unknown> = {};

  return {
    setData(key: string, value: unknown) {
      transactionData[key] = value;
    },
    finish(status: 'ok' | 'error' = 'ok') {
      const duration = performance.now() - startTime;

      logger.info({
        msg: 'Transaction completed',
        transaction: name,
        operation,
        duration_ms: Math.round(duration * 100) / 100,
        status,
        data: Object.keys(transactionData).length > 0 ? transactionData : undefined,
      });
    },
  };
}

/**
 * Health check result for monitoring
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    duration_ms?: number;
  }[];
  timestamp: string;
  version: string;
}

/**
 * Get app version from package.json
 */
export function getAppVersion(): string {
  // In production, this would read from package.json or env
  return process.env.npm_package_version || '0.1.0';
}

/**
 * Create a monitoring-aware wrapper for async operations
 * Automatically captures errors and measures performance
 */
export function withMonitoring<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const transaction = startTransaction(name, operation);

  return fn()
    .then((result) => {
      transaction.finish('ok');
      return result;
    })
    .catch((error) => {
      transaction.finish('error');
      captureException(error, {
        tags: { operation, transaction: name },
      });
      throw error;
    });
}

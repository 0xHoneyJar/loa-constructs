/**
 * Lightweight client-side error capture for the signals pipeline.
 * Replaces @sentry/nextjs with a ~2KB script that pipes errors
 * into the existing Convex → Telegram → Linear flow.
 *
 * Usage:
 *   import { initErrorCapture } from '@loa-constructs/shared/error-capture'
 *   initErrorCapture({ endpoint: '/api/signals', apiKey: 'sk_...', appSlug: 'mcv' })
 */

interface ErrorCaptureConfig {
  /** Signals API endpoint (e.g. 'https://constructs.network/api/signals' or '/api/signals') */
  endpoint: string;
  /** Signal API key (sk_...) */
  apiKey: string;
  /** App identifier for grouping (e.g. 'mcv-interface', 'honeyroad') */
  appSlug: string;
  /** Only capture in production? Default: true */
  productionOnly?: boolean;
  /** Max errors to send per page load. Default: 10 */
  maxErrors?: number;
}

interface ErrorPayload {
  source: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  data: {
    type: 'error_report';
    errorClass?: string;
    message?: string;
    stackTrace?: string;
    url?: string;
    userAgent?: string;
  };
}

let config: ErrorCaptureConfig | null = null;
let errorCount = 0;

function shouldCapture(): boolean {
  if (!config) return false;
  if (config.productionOnly !== false && typeof window !== 'undefined') {
    // Skip in development (localhost, 127.0.0.1)
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
      return false;
    }
  }
  const max = config.maxErrors ?? 10;
  return errorCount < max;
}

function sendError(payload: ErrorPayload): void {
  if (!config || !shouldCapture()) return;
  errorCount++;

  const body = JSON.stringify(payload);

  fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': config.apiKey,
    },
    body,
    keepalive: true, // survives page unload like sendBeacon
  }).catch(() => {
    // Swallow — error tracking should never cause errors
  });
}

function errorToPayload(
  error: Error | string,
  context?: { componentStack?: string },
): ErrorPayload {
  const isError = error instanceof Error;
  const message = isError ? error.message : String(error);
  const errorClass = isError ? error.name : 'Error';
  const stack = isError ? error.stack : undefined;
  const fullStack = context?.componentStack
    ? `${stack ?? ''}\n\nComponent Stack:${context.componentStack}`
    : stack;

  return {
    source: 'error-capture',
    severity: 'high',
    title: message.slice(0, 200),
    data: {
      type: 'error_report',
      errorClass,
      message: message.slice(0, 1000),
      stackTrace: fullStack?.slice(0, 10000),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : undefined,
    },
  };
}

/**
 * Initialize error capture. Call once at app startup.
 * Installs global error + unhandledrejection listeners.
 */
export function initErrorCapture(opts: ErrorCaptureConfig): void {
  config = opts;
  errorCount = 0;

  if (typeof window === 'undefined') return;

  // Catch uncaught errors
  window.addEventListener('error', (event: ErrorEvent) => {
    if (event.error) {
      sendError(errorToPayload(event.error));
    } else if (event.message) {
      sendError(errorToPayload(event.message));
    }
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error
      ? event.reason
      : String(event.reason ?? 'Unhandled rejection');
    sendError(errorToPayload(error));
  });
}

/**
 * Manually capture an error (for try/catch blocks).
 */
export function captureError(error: Error | string, context?: { componentStack?: string }): void {
  sendError(errorToPayload(error, context));
}

/**
 * React Error Boundary handler.
 * Use with: componentDidCatch(error, info) { captureReactError(error, info) }
 * Or with Next.js error.tsx: captureReactError(error)
 */
export function captureReactError(
  error: Error,
  errorInfo?: { componentStack?: string },
): void {
  sendError(errorToPayload(error, errorInfo));
}

/**
 * Application Error Classes
 * @see sdd.md §6.1 Error Categories, §6.3 Error Handling Implementation
 */

/**
 * Base application error with structured response format
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error factory functions
 */
export const Errors = {
  // 400 Bad Request
  ValidationError: (details?: Record<string, unknown>) =>
    new AppError('VALIDATION_ERROR', 'Request validation failed', 400, details),

  // 401 Unauthorized
  Unauthorized: (message = 'Authentication required') =>
    new AppError('UNAUTHORIZED', message, 401),

  InvalidToken: () => new AppError('INVALID_TOKEN', 'Invalid or expired token', 401),

  // 403 Forbidden
  Forbidden: (message = 'Insufficient permissions') =>
    new AppError('FORBIDDEN', message, 403),

  // 404 Not Found
  NotFound: (resource: string) =>
    new AppError('NOT_FOUND', `${resource} not found`, 404, { resource }),

  // 402 Payment Required
  TierUpgradeRequired: (requiredTier: string, currentTier: string) =>
    new AppError('TIER_UPGRADE_REQUIRED', `This requires a ${requiredTier} subscription`, 402, {
      required_tier: requiredTier,
      current_tier: currentTier,
      upgrade_url: '/billing',
    }),

  // 409 Conflict
  Conflict: (message: string) => new AppError('CONFLICT', message, 409),

  EmailAlreadyExists: () =>
    new AppError('EMAIL_EXISTS', 'Email already registered', 409, {
      field: 'email',
    }),

  // 429 Rate Limited
  RateLimitExceeded: (retryAfter: number) =>
    new AppError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, {
      retry_after: retryAfter,
    }),

  RateLimited: (message: string) => new AppError('RATE_LIMITED', message, 429),

  // 500 Internal Error
  InternalError: (message = 'An unexpected error occurred') =>
    new AppError('INTERNAL_ERROR', message, 500),

  // 503 Service Unavailable
  ServiceUnavailable: (message = 'Service temporarily unavailable') =>
    new AppError('SERVICE_UNAVAILABLE', message, 503),

  // 400 Bad Request (generic)
  BadRequest: (message: string) => new AppError('BAD_REQUEST', message, 400),
};

/**
 * Check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

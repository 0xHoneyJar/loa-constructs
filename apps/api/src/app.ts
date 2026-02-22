import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middleware/error-handler.js';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { securityHeaders } from './middleware/security.js';
import { maintenanceMode } from './middleware/maintenance.js';
import { health } from './routes/health.js';
import { auth } from './routes/auth.js';
import { oauth } from './routes/oauth.js';
import { subscriptionsRouter } from './routes/subscriptions.js';
import { webhooksRouter } from './routes/webhooks.js';
import { skillsRouter } from './routes/skills.js';
import { teamsRouter } from './routes/teams.js';
import { analyticsRouter } from './routes/analytics.js';
import { creatorRouter } from './routes/creator.js';
import { creatorsRouter } from './routes/creators.js';
import { auditRouter } from './routes/audit.js';
import { docsRouter } from './routes/docs.js';
import { packsRouter } from './routes/packs.js';
import { signalsRouter } from './routes/signals.js';
import { constructsRouter } from './routes/constructs.js';
import { categoriesRouter } from './routes/categories.js';
import { adminRouter } from './routes/admin.js';
import { publicKeysRouter } from './routes/public-keys.js';
import { apiRateLimiter } from './middleware/rate-limiter.js';
import { env } from './config/env.js';

/**
 * Hono Application Configuration
 * @see sdd.md §1.4 System Components - API Server (Hono + Node.js)
 */

// Type augmentation for custom context variables
type Variables = {
  requestId: string;
};

// Create Hono app instance
const app = new Hono<{ Variables: Variables }>();

// --- Global Middleware ---

// Error handler (must be first to catch all errors)
app.use('*', errorHandler());

// Request ID generation
app.use('*', requestId());

// Maintenance mode (blocks writes during migration cutover)
// @see sdd-infrastructure-migration.md §4.1 Multi-Layer Write Freeze
app.use('*', maintenanceMode);

// Security headers
app.use('*', securityHeaders());

// CORS configuration
// Production allows: constructs.network, *.vercel.app (for preview deployments)
const allowedOrigins = [
  'https://constructs.network',
  'https://www.constructs.network',
];

function isAllowedOrigin(origin: string): boolean {
  if (env.NODE_ENV !== 'production') return true;
  if (allowedOrigins.includes(origin)) return true;
  // Allow Vercel preview/production deployments
  if (origin.endsWith('.vercel.app')) return true;
  return false;
}

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (env.NODE_ENV !== 'production') return '*';
      if (!origin) return allowedOrigins[0]; // Default for non-browser requests
      return isAllowedOrigin(origin) ? origin : allowedOrigins[0];
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposeHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 600, // 10 minutes
  })
);

// Request logging (after requestId middleware)
app.use('*', requestLogger());

// Global API rate limiting (safety net - individual routes have their own limits)
app.use('/v1/*', apiRateLimiter());

// --- API Routes ---

// API version prefix
const v1 = new Hono();

// Health check routes
v1.route('/health', health);

// Authentication routes
v1.route('/auth', auth);
v1.route('/auth/oauth', oauth);

// Subscription routes
v1.route('/subscriptions', subscriptionsRouter);

// Webhook routes
v1.route('/webhooks', webhooksRouter);

// Skills routes
v1.route('/skills', skillsRouter);

// Team routes
v1.route('/teams', teamsRouter);

// Analytics routes (user usage, creator analytics)
// Note: Analytics router handles /users/me/usage and /creator/* routes
// Mounted at root - routes use specific path prefixes internally
v1.route('/', analyticsRouter);

// Creator routes (skill publishing)
v1.route('/creator', creatorRouter);

// Public creator profiles
v1.route('/creators', creatorsRouter);

// Audit routes (audit log queries)
v1.route('/audit', auditRouter);

// Pack routes
v1.route('/packs', packsRouter);

// Signal & Showcase routes (pack-scoped)
v1.route('/packs', signalsRouter);

// Constructs routes (unified discovery)
v1.route('/constructs', constructsRouter);

// Categories routes (taxonomy)
v1.route('/categories', categoriesRouter);

// Admin routes (requires admin role)
v1.route('/admin', adminRouter);

// Public keys routes (JWT signature verification)
// @see sdd-license-jwt-rs256.md §6.2 Route Registration
v1.route('/public-keys', publicKeysRouter);

// Documentation routes (OpenAPI/Swagger)
v1.route('/docs', docsRouter);

// Mount v1 routes
app.route('/v1', v1);

// Root redirect to health check
app.get('/', (c) => c.redirect('/v1/health'));

// 404 handler for unmatched routes
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
      request_id: c.get('requestId'),
    },
    404
  );
});

// Global error handler (catches errors that escape middleware)
app.onError((err, c) => {
  const requestId = c.get('requestId') || crypto.randomUUID();

  // Check if it's an AppError using duck typing for bundling compatibility
  const isAppError = err && typeof err === 'object' && 'code' in err && 'status' in err && err.name === 'AppError';

  if (isAppError) {
    const appErr = err as { code: string; message: string; status: number; details?: Record<string, unknown> };
    return c.json(
      {
        error: {
          code: appErr.code,
          message: appErr.message,
          details: appErr.details,
        },
        request_id: requestId,
      },
      appErr.status as 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503
    );
  }

  // Log unexpected errors
  console.error('Unhandled error:', err);

  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      request_id: requestId,
    },
    500
  );
});

export { app };
export type { Variables };

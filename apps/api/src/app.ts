import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middleware/error-handler.js';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { securityHeaders } from './middleware/security.js';
import { health } from './routes/health.js';
import { auth } from './routes/auth.js';
import { oauth } from './routes/oauth.js';
import { subscriptionsRouter } from './routes/subscriptions.js';
import { webhooksRouter } from './routes/webhooks.js';
import { skillsRouter } from './routes/skills.js';
import { teamsRouter } from './routes/teams.js';
import { analyticsRouter } from './routes/analytics.js';
import { creatorRouter } from './routes/creator.js';
import { auditRouter } from './routes/audit.js';
import { docsRouter } from './routes/docs.js';
import { packsRouter } from './routes/packs.js';
import { adminRouter } from './routes/admin.js';
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

// Audit routes (audit log queries)
v1.route('/audit', auditRouter);

// Pack routes
v1.route('/packs', packsRouter);

// Admin routes (requires admin role)
v1.route('/admin', adminRouter);

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

export { app };
export type { Variables };

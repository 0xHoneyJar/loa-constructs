import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middleware/error-handler.js';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { securityHeaders } from './middleware/security.js';
import { maintenanceMode } from './middleware/maintenance.js';
import { apiRateLimiter } from './middleware/rate-limiter.js';
import { health } from './routes/health.js';
import { packsRouter } from './routes/packs.js';
import { skillsRouter } from './routes/skills.js';
import { constructsRouter } from './routes/constructs.js';
import { categoriesRouter } from './routes/categories.js';
import { adminRouter } from './routes/admin.js';
import { env } from './config/env.js';

/**
 * Hono Application Configuration — cycle-012 libSQL sovereign-landing
 * @see sdd.md §3 API contracts (live surface)
 * @see sdd.md §3.5 Routes DELETED
 *
 * Post-cycle-012 surface (7 routers): health (+readiness), packs, skills,
 * constructs, categories, admin. Auth + user-session endpoints removed
 * per [[saas-exit-vectors]] instance-1 execution.
 */

type Variables = {
  requestId: string;
};

const app = new Hono<{ Variables: Variables }>();

// --- Global middleware ---

app.use('*', errorHandler());
app.use('*', requestId());
app.use('*', maintenanceMode);
app.use('*', securityHeaders());

// CORS: production allows constructs.network + *.vercel.app preview deploys
const allowedOrigins = ['https://constructs.network', 'https://www.constructs.network'];

function isAllowedOrigin(origin: string): boolean {
  if (env.NODE_ENV !== 'production') return true;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.endsWith('.vercel.app')) return true;
  return false;
}

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (env.NODE_ENV !== 'production') return '*';
      if (!origin) return allowedOrigins[0];
      return isAllowedOrigin(origin) ? origin : allowedOrigins[0];
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposeHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 600,
  })
);

app.use('*', requestLogger());
app.use('/v1/*', apiRateLimiter());

// --- v1 routes ---

const v1 = new Hono();

v1.route('/health', health);
v1.route('/packs', packsRouter);
v1.route('/skills', skillsRouter);
v1.route('/constructs', constructsRouter);
v1.route('/categories', categoriesRouter);
v1.route('/admin', adminRouter);

app.route('/v1', v1);

// Root → health
app.get('/', (c) => c.redirect('/v1/health'));

app.notFound((c) =>
  c.json(
    {
      error: { code: 'NOT_FOUND', message: 'Route not found' },
      request_id: c.get('requestId'),
    },
    404
  )
);

app.onError((err, c) => {
  const requestId = c.get('requestId') || randomUUID();
  const isAppError =
    err && typeof err === 'object' && 'code' in err && 'status' in err && err.name === 'AppError';

  if (isAppError) {
    const appErr = err as {
      code: string;
      message: string;
      status: number;
      details?: Record<string, unknown>;
    };
    return c.json(
      {
        error: { code: appErr.code, message: appErr.message, details: appErr.details },
        request_id: requestId,
      },
      appErr.status as 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503
    );
  }

  console.error('Unhandled error:', err);
  return c.json(
    {
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      request_id: requestId,
    },
    500
  );
});

export { app };
export type { Variables };

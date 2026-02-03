# Loa Constructs API

Backend API for the Loa Constructs Registry - a skill and pack marketplace for the Loa Framework.

**Stack**: Hono + Drizzle ORM + PostgreSQL + TypeScript

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Run setup (creates .env, generates JWT keys, runs migrations)
pnpm dev:setup

# 3. Start development server
pnpm dev
```

The API will be available at `http://localhost:3000`.

## Development Without Database

For quick testing without a full database setup:

```bash
# Run with mocked database responses
pnpm dev:mock
```

Mock mode returns static data for read operations (categories, public keys) and logs warnings for write operations. Perfect for frontend development and endpoint testing.

## Available Scripts

| Script | Description |
|--------|-------------|
| `dev` | Start development server with hot reload |
| `dev:mock` | Start server with mocked database |
| `dev:setup` | One-time setup (env, keys, migrations) |
| `build` | Production build |
| `start` | Run production build |
| `test` | Run tests |
| `test:watch` | Run tests in watch mode |
| `test:coverage` | Run tests with coverage |
| `lint` | Run ESLint |
| `typecheck` | Run TypeScript type checking |
| `db:generate` | Generate Drizzle migrations |
| `db:migrate` | Apply database migrations |
| `db:reset` | Drop and recreate all tables (destructive!) |
| `db:studio` | Open Drizzle Studio GUI |
| `db:seed:categories` | Seed category data |
| `keys:generate` | Generate RS256 JWT key pair |

## Environment Variables

See `.env.example` for full documentation. Key variables:

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_PRIVATE_KEY` | Base64-encoded RSA private key |
| `JWT_PUBLIC_KEY` | Base64-encoded RSA public key |

> **Note**: `pnpm dev:setup` will generate JWT keys automatically.

### Optional

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Upstash Redis for caching |
| `R2_*` | Cloudflare R2 for file storage |
| `STRIPE_*` | Payment processing |
| `RESEND_API_KEY` | Email delivery |
| `SENTRY_DSN` | Error tracking |

## Architecture

```
apps/api/
├── src/
│   ├── config/       # Environment configuration
│   ├── db/           # Database schema and connection
│   ├── lib/          # Shared utilities (logger, errors)
│   ├── middleware/   # Hono middleware
│   ├── routes/       # API route handlers
│   └── services/     # Business logic
├── scripts/          # Utility scripts
├── drizzle/          # Database migrations
└── tests/            # Test files
```

### Key Components

- **Framework**: [Hono](https://hono.dev/) - Fast, lightweight web framework
- **ORM**: [Drizzle](https://orm.drizzle.team/) - Type-safe SQL with migrations
- **Database**: PostgreSQL (Supabase/Neon compatible)
- **Auth**: JWT with RS256 (RSA-SHA256) signatures
- **Caching**: Redis via Upstash (optional)
- **Storage**: Cloudflare R2 (optional, falls back to database)

## API Endpoints

### Public

| Endpoint | Description |
|----------|-------------|
| `GET /v1/health` | Health check |
| `GET /v1/categories` | List all categories |
| `GET /v1/public-keys/:id` | Get public key for JWT verification |
| `GET /v1/packs` | List published packs |
| `GET /v1/skills` | List published skills |

### Authenticated

| Endpoint | Description |
|----------|-------------|
| `POST /v1/auth/*` | Authentication routes |
| `GET /v1/me` | Current user profile |
| `POST /v1/skills` | Create/publish skill |
| `POST /v1/packs` | Create/publish pack |

## Troubleshooting

### "DATABASE_URL not configured"

Run `pnpm dev:setup` to create `.env` from `.env.example`, or use `pnpm dev:mock` to run without database.

### "Migration failed"

1. Ensure DATABASE_URL is set and database is accessible
2. Try `pnpm db:reset --force` to start fresh (⚠️ deletes all data)
3. Use `pnpm dev:mock` if you don't need database features

### "JWT keys not configured"

Run `pnpm keys:generate` to generate new keys, or `pnpm dev:setup` for full setup.

### Port already in use

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## Related Documentation

- [PRD: Local Dev DX](../../grimoires/loa/prd-local-dev-dx.md)
- [SDD: Local Dev DX](../../grimoires/loa/sdd-local-dev-dx.md)
- [PRD: JWT RS256 Migration](../../grimoires/loa/prd-license-jwt-rs256.md)

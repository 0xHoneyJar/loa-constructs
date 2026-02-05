# Loa Constructs

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-AGPL--3.0-green.svg)](LICENSE.md)

> The marketplace for AI agent constructs

Loa Constructs is a platform for distributing, licensing, and managing AI agent constructs compatible with the [Loa framework](https://github.com/0xHoneyJar/loa) and Claude Code. Discover, install, and manage constructs via CLI or web dashboard.

## Features

- **Construct Registry** - Browse, search, and discover curated AI agent skills and packs
- **CLI Integration** - Install and update constructs directly from Claude Code
- **Pack System** - Bundle multiple skills into installable packs with ownership markers
- **3D Explorer** - Interactive visualization of the construct ecosystem
- **Creator Dashboard** - Publish skills, track downloads, view analytics
- **License Enforcement** - JWT RS256 signed licenses with usage tracking
- **Team Management** - Shared access with seat management

## Quick Start

### Install the CLI Plugin

```bash
# From within Claude Code
/loa-constructs login
/loa-constructs search "your query"
/loa-constructs install construct-name
```

### Browse the Registry

- **Dashboard**: [constructs.network](https://constructs.network)
- **Explorer**: [constructs.loa.dev](https://constructs.loa.dev)

## Architecture

```
loa-constructs/
├── apps/
│   ├── api/          # Hono API server (Node.js)
│   ├── web/          # Next.js dashboard
│   ├── explorer/     # Next.js 3D construct explorer
│   └── sandbox/      # Pack development & publishing
├── packages/
│   ├── loa-registry/ # CLI plugin for Claude Code
│   └── shared/       # Shared types and validation (Zod)
└── grimoires/loa/    # Project documentation
```

### Available Packs

| Pack | Skills | Description |
|------|--------|-------------|
| **Observer** | 6 | User truth capture, hypothesis-first research |
| **Crucible** | 5 | Journey validation, Playwright testing |
| **Artisan** | 10 | Brand/UI craftsmanship, design systems |
| **Beacon** | 6 | Agent commerce, x402 payments |

### Tech Stack

| Component | Technology |
|-----------|------------|
| API | Hono + Node.js |
| Database | PostgreSQL (Supabase) |
| Cache | Redis (Upstash) |
| Storage | Cloudflare R2 |
| Auth | JWT RS256 + OAuth (GitHub, Google) |
| Email | Resend |
| Hosting (API) | Railway |
| Frontend | Next.js + Tailwind |
| Monorepo | Turborepo + pnpm |

## API Endpoints

Base URL: `https://api.constructs.network/v1`

### Authentication
- `POST /v1/auth/register` - Create account
- `POST /v1/auth/login` - Login
- `POST /v1/auth/refresh` - Refresh tokens
- `POST /v1/auth/logout` - Logout (blacklists token)

### Constructs
- `GET /v1/constructs` - Unified search across skills and packs
- `GET /v1/constructs/:slug` - Get construct details

### Skills
- `GET /v1/skills` - List/search skills
- `GET /v1/skills/:slug` - Get skill details
- `GET /v1/skills/:slug/download` - Download skill files
- `POST /v1/skills/:slug/install` - Record installation

### Packs
- `GET /v1/packs` - List available packs
- `GET /v1/packs/:slug` - Get pack details
- `GET /v1/packs/:slug/download` - Download pack

### Teams
- `GET /v1/teams` - List user's teams
- `POST /v1/teams` - Create team
- `POST /v1/teams/:slug/invite` - Invite member
- `POST /v1/teams/:slug/members/:id/remove` - Remove member

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (or Supabase account)
- Redis (or Upstash account)

### Setup

```bash
# Clone the repository
git clone https://github.com/0xHoneyJar/loa-constructs.git
cd loa-constructs

# Install dependencies
pnpm install

# Copy environment template
cp apps/api/.env.example apps/api/.env

# Run database migrations
pnpm --filter @loa-constructs/api db:push

# Start development servers
pnpm dev
```

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-at-least-32-chars

# Redis (optional for local dev)
REDIS_URL=redis://...

# Email
RESEND_API_KEY=re_...

# Storage
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=loa-constructs
R2_ENDPOINT=https://...

# OAuth (optional)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run API tests only
pnpm --filter @loa-constructs/api test

# Type check
pnpm typecheck
```

## Security

- JWT RS256 authentication with token blacklisting
- bcrypt password hashing (cost factor 12)
- Rate limiting with fail-closed for auth endpoints
- CSRF protection (double-submit cookie)
- Input validation via Zod schemas
- SQL injection prevention via Drizzle ORM
- Security headers (CSP, HSTS, etc.)

See [SECURITY-AUDIT-REPORT.md](SECURITY-AUDIT-REPORT.md) for the full audit.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checks
5. Submit a pull request

## License

[AGPL-3.0](LICENSE.md) - You can use, modify, and distribute. If you deploy modifications (including as a network service), you must release source code.

## Links

- [Loa Framework](https://github.com/0xHoneyJar/loa)
- [Constructs Explorer](https://constructs.loa.dev)
- [Issues](https://github.com/0xHoneyJar/loa-constructs/issues)

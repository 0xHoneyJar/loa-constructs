# Loa Constructs

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-AGPL--3.0-green.svg)](LICENSE.md)

> The marketplace for AI agent constructs

Loa Constructs is a SaaS platform for distributing, licensing, and monetizing AI agent constructs compatible with the [Loa framework](https://github.com/0xHoneyJar/loa) and Claude Code. Discover, install, and manage constructs via CLI or web dashboard.

## Features

- **Skill Marketplace** - Browse, search, and discover curated AI agent skills
- **CLI Integration** - Install and update skills directly from Claude Code
- **Subscription Tiers** - Free, Pro, Team, and Enterprise plans
- **Pack System** - Bundle multiple skills into installable packs
- **Team Management** - Shared subscriptions with seat management
- **Creator Dashboard** - Publish skills, track downloads, view analytics
- **License Enforcement** - Watermarked licenses with usage tracking

## Quick Start

### Install the CLI Plugin

```bash
# From within Claude Code
/loa-constructs login
/loa-constructs search "your query"
/loa-constructs install construct-name
```

### Browse the Registry

Visit [constructs.network](https://constructs.network) to browse available constructs and manage your subscription.

## Architecture

```
loa-constructs/
├── apps/
│   ├── api/          # Hono API server (Node.js)
│   └── web/          # Next.js dashboard
├── packages/
│   ├── loa-registry/ # CLI plugin for Claude Code
│   └── shared/       # Shared types and validation
└── loa-grimoire/     # Project documentation
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| API | Hono + Node.js |
| Database | PostgreSQL (Neon) |
| Cache | Redis (Upstash) |
| Storage | Cloudflare R2 |
| Auth | JWT + OAuth (GitHub, Google) |
| Payments | Stripe |
| Email | Resend |
| Hosting | Fly.io |
| Frontend | Next.js 14 + Tailwind |

## Subscription Tiers

| Feature | Free | Pro | Team | Enterprise |
|---------|------|-----|------|------------|
| Public skills | Unlimited | Unlimited | Unlimited | Unlimited |
| Pro skills | - | Unlimited | Unlimited | Unlimited |
| Team skills | - | - | Unlimited | Unlimited |
| API rate limit | 100/min | 500/min | 500/min | 1000/min |
| Team members | - | - | Up to 10 | Unlimited |
| Priority support | - | - | - | Yes |

## API Endpoints

### Authentication
- `POST /v1/auth/register` - Create account
- `POST /v1/auth/login` - Login
- `POST /v1/auth/refresh` - Refresh tokens
- `POST /v1/auth/logout` - Logout (blacklists token)

### Skills
- `GET /v1/skills` - List/search skills
- `GET /v1/skills/:slug` - Get skill details
- `GET /v1/skills/:slug/download` - Download skill files
- `POST /v1/skills/:slug/install` - Record installation

### Packs
- `GET /v1/packs` - List available packs
- `GET /v1/packs/:slug` - Get pack details
- `GET /v1/packs/:slug/download` - Download pack (requires subscription)

### Teams
- `GET /v1/teams` - List user's teams
- `POST /v1/teams` - Create team
- `POST /v1/teams/:slug/invite` - Invite member
- `POST /v1/teams/:slug/members/:id/remove` - Remove member

## Development

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL (or Neon account)
- Redis (or Upstash account)

### Setup

```bash
# Clone the repository
git clone https://github.com/0xHoneyJar/loa.git
cd loa

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
REDIS_URL=redis://...
JWT_SECRET=your-secret-at-least-32-chars

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

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

- JWT authentication with token blacklisting
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
- [Documentation](https://constructs.network/docs)
- [Issues](https://github.com/0xHoneyJar/loa/issues)

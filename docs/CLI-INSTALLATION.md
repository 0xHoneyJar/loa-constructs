# Loa Constructs CLI Installation Guide

> Connect Claude Code to the Loa Constructs registry for skills and packs

## Overview

The Loa Constructs CLI integrates with Claude Code to provide:
- Skill discovery and installation from the registry
- Pack management (collections of skills and commands)
- License validation for premium content
- Automatic updates and caching

## Deployed Services

| Service | URL | Description |
|---------|-----|-------------|
| **API** | `https://loa-constructs-api.fly.dev` | REST API (Fly.io) |
| **Dashboard** | Vercel (behind SSO during soft launch) | Web interface |
| **Database** | Neon PostgreSQL | Data storage |

> **Note**: During soft launch, the web dashboard is behind Vercel SSO. Use the CLI or API directly for access.

## Prerequisites

- **Claude Code** (Claude CLI) installed
- **Node.js** v20+ with pnpm
- A Loa Constructs account (contact THJ team for access)

## Quick Start

### 1. Clone and Build the CLI

```bash
# Clone the repository
git clone https://github.com/0xHoneyJar/loa-constructs.git
cd loa-constructs

# Install dependencies
pnpm install

# Build the CLI package
pnpm --filter @loa-constructs/cli build
```

### 2. Configure the Registry URL

For the soft launch, the API is hosted at `loa-constructs-api.fly.dev`:

```bash
# Set the production API URL (add to your shell profile)
export LOA_CONSTRUCTS_URL="https://loa-constructs-api.fly.dev/v1"
```

Add this to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) for persistence:

```bash
echo 'export LOA_CONSTRUCTS_URL="https://loa-constructs-api.fly.dev/v1"' >> ~/.zshrc
source ~/.zshrc
```

### 3. Authenticate

**Option A: Interactive Login**

```bash
# From your loa-constructs directory
npx tsx packages/loa-registry/dist/commands/login.js
```

Or using the skill command in Claude Code:
```
/skill-login
```

Enter your email and password when prompted.

**Option B: API Key (Recommended for CI/Scripts)**

```bash
# Set your API key
export LOA_CONSTRUCTS_API_KEY="sk_your_api_key_here"
```

API keys can be generated from the dashboard once it's publicly accessible.

### 4. Verify Connection

```bash
# Test API health
curl https://loa-constructs-api.fly.dev/v1/health

# List available packs (public endpoint)
curl https://loa-constructs-api.fly.dev/v1/packs

# Or with authentication
curl -H "Authorization: Bearer $LOA_CONSTRUCTS_API_KEY" \
  https://loa-constructs-api.fly.dev/v1/packs

# Using Claude Code commands
/skill-pack-list
```

## Configuration

Configuration is stored in `~/.loa-constructs/`:

```
~/.loa-constructs/
├── config.json       # Registry URLs, cache settings
└── credentials.json  # Authentication tokens (encrypted)
```

### Default Configuration

```json
{
  "registries": [
    {
      "name": "default",
      "url": "https://api.constructs.network/v1",
      "default": true
    }
  ],
  "cache": {
    "enabled": true,
    "ttl": 86400,
    "maxSize": "500MB"
  },
  "autoUpdate": {
    "enabled": true,
    "checkInterval": 86400
  }
}
```

### Soft Launch Configuration

For the soft launch, override the default URL:

```bash
# Option 1: Environment variable (recommended)
export LOA_CONSTRUCTS_URL="https://loa-constructs-api.fly.dev/v1"

# Option 2: Edit config directly
cat > ~/.loa-constructs/config.json << 'EOF'
{
  "registries": [
    {
      "name": "default",
      "url": "https://loa-constructs-api.fly.dev/v1",
      "default": true
    }
  ],
  "cache": {
    "enabled": true,
    "ttl": 86400,
    "maxSize": "500MB"
  },
  "autoUpdate": {
    "enabled": true,
    "checkInterval": 86400
  }
}
EOF
```

## Available Commands

### Authentication

| Command | Description |
|---------|-------------|
| `/skill-login` | Authenticate with the registry |
| `/skill-logout` | Clear stored credentials |

### Skills

| Command | Description |
|---------|-------------|
| `/skill-list` | List installed skills |
| `/skill-search <query>` | Search for skills |
| `/skill-info <slug>` | Get skill details |
| `/skill-install <slug>` | Install a skill |
| `/skill-uninstall <slug>` | Uninstall a skill |
| `/skill-update [slug]` | Update skills |

### Packs

| Command | Description |
|---------|-------------|
| `/skill-pack-list` | List available packs |
| `/skill-pack-install <slug>` | Install a pack |
| `/skill-pack-update [slug]` | Update packs |

### Cache Management

| Command | Description |
|---------|-------------|
| `/skill-cache` | Show cache status |
| `/skill-cache clear` | Clear the cache |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOA_CONSTRUCTS_URL` | Registry API URL | `https://api.constructs.network/v1` |
| `LOA_CONSTRUCTS_API_KEY` | API key for authentication | (none) |

## Subscription Tiers

Access to skills and packs depends on your subscription tier:

| Tier | Access |
|------|--------|
| Free | Free skills only |
| Pro | Pro skills + packs (GTM Collective, etc.) |
| Team | Pro + team features |
| Enterprise | All features + priority support |

## GTM Collective Pack

The GTM Collective pack is available for Pro+ subscribers:

```bash
# Install the pack
/skill-pack-install gtm-collective
```

This installs 8 skills and 14 commands for go-to-market activities.

## Troubleshooting

### "Not authenticated" Error

```bash
# Check authentication status
cat ~/.loa-constructs/credentials.json

# Re-authenticate
/skill-login
```

### "Registry not found" Error

Ensure the registry URL is correct:

```bash
echo $LOA_CONSTRUCTS_URL
# Should be: https://loa-constructs-api.fly.dev/v1
```

### Connection Refused

Check if the API is healthy:

```bash
curl https://loa-constructs-api.fly.dev/v1/health
# Expected: {"status":"healthy",...}
```

### "TIER_UPGRADE_REQUIRED" Error

Your subscription tier doesn't have access to the requested skill/pack. Contact the THJ team for an upgrade.

### Cache Issues

Clear the cache and retry:

```bash
/skill-cache clear
```

Or manually:

```bash
rm -rf ~/.loa-constructs/cache
```

## For THJ Team Members

THJ team members have `thjBypass` enabled, allowing access to all packs regardless of subscription tier.

1. Ensure your account email is in the THJ team list
2. Use your credentials (shared securely)
3. All packs should be accessible

## API Endpoints Reference

Base URL: `https://loa-constructs-api.fly.dev/v1`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | API health check |
| `/auth/login` | POST | Authenticate with email/password |
| `/auth/refresh` | POST | Refresh access token |
| `/users/me` | GET | Get current user info |
| `/skills` | GET | List skills |
| `/skills/:slug` | GET | Get skill details |
| `/skills/:slug/download` | GET | Download skill files |
| `/packs` | GET | List packs |
| `/packs/:slug` | GET | Get pack details |
| `/packs/:slug/download` | GET | Download pack files |

## Support

- GitHub Issues: https://github.com/0xHoneyJar/loa-constructs/issues
- THJ Discord: Contact for access

---

*Last updated: 2026-01-02*
*API Version: v1*
*CLI Version: 0.3.0*

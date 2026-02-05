# Loa Framework Integration Guide

> How to integrate `@loa-constructs/cli` into the Loa framework (0xHoneyJar/loa)

## Overview

This document provides everything needed to connect the Loa framework to the Loa Constructs registry for skill and pack management.

## Deployed Services

| Service | URL | Status |
|---------|-----|--------|
| **API** | `https://api.constructs.network/v1` | Live |
| **Health Check** | `https://api.constructs.network/v1/health` | Live |

## Quick Start for Loa Framework (Shell Integration)

The loa framework (`0xHoneyJar/loa`) uses bash scripts for registry integration. To connect to the production API:

### 1. Set the Registry URL

Add to your shell profile (`~/.bashrc`, `~/.zshrc`):

```bash
export LOA_REGISTRY_URL="https://api.constructs.network/v1"
```

Or set it in `.loa.config.yaml`:

```yaml
registry:
  default_url: "https://api.constructs.network/v1"
```

### 2. Verify Connection

```bash
# Test API health
curl -s "$LOA_REGISTRY_URL/health" | jq .

# List available packs (public)
curl -s "$LOA_REGISTRY_URL/packs" | jq '.data[].name'

# Expected output:
# "GTM Collective"
```

### 3. Authentication

For authenticated endpoints (skill/pack downloads), store credentials:

```bash
# Create credentials directory
mkdir -p ~/.loa/cache

# Store API key (if using API key auth)
export LOA_REGISTRY_API_KEY="sk_your_api_key"

# Or authenticate via login endpoint
curl -X POST "$LOA_REGISTRY_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}' | jq .
```

### 4. Update registry-lib.sh Default URL

In the loa repository, update `.claude/scripts/registry-lib.sh`:

```bash
# Change the default URL from:
config_url=$(get_registry_config 'default_url' 'https://api.loaskills.dev/v1')

# To:
config_url=$(get_registry_config 'default_url' 'https://api.constructs.network/v1')
```

This ensures the production API is used even without the environment variable.

## Integration Options

### Option 1: Use the Published Package (Recommended)

The CLI plugin is published as `@loa-constructs/cli`:

```bash
# In the loa repository
pnpm add @loa-constructs/cli
```

```typescript
import { registryPlugin } from '@loa-constructs/cli';

// Register all commands from the plugin
registryPlugin.commands.forEach(cmd => {
  registerCommand(cmd.name, cmd.description, cmd.execute);
});
```

### Option 2: Direct API Integration

If you prefer to call the API directly without the plugin:

```typescript
const API_BASE = 'https://api.constructs.network/v1';

// Public endpoints (no auth required)
const packs = await fetch(`${API_BASE}/packs`).then(r => r.json());
const skills = await fetch(`${API_BASE}/skills`).then(r => r.json());

// Authenticated endpoints
const headers = { 'Authorization': `Bearer ${apiKey}` };
const user = await fetch(`${API_BASE}/users/me`, { headers }).then(r => r.json());
```

## Plugin Exports

The `@loa-constructs/cli` package exports:

```typescript
// Main plugin (registers all commands)
import { registryPlugin } from '@loa-constructs/cli';

// API Client
import { RegistryClient, RegistryError, DEFAULT_REGISTRY_URL } from '@loa-constructs/cli';

// Authentication utilities
import {
  getRegistryUrl,
  getCredentials,
  saveCredentials,
  removeCredentials,
  isAuthenticated,
  getClient,
  canAccessTier,
} from '@loa-constructs/cli';

// Cache utilities
import {
  cacheSkill,
  getCachedSkill,
  isInstalled,
  getInstalledSkills,
  clearCache,
} from '@loa-constructs/cli';

// License validation
import {
  validateSkillLicense,
  hasValidLicense,
  getLicenseStatus,
  skillBeforeLoadHook,
} from '@loa-constructs/cli';

// Types
import type {
  LoaPlugin,
  Command,
  CommandContext,
  RegistryClientConfig,
  Credentials,
  SkillSummary,
  SkillDetail,
  PackSummary,
  PackDetail,
} from '@loa-constructs/cli';
```

## Registered Commands

The plugin registers these commands:

| Command | Description |
|---------|-------------|
| `/skill-login` | Authenticate with the registry |
| `/skill-logout` | Clear stored credentials |
| `/skill-list` | List installed skills |
| `/skill-search <query>` | Search for skills |
| `/skill-info <slug>` | Get skill details |
| `/skill-install <slug>` | Install a skill |
| `/skill-uninstall <slug>` | Uninstall a skill |
| `/skill-update [slug]` | Update skills |
| `/skill-cache` | Manage cache |
| `/skill-pack-list` | List available packs |
| `/skill-pack-install <slug>` | Install a pack |
| `/skill-pack-update [slug]` | Update packs |

## Environment Variables

The plugin respects these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `LOA_CONSTRUCTS_URL` | Override the registry URL | `https://api.constructs.network/v1` |
| `LOA_CONSTRUCTS_API_KEY` | API key for authentication | (none) |

**For soft launch**, set:
```bash
export LOA_CONSTRUCTS_URL="https://api.constructs.network/v1"
```

## Configuration Storage

The plugin stores configuration in `~/.loa-constructs/`:

```
~/.loa-constructs/
├── config.json       # Registry URLs, cache settings
├── credentials.json  # Auth tokens (per registry)
└── cache/            # Downloaded skills/packs
```

### Default Config

```json
{
  "registries": [{
    "name": "default",
    "url": "https://api.constructs.network/v1",
    "default": true
  }],
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

## API Reference

### Authentication

```typescript
// Login with email/password
POST /v1/auth/login
Body: { email: string, password: string }
Response: { data: { access_token, refresh_token, expires_in } }

// Refresh token
POST /v1/auth/refresh
Body: { refresh_token: string }
Response: { data: { access_token, refresh_token, expires_in } }

// Get current user
GET /v1/users/me
Headers: Authorization: Bearer <token>
Response: { data: { id, email, name, effective_tier, subscription } }
```

### Skills (Public)

```typescript
// List skills
GET /v1/skills?q=<query>&category=<cat>&page=<n>&per_page=<n>
Response: { skills: [...], pagination: {...} }

// Get skill details
GET /v1/skills/:slug
Response: { data: { id, name, slug, description, tier_required, ... } }

// Download skill (requires auth + tier)
GET /v1/skills/:slug/download
Headers: Authorization: Bearer <token>
Response: { data: { files: [...], license: {...} } }
```

### Packs (Public listing, auth for download)

```typescript
// List packs
GET /v1/packs?q=<query>&featured=<bool>&page=<n>&per_page=<n>
Response: { data: [...], pagination: {...} }

// Get pack details
GET /v1/packs/:slug
Response: { data: { id, name, slug, tier_required, skills, commands, ... } }

// Download pack (requires auth + tier)
GET /v1/packs/:slug/download
Headers: Authorization: Bearer <token>
Response: { data: { manifest, files: [...], license: {...} } }
```

## TypeScript Types

### Core Types

```typescript
type SubscriptionTier = 'free' | 'pro' | 'team' | 'enterprise';

interface SkillSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  tier_required: SubscriptionTier;
  downloads: number;
  rating: number | null;
  tags: string[];
  latest_version: string;
}

interface PackSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tier_required: SubscriptionTier;
  downloads: number;
  is_featured: boolean;
}

interface PackDownload {
  manifest: PackManifest;
  files: Array<{
    path: string;
    content: string;
    type: 'skill' | 'command' | 'resource';
  }>;
  license: {
    token: string;
    expires_at: string;
    tier: SubscriptionTier;
  };
}
```

### Command Interface

```typescript
interface Command {
  name: string;
  description: string;
  args?: Record<string, {
    type: 'string' | 'boolean';
    required?: boolean;
    description?: string;
  }>;
  execute: (context: CommandContext) => Promise<void>;
}

interface CommandContext {
  args: Record<string, string | boolean | undefined>;
  cwd: string;
}

interface LoaPlugin {
  name: string;
  version: string;
  description: string;
  commands: Command[];
}
```

## Integration Example

```typescript
// In loa framework's plugin loader

import { registryPlugin, getClient, isAuthenticated } from '@loa-constructs/cli';

// Check if user is authenticated
if (!isAuthenticated()) {
  console.log('Run /skill-login to authenticate with Loa Constructs');
}

// Register plugin commands
for (const cmd of registryPlugin.commands) {
  framework.registerCommand({
    name: cmd.name,
    description: cmd.description,
    handler: async (args) => {
      await cmd.execute({ args, cwd: process.cwd() });
    }
  });
}

// Or use the client directly for custom integration
const client = await getClient();
const packs = await client.listPacks({ featured: true });
console.log('Featured packs:', packs.data);
```

## License Validation Hook

For runtime license validation before loading skills:

```typescript
import { skillBeforeLoadHook } from '@loa-constructs/cli';

// Register as a before-load hook
framework.onBeforeLoadSkill(async (skillSlug) => {
  const result = await skillBeforeLoadHook(skillSlug);
  if (!result.valid) {
    throw new Error(`License invalid: ${result.reason}`);
  }
});
```

## Error Handling

```typescript
import { RegistryError } from '@loa-constructs/cli';

try {
  const pack = await client.downloadPack('gtm-collective');
} catch (error) {
  if (error instanceof RegistryError) {
    if (error.isTierRequired()) {
      console.log('Upgrade required:', error.details?.required_tier);
    } else if (error.isAuthError()) {
      console.log('Please run /skill-login');
    } else if (error.isNotFound()) {
      console.log('Pack not found');
    }
  }
}
```

## Available Pack: GTM Collective

The GTM Collective pack is live and available for Pro+ subscribers:

```bash
# Verify it's accessible
curl https://api.constructs.network/v1/packs/gtm-collective
```

Contains:
- **8 skills**: positioning, messaging, launch planning, etc.
- **14 commands**: `/gtm-*` commands for go-to-market workflows

## Testing the Integration

```bash
# 1. Test API connectivity
curl https://api.constructs.network/v1/health
# Expected: {"status":"healthy",...}

# 2. List packs (public)
curl https://api.constructs.network/v1/packs
# Expected: {"data":[{"name":"GTM Collective",...}],...}

# 3. Test authenticated endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.constructs.network/v1/users/me
# Expected: {"data":{"id":"...","email":"...","effective_tier":"pro"}}
```

## Shell Integration Reference

For the loa framework's bash-based integration (`.claude/scripts/registry-lib.sh`):

### Environment Variables (Shell)

| Variable | Description | Default |
|----------|-------------|---------|
| `LOA_REGISTRY_URL` | Registry API URL | `https://api.loaskills.dev/v1` (update to production!) |
| `LOA_REGISTRY_API_KEY` | API key for authentication | (none) |
| `LOA_REGISTRY_DEBUG` | Enable debug logging | `false` |

### Config File Location

The shell integration stores config in:
- `.loa.config.yaml` (project-level)
- `~/.loa/config.yaml` (user-level)
- `~/.loa/cache/` (cached skills/packs)
- `.claude/registry/.registry-meta.json` (installed skills/packs tracking)

### API Endpoint Mapping

| Shell Function | API Endpoint | Auth Required |
|----------------|--------------|---------------|
| `registry_health_check` | `GET /health` | No |
| `registry_list_skills` | `GET /skills` | No |
| `registry_get_skill` | `GET /skills/:slug` | No |
| `registry_download_skill` | `GET /skills/:slug/download` | Yes |
| `registry_list_packs` | `GET /packs` | No |
| `registry_get_pack` | `GET /packs/:slug` | No |
| `registry_download_pack` | `GET /packs/:slug/download` | Yes |
| `registry_login` | `POST /auth/login` | No (creates token) |
| `registry_refresh_token` | `POST /auth/refresh` | No (uses refresh token) |
| `registry_get_user` | `GET /users/me` | Yes |

### Example Shell Functions

```bash
# Get registry URL (respects env var override)
get_registry_url() {
    local config_url
    config_url=$(yq -r '.registry.default_url // "https://api.constructs.network/v1"' .loa.config.yaml 2>/dev/null)
    echo "${LOA_REGISTRY_URL:-$config_url}"
}

# Check API health
registry_health_check() {
    local url
    url="$(get_registry_url)/health"
    curl -sf "$url" | jq -e '.status == "healthy"' > /dev/null
}

# List packs (public)
registry_list_packs() {
    local url
    url="$(get_registry_url)/packs"
    curl -sf "$url" | jq '.data'
}

# Download pack (requires auth)
registry_download_pack() {
    local slug="$1"
    local token="$2"
    local url
    url="$(get_registry_url)/packs/${slug}/download"
    curl -sf -H "Authorization: Bearer ${token}" "$url" | jq '.data'
}
```

### Response Format

All API responses follow this structure:

```json
// Success
{
  "data": { ... },
  "pagination": { "page": 1, "per_page": 20, "total": 100, "total_pages": 5 }
}

// Error
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `TIER_UPGRADE_REQUIRED` | 403 | Subscription tier too low |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `VALIDATION_ERROR` | 400 | Invalid request data |

## Support

- **Repository**: https://github.com/0xHoneyJar/loa-constructs
- **Issues**: https://github.com/0xHoneyJar/loa-constructs/issues

---

*Last updated: 2026-01-02*
*API Version: v1*
*Plugin Version: 0.3.0*

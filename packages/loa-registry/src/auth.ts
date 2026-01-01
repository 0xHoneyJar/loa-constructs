/**
 * Authentication & Credential Management
 * @see sprint.md T7.3: Credential Storage
 */

import Conf from 'conf';
import { homedir } from 'os';
import path from 'path';
import type { PluginConfig, Credentials, CredentialsStore, RegistryConfig } from './types.js';
import { RegistryClient, DEFAULT_REGISTRY_URL } from './client.js';

/**
 * Configuration store using conf
 * Stores config in ~/.loa-constructs/config.json
 */
const configStore = new Conf<PluginConfig>({
  projectName: 'loa-constructs',
  cwd: path.join(homedir(), '.loa-constructs'),
  defaults: {
    registries: [
      {
        name: 'default',
        url: DEFAULT_REGISTRY_URL,
        default: true,
      },
    ],
    cache: {
      enabled: true,
      ttl: 86400, // 24 hours
      maxSize: '500MB',
    },
    autoUpdate: {
      enabled: true,
      checkInterval: 86400, // 24 hours
    },
  },
});

/**
 * Credentials store
 * Stores credentials in ~/.loa-constructs/credentials.json
 */
const credentialsStore = new Conf<CredentialsStore>({
  projectName: 'loa-constructs-credentials',
  cwd: path.join(homedir(), '.loa-constructs'),
  defaults: {},
});

/**
 * Get the URL for a named registry
 */
export function getRegistryUrl(registryName: string = 'default'): string {
  // Check environment variable override
  const envUrl = process.env.LOA_CONSTRUCTS_URL;
  if (envUrl && registryName === 'default') {
    return envUrl;
  }

  const registries = configStore.get('registries');
  const registry = registries.find((r) => r.name === registryName);

  if (!registry) {
    throw new Error(`Registry "${registryName}" not found. Available: ${registries.map((r) => r.name).join(', ')}`);
  }

  return registry.url;
}

/**
 * Get credentials for a registry
 */
export function getCredentials(registryName: string = 'default'): Credentials | null {
  // Check environment variable for API key
  const envApiKey = process.env.LOA_CONSTRUCTS_API_KEY;
  if (envApiKey && registryName === 'default') {
    return {
      type: 'api_key',
      key: envApiKey,
      userId: 'env',
      tier: 'free', // Will be updated on first API call
      expiresAt: null,
    };
  }

  return credentialsStore.get(registryName) || null;
}

/**
 * Save credentials for a registry
 */
export function saveCredentials(registryName: string, credentials: Credentials): void {
  credentialsStore.set(registryName, credentials);
}

/**
 * Remove credentials for a registry
 */
export function removeCredentials(registryName: string = 'default'): void {
  const store = credentialsStore.store;
  delete store[registryName];
  credentialsStore.store = store;
}

/**
 * Check if user is authenticated for a registry
 */
export function isAuthenticated(registryName: string = 'default'): boolean {
  const creds = getCredentials(registryName);
  if (!creds) return false;

  // Check if OAuth credentials are expired
  if (creds.type === 'oauth') {
    const expiresAt = new Date(creds.expiresAt);
    if (expiresAt < new Date()) {
      return false;
    }
  }

  return true;
}

/**
 * Get an authenticated client for a registry
 * Handles token refresh for OAuth credentials
 */
export async function getClient(registryName: string = 'default'): Promise<RegistryClient> {
  const creds = getCredentials(registryName);
  const url = getRegistryUrl(registryName);

  if (!creds) {
    throw new Error(
      `Not authenticated with registry "${registryName}". Run /skill-login first.`
    );
  }

  // For API key auth, just return client
  if (creds.type === 'api_key') {
    return new RegistryClient({
      url,
      apiKey: creds.key,
    });
  }

  // For OAuth, check if token needs refresh
  const expiresAt = new Date(creds.expiresAt);
  const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

  if (expiresAt.getTime() - bufferMs < Date.now()) {
    // Token expired or expiring soon, refresh it
    try {
      const tempClient = new RegistryClient({ url });
      const tokens = await tempClient.refreshToken(creds.refreshToken);

      // Update stored credentials
      const newCreds: Credentials = {
        ...creds,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      };
      saveCredentials(registryName, newCreds);

      return new RegistryClient({
        url,
        accessToken: tokens.access_token,
      });
    } catch (error) {
      // Refresh failed, remove credentials
      removeCredentials(registryName);
      throw new Error(
        `Session expired. Please run /skill-login again.`
      );
    }
  }

  return new RegistryClient({
    url,
    accessToken: creds.accessToken,
  });
}

/**
 * Add a new registry
 */
export function addRegistry(registry: RegistryConfig): void {
  const registries = configStore.get('registries');

  // Check if registry with same name exists
  const existingIndex = registries.findIndex((r) => r.name === registry.name);
  if (existingIndex >= 0) {
    registries[existingIndex] = registry;
  } else {
    registries.push(registry);
  }

  // If this is the new default, unset other defaults
  if (registry.default) {
    registries.forEach((r) => {
      if (r.name !== registry.name) {
        r.default = false;
      }
    });
  }

  configStore.set('registries', registries);
}

/**
 * Get list of configured registries
 */
export function getRegistries(): RegistryConfig[] {
  return configStore.get('registries');
}

/**
 * Get the default registry name
 */
export function getDefaultRegistry(): string {
  const registries = configStore.get('registries');
  const defaultReg = registries.find((r) => r.default);
  return defaultReg?.name || 'default';
}

/**
 * Get config store path (for debugging)
 */
export function getConfigPath(): string {
  return path.join(homedir(), '.loa-constructs');
}

/**
 * Tier comparison helper
 */
const TIER_ORDER = { free: 0, pro: 1, team: 2, enterprise: 3 } as const;

export function canAccessTier(userTier: string, requiredTier: string): boolean {
  const userLevel = TIER_ORDER[userTier as keyof typeof TIER_ORDER] ?? 0;
  const requiredLevel = TIER_ORDER[requiredTier as keyof typeof TIER_ORDER] ?? 0;
  return userLevel >= requiredLevel;
}

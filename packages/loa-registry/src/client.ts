/**
 * Registry API Client
 * @see sprint.md T7.2: API Client
 */

import type { SkillDownload, PackDownload } from '@loa-registry/shared';
import type {
  RegistryClientConfig,
  SkillListOptions,
  SkillListResponse,
  SkillDetail,
  UserResponse,
  LicenseValidation,
  SkillInstallRecord,
  PackListResponse,
  PackDetail,
} from './types.js';

/**
 * Custom error class for registry API errors
 */
export class RegistryError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RegistryError';
  }

  /**
   * Check if this is a tier upgrade required error
   */
  isTierRequired(): boolean {
    return this.code === 'TIER_UPGRADE_REQUIRED';
  }

  /**
   * Check if this is an authentication error
   */
  isAuthError(): boolean {
    return this.code === 'UNAUTHORIZED' || this.code === 'INVALID_TOKEN';
  }

  /**
   * Check if this is a not found error
   */
  isNotFound(): boolean {
    return this.code === 'NOT_FOUND' || this.code === 'SKILL_NOT_FOUND';
  }
}

/**
 * Registry API Client
 * Handles all communication with the Skills Registry API
 */
export class RegistryClient {
  private config: RegistryClientConfig;
  private baseUrl: string;

  constructor(config: RegistryClientConfig) {
    this.config = config;
    this.baseUrl = config.url.replace(/\/$/, '');
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      query?: Record<string, string>;
    }
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (options?.query) {
      Object.entries(options.query).forEach(([k, v]) => {
        if (v !== undefined && v !== '') {
          url.searchParams.set(k, v);
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'loa-registry-cli/0.1.0',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    } else if (this.config.accessToken) {
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json() as { data?: T; error?: { code: string; message: string; details?: Record<string, unknown> } };

    if (!response.ok) {
      const errorData = data.error || { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' };
      throw new RegistryError(
        errorData.code,
        errorData.message,
        response.status,
        errorData.details
      );
    }

    return data.data as T;
  }

  // ========================================================================
  // Authentication
  // ========================================================================

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    return this.request<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>('POST', '/auth/login', {
      body: { email, password },
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    return this.request<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>('POST', '/auth/refresh', {
      body: { refresh_token: refreshToken },
    });
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<UserResponse> {
    return this.request<UserResponse>('GET', '/users/me');
  }

  // ========================================================================
  // Skills
  // ========================================================================

  /**
   * List skills with optional filtering
   */
  async listSkills(options?: SkillListOptions): Promise<SkillListResponse> {
    const query: Record<string, string> = {};
    if (options?.query) query.q = options.query;
    if (options?.category) query.category = options.category;
    if (options?.tier) query.tier = options.tier;
    if (options?.page) query.page = String(options.page);
    if (options?.perPage) query.per_page = String(options.perPage);

    return this.request<SkillListResponse>('GET', '/skills', { query });
  }

  /**
   * Get detailed information about a skill
   */
  async getSkill(slug: string): Promise<SkillDetail> {
    return this.request<SkillDetail>('GET', `/skills/${encodeURIComponent(slug)}`);
  }

  /**
   * Download skill files with license
   */
  async downloadSkill(slug: string, version?: string): Promise<SkillDownload> {
    const query: Record<string, string> = {};
    if (version) query.version = version;

    return this.request<SkillDownload>('GET', `/skills/${encodeURIComponent(slug)}/download`, {
      query,
    });
  }

  /**
   * Validate a skill license
   */
  async validateLicense(slug: string): Promise<LicenseValidation> {
    return this.request<LicenseValidation>('GET', `/skills/${encodeURIComponent(slug)}/validate`);
  }

  // ========================================================================
  // Installs
  // ========================================================================

  /**
   * List user's installed skills
   */
  async listInstalls(): Promise<{ data: SkillInstallRecord[] }> {
    return this.request<{ data: SkillInstallRecord[] }>('GET', '/installs');
  }

  /**
   * Record a skill installation
   */
  async recordInstall(slug: string, version: string): Promise<SkillInstallRecord> {
    return this.request<SkillInstallRecord>('PUT', `/installs/${encodeURIComponent(slug)}`, {
      body: { version },
    });
  }

  /**
   * Record a skill uninstallation
   */
  async recordUninstall(slug: string): Promise<void> {
    await this.request<void>('DELETE', `/installs/${encodeURIComponent(slug)}`);
  }

  // ========================================================================
  // Packs
  // ========================================================================

  /**
   * List packs with optional filtering
   */
  async listPacks(options?: {
    query?: string;
    tag?: string;
    featured?: boolean;
    page?: number;
    perPage?: number;
  }): Promise<PackListResponse> {
    const query: Record<string, string> = {};
    if (options?.query) query.q = options.query;
    if (options?.tag) query.tag = options.tag;
    if (options?.featured !== undefined) query.featured = String(options.featured);
    if (options?.page) query.page = String(options.page);
    if (options?.perPage) query.per_page = String(options.perPage);

    return this.request<PackListResponse>('GET', '/packs', { query });
  }

  /**
   * Get detailed information about a pack
   */
  async getPack(slug: string): Promise<PackDetail> {
    return this.request<PackDetail>('GET', `/packs/${encodeURIComponent(slug)}`);
  }

  /**
   * Download pack files with license
   */
  async downloadPack(slug: string, version?: string): Promise<PackDownload> {
    const query: Record<string, string> = {};
    if (version) query.version = version;

    return this.request<PackDownload>('GET', `/packs/${encodeURIComponent(slug)}/download`, {
      query,
    });
  }

  /**
   * Get pack versions
   */
  async getPackVersions(slug: string): Promise<Array<{
    id: string;
    version: string;
    changelog?: string;
    is_latest: boolean;
    file_count: number;
    total_size_bytes: number;
    published_at?: string;
  }>> {
    return this.request('GET', `/packs/${encodeURIComponent(slug)}/versions`);
  }
}

/**
 * Default registry URL
 */
export const DEFAULT_REGISTRY_URL = 'https://api.loaskills.dev/v1';

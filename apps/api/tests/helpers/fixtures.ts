/**
 * Shared Test Fixtures — DB Row Factories
 *
 * Factory functions that produce realistic database rows
 * matching the Drizzle schema (camelCase column names).
 * All accept optional overrides.
 */

// --- Types ---

export interface UserRow {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
  githubOrgMember: boolean;
  walletAddress: string | null;
  githubUserId: string | null;
  githubOrgCheckedAt: Date | null;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PackRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string | null;
  status: string;
  visibility: string;
  maturity: string;
  icon: string | null;
  authorId: string;
  featured: boolean;
  repositoryUrl: string | null;
  homepageUrl: string | null;
  documentationUrl: string | null;
  searchKeywords: string[];
  searchUseCases: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface SkillRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  isPublic: boolean;
  isDeprecated: boolean;
  category: string;
  ownerId: string;
  ownerType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VersionRow {
  id: string;
  packId: string;
  version: string;
  changelog: string | null;
  publishedAt: Date;
  createdAt: Date;
}

export interface SubscriptionRow {
  id: string;
  userId: string | null;
  teamId: string | null;
  tier: string;
  status: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  seats: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyRow {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  revoked: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// --- Factories ---

export function createMockUser(overrides?: Partial<UserRow>): UserRow {
  return {
    id: 'user-test-1',
    email: 'test@constructs.network',
    name: 'Test User',
    passwordHash: '$2b$12$LJ3m4ys3Lk/8O3K9k.Ype.k0Nh7TzVcHsT0q5Y5O5Y5O5Y5O5Y5O', // bcrypt hash placeholder
    emailVerified: true,
    isAdmin: false,
    githubOrgMember: false,
    walletAddress: null,
    githubUserId: null,
    githubOrgCheckedAt: null,
    stripeCustomerId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockPack(overrides?: Partial<PackRow>): PackRow {
  return {
    id: 'pack-test-1',
    name: 'Test Pack',
    slug: 'test-pack',
    description: 'A test construct pack',
    longDescription: null,
    status: 'published',
    visibility: 'public',
    maturity: 'stable',
    icon: 'box',
    authorId: 'user-test-1',
    featured: false,
    repositoryUrl: null,
    homepageUrl: null,
    documentationUrl: null,
    searchKeywords: ['test'],
    searchUseCases: ['testing'],
    createdAt: new Date('2026-01-15T00:00:00Z'),
    updatedAt: new Date('2026-01-20T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

export function createMockSkill(overrides?: Partial<SkillRow>): SkillRow {
  return {
    id: 'skill-test-1',
    name: 'Test Skill',
    slug: 'test-skill',
    description: 'A test skill',
    isPublic: true,
    isDeprecated: false,
    category: 'development',
    ownerId: 'user-test-1',
    ownerType: 'user',
    createdAt: new Date('2026-01-15T00:00:00Z'),
    updatedAt: new Date('2026-01-20T00:00:00Z'),
    ...overrides,
  };
}

export function createMockVersion(overrides?: Partial<VersionRow>): VersionRow {
  return {
    id: 'version-test-1',
    packId: 'pack-test-1',
    version: '1.0.0',
    changelog: null,
    publishedAt: new Date('2026-01-15T00:00:00Z'),
    createdAt: new Date('2026-01-15T00:00:00Z'),
    ...overrides,
  };
}

export function createMockSubscription(overrides?: Partial<SubscriptionRow>): SubscriptionRow {
  return {
    id: 'sub-test-1',
    userId: 'user-test-1',
    teamId: null,
    tier: 'free',
    status: 'active',
    stripeSubscriptionId: null,
    stripePriceId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    seats: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function createMockApiKey(overrides?: Partial<ApiKeyRow>): ApiKeyRow {
  return {
    id: 'key-test-1',
    userId: 'user-test-1',
    name: 'Test API Key',
    keyPrefix: 'sk_test_1234',
    keyHash: '$2b$12$LJ3m4ys3Lk/8O3K9k.Ype.k0Nh7TzVcHsT0q5Y5O5Y5O5Y5O5Y5O',
    revoked: false,
    expiresAt: null,
    lastUsedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

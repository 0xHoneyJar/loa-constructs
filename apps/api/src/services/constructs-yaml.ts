/**
 * Yaml-source construct read path (T-1.11e · cycle constructs-network-migration).
 *
 * Bridges the registry-loader (apps/api/src/lib/registry-loader.ts) into
 * the existing /v1/constructs API surface. Per ADR-002 + T-1.9 audit, the
 * Postgres `packs`/`skills` tables are deprecated for 30 days; reads switch
 * here, writes-paths (publish/submissions) get 410-Gone in a separate batch.
 *
 * Scope of this module:
 *   - listConstructsFromRegistry(opts) — paginated list with filtering
 *   - getConstructBySlugFromRegistry(slug) — single-entry detail
 *
 * Out of scope (per T-1.9, deferred to follow-on cycle):
 *   - Admin dashboards (services/constructs.ts:1057+ for skills count etc.)
 *   - Publish flow (services/packs.ts createPack/updatePack)
 *   - Analytics joins (services/analytics.ts)
 *   - Submissions (services/submissions.ts)
 *
 * Field mapping registry.yaml → Construct response shape:
 *   git_url     → repositoryUrl + gitUrl
 *   description → description (and shortDescription, truncated)
 *   category    → category
 *   author      → owner.name (type: 'team')
 *   slug        → id, name, slug
 *
 * Fields registry.yaml doesn't carry — sensible defaults:
 *   icon/logo*: null   (not in registry; come from per-construct manifests later)
 *   downloads/rating/isFeatured/forkCount: 0 / null / false / 0
 *   maturity: 'stable' (curated registry entries are by-definition production)
 *   tierRequired: 'free' (all listed entries are public)
 *   visibility: 'public'
 *   verificationTier: 'curated'
 *   constructType: 'skill-pack'
 *   manifest, identity, latestVersion, etc.: null
 */
import { getRegistryLoader } from '../lib/registry-loader.js';
import type { RegistryEntry, RegistryLoader } from '../lib/registry-loader.js';
import type {
  Construct,
  ListConstructsOptions,
  ListConstructsResult,
  MaturityLevel,
} from './constructs.js';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Map a single registry entry to the existing Construct response shape.
 * Defaults are documented above.
 */
export function mapRegistryEntryToConstruct(entry: RegistryEntry): Construct {
  // Truncate description for shortDescription (existing UI expectation).
  const shortDescription =
    entry.description.length > 80
      ? entry.description.slice(0, 77) + '...'
      : entry.description;

  // Stable epoch placeholder for createdAt/updatedAt — UI generally doesn't
  // sort/filter by these fields for registry-sourced entries; clients that
  // need real timestamps must read from the construct's manifest after install.
  const epoch = new Date(0);

  return {
    id: entry.slug,
    type: 'pack',
    name: entry.slug,
    slug: entry.slug,
    icon: null,
    logoMark: null,
    logoWordmark: null,
    logoKnockout: null,
    description: entry.description,
    shortDescription,
    longDescription: null,
    version: null,
    tierRequired: 'free',
    category: entry.category,
    downloads: 0,
    rating: null,
    isFeatured: false,
    manifest: null,
    owner: { name: entry.author, type: 'team', avatarUrl: null },
    repositoryUrl: entry.git_url,
    homepageUrl: null,
    documentationUrl: null,
    latestVersion: null,
    maturity: 'stable' as MaturityLevel,
    graduatedAt: null,
    sourceType: 'git',
    gitUrl: entry.git_url,
    hasIdentity: false,
    identity: null,
    constructType: 'skill-pack',
    verificationTier: 'curated',
    verifiedAt: null,
    visibility: 'public',
    forkedFrom: null,
    forkCount: 0,
    skillProse: null,
    createdAt: epoch,
    updatedAt: epoch,
  };
}

/**
 * Yaml-source list with filter + pagination. Mirrors the existing
 * services/constructs.ts:listConstructs() shape so route handlers don't
 * have to learn a second contract.
 *
 * `loaderOverride` is for tests; production paths read the singleton.
 */
export async function listConstructsFromRegistry(
  opts: ListConstructsOptions = {},
  loaderOverride?: RegistryLoader,
): Promise<ListConstructsResult> {
  const loader = loaderOverride ?? getRegistryLoader();
  let state;
  try {
    state = loader.getRegistry();
  } catch {
    // Loader not booted — return empty rather than throw, so the API can
    // serve a graceful "data not yet ready" response while the boot races
    // the first request. boot() runs at startup but a cold container may
    // race the very first request. Page/limit pass through so caller's
    // pagination state is preserved across the empty window.
    return {
      constructs: [],
      total: 0,
      page: Math.max(1, opts.page ?? 1),
      limit: Math.min(MAX_PAGE_SIZE, Math.max(1, opts.limit ?? DEFAULT_PAGE_SIZE)),
      totalPages: 0,
    };
  }

  let entries = Array.from(state.entries.values());

  // Filtering — only the dimensions registry.yaml carries.
  if (opts.category) {
    const cat = opts.category.toLowerCase();
    entries = entries.filter((e) => e.category.toLowerCase() === cat);
  }
  if (opts.tier) {
    // All registry entries are 'free'. Filter to free-only when tier=free,
    // otherwise empty (no paid tier in yaml-source).
    if (opts.tier !== 'free') entries = [];
  }
  if (opts.query) {
    const q = opts.query.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.slug.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.author.toLowerCase().includes(q),
    );
  }
  // type/featured/domain/maturity filters: registry.yaml doesn't carry
  // these dimensions today. type=pack matches all (default); other type
  // values produce empty.
  if (opts.type && opts.type !== 'pack' && opts.type !== 'skill-pack') {
    entries = [];
  }
  if (opts.featured) {
    // No featured flag in yaml-source; honor the filter by returning empty.
    entries = [];
  }

  // Stable ordering — alphabetical by slug. The Postgres-backed listing
  // had a richer ordering (downloads desc, then name); without those
  // signals from yaml, alphabetical is the least-surprising default.
  entries.sort((a, b) => a.slug.localeCompare(b.slug));

  // Pagination
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, opts.limit ?? DEFAULT_PAGE_SIZE));
  const total = entries.length;
  const offset = (page - 1) * limit;
  const paged = entries.slice(offset, offset + limit);

  return {
    constructs: paged.map(mapRegistryEntryToConstruct),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Yaml-source slug lookup. Returns null if the slug isn't in the registry
 * (matching the existing services/constructs.ts:getConstructBySlug() contract).
 *
 * `loaderOverride` is for tests; production paths read the singleton.
 */
export async function getConstructBySlugFromRegistry(
  slug: string,
  loaderOverride?: RegistryLoader,
): Promise<Construct | null> {
  const loader = loaderOverride ?? getRegistryLoader();
  let entry: RegistryEntry | undefined;
  try {
    entry = loader.getEntry(slug);
  } catch {
    return null;
  }
  if (!entry) return null;
  return mapRegistryEntryToConstruct(entry);
}

import type { ConstructArchetype, ConstructDetail, ConstructNode, GraduationLevel, GraphData, CategoryStats, Category, Showcase, AccuracyReport, EdgeRelationship } from '@/lib/types/graph';
import { fetchCategories, normalizeCategory } from './fetch-categories';
import { resolveShortDescription } from '@/lib/utils/resolve-short-description';

/** API response shape for a single construct */
interface APIConstruct {
  id: string;
  slug: string;
  name: string;
  type: 'skill' | 'pack' | 'bundle';
  description: string | null;
  short_description: string | null;
  category: string | null;
  version: string | null;
  downloads: number;
  tier_required: string;
  is_featured: boolean;
  icon?: string | null;
  logo_mark?: string | null;
  logo_wordmark?: string | null;
  logo_knockout?: string | null;
  skills_count?: number;
  maturity?: string;
  source_type?: string | null;
  git_url?: string | null;
  rating?: number | null;
  long_description?: string | null;
  owner?: {
    name: string;
    type: 'user' | 'team';
    avatar_url: string | null;
  } | null;
  has_identity?: boolean;
  repository_url?: string | null;
  homepage_url?: string | null;
  documentation_url?: string | null;
  identity?: {
    cognitive_frame?: Record<string, unknown>;
    expertise_domains?: Array<string | { name: string }>;
    voice_config?: Record<string, unknown>;
    model_preferences?: Record<string, unknown>;
  } | null;
  construct_type?: string;
  verification_tier?: string;
  verified_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  forked_from?: { slug: string; name: string } | null;
  fork_count?: number;
  skill_prose?: string | null;
  // Composability fields (cycle-051)
  composition_paths?: { writes?: string[]; reads?: string[] } | null;
  governs?: string[] | null;
  governed_by?: string[] | null;
  manifest?: {
    commands?: Array<{ name: string; description: string; usage?: string }>;
    skills?: Array<{ slug: string; name?: string; path?: string; description?: string } | null>;
    composes_with?: string[];
    dependencies?: string[];
    pack_dependencies?: Record<string, unknown>;
    composition_paths?: { writes?: string[]; reads?: string[] };
    governs?: string[];
    governed_by?: string[];
  };
}

function parseGraduationLevel(level: string | undefined): GraduationLevel {
  const validLevels: GraduationLevel[] = ['experimental', 'beta', 'stable', 'deprecated'];
  if (level && validLevels.includes(level as GraduationLevel)) {
    return level as GraduationLevel;
  }
  return 'stable';
}

function parseConstructType(ct: string | undefined): ConstructArchetype {
  const valid: ConstructArchetype[] = ['skill-pack', 'tool-pack', 'codex', 'template'];
  if (ct && valid.includes(ct as ConstructArchetype)) {
    return ct as ConstructArchetype;
  }
  return 'skill-pack';
}

function transformToNode(construct: APIConstruct): ConstructNode {
  const commands = construct.manifest?.commands || [];
  const shortDesc = resolveShortDescription(construct.short_description, construct.description);

  // Category now comes from API (packs.category column, cycle-041)
  const category = normalizeCategory(construct.category || 'development');

  // Extract expertise domains from identity (cycle-048: discovery enrichment)
  const domains = construct.identity?.expertise_domains
    ?.map((d: string | { name: string }) => typeof d === 'string' ? d : d.name)
    .filter(Boolean) as string[] | undefined;

  // Extract composes_with from manifest (cycle-048: composition degree)
  const composesWith = construct.manifest?.composes_with || construct.manifest?.dependencies || [];

  // Extract skill slugs for Fuse.js search (cycle-048)
  const skillSlugs = (construct.manifest?.skills || [])
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .map(s => s.slug);

  return {
    id: construct.id,
    slug: construct.slug,
    name: construct.name,
    type: construct.type,
    constructType: parseConstructType(construct.construct_type),
    category,
    graduationLevel: parseGraduationLevel(construct.maturity),
    description: construct.description || 'No description available',
    shortDescription: shortDesc,
    commandCount: commands.length || (construct.type === 'skill' ? 1 : 0),
    skillsCount: construct.skills_count ?? (construct.manifest?.skills?.length || 0),
    downloads: construct.downloads,
    version: construct.version || '1.0.0',
    icon: construct.icon ?? null,
    logoMark: construct.logo_mark ?? null,
    logoWordmark: construct.logo_wordmark ?? null,
    logoKnockout: construct.logo_knockout ?? null,
    rating: construct.rating ?? null,
    hasIdentity: construct.has_identity ?? false,
    verificationTier: construct.verification_tier ?? 'UNVERIFIED',
    createdAt: construct.created_at ?? null,
    updatedAt: construct.updated_at ?? null,
    domains: domains && domains.length > 0 ? domains : undefined,
    composesWith: composesWith.length > 0 ? composesWith : undefined,
    skillSlugs: skillSlugs.length > 0 ? skillSlugs : undefined,
  };
}

const API_BASE = process.env.CONSTRUCTS_API_URL || 'https://api.constructs.network/v1';
const FETCH_TIMEOUT_MS = 15_000;

/** Fetch with an AbortController timeout to prevent hung requests during build */
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface APIResponse {
  data: APIConstruct[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

function isSafeUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function transformToDetail(construct: APIConstruct): ConstructDetail {
  const node = transformToNode(construct);
  const commands = construct.manifest?.commands || [];
  const rawSkills = construct.manifest?.skills || [];
  const composesWith = construct.manifest?.composes_with || construct.manifest?.dependencies || [];

  // Filter out null skills and transform
  const skills = rawSkills
    .filter((skill): skill is NonNullable<typeof skill> => skill !== null)
    .map((skill) => ({
      slug: skill.slug,
      // Use name if available, otherwise derive from slug
      name: skill.name || skill.slug.split('/').pop()?.replace(/-/g, ' ') || skill.slug,
      description: skill.description || '',
    }));

  return {
    ...node,
    commands: commands.map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
      usage: cmd.usage,
    })),
    skills,
    composesWith,
    installCommand: `/constructs install ${construct.slug}`,
    sourceType: construct.source_type,
    gitUrl: construct.git_url,
    longDescription: construct.long_description ?? null,
    owner: construct.owner ? {
      name: construct.owner.name,
      type: construct.owner.type,
      avatarUrl: construct.owner.avatar_url ?? null,
    } : null,
    hasIdentity: construct.has_identity ?? false,
    identity: construct.identity
      ? {
          cognitiveFrame: construct.identity.cognitive_frame,
          expertiseDomains: construct.identity.expertise_domains?.map(
            (d: string | { name: string }) => typeof d === 'string' ? d : d.name
          ),
          voiceConfig: construct.identity.voice_config,
          modelPreferences: construct.identity.model_preferences,
        }
      : null,
    verificationTier: construct.verification_tier ?? 'UNVERIFIED',
    verifiedAt: construct.verified_at ?? null,
    repositoryUrl: isSafeUrl(construct.repository_url) ? construct.repository_url : null,
    homepageUrl: isSafeUrl(construct.homepage_url) ? construct.homepage_url : null,
    documentationUrl: isSafeUrl(construct.documentation_url) ? construct.documentation_url : null,
    // Fork provenance (cycle-035)
    forkedFrom: construct.forked_from ?? null,
    forkCount: construct.fork_count ?? 0,
    // SKILL.md prose (cycle-035)
    skillProse: construct.skill_prose ?? null,
    // Populated by fetchConstruct via parallel API calls
    showcases: [],
    accuracy: null,
    // Composability (cycle-051)
    compositionPaths: construct.composition_paths ?? construct.manifest?.composition_paths ?? null,
    governs: construct.governs ?? construct.manifest?.governs ?? [],
    governedBy: construct.governed_by ?? construct.manifest?.governed_by ?? [],
    connectedVia: [], // Populated by computePathConnections
  };
}

/**
 * Internal: fetch all constructs with raw API data for edge computation.
 * Not exported — use fetchAllConstructs() for public consumers.
 */
async function fetchAllRaw(): Promise<{ nodes: ConstructNode[]; raw: APIConstruct[] }> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/constructs?per_page=100`, {
      next: { revalidate: 60 }, // Revalidate every minute while catalog is growing
    });

    if (!response.ok) {
      console.error(`Failed to fetch constructs: ${response.statusText}`);
      return { nodes: [], raw: [] };
    }

    const data: APIResponse = await response.json();
    return { nodes: data.data.map(transformToNode), raw: data.data };
  } catch (error) {
    console.error('Error fetching constructs:', error);
    return { nodes: [], raw: [] };
  }
}

/**
 * Fetch all constructs as typed ConstructNode[].
 * @returns Array of construct nodes for catalog/sitemap/SSG use.
 * @since cycle-034 — return type changed from raw array to { nodes } wrapper,
 *        then simplified back to ConstructNode[] to avoid leaking internal types.
 */
export async function fetchAllConstructs(): Promise<ConstructNode[]> {
  const { nodes } = await fetchAllRaw();
  return nodes;
}

export async function searchConstructs(query: string): Promise<ConstructNode[]> {
  try {
    const url = `${API_BASE}/constructs?q=${encodeURIComponent(query)}&per_page=50`;
    const response = await fetchWithTimeout(url, {
      next: { revalidate: 60 }, // Short cache for search results
    });

    if (!response.ok) {
      console.error(`Search failed: ${response.statusText}`);
      return [];
    }

    const data: APIResponse = await response.json();
    return data.data.map(transformToNode);
  } catch (error) {
    console.error('Error searching constructs:', error);
    return [];
  }
}

export async function fetchConstruct(slug: string): Promise<ConstructDetail | null> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/constructs/${slug}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch construct: ${response.statusText}`);
    }

    const json = await response.json();
    // API returns { data: construct } for single construct endpoint
    const construct: APIConstruct = json.data || json;
    const detail = transformToDetail(construct);

    // Fetch showcases, accuracy, and all constructs for path connections in parallel
    const [showcases, accuracy, { raw: allConstructs }] = await Promise.all([
      fetchShowcases(slug),
      fetchAccuracy(slug),
      fetchAllRaw(),
    ]);

    detail.showcases = showcases;
    detail.accuracy = accuracy;

    // Compute connectedVia from path connections (cycle-051)
    const pathConnections = computePathConnections(allConstructs);
    const connectedVia: Array<{ slug: string; path: string; direction: 'reads' | 'writes' }> = [];
    for (const conn of pathConnections) {
      if (conn.sourceSlug === slug) {
        // This construct writes, the target reads
        connectedVia.push({ slug: conn.targetSlug, path: conn.sharedPath, direction: 'writes' });
      } else if (conn.targetSlug === slug) {
        // This construct reads from the source
        connectedVia.push({ slug: conn.sourceSlug, path: conn.sharedPath, direction: 'reads' });
      }
    }
    detail.connectedVia = connectedVia;

    return detail;
  } catch (error) {
    console.error(`Error fetching construct ${slug}:`, error);
    return null;
  }
}

async function fetchShowcases(slug: string): Promise<Showcase[]> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/constructs/${slug}/showcases`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const json = await response.json();
    const items = json.data || [];
    return items.map((s: { id: string; title: string; url: string; description?: string | null }) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      description: s.description ?? null,
    }));
  } catch {
    return [];
  }
}

async function fetchAccuracy(slug: string): Promise<AccuracyReport | null> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/constructs/${slug}/signals/accuracy`, {
      next: { revalidate: 600 }, // 10min cache matching backend TTL
    });
    if (!response.ok) return null;
    const json = await response.json();
    const data = json.data ?? json;
    if (!data || !data.sufficientData) return null;
    return {
      sufficientData: data.sufficientData,
      sampleSize: data.sampleSize ?? 0,
      coverage: data.coverage ?? 0,
      weightedKappa: data.weightedKappa ?? 0,
      warnings: data.warnings ?? [],
    };
  } catch {
    return null;
  }
}

export async function fetchGraphData(): Promise<{ graphData: GraphData; categories: Category[] }> {
  // Fetch constructs and categories in parallel
  const [{ nodes, raw }, categories] = await Promise.all([
    fetchAllRaw(),
    fetchCategories(),
  ]);

  // Compute category statistics from actual nodes
  const categoryCounts = new Map<string, number>();
  for (const node of nodes) {
    categoryCounts.set(node.category, (categoryCounts.get(node.category) || 0) + 1);
  }

  // Build category stats from fetched categories
  const categoryStats: CategoryStats[] = categories.map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    label: cat.label,
    color: cat.color,
    count: categoryCounts.get(cat.slug) || 0,
  }));

  // Compute total commands
  const totalCommands = nodes.reduce((sum, node) => sum + node.commandCount, 0);

  // Compute edges from real manifest pack_dependencies and composes_with
  const edges = computeEdges(nodes, raw);

  return {
    graphData: {
      nodes,
      edges,
      categories: categoryStats,
      meta: {
        totalConstructs: nodes.length,
        totalCommands,
        generatedAt: new Date().toISOString(),
      },
    },
    categories,
  };
}

/** Path connection between two constructs via shared grimoire path */
interface PathConnection {
  sourceSlug: string;      // The writer
  targetSlug: string;      // The reader
  sharedPath: string;      // The grimoire path they share
}

/**
 * Cross-reference composition_paths.writes and reads across all constructs
 * to find implicit composition edges (cycle-051).
 */
export function computePathConnections(constructs: APIConstruct[]): PathConnection[] {
  const connections: PathConnection[] = [];

  // Build writer index: path -> [slugs that write to it]
  const writerIndex = new Map<string, string[]>();
  for (const c of constructs) {
    const writes = c.composition_paths?.writes ?? c.manifest?.composition_paths?.writes;
    if (!Array.isArray(writes)) continue;
    for (const path of writes) {
      if (!writerIndex.has(path)) writerIndex.set(path, []);
      writerIndex.get(path)!.push(c.slug);
    }
  }

  // For each reader, find matching writers
  const seen = new Set<string>();
  for (const c of constructs) {
    const reads = c.composition_paths?.reads ?? c.manifest?.composition_paths?.reads;
    if (!Array.isArray(reads)) continue;
    for (const path of reads) {
      const writers = writerIndex.get(path) || [];
      for (const writerSlug of writers) {
        if (writerSlug === c.slug) continue; // Skip self-references
        const key = `${writerSlug}>${c.slug}>${path}`;
        if (seen.has(key)) continue; // Deduplicate
        seen.add(key);
        connections.push({
          sourceSlug: writerSlug,
          targetSlug: c.slug,
          sharedPath: path,
        });
      }
    }
  }

  return connections;
}

function computeEdges(nodes: ConstructNode[], apiConstructs?: APIConstruct[]) {
  const edges: Array<{ id: string; source: string; target: string; relationship: EdgeRelationship }> = [];

  if (!apiConstructs) return edges;

  // Build slug->id lookup for edge resolution
  const slugToId = new Map<string, string>();
  for (const node of nodes) {
    slugToId.set(node.slug, node.id);
  }

  // Dedup set to prevent duplicate edges
  const edgeKeys = new Set<string>();

  for (const construct of apiConstructs) {
    const sourceId = slugToId.get(construct.slug);
    if (!sourceId) continue;

    if (construct.manifest) {
      // Extract pack_dependencies — handles all manifest variants:
      // [{slug}], {optional: [{slug}], required: [{slug}]}, or Record<string, unknown>
      const deps = construct.manifest.pack_dependencies;
      if (deps) {
        let depSlugs: string[];
        if (Array.isArray(deps)) {
          depSlugs = deps.map((d: { slug?: string }) => d.slug).filter((s): s is string => !!s);
        } else if (typeof deps === 'object') {
          const obj = deps as Record<string, unknown>;
          const required = Array.isArray(obj.required) ? obj.required : [];
          const optional = Array.isArray(obj.optional) ? obj.optional : [];
          depSlugs = [...required, ...optional]
            .map((d: { slug?: string }) => d?.slug)
            .filter((s): s is string => !!s);
        } else {
          depSlugs = [];
        }
        for (const depSlug of depSlugs) {
          const targetId = slugToId.get(depSlug);
          if (targetId && targetId !== sourceId) {
            const key = `${sourceId}-dep-${targetId}`;
            if (!edgeKeys.has(key)) {
              edgeKeys.add(key);
              edges.push({ id: key, source: sourceId, target: targetId, relationship: 'depends_on' });
            }
          }
        }
      }

      // Extract composes_with
      const composes = construct.manifest.composes_with;
      if (Array.isArray(composes)) {
        for (const composeSlug of composes) {
          const targetId = slugToId.get(composeSlug);
          if (targetId && targetId !== sourceId) {
            const key = `${sourceId}-comp-${targetId}`;
            if (!edgeKeys.has(key)) {
              edgeKeys.add(key);
              edges.push({ id: key, source: sourceId, target: targetId, relationship: 'composes_with' });
            }
          }
        }
      }
    }

    // Governance edges (cycle-051)
    const governs = construct.governs ?? construct.manifest?.governs;
    if (Array.isArray(governs)) {
      for (const governedSlug of governs) {
        const targetId = slugToId.get(governedSlug);
        if (targetId && targetId !== sourceId) {
          const key = `${sourceId}-gov-${targetId}`;
          if (!edgeKeys.has(key)) {
            edgeKeys.add(key);
            edges.push({ id: key, source: sourceId, target: targetId, relationship: 'governs' });
          }
        }
      }
    }
  }

  // Path-based edges (cycle-051)
  const pathConnections = computePathConnections(apiConstructs);
  for (const conn of pathConnections) {
    const sourceId = slugToId.get(conn.sourceSlug);
    const targetId = slugToId.get(conn.targetSlug);
    if (sourceId && targetId) {
      const key = `${sourceId}-via-${targetId}`;
      if (!edgeKeys.has(key)) {
        edgeKeys.add(key);
        edges.push({ id: key, source: sourceId, target: targetId, relationship: 'connected_via' });
      }
    }
  }

  return edges;
}

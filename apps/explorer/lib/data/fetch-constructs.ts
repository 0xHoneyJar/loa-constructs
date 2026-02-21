import type { ConstructArchetype, ConstructDetail, ConstructNode, GraduationLevel, GraphData, CategoryStats, Category } from '@/lib/types/graph';
import { fetchCategories, normalizeCategory } from './fetch-categories';

const API_BASE = process.env.CONSTRUCTS_API_URL || 'https://api.constructs.network/v1';

interface APIConstruct {
  id: string;
  slug: string;
  name: string;
  type: 'skill' | 'pack' | 'bundle';
  description: string | null;
  category: string | null;
  version: string | null;
  downloads: number;
  tier_required: string;
  is_featured: boolean;
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
    expertise_domains?: string[];
    voice_config?: Record<string, unknown>;
    model_preferences?: Record<string, unknown>;
  } | null;
  construct_type?: string;
  verification_tier?: string;
  verified_at?: string | null;
  manifest?: {
    commands?: Array<{ name: string; description: string; usage?: string }>;
    skills?: Array<{ slug: string; name?: string; path?: string; description?: string } | null>;
    composes_with?: string[];
    dependencies?: string[];
    pack_dependencies?: Record<string, unknown>;
  };
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
  const shortDesc = construct.description
    ? construct.description.split('.')[0].slice(0, 60)
    : 'No description';

  // Normalize category (handles legacy slugs like gtm -> marketing)
  const category = normalizeCategory(construct.category || 'development');

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
    downloads: construct.downloads,
    version: construct.version || '1.0.0',
    rating: construct.rating ?? null,
  };
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
          expertiseDomains: construct.identity.expertise_domains,
          voiceConfig: construct.identity.voice_config,
          modelPreferences: construct.identity.model_preferences,
        }
      : null,
    verificationTier: construct.verification_tier ?? 'UNVERIFIED',
    verifiedAt: construct.verified_at ?? null,
    repositoryUrl: isSafeUrl(construct.repository_url) ? construct.repository_url : null,
    homepageUrl: isSafeUrl(construct.homepage_url) ? construct.homepage_url : null,
    documentationUrl: isSafeUrl(construct.documentation_url) ? construct.documentation_url : null,
  };
}

/**
 * Internal: fetch all constructs with raw API data for edge computation.
 * Not exported — use fetchAllConstructs() for public consumers.
 */
async function fetchAllRaw(): Promise<{ nodes: ConstructNode[]; raw: APIConstruct[] }> {
  try {
    const response = await fetch(`${API_BASE}/constructs?per_page=100`, {
      next: { revalidate: 3600 }, // ISR: 1 hour
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
    const response = await fetch(url, {
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
    const response = await fetch(`${API_BASE}/constructs/${slug}`, {
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
    return transformToDetail(construct);
  } catch (error) {
    console.error(`Error fetching construct ${slug}:`, error);
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

function computeEdges(nodes: ConstructNode[], apiConstructs?: APIConstruct[]) {
  const edges: Array<{ id: string; source: string; target: string; relationship: 'contains' | 'depends_on' | 'composes_with' }> = [];

  if (!apiConstructs) return edges;

  // Build slug→id lookup for edge resolution
  const slugToId = new Map<string, string>();
  for (const node of nodes) {
    slugToId.set(node.slug, node.id);
  }

  for (const construct of apiConstructs) {
    const sourceId = slugToId.get(construct.slug);
    if (!sourceId || !construct.manifest) continue;

    // Extract pack_dependencies
    const deps = construct.manifest.pack_dependencies;
    if (deps && typeof deps === 'object') {
      for (const depSlug of Object.keys(deps)) {
        const targetId = slugToId.get(depSlug);
        if (targetId && targetId !== sourceId) {
          edges.push({
            id: `${sourceId}-dep-${targetId}`,
            source: sourceId,
            target: targetId,
            relationship: 'depends_on',
          });
        }
      }
    }

    // Extract composes_with
    const composes = construct.manifest.composes_with;
    if (Array.isArray(composes)) {
      for (const composeSlug of composes) {
        const targetId = slugToId.get(composeSlug);
        if (targetId && targetId !== sourceId) {
          edges.push({
            id: `${sourceId}-comp-${targetId}`,
            source: sourceId,
            target: targetId,
            relationship: 'composes_with',
          });
        }
      }
    }
  }

  return edges;
}

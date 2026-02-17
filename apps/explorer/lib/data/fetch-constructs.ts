import type { ConstructDetail, ConstructNode, GraduationLevel, GraphData, CategoryStats, Category } from '@/lib/types/graph';
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
  graduation_level?: string;
  source_type?: string | null;
  git_url?: string | null;
  manifest?: {
    commands?: Array<{ name: string; description: string; usage?: string }>;
    skills?: Array<{ slug: string; name?: string; path?: string; description?: string } | null>;
    composes_with?: string[];
    dependencies?: string[];
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

function parseGraduationLevel(level: string | undefined): GraduationLevel {
  const validLevels: GraduationLevel[] = ['experimental', 'beta', 'stable', 'deprecated'];
  if (level && validLevels.includes(level as GraduationLevel)) {
    return level as GraduationLevel;
  }
  return 'stable';
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
    category,
    graduationLevel: parseGraduationLevel(construct.graduation_level),
    description: construct.description || 'No description available',
    shortDescription: shortDesc,
    commandCount: commands.length || (construct.type === 'skill' ? 1 : 0),
    downloads: construct.downloads,
    version: construct.version || '1.0.0',
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
  };
}

export async function fetchAllConstructs(): Promise<ConstructNode[]> {
  try {
    const response = await fetch(`${API_BASE}/constructs?per_page=100`, {
      next: { revalidate: 3600 }, // ISR: 1 hour
    });

    if (!response.ok) {
      console.error(`Failed to fetch constructs: ${response.statusText}`);
      return [];
    }

    const data: APIResponse = await response.json();
    return data.data.map(transformToNode);
  } catch (error) {
    console.error('Error fetching constructs:', error);
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
  const [nodes, categories] = await Promise.all([
    fetchAllConstructs(),
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

  // Compute edges (simplified - in production, this would come from API relationships)
  const edges = computeEdges(nodes);

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

function computeEdges(nodes: ConstructNode[]) {
  // Simplified edge computation - connects packs to skills in same category
  const edges: Array<{ id: string; source: string; target: string; relationship: 'contains' | 'depends_on' | 'composes_with' }> = [];

  const packs = nodes.filter((n) => n.type === 'pack');
  const skills = nodes.filter((n) => n.type === 'skill');

  for (const pack of packs) {
    const relatedSkills = skills.filter((s) => s.category === pack.category);
    for (const skill of relatedSkills) {
      edges.push({
        id: `${pack.id}-${skill.id}`,
        source: pack.id,
        target: skill.id,
        relationship: 'composes_with',
      });
    }
  }

  return edges;
}

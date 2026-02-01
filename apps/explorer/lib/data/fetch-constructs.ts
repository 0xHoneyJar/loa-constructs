import type { ConstructDetail, ConstructNode, Domain, GraphData, DomainStats } from '@/lib/types/graph';
import { DOMAIN_COLORS, DOMAIN_LABELS } from '@/lib/utils/colors';

const API_BASE = process.env.CONSTRUCTS_API_URL || 'https://loa-constructs-api.fly.dev/v1';

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

function categoryToDomain(category: string | null): Domain {
  const mapping: Record<string, Domain> = {
    marketing: 'gtm',
    gtm: 'gtm',
    development: 'dev',
    dev: 'dev',
    security: 'security',
    analytics: 'analytics',
    data: 'analytics',
    documentation: 'docs',
    docs: 'docs',
    support: 'docs',
    devops: 'ops',
    ops: 'ops',
    operations: 'ops',
  };

  const normalized = (category || 'dev').toLowerCase();
  return mapping[normalized] || 'dev';
}

function transformToNode(construct: APIConstruct): ConstructNode {
  const commands = construct.manifest?.commands || [];
  const shortDesc = construct.description
    ? construct.description.split('.')[0].slice(0, 60)
    : 'No description';

  return {
    id: construct.id,
    slug: construct.slug,
    name: construct.name,
    type: construct.type,
    domain: categoryToDomain(construct.category),
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

export async function fetchGraphData(): Promise<GraphData> {
  const nodes = await fetchAllConstructs();

  // Compute domain statistics
  const domainCounts = new Map<Domain, number>();
  for (const node of nodes) {
    domainCounts.set(node.domain, (domainCounts.get(node.domain) || 0) + 1);
  }

  const domains: DomainStats[] = Array.from(domainCounts.entries()).map(([id, count]) => ({
    id,
    label: DOMAIN_LABELS[id],
    color: DOMAIN_COLORS[id],
    count,
  }));

  // Compute total commands
  const totalCommands = nodes.reduce((sum, node) => sum + node.commandCount, 0);

  // Compute edges (simplified - in production, this would come from API relationships)
  const edges = computeEdges(nodes);

  return {
    nodes,
    edges,
    domains,
    meta: {
      totalConstructs: nodes.length,
      totalCommands,
      generatedAt: new Date().toISOString(),
    },
  };
}

function computeEdges(nodes: ConstructNode[]) {
  // Simplified edge computation - connects packs to skills in same domain
  const edges: Array<{ id: string; source: string; target: string; relationship: 'contains' | 'depends_on' | 'composes_with' }> = [];

  const packs = nodes.filter((n) => n.type === 'pack');
  const skills = nodes.filter((n) => n.type === 'skill');

  for (const pack of packs) {
    const relatedSkills = skills.filter((s) => s.domain === pack.domain);
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

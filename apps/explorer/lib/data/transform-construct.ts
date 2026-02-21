/**
 * Shared construct transform utilities.
 * Pure functions with no server-only dependencies — safe for 'use client' imports.
 */
import type { ConstructArchetype, ConstructNode, GraduationLevel } from '@/lib/types/graph';
import { normalizeCategory } from './fetch-categories';

/** API response shape for a single construct */
export interface APIConstruct {
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

export function parseGraduationLevel(level: string | undefined): GraduationLevel {
  const validLevels: GraduationLevel[] = ['experimental', 'beta', 'stable', 'deprecated'];
  if (level && validLevels.includes(level as GraduationLevel)) {
    return level as GraduationLevel;
  }
  return 'stable';
}

export function parseConstructType(ct: string | undefined): ConstructArchetype {
  const valid: ConstructArchetype[] = ['skill-pack', 'tool-pack', 'codex', 'template'];
  if (ct && valid.includes(ct as ConstructArchetype)) {
    return ct as ConstructArchetype;
  }
  return 'skill-pack';
}

/** Transform an API construct response into a typed ConstructNode */
export function transformToNode(construct: APIConstruct): ConstructNode {
  const commands = construct.manifest?.commands || [];
  const shortDesc = construct.description
    ? construct.description.split('.')[0].slice(0, 60)
    : 'No description';

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

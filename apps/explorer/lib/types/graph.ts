export type ConstructType = 'skill' | 'pack' | 'bundle';

export type GraduationLevel = 'experimental' | 'beta' | 'stable' | 'deprecated';

export type EdgeRelationship = 'contains' | 'depends_on' | 'composes_with';

/**
 * Category from API
 * @see prd-category-taxonomy.md §3.1 The 8 Categories
 */
export interface Category {
  id: string;
  slug: string;
  label: string;
  color: string;
  description?: string;
  constructCount: number;
}

export interface ConstructNode {
  id: string;
  slug: string;
  name: string;
  type: ConstructType;
  category: string; // Dynamic category slug from API
  graduationLevel: GraduationLevel;
  description: string;
  shortDescription: string;
  commandCount: number;
  downloads: number;
  version: string;
  position?: {
    x: number;
    y: number;
  };
}

export interface ConstructEdge {
  id: string;
  source: string;
  target: string;
  relationship: EdgeRelationship;
}

export interface Command {
  name: string;
  description: string;
  usage?: string;
}

export interface SkillRef {
  slug: string;
  name: string;
  description: string;
}

export interface ConstructDetail extends ConstructNode {
  commands: Command[];
  skills?: SkillRef[];
  composesWith: string[];
  installCommand: string;
}

export interface CategoryStats {
  id: string;
  slug: string;
  label: string;
  color: string;
  count: number;
}

export interface GraphData {
  nodes: ConstructNode[];
  edges: ConstructEdge[];
  categories: CategoryStats[];
  meta: {
    totalConstructs: number;
    totalCommands: number;
    generatedAt: string;
  };
}

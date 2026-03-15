export type ConstructType = 'skill' | 'pack' | 'bundle';

export type GraduationLevel = 'experimental' | 'beta' | 'stable' | 'deprecated';

export type EdgeRelationship = 'contains' | 'depends_on' | 'composes_with' | 'connected_via' | 'governs';

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

export type ConstructArchetype = 'skill-pack' | 'tool-pack' | 'codex' | 'template';

export interface ConstructNode {
  id: string;
  slug: string;
  name: string;
  type: ConstructType;
  constructType: ConstructArchetype;
  category: string; // Dynamic category slug from API
  graduationLevel: GraduationLevel;
  description: string;
  shortDescription: string;
  commandCount: number;
  skillsCount: number;
  downloads: number;
  version: string;
  icon?: string | null;
  logoMark?: string | null;
  logoWordmark?: string | null;
  logoKnockout?: string | null;
  rating?: number | null;
  hasIdentity?: boolean;
  verificationTier?: string;
  visibility?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** Expertise domains from identity — used for domain tag pills */
  domains?: string[];
  /** Slugs this construct composes with — used for composition degree */
  composesWith?: string[];
  /** Skill slugs from manifest — used for Fuse.js search */
  skillSlugs?: string[];
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
  sourceType?: string | null;
  gitUrl?: string | null;
  longDescription: string | null;
  owner: { name: string; type: 'user' | 'team'; avatarUrl: string | null } | null;
  hasIdentity: boolean;
  identity?: {
    cognitiveFrame?: Record<string, unknown>;
    expertiseDomains?: string[];
    voiceConfig?: Record<string, unknown>;
    modelPreferences?: Record<string, unknown>;
  } | null;
  verificationTier: string;
  verifiedAt: string | null;
  repositoryUrl: string | null;
  homepageUrl: string | null;
  documentationUrl: string | null;
  // Fork provenance (cycle-035)
  forkedFrom: { slug: string; name: string } | null;
  forkCount: number;
  // SKILL.md prose (cycle-035)
  skillProse: string | null;
  // Showcases (cycle-035)
  showcases: Showcase[];
  // Accuracy report (cycle-035)
  accuracy: AccuracyReport | null;
  // Composability (cycle-051)
  compositionPaths: { writes?: string[]; reads?: string[] } | null;
  governs: string[];
  governedBy: string[];
  connectedVia: Array<{ slug: string; path: string; direction: 'reads' | 'writes' }>;
}

export interface Showcase {
  id: string;
  title: string;
  url: string;
  description: string | null;
}

export interface AccuracyReport {
  sufficientData: boolean;
  sampleSize: number;
  coverage: number;
  weightedKappa: number;
  warnings: string[];
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

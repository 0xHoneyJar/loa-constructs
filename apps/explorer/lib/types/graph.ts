export type ConstructType = 'skill' | 'pack' | 'bundle';

export type Domain = 'gtm' | 'dev' | 'security' | 'ops' | 'docs' | 'analytics';

export type EdgeRelationship = 'contains' | 'depends_on' | 'composes_with';

export interface ConstructNode {
  id: string;
  slug: string;
  name: string;
  type: ConstructType;
  domain: Domain;
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

export interface DomainStats {
  id: Domain;
  label: string;
  color: string;
  count: number;
}

export interface GraphData {
  nodes: ConstructNode[];
  edges: ConstructEdge[];
  domains: DomainStats[];
  meta: {
    totalConstructs: number;
    totalCommands: number;
    generatedAt: string;
  };
}

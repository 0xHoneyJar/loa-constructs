// Graph data — imported from prebuild JSON (zero hardcoded data)
import data from '../../data/constructs.json';

export interface GraphNode {
  id: string;
  name: string;
  category: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "governs" | "depends_on" | "composes_with" | "connected_via";
}

export const nodes: GraphNode[] = data.graph.nodes;
export const edges: GraphEdge[] = data.graph.edges;

// Design tokens (not data — these stay hardcoded)
export const categoryColors: Record<string, string> = {
  development: "oklch(0.65 0.15 250)",
  design: "oklch(0.65 0.15 340)",
  analytics: "oklch(0.65 0.15 90)",
  operations: "oklch(0.65 0.12 30)",
  security: "oklch(0.65 0.15 0)",
  marketing: "oklch(0.65 0.12 310)",
  documentation: "oklch(0.65 0.12 195)",
};

export const edgeColors: Record<GraphEdge["type"], string> = {
  governs: "oklch(0.72 0.14 85)",
  depends_on: "oklch(0.60 0.12 250)",
  composes_with: "oklch(0.60 0.12 155)",
  connected_via: "oklch(0.35 0.02 250)",
};

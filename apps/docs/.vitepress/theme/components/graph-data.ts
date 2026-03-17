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

// Categories derived from each construct.yaml `domain` field (primary domain used)
export const nodes: GraphNode[] = [
  { id: "artisan", name: "Artisan", category: "design" },
  { id: "beacon", name: "Beacon", category: "operations" },
  { id: "crucible", name: "Crucible", category: "security" },
  { id: "dynamic-auth", name: "Dynamic Auth", category: "security" },
  { id: "gecko", name: "Gecko", category: "analytics" },
  { id: "growthpages", name: "GrowthPages", category: "analytics" },
  { id: "gtm-collective", name: "GTM Collective", category: "analytics" },
  { id: "hardening", name: "Hardening", category: "security" },
  { id: "herald", name: "Herald", category: "operations" },
  { id: "k-hole", name: "K-Hole", category: "analytics" },
  { id: "mibera-codex", name: "Mibera Codex", category: "operations" },
  { id: "observer", name: "Beehive", category: "analytics" },
  { id: "protocol", name: "Protocol", category: "development" },
  { id: "showcase", name: "Showcase", category: "design" },
  { id: "social-oracle", name: "Social Oracle", category: "analytics" },
  { id: "the-arcade", name: "The Arcade", category: "design" },
  { id: "the-easel", name: "The Easel", category: "design" },
  { id: "the-mint", name: "The Mint", category: "design" },
  { id: "the-speakers", name: "The Speakers", category: "design" },
  { id: "vfx-playbook", name: "VFX Playbook", category: "design" },
  { id: "vocabulary-bank", name: "Vocabulary Bank", category: "operations" },
  { id: "webgl-particles", name: "WebGL Particles", category: "design" },
  { id: "webreel", name: "WebReel", category: "design" },
];

// Edges extracted from construct.yaml: governs, governed_by, compose_with, pack_dependencies
export const edges: GraphEdge[] = [
  // --- governs relationships ---
  // artisan governs: the-easel, showcase, the-arcade, the-mint, the-speakers
  { source: "artisan", target: "the-easel", type: "governs" },
  { source: "artisan", target: "showcase", type: "governs" },
  { source: "artisan", target: "the-arcade", type: "governs" },
  { source: "artisan", target: "the-mint", type: "governs" },
  { source: "artisan", target: "the-speakers", type: "governs" },
  // vocabulary-bank governs: herald, social-oracle, gtm-collective, growthpages
  { source: "vocabulary-bank", target: "herald", type: "governs" },
  { source: "vocabulary-bank", target: "social-oracle", type: "governs" },
  { source: "vocabulary-bank", target: "gtm-collective", type: "governs" },
  { source: "vocabulary-bank", target: "growthpages", type: "governs" },

  // --- compose_with relationships (bidirectional in declaration, stored once) ---
  // artisan <-> observer
  { source: "artisan", target: "observer", type: "composes_with" },
  // crucible <-> observer
  { source: "crucible", target: "observer", type: "composes_with" },
  // gecko <-> observer
  { source: "gecko", target: "observer", type: "composes_with" },
  // gecko <-> k-hole
  { source: "gecko", target: "k-hole", type: "composes_with" },
  // growthpages <-> k-hole
  { source: "growthpages", target: "k-hole", type: "composes_with" },
  // gtm-collective <-> observer
  { source: "gtm-collective", target: "observer", type: "composes_with" },
  // hardening <-> observer
  { source: "hardening", target: "observer", type: "composes_with" },
  // protocol <-> observer
  { source: "protocol", target: "observer", type: "composes_with" },
  // protocol <-> artisan
  { source: "protocol", target: "artisan", type: "composes_with" },
  // showcase <-> artisan
  { source: "showcase", target: "artisan", type: "composes_with" },
  // showcase <-> the-easel
  { source: "showcase", target: "the-easel", type: "composes_with" },
  // the-arcade <-> k-hole
  { source: "the-arcade", target: "k-hole", type: "composes_with" },
  // the-arcade <-> the-easel
  { source: "the-arcade", target: "the-easel", type: "composes_with" },
  // the-arcade <-> observer
  { source: "the-arcade", target: "observer", type: "composes_with" },
  // the-easel <-> artisan
  { source: "the-easel", target: "artisan", type: "composes_with" },
  // the-mint <-> the-easel
  { source: "the-mint", target: "the-easel", type: "composes_with" },
  // the-mint <-> k-hole
  { source: "the-mint", target: "k-hole", type: "composes_with" },
  // the-speakers <-> the-easel
  { source: "the-speakers", target: "the-easel", type: "composes_with" },
  // the-speakers <-> artisan
  { source: "the-speakers", target: "artisan", type: "composes_with" },
  // vfx-playbook <-> the-easel
  { source: "vfx-playbook", target: "the-easel", type: "composes_with" },
  // observer <-> crucible (already captured above)
  // observer <-> artisan (already captured above)

  // --- depends_on relationships (pack_dependencies) ---
  // crucible depends on observer (optional)
  { source: "crucible", target: "observer", type: "depends_on" },
  // hardening depends on observer
  { source: "hardening", target: "observer", type: "depends_on" },
  // observer depends on crucible, artisan
  { source: "observer", target: "crucible", type: "depends_on" },
  { source: "observer", target: "artisan", type: "depends_on" },
  // protocol depends on observer, artisan
  { source: "protocol", target: "observer", type: "depends_on" },
  { source: "protocol", target: "artisan", type: "depends_on" },
  // showcase depends on k-hole (required), the-easel, artisan, vfx-playbook (optional)
  { source: "showcase", target: "k-hole", type: "depends_on" },
  // vfx-playbook depends on k-hole
  { source: "vfx-playbook", target: "k-hole", type: "depends_on" },
];

// Category color mapping (oklch design system)
export const categoryColors: Record<string, string> = {
  development: "oklch(0.65 0.15 250)",
  design: "oklch(0.65 0.15 340)",
  analytics: "oklch(0.65 0.15 90)",
  operations: "oklch(0.65 0.12 30)",
  security: "oklch(0.65 0.15 0)",
};

// Edge type color mapping
export const edgeColors: Record<GraphEdge["type"], string> = {
  governs: "oklch(0.72 0.14 85)", // amber/gold
  depends_on: "oklch(0.60 0.12 250)", // blue
  composes_with: "oklch(0.60 0.12 155)", // green
  connected_via: "oklch(0.35 0.02 240)", // dim gray
};

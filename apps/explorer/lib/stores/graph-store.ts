import { create } from 'zustand';
import Fuse from 'fuse.js';
import type { Domain, GraphData, ConstructNode } from '@/lib/types/graph';

interface GraphState {
  // Data
  graphData: GraphData | null;

  // UI State
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  activeDomains: Set<Domain>;

  // Search
  searchQuery: string;
  searchResults: string[];

  // Actions
  setGraphData: (data: GraphData) => void;
  setHoveredNode: (id: string | null) => void;
  setSelectedNode: (id: string | null) => void;
  toggleDomain: (domain: Domain) => void;
  setAllDomains: (active: boolean) => void;
  setSearchQuery: (query: string) => void;
  clearSelection: () => void;
}

const ALL_DOMAINS: Domain[] = ['gtm', 'dev', 'security', 'ops', 'docs', 'analytics'];

export const useGraphStore = create<GraphState>((set, get) => ({
  // Initial state
  graphData: null,
  hoveredNodeId: null,
  selectedNodeId: null,
  activeDomains: new Set(ALL_DOMAINS),
  searchQuery: '',
  searchResults: [],

  // Actions
  setGraphData: (data) => set({ graphData: data }),

  setHoveredNode: (id) => set({ hoveredNodeId: id }),

  setSelectedNode: (id) => {
    const current = get().selectedNodeId;
    // Toggle selection if clicking same node
    set({ selectedNodeId: current === id ? null : id });
  },

  toggleDomain: (domain) => {
    const current = get().activeDomains;
    const newDomains = new Set(current);
    if (newDomains.has(domain)) {
      newDomains.delete(domain);
    } else {
      newDomains.add(domain);
    }
    set({ activeDomains: newDomains });
  },

  setAllDomains: (active) => {
    set({
      activeDomains: active ? new Set(ALL_DOMAINS) : new Set(),
    });
  },

  setSearchQuery: (query) => {
    const { graphData } = get();
    if (!graphData || !query.trim()) {
      set({ searchQuery: query, searchResults: [] });
      return;
    }

    // Use Fuse.js for fuzzy search
    const fuse = new Fuse<ConstructNode>(graphData.nodes, {
      keys: ['name', 'description', 'shortDescription'],
      threshold: 0.4,
      ignoreLocation: true,
    });

    const results = fuse.search(query).map((result) => result.item.id);
    set({ searchQuery: query, searchResults: results });
  },

  clearSelection: () => {
    set({
      hoveredNodeId: null,
      selectedNodeId: null,
      searchQuery: '',
      searchResults: [],
    });
  },
}));

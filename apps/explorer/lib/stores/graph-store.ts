import { create } from 'zustand';
import Fuse from 'fuse.js';
import type { GraphData, ConstructNode, Category } from '@/lib/types/graph';

// Soft limits for stack composition
const STACK_SOFT_LIMIT_WARNING = 5;
const STACK_SOFT_LIMIT_MAX = 8;

export type StackHint = 'none' | 'focus' | 'large';

interface GraphState {
  // Data
  graphData: GraphData | null;
  categories: Category[];

  // UI State
  hoveredNodeId: string | null;
  stackNodeIds: Set<string>;
  isStackHudOpen: boolean;
  activeCategories: Set<string>;

  // Search
  searchQuery: string;
  searchResults: string[];

  // Computed
  stackHint: StackHint;

  // Actions
  setGraphData: (data: GraphData) => void;
  setCategories: (categories: Category[]) => void;
  setHoveredNode: (id: string | null) => void;
  toggleStackNode: (id: string) => void;
  addToStack: (id: string) => void;
  removeFromStack: (id: string) => void;
  clearStack: () => void;
  setStackHudOpen: (open: boolean) => void;
  toggleStackHud: () => void;
  toggleCategory: (categorySlug: string) => void;
  setAllCategories: (active: boolean) => void;
  setSearchQuery: (query: string) => void;
  clearSelection: () => void;
}

function computeStackHint(size: number): StackHint {
  if (size >= STACK_SOFT_LIMIT_MAX) return 'large';
  if (size >= STACK_SOFT_LIMIT_WARNING) return 'focus';
  return 'none';
}

export const useGraphStore = create<GraphState>((set, get) => ({
  // Initial state
  graphData: null,
  categories: [],
  hoveredNodeId: null,
  stackNodeIds: new Set(),
  isStackHudOpen: true,
  activeCategories: new Set<string>(),
  searchQuery: '',
  searchResults: [],
  stackHint: 'none',

  // Actions
  setGraphData: (data) => set({ graphData: data }),

  setCategories: (categories) => {
    // Initialize all categories as active
    const allSlugs = categories.map((c) => c.slug);
    set({ categories, activeCategories: new Set(allSlugs) });
  },

  setHoveredNode: (id) => set({ hoveredNodeId: id }),

  toggleStackNode: (id) => {
    const current = get().stackNodeIds;
    const newStack = new Set(current);
    if (newStack.has(id)) {
      newStack.delete(id);
    } else {
      newStack.add(id);
    }
    set({ stackNodeIds: newStack, stackHint: computeStackHint(newStack.size) });
  },

  addToStack: (id) => {
    const current = get().stackNodeIds;
    if (current.has(id)) return;
    const newStack = new Set(current);
    newStack.add(id);
    set({ stackNodeIds: newStack, stackHint: computeStackHint(newStack.size) });
  },

  removeFromStack: (id) => {
    const current = get().stackNodeIds;
    if (!current.has(id)) return;
    const newStack = new Set(current);
    newStack.delete(id);
    set({ stackNodeIds: newStack, stackHint: computeStackHint(newStack.size) });
  },

  clearStack: () => {
    set({ stackNodeIds: new Set(), stackHint: 'none' });
  },

  setStackHudOpen: (open) => {
    set({ isStackHudOpen: open });
  },

  toggleStackHud: () => {
    set({ isStackHudOpen: !get().isStackHudOpen });
  },

  toggleCategory: (categorySlug) => {
    const current = get().activeCategories;
    const newCategories = new Set(current);
    if (newCategories.has(categorySlug)) {
      newCategories.delete(categorySlug);
    } else {
      newCategories.add(categorySlug);
    }
    set({ activeCategories: newCategories });
  },

  setAllCategories: (active) => {
    const { categories } = get();
    set({
      activeCategories: active ? new Set(categories.map((c) => c.slug)) : new Set(),
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
      stackNodeIds: new Set(),
      stackHint: 'none',
      searchQuery: '',
      searchResults: [],
    });
  },
}));

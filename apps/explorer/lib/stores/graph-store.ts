import { create } from 'zustand';
import Fuse from 'fuse.js';
import type { GraphData, ConstructNode, Category, CategoryStats } from '@/lib/types/graph';

// Soft limits for stack composition
const STACK_SOFT_LIMIT_WARNING = 5;
const STACK_SOFT_LIMIT_MAX = 8;

export type StackHint = 'none' | 'focus' | 'large';

interface GraphState {
  // Data
  graphData: GraphData | null;
  categories: (Category | CategoryStats)[];
  fuseIndex: Fuse<ConstructNode> | null;

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
  setCategories: (categories: (Category | CategoryStats)[]) => void;
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
  fuseIndex: null,
  hoveredNodeId: null,
  stackNodeIds: new Set(),
  isStackHudOpen: true,
  activeCategories: new Set<string>(),
  searchQuery: '',
  searchResults: [],
  stackHint: 'none',

  // Actions
  setGraphData: (data) => {
    const fuseIndex = new Fuse<ConstructNode>(data.nodes, {
      keys: ['name', 'description', 'shortDescription', 'skillSlugs'],
      threshold: 0.4,
      ignoreLocation: true,
    });
    set({ graphData: data, fuseIndex });
  },

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
    const { fuseIndex } = get();
    if (!fuseIndex || !query.trim()) {
      set({ searchQuery: query, searchResults: [] });
      return;
    }

    const results = fuseIndex.search(query).map((result) => result.item.id);
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

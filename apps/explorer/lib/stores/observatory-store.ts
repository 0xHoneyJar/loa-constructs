'use client';

import { create } from 'zustand';

export type FocusZone = 'pulse' | 'filters' | 'list' | 'detail';
export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

interface ObservatoryFilters {
  appSlug: string | null;
  severity: string | null;
  status: string | null;
  timeRange: TimeRange | null;
}

interface ObservatoryState {
  // Selection
  selectedSignalId: string | null;
  selectedSignalIds: Set<string>;
  focusZone: FocusZone;

  // Filters
  filters: ObservatoryFilters;

  // Signal list reference (set by SignalList for keyboard nav)
  signalIds: string[];

  // Actions
  selectSignal: (id: string | null) => void;
  selectNext: () => void;
  selectPrev: () => void;
  extendSelectNext: () => void;
  extendSelectPrev: () => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setFocusZone: (zone: FocusZone) => void;
  setFilter: <K extends keyof ObservatoryFilters>(key: K, value: ObservatoryFilters[K]) => void;
  clearFilters: () => void;
  setSignalIds: (ids: string[]) => void;
}

export const useObservatoryStore = create<ObservatoryState>((set, get) => ({
  selectedSignalId: null,
  selectedSignalIds: new Set(),
  focusZone: 'list',
  filters: {
    appSlug: null,
    severity: null,
    status: null,
    timeRange: null,
  },
  signalIds: [],

  selectSignal: (id) =>
    set({ selectedSignalId: id, selectedSignalIds: new Set(id ? [id] : []) }),

  selectNext: () => {
    const { signalIds, selectedSignalId } = get();
    if (signalIds.length === 0) return;
    if (!selectedSignalId) {
      set({ selectedSignalId: signalIds[0], selectedSignalIds: new Set([signalIds[0]]) });
      return;
    }
    const idx = signalIds.indexOf(selectedSignalId);
    const nextIdx = Math.min(idx + 1, signalIds.length - 1);
    set({
      selectedSignalId: signalIds[nextIdx],
      selectedSignalIds: new Set([signalIds[nextIdx]]),
    });
  },

  selectPrev: () => {
    const { signalIds, selectedSignalId } = get();
    if (signalIds.length === 0) return;
    if (!selectedSignalId) {
      set({ selectedSignalId: signalIds[0], selectedSignalIds: new Set([signalIds[0]]) });
      return;
    }
    const idx = signalIds.indexOf(selectedSignalId);
    const prevIdx = Math.max(idx - 1, 0);
    set({
      selectedSignalId: signalIds[prevIdx],
      selectedSignalIds: new Set([signalIds[prevIdx]]),
    });
  },

  extendSelectNext: () => {
    const { signalIds, selectedSignalId, selectedSignalIds } = get();
    if (signalIds.length === 0) return;
    if (!selectedSignalId) {
      set({ selectedSignalId: signalIds[0], selectedSignalIds: new Set([signalIds[0]]) });
      return;
    }
    const idx = signalIds.indexOf(selectedSignalId);
    const nextIdx = Math.min(idx + 1, signalIds.length - 1);
    const next = new Set(selectedSignalIds);
    next.add(signalIds[nextIdx]);
    set({ selectedSignalId: signalIds[nextIdx], selectedSignalIds: next });
  },

  extendSelectPrev: () => {
    const { signalIds, selectedSignalId, selectedSignalIds } = get();
    if (signalIds.length === 0) return;
    if (!selectedSignalId) {
      set({ selectedSignalId: signalIds[0], selectedSignalIds: new Set([signalIds[0]]) });
      return;
    }
    const idx = signalIds.indexOf(selectedSignalId);
    const prevIdx = Math.max(idx - 1, 0);
    const next = new Set(selectedSignalIds);
    next.add(signalIds[prevIdx]);
    set({ selectedSignalId: signalIds[prevIdx], selectedSignalIds: next });
  },

  toggleSelect: (id) => {
    const { selectedSignalIds } = get();
    const next = new Set(selectedSignalIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    set({ selectedSignalIds: next, selectedSignalId: id });
  },

  selectAll: (ids) =>
    set({ selectedSignalIds: new Set(ids) }),

  clearSelection: () =>
    set({ selectedSignalId: null, selectedSignalIds: new Set() }),

  setFocusZone: (zone) => set({ focusZone: zone }),

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  clearFilters: () =>
    set({
      filters: { appSlug: null, severity: null, status: null, timeRange: null },
    }),

  setSignalIds: (ids) => set({ signalIds: ids }),
}));

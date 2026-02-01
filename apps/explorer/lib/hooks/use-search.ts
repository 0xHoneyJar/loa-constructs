'use client';

import { useMemo } from 'react';
import Fuse from 'fuse.js';
import type { ConstructNode } from '@/lib/types/graph';

interface UseSearchOptions {
  threshold?: number;
  keys?: string[];
}

const DEFAULT_OPTIONS: UseSearchOptions = {
  threshold: 0.4,
  keys: ['name', 'description', 'shortDescription'],
};

export function useSearch(
  nodes: ConstructNode[],
  query: string,
  options: UseSearchOptions = DEFAULT_OPTIONS
) {
  const fuse = useMemo(() => {
    return new Fuse(nodes, {
      keys: options.keys || DEFAULT_OPTIONS.keys,
      threshold: options.threshold ?? DEFAULT_OPTIONS.threshold,
      includeScore: true,
      ignoreLocation: true,
    });
  }, [nodes, options.keys, options.threshold]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return nodes;
    }
    return fuse.search(query).map((result) => result.item);
  }, [fuse, query, nodes]);

  const matchedIds = useMemo(() => {
    if (!query.trim()) {
      return new Set<string>();
    }
    return new Set(results.map((node) => node.id));
  }, [results, query]);

  return {
    results,
    matchedIds,
    hasQuery: query.trim().length > 0,
  };
}

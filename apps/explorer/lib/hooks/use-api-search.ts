'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ConstructNode } from '@/lib/types/graph';
import { transformToNode, type APIConstruct } from '@/lib/data/transform-construct';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.constructs.network/v1';
const DEBOUNCE_MS = 300;

interface UseAPISearchResult {
  results: ConstructNode[];
  isLoading: boolean;
  error: string | null;
}

export function useAPISearch(query: string): UseAPISearchResult {
  const [results, setResults] = useState<ConstructNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (!q.trim()) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const url = `${API_BASE}/constructs?q=${encodeURIComponent(q)}&per_page=50`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      const nodes: ConstructNode[] = ((data.data || []) as APIConstruct[]).map(transformToNode);

      setResults(nodes);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, search]);

  return { results, isLoading, error };
}

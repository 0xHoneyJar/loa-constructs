'use client';

import { useEffect } from 'react';
import { useGraphStore } from '@/lib/stores/graph-store';
import { setCategoryCache } from '@/lib/utils/colors';
import type { Category } from '@/lib/types/graph';

interface CategoryInitializerProps {
  categories: Category[];
}

/**
 * Initializes the category cache and store on mount
 * This is a client component that runs once to set up categories
 */
export function CategoryInitializer({ categories }: CategoryInitializerProps) {
  const setCategories = useGraphStore((s) => s.setCategories);

  useEffect(() => {
    // Initialize the color cache
    setCategoryCache(categories);
    // Initialize the store
    setCategories(categories);
  }, [categories, setCategories]);

  return null;
}

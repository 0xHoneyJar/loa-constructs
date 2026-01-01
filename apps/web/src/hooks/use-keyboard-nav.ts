/**
 * Global Keyboard Navigation Hook
 * Handles keyboard shortcuts for TUI-style navigation
 * @see sprint.md T19.2: Implement Global Keyboard Navigation Hook
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardNavOptions {
  /** Total number of items */
  itemCount: number;
  /** Initial selected index */
  initialIndex?: number;
  /** Callback when item is selected (Enter pressed) */
  onSelect?: (index: number) => void;
  /** Callback when index changes */
  onIndexChange?: (index: number) => void;
  /** Enable/disable the hook */
  enabled?: boolean;
  /** Map of number keys (1-9) to navigation paths */
  shortcuts?: Record<string, string>;
  /** Loop navigation at boundaries */
  loop?: boolean;
}

interface KeyboardNavResult {
  /** Current selected index */
  currentIndex: number;
  /** Set the current index */
  setCurrentIndex: (index: number) => void;
  /** Move to next item */
  next: () => void;
  /** Move to previous item */
  prev: () => void;
  /** Move to first item */
  goToFirst: () => void;
  /** Move to last item */
  goToLast: () => void;
  /** Select current item */
  select: () => void;
}

/**
 * Check if an element is an input that should receive keyboard events
 */
function isInputElement(element: Element | null): boolean {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    (element as HTMLElement).isContentEditable
  );
}

/**
 * Hook for global keyboard navigation
 * Supports: Arrow keys, j/k (vim), g/G (top/bottom), Enter, 1-9 shortcuts
 */
export function useKeyboardNav({
  itemCount,
  initialIndex = 0,
  onSelect,
  onIndexChange,
  enabled = true,
  shortcuts = {},
  loop = true,
}: KeyboardNavOptions): KeyboardNavResult {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const router = useRouter();

  const next = useCallback(() => {
    setCurrentIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= itemCount) {
        return loop ? 0 : prev;
      }
      return nextIndex;
    });
  }, [itemCount, loop]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => {
      const prevIndex = prev - 1;
      if (prevIndex < 0) {
        return loop ? itemCount - 1 : prev;
      }
      return prevIndex;
    });
  }, [itemCount, loop]);

  const goToFirst = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  const goToLast = useCallback(() => {
    setCurrentIndex(Math.max(0, itemCount - 1));
  }, [itemCount]);

  const select = useCallback(() => {
    onSelect?.(currentIndex);
  }, [currentIndex, onSelect]);

  // Notify when index changes
  useEffect(() => {
    onIndexChange?.(currentIndex);
  }, [currentIndex, onIndexChange]);

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is on input element
      if (isInputElement(document.activeElement)) {
        return;
      }

      const key = e.key;

      // Navigation keys
      switch (key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          next();
          break;

        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          prev();
          break;

        case 'g':
          // Only go to first if not shift (G goes to last)
          if (!e.shiftKey) {
            e.preventDefault();
            goToFirst();
          }
          break;

        case 'G':
          e.preventDefault();
          goToLast();
          break;

        case 'Enter':
          e.preventDefault();
          select();
          break;

        case 'Home':
          e.preventDefault();
          goToFirst();
          break;

        case 'End':
          e.preventDefault();
          goToLast();
          break;
      }

      // Number key shortcuts (1-9)
      if (/^[1-9]$/.test(key)) {
        const path = shortcuts[key];
        if (path) {
          e.preventDefault();
          router.push(path);
        } else {
          // Use as index if no shortcut defined
          const index = parseInt(key, 10) - 1;
          if (index < itemCount) {
            e.preventDefault();
            setCurrentIndex(index);
            onSelect?.(index);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, next, prev, goToFirst, goToLast, select, shortcuts, router, itemCount, onSelect]);

  return {
    currentIndex,
    setCurrentIndex,
    next,
    prev,
    goToFirst,
    goToLast,
    select,
  };
}

/**
 * Simplified hook for sidebar navigation
 */
export function useSidebarNav(routes: Array<{ href: string }>) {
  const router = useRouter();

  const shortcuts: Record<string, string> = {};
  routes.forEach((route, index) => {
    if (index < 9) {
      shortcuts[String(index + 1)] = route.href;
    }
  });

  return useKeyboardNav({
    itemCount: routes.length,
    shortcuts,
    onSelect: (index) => {
      if (routes[index]) {
        router.push(routes[index].href);
      }
    },
  });
}

export default useKeyboardNav;

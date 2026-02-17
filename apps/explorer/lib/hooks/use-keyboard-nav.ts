'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardNavOptions {
  itemCount: number;
  initialIndex?: number;
  onSelect?: (index: number) => void;
  onIndexChange?: (index: number) => void;
  enabled?: boolean;
  shortcuts?: Record<string, string>;
  loop?: boolean;
}

interface KeyboardNavResult {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  next: () => void;
  prev: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  select: () => void;
}

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
      if (nextIndex >= itemCount) return loop ? 0 : prev;
      return nextIndex;
    });
  }, [itemCount, loop]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => {
      const prevIndex = prev - 1;
      if (prevIndex < 0) return loop ? itemCount - 1 : prev;
      return prevIndex;
    });
  }, [itemCount, loop]);

  const goToFirst = useCallback(() => setCurrentIndex(0), []);
  const goToLast = useCallback(() => setCurrentIndex(Math.max(0, itemCount - 1)), [itemCount]);
  const select = useCallback(() => onSelect?.(currentIndex), [currentIndex, onSelect]);

  useEffect(() => {
    onIndexChange?.(currentIndex);
  }, [currentIndex, onIndexChange]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputElement(document.activeElement)) return;

      const key = e.key;

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

      if (/^[1-9]$/.test(key)) {
        const path = shortcuts[key];
        if (path) {
          e.preventDefault();
          router.push(path);
        } else {
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

  return { currentIndex, setCurrentIndex, next, prev, goToFirst, goToLast, select };
}

export function useSidebarNav(routes: Array<{ href: string }>) {
  const router = useRouter();

  const shortcuts: Record<string, string> = {};
  routes.forEach((route, index) => {
    if (index < 9) shortcuts[String(index + 1)] = route.href;
  });

  return useKeyboardNav({
    itemCount: routes.length,
    shortcuts,
    onSelect: (index) => {
      if (routes[index]) router.push(routes[index].href);
    },
  });
}

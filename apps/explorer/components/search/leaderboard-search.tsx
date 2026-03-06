'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function LeaderboardSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(searchParams.get('q') || '');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setValue(q);

      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        const url = new URL(window.location.href);
        if (q.trim()) {
          url.searchParams.set('q', q.trim());
        } else {
          url.searchParams.delete('q');
        }
        router.replace(url.pathname + url.search);
      }, 250);
    },
    [router]
  );

  // Focus on `/` key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-bone-ghost">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Search constructs..."
        className="w-full border border-void-border bg-transparent py-3 pl-11 pr-12 font-mono text-sm text-bone-base placeholder:text-bone-ghost focus:border-cyan-dim focus:outline-none transition-colors"
      />
      <kbd className="absolute right-4 top-1/2 -translate-y-1/2 border border-void-border px-1.5 py-0.5 font-mono text-[10px] text-bone-ghost">
        /
      </kbd>
    </div>
  );
}

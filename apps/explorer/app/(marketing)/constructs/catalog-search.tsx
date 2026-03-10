'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useCallback } from 'react';

export function CatalogSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue || '');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setValue(q);

      // Debounce navigation
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (q.trim()) {
          router.push(`/constructs?q=${encodeURIComponent(q.trim())}`);
        } else {
          router.push('/constructs');
        }
      }, 300);
    },
    [router]
  );

  const handleClear = useCallback(() => {
    setValue('');
    router.push('/constructs');
    inputRef.current?.focus();
  }, [router]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Search constructs..."
        className="h-8 w-48 sm:w-64 border border-void-border bg-transparent px-3 pr-8 font-mono text-xs text-bone-base placeholder:text-bone-ghost focus:border-bone-ghost focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-bone-ghost hover:text-bone-bright"
        >
          <span className="sr-only">Clear</span>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : (
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 border border-void-border px-1.5 font-mono text-[10px] text-bone-ghost">
          /
        </kbd>
      )}
    </div>
  );
}

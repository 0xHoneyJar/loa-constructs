'use client';

export function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'k', metaKey: true })
        );
      }}
      className="inline-flex w-full items-center gap-3 font-mono text-base text-bone-ghost border border-void-border px-4 py-2.5 hover:text-bone-dim hover:border-bone-ghost transition-colors"
      aria-label="Search constructs"
    >
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <span className="flex-1 text-left">Search constructs...</span>
      <kbd className="text-sm text-bone-ghost hidden sm:inline">&#8984;K</kbd>
    </button>
  );
}

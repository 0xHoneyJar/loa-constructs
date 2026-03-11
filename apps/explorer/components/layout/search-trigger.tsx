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
      className="hidden sm:inline-flex items-center font-mono text-[10px] text-bone-ghost border border-void-border px-1.5 py-0.5 hover:text-bone-dim hover:border-bone-ghost/30 transition-colors"
      aria-label="Search constructs"
    >
      &#8984;K
    </button>
  );
}

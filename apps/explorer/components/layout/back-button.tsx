import Link from 'next/link';

export function BackButton() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-bone-dim hover:text-bone-bright transition-colors"
    >
      <span>←</span>
      <span>BACK</span>
    </Link>
  );
}

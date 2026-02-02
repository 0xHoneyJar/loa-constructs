import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6">
        <div className="mb-4 font-mono text-6xl text-domain-analytics">404</div>
        <h1 className="mb-2 font-mono text-xl font-semibold uppercase tracking-wider text-white">
          Construct Not Found
        </h1>
        <p className="mx-auto max-w-md text-sm text-white/60">
          The construct you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="rounded-md border border-domain-docs bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-wider text-domain-docs transition-colors hover:bg-domain-docs hover:text-background"
        >
          Explore Network
        </Link>
        <Link
          href="/install"
          className="rounded-md border border-border bg-surface px-4 py-2 font-mono text-xs uppercase tracking-wider text-white/60 transition-colors hover:bg-surface hover:text-white"
        >
          Install Guide
        </Link>
      </div>
    </div>
  );
}

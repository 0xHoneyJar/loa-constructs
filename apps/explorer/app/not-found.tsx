import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6">
        <div className="mb-4 font-mono text-6xl text-crimson-base">404</div>
        <h1 className="mb-2 font-mono text-xl font-semibold uppercase tracking-terminal text-bone-bright">
          Construct Not Found
        </h1>
        <p className="mx-auto max-w-md text-sm text-bone-dim">
          The construct you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="border border-cyan-dim bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-terminal text-cyan-dim transition-colors hover:bg-cyan-dim/10 hover:text-cyan-base"
        >
          Explore Network
        </Link>
        <Link
          href="/install"
          className="border border-void-border bg-void-raised px-4 py-2 font-mono text-xs uppercase tracking-terminal text-bone-dim transition-colors hover:text-bone-base"
        >
          Install Guide
        </Link>
      </div>
    </div>
  );
}

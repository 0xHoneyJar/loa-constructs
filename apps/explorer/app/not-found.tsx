import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6">
        <div className="mb-4 font-mono text-6xl text-crimson-base">404</div>
        <h1 className="mb-2 font-display text-2xl uppercase tracking-display text-bone-bright">
          Construct Not Found
        </h1>
        <p className="mx-auto max-w-md text-sm text-bone-dim">
          The construct you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Button
          asChild
          variant="outline"
          className="border-cyan-dim text-cyan-dim hover:bg-void-raised hover:text-cyan-base"
        >
          <Link href="/">Explore Network</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/install">Install Guide</Link>
        </Button>
      </div>
    </div>
  );
}

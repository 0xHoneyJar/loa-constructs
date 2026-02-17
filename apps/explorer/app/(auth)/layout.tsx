import { ReactNode } from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-tui-bg p-4">
      <div className="mb-6 text-center">
        <Link href="/" className="no-underline">
          <h1 className="text-lg font-semibold font-mono text-tui-green">LOA CONSTRUCTS</h1>
        </Link>
        <p className="text-xs font-mono text-tui-dim">Agent-driven development framework</p>
      </div>

      <div className="w-full max-w-md">{children}</div>

      <footer className="mt-6 text-center text-xs font-mono text-tui-dim">
        <p>&copy; {new Date().getFullYear()} The Honey Jar. All rights reserved.</p>
      </footer>
    </div>
  );
}

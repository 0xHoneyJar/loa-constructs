import { ReactNode } from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <Link href="/" className="no-underline">
          <h1 className="text-sm font-bold font-mono text-bone-base">constructs.network</h1>
        </Link>
        <p className="text-xs font-mono text-bone-ghost mt-1">Named expertise for AI coding agents</p>
      </div>

      <div className="w-full max-w-md">{children}</div>

      <footer className="mt-8 text-center text-xs font-mono text-bone-ghost">
        <p>&copy; {new Date().getFullYear()} Constructs Network</p>
      </footer>
    </div>
  );
}

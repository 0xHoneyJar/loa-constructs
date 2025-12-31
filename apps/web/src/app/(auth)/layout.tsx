/**
 * Auth Layout
 * @see sprint.md T5.1: Centered card layout with branding
 */

import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      {/* Logo and Branding */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Loa Skills Registry</h1>
        <p className="text-muted-foreground mt-2">Agent-driven development framework</p>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md">{children}</div>

      {/* Footer */}
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} The Honey Jar. All rights reserved.</p>
      </footer>
    </div>
  );
}

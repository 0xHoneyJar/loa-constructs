import Link from 'next/link';
import { cookies } from 'next/headers';

async function MarketingHeader() {
  const cookieStore = await cookies();
  const hasToken = cookieStore.has('access_token');

  return (
    <header className="border-b border-void-border px-6 py-3">
      <nav className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-mono font-bold text-bone-base hover:text-bone-base">
            constructs.network
          </Link>
          <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-bone-dim">
            <Link href="/constructs" className="hover:text-bone-bright transition-colors">Constructs</Link>
            <Link href="/docs" className="hover:text-bone-bright transition-colors">Docs</Link>
            <Link href="/pricing" className="hover:text-bone-bright transition-colors">Pricing</Link>
            <Link href="/blog" className="hover:text-bone-bright transition-colors">Blog</Link>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          {hasToken ? (
            <Link href="/dashboard" className="text-bone-dim hover:text-bone-bright transition-colors">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-bone-dim hover:text-bone-bright transition-colors">
                Login
              </Link>
              <Link
                href="/register"
                className="border border-bone-ghost px-3 py-1 text-bone-base hover:bg-void-surface transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-void-border px-6 py-8 mt-auto">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs font-mono">
          <div>
            <p className="text-bone-ghost mb-2">Product</p>
            <div className="space-y-1">
              <Link href="/constructs" className="block text-bone-dim hover:text-bone-bright">Constructs</Link>
              <Link href="/pricing" className="block text-bone-dim hover:text-bone-bright">Pricing</Link>
              <Link href="/docs" className="block text-bone-dim hover:text-bone-bright">Docs</Link>
              <Link href="/changelog" className="block text-bone-dim hover:text-bone-bright">Changelog</Link>
            </div>
          </div>
          <div>
            <p className="text-bone-ghost mb-2">Community</p>
            <div className="space-y-1">
              <Link href="/blog" className="block text-bone-dim hover:text-bone-bright">Blog</Link>
              <a href="https://github.com/0xHoneyJar/loa" className="block text-bone-dim hover:text-bone-bright" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
          </div>
          <div>
            <p className="text-bone-ghost mb-2">Company</p>
            <div className="space-y-1">
              <Link href="/about" className="block text-bone-dim hover:text-bone-bright">About</Link>
              <Link href="/terms" className="block text-bone-dim hover:text-bone-bright">Terms</Link>
              <Link href="/privacy" className="block text-bone-dim hover:text-bone-bright">Privacy</Link>
            </div>
          </div>
          <div>
            <p className="text-bone-ghost mb-2">Connect</p>
            <div className="space-y-1">
              <a href="https://x.com/constructs_net" className="block text-bone-dim hover:text-bone-bright" target="_blank" rel="noopener noreferrer">X / Twitter</a>
              <a href="https://discord.gg/constructs" className="block text-bone-dim hover:text-bone-bright" target="_blank" rel="noopener noreferrer">Discord</a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-void-border text-xs font-mono text-bone-ghost">
          &copy; {new Date().getFullYear()} Constructs Network. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <MarketingHeader />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}

import Link from 'next/link';
import { cookies } from 'next/headers';

async function MarketingHeader() {
  const cookieStore = await cookies();
  const hasToken = cookieStore.has('access_token');

  return (
    <header className="border-b border-white/10 px-6 py-3">
      <nav className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-mono font-bold text-white hover:text-white/80">
            constructs.network
          </Link>
          <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-white/60">
            <Link href="/constructs" className="hover:text-white transition-colors">Constructs</Link>
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          {hasToken ? (
            <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-white/60 hover:text-white transition-colors">
                Login
              </Link>
              <Link
                href="/register"
                className="border border-white/20 px-3 py-1 text-white hover:bg-white/10 transition-colors"
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
    <footer className="border-t border-white/10 px-6 py-8 mt-auto">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs font-mono">
          <div>
            <p className="text-white/40 mb-2">Product</p>
            <div className="space-y-1">
              <Link href="/constructs" className="block text-white/60 hover:text-white">Constructs</Link>
              <Link href="/pricing" className="block text-white/60 hover:text-white">Pricing</Link>
              <Link href="/docs" className="block text-white/60 hover:text-white">Docs</Link>
              <Link href="/changelog" className="block text-white/60 hover:text-white">Changelog</Link>
            </div>
          </div>
          <div>
            <p className="text-white/40 mb-2">Community</p>
            <div className="space-y-1">
              <Link href="/blog" className="block text-white/60 hover:text-white">Blog</Link>
              <a href="https://github.com/0xHoneyJar/loa" className="block text-white/60 hover:text-white" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
          </div>
          <div>
            <p className="text-white/40 mb-2">Company</p>
            <div className="space-y-1">
              <Link href="/about" className="block text-white/60 hover:text-white">About</Link>
              <Link href="/terms" className="block text-white/60 hover:text-white">Terms</Link>
              <Link href="/privacy" className="block text-white/60 hover:text-white">Privacy</Link>
            </div>
          </div>
          <div>
            <p className="text-white/40 mb-2">Connect</p>
            <div className="space-y-1">
              <a href="https://x.com/constructs_net" className="block text-white/60 hover:text-white" target="_blank" rel="noopener noreferrer">X / Twitter</a>
              <a href="https://discord.gg/constructs" className="block text-white/60 hover:text-white" target="_blank" rel="noopener noreferrer">Discord</a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-white/10 text-xs font-mono text-white/30">
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

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { GlobalSearch } from '@/components/search/global-search';

function MarketingFooter() {
  return (
    <footer className="border-t border-void-border px-6 py-8 mt-auto">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-base font-mono">
          <div>
            <p className="text-bone-ghost mb-2">Product</p>
            <div className="space-y-1">
              <Link href="/constructs" className="block text-bone-dim hover:text-bone-bright">Constructs</Link>
              <Link href="/install" className="block text-bone-dim hover:text-bone-bright">Install</Link>
              <Link href="/explore" className="block text-bone-dim hover:text-bone-bright">Explore</Link>
            </div>
          </div>
          <div>
            <p className="text-bone-ghost mb-2">Community</p>
            <div className="space-y-1">
              <a href="https://github.com/0xHoneyJar/loa-constructs" className="block text-bone-dim hover:text-bone-bright" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://github.com/0xHoneyJar/construct-base" className="block text-bone-dim hover:text-bone-bright" target="_blank" rel="noopener noreferrer">Template</a>
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
        <div className="mt-8 pt-4 border-t border-void-border flex flex-col items-center gap-3">
          <div
            className="h-5 sm:h-6"
            style={{
              maskImage: 'url(/logo-bone.svg)',
              WebkitMaskImage: 'url(/logo-bone.svg)',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              aspectRatio: '455 / 155',
              backgroundColor: 'oklch(0.4 0.005 80)',
            }}
            role="img"
            aria-label="Loa"
          />
          <p className="text-base font-mono text-bone-ghost">
            &copy; {new Date().getFullYear()} Constructs Network. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {children}
      </main>
      <MarketingFooter />
      <GlobalSearch />
    </div>
  );
}

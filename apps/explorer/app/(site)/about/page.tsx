import type { Metadata } from 'next';
import Link from 'next/link';
import { TerminalBlock } from '@/components/ui/terminal-block';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { fetchAllConstructs } from '@/lib/data/fetch-constructs';

export const metadata: Metadata = {
  title: 'What are Constructs? | Constructs Network',
  description: 'Named expertise for AI coding agents. Browse, compose, deploy.',
};

// ISR — revalidate hourly (matches homepage)
export const revalidate = 3600;

/** Ghost mark placeholder — dashed square suggesting a logo will exist */
function GhostMark() {
  return (
    <span className="inline-block w-5 h-5 border border-dashed border-void-border shrink-0" />
  );
}

export default async function AboutPage() {
  const allConstructs = await fetchAllConstructs();

  // Build a slug→logoWordmark map for constructs shown on this page
  const marks: Record<string, string | null> = {};
  for (const c of allConstructs) {
    if (['artisan', 'k-hole', 'mibera-codex', 'observer', 'crucible'].includes(c.slug)) {
      marks[c.slug] = c.logoWordmark ?? null;
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <div className="space-y-32 sm:space-y-40">

        {/* Hero */}
        <ScrollReveal animation="fade">
          <section>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl uppercase tracking-display text-bone-bright leading-[0.95]">
              What are
              <br />
              Constructs?
            </h1>
            <p className="mt-8 font-mono text-base sm:text-lg leading-relaxed text-bone-dim max-w-2xl">
              Named expertise you deploy into your AI coding agent.
              One command. Your agent sees problems differently.
            </p>
          </section>
        </ScrollReveal>

        {/* Deploy — the magic moment, first */}
        <ScrollReveal animation="fade">
          <section>
            <p className="font-mono text-xs uppercase tracking-terminal text-bone-ghost">
              01
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl uppercase tracking-display text-bone-bright leading-[0.95]">
              Deploy.
            </h2>
            <p className="mt-8 font-mono text-base leading-relaxed text-bone-dim max-w-2xl">
              One command installs expertise. Then use it.
            </p>

            {/* Terminal — lines stagger in like a buffer dump */}
            <div className="mt-10">
              <TerminalBlock
                lines={[
                  {
                    type: 'command',
                    text: 'npx constructs install k-hole',
                    copiable: true,
                  },
                  {
                    type: 'output',
                    text: 'Deployed K-Hole — 5 skills, 5 commands',
                  },
                  {
                    type: 'command',
                    text: '/dig "LED display construction for WebGL"',
                  },
                  {
                    type: 'output',
                    text: '16 grounded searches. 36 seconds.',
                  },
                  {
                    type: 'output',
                    text: 'Found: LED pixel pitch calculations, viewing distance formulas, 3 manufacturer spec sheets.',
                  },
                ]}
              />
            </div>

            {/* Early exit — let convinced readers escape */}
            <div className="mt-8">
              <Link
                href="/constructs"
                className="font-mono text-sm text-cyan-dim hover:text-bone-bright transition-colors"
              >
                See what&apos;s on the network &rarr;
              </Link>
            </div>
          </section>
        </ScrollReveal>

        {/* Browse — now you're curious */}
        <ScrollReveal animation="fade">
          <section>
            <p className="font-mono text-xs uppercase tracking-terminal text-bone-ghost">
              02
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl uppercase tracking-display text-bone-bright leading-[0.95]">
              Browse.
            </h2>
            <p className="mt-8 font-mono text-base leading-relaxed text-bone-dim max-w-2xl">
              The roster. Each construct is a specialist — the best at
              its domain.
            </p>

            {/* Mini roster — entries stagger in, ghost slots pulse */}
            <ScrollReveal animation="stagger" staggerDelay={83} className="mt-10 border-t border-void-border">
              {/* Real constructs — wordmark replaces text name */}
              <div className="py-6 border-b border-void-border">
                {marks['artisan'] ? (
                  <div
                    className="text-bone-base [&_svg]:h-8 sm:[&_svg]:h-10 [&_svg]:w-auto"
                    dangerouslySetInnerHTML={{ __html: marks['artisan'] }}
                  />
                ) : (
                  <span className="font-display text-2xl sm:text-3xl uppercase tracking-display text-bone-base">
                    Artisan
                  </span>
                )}
                <p className="mt-2 font-mono text-sm text-bone-muted">
                  Taste made measurable
                </p>
              </div>
              <div className="py-6 border-b border-void-border">
                {marks['k-hole'] ? (
                  <div
                    className="text-bone-base [&_svg]:h-8 sm:[&_svg]:h-10 [&_svg]:w-auto"
                    dangerouslySetInnerHTML={{ __html: marks['k-hole'] }}
                  />
                ) : (
                  <span className="font-display text-2xl sm:text-3xl uppercase tracking-display text-bone-base">
                    K-Hole
                  </span>
                )}
                <p className="mt-2 font-mono text-sm text-bone-muted">
                  Depth engine for exploration
                </p>
              </div>
              <div className="py-6 border-b border-void-border">
                {marks['mibera-codex'] ? (
                  <div
                    className="text-bone-base [&_svg]:h-8 sm:[&_svg]:h-10 [&_svg]:w-auto"
                    dangerouslySetInnerHTML={{ __html: marks['mibera-codex'] }}
                  />
                ) : (
                  <span className="font-display text-2xl sm:text-3xl uppercase tracking-display text-bone-base">
                    Mibera Codex
                  </span>
                )}
                <p className="mt-2 font-mono text-sm text-bone-muted">
                  Living lore for 10,000 Beras
                </p>
              </div>

              {/* Ghost slots — dashed placeholder marks, the roster is growing */}
              <div className="py-3 border-b border-dashed border-void-border flex items-center gap-4 slot-waiting">
                <GhostMark />
                <span className="font-mono text-sm text-bone-ghost">&mdash;</span>
              </div>
              <div className="py-3 border-b border-dashed border-void-border flex items-center gap-4 slot-waiting">
                <GhostMark />
              </div>
              <div className="py-3 border-b border-dashed border-void-border flex items-center gap-4 slot-waiting">
                <GhostMark />
              </div>
            </ScrollReveal>
          </section>
        </ScrollReveal>

        {/* Compose — the twist, the depth reveal */}
        <ScrollReveal animation="fade">
          <section>
            <p className="font-mono text-xs uppercase tracking-terminal text-bone-ghost">
              03
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl uppercase tracking-display text-bone-bright leading-[0.95]">
              Compose.
            </h2>
            <p className="mt-8 font-mono text-base leading-relaxed text-bone-dim max-w-2xl">
              Deploy several — they share context through your project.
              Each construct declares what it works with.
            </p>

            {/* Network glimpse — nodes + edges */}
            <ScrollReveal animation="draw" className="mt-10 border border-void-border relative overflow-hidden" style={{ height: 280 }}>
              {/* Edge lines — SVG for clean diagonals */}
              <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
                {/* artisan -> observer */}
                <line x1="18%" y1="28%" x2="52%" y2="32%" className="stroke-cyan-dim" strokeWidth={1} />
                {/* observer -> crucible */}
                <line x1="52%" y1="32%" x2="78%" y2="58%" className="stroke-cyan-dim" strokeWidth={1} />
                {/* k-hole -> mibera-codex */}
                <line x1="30%" y1="65%" x2="60%" y2="72%" className="stroke-cyan-dim" strokeWidth={1} />
                {/* observer -> k-hole (cross-link) */}
                <line x1="52%" y1="32%" x2="30%" y2="65%" className="stroke-void-border" strokeWidth={1} />
                {/* ghost edges — trailing off toward edges */}
                <line x1="78%" y1="58%" x2="95%" y2="48%" className="stroke-void-border" strokeWidth={1} strokeDasharray="4 6" />
                <line x1="60%" y1="72%" x2="82%" y2="85%" className="stroke-void-border" strokeWidth={1} strokeDasharray="4 6" />
              </svg>

              {/* Nodes — logomark + name, positioned loosely */}
              <div className="absolute flex items-center gap-2 font-mono text-sm text-bone-base border border-void-border px-3 py-1.5 bg-void-base" style={{ left: '6%', top: '22%' }}>
                {marks['artisan'] ? (
                  <span className="shrink-0 [&_svg]:h-3 [&_svg]:w-auto" dangerouslySetInnerHTML={{ __html: marks['artisan'] }} />
                ) : null}
                artisan
              </div>
              <div className="absolute flex items-center gap-2 font-mono text-sm text-bone-base border border-void-border px-3 py-1.5 bg-void-base" style={{ left: '44%', top: '26%' }}>
                {marks['observer'] ? (
                  <span className="shrink-0 [&_svg]:h-3 [&_svg]:w-auto" dangerouslySetInnerHTML={{ __html: marks['observer'] }} />
                ) : null}
                observer
              </div>
              <div className="absolute flex items-center gap-2 font-mono text-sm text-bone-base border border-void-border px-3 py-1.5 bg-void-base" style={{ left: '70%', top: '52%' }}>
                {marks['crucible'] ? (
                  <span className="shrink-0 [&_svg]:h-3 [&_svg]:w-auto" dangerouslySetInnerHTML={{ __html: marks['crucible'] }} />
                ) : null}
                crucible
              </div>
              <div className="absolute flex items-center gap-2 font-mono text-sm text-bone-base border border-void-border px-3 py-1.5 bg-void-base" style={{ left: '18%', top: '59%' }}>
                {marks['k-hole'] ? (
                  <span className="shrink-0 [&_svg]:h-3 [&_svg]:w-auto" dangerouslySetInnerHTML={{ __html: marks['k-hole'] }} />
                ) : null}
                k-hole
              </div>
              <div className="absolute flex items-center gap-2 font-mono text-sm text-bone-base border border-void-border px-3 py-1.5 bg-void-base" style={{ left: '50%', top: '66%' }}>
                {marks['mibera-codex'] ? (
                  <span className="shrink-0 [&_svg]:h-3 [&_svg]:w-auto" dangerouslySetInnerHTML={{ __html: marks['mibera-codex'] }} />
                ) : null}
                mibera-codex
              </div>

              {/* Ghost nodes — dashed placeholder marks, the network extends */}
              <div className="absolute flex items-center gap-2 border border-dashed border-void-border px-3 py-1.5 slot-waiting" style={{ left: '88%', top: '42%', minWidth: 48 }}>
                <GhostMark />
              </div>
              <div className="absolute flex items-center gap-2 border border-dashed border-void-border px-3 py-1 slot-waiting" style={{ left: '76%', top: '80%', minWidth: 40 }}>
                <GhostMark />
              </div>
            </ScrollReveal>
          </section>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal animation="fade">
          <div>
            <Link
              href="/constructs"
              className="font-display text-xl sm:text-2xl uppercase tracking-display text-cyan-dim hover:text-bone-bright transition-colors"
            >
              Browse the roster &rarr;
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

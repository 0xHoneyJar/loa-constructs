import type { Metadata } from 'next';
import Link from 'next/link';
import { TerminalBlock } from '@/components/ui/terminal-block';

export const metadata: Metadata = {
  title: 'What are Constructs? | Constructs Network',
  description: 'Named expertise for AI coding agents. Browse, compose, deploy.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <div className="space-y-32 sm:space-y-40">

        {/* Hero */}
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

        {/* Deploy — the magic moment, first */}
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

          {/* Terminal */}
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

        {/* Browse — now you're curious */}
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

          {/* Mini roster — the three public constructs */}
          <div className="mt-10 border-t border-void-border">
            <div className="py-5 border-b border-void-border flex items-baseline justify-between gap-4">
              <div>
                <span className="font-display text-xl sm:text-2xl uppercase tracking-display text-bone-base">
                  Artisan
                </span>
                <p className="mt-1 font-mono text-sm text-bone-muted">
                  Taste made measurable
                </p>
              </div>
              <span className="font-mono text-xs uppercase tracking-terminal text-bone-ghost shrink-0">
                14 skills
              </span>
            </div>
            <div className="py-5 border-b border-void-border flex items-baseline justify-between gap-4">
              <div>
                <span className="font-display text-xl sm:text-2xl uppercase tracking-display text-bone-base">
                  K-Hole
                </span>
                <p className="mt-1 font-mono text-sm text-bone-muted">
                  Depth engine for exploration
                </p>
              </div>
              <span className="font-mono text-xs uppercase tracking-terminal text-bone-ghost shrink-0">
                5 skills
              </span>
            </div>
            <div className="py-5 border-b border-void-border flex items-baseline justify-between gap-4">
              <div>
                <span className="font-display text-xl sm:text-2xl uppercase tracking-display text-bone-base">
                  Mibera Codex
                </span>
                <p className="mt-1 font-mono text-sm text-bone-muted">
                  Living lore for 10,000 Beras
                </p>
              </div>
              <span className="font-mono text-xs uppercase tracking-terminal text-bone-ghost shrink-0">
                3 skills
              </span>
            </div>
          </div>
        </section>

        {/* Compose — the twist, the depth reveal */}
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

          {/* Composition map */}
          <div className="mt-10 border border-void-border px-5 py-6 font-mono text-sm sm:text-base">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-bone-base">artisan</span>
                <span className="text-bone-ghost">------</span>
                <span className="text-cyan-dim">composes with</span>
                <span className="text-bone-ghost">------</span>
                <span className="text-bone-base">observer</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-bone-base">k-hole</span>
                <span className="text-bone-ghost">-------</span>
                <span className="text-cyan-dim">composes with</span>
                <span className="text-bone-ghost">------</span>
                <span className="text-bone-base">mibera-codex</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-bone-base">observer</span>
                <span className="text-bone-ghost">-----</span>
                <span className="text-cyan-dim">composes with</span>
                <span className="text-bone-ghost">------</span>
                <span className="text-bone-base">crucible</span>
              </div>
            </div>
            <p className="mt-6 text-xs text-bone-ghost uppercase tracking-terminal">
              Your creativity determines how they connect.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div>
          <Link
            href="/constructs"
            className="font-display text-xl sm:text-2xl uppercase tracking-display text-cyan-dim hover:text-bone-bright transition-colors"
          >
            Browse the roster &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

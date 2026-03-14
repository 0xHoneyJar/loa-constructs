import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'What are Constructs? | Constructs Network',
  description: 'Named expertise for AI coding agents. Browse, compose, deploy.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <div className="space-y-20">

        <section>
          <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-display text-bone-bright leading-[0.95]">
            What are Constructs?
          </h1>
          <p className="mt-8 font-mono text-base sm:text-lg leading-relaxed text-bone-dim">
            Named expertise you deploy into your AI coding agent.
            One command. Your agent sees problems differently.
          </p>
        </section>

        {/* Browse */}
        <section>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-display text-bone-bright leading-[0.95]">
            Browse.
          </h2>
          <p className="mt-6 font-mono text-base leading-relaxed text-bone-dim">
            The roster. Each construct is a specialist — the best at
            its domain. Artisan owns taste. K-Hole owns depth.
            Codex owns lore.
          </p>
        </section>

        {/* Compose */}
        <section>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-display text-bone-bright leading-[0.95]">
            Compose.
          </h2>
          <p className="mt-6 font-mono text-base leading-relaxed text-bone-dim">
            Deploy several — they share context through your project.
            Each construct declares what it works with. Your creativity
            determines how they connect.
          </p>
        </section>

        {/* Deploy */}
        <section>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-display text-bone-bright leading-[0.95]">
            Deploy.
          </h2>
          <div className="mt-6 border border-void-border px-5 py-5 space-y-4 font-mono text-sm sm:text-base">
            <p>
              <span className="text-bone-ghost">$ </span>
              <span className="text-cyan-base">npx constructs install k-hole</span>
            </p>
            <p className="text-bone-muted">
              Deployed K-Hole — 5 skills, 5 commands
            </p>
            <p>
              <span className="text-bone-ghost">$ </span>
              <span className="text-bone-base">/dig &quot;LED display construction for WebGL&quot;</span>
            </p>
            <p className="text-bone-muted">
              16 grounded searches. 36 seconds. Depth over breadth.
            </p>
          </div>
        </section>

        {/* Create — for builders */}
        <section>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-display text-bone-bright leading-[0.95]">
            Create.
          </h2>
          <p className="mt-6 font-mono text-base leading-relaxed text-bone-dim">
            A construct is a repo with three files.
          </p>
          <div className="mt-6 border border-void-border px-5 py-5 space-y-3 font-mono text-sm sm:text-base">
            <p className="text-bone-base">construct.yaml</p>
            <p className="text-bone-muted pl-4">name, domain, what it composes with</p>
            <p className="text-bone-base mt-2">skills/your-skill/SKILL.md</p>
            <p className="text-bone-muted pl-4">what it knows, how it works</p>
            <p className="text-bone-base mt-2">identity/persona.yaml</p>
            <p className="text-bone-muted pl-4">voice, cognitive frame, expertise</p>
          </div>
        </section>

        <div>
          <Link
            href="/constructs"
            className="font-display text-xl uppercase tracking-display text-cyan-dim hover:text-bone-bright transition-colors"
          >
            Browse the roster &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

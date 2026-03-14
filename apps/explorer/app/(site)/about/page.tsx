import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About | Constructs Network',
  description: 'Named expertise for AI coding agents. Install once, invoke anytime.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <div className="space-y-24">
        {/* What it looks like to use one */}
        <section>
          <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-display text-bone-bright leading-[0.95]">
            Constructs
          </h1>
          <p className="mt-8 font-mono text-base sm:text-lg leading-relaxed text-bone-dim">
            Named expertise you deploy into your AI coding agent.
          </p>
          <div className="mt-10 border border-void-border px-5 py-5 space-y-4 font-mono text-sm sm:text-base">
            <p>
              <span className="text-bone-ghost">$ </span>
              <span className="text-cyan-base">npx constructs install observer</span>
            </p>
            <p className="text-bone-muted">
              Deployed Observer — 29 skills, 6 commands
            </p>
            <p>
              <span className="text-bone-ghost">$ </span>
              <span className="text-bone-base">/observe</span>
            </p>
            <p className="text-bone-muted">
              Capturing user feedback as hypothesis-first research...
            </p>
          </div>
        </section>

        {/* How they compose — grounded in what actually exists */}
        <section>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-display text-bone-bright leading-[0.95]">
            Compose
          </h2>
          <p className="mt-8 font-mono text-base sm:text-lg leading-relaxed text-bone-dim">
            Each construct declares what it works with.
            Deploy several — they share context through
            your project. Your creativity determines
            how they connect.
          </p>
        </section>

        {/* How to create — name the files, close the gap */}
        <section>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-display text-bone-bright leading-[0.95]">
            Create
          </h2>
          <p className="mt-8 font-mono text-base sm:text-lg leading-relaxed text-bone-dim">
            A construct is a repo with three files.
          </p>
          <div className="mt-10 border border-void-border px-5 py-5 space-y-3 font-mono text-sm sm:text-base">
            <p className="text-bone-base">construct.yaml</p>
            <p className="text-bone-muted pl-4">name, domain, what it composes with</p>
            <p className="text-bone-base mt-2">skills/your-skill/SKILL.md</p>
            <p className="text-bone-muted pl-4">what it knows, how it works</p>
            <p className="text-bone-base mt-2">identity/persona.yaml</p>
            <p className="text-bone-muted pl-4">voice, cognitive frame, expertise</p>
          </div>
          <div className="mt-6 border border-void-border px-5 py-4">
            <code className="font-mono text-sm sm:text-base text-bone-base">
              gh repo create my-org/construct-my-expertise \<br />
              {'  '}--template 0xHoneyJar/construct-base --private --clone
            </code>
          </div>
        </section>

        {/* Path into the network */}
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

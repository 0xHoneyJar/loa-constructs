import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | Constructs Network',
  description: 'Named expertise for AI coding agents. Install once, invoke anytime.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <div className="space-y-24">
        <section>
          <h1 className="font-display text-4xl sm:text-5xl uppercase tracking-display text-bone-bright leading-[0.95]">
            Constructs
          </h1>
          <p className="mt-8 font-mono text-base sm:text-lg leading-relaxed text-bone-dim">
            Named expertise you install into your AI coding agent.
            Identity, skills, and boundaries. One package.
          </p>
        </section>

        <section>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-display text-bone-bright leading-[0.95]">
            Compose
          </h2>
          <p className="mt-8 font-mono text-base sm:text-lg leading-relaxed text-bone-dim">
            Constructs declare what they work with.
            Install Observer and Artisan together — one captures
            user feedback, the other turns it into design tokens.
          </p>
        </section>

        <section>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-display text-bone-bright leading-[0.95]">
            Create
          </h2>
          <p className="mt-8 font-mono text-base sm:text-lg leading-relaxed text-bone-dim">
            A construct is a repo. Three files. Push. CI validates.
          </p>
          <div className="mt-8 border border-void-border bg-void-raised px-5 py-4">
            <code className="font-mono text-sm sm:text-base text-bone-base">
              gh repo create my-org/construct-my-expertise \<br />
              {'  '}--template 0xHoneyJar/construct-base --private --clone
            </code>
          </div>
        </section>
      </div>
    </div>
  );
}

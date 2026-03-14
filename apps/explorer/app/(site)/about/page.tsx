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
          <div className="mt-8 space-y-6 font-mono text-base sm:text-lg leading-relaxed text-bone-dim">
            <p>
              Named expertise you install into your AI coding agent.
              Identity, skills, and boundaries in a single package.
            </p>
            <p>
              Install Artisan and your agent decomposes design requests
              into feel, motion, and material. Install Observer and it
              captures user feedback as hypothesis-first research.
              Same agent. Different expertise installed.
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-display text-bone-bright leading-[0.95]">
            Composition
          </h2>
          <div className="mt-8 space-y-6 font-mono text-base sm:text-lg leading-relaxed text-bone-dim">
            <p>
              Observer captures feedback. Artisan turns it into design tokens.
              Protocol audits the contracts. Bridgebuilder reviews the code.
              Each one does its part.
            </p>
            <p>
              Constructs declare what they compose with. The network
              surfaces these connections.
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-display text-bone-bright leading-[0.95]">
            Create
          </h2>
          <div className="mt-8 space-y-6 font-mono text-base sm:text-lg leading-relaxed text-bone-dim">
            <p>
              Three files. Push. CI validates.
              Your methodology becomes installable.
            </p>
          </div>
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

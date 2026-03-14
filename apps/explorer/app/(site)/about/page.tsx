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
              Identity, skills, and boundaries. One package.
            </p>
            <p>
              Install Artisan — your agent decomposes design into
              feel, motion, and material. Install Observer — it captures
              user feedback as hypothesis-first research. Install both —
              they compose. Observer surfaces what users do. Artisan
              turns it into what the interface should feel like.
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-display text-bone-bright leading-[0.95]">
            The Bazaar
          </h2>
          <div className="mt-8 space-y-6 font-mono text-base sm:text-lg leading-relaxed text-bone-dim">
            <p>
              This is not a marketplace. There is no algorithm
              deciding what you see. No featured placement. No ranking
              by popularity.
            </p>
            <p>
              Every construct is a stall. You walk through. Something
              catches your eye — or it doesn&apos;t. Each construct
              declares what it composes with. Those connections
              are the person at the next stall pointing you
              three stalls down.
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-display text-bone-bright leading-[0.95]">
            Build a Stall
          </h2>
          <div className="mt-8 space-y-6 font-mono text-base sm:text-lg leading-relaxed text-bone-dim">
            <p>
              A construct is a repo. Three files define it:
              a manifest, a skill definition, and an identity.
              Push it. CI validates the schema. The network
              picks it up.
            </p>
            <p>
              Your methodology becomes something others can install.
              Design expertise. Security auditing. Research depth.
              Whatever you&apos;ve built that works — package it.
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

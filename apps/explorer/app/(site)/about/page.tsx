import type { Metadata } from 'next';
import Link from 'next/link';
import { BackButton } from '@/components/layout/back-button';

export const metadata: Metadata = {
  title: 'About | Constructs Network',
  description: 'Named expertise for AI coding agents. Install once, invoke anytime.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back navigation */}
      <div className="mb-8">
        <BackButton />
      </div>

      {/* Content */}
      <div className="space-y-12">
        {/* What are Constructs */}
        <section className="space-y-4">
          <h1 className="font-mono text-sm font-semibold uppercase tracking-wider text-bone-base">
            What are Constructs?
          </h1>

          <div className="space-y-4 text-sm leading-relaxed text-bone-dim">
            <p>
              A construct is a named unit of expertise — identity, skills, and
              boundaries — that you install into your AI coding agent.
            </p>

            <p>
              Your agent doesn&apos;t just get new capabilities. It gets a new
              way of seeing problems.
            </p>

            <p>
              Ask a generic agent for help with design. You get generic output.
              Install a Craftsman construct — depth-5 design systems — and it
              decomposes your request into feel, motion, and material.
              Same agent. Different expertise installed.
            </p>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* How They Compose */}
        <section className="space-y-4">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-bone-base">
            Composition
          </h2>

          <div className="space-y-4 text-sm leading-relaxed text-bone-dim">
            <p>Constructs aren&apos;t solo. They compose.</p>

            <p>
              Observer captures user feedback. Artisan turns it into design
              tokens. Protocol audits the contracts. Bridgebuilder reviews
              the code. Each one does its part.
            </p>

            <p>
              The graph shows these relationships. Constructs that work
              together appear connected.
            </p>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Create */}
        <section className="space-y-4">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-bone-base">
            Create Your Own
          </h2>

          <div className="space-y-4 text-sm leading-relaxed text-bone-dim">
            <p>
              Edit three files. Push. CI validates automatically.
            </p>

            <p>
              Your methodology becomes installable. Others
              benefit from your expertise without you being in the room.
            </p>
          </div>

          <div className="rounded-md border border-border bg-surface/50 p-4">
            <code className="font-mono text-sm text-bone-base">
              gh repo create my-org/construct-my-expertise \<br />
              {'  '}--template 0xHoneyJar/construct-base --private --clone
            </code>
          </div>
        </section>

        {/* Back link */}
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-cyan-dim hover:text-bone-bright transition-colors"
          >
            <span>→</span>
            <span>Explore the Network</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

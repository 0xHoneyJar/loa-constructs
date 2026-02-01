import type { Metadata } from 'next';
import Link from 'next/link';
import { BackButton } from '@/components/layout/back-button';

export const metadata: Metadata = {
  title: 'About | Constructs Explorer',
  description: 'What are constructs? Preserved expertise you jack into your agent.',
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
          <h1 className="font-mono text-sm font-semibold uppercase tracking-wider text-white">
            What are Constructs?
          </h1>

          <div className="space-y-4 text-sm leading-relaxed text-white/70">
            <p>
              In Neuromancer, a construct is preserved consciousness—the
              expertise of a master, stored and invokable.
            </p>

            <p>
              Our constructs work the same way. Each one packages domain
              expertise into your AI agent. Install once, invoke anytime.
            </p>

            <p>
              The network shows how they compose. Marketing feeds into launch
              planning. Security audits gate deployment. Expertise that stacks.
            </p>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Shared Execution */}
        <section className="space-y-4">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-white">
            Shared Execution
          </h2>

          <div className="space-y-4 text-sm leading-relaxed text-white/70">
            <p>One construct, many agents.</p>

            <p>
              Your GTM workflow becomes your team&apos;s GTM workflow. Expertise
              compounds across organizations.
            </p>

            <p>This is the network effect of agent capabilities.</p>
          </div>
        </section>

        {/* Back link */}
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-domain-docs hover:text-white transition-colors"
          >
            <span>→</span>
            <span>Explore Constructs</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

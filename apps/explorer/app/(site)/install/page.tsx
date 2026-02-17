import Link from 'next/link';

export const metadata = {
  title: 'Install | Constructs',
  description: 'How to install and use constructs with Claude Code',
};

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-md border border-border bg-surface/50 p-4">
        <code className="font-mono text-sm text-white">{children}</code>
      </pre>
    </div>
  );
}

export default function InstallPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-white/40 transition-colors hover:text-white"
      >
        <span>←</span>
        <span>Back to Graph</span>
      </Link>

      <h1 className="mb-8 font-mono text-2xl font-semibold uppercase tracking-wider text-white">
        Installation
      </h1>

      {/* Prerequisites */}
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-domain-docs">
          Prerequisites
        </h2>
        <ul className="space-y-2 text-sm text-white/60">
          <li className="flex items-start gap-2">
            <span className="text-domain-dev">✓</span>
            <span>Claude Code CLI installed and authenticated</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-domain-dev">✓</span>
            <span>Node.js 18+ (for some constructs)</span>
          </li>
        </ul>
      </section>

      {/* Steps */}
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-domain-docs">
          Installation Steps
        </h2>

        <div className="space-y-8">
          {/* Step 1 */}
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-domain-gtm font-mono text-xs text-domain-gtm">
                1
              </span>
              <h3 className="font-mono text-sm font-medium uppercase text-white">
                Browse Available Packs
              </h3>
            </div>
            <CodeBlock>/constructs</CodeBlock>
            <p className="mt-2 text-xs text-white/40">
              Opens the multi-select UI to browse and select packs
            </p>
          </div>

          {/* Step 2 */}
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-domain-gtm font-mono text-xs text-domain-gtm">
                2
              </span>
              <h3 className="font-mono text-sm font-medium uppercase text-white">
                Select Packs to Install
              </h3>
            </div>
            <p className="text-sm text-white/60">
              Choose one or more packs from the selection UI. Each pack contains multiple skills.
            </p>
          </div>

          {/* Step 3 */}
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-domain-gtm font-mono text-xs text-domain-gtm">
                3
              </span>
              <h3 className="font-mono text-sm font-medium uppercase text-white">
                Use the Skills
              </h3>
            </div>
            <CodeBlock>/interview</CodeBlock>
            <p className="mt-2 text-xs text-white/40">
              Each pack installs multiple slash commands you can invoke directly
            </p>
          </div>
        </div>
      </section>

      {/* Direct Install */}
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-domain-docs">
          Direct Install
        </h2>
        <p className="mb-4 text-sm text-white/60">
          Install a specific pack directly without the selection UI:
        </p>
        <div className="rounded-md border border-border bg-surface/50 p-4">
          <code className="font-mono text-sm text-white">/constructs install observer</code>
        </div>
      </section>

      {/* Pro Packs */}
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-domain-docs">
          Pro Packs
        </h2>
        <p className="mb-4 text-sm text-white/60">
          Some packs require authentication. Set up your API key:
        </p>
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-surface/50 p-4">
            <code className="font-mono text-sm text-white">/constructs auth setup</code>
          </div>
          <p className="text-xs text-white/40">
            Get your API key from{' '}
            <a
              href="https://loa-constructs.dev/account"
              target="_blank"
              rel="noopener noreferrer"
              className="text-domain-docs hover:text-white"
            >
              loa-constructs.dev/account
            </a>
          </p>
        </div>
      </section>

      {/* Other Commands */}
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-domain-docs">
          Other Commands
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <code className="font-mono text-white/80">/constructs list</code>
            <span className="text-white/40">List installed packs</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <code className="font-mono text-white/80">/constructs update</code>
            <span className="text-white/40">Check for updates</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <code className="font-mono text-white/80">/constructs uninstall &lt;pack&gt;</code>
            <span className="text-white/40">Remove a pack</span>
          </div>
          <div className="flex items-center justify-between">
            <code className="font-mono text-white/80">/constructs auth</code>
            <span className="text-white/40">Check auth status</span>
          </div>
        </div>
      </section>

      {/* Links */}
      <section>
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-domain-docs">
          Resources
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <a
              href="https://github.com/anthropics/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="text-domain-docs transition-colors hover:text-white"
            >
              Claude Code Documentation →
            </a>
          </li>
          <li>
            <a
              href="https://github.com/0xHoneyJar/loa-constructs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-domain-docs transition-colors hover:text-white"
            >
              Constructs Registry GitHub →
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}

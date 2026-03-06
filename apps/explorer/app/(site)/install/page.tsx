import Link from 'next/link';

export const metadata = {
  title: 'Install | Constructs Network',
  description: 'Install named expertise into your AI coding agent',
};

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="group relative">
      <pre className="overflow-x-auto border border-void-border bg-white/[0.02] p-4">
        <code className="font-mono text-smtext-bone-base">{children}</code>
      </pre>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center border border-bone-ghost font-mono text-xs text-bone-dim">
          {number}
        </span>
        <h3 className="font-mono text-sm font-mediumtext-bone-base">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function InstallPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 font-mono text-xs text-bone-ghost transition-colors hover:text-bone-bright"
      >
        ← Back
      </Link>

      <h1 className="mb-2 font-mono text-2xl font-boldtext-bone-base">
        Install a Construct
      </h1>
      <p className="mb-10 font-mono text-sm text-bone-muted">
        Named expertise for your AI coding agent. No account required for free constructs.
      </p>

      {/* CLI */}
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-bone-ghost">
          With the CLI
        </h2>

        <div className="space-y-8">
          <Step number={1} title="Browse what's available">
            <CodeBlock>npx @loa-constructs/cli list</CodeBlock>
            <p className="mt-2 text-xs text-bone-ghost">
              Or search: <code className="text-bone-dim">npx @loa-constructs/cli find &quot;design&quot;</code>
            </p>
          </Step>

          <Step number={2} title="Get details on a construct">
            <CodeBlock>npx @loa-constructs/cli info observer</CodeBlock>
            <p className="mt-2 text-xs text-bone-ghost">
              See skills, commands, expertise domains, and install instructions.
            </p>
          </Step>

          <Step number={3} title="Install">
            <CodeBlock>npx @loa-constructs/cli install observer</CodeBlock>
            <p className="mt-2 text-xs text-bone-ghost">
              Downloads to <code className="text-bone-dim">.claude/constructs/packs/observer/</code>
            </p>
          </Step>

          <Step number={4} title="Use the skills">
            <CodeBlock>/observing-users</CodeBlock>
            <p className="mt-2 text-xs text-bone-ghost">
              Each construct installs slash commands you invoke directly in Claude Code.
            </p>
          </Step>
        </div>
      </section>

      {/* With Loa */}
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-bone-ghost">
          With Loa Framework
        </h2>
        <p className="mb-4 text-sm text-bone-muted">
          If you have the Loa framework installed, constructs integrate directly:
        </p>
        <div className="space-y-3">
          <CodeBlock>/constructs</CodeBlock>
          <p className="text-xs text-bone-ghost">
            Opens the interactive browser to select and install packs.
          </p>
          <CodeBlock>/constructs install observer</CodeBlock>
          <p className="text-xs text-bone-ghost">
            Direct install by slug.
          </p>
        </div>
      </section>

      {/* Create Your Own */}
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-bone-ghost">
          Create Your Own
        </h2>
        <p className="mb-4 text-sm text-bone-muted">
          Name your repo <code className="text-bone-dim">construct-*</code> in your GitHub org
          and it auto-discovers on the network.
        </p>
        <CodeBlock>{`gh repo create my-org/construct-my-expertise \\
  --template 0xHoneyJar/construct-base --clone`}</CodeBlock>
        <p className="mt-2 text-xs text-bone-ghost">
          Edit three files. Push. CI validates. Your expertise is installable.
        </p>
      </section>

      {/* API */}
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-bone-ghost">
          API
        </h2>
        <p className="mb-4 text-sm text-bone-muted">
          Every construct is accessible via REST. No auth for public reads.
        </p>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex items-start gap-3 border-b border-void-border pb-2">
            <span className="text-bone-ghost w-12 shrink-0">GET</span>
            <code className="text-bone-dim">/v1/constructs</code>
            <span className="text-bone-ghost ml-auto">List all</span>
          </div>
          <div className="flex items-start gap-3 border-b border-void-border pb-2">
            <span className="text-bone-ghost w-12 shrink-0">GET</span>
            <code className="text-bone-dim">/v1/constructs/:slug</code>
            <span className="text-bone-ghost ml-auto">Details</span>
          </div>
          <div className="flex items-start gap-3 border-b border-void-border pb-2">
            <span className="text-bone-ghost w-12 shrink-0">GET</span>
            <code className="text-bone-dim">/v1/constructs/summary</code>
            <span className="text-bone-ghost ml-auto">Agent-optimized</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-bone-ghost w-12 shrink-0">HEAD</span>
            <code className="text-bone-dim">/v1/constructs/:slug</code>
            <span className="text-bone-ghost ml-auto">Exists?</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-bone-ghost">
          Base: <code>https://api.constructs.network/v1</code>
        </p>
      </section>

      {/* Links */}
      <section>
        <div className="flex gap-4 text-xs font-mono">
          <Link href="/constructs" className="text-bone-muted hover:text-bone-bright transition-colors">
            Browse Constructs →
          </Link>
          <a
            href="https://github.com/0xHoneyJar/construct-base"
            target="_blank"
            rel="noopener noreferrer"
            className="text-bone-muted hover:text-bone-bright transition-colors"
          >
            Template Repo →
          </a>
          <a
            href="https://github.com/0xHoneyJar/loa-constructs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-bone-muted hover:text-bone-bright transition-colors"
          >
            Registry →
          </a>
        </div>
      </section>
    </div>
  );
}

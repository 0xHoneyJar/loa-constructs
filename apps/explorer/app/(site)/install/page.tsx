import Link from 'next/link';

export const metadata = {
  title: 'Install | Constructs Network',
  description: 'Install named expertise into your AI coding agent',
};

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="group relative">
      <pre className="overflow-x-auto border border-white/10 bg-white/[0.02] p-4">
        <code className="font-mono text-sm text-white">{children}</code>
      </pre>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center border border-white/20 font-mono text-xs text-white/60">
          {number}
        </span>
        <h3 className="font-mono text-sm font-medium text-white">{title}</h3>
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
        className="mb-8 inline-flex items-center gap-2 font-mono text-xs text-white/40 transition-colors hover:text-white"
      >
        ← Back
      </Link>

      <h1 className="mb-2 font-mono text-2xl font-bold text-white">
        Install a Construct
      </h1>
      <p className="mb-10 font-mono text-sm text-white/50">
        Named expertise for your AI coding agent. No account required for free constructs.
      </p>

      {/* CLI */}
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-white/40">
          With the CLI
        </h2>

        <div className="space-y-8">
          <Step number={1} title="Browse what's available">
            <CodeBlock>npx @loa-constructs/cli list</CodeBlock>
            <p className="mt-2 text-xs text-white/40">
              Or search: <code className="text-white/60">npx @loa-constructs/cli find &quot;design&quot;</code>
            </p>
          </Step>

          <Step number={2} title="Get details on a construct">
            <CodeBlock>npx @loa-constructs/cli info observer</CodeBlock>
            <p className="mt-2 text-xs text-white/40">
              See skills, commands, expertise domains, and install instructions.
            </p>
          </Step>

          <Step number={3} title="Install">
            <CodeBlock>npx @loa-constructs/cli install observer</CodeBlock>
            <p className="mt-2 text-xs text-white/40">
              Downloads to <code className="text-white/60">.claude/constructs/packs/observer/</code>
            </p>
          </Step>

          <Step number={4} title="Use the skills">
            <CodeBlock>/observing-users</CodeBlock>
            <p className="mt-2 text-xs text-white/40">
              Each construct installs slash commands you invoke directly in Claude Code.
            </p>
          </Step>
        </div>
      </section>

      {/* With Loa */}
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-white/40">
          With Loa Framework
        </h2>
        <p className="mb-4 text-sm text-white/50">
          If you have the Loa framework installed, constructs integrate directly:
        </p>
        <div className="space-y-3">
          <CodeBlock>/constructs</CodeBlock>
          <p className="text-xs text-white/40">
            Opens the interactive browser to select and install packs.
          </p>
          <CodeBlock>/constructs install observer</CodeBlock>
          <p className="text-xs text-white/40">
            Direct install by slug.
          </p>
        </div>
      </section>

      {/* Create Your Own */}
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-white/40">
          Create Your Own
        </h2>
        <p className="mb-4 text-sm text-white/50">
          Name your repo <code className="text-white/60">construct-*</code> in your GitHub org
          and it auto-discovers on the network.
        </p>
        <CodeBlock>{`gh repo create my-org/construct-my-expertise \\
  --template 0xHoneyJar/construct-base --clone`}</CodeBlock>
        <p className="mt-2 text-xs text-white/40">
          Edit three files. Push. CI validates. Your expertise is installable.
        </p>
      </section>

      {/* API */}
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-white/40">
          API
        </h2>
        <p className="mb-4 text-sm text-white/50">
          Every construct is accessible via REST. No auth for public reads.
        </p>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex items-start gap-3 border-b border-white/5 pb-2">
            <span className="text-white/30 w-12 shrink-0">GET</span>
            <code className="text-white/60">/v1/constructs</code>
            <span className="text-white/30 ml-auto">List all</span>
          </div>
          <div className="flex items-start gap-3 border-b border-white/5 pb-2">
            <span className="text-white/30 w-12 shrink-0">GET</span>
            <code className="text-white/60">/v1/constructs/:slug</code>
            <span className="text-white/30 ml-auto">Details</span>
          </div>
          <div className="flex items-start gap-3 border-b border-white/5 pb-2">
            <span className="text-white/30 w-12 shrink-0">GET</span>
            <code className="text-white/60">/v1/constructs/summary</code>
            <span className="text-white/30 ml-auto">Agent-optimized</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-white/30 w-12 shrink-0">HEAD</span>
            <code className="text-white/60">/v1/constructs/:slug</code>
            <span className="text-white/30 ml-auto">Exists?</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/30">
          Base: <code>https://api.constructs.network/v1</code>
        </p>
      </section>

      {/* Links */}
      <section>
        <div className="flex gap-4 text-xs font-mono">
          <Link href="/constructs" className="text-white/50 hover:text-white transition-colors">
            Browse Constructs →
          </Link>
          <a
            href="https://github.com/0xHoneyJar/construct-base"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 hover:text-white transition-colors"
          >
            Template Repo →
          </a>
          <a
            href="https://github.com/0xHoneyJar/loa-constructs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 hover:text-white transition-colors"
          >
            Registry →
          </a>
        </div>
      </section>
    </div>
  );
}

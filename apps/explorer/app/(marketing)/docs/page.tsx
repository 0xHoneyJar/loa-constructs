import Link from 'next/link';

export const revalidate = 86400;

export const metadata = {
  title: 'Documentation',
  description: 'Learn how to use the Constructs Network and build AI agent skills.',
};

const sections = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Installation', href: '/install', description: 'Install the Loa CLI and get started.' },
      { label: 'Your First Construct', href: '/docs', description: 'Create and publish your first construct.' },
      { label: 'Configuration', href: '/docs', description: 'Configure your workspace and constructs.' },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { label: 'Skills', href: '/docs', description: 'Individual AI agent capabilities.' },
      { label: 'Packs', href: '/docs', description: 'Curated collections of skills.' },
      { label: 'Identity', href: '/docs', description: 'Cognitive frames and voice configuration.' },
    ],
  },
  {
    title: 'Publishing',
    items: [
      { label: 'Pack Manifest', href: '/docs', description: 'Structure and validate your pack manifest.' },
      { label: 'Git Distribution', href: '/docs', description: 'Distribute constructs via Git repositories.' },
      { label: 'Registry API', href: '/docs', description: 'Programmatic access to the registry.' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'API Reference', href: '/docs', description: 'Complete REST API documentation.' },
      { label: 'CLI Reference', href: '/docs', description: 'All CLI commands and options.' },
      { label: 'GitHub', href: 'https://github.com/0xHoneyJar/loa', description: 'Source code and contributions.' },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-mono font-bold text-white">Documentation</h1>
        <p className="text-sm font-mono text-white/60 mt-1">
          Everything you need to build and publish AI agent constructs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-mono font-bold text-white mb-3">{section.title}</h2>
            <div className="space-y-2">
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block border border-white/10 p-3 hover:border-white/30 transition-colors"
                  {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  <p className="text-xs font-mono text-white">{item.label}</p>
                  <p className="text-xs font-mono text-white/40 mt-0.5">{item.description}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

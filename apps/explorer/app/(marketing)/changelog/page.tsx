export const revalidate = 3600;

export const metadata = {
  title: 'Changelog',
  description: 'What\'s new in the Constructs Network.',
};

const releases = [
  {
    version: 'v1.5.0',
    date: '2026-02-10',
    title: 'Tooling Modernization Phase 2',
    changes: [
      'All 5 packs at schema_version 3',
      'Topology validation with 8 CI-gated checks',
      'Capability metadata on all 39 skills',
      'Pack dependencies and events support',
    ],
  },
  {
    version: 'v1.2.0',
    date: '2026-01-28',
    title: 'Forge Consolidation',
    changes: [
      'Unified pack manifest format',
      'MCP servers moved to network-level registry',
      'Schema validation via Zod',
    ],
  },
  {
    version: 'v1.0.2',
    date: '2026-01-15',
    title: 'Infrastructure Migration',
    changes: [
      'Migrated from Fly.io to Railway',
      'Migrated from Neon to Supabase',
      'Improved API performance',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-mono font-bold text-white">Changelog</h1>
        <p className="text-sm font-mono text-white/60 mt-1">What&apos;s new in the Constructs Network.</p>
      </div>

      <div className="space-y-6">
        {releases.map((release) => (
          <div key={release.version} className="border-l-2 border-white/10 pl-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono font-bold text-white">{release.version}</span>
              <span className="text-[10px] font-mono text-white/40">
                {new Date(release.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <p className="text-xs font-mono text-white/60 mb-2">{release.title}</p>
            <ul className="space-y-1">
              {release.changes.map((change, i) => (
                <li key={i} className="text-xs font-mono text-white/40 flex items-start gap-2">
                  <span className="text-white/20">·</span>
                  {change}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

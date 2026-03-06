'use client';

import { use } from 'react';
import Link from 'next/link';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { getAuthClient } from '@/components/auth/auth-initializer';

interface SkillDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  long_description: string | null;
  version: string | null;
  category: string | null;
  tier_required: string;
  downloads: number;
  rating: number | null;
  owner: { name: string } | null;
  updated_at: string;
  tags: string[];
  features: string[];
  requirements: string[];
  versions: Array<{ version: string; is_latest: boolean; published_at: string }>;
}

export default function SkillDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const { data: skill, isLoading } = useQuery<SkillDetail>({
    queryKey: ['skill-detail', slug],
    queryFn: async () => {
      const client = getAuthClient();
      const res = await client.get<{ data: SkillDetail }>(`/constructs/${slug}`);
      return res.data;
    },
  });

  if (isLoading) {
    return <p className="text-sm font-mono text-bone-muted">Loading skill...</p>;
  }

  if (!skill) {
    return (
      <Panel title="Not Found" variant="danger">
        <p className="text-xs font-mono text-crimson-base">Skill &quot;{slug}&quot; not found.</p>
        <Link href="/skills" className="text-xs font-mono text-cyan-base hover:underline mt-2 block">
          ← Back to browser
        </Link>
      </Panel>
    );
  }

  const installCmd = `loa install ${skill.slug}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/skills" className="text-xs font-mono text-bone-muted hover:text-bone-base">
          ← Back
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-mono text-bone-bright">{skill.name}</h1>
            {skill.version && (
              <span className="text-xs font-mono text-bone-muted">v{skill.version}</span>
            )}
            <span className="border border-cyan-base px-2 py-0.5 text-[10px] font-mono text-cyan-base uppercase">
              {skill.tier_required}
            </span>
          </div>
          {skill.category && (
            <p className="text-xs font-mono text-bone-muted mt-1">{skill.category}</p>
          )}
        </div>
      </div>

      {/* Info Table */}
      <Panel title="Info">
        <div className="space-y-2 text-xs font-mono">
          {skill.owner && (
            <div className="flex justify-between">
              <span className="text-bone-muted">Author</span>
              <span className="text-bone-base">{skill.owner.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-bone-muted">Downloads</span>
            <span className="text-bone-base">{skill.downloads.toLocaleString()}</span>
          </div>
          {skill.rating !== null && (
            <div className="flex justify-between">
              <span className="text-bone-muted">Rating</span>
              <span className="text-bone-base">{skill.rating.toFixed(1)}/5</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-bone-muted">Updated</span>
            <span className="text-bone-base">{new Date(skill.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </Panel>

      {/* Description */}
      {skill.description && (
        <Panel title="Description">
          <p className="text-xs font-mono text-bone-base whitespace-pre-wrap">{skill.long_description || skill.description}</p>
        </Panel>
      )}

      {/* Install */}
      <Panel title="Install">
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-black/50 border border-void-border px-3 py-2 text-xs font-mono text-cyan-base">
            {installCmd}
          </code>
          <Button
            variant="secondary"
            onClick={() => navigator.clipboard.writeText(installCmd)}
          >
            Copy
          </Button>
        </div>
      </Panel>

      {/* Tags */}
      {skill.tags?.length > 0 && (
        <Panel title="Tags">
          <div className="flex flex-wrap gap-2">
            {skill.tags.map((tag) => (
              <span key={tag} className="border border-void-border px-2 py-0.5 text-[10px] font-mono text-bone-muted">
                {tag}
              </span>
            ))}
          </div>
        </Panel>
      )}

      {/* Versions */}
      {skill.versions?.length > 0 && (
        <Panel title="Versions">
          <div className="space-y-1">
            {skill.versions.map((v) => (
              <div key={v.version} className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-bone-base">{v.version}</span>
                  {v.is_latest && (
                    <span className="border border-cyan-base px-1 text-[10px] text-cyan-base">LATEST</span>
                  )}
                </div>
                <span className="text-bone-muted">{new Date(v.published_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

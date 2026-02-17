import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 600;

const API_BASE = process.env.CONSTRUCTS_API_URL || 'https://api.constructs.network/v1';

interface CreatorProfile {
  name: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  reputation: number;
  trustScore: number;
  constructs: Array<{
    slug: string;
    name: string;
    description: string | null;
    downloads: number;
    type: string;
  }>;
}

async function fetchCreatorProfile(username: string): Promise<CreatorProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/creators/${username}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const creator = await fetchCreatorProfile(username);
  if (!creator) return { title: 'Creator Not Found' };
  return {
    title: creator.name,
    description: creator.bio || `${creator.name}'s constructs on the Constructs Network.`,
  };
}

export default async function CreatorProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const creator = await fetchCreatorProfile(username);

  if (!creator) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-lg font-mono text-white mb-2">Creator Not Found</h1>
        <p className="text-sm font-mono text-white/60">No creator with username &quot;{username}&quot;.</p>
        <Link href="/constructs" className="text-xs font-mono text-white/40 hover:text-white mt-4 block">
          ← Browse constructs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 border border-white/20 flex items-center justify-center text-2xl font-mono text-white/60">
          {creator.name[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-mono font-bold text-white">{creator.name}</h1>
          <p className="text-xs font-mono text-white/40">@{creator.username}</p>
          {creator.bio && <p className="text-sm font-mono text-white/60 mt-1">{creator.bio}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
        <div className="border border-white/10 p-3">
          <p className="text-white/40 mb-1">Reputation</p>
          <p className="text-white text-lg">{creator.reputation}</p>
        </div>
        <div className="border border-white/10 p-3">
          <p className="text-white/40 mb-1">Trust Score</p>
          <p className="text-white text-lg">{creator.trustScore}%</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-mono font-bold text-white mb-3">
          Published Constructs ({creator.constructs.length})
        </h2>
        {creator.constructs.length === 0 ? (
          <p className="text-xs font-mono text-white/40">No published constructs yet.</p>
        ) : (
          <div className="space-y-2">
            {creator.constructs.map((c) => (
              <Link
                key={c.slug}
                href={`/constructs/${c.slug}`}
                className="flex items-center justify-between border border-white/10 p-3 hover:border-white/30 transition-colors"
              >
                <div>
                  <span className="text-xs font-mono text-white">{c.name}</span>
                  <span className="text-[10px] font-mono text-white/40 ml-2 uppercase">{c.type}</span>
                  {c.description && (
                    <p className="text-xs font-mono text-white/40 mt-0.5 truncate max-w-md">{c.description}</p>
                  )}
                </div>
                <span className="text-[10px] font-mono text-white/30">{c.downloads.toLocaleString()} ↓</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

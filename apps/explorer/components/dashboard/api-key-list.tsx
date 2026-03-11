'use client';

import { useState, useEffect } from 'react';
import { type ApiKey, revokeKey } from '@/lib/api/keys';

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ApiKeyList({
  keys,
  onRevoke,
}: {
  keys: ApiKey[];
  onRevoke: () => void;
}) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleRevoke = async (id: string) => {
    setConfirming(null);
    setRevoking(id);
    try {
      await revokeKey(id);
      onRevoke();
    } catch {
      setError(id);
    } finally {
      setRevoking(null);
    }
  };

  if (keys.length === 0) {
    return (
      <div className="border border-void-border p-8 text-center">
        <div className="font-mono text-xs text-bone-muted">
          No API keys yet
        </div>
        <div className="mt-1 font-mono text-[9px] text-bone-ghost">
          Create your first key to get started
        </div>
      </div>
    );
  }

  return (
    <div className="border border-void-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-void-border">
            <th className="px-4 py-2 text-left font-mono text-[9px] text-bone-muted uppercase tracking-widest">
              Prefix
            </th>
            <th className="px-4 py-2 text-left font-mono text-[9px] text-bone-muted uppercase tracking-widest">
              Name
            </th>
            <th className="px-4 py-2 text-left font-mono text-[9px] text-bone-muted uppercase tracking-widest">
              Scopes
            </th>
            <th className="px-4 py-2 text-left font-mono text-[9px] text-bone-muted uppercase tracking-widest">
              Last Used
            </th>
            <th className="px-4 py-2 text-right font-mono text-[9px] text-bone-muted uppercase tracking-widest">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr
              key={key.id}
              className="border-b border-void-border/50 last:border-b-0"
            >
              <td className="px-4 py-2.5 font-mono text-[11px] text-bone-dim">
                {key.keyPrefix}...
              </td>
              <td className="px-4 py-2.5 font-mono text-[11px] text-bone-base">
                {key.name}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex gap-1 flex-wrap">
                  {key.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="font-mono text-[8px] text-cyan-base/60 border border-cyan-base/20 px-1 py-0.5"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-2.5 font-mono text-[10px] text-bone-muted">
                {formatRelativeTime(key.lastUsedAt)}
              </td>
              <td className="px-4 py-2.5 text-right">
                {error === key.id ? (
                  <span className="font-mono text-[9px] text-red-400 uppercase tracking-wider animate-[fadeOut_3s_ease-in_forwards]">
                    Failed to revoke
                  </span>
                ) : confirming === key.id ? (
                  <span className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="font-mono text-[9px] text-red-400 hover:text-red-300 uppercase tracking-wider transition-colors"
                    >
                      Confirm?
                    </button>
                    <button
                      onClick={() => setConfirming(null)}
                      className="font-mono text-[9px] text-bone-muted hover:text-bone-dim uppercase tracking-wider transition-colors"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirming(key.id)}
                    disabled={revoking === key.id}
                    className="font-mono text-[9px] text-red-400/60 hover:text-red-400 uppercase tracking-wider disabled:opacity-50 transition-colors"
                  >
                    {revoking === key.id ? 'Revoking...' : 'Revoke'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

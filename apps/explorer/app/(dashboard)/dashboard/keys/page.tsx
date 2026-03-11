'use client';

import { useEffect, useState, useCallback } from 'react';
import { listKeys, type ApiKey } from '@/lib/api/keys';
import { ApiKeyList } from '@/components/dashboard/api-key-list';
import { CreateKeyDialog } from '@/components/dashboard/create-key-dialog';

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listKeys();
      setKeys(result);
    } catch {
      // Silently fail — empty list shown
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-lg text-bone-base">API Keys</h1>
        <button
          onClick={() => setDialogOpen(true)}
          className="font-mono text-[9px] text-void-base bg-cyan-base/80 hover:bg-cyan-base px-3 py-1.5 uppercase tracking-wider transition-colors"
        >
          Create Key
        </button>
      </div>

      {loading ? (
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
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-void-border/50 last:border-b-0">
                  <td className="px-4 py-2.5">
                    <div className="animate-pulse bg-void-raised rounded-none h-3 w-16" />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="animate-pulse bg-void-raised rounded-none h-3 w-24" />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="animate-pulse bg-void-raised rounded-none h-3 w-20" />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="animate-pulse bg-void-raised rounded-none h-3 w-12" />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="animate-pulse bg-void-raised rounded-none h-3 w-10 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ApiKeyList keys={keys} onRevoke={loadKeys} />
      )}

      <CreateKeyDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={loadKeys}
      />
    </div>
  );
}

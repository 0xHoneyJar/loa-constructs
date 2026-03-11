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
        <h1 className="font-mono text-lg text-bone-light">API Keys</h1>
        <button
          onClick={() => setDialogOpen(true)}
          className="font-mono text-[9px] text-void-base bg-cyan-base/80 hover:bg-cyan-base px-3 py-1.5 uppercase tracking-wider transition-colors"
        >
          Create Key
        </button>
      </div>

      {loading ? (
        <div className="font-mono text-xs text-bone-light/30">
          Loading keys...
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

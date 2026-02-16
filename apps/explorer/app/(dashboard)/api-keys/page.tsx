'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Panel } from '@/components/ui/panel';
import { FormInput } from '@/components/ui/form-input';
import { Button } from '@/components/ui/button';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '@/lib/api/hooks';

const createKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(64, 'Name too long'),
});

type CreateKeyFormData = z.infer<typeof createKeySchema>;

export default function ApiKeysPage() {
  const { data: keys, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateKeyFormData>({
    resolver: zodResolver(createKeySchema),
    defaultValues: { name: '' },
  });

  const onSubmit = async (data: CreateKeyFormData) => {
    const result = await createKey.mutateAsync(data);
    setNewKey(result.fullKey);
    setShowCreate(false);
    reset();
  };

  const handleRevoke = (keyId: string) => {
    if (confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
      revokeKey.mutate(keyId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-mono text-tui-bright">API Keys</h1>
          <p className="text-xs font-mono text-tui-dim mt-1">Manage your API keys for programmatic access.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Key'}
        </Button>
      </div>

      {/* New key display */}
      {newKey && (
        <Panel title="New Key Created" variant="danger">
          <div className="space-y-2">
            <p className="text-xs font-mono text-tui-yellow">
              Copy this key now. It will not be shown again.
            </p>
            <code className="block bg-black/50 border border-tui-border px-3 py-2 text-xs font-mono text-tui-green break-all">
              {newKey}
            </code>
            <Button variant="secondary" onClick={() => {
              navigator.clipboard.writeText(newKey);
              setNewKey(null);
            }}>
              Copy & dismiss
            </Button>
          </div>
        </Panel>
      )}

      {/* Create form */}
      {showCreate && (
        <Panel title="Create API Key">
          <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3 items-end">
            <div className="flex-1">
              <FormInput
                label="Key Name"
                placeholder="e.g., production-server"
                error={errors.name?.message}
                {...register('name')}
              />
            </div>
            <Button type="submit" disabled={createKey.isPending}>
              {createKey.isPending ? 'Creating...' : 'Create'}
            </Button>
          </form>
        </Panel>
      )}

      {/* Key list */}
      <Panel title="Active Keys">
        {isLoading ? (
          <p className="text-xs font-mono text-tui-dim">Loading keys...</p>
        ) : !keys?.length ? (
          <p className="text-xs font-mono text-tui-dim">No API keys yet. Create one to get started.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between border border-tui-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-mono text-tui-fg">{key.name}</p>
                  <p className="text-xs font-mono text-tui-dim">
                    {key.prefix}... &middot; Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => handleRevoke(key.id)}
                  disabled={revokeKey.isPending}
                  className="text-tui-red hover:bg-tui-red/10"
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

/**
 * API Keys Page (TUI Style)
 * @see sprint.md T20.6: Redesign API Keys Page
 */

'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiInput, TuiSelect } from '@/components/tui/tui-input';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiH1, TuiDim, TuiCode, TuiSuccess, TuiError, TuiTag } from '@/components/tui/tui-text';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string | null;
  lastUsed: string | null;
}

const mockApiKeys: ApiKey[] = [
  {
    id: '1',
    name: 'CI/CD Integration',
    prefix: 'loa_sk_1234',
    scopes: ['read', 'install'],
    createdAt: '2024-11-15',
    expiresAt: null,
    lastUsed: '2024-12-30',
  },
  {
    id: '2',
    name: 'Development',
    prefix: 'loa_sk_5678',
    scopes: ['read', 'write', 'install'],
    createdAt: '2024-12-01',
    expiresAt: '2025-12-01',
    lastUsed: '2024-12-28',
  },
  {
    id: '3',
    name: 'Testing',
    prefix: 'loa_sk_9012',
    scopes: ['read'],
    createdAt: '2024-12-20',
    expiresAt: '2025-03-20',
    lastUsed: null,
  },
];

const availableScopes = [
  { id: 'read', name: 'Read', description: 'Read skills and account info' },
  { id: 'write', name: 'Write', description: 'Create and update skills' },
  { id: 'install', name: 'Install', description: 'Install and uninstall skills' },
  { id: 'admin', name: 'Admin', description: 'Full account access' },
];

const expiryOptions = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: 'never', label: 'Never expires' },
];

const createKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  expiry: z.string(),
  scopes: z.array(z.string()).min(1, 'Select at least one scope'),
});

type CreateKeyFormData = z.infer<typeof createKeySchema>;

function CreateKeyDialog({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateKeyFormData) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<CreateKeyFormData>({
    resolver: zodResolver(createKeySchema),
    defaultValues: {
      name: '',
      expiry: '90',
      scopes: ['read'],
    },
  });

  const selectedScopes = watch('scopes');

  const toggleScope = (scopeId: string) => {
    const current = selectedScopes || [];
    if (current.includes(scopeId)) {
      setValue(
        'scopes',
        current.filter((s) => s !== scopeId)
      );
    } else {
      setValue('scopes', [...current, scopeId]);
    }
  };

  const onSubmit = (data: CreateKeyFormData) => {
    onCreate(data);
    reset();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <TuiBox title="Create API Key">
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Name */}
            <TuiInput
              label="Key Name"
              type="text"
              placeholder="e.g., CI/CD Integration"
              error={errors.name?.message}
              {...register('name')}
            />

            {/* Scopes */}
            <div>
              <TuiDim style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>Scopes</TuiDim>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availableScopes.map((scope) => (
                  <label
                    key={scope.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '8px 12px',
                      border: `1px solid ${selectedScopes?.includes(scope.id) ? 'var(--accent)' : 'var(--border)'}`,
                      cursor: 'pointer',
                      background: selectedScopes?.includes(scope.id) ? 'rgba(189, 147, 249, 0.1)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes?.includes(scope.id)}
                      onChange={() => toggleScope(scope.id)}
                      style={{
                        accentColor: 'var(--accent)',
                        width: '14px',
                        height: '14px',
                        marginTop: '2px',
                      }}
                    />
                    <div>
                      <div style={{ color: 'var(--fg-bright)', fontSize: '13px' }}>{scope.name}</div>
                      <TuiDim style={{ fontSize: '11px' }}>{scope.description}</TuiDim>
                    </div>
                  </label>
                ))}
              </div>
              {errors.scopes && (
                <TuiError style={{ marginTop: '4px' }}>{errors.scopes.message}</TuiError>
              )}
            </div>

            {/* Expiry */}
            <TuiSelect label="Expiration" {...register('expiry')}>
              {expiryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </TuiSelect>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <TuiButton type="button" variant="secondary" fullWidth onClick={onClose}>
                Cancel
              </TuiButton>
              <TuiButton type="submit" fullWidth>
                $ create-key
              </TuiButton>
            </div>
          </form>
        </TuiBox>
      </div>
    </div>
  );
}

function NewKeyDisplay({
  apiKey,
  onClose,
}: {
  apiKey: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [apiKey]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
        }}
      >
        <TuiBox title="Key Created">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Success Message */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TuiSuccess>✓</TuiSuccess>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>API Key Created Successfully</span>
            </div>

            {/* Warning */}
            <div
              style={{
                padding: '8px 12px',
                border: '1px solid var(--yellow)',
                background: 'rgba(241, 250, 140, 0.1)',
              }}
            >
              <span style={{ color: 'var(--yellow)' }}>⚠ Save this key now</span>
              <TuiDim style={{ display: 'block', marginTop: '4px' }}>
                You won&apos;t be able to see it again after closing this dialog.
              </TuiDim>
            </div>

            {/* Key Display */}
            <div>
              <TuiDim style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Your API Key</TuiDim>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: 'var(--fg-bright)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {visible ? apiKey : '•'.repeat(Math.min(apiKey.length, 40))}
                </div>
                <TuiButton
                  variant="secondary"
                  onClick={() => setVisible(!visible)}
                  style={{ padding: '8px 10px' }}
                >
                  {visible ? '👁' : '👁‍🗨'}
                </TuiButton>
                <TuiButton
                  variant="secondary"
                  onClick={handleCopy}
                  style={{ padding: '8px 10px' }}
                >
                  {copied ? '✓' : '📋'}
                </TuiButton>
              </div>
            </div>

            {/* Copy Command */}
            <TuiCode copyable onCopy={handleCopy}>
              <span style={{ color: 'var(--fg-dim)' }}>$</span> export LOA_API_KEY=&quot;{apiKey.substring(0, 15)}...&quot;
            </TuiCode>

            {/* Action */}
            <TuiButton fullWidth onClick={onClose}>
              $ confirm --saved
            </TuiButton>
          </div>
        </TuiBox>
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(mockApiKeys);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreateKey = (data: CreateKeyFormData) => {
    const generatedKey = `loa_sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    const expiresAt =
      data.expiry === 'never'
        ? null
        : new Date(Date.now() + parseInt(data.expiry) * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

    const newApiKey: ApiKey = {
      id: Math.random().toString(),
      name: data.name,
      prefix: generatedKey.substring(0, 12),
      scopes: data.scopes,
      createdAt: new Date().toISOString().split('T')[0],
      expiresAt,
      lastUsed: null,
    };

    setKeys([newApiKey, ...keys]);
    setIsCreateOpen(false);
    setNewKey(generatedKey);
  };

  const handleDeleteKey = (keyId: string) => {
    setKeys(keys.filter((k) => k.id !== keyId));
    setDeleteConfirm(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ padding: '0 4px' }}>
          <TuiH1 cursor>API Keys</TuiH1>
          <TuiDim>Manage your API keys for CLI and integrations</TuiDim>
        </div>
        <TuiButton onClick={() => setIsCreateOpen(true)}>
          $ create-key --new
        </TuiButton>
      </div>

      {/* Security Info */}
      <TuiBox title="Security Notice">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ color: 'var(--cyan)' }}>🔒</span>
          <div>
            <div style={{ color: 'var(--fg-bright)', marginBottom: '4px' }}>Keep your API keys secure</div>
            <TuiDim>
              Never share your API keys in public repositories or client-side code.
              Use environment variables to store them securely.
            </TuiDim>
          </div>
        </div>
      </TuiBox>

      {/* Keys List */}
      <TuiBox title={`Your API Keys (${keys.length})`}>
        {keys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--fg-dim)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔑</div>
            <div>No API keys yet</div>
            <TuiDim>Create one to get started</TuiDim>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {keys.map((key, _idx) => {
              const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();
              return (
                <div
                  key={key.id}
                  style={{
                    padding: '12px',
                    border: `1px solid ${isExpired ? 'var(--red)' : 'var(--border)'}`,
                    background: isExpired ? 'rgba(255, 95, 95, 0.05)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    {/* Key Info */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--fg-bright)', fontWeight: 600 }}>{key.name}</span>
                        {isExpired && <TuiTag color="red">EXPIRED</TuiTag>}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--fg-dim)', marginBottom: '8px' }}>
                        {key.prefix}...
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {key.scopes.map((scope) => (
                          <span
                            key={scope}
                            style={{
                              color: 'var(--cyan)',
                              fontSize: '11px',
                              padding: '2px 6px',
                              border: '1px solid var(--cyan)',
                              textTransform: 'uppercase',
                            }}
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div style={{ fontSize: '11px', color: 'var(--fg-dim)', minWidth: '140px' }}>
                      <div>Created: {key.createdAt}</div>
                      {key.expiresAt && (
                        <div style={{ color: isExpired ? 'var(--red)' : 'var(--fg-dim)' }}>
                          {isExpired ? 'Expired' : 'Expires'}: {key.expiresAt}
                        </div>
                      )}
                      {key.lastUsed && <div>Last used: {key.lastUsed}</div>}
                    </div>

                    {/* Actions */}
                    <div>
                      {deleteConfirm === key.id ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <TuiButton variant="danger" onClick={() => handleDeleteKey(key.id)}>
                            Confirm
                          </TuiButton>
                          <TuiButton variant="secondary" onClick={() => setDeleteConfirm(null)}>
                            Cancel
                          </TuiButton>
                        </div>
                      ) : (
                        <TuiButton variant="danger" onClick={() => setDeleteConfirm(key.id)}>
                          $ revoke
                        </TuiButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TuiBox>

      {/* Usage Info */}
      <TuiBox title="Quick Start">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <TuiDim>Use your API key with the Loa CLI:</TuiDim>
          <TuiCode copyable>
            <span style={{ color: 'var(--fg-dim)' }}>$</span> loa auth login --key YOUR_API_KEY
          </TuiCode>
          <TuiDim>Or set it as an environment variable:</TuiDim>
          <TuiCode copyable>
            <span style={{ color: 'var(--fg-dim)' }}>$</span> export LOA_API_KEY=&quot;your_api_key_here&quot;
          </TuiCode>
        </div>
      </TuiBox>

      {/* Create Key Dialog */}
      <CreateKeyDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateKey}
      />

      {/* New Key Display */}
      {newKey && <NewKeyDisplay apiKey={newKey} onClose={() => setNewKey(null)} />}
    </div>
  );
}

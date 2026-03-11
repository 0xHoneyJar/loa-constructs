'use client';

import { useState } from 'react';
import { createKey, type CreatedApiKey } from '@/lib/api/keys';

const AVAILABLE_SCOPES = [
  { id: 'read:skills', label: 'Read Skills' },
  { id: 'write:installs', label: 'Write Installs' },
  { id: 'read:analytics', label: 'Read Analytics' },
];

export function CreateKeyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState(['read:skills', 'write:installs']);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createKey(name.trim(), scopes);
      setCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text for manual copy
      const el = document.querySelector('[data-key-display]');
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  };

  const handleClose = () => {
    if (created) {
      onCreated();
    }
    setName('');
    setScopes(['read:skills', 'write:installs']);
    setCreated(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-void-base border border-bone-light/20 w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-bone-light/10">
          <h2 className="font-mono text-sm text-bone-light">
            {created ? 'Key Created' : 'Create API Key'}
          </h2>
        </div>

        <div className="px-6 py-4 space-y-4">
          {created ? (
            <>
              <div className="border border-amber-400/30 bg-amber-400/5 p-3">
                <div className="font-mono text-[9px] text-amber-400/80 uppercase tracking-widest mb-2">
                  Copy this key now — it won&apos;t be shown again
                </div>
                <div className="flex items-center gap-2">
                  <code data-key-display className="flex-1 font-mono text-[11px] text-bone-light bg-black/30 px-2 py-1.5 break-all select-all">
                    {created.key}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 font-mono text-[9px] text-cyan-base/70 hover:text-cyan-base border border-cyan-base/20 px-2 py-1 uppercase tracking-wider transition-colors"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block font-mono text-[9px] text-bone-light/40 uppercase tracking-widest mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My API key"
                  className="w-full bg-black/30 border border-bone-light/10 px-3 py-1.5 font-mono text-xs text-bone-light placeholder:text-bone-light/20 focus:border-cyan-base/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[9px] text-bone-light/40 uppercase tracking-widest mb-2">
                  Scopes
                </label>
                <div className="space-y-1.5">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <label
                      key={scope.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={scopes.includes(scope.id)}
                        onChange={() => toggleScope(scope.id)}
                        className="accent-cyan-base"
                      />
                      <span className="font-mono text-[11px] text-bone-light/70">
                        {scope.label}
                      </span>
                      <span className="font-mono text-[9px] text-bone-light/30">
                        ({scope.id})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="font-mono text-[10px] text-red-400/80">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-3 border-t border-bone-light/10 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="font-mono text-[9px] text-bone-light/40 hover:text-bone-light/70 px-3 py-1 uppercase tracking-wider transition-colors"
          >
            {created ? 'Done' : 'Cancel'}
          </button>
          {!created && (
            <button
              onClick={handleCreate}
              disabled={!name.trim() || creating}
              className="font-mono text-[9px] text-void-base bg-cyan-base/80 hover:bg-cyan-base px-3 py-1 uppercase tracking-wider disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

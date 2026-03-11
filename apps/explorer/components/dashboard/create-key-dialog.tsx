'use client';

import { useState } from 'react';
import { createKey, type CreatedApiKey } from '@/lib/api/keys';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

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
      const el = document.querySelector('[data-key-display]');
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (created) {
        onCreated();
      }
      setName('');
      setScopes(['read:skills', 'write:installs']);
      setCreated(null);
      setError(null);
      setCopied(false);
      onClose();
    }
  };

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {created ? 'Key Created' : 'Create API Key'}
          </DialogTitle>
          <DialogDescription>
            {created
              ? 'Store this key securely — it cannot be retrieved later.'
              : 'Create an API key to authenticate with the Constructs Network.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {created ? (
            <div className="border border-graduation-beta/30 bg-graduation-beta/5 p-3">
              <div className="font-mono text-[9px] text-graduation-beta/80 uppercase tracking-widest mb-2">
                Copy this key now — it won&apos;t be shown again
              </div>
              <div className="flex items-center gap-2">
                <code
                  data-key-display
                  className="flex-1 font-mono text-[11px] text-bone-base bg-void-raised px-2 py-1.5 break-all select-all"
                >
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
          ) : (
            <>
              <div>
                <label className="block font-mono text-[9px] text-bone-muted uppercase tracking-widest mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My API key"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && name.trim()) handleCreate();
                  }}
                  className="w-full bg-void-raised border border-void-border px-3 py-1.5 font-mono text-xs text-bone-base placeholder:text-bone-ghost focus:border-cyan-dim focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-mono text-[9px] text-bone-muted uppercase tracking-widest mb-2">
                  Scopes
                </label>
                <div className="space-y-1.5">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <label
                      key={scope.id}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={scopes.includes(scope.id)}
                        onChange={() => toggleScope(scope.id)}
                        className="accent-[var(--color-cyan-base)]"
                      />
                      <span className="font-mono text-[11px] text-bone-dim group-hover:text-bone-base transition-colors">
                        {scope.label}
                      </span>
                      <span className="font-mono text-[9px] text-bone-ghost">
                        ({scope.id})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="font-mono text-[10px] text-crimson-base/80">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={() => handleOpenChange(false)}
            className="font-mono text-[9px] text-bone-muted hover:text-bone-dim px-3 py-1.5 uppercase tracking-wider transition-colors"
          >
            {created ? 'Done' : 'Cancel'}
          </button>
          {!created && (
            <button
              onClick={handleCreate}
              disabled={!name.trim() || creating}
              className="font-mono text-[9px] text-void-base bg-cyan-base/80 hover:bg-cyan-base px-3 py-1.5 uppercase tracking-wider disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

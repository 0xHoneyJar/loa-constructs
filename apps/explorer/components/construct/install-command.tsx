'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface InstallCommandProps {
  command: string;
}

export function InstallCommand({ command }: InstallCommandProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <code className="font-mono text-sm text-domain-dev">
          <span className="text-white/40">$ </span>
          {command}
        </code>

        <button
          onClick={handleCopy}
          className="shrink-0 font-mono text-xs uppercase tracking-wider text-white/40 hover:text-white transition-colors"
        >
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </CardContent>
    </Card>
  );
}

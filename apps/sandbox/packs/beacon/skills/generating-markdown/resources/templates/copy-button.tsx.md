# Copy Button Component Template

> React component for copying page content as markdown to clipboard.

## Template

```typescript
'use client';

import { useState, useCallback } from 'react';
{{#if USE_CN}}
import { cn } from '{{IMPORT_PREFIX}}lib/utils';
{{/if}}

interface CopyMarkdownButtonProps {
  /** Function that returns the markdown string to copy */
  getMarkdown: () => string;
  /** Optional: Fetch markdown from URL instead of using getMarkdown */
  markdownUrl?: string;
  /** Optional: Custom class name */
  className?: string;
  /** Optional: Custom labels */
  labels?: {
    idle?: string;
    copying?: string;
    copied?: string;
    error?: string;
  };
}

const defaultLabels = {
  idle: 'Copy as Markdown',
  copying: 'Copying...',
  copied: 'Copied!',
  error: 'Failed to copy',
};

export function CopyMarkdownButton({
  getMarkdown,
  markdownUrl,
  className,
  labels = {},
}: CopyMarkdownButtonProps) {
  const [state, setState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const mergedLabels = { ...defaultLabels, ...labels };

  const handleCopy = useCallback(async () => {
    setState('copying');

    try {
      let markdown: string;

      if (markdownUrl) {
        // Fetch from URL with content negotiation
        const response = await fetch(markdownUrl, {
          headers: { Accept: 'text/markdown' },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        markdown = await response.text();
      } else {
        // Use provided function
        markdown = getMarkdown();
      }

      // Modern Clipboard API (preferred)
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
      } else {
        // Fallback for older browsers / insecure contexts
        copyFallback(markdown);
      }

      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }, [getMarkdown, markdownUrl]);

  return (
    <button
      onClick={handleCopy}
      disabled={state === 'copying'}
      {{#if USE_CN}}
      className={cn(
        'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
        'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors',
        className
      )}
      {{else}}
      className={className}
      {{/if}}
      aria-label={mergedLabels.idle}
    >
      {state === 'idle' && (
        <>
          <CopyIcon />
          {mergedLabels.idle}
        </>
      )}
      {state === 'copying' && (
        <>
          <SpinnerIcon />
          {mergedLabels.copying}
        </>
      )}
      {state === 'copied' && (
        <>
          <CheckIcon />
          {mergedLabels.copied}
        </>
      )}
      {state === 'error' && (
        <>
          <ErrorIcon />
          {mergedLabels.error}
        </>
      )}
    </button>
  );
}

// Fallback for browsers without Clipboard API
function copyFallback(text: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

// ============================================================================
// Icons (inline SVG for zero dependencies)
// ============================================================================

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" x2="9" y1="9" y2="15" />
      <line x1="9" x2="15" y1="9" y2="15" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
```

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{IMPORT_PREFIX}}` | Path alias prefix | `@/`, `~/` |
| `{{USE_CN}}` | Whether to use shadcn cn() utility | `true`, `false` |

## Usage Example

```tsx
import { CopyMarkdownButton } from '@/components/copy-markdown-button';

// Option 1: Provide markdown via function
<CopyMarkdownButton
  getMarkdown={() => pageToMarkdown(pageContent)}
  className="my-custom-class"
/>

// Option 2: Fetch from route handler
<CopyMarkdownButton
  getMarkdown={() => ''} // Required but unused when markdownUrl is set
  markdownUrl="/pricing"
/>

// Option 3: Custom labels
<CopyMarkdownButton
  getMarkdown={() => markdown}
  labels={{
    idle: 'Export MD',
    copied: 'Done!',
  }}
/>
```

## Output Location

- **With shadcn**: `components/ui/copy-markdown-button.tsx`
- **Without shadcn**: `components/copy-markdown-button.tsx`

File naming follows detected codebase convention (kebab-case or PascalCase).

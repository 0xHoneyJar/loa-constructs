# Route Handler Template

> Next.js App Router route handler with content negotiation for markdown.

## Template

```typescript
import { NextRequest } from 'next/server';
{{#if IMPORT_CONTENT}}
import { getPageContent } from '{{IMPORT_PREFIX}}lib/content';
{{/if}}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ {{ROUTE_PARAMS}} }> }
) {
  {{#if HAS_PARAMS}}
  const { {{ROUTE_PARAMS}} } = await params;
  {{/if}}
  const accept = request.headers.get('accept') || '';

  // Content negotiation: return markdown if requested
  if (accept.includes('text/markdown')) {
    {{#if IMPORT_CONTENT}}
    const content = await getPageContent({{CONTENT_PARAM}});
    const markdown = toMarkdown(content);
    {{else}}
    // TODO: Implement getPageContent() for your data source
    const content = await getPageContent({{CONTENT_PARAM}});
    const markdown = toMarkdown(content);
    {{/if}}

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // For non-markdown requests, let the page.tsx handle it
  // This route.ts only handles Accept: text/markdown
  return new Response(null, { status: 406 });
}

// ============================================================================
// Inline Markdown Converter (Zero Dependencies)
// ============================================================================

interface PageContent {
  title: string;
  description?: string;
  lastUpdated?: string;
  sections: ContentSection[];
}

interface ContentSection {
  heading?: string;
  level?: number;
  content: string;
  type?: 'paragraph' | 'list' | 'code' | 'table';
}

function toMarkdown(page: PageContent): string {
  const lines: string[] = [];

  // YAML Frontmatter
  lines.push('---');
  lines.push(`title: "${escapeYaml(page.title)}"`);
  if (page.description) {
    lines.push(`description: "${escapeYaml(page.description)}"`);
  }
  if (page.lastUpdated) {
    lines.push(`last_updated: "${page.lastUpdated}"`);
  }
  lines.push(`generated: "${new Date().toISOString()}"`);
  lines.push('---');
  lines.push('');

  // Title
  lines.push(`# ${page.title}`);
  lines.push('');

  // Sections
  for (const section of page.sections) {
    if (section.heading) {
      const hashes = '#'.repeat(section.level || 2);
      lines.push(`${hashes} ${section.heading}`);
      lines.push('');
    }

    if (section.type === 'code') {
      lines.push('```');
      lines.push(section.content);
      lines.push('```');
    } else {
      lines.push(section.content);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function escapeYaml(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
```

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{IMPORT_PREFIX}}` | Path alias prefix | `@/`, `~/`, `../../` |
| `{{ROUTE_PARAMS}}` | Dynamic route parameters | `slug`, `id`, `slug: string` |
| `{{HAS_PARAMS}}` | Whether route has dynamic params | `true`, `false` |
| `{{CONTENT_PARAM}}` | Parameter passed to getPageContent | `slug`, `'pricing'` |
| `{{IMPORT_CONTENT}}` | Whether to import getPageContent | `true`, `false` |

## Usage Notes

1. **Static Routes** (e.g., `/pricing`):
   - `HAS_PARAMS` = false
   - `CONTENT_PARAM` = `'pricing'` (string literal)

2. **Dynamic Routes** (e.g., `/blog/[slug]`):
   - `HAS_PARAMS` = true
   - `ROUTE_PARAMS` = `slug: string`
   - `CONTENT_PARAM` = `slug` (variable)

3. **Content Source**:
   - If `getPageContent` exists in codebase, `IMPORT_CONTENT` = true
   - Otherwise, include TODO comment for implementation

## Output Location

`app/{path}/route.ts`

For nested paths like `/docs/api`, creates `app/docs/api/route.ts`.

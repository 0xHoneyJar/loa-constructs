# Skill: generating-markdown

> Add markdown export capability to Next.js pages via content negotiation and copy buttons.

## Purpose

AI systems increasingly request content via markdown. This skill generates the code needed to serve pages as markdown via:
1. **Content negotiation** - `Accept: text/markdown` returns markdown
2. **Copy button** - UI component for users to copy page as markdown

Generated code adapts to the target codebase's existing patterns.

## Trigger

```
/add-markdown [path] [--route|--component|--both]
```

**Arguments:**
- `path` - The page path (e.g., `/pricing`, `/docs/api`)

**Options:**
- `--route` - Generate only the route handler (server-side content negotiation)
- `--component` - Generate only the copy button component
- `--both` - Generate both route handler and component (default)

## Workflow

### Phase 1: Parse Arguments

1. **Extract path** from command
   - Normalize to route format (e.g., `/pricing` → `pricing`)
   - Handle dynamic routes (e.g., `/[slug]`)

2. **Determine mode** from flags
   - Default: `--both`
   - If `--route`: generate route handler only
   - If `--component`: generate copy button only

### Phase 2: Detect Codebase Patterns

Before generating code, analyze the target codebase to match its conventions.

#### 2.1 Import Style Detection

```
Search for existing import patterns:
1. Glob: app/**/*.ts, app/**/*.tsx
2. Extract import statements
3. Identify alias patterns:
   - @/ prefix (common with Next.js)
   - ~/ prefix
   - Relative imports
```

**Detection Regex:**
```typescript
// Look for path aliases in imports
/from ['"](@\/|~\/)/
```

#### 2.2 Component Naming Convention

```
Search for existing components:
1. Glob: components/**/*.tsx
2. Check file naming:
   - kebab-case (copy-button.tsx)
   - PascalCase (CopyButton.tsx)
3. Check export naming:
   - Named exports
   - Default exports
```

#### 2.3 Component Library Detection

```
Check for common libraries:
1. shadcn/ui: Look for lib/utils.ts with cn function
2. Tailwind: Check tailwind.config.js/ts
3. CSS Modules: Look for *.module.css files
4. styled-components: Check package.json
```

**shadcn Detection:**
```typescript
// lib/utils.ts exists AND contains:
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

#### 2.4 TypeScript Configuration

```
Read tsconfig.json for:
1. Path aliases (compilerOptions.paths)
2. Strict mode (compilerOptions.strict)
3. Base URL (compilerOptions.baseUrl)
```

### Phase 3: Generate Code

Based on detected patterns, fill templates with appropriate values.

#### 3.1 Route Handler Generation (`--route` or `--both`)

**Target:** `app/{path}/route.ts`

1. Load template: `resources/templates/route-handler.ts.md`
2. Apply detected patterns:
   - Import alias style
   - TypeScript strictness
3. Write to target location

**Content Negotiation Logic:**
```typescript
const accept = request.headers.get('accept') || '';
if (accept.includes('text/markdown')) {
  // Return markdown
}
```

#### 3.2 Copy Button Generation (`--component` or `--both`)

**Target:** `components/copy-markdown-button.tsx` (or matching convention)

1. Load template: `resources/templates/copy-button.tsx.md`
2. Apply detected patterns:
   - File naming convention (kebab vs PascalCase)
   - Import alias style
   - Component library utilities (cn, etc.)
3. Write to target location

#### 3.3 Utility Files Generation (`--both` only)

**Files:**
- `lib/markdown/page-content.ts` - TypeScript interfaces
- `lib/markdown/to-markdown.ts` - Conversion function

### Phase 4: Write Manifest

Create manifest at: `grimoires/beacon/exports/{page-slug}-manifest.md`

Include:
- Files generated
- Patterns detected
- Integration instructions
- Test commands

### Phase 5: Update State

Update `grimoires/beacon/state.yaml`:
```yaml
exports:
  count: {increment}
  last_generation: "{timestamp}"
  pages:
    {path}:
      mode: route|component|both
      generated: "{timestamp}"
      files:
        - {file1}
        - {file2}
```

## Pattern Detection Summary

| Pattern | Detection Method | Template Variable |
|---------|------------------|-------------------|
| Import alias | Scan existing imports | `{{IMPORT_PREFIX}}` |
| Component naming | Check file names in components/ | `{{FILE_NAME}}` |
| Export style | Check existing exports | `{{EXPORT_STYLE}}` |
| shadcn cn() | Check lib/utils.ts | `{{USE_CN}}` |
| TypeScript strict | Read tsconfig.json | `{{STRICT_MODE}}` |

## Generated Files

### Route Handler

**Location:** `app/{path}/route.ts`

**Features:**
- Content negotiation via Accept header
- YAML frontmatter in markdown output
- Cache headers (1 hour default)
- Inline markdown converter (zero dependencies)

### Copy Button Component

**Location:** `components/copy-markdown-button.tsx` (or detected convention)

**Features:**
- Clipboard API with fallback
- Loading/copied/error states
- Accessible (aria-label)
- Props for custom styling

### Utility Types

**Location:** `lib/markdown/page-content.ts`

**Exports:**
- `PageContent` interface
- `ContentSection` interface
- `toMarkdown()` function

## Output Format

See `resources/templates/export-manifest.md` for the manifest template.

## Examples

### Example 1: Add to pricing page

```
/add-markdown /pricing
```

With shadcn detected:
- Creates `app/pricing/route.ts` with content negotiation
- Creates `components/copy-markdown-button.tsx` using `cn()` utility
- Creates manifest in grimoires

### Example 2: Route handler only

```
/add-markdown /docs/api --route
```

- Creates only `app/docs/api/route.ts`
- No component generated
- Useful for API-only access

### Example 3: Dynamic route

```
/add-markdown /blog/[slug] --both
```

- Creates `app/blog/[slug]/route.ts` with params handling
- Creates copy button component
- Handles dynamic slug extraction

## Edge Cases

### No Existing Patterns

If no patterns are detected (new project):
1. Use sensible defaults:
   - `@/` import alias (Next.js standard)
   - kebab-case file names
   - Named exports
2. Note in manifest: "Using default patterns - no existing conventions detected"

### Conflicting Patterns

If multiple patterns detected:
1. Prefer the most recent/common pattern
2. Note conflict in manifest
3. User can adjust generated code if needed

### Route Already Exists

If `app/{path}/route.ts` already exists:
1. Warn user
2. Ask for confirmation before overwriting
3. Or generate to alternate location with `.generated.ts` suffix

### Non-Next.js Project

If no `app/` directory detected:
1. Warn: "No Next.js App Router detected"
2. Generate to suggested locations with instructions
3. Provide alternative integration guide

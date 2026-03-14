# Construct Script Conventions

How construct scripts communicate with agents, handle credentials, and manage output.

These conventions are extracted from `construct-k-hole/scripts/dig-search.ts` — the reference implementation that other constructs should follow.

**See also**: `scripts/MANIFEST.yaml` in each construct — machine-readable tool declarations that let agents discover scripts without reading source code. Template at [construct-base](https://github.com/0xHoneyJar/construct-base/blob/main/scripts/MANIFEST.yaml).

## The Nakamoto Protocol: stdout / stderr / file

Construct scripts produce three kinds of output. Each has exactly one destination.

| Output | Destination | Who reads it |
|--------|-------------|--------------|
| Structured result | **stdout** (JSON) | Agent |
| Progress, retries, timing | **stderr** | User terminal |
| Full reports, trails | **file** (grimoires/) | Agent via Read tool |

### Rules

1. **One `writeSync(1, JSON.stringify(...))` at script exit.** This is the only thing that touches stdout. Use synchronous write to avoid truncation if followed by `process.exit()`. The agent parses this JSON to reason about the result.

2. **All operational noise to stderr.** Use `process.stderr.write()` for progress, retries, model fallbacks, timing. Never `console.log()` for progress.

3. **Large output goes to file.** If your output exceeds ~5KB (multi-topic reports, full research documents), write to `grimoires/{slug}/research-output/` and include the file path in the stdout JSON summary.

### Stdout JSON shape

For interactive scripts (dig-search.ts — agent needs content to synthesize):
```json
{
  "query": "...",
  "findings": "...",
  "sources": [{"title": "...", "url": "..."}],
  "source_count": 5,
  "trail_file": "/absolute/path/to/trail.md"
}
```

For batch scripts (deep-research.ts — agent needs pointers to file output):
```json
{
  "config": "animation",
  "topics_completed": 6,
  "output_dir": "/path/to/research-output/",
  "files": ["report-1.md", "report-2.md", "synthesis.md"],
  "duration_s": 342
}
```

For errors (always):
```json
{
  "error": "Missing GEMINI_API_KEY",
  "hint": "Get a key at https://aistudio.google.com/apikey"
}
```

### When to return content vs pointer

- **Interactive scripts** (seconds, <5KB): return full content in stdout JSON. The agent needs it immediately to synthesize a response. Adding a Read tool call would add latency for no gain.
- **Batch scripts** (minutes, >5KB): return file paths in stdout JSON. The agent reads specific files as needed.

## Credential Cascade

Scripts should resolve credentials in this order:

1. **`process.env`** — already set by shell or parent process
2. **`.env` file** — walk up from script directory to filesystem root
3. **`~/.loa/credentials.json`** — user-level shared credentials

### The walk-up pattern

```typescript
function loadEnv(startDir: string) {
  let dir = startDir;
  while (true) {
    const envPath = join(dir, ".env");
    if (existsSync(envPath)) {
      for (const line of readFileSync(envPath, "utf-8").split("\n")) {
        const match = line.match(/^(\w+)=(.*)$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
        }
      }
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}
```

This handles both standalone repos (`.env` one level up) and installed packs (`.env` at project root, 5+ levels above `.claude/constructs/packs/{slug}/scripts/`).

### Using construct-runtime.ts

Instead of reimplementing the walk-up, import the shared utility:

```typescript
import { loadEnvFile, resolveCredential, fatal } from "./lib/construct-runtime.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
loadEnvFile(SCRIPT_DIR);

const key = resolveCredential("GEMINI_API_KEY", "GOOGLE_API_KEY");
if (!key) {
  fatal("Missing GEMINI_API_KEY or GOOGLE_API_KEY", {
    hint: "Get a key at https://aistudio.google.com/apikey",
  });
}
```

### Security rules

- **Never log credentials to stdout or stderr.** Not even masked. If you need to confirm a key was found, log `[dig] API key loaded` — never the key itself.
- **Strip wrapping quotes.** Agents sometimes pass `GOOGLE_API_KEY="$(grep ...)"` with literal quotes leaking through. Always: `.replace(/^["']|["']$/g, "").trim()`
- **Don't overwrite existing env vars.** The `!process.env[match[1]]` guard ensures shell-level env vars take precedence over .env files.

## Stderr Progress Format

Use a consistent `[tag] message` format so users can visually track what's happening:

```
[dig] Thread: "phenomenology of dissociation"
[dig] Running 2 searches (depth 2)...
[dig] Search 1/2: 5 sources, 3 web queries
[dig] Search 2/2: 8 sources, 4 web queries
[dig] 11 unique sources found. Synthesizing...
[dig] Done in 12.3s | Model: gemini-3-flash-preview | Depth rating: ++
```

For batch scripts with elapsed time:
```
  [   0s] CONFIG     Loading animation config
  [   2s] SEARCH     springs — 7 queries
  [  15s] DONE       springs — 42 sources
  [  18s] SYNTH      springs — analyzing
  [ 342s] COMPLETE   6 topics, 1 synthesis
```

### On failure

Include a fallback hint so agents can route around the error:

```typescript
if (!key) {
  fatal("Missing GEMINI_API_KEY", {
    hint: "Get a key at https://aistudio.google.com/apikey",
    fallback: "Use WebSearch/WebFetch directly for manual search",
  });
}
```

## Output Directory Resolution

Pack-installed scripts write to project-level grimoires, not the pack's own directory:

```
Pack-installed (.claude/constructs/packs/{slug}/scripts/):
  → {project_root}/grimoires/{slug}/research-output/

Standalone repo (scripts/):
  → scripts/research-output/  (gitignored)
```

Detection uses the `.claude/constructs/packs/` path marker:

```typescript
import { resolveOutputDir } from "./lib/construct-runtime.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolveOutputDir(SCRIPT_DIR, "k-hole");
```

## Shared Utility: construct-runtime.ts

Copy `scripts/lib/construct-runtime.ts` from `construct-k-hole` into your construct's `scripts/lib/` directory. It provides:

| Export | Purpose |
|--------|---------|
| `loadEnvFile(startDir)` | Walk-up .env loader |
| `resolveCredential(...names)` | Cascade: env → .env → ~/.loa/credentials.json |
| `resolveOutputDir(scriptDir, slug)` | Pack-aware output directory |
| `progress(tag, msg)` | `[tag] msg` to stderr |
| `timedProgress(startTime, stage, msg)` | `[  42s] STAGE msg` to stderr |
| `banner(lines)` | Formatted banner to stderr |
| `output(data)` | JSON to stdout (call once at exit) |
| `fatal(error, extra?)` | JSON error to stdout + exit(1) |

No external dependencies. Node.js stdlib only.

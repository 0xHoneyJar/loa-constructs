# CLI Architecture — incur Framework Analysis

> source: deep research agent, wevm/incur repo analysis (35 tool uses, 110K tokens)

## Why incur

incur is built by the viem/wagmi team (wevm). it's not a CLI framework — it's an **agent-first command framework** that happens to also work as a CLI. this is a critical distinction.

### Core Architecture

Single-file core (`Cli.ts`, ~2100 lines). Three concepts: `Cli.create()`, `.command()`, `.serve()`.

**Dual-mode execution** — every CLI can run as:
- CLI binary via `.serve()` (parses process.argv)
- HTTP server via `.fetch()` (Request/Response, JSON envelopes)
- MCP server via `--mcp` flag or `/mcp` HTTP endpoint
- Agent skills via `skills add`

**No classes except errors.** `Cli` is a plain object from a factory function. Internal state in WeakMaps.

### The Agent Layer (what makes it different)

| Feature | What It Does |
|---------|-------------|
| **TOON format** | Token-Optimized Object Notation — strips braces, quotes, redundancy. ~40-60% fewer tokens than JSON |
| **CTAs** | Call-To-Action suggestions after each command. Agent follows these without prompting |
| **Skill files** | Auto-generated SKILL.md per command, installable to 20+ agent directories |
| **MCP integration** | Built-in stdio + HTTP MCP server. Every command becomes an MCP tool |
| **Token pagination** | `--token-count`, `--token-limit`, `--token-offset` for large outputs |
| **Output filtering** | `--filter-output issues.title,issues.state` — return only what agent needs |
| **OpenAPI mounting** | Mount any OpenAPI spec → auto-generate typed subcommands |
| **Streaming** | `async *run()` with NDJSON in fetch mode |

### Command Definition Pattern

```ts
cli.command('deploy', {
  description: 'Deploy to environment',
  args: z.object({ env: z.enum(['staging', 'production']) }),
  options: z.object({ force: z.boolean().optional() }),
  env: z.object({ DEPLOY_TOKEN: z.string() }),
  output: z.object({ url: z.string(), duration: z.number() }),
  run(c) {
    return { url: `https://${c.args.env}.example.com`, duration: 3.2 }
  },
})
```

Zod schemas are the single source of truth: parsing, validation, help text, JSON Schema, skill files, MCP tool definitions. Declare once, get everything.

### vs Alternatives

| Feature | incur | commander | yargs | oclif | citty |
|---------|-------|-----------|-------|-------|-------|
| Agent-first design | Native | No | No | No | No |
| Type inference | Full Zod→callback | Basic | Moderate | Good | Basic |
| MCP integration | Built-in | No | No | No | No |
| Skill files | Auto-generated | No | No | No | No |
| Token awareness | Native | No | No | No | No |
| HTTP duality | Same definition | No | No | No | No |
| API surface | 3 functions | ~20 methods | Large | Large | ~5 |

### Middleware (DI pattern)

```ts
cli.use(async (c, next) => {
  c.set('linear', new LinearClient({ apiKey: c.env.LINEAR_API_KEY }))
  c.set('github', new Octokit({ auth: c.env.GITHUB_TOKEN }))
  await next()
})
```

Onion-style. Typed via `vars` schema on `Cli.create()`. Replaces Hono's context pattern.

### Error Handling

Four-type hierarchy: BaseError → IncurError (code, hint, retryable, exitCode) → ValidationError, ParseError.

Output adapts to context:
- TTY: human-readable
- Non-TTY: structured TOON/JSON with code, retryable flag
- Fetch: HTTP status codes
- MCP: `isError: true` in tool result

## Gecko CLI — Proposed Command Structure

```ts
import { Cli, z } from 'incur'

const cli = Cli.create('gecko', {
  version: '0.1.0',
  description: 'Ecosystem intelligence agent',
  vars: z.object({
    linear: z.custom<LinearClient>(),
    github: z.custom<Octokit>(),
  }),
  env: z.object({
    LINEAR_API_KEY: z.string(),
    GITHUB_TOKEN: z.string(),
  }),
  sync: {
    depth: 1,
    suggestions: [
      'show me open issues assigned to me',
      'what PRs need review?',
      'create an issue for the auth bug',
    ],
  },
})

// Auth middleware
cli.use(async (c, next) => {
  c.set('linear', new LinearClient({ apiKey: c.env.LINEAR_API_KEY }))
  c.set('github', new Octokit({ auth: c.env.GITHUB_TOKEN }))
  await next()
})

// Issues group
const issues = Cli.create('issues', { description: 'Linear issue management' })
issues.command('list', { ... })
issues.command('create', { ... })
issues.command('triage', { ... })

// PRs group
const prs = Cli.create('prs', { description: 'GitHub PR operations' })
prs.command('list', { ... })
prs.command('review', { ... })

// Signals group
const signals = Cli.create('signals', { description: 'Signal pipeline operations' })
signals.command('ingest', { ... })
signals.command('status', { ... })
signals.command('escalate', { ... })

// Autonomous patrol
cli.command('patrol', {
  description: 'Run autonomous ecosystem patrol',
  options: z.object({
    depth: z.enum(['shallow', 'standard', 'deep']).default('standard'),
    dryRun: z.boolean().optional(),
  }),
  async *run(c) {
    yield { phase: 'issues', status: 'scanning' }
    yield { phase: 'prs', status: 'scanning' }
    yield { phase: 'signals', status: 'scanning' }
    return c.ok(undefined, {
      cta: { commands: [
        { command: 'issues list --state triage', description: 'View triaged issues' },
        { command: 'report', description: 'Generate patrol report' },
      ]},
    })
  },
})

cli.command(issues)
cli.command(prs)
cli.command(signals)
cli.serve()
```

This auto-generates:
- SKILL.md files for each command group
- MCP server exposing all commands as tools
- HTTP API via `Bun.serve(cli)`
- Token-paginated output for agent consumption

## Limitations

1. **No interactive prompts** — batch-oriented (actually a feature for agents)
2. **No built-in caching** — need application-level cache for API calls
3. **Young framework** (v0.3.3, 2026-02-26) — pre-1.0 API
4. **No daemon mode** — need separate process for persistent background polling

## Verdict

incur is the right foundation for gecko CLI. it was designed for exactly this use case by a team (wevm) that builds developer-facing tools for the same ecosystem (Web3). the OpenAPI mounting alone would let us wrap Linear's entire API surface with zero manual command definitions.

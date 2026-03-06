#!/usr/bin/env node
/**
 * constructs — Standalone CLI for the Constructs Network
 *
 * No Loa required. No auth for public constructs. Just the API.
 *
 * Usage:
 *   npx constructs list                    # List all constructs
 *   npx constructs find <query>            # Search constructs
 *   npx constructs info <slug>             # Show construct details
 *   npx constructs summary                 # Agent-optimized listing
 *   npx constructs --help                  # Show help
 *   npx constructs --llms                  # Self-describing manifest for agents
 */

const API = process.env.CONSTRUCTS_API_URL || 'https://api.constructs.network/v1';

// --- Helpers ---

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'User-Agent': 'constructs-cli/0.1.0' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

// --- Commands ---

async function cmdList() {
  const data = await api<{
    data: Array<{
      slug: string;
      name: string;
      description: string;
      version: string;
      construct_type: string;
      skills_count: number;
      downloads: number;
      icon?: string;
    }>;
    pagination: { total: number };
  }>('/constructs?per_page=100');

  const constructs = data.data;
  if (constructs.length === 0) {
    console.log('No constructs found.');
    return;
  }

  console.log(`\n  ${constructs.length} constructs on the network\n`);
  console.log(`  ${pad('CONSTRUCT', 22)} ${pad('TYPE', 12)} ${pad('VER', 8)} ${pad('SKILLS', 7)} DESCRIPTION`);
  console.log(`  ${'─'.repeat(22)} ${'─'.repeat(12)} ${'─'.repeat(8)} ${'─'.repeat(7)} ${'─'.repeat(40)}`);

  for (const c of constructs) {
    const icon = c.icon || '';
    const name = icon ? `${icon} ${c.slug}` : c.slug;
    const type = c.construct_type || 'skill-pack';
    console.log(
      `  ${pad(name, 22)} ${pad(type, 12)} ${pad(`v${c.version}`, 8)} ${pad(String(c.skills_count), 7)} ${truncate(c.description || '', 50)}`
    );
  }
  console.log('');
}

async function cmdFind(query: string) {
  const data = await api<{
    data: Array<{
      slug: string;
      name: string;
      description: string;
      skills_count: number;
      icon?: string;
    }>;
    pagination: { total: number };
  }>(`/constructs?q=${encodeURIComponent(query)}&per_page=50`);

  const results = data.data;
  if (results.length === 0) {
    console.log(`\n  No constructs found for "${query}"\n`);
    return;
  }

  console.log(`\n  ${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"\n`);
  for (const c of results) {
    const icon = c.icon || '📦';
    console.log(`  ${icon} ${c.slug} (${c.skills_count} skills)`);
    if (c.description) console.log(`     ${truncate(c.description, 70)}`);
    console.log('');
  }
}

async function cmdInfo(slug: string) {
  const data = await api<{
    data: {
      slug: string;
      name: string;
      description: string;
      long_description?: string;
      version: string;
      construct_type: string;
      source_type: string;
      git_url?: string;
      category: string;
      downloads: number;
      skills_count: number;
      icon?: string;
      manifest?: {
        skills?: string[];
        commands?: string[];
      };
      owner?: { name: string; type: string };
      has_identity: boolean;
      identity?: {
        cognitive_frame?: Record<string, unknown>;
        expertise_domains?: string[];
        voice_config?: Record<string, unknown>;
      };
      verification_tier?: string;
      repository_url?: string;
      homepage_url?: string;
      documentation_url?: string;
    };
  }>(`/constructs/${encodeURIComponent(slug)}`);

  const c = data.data;
  const icon = c.icon || '📦';

  console.log(`\n  ${icon} ${c.name}`);
  console.log(`  ${c.description || ''}`);
  if (c.long_description) console.log(`\n  ${c.long_description}`);
  console.log('');
  console.log(`  Slug:      ${c.slug}`);
  console.log(`  Version:   v${c.version}`);
  console.log(`  Type:      ${c.construct_type || 'skill-pack'}`);
  console.log(`  Category:  ${c.category}`);
  console.log(`  Downloads: ${c.downloads}`);
  if (c.owner) console.log(`  Owner:     ${c.owner.name} (${c.owner.type})`);
  if (c.verification_tier && c.verification_tier !== 'UNVERIFIED') {
    console.log(`  Verified:  ${c.verification_tier.toLowerCase()}`);
  }

  // Identity
  if (c.has_identity && c.identity) {
    console.log('');
    if (c.identity.expertise_domains?.length) {
      const domains = c.identity.expertise_domains.map(
        (d: string | { name: string }) => typeof d === 'string' ? d : d.name
      );
      console.log(`  Expertise: ${domains.join(', ')}`);
    }
    if (c.identity.cognitive_frame) {
      const frame = c.identity.cognitive_frame;
      if (frame.archetype) console.log(`  Archetype: ${frame.archetype}`);
      if (frame.disposition) console.log(`  Frame:     ${frame.disposition}`);
    }
  }

  // Skills
  const skills = c.manifest?.skills;
  if (Array.isArray(skills) && skills.length) {
    console.log(`\n  Skills (${skills.length}):`);
    for (const skill of skills) {
      const name = typeof skill === 'string' ? skill : (skill as Record<string, string>).slug || (skill as Record<string, string>).name || String(skill);
      console.log(`    - ${name}`);
    }
  }

  // Commands
  const commands = c.manifest?.commands;
  if (Array.isArray(commands) && commands.length) {
    console.log(`\n  Commands (${commands.length}):`);
    for (const cmd of commands) {
      const name = typeof cmd === 'string' ? cmd : (cmd as Record<string, string>).name || (cmd as Record<string, string>).slug || String(cmd);
      console.log(`    /${name}`);
    }
  }

  // Links
  console.log('');
  if (c.git_url) console.log(`  Source:    ${c.git_url.replace(/\.git$/, '')}`);
  if (c.repository_url) console.log(`  Repo:     ${c.repository_url}`);
  if (c.homepage_url) console.log(`  Homepage: ${c.homepage_url}`);
  if (c.documentation_url) console.log(`  Docs:     ${c.documentation_url}`);
  console.log(`  Web:       https://constructs.network/constructs/${c.slug}`);

  // Install
  console.log(`\n  Install:\n    /constructs install ${c.slug}\n`);
}

async function cmdSummary() {
  const data = await api<{
    constructs: Array<{
      slug: string;
      name: string;
      type: string;
      commands: string[];
      tier_required: string;
    }>;
    total: number;
    last_updated: string;
  }>('/constructs/summary');

  // TOON-inspired tabular format for agent consumption
  console.log(`constructs[${data.total}]{slug,name,type,commands,tier}:`);
  for (const c of data.constructs) {
    const cmds = c.commands?.length || 0;
    console.log(`  ${c.slug},${c.name},${c.type},${cmds},${c.tier_required}`);
  }
}

function cmdLlms() {
  console.log(`# constructs CLI

> Standalone CLI for the Constructs Network — named expertise for AI coding agents.

## Commands

### list
List all constructs on the network with type, version, skills count, and description.
\`constructs list\`

### find <query>
Search constructs by keyword. Returns matching constructs with descriptions.
\`constructs find "user research"\`
\`constructs find "web3 transactions"\`

### info <slug>
Show full details for a construct: identity, skills, commands, links.
\`constructs info observer\`
\`constructs info protocol\`

### summary
Agent-optimized listing in tabular format (minimal tokens).
\`constructs summary\`

## API
Base URL: ${API}
- GET /constructs — List all (supports ?q= search, ?type= filter)
- GET /constructs/:slug — Full details
- GET /constructs/summary — Agent-optimized listing
- HEAD /constructs/:slug — Existence check (204/404)

## No auth required for public constructs.
`);
}

function cmdHelp() {
  console.log(`
  constructs — CLI for the Constructs Network

  Usage:
    constructs list                    List all constructs
    constructs find <query>            Search by keyword
    constructs info <slug>             Show construct details
    constructs summary                 Agent-optimized listing
    constructs --llms                  Self-describing manifest
    constructs --help                  This help

  Examples:
    constructs find "design"
    constructs info observer
    constructs info protocol
    constructs list

  API: ${API}
  Web: https://constructs.network
`);
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === '--help' || cmd === '-h') {
    cmdHelp();
    return;
  }

  if (cmd === '--llms') {
    cmdLlms();
    return;
  }

  try {
    switch (cmd) {
      case 'list':
      case 'ls':
        await cmdList();
        break;
      case 'find':
      case 'search':
        if (!args[1]) {
          console.error('Usage: constructs find <query>');
          process.exit(1);
        }
        await cmdFind(args.slice(1).join(' '));
        break;
      case 'info':
      case 'show':
        if (!args[1]) {
          console.error('Usage: constructs info <slug>');
          process.exit(1);
        }
        await cmdInfo(args[1]);
        break;
      case 'summary':
        await cmdSummary();
        break;
      default:
        console.error(`Unknown command: ${cmd}`);
        cmdHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

main();

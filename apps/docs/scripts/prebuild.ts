// Prebuild: reads construct data from cached repos, writes .vitepress/data/constructs.json
// Primary source: .cache/construct-repos/ (all 23 constructs)
// Run: bun run scripts/prebuild.ts

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const REPO_ROOT = resolve(import.meta.dir, '../../..');
const CACHE_DIR = join(REPO_ROOT, '.cache/construct-repos');
const OUTPUT_DIR = resolve(import.meta.dir, '../.vitepress/data');

interface ConstructSummary {
  slug: string;
  name: string;
  description: string;
  short_description: string;
  version: string;
  category: string;
  construct_type: string;
  skills_count: number;
  verification_tier: string;
  skills: Array<{ slug: string; description: string }>;
  commands: Array<{ name: string; description: string }>;
  governs: string[];
  governed_by: string[];
  composes_with: string[];
  depends_on: string[];
  composition_paths: { writes?: string[]; reads?: string[] } | null;
  repository_url: string | null;
}

interface GraphNode { id: string; name: string; category: string; }
interface GraphEdge { source: string; target: string; type: 'governs' | 'depends_on' | 'composes_with' | 'connected_via'; }

// Simple YAML extraction (no dependency needed — construct.yaml is well-structured)
function yamlVal(content: string, key: string): string {
  const match = content.match(new RegExp(`^${key}:\\s*"?([^"\\n]*)"?`, 'm'));
  return match ? match[1].trim() : '';
}

function yamlList(content: string, key: string): string[] {
  const regex = new RegExp(`^${key}:\\s*\\n((?:  - .+\\n)*)`, 'm');
  const match = content.match(regex);
  if (!match) return [];
  return match[1].split('\n')
    .filter(l => l.trim().startsWith('- '))
    .map(l => l.replace(/^\s*-\s*/, '').replace(/^slug:\s*/, '').replace(/\s.*$/, '').trim())
    .filter(Boolean);
}

function yamlNestedList(content: string, parent: string, key: string): string[] {
  const parentIdx = content.indexOf(`${parent}:`);
  if (parentIdx === -1) return [];
  const afterParent = content.slice(parentIdx);
  const keyIdx = afterParent.indexOf(`  ${key}:`);
  if (keyIdx === -1) return [];
  const afterKey = afterParent.slice(keyIdx);
  const lines: string[] = [];
  for (const line of afterKey.split('\n').slice(1)) {
    if (line.match(/^    - /)) {
      lines.push(line.replace(/^\s*-\s*/, '').trim());
    } else if (line.match(/^  \S/) || line.match(/^\S/)) {
      break;
    }
  }
  return lines;
}

function normalizeCategory(cat: string): string {
  const map: Record<string, string> = {
    gtm: 'marketing', web3: 'development', observability: 'analytics',
    'game-design': 'design', aesthetics: 'design', communication: 'documentation',
  };
  return map[cat] || cat;
}

function readConstructFromCache(slug: string): ConstructSummary | null {
  const repoDir = join(CACHE_DIR, `construct-${slug}`);
  const yamlPath = join(repoDir, 'construct.yaml');
  const jsonPath = join(repoDir, 'manifest.json');

  let content: string;
  let isLegacy = false;

  if (existsSync(yamlPath)) {
    content = readFileSync(yamlPath, 'utf-8');
  } else if (existsSync(jsonPath)) {
    isLegacy = true;
    const json = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    return {
      slug,
      name: json.name || slug,
      description: json.description || '',
      short_description: '',
      version: json.version || '1.0.0',
      category: 'design',
      construct_type: 'skill-pack',
      skills_count: json.skills?.length || 0,
      verification_tier: 'UNVERIFIED',
      skills: (json.skills || []).map((s: any) => ({ slug: s.slug || s, description: '' })),
      commands: [],
      governs: [],
      governed_by: [],
      composes_with: [],
      depends_on: [],
      composition_paths: null,
      repository_url: null,
    };
  } else {
    return null;
  }

  // Count skills from directory
  const skillsDir = join(repoDir, 'skills');
  let skillSlugs: string[] = [];
  if (existsSync(skillsDir)) {
    try {
      skillSlugs = readdirSync(skillsDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && existsSync(join(skillsDir, d.name, 'index.yaml')))
        .map(d => d.name);
    } catch {}
  }

  const domain = yamlList(content, 'domain');
  const category = normalizeCategory(domain[0] || 'development');

  // Extract skills from construct.yaml skills list (more accurate than directory)
  const yamlSkills = content.match(/^skills:\s*\n((?:  - .+\n)*)/m);
  const skills: Array<{ slug: string; description: string }> = [];
  if (yamlSkills) {
    const skillLines = yamlSkills[1].split('\n');
    for (const line of skillLines) {
      const slugMatch = line.match(/slug:\s*(.+)/);
      if (slugMatch) skills.push({ slug: slugMatch[1].trim(), description: '' });
    }
  }

  // Extract commands
  const commands: Array<{ name: string; description: string }> = [];
  const cmdMatch = content.match(/^commands:\s*\n((?:  - .+\n)*)/m);
  if (cmdMatch) {
    const cmdBlock = cmdMatch[1];
    const nameMatches = cmdBlock.matchAll(/name:\s*(.+)/g);
    for (const m of nameMatches) {
      commands.push({ name: m[1].trim(), description: '' });
    }
  }

  const governs = yamlList(content, 'governs');
  const governed_by = yamlList(content, 'governed_by');
  const composes_with = yamlList(content, 'compose_with').length > 0
    ? yamlList(content, 'compose_with')
    : yamlList(content, 'composes_with');
  const depends_on = yamlList(content, 'pack_dependencies');

  const reads = yamlNestedList(content, 'composition_paths', 'reads');
  const writes = yamlNestedList(content, 'composition_paths', 'writes');

  return {
    slug,
    name: yamlVal(content, 'name'),
    description: yamlVal(content, 'description'),
    short_description: yamlVal(content, 'short_description'),
    version: yamlVal(content, 'version'),
    category,
    construct_type: yamlVal(content, 'type') || 'skill-pack',
    skills_count: skills.length || skillSlugs.length,
    verification_tier: 'UNVERIFIED',
    skills: skills.length > 0 ? skills : skillSlugs.map(s => ({ slug: s, description: '' })),
    commands,
    governs,
    governed_by,
    composes_with,
    depends_on,
    composition_paths: (reads.length || writes.length)
      ? { reads: reads.length ? reads : undefined, writes: writes.length ? writes : undefined }
      : null,
    repository_url: `https://github.com/0xHoneyJar/construct-${slug}`,
  };
}

function computeGraph(constructs: ConstructSummary[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const slugSet = new Set(constructs.map(c => c.slug));
  const nodes: GraphNode[] = constructs.map(c => ({ id: c.slug, name: c.name, category: c.category }));
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  for (const c of constructs) {
    for (const t of c.governs) {
      if (slugSet.has(t)) { const k = `${c.slug}-gov-${t}`; if (!seen.has(k)) { seen.add(k); edges.push({ source: c.slug, target: t, type: 'governs' }); } }
    }
    for (const t of c.depends_on) {
      if (slugSet.has(t)) { const k = `${c.slug}-dep-${t}`; if (!seen.has(k)) { seen.add(k); edges.push({ source: c.slug, target: t, type: 'depends_on' }); } }
    }
    for (const t of c.composes_with) {
      if (slugSet.has(t)) { const k = `${c.slug}-comp-${t}`; if (!seen.has(k)) { seen.add(k); edges.push({ source: c.slug, target: t, type: 'composes_with' }); } }
    }
  }

  // Path-based edges
  const writerIndex = new Map<string, string[]>();
  for (const c of constructs) {
    for (const path of c.composition_paths?.writes || []) {
      if (!writerIndex.has(path)) writerIndex.set(path, []);
      writerIndex.get(path)!.push(c.slug);
    }
  }
  for (const c of constructs) {
    for (const path of c.composition_paths?.reads || []) {
      for (const w of writerIndex.get(path) || []) {
        if (w === c.slug) continue;
        const k = `${w}-via-${c.slug}`;
        if (!seen.has(k)) { seen.add(k); edges.push({ source: w, target: c.slug, type: 'connected_via' }); }
      }
    }
  }

  return { nodes, edges };
}

// Main
const repos = readdirSync(CACHE_DIR)
  .filter(d => d.startsWith('construct-'))
  .map(d => d.replace('construct-', ''));

console.log(`[prebuild] Reading ${repos.length} constructs from ${CACHE_DIR}`);

const constructs: ConstructSummary[] = [];
for (const slug of repos) {
  const c = readConstructFromCache(slug);
  if (c) constructs.push(c);
  else console.warn(`  SKIP: ${slug}`);
}

constructs.sort((a, b) => a.slug.localeCompare(b.slug));

const graph = computeGraph(constructs);

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(
  join(OUTPUT_DIR, 'constructs.json'),
  JSON.stringify({ constructs, graph }, null, 2)
);

console.log(`[prebuild] ${constructs.length} constructs, ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
console.log(`[prebuild] Written to .vitepress/data/constructs.json`);

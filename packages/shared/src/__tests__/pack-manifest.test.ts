import { describe, it, expect } from 'vitest';
import { packManifestSchema, validatePackManifest } from '../validation.js';

const MINIMAL_MANIFEST = {
  name: 'Test Pack',
  slug: 'test-pack',
  version: '1.0.0',
  description: 'A test pack for validation',
  skills: [{ slug: 'test-skill', path: 'skills/test-skill/' }],
};

// ── Schema Extension Tests (FR-1) ──────────────────

describe('FR-1: Bridgebuilder schema extension', () => {
  it('accepts manifest with all new fields', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      domain: ['user-research', 'feedback'],
      expertise: ['sentiment-analysis', 'journey-mapping'],
      golden_path: {
        commands: [
          {
            name: '/observe',
            description: 'Capture your first user insight',
            truename_map: { '/observe': '/observing-users' },
          },
        ],
        detect_state: 'check-observer-state.sh',
      },
      workflow: {
        depth: 'light' as const,
        gates: {
          prd: 'skip' as const,
          sdd: 'skip' as const,
          sprint: 'full' as const,
          implement: 'required' as const,
          review: 'textual' as const,
          audit: 'lightweight' as const,
        },
        verification: { method: 'manual' as const },
      },
      methodology: {
        references: ['https://example.com/jtbd'],
        principles: ['Jobs to be done', 'Continuous discovery'],
        knowledge_base: 'identity/expertise.yaml',
      },
      tier: 'L2' as const,
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('accepts manifest without any new fields (backward compat)', () => {
    const result = packManifestSchema.safeParse(MINIMAL_MANIFEST);
    expect(result.success).toBe(true);
  });

  it('accepts manifest with only workflow', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      workflow: {
        depth: 'deep' as const,
        gates: {
          prd: 'full' as const,
          implement: 'required' as const,
        },
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('rejects invalid tier value', () => {
    const manifest = { ...MINIMAL_MANIFEST, tier: 'L4' };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid workflow.depth', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      workflow: { depth: 'extreme', gates: {} },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid workflow.gates.prd value', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      workflow: { depth: 'light', gates: { prd: 'partial' } },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects workflow.gates.implement as "skip"', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      workflow: { depth: 'light', gates: { implement: 'skip' } },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('accepts workflow.gates with partial gates', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      workflow: {
        depth: 'standard' as const,
        gates: { prd: 'full' as const, implement: 'required' as const },
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('rejects golden_path with empty commands array', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      golden_path: { commands: [] },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('accepts golden_path with truename_map', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      golden_path: {
        commands: [
          {
            name: '/taste',
            description: 'Define visual taste',
            truename_map: { '/taste': '/synthesizing-taste' },
          },
        ],
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('accepts methodology with partial sub-fields', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      methodology: { principles: ['Keep it simple'] },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });
});

// ── TS/Zod Sync Tests (FR-2) ──────────────────

describe('FR-2: TS/Zod synchronization', () => {
  it('accepts dependencies with Record<string, string> skills', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      dependencies: {
        loa_version: '>=1.30.0',
        skills: { 'observing-users': '>=1.0.0' },
        packs: { observer: '>=1.0.0' },
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('accepts author as string shorthand', () => {
    const manifest = { ...MINIMAL_MANIFEST, author: 'Jane Doe' };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('accepts author as object', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      author: { name: 'Jane', email: 'jane@example.com' },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('accepts long_description, repository, homepage, documentation', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      long_description: 'A long description of the pack',
      repository: 'https://github.com/example/pack',
      homepage: 'https://example.com',
      documentation: 'https://docs.example.com',
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('accepts keywords array', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      keywords: ['testing', 'quality'],
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('accepts engines object', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      engines: { loa: '>=1.30.0', node: '>=18.0.0' },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('accepts dependencies.loa_version', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      dependencies: { loa_version: '>=1.29.0' },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });
});

// ── Backward Compatibility Tests ──────────────────

describe('Backward compatibility', () => {
  it('existing v3 manifest (minimal fields) passes validation', () => {
    const result = packManifestSchema.safeParse(MINIMAL_MANIFEST);
    expect(result.success).toBe(true);
  });

  it('existing v3 manifest (full fields) passes validation', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      schema_version: 3,
      tags: ['testing'],
      license: 'MIT',
      claude_instructions: 'instructions.md',
      tools: {
        vitest: {
          purpose: 'Test runner',
          check: 'npx vitest --version',
          required: false,
        },
      },
      quick_start: {
        command: '/test-plan',
        description: 'Start with a test plan',
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('schema_version defaults to 1 when absent', () => {
    const result = packManifestSchema.safeParse(MINIMAL_MANIFEST);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schema_version).toBe(1);
    }
  });

  it('.passthrough() allows unknown fields', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      some_future_field: 'hello',
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });
});

// ── Workflow Gate Contract Tests (FR-3) ──────────────────

describe('FR-3: Workflow gate contracts', () => {
  it('Beehive workflow gates are valid', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      workflow: {
        depth: 'light' as const,
        gates: {
          prd: 'skip' as const,
          sdd: 'skip' as const,
          sprint: 'full' as const,
          implement: 'required' as const,
          review: 'textual' as const,
          audit: 'lightweight' as const,
        },
        verification: { method: 'manual' as const },
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('Artisan workflow gates are valid', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      workflow: {
        depth: 'light' as const,
        app_zone_access: true,
        gates: {
          prd: 'skip' as const,
          sdd: 'skip' as const,
          sprint: 'full' as const,
          implement: 'required' as const,
          review: 'visual' as const,
          audit: 'skip' as const,
        },
        verification: { method: 'visual' as const },
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('GTM-Collective light workflow is valid', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      workflow: {
        depth: 'light' as const,
        gates: {
          prd: 'skip' as const,
          sdd: 'skip' as const,
          sprint: 'skip' as const,
          implement: 'required' as const,
          review: 'textual' as const,
          audit: 'skip' as const,
        },
        verification: { method: 'manual' as const },
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('Crucible deep workflow is valid', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      workflow: {
        depth: 'deep' as const,
        gates: {
          prd: 'full' as const,
          sdd: 'full' as const,
          sprint: 'full' as const,
          implement: 'required' as const,
          review: 'both' as const,
          audit: 'full' as const,
        },
        verification: { method: 'test' as const },
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });
});

// ── validatePackManifest helper tests ──────────────────

describe('validatePackManifest helper', () => {
  it('returns success with data for valid manifest', () => {
    const result = validatePackManifest(MINIMAL_MANIFEST);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.slug).toBe('test-pack');
  });

  it('returns errors for invalid manifest', () => {
    const result = validatePackManifest({ name: 'Missing fields' });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });
});

// ── Boundary and edge case tests (audit W-10, W-13, W-14) ──────────────────

describe('Boundary validation', () => {
  it('rejects domain array with >10 items', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      domain: Array.from({ length: 11 }, (_, i) => `tag-${i}`),
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects domain item exceeding 50 characters', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      domain: ['a'.repeat(51)],
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects expertise item exceeding 100 characters', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      expertise: ['a'.repeat(101)],
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects golden_path command name exceeding 100 characters', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      golden_path: {
        commands: [{ name: 'a'.repeat(101), description: 'test' }],
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects methodology with >20 references', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      methodology: {
        references: Array.from({ length: 21 }, (_, i) => `ref-${i}`),
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });
});

describe('Workflow required fields (fail-closed)', () => {
  it('rejects workflow without depth', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      workflow: { gates: { prd: 'skip' } },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects workflow without gates', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      workflow: { depth: 'light' },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects workflow with empty object', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      workflow: {},
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });
});

describe('Dependencies loa_version rename (W-13)', () => {
  it('accepts loa_version field name', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      dependencies: { loa_version: '>=1.0.0' },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
    const deps = result.data?.dependencies as { loa_version?: string } | undefined;
    expect(deps?.loa_version).toBe('>=1.0.0');
  });

  it('ignores old loa field name (not validated)', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      dependencies: { loa: '>=1.0.0' },
    };
    const result = packManifestSchema.safeParse(manifest);
    // Parses successfully but loa is not a recognized field
    expect(result.success).toBe(true);
    const deps = result.data?.dependencies as { loa_version?: string } | undefined;
    expect(deps?.loa_version).toBeUndefined();
  });
});

describe('truename_map key validation (W-1)', () => {
  it('rejects truename_map with empty key', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      golden_path: {
        commands: [{
          name: 'test',
          description: 'test',
          truename_map: { '': 'target' },
        }],
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects truename_map with key exceeding 100 characters', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      golden_path: {
        commands: [{
          name: 'test',
          description: 'test',
          truename_map: { ['a'.repeat(101)]: 'target' },
        }],
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });
});

// ── Bridge iteration 2 findings (I-6) ──────────────────

describe('Golden path description non-empty (I-6)', () => {
  it('rejects golden_path command with empty description', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      golden_path: {
        commands: [{ name: 'test', description: '' }],
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });
});

// ── Construct Lifecycle Tests (cycle-032) ──────────────────

describe('Construct Lifecycle: type field', () => {
  it('accepts valid construct types', () => {
    for (const type of ['skill-pack', 'tool-pack', 'codex', 'template'] as const) {
      const result = packManifestSchema.safeParse({ ...MINIMAL_MANIFEST, type });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid type value', () => {
    const result = packManifestSchema.safeParse({ ...MINIMAL_MANIFEST, type: 'plugin' });
    expect(result.success).toBe(false);
  });
});

describe('Construct Lifecycle: runtime_requirements', () => {
  it('accepts valid runtime_requirements with all fields', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      runtime_requirements: {
        runtime: 'node',
        dependencies: { 'typescript': '>=5.0.0', '@anthropic-ai/sdk': '>=0.10.0' },
        external_tools: ['docker', 'kubectl'],
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('accepts empty runtime_requirements', () => {
    const manifest = { ...MINIMAL_MANIFEST, runtime_requirements: {} };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });
});

describe('Construct Lifecycle: credentials', () => {
  it('accepts valid credentials with UPPER_SNAKE_CASE name', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      credentials: [
        { name: 'ANTHROPIC_API_KEY', description: 'API key for Claude', sensitive: true, optional: false },
        { name: 'GITHUB_TOKEN', description: 'GitHub access token' },
      ],
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('rejects credentials with lowercase name', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      credentials: [
        { name: 'api_key', description: 'Invalid lowercase name' },
      ],
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects credentials with kebab-case name', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      credentials: [
        { name: 'API-KEY', description: 'Hyphens not allowed' },
      ],
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });
});

describe('Construct Lifecycle: access_layer', () => {
  it('accepts all transport types', () => {
    for (const transport of ['stdio', 'sse', 'http'] as const) {
      const manifest = {
        ...MINIMAL_MANIFEST,
        access_layer: { type: 'mcp' as const, entrypoint: 'server.js', transport },
      };
      const result = packManifestSchema.safeParse(manifest);
      expect(result.success).toBe(true);
    }
  });

  it('accepts all access layer types', () => {
    for (const type of ['mcp', 'file', 'api'] as const) {
      const manifest = {
        ...MINIMAL_MANIFEST,
        access_layer: { type },
      };
      const result = packManifestSchema.safeParse(manifest);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid access layer type', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      access_layer: { type: 'grpc' },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });
});

describe('Construct Lifecycle: portability_score', () => {
  it('accepts 0.0 (minimum)', () => {
    const result = packManifestSchema.safeParse({ ...MINIMAL_MANIFEST, portability_score: 0 });
    expect(result.success).toBe(true);
  });

  it('accepts 1.0 (maximum)', () => {
    const result = packManifestSchema.safeParse({ ...MINIMAL_MANIFEST, portability_score: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts 0.75 (mid-range)', () => {
    const result = packManifestSchema.safeParse({ ...MINIMAL_MANIFEST, portability_score: 0.75 });
    expect(result.success).toBe(true);
  });

  it('rejects -0.1 (below minimum)', () => {
    const result = packManifestSchema.safeParse({ ...MINIMAL_MANIFEST, portability_score: -0.1 });
    expect(result.success).toBe(false);
  });

  it('rejects 1.1 (above maximum)', () => {
    const result = packManifestSchema.safeParse({ ...MINIMAL_MANIFEST, portability_score: 1.1 });
    expect(result.success).toBe(false);
  });
});

describe('Construct Lifecycle: identity and hooks', () => {
  it('accepts identity with persona and expertise paths', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      identity: { persona: 'identity/persona.yaml', expertise: 'identity/expertise.yaml' },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('accepts hooks with post_install and post_update', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      hooks: { post_install: 'scripts/setup.sh', post_update: 'scripts/migrate.sh' },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('accepts empty identity and hooks objects', () => {
    const manifest = { ...MINIMAL_MANIFEST, identity: {}, hooks: {} };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });
});

describe('Construct Lifecycle: full manifest with all lifecycle fields', () => {
  it('accepts a complete lifecycle-enabled manifest', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      schema_version: 3,
      type: 'tool-pack' as const,
      runtime_requirements: {
        runtime: 'node',
        dependencies: { '@anthropic-ai/sdk': '>=0.10.0' },
        external_tools: ['docker'],
      },
      paths: { state: '.construct/state', cache: '.construct/cache' },
      credentials: [
        { name: 'ANTHROPIC_API_KEY', description: 'Claude API key', sensitive: true },
      ],
      access_layer: { type: 'mcp' as const, entrypoint: 'server.ts', transport: 'stdio' as const },
      portability_score: 0.6,
      identity: { persona: 'identity/persona.yaml' },
      hooks: { post_install: 'scripts/setup.sh' },
      tier: 'L2' as const,
      domain: ['ai-tools'],
      workflow: {
        depth: 'standard' as const,
        gates: { implement: 'required' as const, review: 'textual' as const },
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('backward compat: existing manifests still pass with no lifecycle fields', () => {
    const manifest = {
      name: 'Beehive',
      slug: 'observer',
      version: '1.0.0',
      description: 'User research and feedback collection',
      schema_version: 3,
      skills: [
        { slug: 'observing-users', path: 'skills/observing-users/' },
        { slug: 'level-3-diagnostic', path: 'skills/level-3-diagnostic/' },
      ],
      domain: ['user-research'],
      tier: 'L1' as const,
      workflow: {
        depth: 'light' as const,
        gates: {
          prd: 'skip' as const,
          sdd: 'skip' as const,
          sprint: 'full' as const,
          implement: 'required' as const,
          review: 'textual' as const,
          audit: 'lightweight' as const,
        },
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });
});

describe('Construct Lifecycle: meta_probe drift reconciliation', () => {
  it('accepts meta_probe with all fields', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      meta_probe: { name: 'pulse', command: '/pulse', skill: 'health-check', scope: 'internal' as const },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('accepts meta_probe with only name', () => {
    const manifest = { ...MINIMAL_MANIFEST, meta_probe: { name: 'heartbeat' } };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });
});

// ── Substrate-Construct schema (cycle 2026-05-03 substrate-integration) ──

describe('Substrate-Construct: type + executable + runtime + requirements + streams', () => {
  const SUBSTRATE_MANIFEST = {
    name: 'Lore Essay Grader',
    slug: 'lore-essay-grader',
    version: '0.1.0',
    description: 'BORGES-personified subjective essay grader for substrate-graded activity steps',
    type: 'substrate-construct' as const,
    runtime: {
      engine: 'effect-ts' as const,
      engine_version: '^3.10.0',
      node_version: '>=20.0.0',
    },
    executable: {
      entry: 'src/index.ts',
      export: 'gradeLoreEssay',
      protocol: {
        input: 'src/protocol.ts#LoreEssayInput',
        output: 'src/protocol.ts#LoreEssayOutput',
      },
    },
    requirements: [
      { tag: 'ModelRunner', contract: 'src/grader.ts#ModelRunner', description: 'LLM invocation port' },
      { tag: 'Logger', contract: 'effect/Logger' },
    ],
    streams: {
      reads: [
        {
          subject: 'agent.lore-essay.submission',
          schema: '@freeside-quests/protocol#SubstrateStepSubmission',
          narrows_to: 'src/protocol.ts#LoreEssayInput',
        },
      ],
      writes: [
        {
          subject: 'agent.lore-essay.verdict',
          schema: '@freeside-quests/protocol#SubstrateStepVerdict',
          from: 'src/protocol.ts#LoreEssayOutput',
        },
      ],
    },
  };

  it('accepts a fully-formed substrate-construct manifest', () => {
    const result = packManifestSchema.safeParse(SUBSTRATE_MANIFEST);
    expect(result.success).toBe(true);
  });

  it('accepts substrate-construct without skills (skills optional for this type)', () => {
    const manifest = { ...SUBSTRATE_MANIFEST };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('accepts skill-pack without runtime/executable (backward compat)', () => {
    const manifest = {
      name: 'Skill Pack',
      slug: 'skill-pack-test',
      version: '1.0.0',
      description: 'A normal skill-pack manifest',
      type: 'skill-pack' as const,
      skills: [{ slug: 'do-thing', path: 'skills/do-thing/' }],
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('rejects substrate-construct missing executable', () => {
    const { executable, ...manifest } = SUBSTRATE_MANIFEST;
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message);
      expect(issues.some((m) => m.includes('executable'))).toBe(true);
    }
  });

  it('rejects substrate-construct missing runtime', () => {
    const { runtime, ...manifest } = SUBSTRATE_MANIFEST;
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message);
      expect(issues.some((m) => m.includes('runtime'))).toBe(true);
    }
  });

  it('rejects substrate-construct missing both executable and runtime', () => {
    const { executable, runtime, ...manifest } = SUBSTRATE_MANIFEST;
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('accepts executable on a non-substrate-construct (additive, not exclusive)', () => {
    // Backward-compat: a skill-pack MAY ship an executable too — the
    // conditional only enforces requiredness, not exclusivity.
    const manifest = {
      ...MINIMAL_MANIFEST,
      executable: {
        entry: 'src/index.ts',
        export: 'doThing',
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('rejects requirements entry without tag', () => {
    const manifest = {
      ...SUBSTRATE_MANIFEST,
      requirements: [{ contract: 'effect/Logger' }],
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects executable without entry or export', () => {
    const manifest = { ...SUBSTRATE_MANIFEST, executable: { entry: 'src/index.ts' } };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects streams object entry without subject', () => {
    const manifest = {
      ...SUBSTRATE_MANIFEST,
      streams: { reads: [{ schema: 'foo' }] },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  // ── Bridgebuilder F1 backward-compat fix (cycle 2026-05-03) ──────────

  it('accepts streams cycle-002 string-shape (Intent, Verdict, Artifact)', () => {
    // construct-creator and any future skill-pack riding the cycle-002
    // typed-streams primitive use bare strings naming the stream type.
    // The substrate-construct's substrateStreamEntrySchema must admit BOTH
    // shapes (z.union of string OR object) — verified here.
    const manifest = {
      name: 'Construct Creator',
      slug: 'construct-creator',
      version: '1.0.0',
      description: 'Skill-pack that emits typed streams (cycle-002 convention)',
      type: 'skill-pack' as const,
      skills: [{ slug: 'creating-constructs', path: 'skills/creating-constructs/' }],
      streams: {
        reads: ['Intent', 'Operator-Model'],
        writes: ['Verdict', 'Artifact', 'Signal'],
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('accepts streams mixed shape (string + object)', () => {
    // Forward-compat — a pack might bridge cycle-002 typed-streams AND
    // substrate-construct Kafka subjects in the same manifest. Mixed array
    // must pass.
    const manifest = {
      ...SUBSTRATE_MANIFEST,
      streams: {
        reads: [
          'Intent',
          { subject: 'agent.lore-essay.submission', schema: '@freeside-quests/protocol#SubstrateStepSubmission' },
        ],
        writes: ['Verdict'],
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  // ── Bridgebuilder F1 + F2 superRefine tightening (cycle 2026-05-03) ──

  it('rejects substrate-construct with empty runtime: {} (engine missing)', () => {
    // Previously passed because runtime was just-non-undefined. The Bridgebuilder
    // F1 finding caught this: runtime.engine is the load-bearing field that
    // tells the runtime layer which engine to spawn. Empty object defeats
    // dispatch.
    const manifest = { ...SUBSTRATE_MANIFEST, runtime: {} };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message);
      expect(issues.some((m) => m.includes('runtime.engine'))).toBe(true);
    }
  });

  it('rejects substrate-construct executable without protocol.input', () => {
    // Doctrine emphasizes typed-input → typed-output; an executable without
    // protocol refs is opaque. Bridgebuilder F2 finding.
    const manifest = {
      ...SUBSTRATE_MANIFEST,
      executable: {
        entry: 'src/index.ts',
        export: 'doThing',
        protocol: { output: 'src/protocol.ts#Output' }, // input missing
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message);
      expect(issues.some((m) => m.includes('executable.protocol.input'))).toBe(true);
    }
  });

  it('rejects substrate-construct executable without protocol.output', () => {
    const manifest = {
      ...SUBSTRATE_MANIFEST,
      executable: {
        entry: 'src/index.ts',
        export: 'doThing',
        protocol: { input: 'src/protocol.ts#Input' }, // output missing
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message);
      expect(issues.some((m) => m.includes('executable.protocol.output'))).toBe(true);
    }
  });

  it('rejects substrate-construct executable without any protocol declaration', () => {
    const manifest = {
      ...SUBSTRATE_MANIFEST,
      executable: { entry: 'src/index.ts', export: 'doThing' }, // no protocol
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });
});

// ── Territory Stanza Tests (cycle constructs-launcher-cli, PRD FR-13) ─────────

describe('FR-13: additive territory stanza', () => {
  it('existing manifests without a territory stanza still validate (no breaking bump)', () => {
    const result = packManifestSchema.safeParse(MINIMAL_MANIFEST);
    expect(result.success).toBe(true);
  });

  it('accepts a manifest declaring serviceable outcomes and seams', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      territory: {
        serviceable_outcomes: ['registry-sot-coherence', 'topology-health'],
        seams: ['pre-release', 'post-sync'],
      },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.territory?.serviceable_outcomes).toEqual([
        'registry-sot-coherence',
        'topology-health',
      ]);
    }
  });

  it('rejects an out-of-bounds territory stanza (empty outcome id)', () => {
    const manifest = {
      ...MINIMAL_MANIFEST,
      territory: { serviceable_outcomes: [''] },
    };
    const result = packManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });
});

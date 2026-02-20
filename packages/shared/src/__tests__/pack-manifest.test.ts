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
  it('Observer workflow gates are valid', () => {
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

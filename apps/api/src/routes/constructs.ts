import { Hono } from 'hono';
import { logger } from '../lib/logger.js';

/**
 * Constructs Registry Routes
 *
 * Serves the registry of Loa-powered Constructs for Melange Protocol.
 * This is the source of truth for:
 * - Known constructs in the 0xHoneyJar org
 * - Operator Discord IDs for targeted mentions
 * - Construct metadata (repo, description, status)
 *
 * @see melange/README.md - Melange Protocol documentation
 */

// Registry data - source of truth for internal Constructs
// Future: Move to database table for dynamic management
const CONSTRUCTS_REGISTRY = {
  version: '2.0.0',
  org: '0xHoneyJar',
  last_updated: '2026-01-22',

  // The mother framework
  framework: {
    name: 'loa',
    display_name: 'Loa',
    description: 'The mother Construct. Agent-driven development framework.',
    repo: '0xHoneyJar/loa',
    operator: {
      display_name: 'jani',
      github_username: 'jani',
      discord_id: '970593060553646101',
    },
  },

  // This registry
  registry: {
    name: 'loa-constructs',
    display_name: 'Loa Constructs',
    description: 'Central registry and API for Loa-powered Constructs.',
    repo: '0xHoneyJar/loa-constructs',
    api: 'https://loa-constructs-api.fly.dev/v1',
    operator: {
      display_name: 'soju',
      github_username: 'zkSoju',
      discord_id: '970593060553646101',
    },
  },

  // Loa-powered Constructs
  constructs: [
    {
      name: 'sigil',
      display_name: 'Sigil',
      description: 'Creative speed, grounded in truth. Design physics for products.',
      repo: '0xHoneyJar/sigil',
      operator: {
        display_name: 'soju',
        github_username: 'zkSoju',
        discord_id: '259646475666063360',
      },
      status: 'active',
    },
    {
      name: 'hivemind',
      display_name: 'Hivemind',
      description: 'Organizational memory and documentation for THJ ecosystem.',
      repo: '0xHoneyJar/hivemind-os',
      operator: {
        display_name: 'soju',
        github_username: 'zkSoju',
        discord_id: '970593060553646101',
      },
      status: 'active',
    },
    {
      name: 'ruggy',
      display_name: 'Ruggy',
      description: 'Smart contract security auditing powered by Trail of Bits.',
      repo: '0xHoneyJar/ruggy-security',
      operator: {
        display_name: 'soju',
        github_username: 'zkSoju',
        discord_id: '970593060553646101',
      },
      status: 'active',
    },
  ],

  // Virtual constructs (no repo)
  virtual: [
    {
      name: 'human',
      display_name: 'Human',
      description: 'Escalate to human operator for clarification.',
      note: "Uses human_discord_id from sender's .loa.config.yaml",
    },
  ],
};

const constructsRouter = new Hono();

/**
 * GET /v1/constructs
 * List all registered Constructs
 */
constructsRouter.get('/', (c) => {
  const requestId = c.get('requestId');
  logger.info({ requestId }, 'Constructs registry requested');

  return c.json(CONSTRUCTS_REGISTRY);
});

/**
 * GET /v1/constructs/operator-map
 * Get Discord operator mapping for melange-notify.yml
 *
 * Returns a simple object that can be copied directly into the workflow.
 */
constructsRouter.get('/operator-map', (c) => {
  const requestId = c.get('requestId');

  // Build operator map from registry (v2 nested operator structure)
  const operatorMap: Record<string, string> = {};

  // Add framework
  operatorMap[CONSTRUCTS_REGISTRY.framework.name] = CONSTRUCTS_REGISTRY.framework.operator.discord_id;

  // Add registry
  operatorMap[CONSTRUCTS_REGISTRY.registry.name] = CONSTRUCTS_REGISTRY.registry.operator.discord_id;

  // Add all constructs
  for (const construct of CONSTRUCTS_REGISTRY.constructs) {
    operatorMap[construct.name] = construct.operator.discord_id;
  }

  logger.info({ requestId, count: Object.keys(operatorMap).length }, 'Operator map requested');

  return c.json({
    _comment: 'Copy this to melange-notify.yml OPERATOR_MAP',
    operator_map: operatorMap,
  });
});

/**
 * GET /v1/constructs/:name
 * Get a specific Construct by name
 */
constructsRouter.get('/:name', (c) => {
  const name = c.req.param('name');
  const requestId = c.get('requestId');

  // Check framework
  if (CONSTRUCTS_REGISTRY.framework.name === name) {
    return c.json({
      type: 'framework',
      ...CONSTRUCTS_REGISTRY.framework
    });
  }

  // Check registry
  if (CONSTRUCTS_REGISTRY.registry.name === name) {
    return c.json({
      type: 'registry',
      ...CONSTRUCTS_REGISTRY.registry
    });
  }

  // Check constructs
  const construct = CONSTRUCTS_REGISTRY.constructs.find((c) => c.name === name);
  if (construct) {
    return c.json({
      type: 'construct',
      ...construct
    });
  }

  // Check virtual
  const virtual = CONSTRUCTS_REGISTRY.virtual.find((v) => v.name === name);
  if (virtual) {
    return c.json({
      type: 'virtual',
      ...virtual
    });
  }

  logger.warn({ requestId, name }, 'Construct not found');
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: `Construct '${name}' not found`,
      },
      request_id: requestId,
    },
    404
  );
});

/**
 * GET /v1/constructs/list/names
 * Get list of all Construct names (for validation)
 * Note: Uses /list/names to avoid collision with /:name dynamic route
 */
constructsRouter.get('/list/names', (c) => {
  const names = [
    CONSTRUCTS_REGISTRY.framework.name,
    CONSTRUCTS_REGISTRY.registry.name,
    ...CONSTRUCTS_REGISTRY.constructs.map((c) => c.name),
    ...CONSTRUCTS_REGISTRY.virtual.map((v) => v.name),
  ];

  return c.json({ names });
});

export { constructsRouter };

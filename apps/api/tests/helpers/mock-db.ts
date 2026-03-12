/**
 * Shared Drizzle Mock Chain Factory
 *
 * Creates a fully-chained mock DB matching the pattern from
 * tests/contract/api-snapshots.test.ts:59-133.
 *
 * Usage:
 *   vi.mock('../../src/db/index.js', () => getMockDbModule());
 *   // Then in tests:
 *   const mockDb = (await import('../../src/db/index.js')).db as ReturnType<typeof createMockDb>;
 *   // Configure return values:
 *   mockDb._selectResult.mockResolvedValueOnce([...]);
 */

import { vi } from 'vitest';

/**
 * Create a mock Drizzle database with full chain support.
 *
 * The chain pattern mirrors real Drizzle:
 *   select().from().where().orderBy().limit().offset() -> Promise<rows[]>
 *   insert().values().returning() -> Promise<rows[]>
 *   update().set().where().returning() -> Promise<rows[]>
 *   db.execute() -> Promise<result>
 *   db.query.tableName.findFirst() -> Promise<row | null>
 *   db.query.tableName.findMany() -> Promise<rows[]>
 */
export function createMockDb() {
  // Terminal mocks that tests can configure with mockResolvedValueOnce
  const selectTerminal = vi.fn(() => Promise.resolve([]));
  const insertTerminal = vi.fn(() => Promise.resolve([]));
  const updateTerminal = vi.fn(() => Promise.resolve([]));
  const deleteTerminal = vi.fn(() => Promise.resolve([]));
  const executeTerminal = vi.fn(() => Promise.resolve({ rows: [] }));

  // Build select chain: select().from().leftJoin().where().orderBy().limit().offset()
  const selectChain = {
    from: vi.fn(() => selectChain),
    leftJoin: vi.fn(() => selectChain),
    innerJoin: vi.fn(() => selectChain),
    where: vi.fn(() => selectChain),
    orderBy: vi.fn(() => selectChain),
    groupBy: vi.fn(() => selectChain),
    having: vi.fn(() => selectChain),
    limit: vi.fn(() => selectChain),
    offset: vi.fn(() => selectChain),
    then: (resolve: (value: unknown) => void, reject?: (reason: unknown) => void) =>
      selectTerminal().then(resolve, reject),
  };

  // Build insert chain: insert().values().returning().onConflictDoUpdate().onConflictDoNothing()
  const insertChain = {
    values: vi.fn(() => insertChain),
    returning: vi.fn(() => insertChain),
    onConflictDoUpdate: vi.fn(() => insertChain),
    onConflictDoNothing: vi.fn(() => insertChain),
    then: (resolve: (value: unknown) => void, reject?: (reason: unknown) => void) =>
      insertTerminal().then(resolve, reject),
  };

  // Build update chain: update().set().where().returning()
  const updateChain = {
    set: vi.fn(() => updateChain),
    where: vi.fn(() => updateChain),
    returning: vi.fn(() => updateChain),
    then: (resolve: (value: unknown) => void, reject?: (reason: unknown) => void) =>
      updateTerminal().then(resolve, reject),
  };

  // Build delete chain: delete().where().returning()
  const deleteChain = {
    where: vi.fn(() => deleteChain),
    returning: vi.fn(() => deleteChain),
    then: (resolve: (value: unknown) => void, reject?: (reason: unknown) => void) =>
      deleteTerminal().then(resolve, reject),
  };

  // Query API (Drizzle relational queries)
  const createQueryTable = () => ({
    findFirst: vi.fn(() => Promise.resolve(null)),
    findMany: vi.fn(() => Promise.resolve([])),
  });

  const db = {
    select: vi.fn(() => selectChain),
    insert: vi.fn(() => insertChain),
    update: vi.fn(() => updateChain),
    delete: vi.fn(() => deleteChain),
    execute: executeTerminal,
    query: {
      packs: createQueryTable(),
      skills: createQueryTable(),
      users: createQueryTable(),
      teams: createQueryTable(),
      teamMembers: createQueryTable(),
      subscriptions: createQueryTable(),
      licenses: createQueryTable(),
      apiKeys: createQueryTable(),
      auditLogs: createQueryTable(),
    },
    // Expose terminal mocks for test configuration
    _selectResult: selectTerminal,
    _insertResult: insertTerminal,
    _updateResult: updateTerminal,
    _deleteResult: deleteTerminal,
    _executeResult: executeTerminal,
    _selectChain: selectChain,
    _insertChain: insertChain,
    _updateChain: updateChain,
  };

  return db;
}

/**
 * Get the full vi.mock() payload for the db/index module.
 * Includes all schema table stubs, enum exports, and relation exports.
 *
 * Usage:
 *   vi.mock('../../src/db/index.js', () => getMockDbModule());
 */
export function getMockDbModule() {
  const db = createMockDb();

  return {
    db,
    // Schema table exports — stubs matching api-snapshots.test.ts:89-132
    packs: { name: 'packs' },
    packVersions: { name: 'packVersions' },
    packFiles: { name: 'packFiles' },
    skills: { name: 'skills' },
    skillVersions: { name: 'skillVersions' },
    skillFiles: { name: 'skillFiles' },
    users: { name: 'users' },
    teams: { name: 'teams' },
    teamMembers: { name: 'teamMembers' },
    subscriptions: { name: 'subscriptions' },
    licenses: { name: 'licenses' },
    apiKeys: { name: 'apiKeys' },
    auditLogs: { name: 'auditLogs' },
    teamInvitations: { name: 'teamInvitations' },
    packSubscriptions: { name: 'packSubscriptions' },
    packInstallations: { name: 'packInstallations' },
    skillUsage: { name: 'skillUsage' },
    graduationRequests: { name: 'graduationRequests' },
    // Enum exports
    teamRoleEnum: {},
    subscriptionTierEnum: {},
    subscriptionStatusEnum: {},
    skillCategoryEnum: {},
    ownerTypeEnum: {},
    usageActionEnum: {},
    packStatusEnum: {},
    packPricingTypeEnum: {},
    packInstallActionEnum: {},
    constructMaturityEnum: {},
    graduationRequestStatusEnum: {},
    invitationStatusEnum: {},
    // Relations exports
    usersRelations: {},
    teamsRelations: {},
    teamMembersRelations: {},
    teamInvitationsRelations: {},
    subscriptionsRelations: {},
    skillsRelations: {},
    skillVersionsRelations: {},
    skillFilesRelations: {},
    packsRelations: {},
    packVersionsRelations: {},
    packFilesRelations: {},
    // Drizzle-ORM re-exports used in queries
    eq: vi.fn(() => ({})),
    and: vi.fn(() => ({})),
    or: vi.fn(() => ({})),
    sql: vi.fn(() => ({})),
    inArray: vi.fn(() => ({})),
  };
}

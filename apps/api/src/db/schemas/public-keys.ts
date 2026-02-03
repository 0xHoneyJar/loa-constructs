import { pgTable, uuid, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

/**
 * Public Keys table
 * Stores RSA public keys for JWT signature verification
 * @see sdd-license-jwt-rs256.md §3.1 New Table: public_keys
 * @see prd-license-jwt-rs256.md FR-3: Public Key Endpoint
 */
export const publicKeys = pgTable(
  'public_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    keyId: varchar('key_id', { length: 64 }).unique().notNull(),
    algorithm: varchar('algorithm', { length: 16 }).notNull().default('RS256'),
    publicKey: text('public_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    isCurrent: boolean('is_current').notNull().default(false),
  },
  (table) => ({
    keyIdIdx: index('idx_public_keys_key_id').on(table.keyId),
    isCurrentIdx: index('idx_public_keys_is_current').on(table.isCurrent),
  })
);

export type PublicKey = typeof publicKeys.$inferSelect;
export type NewPublicKey = typeof publicKeys.$inferInsert;

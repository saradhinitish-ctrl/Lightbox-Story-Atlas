import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('desk_workspaces', { owner: text('owner').primaryKey(), revision: integer('revision').notNull().default(0), writeToken: text('write_token').notNull().default(''), updatedAt: text('updated_at').notNull() });
export const chunks = sqliteTable('desk_chunks', { owner: text('owner').notNull(), position: integer('position').notNull(), payload: text('payload').notNull() }, t => [primaryKey({ columns: [t.owner, t.position] })]);

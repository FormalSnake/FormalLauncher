import { pgTable, text, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core'

export const instances = pgTable('instances', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  minecraftVersion: text('minecraft_version').notNull(),
  modLoader: text('mod_loader').notNull(),
  mods: jsonb('mods').$type<unknown[]>().default([]),
  jvmArgs: text('jvm_args'),
  ramMb: text('ram_mb'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

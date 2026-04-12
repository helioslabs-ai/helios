import { boolean, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const heliosRegistry = pgTable("helios_registry", {
  id: uuid("id").primaryKey().defaultRandom(),
  swarmName: text("swarm_name").notNull(),
  model: text("model").notNull().default("gpt-4o"),
  curatorAddress: text("curator_address").unique().notNull(),
  returnPct: numeric("return_pct").default("0").notNull(),
  pnlUsdc: numeric("pnl_usdc").default("0").notNull(),
  tradeCount: integer("trade_count").default(0).notNull(),
  cycleCount: integer("cycle_count").default(0).notNull(),
  status: text("status").default("active").notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  registeredAt: timestamp("registered_at", { withTimezone: true }).defaultNow().notNull(),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow().notNull(),
});

export type HeliosRegistryRow = typeof heliosRegistry.$inferSelect;
export type HeliosRegistryInsert = typeof heliosRegistry.$inferInsert;

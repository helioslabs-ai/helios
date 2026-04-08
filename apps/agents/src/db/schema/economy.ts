import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const economyEntries = pgTable("economy_entries", {
  id: text("id").primaryKey(),
  cycleId: text("cycle_id").notNull(),
  ts: timestamp("ts", { withTimezone: true }).notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  amount: text("amount").notNull(),
  currency: text("currency").default("USDG").notNull(),
  txHash: text("tx_hash"),
  serviceUrl: text("service_url").notNull(),
  isNoAlpha: boolean("is_no_alpha").default(false).notNull(),
});

import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Singleton row (`id = default`) so live API can serve yield without local yield.json. */
export const yieldState = pgTable("yield_state", {
  id: text("id").primaryKey(),
  platform: text("platform").notNull(),
  amountUsdc: text("amount_usdc").notNull(),
  apy: text("apy").notNull(),
  depositedAt: timestamp("deposited_at", { withTimezone: true }).notNull(),
  txHash: text("tx_hash"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

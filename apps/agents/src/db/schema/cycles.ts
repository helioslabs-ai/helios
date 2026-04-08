import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const cycles = pgTable("cycles", {
  id: text("id").primaryKey(),
  ts: timestamp("ts", { withTimezone: true }).notNull(),
  action: text("action").notNull(),
  reasoning: text("reasoning").notNull(),
  txHashes: text("tx_hashes").array().notNull().default([]),
  onchainTxHash: text("onchain_tx_hash"),
});

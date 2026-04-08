import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const positions = pgTable("positions", {
  id: text("id").primaryKey(),
  token: text("token").notNull(),
  tokenAddress: text("token_address").notNull(),
  sizeUsdc: text("size_usdc").notNull(),
  entryTxHash: text("entry_tx_hash"),
  exitTxHash: text("exit_tx_hash"),
  status: text("status").notNull().default("open"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  reasoning: text("reasoning"),
});

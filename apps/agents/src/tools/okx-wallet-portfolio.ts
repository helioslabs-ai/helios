import { tool } from "ai";
import { z } from "zod";

export const okxWalletPortfolio = tool({
  description: "Get wallet token balances and total value via okx-wallet-portfolio",
  parameters: z.object({
    address: z.string(),
    chainIndex: z.string().default("196"),
  }),
  execute: async ({ address, chainIndex }) => {
    // TODO: call onchainos portfolio_token_balances / portfolio_total_value
    return { balances: [], totalValue: "0", address, chainIndex };
  },
});

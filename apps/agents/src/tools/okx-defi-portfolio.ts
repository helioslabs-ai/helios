import { tool } from "ai";
import { z } from "zod";

export const okxDefiPortfolio = tool({
  description: "Check open DeFi positions and yield status via okx-defi-portfolio",
  parameters: z.object({
    address: z.string(),
    chainIndex: z.string().default("196"),
  }),
  execute: async ({ address, chainIndex }) => {
    // TODO: call onchainos defi_positions
    return { positions: [], address, chainIndex };
  },
});

import { tool } from "../ai/tool.js";
import { z } from "zod";
import { cliData } from "./_cli.js";

export const okxDexTrenches = tool({
  description:
    "Discover new/trending token launches on X Layer (memepump). Returns tokens with liquidity, holders, dev info, risk tags. Use for early-stage opportunity discovery.",
  parameters: z.object({
    minHolders: z.string().optional().describe("Minimum holder count"),
    minLiquidity: z.string().optional().describe("Minimum liquidity USD"),
    riskFilter: z.string().optional().describe("true to hide risky tokens"),
  }),
  execute: async ({ minHolders, minLiquidity, riskFilter }) => {
    const args = ["token", "hot-tokens", "--ranking-type", "4", "--chain", "xlayer"];
    if (minHolders) args.push("--holders-min", minHolders);
    if (minLiquidity) args.push("--liquidity-min", minLiquidity);
    if (riskFilter) args.push("--risk-filter", riskFilter);

    const tokens = cliData<unknown[]>(args);
    return { tokens, chain: "xlayer" };
  },
});

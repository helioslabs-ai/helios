import { z } from "zod";
import { tool } from "../ai/tool.js";
import { allItems, CHAIN_INDEX, okxFetch } from "./okx-client.js";

export const okxDexTrenches = tool({
  description:
    "Discover new/trending token launches on X Layer (memepump). Returns tokens with liquidity, holders, dev info, risk tags. Use for early-stage opportunity discovery.",
  parameters: z.object({
    minHolders: z.string().optional().describe("Minimum holder count"),
    minLiquidity: z.string().optional().describe("Minimum liquidity USD"),
    riskFilter: z.string().optional().describe("true to hide risky tokens"),
  }),
  execute: async ({ riskFilter }) => {
    const params: Record<string, string | undefined> = {
      chainIndex: CHAIN_INDEX,
      rankingType: "4",
      riskFilter,
    };
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/market/token/hot-token", {
      params,
    });
    const tokens = allItems(json);
    return { tokens, chain: "xlayer" };
  },
});

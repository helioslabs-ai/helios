import { z } from "zod";
import { tool } from "../ai/tool.js";
import { allItems, CHAIN_INDEX, okxFetch } from "./okx-client.js";

export const okxAuditLog = tool({
  description:
    "Export smart money / leaderboard activity as an audit trail. Returns top trader rankings and recent smart money activity on X Layer for decision context.",
  parameters: z.object({
    timeFrame: z.string().default("3").describe("1=1D, 2=3D, 3=7D, 4=30D, 5=3M"),
    sortBy: z.string().default("1").describe("1=PnL, 2=win rate, 3=tx count, 4=volume, 5=ROI"),
    limit: z.number().default(20),
  }),
  execute: async ({ timeFrame, sortBy }) => {
    const [leaderboardJson, activityJson] = await Promise.all([
      okxFetch<{ data?: unknown[] }>("/api/v6/dex/market/leaderboard/list", {
        params: { chainIndex: CHAIN_INDEX, timeFrame, sortBy },
      }),
      okxFetch<{ data?: unknown[] }>("/api/v6/dex/market/address-tracker/trades", {
        params: { chainIndex: CHAIN_INDEX, trackerType: "smart_money", tradeType: "1" },
      }),
    ]);

    return {
      leaderboard: allItems(leaderboardJson),
      recentSmartMoneyBuys: allItems(activityJson),
    };
  },
});

import { tool } from "ai";
import { z } from "zod";
import { cliData } from "./_cli.js";

export const okxAuditLog = tool({
  description:
    "Export smart money / leaderboard activity as an audit trail. Returns top trader rankings and recent smart money activity on X Layer for decision context.",
  parameters: z.object({
    timeFrame: z.string().default("3").describe("1=1D, 2=3D, 3=7D, 4=30D, 5=3M"),
    sortBy: z.string().default("1").describe("1=PnL, 2=win rate, 3=tx count, 4=volume, 5=ROI"),
    limit: z.number().default(20),
  }),
  execute: async ({ timeFrame, sortBy }) => {
    const leaderboard = cliData([
      "leaderboard",
      "list",
      "--chain",
      "xlayer",
      "--time-frame",
      timeFrame,
      "--sort-by",
      sortBy,
    ]);
    const activity = cliData([
      "tracker",
      "activities",
      "--tracker-type",
      "smart_money",
      "--chain",
      "xlayer",
      "--trade-type",
      "1",
    ]);
    return { leaderboard, recentSmartMoneyBuys: activity };
  },
});

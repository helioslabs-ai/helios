import { tool } from "ai";
import { z } from "zod";
import { cliData } from "./_cli.js";

export const okxTokenHotTokens = tool({
  description:
    "Get hot/trending tokens on X Layer ranked by trending score. Returns token list with price, market cap, liquidity, holders, and risk level.",
  parameters: z.object({
    rankingType: z.string().default("4").describe("4=Trending score, 5=X/Twitter mentions"),
    timeFrame: z.string().optional().describe("1=5min, 2=1h, 3=4h, 4=24h"),
    riskFilter: z.string().optional().describe("true to hide risky tokens"),
  }),
  execute: async ({ rankingType, timeFrame, riskFilter }) => {
    const args = ["token", "hot-tokens", "--ranking-type", rankingType, "--chain", "xlayer"];
    if (timeFrame) args.push("--time-frame", timeFrame);
    if (riskFilter) args.push("--risk-filter", riskFilter);
    const tokens = cliData<unknown[]>(args);
    return { tokens, chain: "xlayer", rankingType };
  },
});

export const okxTokenAdvancedInfo = tool({
  description:
    "Get advanced token info: risk level, creator stats, dev holding %, top-10 holder concentration, token tags (honeypot, lowLiquidity, smartMoneyBuy). Use before trading any token.",
  parameters: z.object({
    address: z.string().describe("Token contract address (lowercase)"),
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ address, chain }) => {
    return cliData([
      "token",
      "advanced-info",
      "--address",
      address.toLowerCase(),
      "--chain",
      chain,
    ]);
  },
});

export const okxTokenPriceInfo = tool({
  description:
    "Get detailed price info: price, 24h change, market cap, liquidity, volume, holder count.",
  parameters: z.object({
    address: z.string().describe("Token contract address (lowercase)"),
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ address, chain }) => {
    return cliData(["token", "price-info", "--address", address.toLowerCase(), "--chain", chain]);
  },
});

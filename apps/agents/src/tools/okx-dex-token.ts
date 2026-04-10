import { z } from "zod";
import { tool } from "../ai/tool.js";
import { allItems, CHAIN_INDEX, firstItem, okxFetch } from "./okx-client.js";

export const okxTokenHotTokens = tool({
  description:
    "Get hot/trending tokens on X Layer ranked by trending score. Returns token list with price, market cap, liquidity, holders, and risk level.",
  parameters: z.object({
    rankingType: z.string().default("4").describe("4=Trending score, 5=X/Twitter mentions"),
    timeFrame: z.string().optional().describe("1=5min, 2=1h, 3=4h, 4=24h"),
    riskFilter: z.string().optional().describe("true to hide risky tokens"),
  }),
  execute: async ({ rankingType, timeFrame, riskFilter }) => {
    const params: Record<string, string | undefined> = {
      chainIndex: CHAIN_INDEX,
      rankingType,
      timeFrame,
      riskFilter,
    };
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/market/token/hot-token", {
      params,
    });
    const tokens = allItems(json);
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
  execute: async ({ address }) => {
    const params: Record<string, string | undefined> = {
      chainIndex: CHAIN_INDEX,
      tokenContractAddress: address.toLowerCase(),
    };
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/market/token/advanced-info", {
      params,
    });
    return firstItem(json);
  },
});

export const okxTokenPriceInfo = tool({
  description:
    "Get detailed price info: price, 24h change, market cap, liquidity, volume, holder count.",
  parameters: z.object({
    address: z.string().describe("Token contract address (lowercase)"),
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ address }) => {
    const body = [{ chainIndex: CHAIN_INDEX, tokenContractAddress: address.toLowerCase() }];
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/market/price-info", {
      method: "POST",
      body,
    });
    return firstItem(json);
  },
});

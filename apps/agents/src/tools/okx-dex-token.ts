import { tool } from "ai";
import { z } from "zod";

export const okxDexTokenSearch = tool({
  description: "Search tokens on X Layer via okx-dex-token",
  parameters: z.object({
    keyword: z.string(),
    chainIndex: z.string().default("196"),
  }),
  execute: async ({ keyword, chainIndex }) => {
    // TODO: call onchainos token_search
    return { tokens: [], keyword, chainIndex };
  },
});

export const okxDexTokenTrending = tool({
  description: "Get trending / hot tokens on X Layer",
  parameters: z.object({
    chainIndex: z.string().default("196"),
  }),
  execute: async ({ chainIndex }) => {
    // TODO: call onchainos token_trending
    return { trending: [], chainIndex };
  },
});

export const okxDexTokenHolders = tool({
  description: "Get token holder distribution for risk analysis",
  parameters: z.object({
    tokenAddress: z.string(),
    chainIndex: z.string().default("196"),
  }),
  execute: async ({ tokenAddress, chainIndex }) => {
    // TODO: call onchainos token_holders
    return { holders: [], tokenAddress, chainIndex };
  },
});

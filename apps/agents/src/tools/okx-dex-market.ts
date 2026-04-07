import { tool } from "ai";
import { z } from "zod";

export const okxDexMarketPrice = tool({
  description: "Get current token price on X Layer via okx-dex-market",
  parameters: z.object({
    tokenAddress: z.string(),
    chainIndex: z.string().default("196"),
  }),
  execute: async ({ tokenAddress, chainIndex }) => {
    // TODO: call onchainos market_price
    return { price: null, tokenAddress, chainIndex };
  },
});

export const okxDexMarketKline = tool({
  description: "Get K-line / OHLC chart data for a token",
  parameters: z.object({
    tokenAddress: z.string(),
    chainIndex: z.string().default("196"),
    period: z.string().default("1h"),
  }),
  execute: async ({ tokenAddress, chainIndex, period }) => {
    // TODO: call onchainos market_kline
    return { kline: [], tokenAddress, chainIndex, period };
  },
});

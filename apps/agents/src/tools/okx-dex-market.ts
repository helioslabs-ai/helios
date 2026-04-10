import { z } from "zod";
import { tool } from "../ai/tool.js";
import { CHAIN_INDEX, firstItem, okxFetch } from "./okx-client.js";

export const okxMarketPrice = tool({
  description: "Get current price of a token by contract address on X Layer.",
  parameters: z.object({
    address: z.string().describe("Token contract address (lowercase)"),
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ address }) => {
    const body = [{ chainIndex: CHAIN_INDEX, tokenContractAddress: address.toLowerCase() }];
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/market/price", {
      method: "POST",
      body,
    });
    return firstItem(json);
  },
});

export const okxMarketKline = tool({
  description: "Get K-line / OHLC chart data for a token. Use to assess entry timing.",
  parameters: z.object({
    address: z.string().describe("Token contract address (lowercase)"),
    chain: z.string().default("xlayer"),
    period: z.string().default("1H").describe("Candle period: 1m, 5m, 15m, 1H, 4H, 1D"),
  }),
  execute: async ({ address, period }) => {
    const params: Record<string, string | undefined> = {
      chainIndex: CHAIN_INDEX,
      tokenContractAddress: address.toLowerCase(),
      bar: period,
    };
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/market/candles", { params });
    return json;
  },
});

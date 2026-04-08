import { tool } from "../ai/tool.js";
import { z } from "zod";
import { cliData } from "./_cli.js";

export const okxMarketPrice = tool({
  description: "Get current price of a token by contract address on X Layer.",
  parameters: z.object({
    address: z.string().describe("Token contract address (lowercase)"),
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ address, chain }) => {
    return cliData(["market", "price", "--address", address.toLowerCase(), "--chain", chain]);
  },
});

export const okxMarketKline = tool({
  description: "Get K-line / OHLC chart data for a token. Use to assess entry timing.",
  parameters: z.object({
    address: z.string().describe("Token contract address (lowercase)"),
    chain: z.string().default("xlayer"),
    period: z.string().default("1H").describe("Candle period: 1m, 5m, 15m, 1H, 4H, 1D"),
  }),
  execute: async ({ address, chain, period }) => {
    return cliData([
      "market",
      "kline",
      "--address",
      address.toLowerCase(),
      "--chain",
      chain,
      "--period",
      period,
    ]);
  },
});

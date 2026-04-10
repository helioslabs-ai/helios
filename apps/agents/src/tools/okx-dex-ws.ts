import { z } from "zod";
import { tool } from "../ai/tool.js";
import { allItems, CHAIN_INDEX, okxFetch } from "./okx-client.js";

export const okxWsStart = tool({
  description:
    "Fetch real-time price or signal data for a token on X Layer. Replaces WebSocket stream — returns latest snapshot directly. Channels: 'price-info', 'dex-market-new-signal-openapi', 'kol_smartmoney-tracker-activity'.",
  parameters: z.object({
    channel: z
      .string()
      .describe(
        "Channel: 'price-info' | 'dex-market-new-signal-openapi' | 'kol_smartmoney-tracker-activity'",
      ),
    tokenPair: z.string().optional().describe("For price-info: token address on X Layer"),
  }),
  execute: async ({ channel, tokenPair }) => {
    if (channel === "price-info" && tokenPair) {
      const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/market/price-info", {
        params: { chainIndex: CHAIN_INDEX, tokenContractAddress: tokenPair },
      });
      return { channel, data: allItems(json) };
    }

    if (channel === "dex-market-new-signal-openapi") {
      const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/market/signal/list", {
        params: { chainIndex: CHAIN_INDEX, signalType: "1" },
      });
      return { channel, data: allItems(json) };
    }

    if (channel === "kol_smartmoney-tracker-activity") {
      const json = await okxFetch<{ data?: unknown[] }>(
        "/api/v6/dex/market/address-tracker/trades",
        {
          params: { chainIndex: CHAIN_INDEX, trackerType: "smart_money", tradeType: "1" },
        },
      );
      return { channel, data: allItems(json) };
    }

    return { channel, data: [], note: "Unknown channel" };
  },
});

export const okxWsPoll = tool({
  description:
    "Fetch latest smart money signal activity (polling equivalent of WebSocket poll). Returns recent smart money buys on X Layer.",
  parameters: z.object({
    streamId: z.string().describe("Ignored — fetches latest snapshot directly"),
  }),
  execute: async () => {
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/market/address-tracker/trades", {
      params: { chainIndex: CHAIN_INDEX, trackerType: "smart_money", tradeType: "1" },
    });
    return { data: allItems(json) };
  },
});

import { z } from "zod";
import { tool } from "../ai/tool.js";
import { allItems, CHAIN_INDEX, okxFetch } from "./okx-client.js";

export const okxDexSignal = tool({
  description:
    "Get smart money / whale / KOL aggregated buy signals on X Layer (chainId 196). Returns tokens being collectively bought by tracked wallets.",
  parameters: z.object({
    walletType: z
      .string()
      .optional()
      .describe("1=Smart Money, 2=KOL, 3=Whales. Comma-separated for multiple."),
    minAmountUsd: z.string().optional().describe("Minimum transaction amount USD"),
    minAddressCount: z.string().optional().describe("Minimum triggering wallet count"),
  }),
  execute: async ({ walletType, minAmountUsd, minAddressCount }) => {
    const body: Record<string, string> = { chainIndex: CHAIN_INDEX };
    if (walletType) body.walletType = walletType;
    if (minAmountUsd) body.minAmountUsd = minAmountUsd;
    if (minAddressCount) body.minAddressCount = minAddressCount;

    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/market/signal/list", {
      method: "POST",
      body,
    });
    const signals = allItems(json);
    return { signals, chain: "xlayer", chainIndex: CHAIN_INDEX };
  },
});

export const okxSmartMoneyTracker = tool({
  description:
    "Get latest DEX transactions by smart money or KOL wallets on X Layer. Raw transaction feed showing what they are actually buying/selling.",
  parameters: z.object({
    trackerType: z
      .enum(["smart_money", "kol"])
      .default("smart_money")
      .describe("smart_money or kol"),
    tradeType: z.string().optional().describe("0=all, 1=buy only, 2=sell only. Default 0"),
  }),
  execute: async ({ trackerType, tradeType }) => {
    const params: Record<string, string | undefined> = {
      chainIndex: CHAIN_INDEX,
      trackerType,
      tradeType,
    };

    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/market/address-tracker/trades", {
      params,
    });
    const trades = allItems(json);
    return { trades, trackerType, chain: "xlayer" };
  },
});

import { tool } from "ai";
import { z } from "zod";
import { cliData } from "./_cli.js";

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
    const args = ["signal", "list", "--chain", "xlayer"];
    if (walletType) args.push("--wallet-type", walletType);
    if (minAmountUsd) args.push("--min-amount-usd", minAmountUsd);
    if (minAddressCount) args.push("--min-address-count", minAddressCount);

    const signals = cliData<unknown[]>(args);
    return { signals, chain: "xlayer", chainIndex: "196" };
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
    const args = ["tracker", "activities", "--tracker-type", trackerType, "--chain", "xlayer"];
    if (tradeType) args.push("--trade-type", tradeType);

    const trades = cliData<unknown[]>(args);
    return { trades, trackerType, chain: "xlayer" };
  },
});

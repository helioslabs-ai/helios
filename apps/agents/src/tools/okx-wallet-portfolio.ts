import { z } from "zod";
import { tool } from "../ai/tool.js";
import { CHAIN_INDEX, okxFetch } from "./okx-client.js";

export const okxWalletBalances = tool({
  description:
    "Get token balances for a wallet address on X Layer. Returns USDC, OKB, and all held tokens with USD values.",
  parameters: z.object({
    address: z.string().describe("Wallet address"),
    chains: z.string().default("xlayer").describe("Comma-separated chain names"),
  }),
  execute: async ({ address }) => {
    const params: Record<string, string | undefined> = {
      address,
      chains: CHAIN_INDEX,
    };
    const json = await okxFetch<{ data?: unknown[] }>(
      "/api/v6/dex/balance/all-token-balances-by-address",
      { params },
    );
    return json;
  },
});

export const okxWalletTotalValue = tool({
  description: "Get total USD value of all assets in a wallet on X Layer.",
  parameters: z.object({
    address: z.string().describe("Wallet address"),
    chains: z.string().default("xlayer"),
  }),
  execute: async ({ address }) => {
    const params: Record<string, string | undefined> = {
      address,
      chains: CHAIN_INDEX,
    };
    const json = await okxFetch<{ data?: unknown[] }>(
      "/api/v6/dex/balance/total-value-by-address",
      { params },
    );
    return json;
  },
});

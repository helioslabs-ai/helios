import { tool } from "../ai/tool.js";
import { z } from "zod";
import { cliData } from "./_cli.js";

export const okxWalletBalances = tool({
  description:
    "Get token balances for a wallet address on X Layer. Returns USDC, OKB, and all held tokens with USD values.",
  parameters: z.object({
    address: z.string().describe("Wallet address"),
    chains: z.string().default("xlayer").describe("Comma-separated chain names"),
  }),
  execute: async ({ address, chains }) => {
    return cliData(["portfolio", "all-balances", "--address", address, "--chains", chains]);
  },
});

export const okxWalletTotalValue = tool({
  description: "Get total USD value of all assets in a wallet on X Layer.",
  parameters: z.object({
    address: z.string().describe("Wallet address"),
    chains: z.string().default("xlayer"),
  }),
  execute: async ({ address, chains }) => {
    return cliData(["portfolio", "total-value", "--address", address, "--chains", chains]);
  },
});

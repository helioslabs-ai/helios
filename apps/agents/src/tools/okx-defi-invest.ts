import { tool } from "ai";
import { z } from "zod";
import { cliData } from "./_cli.js";

export const okxDefiSearch = tool({
  description:
    "Search for DeFi yield opportunities on a chain. Returns investment products with APY, platform, token, and investment ID. Use to find Aave V3 USDC positions on X Layer.",
  parameters: z.object({
    chain: z.string().default("xlayer"),
    platform: z.string().optional().describe("Filter by platform, e.g. 'Aave'"),
    token: z.string().optional().describe("Filter by token, e.g. 'USDC'"),
  }),
  execute: async ({ chain, platform, token }) => {
    const args = ["defi", "search"];
    if (chain) args.push("--chain", chain);
    if (platform) args.push("--platform", platform);
    if (token) args.push("--token", token);
    const products = cliData<unknown[]>(args);
    return { products, chain };
  },
});

export const okxDefiInvest = tool({
  description:
    "Deposit funds into a DeFi yield product (e.g. Aave V3 USDC on X Layer). Returns calldata for signing. Requires investmentId from okxDefiSearch.",
  parameters: z.object({
    investmentId: z.string().describe("Investment product ID from okxDefiSearch"),
    address: z.string().describe("Depositor wallet address"),
    token: z.string().default("USDC").describe("Token symbol or address to deposit"),
    amount: z.string().describe("Amount in minimal units (e.g. '1000000' = 1 USDC)"),
    chain: z.string().default("xlayer"),
    slippage: z.string().default("0.01"),
  }),
  execute: async ({ investmentId, address, token, amount, chain, slippage }) => {
    return cliData([
      "defi",
      "invest",
      "--investment-id",
      investmentId,
      "--address",
      address,
      "--token",
      token,
      "--amount",
      amount,
      "--chain",
      chain,
      "--slippage",
      slippage,
    ]);
  },
});

export const okxDefiCollect = tool({
  description: "Harvest / collect accrued yield from an active DeFi position.",
  parameters: z.object({
    investmentId: z.string().describe("Investment product ID"),
    address: z.string().describe("Wallet address that holds the position"),
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ investmentId, address, chain }) => {
    return cliData([
      "defi",
      "collect",
      "--investment-id",
      investmentId,
      "--address",
      address,
      "--chain",
      chain,
    ]);
  },
});

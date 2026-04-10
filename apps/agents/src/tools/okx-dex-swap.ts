import { z } from "zod";
import { tool } from "../ai/tool.js";
import { CHAIN_INDEX, firstItem, okxFetch } from "./okx-client.js";

const EVM_NATIVE = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

function resolveToken(t: string): string {
  return t === "native" ? EVM_NATIVE : t.toLowerCase();
}

export const okxSwapQuote = tool({
  description:
    "Get a DEX swap quote on X Layer (no execution). Returns expected output amount, price impact, gas estimate, and routing path. Call before executing a swap.",
  parameters: z.object({
    fromToken: z.string().describe("Source token address (lowercase) or 'native'"),
    toToken: z.string().describe("Destination token address (lowercase) or 'native'"),
    readableAmount: z.string().describe("Human-readable sell amount, e.g. '1.5' for 1.5 USDC"),
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ fromToken, toToken, readableAmount }) => {
    const params: Record<string, string | undefined> = {
      chainIndex: CHAIN_INDEX,
      fromTokenAddress: resolveToken(fromToken),
      toTokenAddress: resolveToken(toToken),
      amount: readableAmount,
    };
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/aggregator/quote", { params });
    return firstItem(json);
  },
});

export const okxSwapExecute = tool({
  description:
    "Execute a DEX swap on X Layer: get swap calldata → returns unsigned tx for broadcasting. Only call after Sentinel returns CLEAR verdict.",
  parameters: z.object({
    fromToken: z.string().describe("Source token address (lowercase) or 'native'"),
    toToken: z.string().describe("Destination token address (lowercase) or 'native'"),
    readableAmount: z.string().describe("Human-readable sell amount, e.g. '1' for 1 USDC"),
    walletAddress: z.string().describe("Executor wallet address"),
    chain: z.string().default("xlayer"),
    gasLevel: z.string().default("average").describe("slow | average | fast"),
    slippage: z.string().default("0.5").describe("Slippage tolerance percentage"),
  }),
  execute: async ({ fromToken, toToken, readableAmount, walletAddress, slippage }) => {
    const params: Record<string, string | undefined> = {
      chainIndex: CHAIN_INDEX,
      fromTokenAddress: resolveToken(fromToken),
      toTokenAddress: resolveToken(toToken),
      amount: readableAmount,
      userWalletAddress: walletAddress,
      slippagePercent: slippage,
    };
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/aggregator/swap", { params });
    return firstItem(json);
  },
});

import { tool } from "ai";
import { z } from "zod";
import { cliData } from "./_cli.js";

// Native token address for EVM chains
const EVM_NATIVE = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export const okxSwapQuote = tool({
  description:
    "Get a DEX swap quote on X Layer (no execution). Returns expected output amount, price impact, gas estimate, and routing path. Call before executing a swap.",
  parameters: z.object({
    fromToken: z.string().describe("Source token address (lowercase) or 'native'"),
    toToken: z.string().describe("Destination token address (lowercase) or 'native'"),
    readableAmount: z.string().describe("Human-readable sell amount, e.g. '1.5' for 1.5 USDC"),
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ fromToken, toToken, readableAmount, chain }) => {
    const from = fromToken === "native" ? EVM_NATIVE : fromToken.toLowerCase();
    const to = toToken === "native" ? EVM_NATIVE : toToken.toLowerCase();
    return cliData([
      "swap",
      "quote",
      "--from",
      from,
      "--to",
      to,
      "--readable-amount",
      readableAmount,
      "--chain",
      chain,
    ]);
  },
});

export const okxSwapExecute = tool({
  description:
    "Execute a DEX swap on X Layer: quote → approve (if needed) → sign → broadcast. Returns swapTxHash. Only call after Sentinel returns CLEAR verdict.",
  parameters: z.object({
    fromToken: z.string().describe("Source token address (lowercase) or 'native'"),
    toToken: z.string().describe("Destination token address (lowercase) or 'native'"),
    readableAmount: z.string().describe("Human-readable sell amount, e.g. '1' for 1 USDC"),
    walletAddress: z.string().describe("Executor wallet address"),
    chain: z.string().default("xlayer"),
    gasLevel: z.string().default("average").describe("slow | average | fast"),
  }),
  execute: async ({ fromToken, toToken, readableAmount, walletAddress, chain, gasLevel }) => {
    const from = fromToken === "native" ? EVM_NATIVE : fromToken.toLowerCase();
    const to = toToken === "native" ? EVM_NATIVE : toToken.toLowerCase();
    return cliData([
      "swap",
      "execute",
      "--from",
      from,
      "--to",
      to,
      "--readable-amount",
      readableAmount,
      "--chain",
      chain,
      "--wallet",
      walletAddress,
      "--gas-level",
      gasLevel,
    ]);
  },
});

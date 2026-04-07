import { tool } from "ai";
import { z } from "zod";

export const okxDexSwapQuote = tool({
  description: "Get a swap quote on X Layer DEX via okx-dex-swap",
  parameters: z.object({
    fromToken: z.string(),
    toToken: z.string(),
    amount: z.string(),
    chainIndex: z.string().default("196"),
    slippageBps: z.number().default(50),
  }),
  execute: async ({ fromToken, toToken, amount, chainIndex, slippageBps }) => {
    // TODO: call onchainos swap_quote
    return { quote: null, fromToken, toToken, amount, chainIndex, slippageBps };
  },
});

export const okxDexSwapExecute = tool({
  description: "Execute a swap on X Layer DEX",
  parameters: z.object({
    fromToken: z.string(),
    toToken: z.string(),
    amount: z.string(),
    chainIndex: z.string().default("196"),
    slippageBps: z.number().default(50),
  }),
  execute: async ({ fromToken, toToken, amount, chainIndex, slippageBps }) => {
    // TODO: call onchainos swap_swap
    return { txHash: null, fromToken, toToken, amount, chainIndex, slippageBps };
  },
});

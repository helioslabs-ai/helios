import { tool } from "ai";
import { z } from "zod";

const _UNISWAP_API_BASE = "https://trade-api.gateway.uniswap.org/v1";

export const uniswapQuote = tool({
  description: "Get a swap quote from Uniswap Trading API for comparison with OKX DEX",
  parameters: z.object({
    tokenIn: z.string(),
    tokenOut: z.string(),
    amount: z.string(),
    chainId: z.number().default(196),
  }),
  execute: async ({ tokenIn, tokenOut, amount, chainId }) => {
    const apiKey = process.env.UNISWAP_API_KEY;
    if (!apiKey) return { error: "UNISWAP_API_KEY not set", quote: null };

    // TODO: call UNISWAP_API_BASE/quote
    return { quote: null, tokenIn, tokenOut, amount, chainId };
  },
});

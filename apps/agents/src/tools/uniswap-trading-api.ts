import { z } from "zod";
import { tool } from "../ai/tool.js";

const UNISWAP_API_BASE = "https://trade-api.gateway.uniswap.org/v1";

export const uniswapQuote = tool({
  description:
    "Get a swap quote from Uniswap Trading API for comparison with OKX DEX. Strategist calls both and picks the best route.",
  parameters: z.object({
    tokenIn: z.string().describe("Input token contract address (checksummed)"),
    tokenOut: z.string().describe("Output token contract address (checksummed)"),
    amount: z.string().describe("Input amount in minimal units (wei)"),
    chainId: z.number().default(196).describe("Chain ID, default 196 (X Layer)"),
    type: z.enum(["EXACT_INPUT", "EXACT_OUTPUT"]).default("EXACT_INPUT"),
  }),
  execute: async ({ tokenIn, tokenOut, amount, chainId, type }) => {
    const apiKey = process.env.UNISWAP_API_KEY;
    if (!apiKey) return { error: "UNISWAP_API_KEY not set", quote: null };

    const res = await fetch(`${UNISWAP_API_BASE}/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        tokenInChainId: chainId,
        tokenOutChainId: chainId,
        tokenIn,
        tokenOut,
        amount,
        type,
      }),
    });

    if (!res.ok) {
      return { error: `Uniswap quote failed: ${res.status}`, quote: null };
    }

    const quote = await res.json();
    return { quote, tokenIn, tokenOut, amount, chainId };
  },
});

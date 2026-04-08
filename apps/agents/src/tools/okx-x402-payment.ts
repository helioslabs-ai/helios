import { tool } from "../ai/tool.js";
import { z } from "zod";
import { cliData } from "./_cli.js";

// USDG on X Layer (chainId 196)
const XLAYER_USDG = "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8";

export const okxX402Pay = tool({
  description:
    "Sign an x402 payment authorization for a payment-gated resource on X Layer. Returns payment proof (signature) to attach as X-Payment header. Used by Curator to pay Strategist, Sentinel, and Executor.",
  parameters: z.object({
    payTo: z.string().describe("Recipient wallet address (agent being paid)"),
    amount: z.string().describe("Amount in USDG minimal units (e.g. '1000' = 0.001 USDG)"),
    resource: z.string().describe("URL of the x402-gated resource"),
    maxTimeoutSeconds: z.number().default(300),
  }),
  execute: async ({ payTo, amount, resource, maxTimeoutSeconds }) => {
    const result = cliData<{ signature?: string; authorization?: string }>([
      "payment",
      "x402-pay",
      "--network",
      "eip155:196",
      "--amount",
      amount,
      "--pay-to",
      payTo,
      "--asset",
      XLAYER_USDG,
      "--max-timeout-seconds",
      String(maxTimeoutSeconds),
    ]);
    return { ...result, resource, payTo, amount };
  },
});

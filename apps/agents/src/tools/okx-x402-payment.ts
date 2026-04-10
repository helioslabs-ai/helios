import { z } from "zod";
import { tool } from "../ai/tool.js";

const XLAYER_USDG = "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8";

export const okxX402Pay = tool({
  description:
    "Returns x402 payment info for a payment-gated resource. Used by Curator — actual payment signing is handled automatically by the cycle loop via TEE wallet.",
  parameters: z.object({
    payTo: z.string().describe("Recipient wallet address (agent being paid)"),
    amount: z.string().describe("Amount in USDG minimal units (e.g. '1000' = 0.001 USDG)"),
    resource: z.string().describe("URL of the x402-gated resource"),
    maxTimeoutSeconds: z.number().default(300),
  }),
  execute: async ({ payTo, amount, resource, maxTimeoutSeconds }) => {
    return {
      payTo,
      amount,
      resource,
      maxTimeoutSeconds,
      asset: XLAYER_USDG,
      network: "eip155:196",
      note: "Payment is settled automatically by the curator cycle loop via TEE wallet signing.",
    };
  },
});

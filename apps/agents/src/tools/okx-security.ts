import { tool } from "ai";
import { z } from "zod";

export const okxSecurity = tool({
  description: "Run pre-execution security scan on a token via okx-security",
  parameters: z.object({
    tokenAddress: z.string(),
    chainIndex: z.string().default("196"),
  }),
  execute: async ({ tokenAddress, chainIndex }) => {
    // TODO: call onchainos security scan tools
    return { safe: false, flags: [], tokenAddress, chainIndex };
  },
});

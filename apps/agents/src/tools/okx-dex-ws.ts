import { tool } from "ai";
import { z } from "zod";

export const okxDexWs = tool({
  description: "Subscribe to real-time price data on X Layer via okx-dex-ws",
  parameters: z.object({
    tokenAddress: z.string(),
    chainIndex: z.string().default("196"),
  }),
  execute: async ({ tokenAddress, chainIndex }) => {
    // TODO: call onchainos ws_start / ws_poll
    return { status: "not_implemented", tokenAddress, chainIndex };
  },
});

import { tool } from "ai";
import { z } from "zod";

export const okxDexTrenches = tool({
  description: "Discover new token launches on X Layer via okx-dex-trenches (memepump)",
  parameters: z.object({
    chainIndex: z.string().default("196"),
  }),
  execute: async ({ chainIndex }) => {
    // TODO: call onchainos memepump_tokens
    return { tokens: [], chainIndex };
  },
});

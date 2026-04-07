import { tool } from "ai";
import { z } from "zod";

export const okxDexSignal = tool({
  description: "Get smart money / whale trading signals on X Layer via okx-dex-signal",
  parameters: z.object({
    chainIndex: z.string().default("196"),
  }),
  execute: async ({ chainIndex }) => {
    // TODO: call onchainos signal_list with chainIndex
    return { signals: [], chainIndex };
  },
});

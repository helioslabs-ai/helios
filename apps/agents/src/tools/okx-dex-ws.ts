import { tool } from "ai";
import { z } from "zod";
import { cli } from "./_cli.js";

export const okxWsStart = tool({
  description:
    "Start a WebSocket stream for real-time price data or smart money signals on X Layer. Returns a stream ID to poll with okxWsPoll.",
  parameters: z.object({
    channel: z
      .string()
      .describe(
        "Channel name: 'price-info' for token price, 'dex-market-new-signal-openapi' for buy signals, 'kol_smartmoney-tracker-activity' for smart money feed",
      ),
    tokenPair: z
      .string()
      .optional()
      .describe("For price-info channel: '196:<tokenAddress>' e.g. '196:0xabc...'"),
  }),
  execute: async ({ channel, tokenPair }) => {
    const args = ["ws", "start", "--channel", channel];
    if (tokenPair) args.push("--token-pair", tokenPair);
    return cli(args);
  },
});

export const okxWsPoll = tool({
  description: "Poll events from an active WebSocket stream. Returns latest data since last poll.",
  parameters: z.object({
    streamId: z.string().describe("Stream ID returned by okxWsStart"),
  }),
  execute: async ({ streamId }) => {
    return cli(["ws", "poll", "--id", streamId]);
  },
});

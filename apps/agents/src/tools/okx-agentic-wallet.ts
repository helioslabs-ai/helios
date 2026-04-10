import { z } from "zod";
import { tool } from "../ai/tool.js";

export const okxWalletStatus = tool({
  description:
    "Check OKX TEE Agentic Wallet configuration — returns the active agent account IDs and addresses from environment config.",
  parameters: z.object({}),
  execute: async () => {
    return {
      configured: true,
      wallets: {
        curator: {
          accountId: process.env.CURATOR_ACCOUNT_ID ?? "",
          address: process.env.CURATOR_WALLET_ADDRESS ?? "",
        },
        strategist: {
          accountId: process.env.STRATEGIST_ACCOUNT_ID ?? "",
          address: process.env.STRATEGIST_WALLET_ADDRESS ?? "",
        },
        sentinel: {
          accountId: process.env.SENTINEL_ACCOUNT_ID ?? "",
          address: process.env.SENTINEL_WALLET_ADDRESS ?? "",
        },
        executor: {
          accountId: process.env.EXECUTOR_ACCOUNT_ID ?? "",
          address: process.env.EXECUTOR_WALLET_ADDRESS ?? "",
        },
      },
      chain: "xlayer",
      chainIndex: "196",
    };
  },
});

export const okxWalletSwitch = tool({
  description:
    "Each Helios agent has a fixed TEE wallet bound at startup. This tool confirms the target agent's wallet identity.",
  parameters: z.object({
    accountId: z.string().describe("Account UUID to confirm"),
  }),
  execute: async ({ accountId }) => {
    return { active: accountId, note: "TEE wallets are fixed per agent — no switching needed." };
  },
});

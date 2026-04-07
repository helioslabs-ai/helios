import { tool } from "ai";
import { z } from "zod";
import { cli } from "./_cli.js";

export const okxWalletStatus = tool({
  description:
    "Check OKX TEE Agentic Wallet login status and get the active account ID and address. Call before any wallet operation.",
  parameters: z.object({}),
  execute: async () => {
    return cli(["wallet", "status"]);
  },
});

export const okxWalletSwitch = tool({
  description: "Switch the active wallet to a specific agent account.",
  parameters: z.object({
    accountId: z.string().describe("Account UUID to switch to"),
  }),
  execute: async ({ accountId }) => {
    return cli(["wallet", "switch", accountId]);
  },
});

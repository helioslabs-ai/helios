import { tool } from "../ai/tool.js";
import { z } from "zod";
import { cliData } from "./_cli.js";

export const okxSecurityTokenScan = tool({
  description:
    "Run a pre-execution security scan on a token. Returns risk action (block/warn/safe), honeypot status, tax rate, and risk item details. BLOCK = do not trade. Always call before Executor deploys.",
  parameters: z.object({
    address: z.string().describe("Token contract address (lowercase)"),
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ address, chain }) => {
    const result = cliData<{
      action?: string;
      isHoneyPot?: boolean;
      riskItemDetail?: unknown[];
    }>(["security", "token-scan", "--address", address.toLowerCase(), "--chain", chain]);

    return {
      ...result,
      verdict: (result as { action?: string }).action === "block" ? "BLOCK" : "CLEAR",
    };
  },
});

import { z } from "zod";
import { tool } from "../ai/tool.js";
import { CHAIN_INDEX, okxFetch } from "./okx-client.js";

export const okxSecurityTokenScan = tool({
  description:
    "Run a pre-execution security scan on a token. Returns risk action (block/warn/safe), honeypot status, tax rate, and risk item details. BLOCK = do not trade. Always call before Executor deploys.",
  parameters: z.object({
    address: z.string().describe("Token contract address (lowercase)"),
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ address }) => {
    const body = {
      source: "1",
      tokenList: [{ chainId: CHAIN_INDEX, contractAddress: address.toLowerCase() }],
    };

    const json = await okxFetch<{
      data?: Array<{ riskLevel?: string; isHoneypot?: unknown; riskItems?: unknown[] }>;
    }>("/api/v6/security/token-scan", { method: "POST", body });

    const raw = json.data?.[0] ?? {};
    const riskLevel = (raw.riskLevel ?? "high").toString().toLowerCase();
    const isHoneypot =
      raw.isHoneypot === true || raw.isHoneypot === "true" || raw.isHoneypot === "1";
    const verdict = riskLevel === "high" || isHoneypot ? "BLOCK" : "CLEAR";

    return { ...raw, verdict, riskLevel, isHoneypot };
  },
});

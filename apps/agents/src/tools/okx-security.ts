import { isXLayerSafeTradeContract } from "@helios/shared/chains";
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
    const normalized = address.trim().toLowerCase();
    if (isXLayerSafeTradeContract(normalized)) {
      return {
        verdict: "CLEAR",
        riskLevel: "low",
        isHoneypot: false,
        allowlisted: true,
        note: "X Layer major/stable allowlist — USDC, USDG, WOKB, WETH, WBTC, or native OKB routing",
      };
    }

    const body = {
      source: "1",
      tokenList: [{ chainId: CHAIN_INDEX, contractAddress: normalized }],
    };

    const json = await okxFetch<{
      data?: Array<{ riskLevel?: string; isHoneypot?: unknown; riskItems?: unknown[] }>;
    }>("/api/v6/security/token-scan", { method: "POST", body });

    const raw = json.data?.[0] ?? {};
    // Never default missing riskLevel to "high" — that falsely BLOCKs every token when the API omits the field.
    const riskLevel = (raw.riskLevel ?? "low").toString().toLowerCase();
    const isHoneypot =
      raw.isHoneypot === true || raw.isHoneypot === "true" || raw.isHoneypot === "1";
    const verdict = riskLevel === "high" || isHoneypot ? "BLOCK" : "CLEAR";

    return { ...raw, verdict, riskLevel, isHoneypot };
  },
});

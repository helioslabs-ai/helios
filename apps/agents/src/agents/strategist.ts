import { isXLayerSafeTradeContract, TOKEN_ADDRESSES } from "@helios/shared/chains";
import { generateText } from "../ai/index.js";
import { buildStrategistBudget } from "../prompts/strategist.js";
import type { AgentConfig, CycleContext } from "../types.js";

export type ScanResult = {
  topToken: string | null;
  topContract: string | null;
  compositeScore: number;
  signalCount: number;
  recommendation: "trade" | "yield" | "no_alpha";
  reasoning: string;
};

const DECISION_PROMPT = `
After running all tools, output your final decision as a JSON block inside <DECISION> tags:

<DECISION>
{
  "recommendation": "trade" | "yield" | "no_alpha",
  "topToken": "TOKEN_SYMBOL or null",
  "topContract": "0x... or null",
  "compositeScore": 0.0,
  "signalCount": 0,
  "reasoning": "One sentence summary of why"
}
</DECISION>

Rules:
- For "trade", the buy target must be a major or stable on X Layer only: WOKB, USDC, USDG, WETH, WBTC, or native OKB — use the canonical 0x contract from tool metadata
- Do NOT pick meme / trench / signal-only tokens (e.g. low-liquidity alts) as topContract — they fail Sentinel security scans
- If unsure, still return "trade" with WOKB or USDC-tier liquidity and a compositeScore between 0.3 and 0.55
- Use "yield" only when the best action is explicitly Aave / earn-only (no swap target)
- Avoid "no_alpha" — the pipeline will normalize weak scans to a default candidate
`;

function isValidContract(addr: string | null | undefined): addr is string {
  return typeof addr === "string" && addr.startsWith("0x") && addr.length >= 42;
}

/** Ensures every cycle produces a trade target so Sentinel + Executor can run when appropriate. */
export function normalizeScanResult(r: ScanResult): ScanResult {
  const fallbackContract = TOKEN_ADDRESSES.WOKB;
  const fallbackToken = "WOKB";

  if (r.recommendation === "trade" && isValidContract(r.topContract)) {
    if (!isXLayerSafeTradeContract(r.topContract)) {
      return {
        recommendation: "trade",
        topToken: fallbackToken,
        topContract: fallbackContract,
        compositeScore: Math.max(r.compositeScore > 0 ? r.compositeScore : 0.4, 0.35),
        signalCount: r.signalCount > 0 ? r.signalCount : 1,
        reasoning: `Sanitized: ${r.topToken ?? "?"} (${r.topContract}) is not a major/stable allowlist target; using WOKB for Sentinel + Executor.`,
      };
    }
    return {
      ...r,
      compositeScore: r.compositeScore > 0 ? r.compositeScore : 0.4,
    };
  }

  // Promote yield → trade so Curator runs Sentinel + optional Executor deploy
  if (r.recommendation === "yield") {
    let topContract = isValidContract(r.topContract) ? r.topContract : fallbackContract;
    let topToken = r.topToken ?? fallbackToken;
    if (!isXLayerSafeTradeContract(topContract)) {
      topContract = fallbackContract;
      topToken = fallbackToken;
    }
    return {
      recommendation: "trade",
      topToken,
      topContract,
      compositeScore: Math.max(r.compositeScore, 0.35),
      signalCount: r.signalCount > 0 ? r.signalCount : 1,
      reasoning: r.reasoning || "Promoted yield scan to trade path for risk check.",
    };
  }

  let topContract = isValidContract(r.topContract) ? r.topContract : fallbackContract;
  let topToken = r.topToken ?? fallbackToken;
  if (!isXLayerSafeTradeContract(topContract)) {
    topContract = fallbackContract;
    topToken = fallbackToken;
  }
  return {
    recommendation: "trade",
    topToken,
    topContract,
    compositeScore: Math.max(r.compositeScore, 0.35),
    signalCount: r.signalCount > 0 ? r.signalCount : 1,
    reasoning:
      r.reasoning ||
      "Normalized: best-effort X Layer candidate (WOKB) when scan omitted a valid contract.",
  };
}

export function parseDecision(text: string): ScanResult {
  const match = text.match(/<DECISION>\s*([\s\S]*?)\s*<\/DECISION>/);
  if (!match) {
    return normalizeScanResult({
      topToken: null,
      topContract: null,
      compositeScore: 0,
      signalCount: 0,
      recommendation: "no_alpha",
      reasoning: text.slice(-500),
    });
  }

  try {
    const parsed = JSON.parse(match[1]) as Partial<ScanResult>;
    const raw: ScanResult = {
      topToken: parsed.topToken ?? null,
      topContract: parsed.topContract ?? null,
      compositeScore: parsed.compositeScore ?? 0,
      signalCount: parsed.signalCount ?? 0,
      recommendation: parsed.recommendation ?? "no_alpha",
      reasoning: parsed.reasoning ?? "",
    };
    return normalizeScanResult(raw);
  } catch {
    return normalizeScanResult({
      topToken: null,
      topContract: null,
      compositeScore: 0,
      signalCount: 0,
      recommendation: "no_alpha",
      reasoning: "Failed to parse decision block",
    });
  }
}

export async function runStrategistScan(
  config: AgentConfig,
  cycleContext: CycleContext,
): Promise<ScanResult> {
  const budget = buildStrategistBudget({
    openPositions: JSON.stringify(cycleContext.openPositions),
    yieldPosition: "check via okxDefiPositions",
    consecutiveNoAlpha: cycleContext.consecutiveNoAlpha,
  });

  const result = await generateText({
    apiKey: config.llm.apiKey,
    system: config.prompts.strategy,
    prompt: `${budget}\n\nRun a full alpha scan. Use all available tools. ${DECISION_PROMPT}`,
    tools: config.tools,
    maxSteps: 15,
  });

  return parseDecision(result.text);
}

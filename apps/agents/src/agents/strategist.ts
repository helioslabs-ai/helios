import { generateText } from "../ai/index.js";
import { buildStrategistBudget, STRATEGIST_SYSTEM_PROMPT } from "../prompts/strategist.js";
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
- "trade" only if compositeScore >= 0.6 AND topContract is a real address
- "yield" if best opportunity is Aave V3 deposit (no strong trade signal)
- "no_alpha" if nothing scores above 0.4
`;

function parseDecision(text: string): ScanResult {
  const match = text.match(/<DECISION>\s*([\s\S]*?)\s*<\/DECISION>/);
  if (!match) {
    return {
      topToken: null,
      topContract: null,
      compositeScore: 0,
      signalCount: 0,
      recommendation: "no_alpha",
      reasoning: text.slice(-500),
    };
  }

  try {
    const parsed = JSON.parse(match[1]) as Partial<ScanResult>;
    return {
      topToken: parsed.topToken ?? null,
      topContract: parsed.topContract ?? null,
      compositeScore: parsed.compositeScore ?? 0,
      signalCount: parsed.signalCount ?? 0,
      recommendation: parsed.recommendation ?? "no_alpha",
      reasoning: parsed.reasoning ?? "",
    };
  } catch {
    return {
      topToken: null,
      topContract: null,
      compositeScore: 0,
      signalCount: 0,
      recommendation: "no_alpha",
      reasoning: "Failed to parse decision block",
    };
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
    system: STRATEGIST_SYSTEM_PROMPT,
    prompt: `${budget}\n\nRun a full alpha scan. Use all available tools. ${DECISION_PROMPT}`,
    tools: config.tools,
    maxSteps: 15,
  });

  return parseDecision(result.text);
}

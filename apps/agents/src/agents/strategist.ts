import { generateText } from "../ai/index.js";
import { buildStrategistBudget, STRATEGIST_SYSTEM_PROMPT } from "../prompts/strategist.js";
import type { AgentConfig, CycleContext } from "../types.js";

export type ScanResult = {
  topToken: string | null;
  compositeScore: number;
  signalCount: number;
  recommendation: "trade" | "yield" | "no_alpha";
  reasoning: string;
};

export async function runStrategistScan(
  config: AgentConfig,
  cycleContext: CycleContext,
): Promise<ScanResult> {
  const budget = buildStrategistBudget({
    openPositions: JSON.stringify(cycleContext.openPositions),
    yieldPosition: "TODO", // populated from defi-portfolio
    consecutiveNoAlpha: cycleContext.consecutiveNoAlpha,
  });

  const result = await generateText({
    apiKey: config.llm.apiKey,
    system: STRATEGIST_SYSTEM_PROMPT,
    prompt: `${budget}\n\nRun a full alpha scan. Use all available tools to find the best opportunity. Return your recommendation.`,
    tools: config.tools,
    maxSteps: 15,
  });

  // TODO: parse structured output from result.text
  return {
    topToken: null,
    compositeScore: 0,
    signalCount: 0,
    recommendation: "no_alpha",
    reasoning: result.text,
  };
}

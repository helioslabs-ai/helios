import { generateText } from "../ai/index.js";
import { buildSentinelBudget, SENTINEL_SYSTEM_PROMPT } from "../prompts/sentinel.js";
import type { AgentConfig, CycleContext, SentinelVerdict } from "../types.js";

export type AssessmentResult = {
  verdict: SentinelVerdict;
  riskScore: number;
  flags: string[];
  reasoning: string;
};

export async function runSentinelAssessment(
  config: AgentConfig,
  token: string,
  contractAddress: string,
  cycleContext: CycleContext,
): Promise<AssessmentResult> {
  const budget = buildSentinelBudget({
    openPositions: JSON.stringify(cycleContext.openPositions),
    riskThreshold: 70,
  });

  const result = await generateText({
    apiKey: config.llm.apiKey,
    system: SENTINEL_SYSTEM_PROMPT,
    prompt: `${budget}\n\nAssess this trade opportunity:\n- Token: ${token}\n- Contract: ${contractAddress}\n\nRun security scan and holder analysis. Return CLEAR or BLOCK with reasoning.`,
    tools: config.tools,
    maxSteps: 10,
  });

  // TODO: parse structured output from result.text
  return {
    verdict: "BLOCK",
    riskScore: 0,
    flags: [],
    reasoning: result.text,
  };
}

export async function reScorePositions(
  config: AgentConfig,
  cycleContext: CycleContext,
): Promise<Array<{ token: string; verdict: SentinelVerdict; reasoning: string }>> {
  const results = [];
  for (const position of cycleContext.openPositions) {
    const assessment = await runSentinelAssessment(
      config,
      position.token,
      position.contractAddress,
      cycleContext,
    );
    results.push({
      token: position.token,
      verdict: assessment.verdict,
      reasoning: assessment.reasoning,
    });
  }
  return results;
}

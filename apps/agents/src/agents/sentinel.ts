import { generateText } from "../ai/index.js";
import { buildSentinelBudget, SENTINEL_SYSTEM_PROMPT } from "../prompts/sentinel.js";
import type { AgentConfig, CycleContext, SentinelVerdict } from "../types.js";

export type AssessmentResult = {
  verdict: SentinelVerdict;
  riskScore: number;
  flags: string[];
  reasoning: string;
};

const DECISION_PROMPT = `
After running all security tools, output your final verdict as a JSON block inside <VERDICT> tags:

<VERDICT>
{
  "verdict": "CLEAR" | "BLOCK",
  "riskScore": 0,
  "flags": [],
  "reasoning": "One sentence summary"
}
</VERDICT>

Rules:
- BLOCK if: honeypot detected, riskScore < 75, holder concentration > 50%, liquidity < $5k, security scan returns "block"
- CLEAR only if all checks pass AND riskScore >= 75
- riskScore: 0-100, higher = safer
`;

function parseVerdict(text: string): AssessmentResult {
  const match = text.match(/<VERDICT>\s*([\s\S]*?)\s*<\/VERDICT>/);
  if (!match) {
    return {
      verdict: "BLOCK",
      riskScore: 0,
      flags: ["parse_error"],
      reasoning: "Could not parse verdict — defaulting to BLOCK",
    };
  }

  try {
    const parsed = JSON.parse(match[1]) as Partial<AssessmentResult>;
    return {
      verdict: parsed.verdict === "CLEAR" ? "CLEAR" : "BLOCK",
      riskScore: parsed.riskScore ?? 0,
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      reasoning: parsed.reasoning ?? "",
    };
  } catch {
    return {
      verdict: "BLOCK",
      riskScore: 0,
      flags: ["parse_error"],
      reasoning: "JSON parse failed — defaulting to BLOCK",
    };
  }
}

export async function runSentinelAssessment(
  config: AgentConfig,
  token: string,
  contractAddress: string,
  cycleContext: CycleContext,
): Promise<AssessmentResult> {
  const budget = buildSentinelBudget({
    openPositions: JSON.stringify(cycleContext.openPositions),
    riskThreshold: 75,
  });

  const result = await generateText({
    apiKey: config.llm.apiKey,
    system: SENTINEL_SYSTEM_PROMPT,
    prompt: `${budget}\n\nAssess this opportunity:\n- Token: ${token}\n- Contract: ${contractAddress}\n\nRun security scan and holder analysis. ${DECISION_PROMPT}`,
    tools: config.tools,
    maxSteps: 10,
  });

  return parseVerdict(result.text);
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

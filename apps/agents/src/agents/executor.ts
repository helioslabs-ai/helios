import { generateText } from "../ai/index.js";
import { buildExecutorBudget, EXECUTOR_SYSTEM_PROMPT } from "../prompts/executor.js";
import type { AgentConfig, CycleContext, Position } from "../types.js";

export type DeployResult = {
  action: "buy" | "yield_park" | "sell";
  txHash: string | null;
  token?: string;
  sizeUsdc?: string;
  reasoning: string;
};

export async function runExecutorDeploy(
  config: AgentConfig,
  instruction: string,
  cycleContext: CycleContext,
): Promise<DeployResult> {
  const budget = buildExecutorBudget({
    walletBalance: cycleContext.walletBalances.executor ?? "0",
    openPositionCount: cycleContext.openPositions.length,
    liquidReserve: "1.00",
  });

  const result = await generateText({
    apiKey: config.llm.apiKey,
    system: EXECUTOR_SYSTEM_PROMPT,
    prompt: `${budget}\n\nExecute this instruction:\n${instruction}\n\nUse the swap and gateway tools. Return the txHash.`,
    tools: config.tools,
    maxSteps: 10,
  });

  // TODO: parse structured output from result.text
  return {
    action: "yield_park",
    txHash: null,
    reasoning: result.text,
  };
}

export async function exitPosition(
  config: AgentConfig,
  position: Position,
  reason: string,
  cycleContext: CycleContext,
): Promise<DeployResult> {
  return runExecutorDeploy(
    config,
    `EXIT position: ${position.token} (${position.contractAddress}). Reason: ${reason}. Sell full amount back to USDC.`,
    cycleContext,
  );
}

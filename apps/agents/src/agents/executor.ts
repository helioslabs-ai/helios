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

const DECISION_PROMPT = `
After executing all required tool calls, output your result as a JSON block inside <RESULT> tags:

<RESULT>
{
  "action": "buy" | "yield_park" | "sell",
  "txHash": "0x... or null",
  "token": "TOKEN_SYMBOL or null",
  "sizeUsdc": "amount string or null",
  "reasoning": "One sentence summary of what was executed"
}
</RESULT>

Rules:
- Set txHash to the actual transaction hash returned by gateway broadcast / swap execute
- action must match what was actually executed
- If execution failed, set txHash to null and explain in reasoning
`;

export function parseResult(text: string): DeployResult {
  const match = text.match(/<RESULT>\s*([\s\S]*?)\s*<\/RESULT>/);
  if (!match) {
    return {
      action: "yield_park",
      txHash: null,
      reasoning: "Could not parse result block",
    };
  }

  try {
    const parsed = JSON.parse(match[1]) as Partial<DeployResult>;
    const action = parsed.action;
    return {
      action: action === "buy" || action === "sell" ? action : "yield_park",
      txHash: parsed.txHash ?? null,
      token: parsed.token ?? undefined,
      sizeUsdc: parsed.sizeUsdc ?? undefined,
      reasoning: parsed.reasoning ?? "",
    };
  } catch {
    return {
      action: "yield_park",
      txHash: null,
      reasoning: "JSON parse failed",
    };
  }
}

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
    prompt: `${budget}\nWallet address: ${config.wallet.address}\nAccount ID: ${config.wallet.accountId}\n\nExecute this instruction:\n${instruction}\n\nUse swap and DeFi tools. ${DECISION_PROMPT}`,
    tools: config.tools,
    maxSteps: 10,
  });

  return parseResult(result.text);
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

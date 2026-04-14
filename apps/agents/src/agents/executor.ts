import { GUARDRAILS } from "@helios/shared/guardrails";
import { generateText } from "../ai/index.js";
import { buildExecutorBudget, EXECUTOR_SYSTEM_PROMPT } from "../prompts/executor.js";
import {
  DEFAULT_AAVE_USDG_INVESTMENT_ID,
  executeDefiDepositTee,
  findAaveInvestmentIdForToken,
} from "../tools/okx-defi-invest.js";
import type { AgentConfig, CycleContext, Position } from "../types.js";
import { getWalletTokenBalances } from "../wallet/index.js";

/** Keep gas/spend headroom before parking (matches executor budget narrative). */
const YIELD_PARK_LIQUID_RESERVE_USD = 1.0;

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

function humanStableToAtomic6(human: string): string {
  const n = Math.max(0, parseFloat(human) || 0);
  return Math.floor(n * 1e6).toString();
}

/**
 * Deterministic Aave deposit on yield_park — does not rely on the LLM to call tools.
 * Deposit tokens (OKX DeFi /enter, SINGLE_EARN Aave on X Layer):
 * - USDC first (`HELIOS_AAVE_USDC_INVESTMENT_ID` or product search), then
 * - USDG (`HELIOS_AAVE_USDG_INVESTMENT_ID` or default 33906).
 * Swap "buy" path (LLM `runExecutorDeploy`): spends **USDC** from Executor wallet into Strategist's `topContract` (allowlisted majors only after normalizeScanResult).
 */
export async function runUnconditionalYieldParkDeposit(
  config: AgentConfig,
  _cycleContext: CycleContext,
): Promise<DeployResult> {
  const { accountId, address } = config.wallet;

  const balances = await getWalletTokenBalances(accountId, address).catch((err) => {
    console.error("[runUnconditionalYieldParkDeposit] getWalletTokenBalances failed:", err);
    return {
      accountId,
      address,
      balanceUsdc: "0",
      balanceUsdg: "0",
    };
  });

  const rawUsdc = parseFloat(balances.balanceUsdc) || 0;
  const rawUsdg = parseFloat(balances.balanceUsdg) || 0;
  const usableUsdc = Math.max(0, rawUsdc - YIELD_PARK_LIQUID_RESERVE_USD);
  const usableUsdg = Math.max(0, rawUsdg - 0.25);
  const minUsd = GUARDRAILS.MIN_TRADE_SIZE_USD;

  if (usableUsdc >= minUsd) {
    const envId = process.env.HELIOS_AAVE_USDC_INVESTMENT_ID?.trim();
    const investmentId =
      envId || (await findAaveInvestmentIdForToken("USDC").catch(() => null)) || null;
    if (investmentId) {
      try {
        const amount = humanStableToAtomic6(String(usableUsdc));
        const r = await executeDefiDepositTee({
          investmentId,
          walletAddress: address,
          accountId,
          token: "USDC",
          amount,
        });
        return {
          action: "yield_park",
          txHash: r.txHash,
          token: "USDC",
          sizeUsdc: usableUsdc.toFixed(2),
          reasoning: `Unconditional Aave deposit (USDC) tx=${r.txHash}`,
        };
      } catch (err) {
        console.error("[runUnconditionalYieldParkDeposit] USDC deposit failed:", err);
      }
    } else {
      console.warn("[runUnconditionalYieldParkDeposit] No USDC Aave investmentId; trying USDG");
    }
  }

  if (usableUsdg < minUsd) {
    return {
      action: "yield_park",
      txHash: null,
      reasoning: `Below minimum deposit ($${minUsd}) after reserve. USDC≈${rawUsdc.toFixed(4)} USDG≈${rawUsdg.toFixed(4)}`,
    };
  }

  try {
    const envId = process.env.HELIOS_AAVE_USDG_INVESTMENT_ID?.trim();
    const investmentId =
      envId ||
      (await findAaveInvestmentIdForToken("USDG").catch(() => null)) ||
      DEFAULT_AAVE_USDG_INVESTMENT_ID;
    const amount = humanStableToAtomic6(String(usableUsdg));
    const r = await executeDefiDepositTee({
      investmentId,
      walletAddress: address,
      accountId,
      token: "USDG",
      amount,
    });
    return {
      action: "yield_park",
      txHash: r.txHash,
      token: "USDG",
      sizeUsdc: usableUsdg.toFixed(2),
      reasoning: `Unconditional Aave deposit (USDG) tx=${r.txHash}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[runUnconditionalYieldParkDeposit] USDG deposit failed:", err);
    return {
      action: "yield_park",
      txHash: null,
      reasoning: `Aave deposit failed (USDC+USDG): ${msg}`,
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

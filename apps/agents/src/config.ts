import { buildExecutorBudget, EXECUTOR_SYSTEM_PROMPT } from "./prompts/executor.js";
import { SENTINEL_SYSTEM_PROMPT } from "./prompts/sentinel.js";
import { buildStrategistBudget, STRATEGIST_SYSTEM_PROMPT } from "./prompts/strategist.js";
import { curatorTools, executorTools, sentinelTools, strategistTools } from "./tools/registry.js";
import type { AgentConfig, AgentName } from "./types.js";

export function buildAgentConfigs(): Record<AgentName, AgentConfig> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
  return {
    curator: {
      name: "curator",
      wallet: {
        accountId: process.env.CURATOR_ACCOUNT_ID ?? "",
        address: (process.env.CURATOR_WALLET_ADDRESS ?? "") as `0x${string}`,
      },
      tools: curatorTools,
      llm: { model: "gpt-4o-mini", apiKey: OPENAI_API_KEY },
      prompts: { strategy: "", budget: "" },
    },
    strategist: {
      name: "strategist",
      wallet: {
        accountId: process.env.STRATEGIST_ACCOUNT_ID ?? "",
        address: (process.env.STRATEGIST_WALLET_ADDRESS ?? "") as `0x${string}`,
      },
      tools: strategistTools,
      llm: { model: "gpt-4o-mini", apiKey: OPENAI_API_KEY },
      prompts: {
        strategy: STRATEGIST_SYSTEM_PROMPT,
        budget: buildStrategistBudget({
          openPositions: "[]",
          yieldPosition: "none",
          consecutiveNoAlpha: 0,
        }),
      },
    },
    sentinel: {
      name: "sentinel",
      wallet: {
        accountId: process.env.SENTINEL_ACCOUNT_ID ?? "",
        address: (process.env.SENTINEL_WALLET_ADDRESS ?? "") as `0x${string}`,
      },
      tools: sentinelTools,
      llm: { model: "gpt-4o-mini", apiKey: OPENAI_API_KEY },
      prompts: { strategy: SENTINEL_SYSTEM_PROMPT, budget: "" },
    },
    executor: {
      name: "executor",
      wallet: {
        accountId: process.env.EXECUTOR_ACCOUNT_ID ?? "",
        address: (process.env.EXECUTOR_WALLET_ADDRESS ?? "") as `0x${string}`,
      },
      tools: executorTools,
      llm: { model: "gpt-4o-mini", apiKey: OPENAI_API_KEY },
      prompts: {
        strategy: EXECUTOR_SYSTEM_PROMPT,
        budget: buildExecutorBudget({
          walletBalance: "0",
          openPositionCount: 0,
          liquidReserve: "1.00",
        }),
      },
    },
  };
}

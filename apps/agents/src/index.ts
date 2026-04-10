import { runCycle, startCycleLoop } from "./agents/curator.js";
import { app } from "./app.js";
import { buildExecutorBudget, EXECUTOR_SYSTEM_PROMPT } from "./prompts/executor.js";
import { SENTINEL_SYSTEM_PROMPT } from "./prompts/sentinel.js";
import { buildStrategistBudget, STRATEGIST_SYSTEM_PROMPT } from "./prompts/strategist.js";
import { curatorTools, executorTools, sentinelTools, strategistTools } from "./tools/registry.js";
import type { AgentConfig, AgentName } from "./types.js";

const PORT = Number(process.env.API_URL?.split(":").pop()) || 3001;
const ENABLE_AGENTS = process.env.ENABLE_AGENTS === "true";
const INTERVAL_MS = (Number(process.env.CHECK_INTERVAL_MINUTES) || 60) * 60 * 1000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

console.log(`[Helios] Starting on port ${PORT}`);
console.log(`[Helios] Agents: ${ENABLE_AGENTS ? "enabled" : "disabled"}`);
console.log(`[Helios] Cycle interval: ${INTERVAL_MS / 60_000}min`);

function buildAgentConfigs(): Record<AgentName, AgentConfig> {
  return {
    curator: {
      name: "curator",
      wallet: {
        accountId: process.env.CURATOR_ACCOUNT_ID ?? "",
        address: (process.env.CURATOR_WALLET_ADDRESS ?? "") as `0x${string}`,
      },
      tools: curatorTools,
      llm: { model: "gpt-4o", apiKey: OPENAI_API_KEY },
      prompts: { strategy: "", budget: "" },
    },
    strategist: {
      name: "strategist",
      wallet: {
        accountId: process.env.STRATEGIST_ACCOUNT_ID ?? "",
        address: (process.env.STRATEGIST_WALLET_ADDRESS ?? "") as `0x${string}`,
      },
      tools: strategistTools,
      llm: { model: "gpt-4o", apiKey: OPENAI_API_KEY },
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
      llm: { model: "gpt-4o", apiKey: OPENAI_API_KEY },
      prompts: { strategy: SENTINEL_SYSTEM_PROMPT, budget: "" },
    },
    executor: {
      name: "executor",
      wallet: {
        accountId: process.env.EXECUTOR_ACCOUNT_ID ?? "",
        address: (process.env.EXECUTOR_WALLET_ADDRESS ?? "") as `0x${string}`,
      },
      tools: executorTools,
      llm: { model: "gpt-4o", apiKey: OPENAI_API_KEY },
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

if (ENABLE_AGENTS) {
  const configs = buildAgentConfigs();

  // First cycle immediately on boot, then on interval
  runCycle(configs).catch((err) => console.error("[Helios] Boot cycle failed:", err));
  startCycleLoop(configs, INTERVAL_MS);

  console.log("[Helios] Agent cycle loop started");
}

export default {
  port: PORT,
  fetch: app.fetch,
};

import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { buildCycleContext } from "../memory/index.js";
import {
  incrementCycle,
  isHalted,
  recordNoAlpha,
  resetNoAlpha,
  setState,
  tripCircuitBreaker,
} from "../state.js";
import type { AgentConfig, AgentName, CycleSummary } from "../types.js";
import { getAllBalances } from "../wallet/index.js";
import { exitPosition, runExecutorDeploy } from "./executor.js";
import { reScorePositions, runSentinelAssessment } from "./sentinel.js";
import { runStrategistScan } from "./strategist.js";

const DATA_DIR = join(import.meta.dir, "../data");

type AgentConfigs = Record<AgentName, AgentConfig>;

export async function runCycle(configs: AgentConfigs): Promise<CycleSummary> {
  const cycleId = crypto.randomUUID();
  const ts = new Date().toISOString();

  if (isHalted()) {
    return {
      id: cycleId,
      ts,
      action: "hold",
      reasoning: "Circuit breaker halted — skipping cycle",
      txHashes: [],
    };
  }

  const wallets = Object.fromEntries(
    Object.entries(configs).map(([name, c]) => [
      name,
      { accountId: c.wallet.accountId, address: c.wallet.address },
    ]),
  ) as Record<AgentName, { accountId: string; address: string }>;

  const balances = await getAllBalances(wallets, process.env.OKX_API_KEY ?? "");
  const cycleContext = buildCycleContext(balances);

  // Phase 1: Exit management — re-score open positions
  setState("STRATEGIST_SCAN");
  const exitResults = await reScorePositions(configs.sentinel, cycleContext);
  const txHashes: string[] = [];

  for (const exit of exitResults) {
    if (exit.verdict === "BLOCK") {
      const position = cycleContext.openPositions.find((p) => p.token === exit.token);
      if (position) {
        const result = await exitPosition(configs.executor, position, exit.reasoning, cycleContext);
        if (result.txHash) txHashes.push(result.txHash);
      }
    }
  }

  // Phase 2: Strategist scan
  const scan = await runStrategistScan(configs.strategist, cycleContext);
  // TODO: x402 payment to Strategist

  let action: CycleSummary["action"] = "no_alpha";
  let reasoning = scan.reasoning;

  if (scan.recommendation === "trade" && scan.topToken) {
    // Phase 3: Sentinel assessment
    setState("SENTINEL_CHECK");
    const assessment = await runSentinelAssessment(
      configs.sentinel,
      scan.topToken,
      "", // TODO: contract address from scan
      cycleContext,
    );
    // TODO: x402 payment to Sentinel

    if (assessment.verdict === "CLEAR") {
      // Phase 4: Executor deploy
      setState("EXECUTOR_DEPLOY");
      const deploy = await runExecutorDeploy(
        configs.executor,
        `BUY ${scan.topToken}: score ${scan.compositeScore}, signals ${scan.signalCount}`,
        cycleContext,
      );
      // TODO: x402 payment to Executor
      if (deploy.txHash) txHashes.push(deploy.txHash);
      action = "buy";
      reasoning = deploy.reasoning;
      resetNoAlpha();
    } else {
      reasoning = `Sentinel BLOCKED: ${assessment.reasoning}`;
    }
  }

  // Phase 5: Yield park (no alpha or blocked)
  if (action === "no_alpha") {
    setState("YIELD_PARK");
    const park = await runExecutorDeploy(
      configs.executor,
      "Park idle USDC in Aave V3 — no alpha found this cycle",
      cycleContext,
    );
    if (park.txHash) txHashes.push(park.txHash);
    action = "yield_park";
    recordNoAlpha();
  }

  // Reset to IDLE
  setState("IDLE");
  incrementCycle();

  const summary: CycleSummary = { id: cycleId, ts, action, reasoning, txHashes };
  appendFileSync(join(DATA_DIR, "cycle_log.jsonl"), `${JSON.stringify(summary)}\n`);

  return summary;
}

export function startCycleLoop(configs: AgentConfigs, intervalMs: number): NodeJS.Timer {
  return setInterval(async () => {
    try {
      const summary = await runCycle(configs);
      console.log(`[Curator] Cycle ${summary.id}: ${summary.action}`);
    } catch (err) {
      console.error("[Curator] Cycle failed:", err);
      tripCircuitBreaker(err instanceof Error ? err.message : "Unknown error");
    }
  }, intervalMs);
}

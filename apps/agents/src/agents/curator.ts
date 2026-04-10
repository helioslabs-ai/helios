import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { settleX402 } from "@helios/shared/payments";
import { getDb } from "../db/client.js";
import { cycles, economyEntries } from "../db/schema/index.js";
import { buildCycleContext } from "../memory/index.js";
import { logCycleOnChain } from "../registry.js";
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
import { exitPosition } from "./executor.js";
import { reScorePositions } from "./sentinel.js";

const DATA_DIR = join(import.meta.dir, "../data");
const API_URL = process.env.API_URL ?? "http://localhost:3001";

type AgentConfigs = Record<AgentName, AgentConfig>;

type EconomyLogEntry = {
  cycleId: string;
  ts: string;
  from: AgentName;
  to: AgentName;
  amount: string;
  currency: "USDG";
  txHash: string | null;
  serviceUrl: string;
  isNoAlpha: boolean;
};

function appendEconomyLog(entry: EconomyLogEntry): void {
  appendFileSync(join(DATA_DIR, "economy_log.jsonl"), `${JSON.stringify(entry)}\n`);
  const db = getDb();
  if (db) {
    db.insert(economyEntries)
      .values({
        id: crypto.randomUUID(),
        cycleId: entry.cycleId,
        ts: new Date(entry.ts),
        from: entry.from,
        to: entry.to,
        amount: entry.amount,
        currency: entry.currency,
        txHash: entry.txHash,
        serviceUrl: entry.serviceUrl,
        isNoAlpha: entry.isNoAlpha,
      })
      .catch(() => {});
  }
}

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

  const txHashes: string[] = [];

  // Phase 1: Exit management — re-score open positions directly (not x402 gated)
  setState("STRATEGIST_SCAN");
  const exitResults = await reScorePositions(configs.sentinel, cycleContext);
  for (const exit of exitResults) {
    if (exit.verdict === "BLOCK") {
      const position = cycleContext.openPositions.find((p) => p.token === exit.token);
      if (position) {
        const result = await exitPosition(configs.executor, position, exit.reasoning, cycleContext);
        if (result.txHash) txHashes.push(result.txHash);
      }
    }
  }

  // Phase 2: Strategist scan via x402
  const curatorAddress = configs.curator.wallet.address;
  const scanUrl = `${API_URL}/agents/strategist/scan`;
  const scanResult = await settleX402(scanUrl, curatorAddress);

  appendEconomyLog({
    cycleId,
    ts: new Date().toISOString(),
    from: "curator",
    to: "strategist",
    amount: "0.001",
    currency: "USDG",
    txHash: scanResult.txHash,
    serviceUrl: "/agents/strategist/scan",
    isNoAlpha: false,
  });

  const scan = scanResult.body as {
    topToken?: string | null;
    topContract?: string | null;
    recommendation?: string;
    compositeScore?: number;
    signalCount?: number;
    reasoning?: string;
  };

  let action: CycleSummary["action"] = "no_alpha";
  let reasoning = scan.reasoning ?? "Strategist returned no reasoning";

  if (scan.recommendation === "trade" && scan.topToken) {
    // Phase 3: Sentinel assessment via x402
    setState("SENTINEL_CHECK");
    const assessUrl = `${API_URL}/agents/sentinel/assess?token=${encodeURIComponent(scan.topToken)}&contract=${encodeURIComponent(scan.topContract ?? "")}`;
    const assessResult = await settleX402(assessUrl, curatorAddress);

    appendEconomyLog({
      cycleId,
      ts: new Date().toISOString(),
      from: "curator",
      to: "sentinel",
      amount: "0.001",
      currency: "USDG",
      txHash: assessResult.txHash,
      serviceUrl: "/agents/sentinel/assess",
      isNoAlpha: false,
    });

    const assessment = assessResult.body as { verdict?: string; reasoning?: string };

    if (assessment.verdict === "CLEAR") {
      // Phase 4: Executor deploy via x402
      setState("EXECUTOR_DEPLOY");
      const deployUrl = `${API_URL}/agents/executor/deploy`;
      const instruction = `BUY ${scan.topToken}: score ${scan.compositeScore ?? 0}, signals ${scan.signalCount ?? 0}`;
      const deployResult = await settleX402(deployUrl, curatorAddress, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });

      appendEconomyLog({
        cycleId,
        ts: new Date().toISOString(),
        from: "curator",
        to: "executor",
        amount: "0.001",
        currency: "USDG",
        txHash: deployResult.txHash,
        serviceUrl: "/agents/executor/deploy",
        isNoAlpha: false,
      });

      const deploy = deployResult.body as { txHash?: string | null; reasoning?: string };
      if (deploy.txHash) txHashes.push(deploy.txHash);
      action = "buy";
      reasoning = deploy.reasoning ?? "Executor deployed trade";
      resetNoAlpha();
    } else {
      reasoning = `Sentinel BLOCKED: ${assessment.reasoning ?? "risk threshold exceeded"}`;
    }
  }

  // Phase 5: Yield park (no alpha or blocked)
  if (action === "no_alpha") {
    setState("YIELD_PARK");
    const deployUrl = `${API_URL}/agents/executor/deploy`;
    const instruction = "Park idle USDC in Aave V3 — no alpha found this cycle";
    const parkResult = await settleX402(deployUrl, curatorAddress, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction }),
    });

    appendEconomyLog({
      cycleId,
      ts: new Date().toISOString(),
      from: "curator",
      to: "executor",
      amount: "0.001",
      currency: "USDG",
      txHash: parkResult.txHash,
      serviceUrl: "/agents/executor/deploy",
      isNoAlpha: true,
    });

    const park = parkResult.body as { txHash?: string | null };
    if (park.txHash) txHashes.push(park.txHash);
    action = "yield_park";
    recordNoAlpha();
  }

  if (action === "buy") {
    setState("COMPOUNDING");
  }
  setState("IDLE");
  incrementCycle();

  const summary: CycleSummary = { id: cycleId, ts, action, reasoning, txHashes };
  appendFileSync(join(DATA_DIR, "cycle_log.jsonl"), `${JSON.stringify(summary)}\n`);

  const db = getDb();
  if (db) {
    db.insert(cycles)
      .values({
        id: cycleId,
        ts: new Date(ts),
        action,
        reasoning,
        txHashes,
      })
      .catch(() => {});
  }

  // Log to HeliosRegistry on-chain (non-blocking, non-fatal)
  logCycleOnChain({ action, txHashes }).catch(() => {});

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

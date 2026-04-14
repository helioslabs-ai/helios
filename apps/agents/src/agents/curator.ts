import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GUARDRAILS, maxTradeSize } from "@helios/shared/guardrails";
import { getDb } from "../db/client.js";
import { cycles, economyEntries } from "../db/schema/index.js";
import { buildCycleContext } from "../memory/index.js";
import { logCycleOnChain } from "../registry.js";
import {
  getState,
  haltSwarm,
  incrementCycle,
  isHalted,
  recordNoAlpha,
  resetConsecutiveFailures,
  resetNoAlpha,
  setState,
  tripCircuitBreaker,
} from "../state.js";
import type { AgentConfig, AgentName, CycleSummary, Position } from "../types.js";
import { getAllBalances, settleX402 } from "../wallet/index.js";
import { exitPosition } from "./executor.js";
import { reScorePositions } from "./sentinel.js";

const DATA_DIR = join(import.meta.dir, "../data");
const API_URL = `http://localhost:${process.env.PORT ?? "3001"}`;

mkdirSync(DATA_DIR, { recursive: true });

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

type CycleTxKind = "x402_payment" | "trade" | "yield_deposit" | "trade_exit";

interface CycleTxEvent {
  txHash: string;
  kind: CycleTxKind;
  agent: AgentName;
  context: string;
  serviceUrl?: string;
}

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

  // A4: fallback to zero balances on API failure — never crash the cycle
  const balances = await getAllBalances(wallets).catch((err) => {
    console.warn("[Curator] getAllBalances failed, using zero fallback:", err);
    return { curator: "0", strategist: "0", sentinel: "0", executor: "0" } as Record<
      AgentName,
      string
    >;
  });
  const cycleContext = buildCycleContext(balances);

  const txHashes: string[] = [];
  const transactions: CycleTxEvent[] = [];

  // Phase 1: Exit management — re-score open positions directly (not x402 gated)
  setState("STRATEGIST_SCAN");
  const exitResults = await reScorePositions(configs.sentinel, cycleContext);
  for (const exit of exitResults) {
    if (exit.verdict === "BLOCK") {
      const position = cycleContext.openPositions.find((p) => p.token === exit.token);
      if (position) {
        const result = await exitPosition(configs.executor, position, exit.reasoning, cycleContext);
        if (result.txHash) {
          txHashes.push(result.txHash);
          transactions.push({
            txHash: result.txHash,
            kind: "trade_exit",
            agent: "executor",
            context: `Exited ${position.token} after sentinel re-score BLOCK`,
          });
        }
      }
    }
  }

  // Phase 2: Strategist scan via x402
  const curatorAddress = configs.curator.wallet.address;
  const curatorAccountId = configs.curator.wallet.accountId;
  const scanUrl = `${API_URL}/agents/strategist/scan`;
  const scanResult = await settleX402(scanUrl, curatorAddress, curatorAccountId);

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
  if (scanResult.txHash) {
    txHashes.push(scanResult.txHash);
    transactions.push({
      txHash: scanResult.txHash,
      kind: "x402_payment",
      agent: "strategist",
      context: "Curator paid strategist for scan",
      serviceUrl: "/agents/strategist/scan",
    });
  }

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
    const assessResult = await settleX402(assessUrl, curatorAddress, curatorAccountId);

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
    if (assessResult.txHash) {
      txHashes.push(assessResult.txHash);
      transactions.push({
        txHash: assessResult.txHash,
        kind: "x402_payment",
        agent: "sentinel",
        context: "Curator paid sentinel for risk assessment",
        serviceUrl: "/agents/sentinel/assess",
      });
    }

    const assessment = assessResult.body as { verdict?: string; reasoning?: string };

    if (assessment.verdict === "CLEAR") {
      // Phase 4: Executor deploy via x402
      setState("EXECUTOR_DEPLOY");
      const deployUrl = `${API_URL}/agents/executor/deploy`;
      // A9: include computed trade size so executor knows the budget
      const executorBalanceUsdc = Number.parseFloat(cycleContext.walletBalances.executor ?? "0");
      const sizeUsdc = maxTradeSize(executorBalanceUsdc).toFixed(2);
      const instruction = `BUY ${scan.topToken} (contract: ${scan.topContract ?? "unknown"}): size $${sizeUsdc} USDC, score ${scan.compositeScore ?? 0}, signals ${scan.signalCount ?? 0}`;
      const deployResult = await settleX402(deployUrl, curatorAddress, curatorAccountId, {
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
      if (deployResult.txHash) {
        txHashes.push(deployResult.txHash);
        transactions.push({
          txHash: deployResult.txHash,
          kind: "x402_payment",
          agent: "executor",
          context: "Curator paid executor for deployment",
          serviceUrl: "/agents/executor/deploy",
        });
      }

      const deploy = deployResult.body as {
        txHash?: string | null;
        token?: string;
        sizeUsdc?: string;
        reasoning?: string;
      };
      if (deploy.txHash) {
        txHashes.push(deploy.txHash);
        transactions.push({
          txHash: deploy.txHash,
          kind: "trade",
          agent: "executor",
          context: `Executor bought ${deploy.token ?? scan.topToken ?? "asset"}`,
        });
        // A2: write open position to positions.json
        writePosition({
          token: deploy.token ?? scan.topToken ?? "unknown",
          contractAddress: scan.topContract ?? "",
          entryPrice: "0",
          sizeUsdc: deploy.sizeUsdc ?? sizeUsdc,
          entryTxHash: deploy.txHash,
          enteredAt: new Date().toISOString(),
          status: "open",
        });
      }
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
    const parkResult = await settleX402(deployUrl, curatorAddress, curatorAccountId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction, yieldPark: true }),
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
    if (parkResult.txHash) {
      txHashes.push(parkResult.txHash);
      transactions.push({
        txHash: parkResult.txHash,
        kind: "x402_payment",
        agent: "executor",
        context: "Curator paid executor for yield deposit",
        serviceUrl: "/agents/executor/deploy",
      });
    }

    const park = parkResult.body as { txHash?: string | null; sizeUsdc?: string };
    if (park.txHash) {
      txHashes.push(park.txHash);
      transactions.push({
        txHash: park.txHash,
        kind: "yield_deposit",
        agent: "executor",
        context: "Executor deposited idle USDC to Aave V3",
      });
      // A7: write yield position to yield.json
      const yieldAmountUsdc = park.sizeUsdc ?? cycleContext.walletBalances.executor ?? "0";
      writeFileSync(
        join(DATA_DIR, "yield.json"),
        JSON.stringify({
          platform: "Aave V3",
          amountUsdc: yieldAmountUsdc,
          apy: "0.12",
          depositedAt: new Date().toISOString(),
          txHash: park.txHash,
        }),
      );
    }
    action = "yield_park";
    recordNoAlpha();
  }

  if (action === "buy") {
    setState("COMPOUNDING");
  }
  setState("IDLE");
  incrementCycle();
  // A3: reset consecutive failures on clean cycle
  resetConsecutiveFailures();

  const summary: CycleSummary = { id: cycleId, ts, action, reasoning, txHashes, transactions };
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

  // A10: check session loss — halt if pnlUsdc < -MAX_SESSION_LOSS_USD
  checkSessionLoss();

  // Log to HeliosRegistry on-chain (non-blocking, non-fatal)
  logCycleOnChain({ action, txHashes }).catch(() => {});

  // Post stats to leaderboard registry (non-blocking, non-fatal)
  postRegistryStats(configs).catch(() => {});

  return summary;
}

function readPositions(): Position[] {
  const path = join(DATA_DIR, "positions.json");
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Position[];
  } catch {
    return [];
  }
}

function writePosition(position: Position): void {
  const positions = readPositions();
  positions.push(position);
  writeFileSync(join(DATA_DIR, "positions.json"), JSON.stringify(positions, null, 2));
}

function checkSessionLoss(): void {
  const positions = readPositions();
  const pnlUsdc = positions
    .filter((p) => p.status === "closed" && p.pnlPct !== undefined)
    .reduce((acc, p) => acc + ((p.pnlPct ?? 0) / 100) * Number.parseFloat(p.sizeUsdc), 0);
  if (pnlUsdc < -GUARDRAILS.MAX_SESSION_LOSS_USD) {
    haltSwarm(
      `Session loss $${pnlUsdc.toFixed(2)} exceeded limit $${GUARDRAILS.MAX_SESSION_LOSS_USD}`,
    );
  }
}

async function postRegistryStats(configs: AgentConfigs): Promise<void> {
  const state = getState();
  const cycleLogs = (() => {
    const path = join(DATA_DIR, "cycle_log.jsonl");
    if (!existsSync(path)) return [] as CycleSummary[];
    return readFileSync(path, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as CycleSummary);
  })();
  const positions = readPositions();

  const tradeCount = cycleLogs.filter((c) => c.action === "buy").length;
  const pnlUsdc = positions
    .filter((p) => p.status === "closed" && p.pnlPct !== undefined)
    .reduce((acc, p) => acc + ((p.pnlPct ?? 0) / 100) * Number.parseFloat(p.sizeUsdc), 0);
  const returnPct = (pnlUsdc / 10.0) * 100;
  const status = state.circuitBreaker.halted ? "halted" : "active";

  await fetch(`${API_URL}/api/registry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      swarmName: process.env.SWARM_NAME ?? "helios-genesis",
      model: configs.curator.llm.model,
      curatorAddress: configs.curator.wallet.address.toLowerCase(),
      returnPct: returnPct.toFixed(4),
      pnlUsdc: pnlUsdc.toFixed(4),
      tradeCount,
      cycleCount: state.totalCycles,
      status,
    }),
  });
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

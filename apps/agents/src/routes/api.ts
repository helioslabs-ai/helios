import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { runCycle } from "../agents/curator.js";
import { buildAgentConfigs } from "../config.js";
import { resolveAgentWalletAddress } from "../constants/agent-wallets.js";
import { getDb } from "../db/client.js";
import {
  type AgentTxRow,
  aggregateEconomyFromDb,
  buildTransactionRowsFromDb,
  countCycleRows,
  countEconomyEntryRows,
  dbCycleToSummary,
  fetchCyclesNewestFirst,
  formatEconomyEntryContext,
} from "../db/historical-queries.js";
import type { HeliosRegistryInsert } from "../db/schema/index.js";
import { heliosRegistry, positions, yieldState } from "../db/schema/index.js";
import {
  getState,
  haltSwarm,
  isHalted,
  resetCircuitBreaker,
  tripCircuitBreaker,
} from "../state.js";
import { okxFetch } from "../tools/okx-client.js";
import type {
  AgentName,
  CycleAction,
  CycleSummary,
  EconomyEntry,
  Position,
  YieldPosition,
} from "../types.js";

const DATA_DIR = join(import.meta.dir, "../data");

function readJsonl<T>(filename: string): T[] {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function readJson<T>(filename: string, fallback: T): T {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

let warnedMissingDb = false;

function warnMissingDb(context: string) {
  if (warnedMissingDb) return;
  warnedMissingDb = true;
  console.warn(
    `[Helios] ${context}: DATABASE_URL not set or DB unreachable — using local JSON fallbacks where available. Leaderboard (/api/registry) needs Supabase.`,
  );
}

function realizedPnlFromPositions(): string {
  const positions = readJson<Position[]>("positions.json", []);
  return positions
    .filter((p) => p.status === "closed" && p.pnlPct !== undefined)
    .reduce((acc, p) => acc + (Number(p.sizeUsdc) * (p.pnlPct ?? 0)) / 100, 0)
    .toFixed(4);
}

function economyFromFiles() {
  const entries = readJsonl<EconomyEntry>("economy_log.jsonl");
  const cycles = readJsonl<CycleSummary>("cycle_log.jsonl");
  const totalX402PaidUsdc = entries
    .reduce((acc, e) => acc + Number.parseFloat(e.amount ?? "0"), 0)
    .toFixed(4);

  const perAgent: Record<AgentName, string> = {
    curator: "0",
    strategist: "0",
    sentinel: "0",
    executor: "0",
  };
  for (const entry of entries) {
    const prev = Number.parseFloat(perAgent[entry.to] ?? "0");
    perAgent[entry.to] = (prev + Number.parseFloat(entry.amount ?? "0")).toFixed(4);
  }

  const economyEntriesCount = entries.length;

  return {
    totalCycles: cycles.length,
    totalX402PaidUsdc,
    totalOnchainTxns: economyEntriesCount,
    economyEntriesCount,
    totalX402Txns: entries.filter((e) => e.txHash).length,
    perAgent,
  };
}

function buildTransactionsFromFiles(): AgentTxRow[] {
  const cycleRows = readJsonl<CycleSummary>("cycle_log.jsonl");
  const entryRows = readJsonl<EconomyEntry>("economy_log.jsonl");
  const cycleById = new Map(cycleRows.map((c) => [c.id, c]));
  const txRows: AgentTxRow[] = [];
  const rowKey = (txHash: string, cycleId: string) => `${txHash}::${cycleId}`;

  for (const e of entryRows) {
    const cycle = cycleById.get(e.cycleId);
    txRows.push({
      txHash: e.txHash?.startsWith("0x") ? e.txHash : `econ:${e.cycleId}:${e.ts}:${e.to}`,
      ts: e.ts,
      cycleId: e.cycleId,
      action: (cycle?.action ?? "hold") as CycleAction,
      kind: "x402_payment",
      agent: e.to,
      context: formatEconomyEntryContext({
        to: e.to,
        serviceUrl: e.serviceUrl,
        isNoAlpha: e.isNoAlpha,
      }),
      reasoning: cycle?.reasoning ?? "",
    });
  }

  const have = new Set(
    txRows.filter((r) => r.txHash.startsWith("0x")).map((r) => rowKey(r.txHash, r.cycleId)),
  );

  for (const c of cycleRows) {
    const economyHashes = new Set(
      entryRows.filter((e) => e.cycleId === c.id && e.txHash).map((e) => e.txHash as string),
    );

    for (const tx of c.transactions ?? []) {
      const k = rowKey(tx.txHash, c.id);
      if (have.has(k)) continue;
      have.add(k);
      txRows.push({
        txHash: tx.txHash,
        ts: c.ts,
        cycleId: c.id,
        action: c.action,
        kind: tx.kind,
        agent: tx.agent,
        context: tx.context,
        reasoning: c.reasoning,
      });
    }

    for (const txHash of c.txHashes ?? []) {
      if (!txHash || economyHashes.has(txHash)) continue;
      const k = rowKey(txHash, c.id);
      if (have.has(k)) continue;
      have.add(k);
      const kind: AgentTxRow["kind"] =
        c.action === "buy" ? "trade" : c.action === "yield_park" ? "yield_deposit" : "trade";
      txRows.push({
        txHash,
        ts: c.ts,
        cycleId: c.id,
        action: c.action,
        kind,
        agent: "executor",
        context:
          kind === "yield_deposit"
            ? "Onchain yield / execution transaction"
            : "Onchain execution transaction",
        reasoning: c.reasoning,
      });
    }
  }

  txRows.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  return txRows;
}

const api = new Hono();

interface AgentBalanceRow {
  totalValue?: string;
}

async function getWalletUsdValue(address: string): Promise<string> {
  if (!address) return "0";
  try {
    const json = await okxFetch<{ data?: AgentBalanceRow[] }>(
      "/api/v6/dex/balance/total-value-by-address",
      {
        params: { address, chains: "196" },
      },
    );
    const first = json.data?.[0];
    return first?.totalValue ?? "0";
  } catch {
    return "0";
  }
}

api.get("/status", async (c) => {
  const state = getState();
  const db = getDb();
  if (db) {
    try {
      const dbCycleCount = await countCycleRows(db);
      return c.json({
        ...state,
        totalCycles: Math.max(state.totalCycles, dbCycleCount),
      });
    } catch (err) {
      console.warn("[API] /status cycle count:", err);
    }
  } else {
    warnMissingDb("/status");
  }

  const cycles = readJsonl<CycleSummary>("cycle_log.jsonl");
  return c.json({
    ...state,
    totalCycles: Math.max(state.totalCycles, cycles.length),
  });
});

api.get("/economy", async (c) => {
  const realizedPnlUsdc = realizedPnlFromPositions();
  const db = getDb();
  if (db) {
    try {
      const [cycleCount, agg] = await Promise.all([countCycleRows(db), aggregateEconomyFromDb(db)]);
      return c.json({
        totalCycles: cycleCount,
        totalX402PaidUsdc: agg.totalX402PaidUsdc,
        totalOnchainTxns: agg.economyEntriesCount,
        economyEntriesCount: agg.economyEntriesCount,
        totalX402Txns: agg.totalX402Txns,
        perAgent: agg.perAgent,
        realizedPnlUsdc,
      });
    } catch (err) {
      console.warn("[API] /economy DB read failed, using files:", err);
    }
  } else {
    warnMissingDb("/economy");
  }

  return c.json({ ...economyFromFiles(), realizedPnlUsdc });
});

api.get("/positions", async (c) => {
  const yieldFromFile = readJson<YieldPosition | null>("yield.json", null);
  const db = getDb();

  if (db) {
    try {
      const rows = await db.select().from(positions).orderBy(desc(positions.openedAt));
      let yieldPosition: YieldPosition | null = yieldFromFile;
      try {
        const yRows = await db
          .select()
          .from(yieldState)
          .where(eq(yieldState.id, "default"))
          .limit(1);
        const y = yRows[0];
        if (y) {
          yieldPosition = {
            platform: "Aave V3",
            amountUsdc: y.amountUsdc,
            apy: y.apy,
            depositedAt: y.depositedAt.toISOString(),
          };
        }
      } catch (yieldErr) {
        console.warn("[API] /positions yield_state read failed:", yieldErr);
      }
      const mapped: Position[] = rows.map((row) => ({
        token: row.token,
        contractAddress: row.tokenAddress,
        entryPrice: row.token === "USDG" || row.token === "USDC" ? "1" : "0",
        sizeUsdc: row.sizeUsdc,
        entryTxHash: row.entryTxHash ?? "",
        exitTxHash: row.exitTxHash ?? undefined,
        enteredAt: row.openedAt.toISOString(),
        exitedAt: row.closedAt?.toISOString(),
        status: row.status === "closed" ? "closed" : "open",
      }));
      return c.json({
        openPositions: mapped.filter((p) => p.status === "open"),
        closedPositions: mapped.filter((p) => p.status === "closed"),
        yieldPosition,
      });
    } catch (err) {
      console.warn("[API] /positions DB read failed, using files:", err);
      const localPositions = readJson<Position[]>("positions.json", []);
      return c.json({
        openPositions: localPositions.filter((p) => p.status === "open"),
        closedPositions: localPositions.filter((p) => p.status === "closed"),
        yieldPosition: yieldFromFile,
      });
    }
  }

  const localPositions = readJson<Position[]>("positions.json", []);
  return c.json({
    openPositions: localPositions.filter((p) => p.status === "open"),
    closedPositions: localPositions.filter((p) => p.status === "closed"),
    yieldPosition: yieldFromFile,
  });
});

api.get("/logs", async (c) => {
  const n = Math.min(Number(c.req.query("n") ?? "100"), 2000);
  const db = getDb();
  if (db) {
    try {
      const total = await countCycleRows(db);
      const rows = await fetchCyclesNewestFirst(db, n);
      const cycles = rows.map(dbCycleToSummary);
      return c.json({ cycles, count: total });
    } catch (err) {
      console.warn("[API] /logs DB failed:", err);
    }
  } else {
    warnMissingDb("/logs");
  }

  const all = readJsonl<CycleSummary>("cycle_log.jsonl");
  const count = all.length;
  const cycles = [...all]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, n);
  return c.json({ cycles, count });
});

api.get("/agents", async (c) => {
  const agentNames: AgentName[] = ["curator", "strategist", "sentinel", "executor"];
  const agents = await Promise.all(
    agentNames.map(async (name) => {
      const address = resolveAgentWalletAddress(name);
      const totalValueUsd = await getWalletUsdValue(address);
      return {
        name,
        address,
        accountId: process.env[`${name.toUpperCase()}_ACCOUNT_ID`] ?? "",
        totalValueUsd,
      };
    }),
  );
  return c.json({ agents });
});

api.get("/transactions", async (c) => {
  const db = getDb();
  if (db) {
    try {
      const [rows, econCount] = await Promise.all([
        buildTransactionRowsFromDb(db, 800, 3000),
        countEconomyEntryRows(db),
      ]);
      return c.json({
        transactions: rows,
        count: rows.length,
        economyEntriesCount: econCount,
      });
    } catch (err) {
      console.warn("[API] /transactions DB failed:", err);
    }
  } else {
    warnMissingDb("/transactions");
  }

  const entries = readJsonl<EconomyEntry>("economy_log.jsonl");
  const txRows = buildTransactionsFromFiles();
  return c.json({
    transactions: txRows,
    count: txRows.length,
    economyEntriesCount: entries.length,
  });
});

api.post("/cycle", async (c) => {
  const state = getState();
  if (state.swarmState !== "IDLE") {
    return c.json({ status: "busy", swarmState: state.swarmState }, 409);
  }
  if (isHalted()) {
    return c.json({ status: "halted", reason: state.circuitBreaker.reason }, 503);
  }
  const cycleId = crypto.randomUUID();
  runCycle(buildAgentConfigs()).catch((err) => {
    console.error("[API] Manual cycle failed:", err);
    tripCircuitBreaker(err instanceof Error ? err.message : "Manual cycle error");
  });
  return c.json({ status: "triggered", cycleId });
});

api.get("/registry", async (c) => {
  const db = getDb();
  if (!db) {
    warnMissingDb("/registry");
    return c.json({ swarms: [] });
  }
  const rows = await db.select().from(heliosRegistry).orderBy(desc(heliosRegistry.returnPct));
  const swarms = rows.map((r) => ({
    id: r.id,
    swarmName: r.isPrivate ? "Private agent" : r.swarmName,
    model: r.isPrivate ? null : r.model,
    curatorAddress: r.curatorAddress,
    returnPct: r.returnPct,
    pnlUsdc: r.pnlUsdc,
    tradeCount: r.tradeCount,
    cycleCount: r.cycleCount,
    status: r.status,
    registeredAt: r.registeredAt,
    lastUpdated: r.lastUpdated,
  }));
  return c.json({ swarms });
});

api.get("/registry/:address", async (c) => {
  const address = c.req.param("address").toLowerCase();
  const db = getDb();
  if (!db) return c.json({ error: "DB unavailable" }, 503);
  const rows = await db
    .select()
    .from(heliosRegistry)
    .where(eq(heliosRegistry.curatorAddress, address));
  if (!rows[0]) return c.json({ error: "Not found" }, 404);
  const r = rows[0];
  return c.json({
    id: r.id,
    swarmName: r.isPrivate ? "Private agent" : r.swarmName,
    model: r.isPrivate ? null : r.model,
    curatorAddress: r.curatorAddress,
    returnPct: r.returnPct,
    pnlUsdc: r.pnlUsdc,
    tradeCount: r.tradeCount,
    cycleCount: r.cycleCount,
    status: r.status,
    isPrivate: r.isPrivate,
    registeredAt: r.registeredAt,
    lastUpdated: r.lastUpdated,
  });
});

api.post("/registry", async (c) => {
  const body = await c.req.json<HeliosRegistryInsert>();
  if (!body.curatorAddress) return c.json({ error: "curatorAddress required" }, 400);
  const db = getDb();
  if (!db) return c.json({ error: "DB unavailable" }, 503);
  await db
    .insert(heliosRegistry)
    .values({
      ...body,
      curatorAddress: body.curatorAddress.toLowerCase(),
      lastUpdated: new Date(),
    })
    .onConflictDoUpdate({
      target: heliosRegistry.curatorAddress,
      set: {
        swarmName: body.swarmName,
        model: body.model,
        returnPct: body.returnPct ?? "0",
        pnlUsdc: body.pnlUsdc ?? "0",
        tradeCount: body.tradeCount ?? 0,
        cycleCount: body.cycleCount ?? 0,
        status: body.status ?? "active",
        lastUpdated: new Date(),
      },
    });
  return c.json({ ok: true });
});

api.post("/reset", (c) => {
  resetCircuitBreaker();
  return c.json({ ok: true, reset: true });
});

api.post("/halt", async (c) => {
  const body = await c.req.json<{ reason?: string }>().catch(() => ({ reason: undefined }));
  haltSwarm((body as { reason?: string }).reason ?? "operator halt");
  return c.json({ ok: true, halted: true });
});

api.get("/sse", (c) => {
  return streamSSE(c, async (stream) => {
    while (true) {
      const state = getState();
      const positions = readJson<Position[]>("positions.json", []);
      const db = getDb();

      let recentCycles: CycleSummary[] = [];
      let recentTransactions: AgentTxRow[] = [];

      if (db) {
        try {
          const newest5 = await fetchCyclesNewestFirst(db, 5);
          recentCycles = [...newest5].reverse().map(dbCycleToSummary);
          recentTransactions = (await buildTransactionRowsFromDb(db, 20, 400)).slice(0, 40);
        } catch (err) {
          console.warn("[API] SSE DB failed:", err);
        }
      }

      if (recentCycles.length === 0) {
        const all = readJsonl<CycleSummary>("cycle_log.jsonl");
        recentCycles = all.slice(-5);
      }
      if (recentTransactions.length === 0) {
        recentTransactions = buildTransactionsFromFiles().slice(0, 40);
      }

      await stream.writeSSE({
        data: JSON.stringify({
          state,
          recentCycles,
          recentTransactions,
          openPositions: positions.filter((p) => p.status === "open"),
        }),
        event: "state",
      });
      await stream.sleep(5000);
    }
  });
});

export { api };

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eq, desc } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { runCycle } from "../agents/curator.js";
import { buildAgentConfigs } from "../config.js";
import { getDb } from "../db/client.js";
import { heliosRegistry } from "../db/schema/index.js";
import type { HeliosRegistryInsert } from "../db/schema/index.js";
import { getState, haltSwarm, isHalted, tripCircuitBreaker } from "../state.js";
import type { AgentName, CycleSummary, EconomyEntry, Position } from "../types.js";

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

const api = new Hono();

api.get("/status", (c) => {
  const state = getState();
  return c.json(state);
});

api.get("/economy", (c) => {
  const entries = readJsonl<EconomyEntry>("economy_log.jsonl");
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

  return c.json({
    totalCycles: getState().totalCycles,
    totalX402PaidUsdc,
    totalX402Txns: entries.filter((e) => e.txHash).length,
    perAgent,
  });
});

api.get("/positions", (c) => {
  const positions = readJson<Position[]>("positions.json", []);
  const yieldPosition = readJson<unknown>("yield.json", null);
  return c.json({
    openPositions: positions.filter((p) => p.status === "open"),
    closedPositions: positions.filter((p) => p.status === "closed"),
    yieldPosition,
  });
});

api.get("/logs", (c) => {
  const n = Math.min(Number(c.req.query("n") ?? "20"), 100);
  const cycles = readJsonl<CycleSummary>("cycle_log.jsonl");
  return c.json({ cycles: cycles.slice(-n), count: cycles.length });
});

api.get("/agents", (c) => {
  const agentNames: AgentName[] = ["curator", "strategist", "sentinel", "executor"];
  const agents = agentNames.map((name) => ({
    name,
    address: process.env[`${name.toUpperCase()}_WALLET_ADDRESS`] ?? "",
    accountId: process.env[`${name.toUpperCase()}_ACCOUNT_ID`] ?? "",
  }));
  return c.json({ agents });
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
  if (!db) return c.json({ swarms: [] });
  const rows = await db
    .select()
    .from(heliosRegistry)
    .orderBy(desc(heliosRegistry.returnPct));
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

api.post("/halt", async (c) => {
  const body = await c.req.json<{ reason?: string }>().catch(() => ({ reason: undefined }));
  haltSwarm((body as { reason?: string }).reason ?? "operator halt");
  return c.json({ ok: true, halted: true });
});

api.get("/sse", (c) => {
  return streamSSE(c, async (stream) => {
    while (true) {
      const state = getState();
      const cycles = readJsonl<CycleSummary>("cycle_log.jsonl").slice(-5);
      const positions = readJson<Position[]>("positions.json", []);
      await stream.writeSSE({
        data: JSON.stringify({
          state,
          recentCycles: cycles,
          openPositions: positions.filter((p) => p.status === "open"),
        }),
        event: "state",
      });
      await stream.sleep(5000);
    }
  });
});

export { api };

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getState } from "../state.js";
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
  const cycleId = crypto.randomUUID();
  // Fire-and-forget — actual cycle runs in background; caller tracks via /logs
  return c.json({ status: "triggered", cycleId });
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

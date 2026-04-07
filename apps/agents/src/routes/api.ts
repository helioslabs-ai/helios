import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getState } from "../state.js";

const api = new Hono();

api.get("/status", (c) => {
  const state = getState();
  return c.json(state);
});

api.get("/economy", (c) => {
  // TODO: read economy_log.jsonl and aggregate
  return c.json({ totalCycles: 0, totalX402PaidUsdc: "0", perAgent: {} });
});

api.get("/positions", (c) => {
  // TODO: read positions.json
  return c.json({ openPositions: [], yieldPosition: null });
});

api.get("/logs", (c) => {
  const n = Number(c.req.query("n") ?? "5");
  // TODO: read last N from cycle_log.jsonl
  return c.json({ cycles: [], count: n });
});

api.get("/agents", (c) => {
  // TODO: return all 4 agents with addresses, balances, last action
  return c.json({ agents: [] });
});

api.post("/cycle", async (c) => {
  // TODO: trigger manual cycle via curator.runCycle()
  return c.json({ status: "triggered", cycleId: crypto.randomUUID() });
});

api.get("/sse", (c) => {
  return streamSSE(c, async (stream) => {
    while (true) {
      const state = getState();
      await stream.writeSSE({ data: JSON.stringify(state), event: "state" });
      await stream.sleep(5000);
    }
  });
});

export { api };

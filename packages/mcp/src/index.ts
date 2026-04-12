import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.HELIOS_API_URL ?? "http://localhost:3001";

async function fetchApi(path: string): Promise<string> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return JSON.stringify(await res.json(), null, 2);
}

const server = new McpServer({
  name: "helios",
  version: "1.0.0",
});

server.tool(
  "get_system_status",
  "Current swarm state, last cycle summary, circuit breaker status, consecutive failures",
  {},
  async () => {
    const data = await fetchApi("/api/status");
    return { content: [{ type: "text", text: data }] };
  },
);

server.tool(
  "get_signals",
  "Latest Strategist alpha scan — most recent cycle reasoning, action taken, and Sentinel verdict",
  { n: z.number().optional().describe("Number of recent cycles to return (default 1)") },
  async ({ n }) => {
    const count = n ?? 1;
    const data = await fetchApi(`/api/logs?n=${count}`);
    return { content: [{ type: "text", text: data }] };
  },
);

server.tool(
  "get_economy",
  "x402 payment history, per-agent totals, total USDG paid across cycles",
  {},
  async () => {
    const data = await fetchApi("/api/economy");
    return { content: [{ type: "text", text: data }] };
  },
);

server.tool(
  "get_positions",
  "Open token positions, active Aave V3 yield position, closed positions with P&L",
  {},
  async () => {
    const data = await fetchApi("/api/positions");
    return { content: [{ type: "text", text: data }] };
  },
);

server.tool(
  "get_cycle_history",
  "Last N cycle logs with AI reasoning, Sentinel verdict, and all txHashes",
  { n: z.number().optional().describe("Number of cycles to return (default 10)") },
  async ({ n }) => {
    const count = n ?? 10;
    const data = await fetchApi(`/api/logs?n=${count}`);
    return { content: [{ type: "text", text: data }] };
  },
);

server.tool(
  "get_agents",
  "All 4 Helios agents with wallet addresses and account IDs",
  {},
  async () => {
    const data = await fetchApi("/api/agents");
    return { content: [{ type: "text", text: data }] };
  },
);

server.tool(
  "get_registry",
  "Live leaderboard — all active swarms ranked by return%, with PnL, trade count, cycle count, and status",
  {},
  async () => {
    const data = await fetchApi("/api/registry");
    return { content: [{ type: "text", text: data }] };
  },
);

server.tool(
  "run_cycle",
  "Trigger one full Curator cycle immediately (bypasses 30-min interval)",
  {},
  async () => {
    const res = await fetch(`${API_URL}/api/cycle`, { method: "POST" });
    if (!res.ok) throw new Error(`Cycle trigger failed: ${res.status}`);
    const data = JSON.stringify(await res.json(), null, 2);
    return { content: [{ type: "text", text: data }] };
  },
);

server.resource("helios://status", "Current swarm state + circuit breaker", async (uri) => {
  const data = await fetchApi("/api/status");
  return { contents: [{ uri: uri.href, mimeType: "application/json", text: data }] };
});

server.resource("helios://economy", "x402 payment history + per-agent totals", async (uri) => {
  const data = await fetchApi("/api/economy");
  return { contents: [{ uri: uri.href, mimeType: "application/json", text: data }] };
});

server.resource("helios://positions", "Open positions + yield position + P&L", async (uri) => {
  const data = await fetchApi("/api/positions");
  return { contents: [{ uri: uri.href, mimeType: "application/json", text: data }] };
});

server.resource("helios://agents", "All 4 agents with wallet addresses", async (uri) => {
  const data = await fetchApi("/api/agents");
  return { contents: [{ uri: uri.href, mimeType: "application/json", text: data }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);

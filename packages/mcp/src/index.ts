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
  version: "0.0.1",
});

server.tool(
  "get_system_status",
  "Current swarm state, last cycle summary, circuit breaker status",
  {},
  async () => {
    const data = await fetchApi("/api/status");
    return { content: [{ type: "text", text: data }] };
  },
);

server.tool("get_signals", "Strategist's latest alpha scan results", {}, async () => {
  const data = await fetchApi("/api/status");
  return { content: [{ type: "text", text: data }] };
});

server.tool("get_economy", "x402 payment history, per-agent totals", {}, async () => {
  const data = await fetchApi("/api/economy");
  return { content: [{ type: "text", text: data }] };
});

server.tool("get_positions", "Open positions + yield position + P&L", {}, async () => {
  const data = await fetchApi("/api/positions");
  return { content: [{ type: "text", text: data }] };
});

server.tool(
  "get_cycle_history",
  "Last N cycle logs with Claude reasoning + txHashes",
  { n: z.number().optional().describe("Number of cycles to return (default 10)") },
  async ({ n }) => {
    const count = n ?? 10;
    const data = await fetchApi(`/api/logs?n=${count}`);
    return { content: [{ type: "text", text: data }] };
  },
);

server.tool("run_cycle", "Trigger one full Curator cycle manually", {}, async () => {
  const res = await fetch(`${API_URL}/api/cycle`, { method: "POST" });
  if (!res.ok) throw new Error(`Cycle trigger failed: ${res.status}`);
  const data = JSON.stringify(await res.json(), null, 2);
  return { content: [{ type: "text", text: data }] };
});

server.resource("helios://status", "Current swarm state", async (uri) => {
  const data = await fetchApi("/api/status");
  return { contents: [{ uri: uri.href, mimeType: "application/json", text: data }] };
});

server.resource("helios://economy", "Economy log", async (uri) => {
  const data = await fetchApi("/api/economy");
  return { contents: [{ uri: uri.href, mimeType: "application/json", text: data }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);

# Helios — MCP Server

`packages/mcp-server/` exposes the running Helios system as MCP tools. Any MCP-compatible client — Claude Code, the Moltbook agent, or any other AI agent — can connect and interact with a live Helios instance without running it themselves.

**Transport:** stdio  
**Protocol:** `@modelcontextprotocol/sdk`

---

## Tools

| Tool                | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `get_system_status` | Current state machine state, last cycle summary, circuit breaker   |
| `get_signals`       | Strategist's latest alpha scan result — top token, score, reasoning |
| `get_economy`       | x402 payment history, per-agent totals, cumulative USDG circulated |
| `get_positions`     | Open positions (entry price, P&L) + Aave yield position            |
| `get_cycle_history` | Last N cycle logs with Claude reasoning + txHashes (default: 10)   |
| `run_cycle`         | Trigger one full Curator cycle via POST /api/cycle                 |

All tools are thin proxies to the Hono API backend. No business logic in the MCP server.

---

## Resources

| Resource              | Content                             |
| --------------------- | ----------------------------------- |
| `helios://status`     | Current system state (readable)     |
| `helios://economy`    | Economy log (readable)              |
| `helios://reasoning`  | Latest cycle reasoning trace        |

---

## File Structure

```
packages/mcp-server/
├── src/
│   └── index.ts     # McpServer setup, tool/resource definitions, StdioServerTransport
└── package.json     # name: @helios/mcp-server
```

---

## Configuration

Copy `.mcp.json.example` to `.mcp.json` and point `HELIOS_API_URL` at a running instance:

```json
{
  "mcpServers": {
    "helios": {
      "command": "bun",
      "args": ["run", "packages/mcp-server/src/index.ts"],
      "env": {
        "HELIOS_API_URL": "http://localhost:3001"
      }
    }
  }
}
```

---

## SKILL.md

`SKILL.md` at repo root documents Helios as an installable skill for other agents and AI assistants.

```bash
npx skills add helios/multi-agent-defi
```

The skill documents the CLI commands and MCP tools in the OKX plugin-store format so any agent that reads `SKILL.md` knows how to query a running Helios instance.

---

## CLI Reference

The `packages/cli/` package is a thin HTTP client over the Hono API — no extra processes or ports.

| Command              | Description                                        |
| -------------------- | -------------------------------------------------- |
| `helios setup`       | First-run genesis wizard                           |
| `helios start`       | Start the system (runs as background process)      |
| `helios stop`        | Stop the system                                    |
| `helios status`      | Current state, last cycle summary, wallet balances |
| `helios cycle`       | Trigger one manual cycle                           |
| `helios economy`     | x402 payment history + per-agent totals            |
| `helios positions`   | Open positions + P&L + yield                       |
| `helios logs [n]`    | Last n cycle logs with AI reasoning (default: 5)   |
| `helios agents`      | Agent addresses, balances, last action             |

**Global flag:** `--json` — output machine-readable JSON on any command.

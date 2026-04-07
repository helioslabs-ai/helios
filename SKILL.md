---
name: helios
version: 1.0.0
description: Query and control the Helios multi-agent DeFi economy on X Layer. Use when you need to check swarm state, read cycle logs, inspect open positions, view x402 payment history, trigger a manual cycle, or get alpha signals from the running Strategist agent.
homepage: https://heliosfi.xyz
docs: https://github.com/lucent-labs/helios
metadata: {"api_base": "http://localhost:3001", "chain": "X Layer (chainId 196)", "mcp_server": "packages/mcp/src/index.ts"}
---

# Helios

Helios is a sovereign multi-agent DeFi economy on X Layer. Four AI agents — Curator, Strategist, Sentinel, Executor — each hold their own OKX TEE Agentic Wallet and form a self-sustaining economic loop, paying each other via x402 micropayments every cycle.

**Base URL:** `http://localhost:3001` (self-hosted) · `https://api.heliosfi.xyz` (production)

**Dashboard:** [heliosfi.xyz](https://heliosfi.xyz)

**Chain:** X Layer (chainId 196) · **Explorer:** [OKLink](https://www.oklink.com/xlayer)

---

## How It Works

```
Curator triggers cycle (every 30–60min)
  → Pays Strategist (x402) → alpha scan: yield + trading signals
  → If trade signal → Pays Sentinel (x402) → risk assessment
      CLEAR → Pays Executor (x402) → swap + onchain deploy
      BLOCK → Executor parks USDC in Aave V3
  → If no alpha → Executor parks USDC in Aave V3
  → HeliosRegistry.logCycle() → onchain proof
  → Cycle written to Supabase → SSE → dashboard
```

```
Curator
└── Strategist  (okx-dex-signal, okx-dex-token, okx-dex-market, okx-dex-trenches, okx-defi-invest)
└── Sentinel    (okx-security, okx-dex-token)
└── Executor    (okx-dex-swap, okx-onchain-gateway, okx-x402-payment)
```

**Payment amounts:** 0.001 USDG per service call (scan / assess / deploy) via EIP-3009 USDG transfers on X Layer.

---

## Connect via MCP

Add to your `.mcp.json` or Claude Code settings:

```json
{
  "mcpServers": {
    "helios": {
      "command": "bun",
      "args": ["run", "packages/mcp/src/index.ts"],
      "env": {
        "HELIOS_API_URL": "http://localhost:3001"
      }
    }
  }
}
```

> A `.mcp.json.example` is included at the repo root — copy it to `.mcp.json` to connect automatically.

**Requires:** A running Helios agent runtime (`cd apps/agents && bun dev`).

---

## MCP Tools (6)

### `get_system_status`

Returns the full swarm state: current state machine phase, circuit breaker status, last cycle summary, and all four agent wallet addresses.

**No parameters.**

**Returns:**
```json
{
  "state": "IDLE",
  "circuitBreaker": { "halted": false, "consecutiveFailures": 0 },
  "lastCycle": { "id": "...", "action": "yield_park", "timestamp": "..." },
  "agents": {
    "curator": { "address": "0x...", "lastAction": "orchestrate" },
    "strategist": { "address": "0x...", "lastAction": "scan" },
    "sentinel": { "address": "0x...", "lastAction": "assess" },
    "executor": { "address": "0x...", "lastAction": "yield_park" }
  }
}
```

---

### `get_signals`

Returns the Strategist's latest alpha scan — top token pick, composite score, and signal breakdown.

**No parameters.**

**Returns:**
```json
{
  "topToken": "OKB",
  "contractAddress": "0x...",
  "compositeScore": 0.74,
  "recommendation": "buy",
  "signals": {
    "smartMoney": { "score": 0.8, "whaleActivity": true },
    "momentum": { "score": 0.7, "trend": "up" },
    "security": { "score": 0.9, "flags": [] }
  },
  "scannedAt": "2026-04-07T04:00:00Z"
}
```

---

### `get_economy`

Returns the full x402 payment history — per-agent totals, cumulative fees, and individual payment events.

**No parameters.**

**Returns:**
```json
{
  "totalCycles": 48,
  "totalX402PaidUsdc": "0.144",
  "perAgent": {
    "strategist": "0.048",
    "sentinel": "0.032",
    "executor": "0.064"
  },
  "recentPayments": [
    { "from": "curator", "to": "strategist", "amount": "0.001", "txHash": "0x...", "cycleId": "..." }
  ]
}
```

---

### `get_positions`

Returns open token positions, the active Aave V3 yield position, and P&L per position.

**No parameters.**

**Returns:**
```json
{
  "openPositions": [
    {
      "token": "OKB",
      "entryPrice": "55.20",
      "sizeUsdc": "1.00",
      "entryTxHash": "0x...",
      "enteredAt": "2026-04-07T02:00:00Z",
      "pnlPct": 3.2,
      "status": "open"
    }
  ],
  "yieldPosition": {
    "platform": "Aave V3",
    "amountUsdc": "7.50",
    "apy": "4.2%"
  }
}
```

---

### `get_cycle_history`

Returns the last N cycle logs including Claude's reasoning, Sentinel verdict, and all txHashes.

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `n` | number | 5 | Number of cycles to return (max 50) |

**Returns:**
```json
{
  "cycles": [
    {
      "id": "uuid",
      "timestamp": "2026-04-07T04:00:00Z",
      "action": "yield_park",
      "strategistFinding": "No high-conviction signal — parking in Aave V3",
      "sentinelVerdict": null,
      "executorAction": "Deposited 7.50 USDC into Aave V3 (txHash: 0x...)",
      "reasoning": "Smart money signals weak. Momentum below threshold. Yield APY 4.2% better than idle.",
      "x402Paid": [{ "to": "strategist", "amount": "0.001" }],
      "txHashes": ["0x..."]
    }
  ]
}
```

---

### `run_cycle`

Triggers a manual cycle immediately (bypasses the 30-min interval timer).

**No parameters.**

**Returns:**
```json
{
  "triggered": true,
  "cycleId": "uuid",
  "message": "Cycle started"
}
```

> **Note:** Will refuse if circuit breaker is tripped (`halted: true`). Check `get_system_status` first.

---

## REST API

The Helios agent runtime also exposes a full REST API:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `GET` | `/api/status` | Swarm state + circuit breaker |
| `GET` | `/api/economy` | x402 payment history |
| `GET` | `/api/positions` | Open positions + yield |
| `GET` | `/api/logs?n=5` | Last N cycle logs |
| `GET` | `/api/agents` | All 4 agents + wallet balances |
| `POST` | `/api/cycle` | Trigger manual cycle |
| `GET` | `/api/sse` | Server-Sent Events (live state) |
| `GET` | `/agents/strategist/scan` | x402-gated: alpha scan |
| `GET` | `/agents/sentinel/assess` | x402-gated: risk assessment |
| `POST` | `/agents/executor/deploy` | x402-gated: trade execution |

---

## CLI

Install and run commands against a live Helios instance:

```bash
# From repo root
bun run packages/cli/src/index.ts <command>
```

| Command | Description |
|---------|-------------|
| `status` | Swarm state, circuit breaker, last cycle |
| `cycle` | Trigger a manual cycle |
| `economy` | x402 payment history + per-agent totals |
| `positions` | Open positions + yield position + P&L |
| `logs [n]` | Last N cycle logs (default 5) |
| `agents` | All 4 agents, addresses, balances |
| `setup` | First-run setup wizard |

Pass `--json` to any command for raw JSON output.

---

## Quick Example

```bash
# Check if the system is alive and not halted
bun run packages/cli/src/index.ts status

# Watch live state in the dashboard
open https://heliosfi.xyz

# Trigger a cycle manually
bun run packages/cli/src/index.ts cycle

# Read last 10 cycle logs with reasoning
bun run packages/cli/src/index.ts logs 10
```

---

## Running Helios

```bash
# Prerequisites: fill in .env (see .env.example)
cp .env.example apps/agents/.env

# Start agent runtime (port 3001)
cd apps/agents && bun dev

# Start war room dashboard (port 3000)
cd apps/web && bun dev
```

**Environment variables required:**

| Variable | Description |
|----------|-------------|
| `OKX_PROJECT_ID` | OKX OnchainOS project ID |
| `OKX_API_KEY` | OKX API key |
| `OKX_SECRET_KEY` | OKX API secret |
| `OKX_PASSPHRASE` | OKX API passphrase |
| `CURATOR_ACCOUNT_ID` | OKX TEE Agentic Wallet ID for Curator |
| `STRATEGIST_ACCOUNT_ID` | OKX TEE Agentic Wallet ID for Strategist |
| `SENTINEL_ACCOUNT_ID` | OKX TEE Agentic Wallet ID for Sentinel |
| `EXECUTOR_ACCOUNT_ID` | OKX TEE Agentic Wallet ID for Executor |
| `ANTHROPIC_API_KEY` | Claude API key (powers all 4 agents) |
| `HELIOS_REGISTRY_ADDRESS` | Deployed HeliosRegistry.sol address on X Layer |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |

See `.env.example` for the full list.

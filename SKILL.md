---
name: helios
version: 1.0.0
description: Query and control the Helios multi-agent DeFi economy on X Layer. Use when you need to check swarm state, read cycle logs, inspect open positions, view x402 payment history, trigger a manual cycle, or get alpha signals from the running Strategist agent.
homepage: https://heliosfi.xyz
docs: https://github.com/helioslabs-ai/helios
metadata: {"api_base": "https://api.heliosfi.xyz", "chain": "X Layer (chainId 196)", "mcp_server": "packages/mcp/src/index.ts"}
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

A `.mcp.json` is included at the repo root pointing to the live production API — no local setup required:

```bash
# Connect to live Helios (production)
cp .mcp.json .mcp.json   # already done — just open Claude Code in the repo root

# Or connect to a local instance
```

```json
{
  "mcpServers": {
    "helios": {
      "command": "bun",
      "args": ["run", "packages/mcp/src/index.ts"],
      "env": {
        "HELIOS_API_URL": "https://api.heliosfi.xyz"
      }
    }
  }
}
```

**Local instance:** set `HELIOS_API_URL=http://localhost:3001` and run `cd apps/agents && bun dev` first.

---

## MCP Tools (8)

### `get_system_status`

Returns the full swarm state: current state machine phase, circuit breaker status, last cycle summary, consecutive failures.

**No parameters.**

**Returns:**
```json
{
  "swarmState": "IDLE",
  "circuitBreaker": { "halted": false, "consecutiveFailures": 0, "reason": null },
  "lastCycleAt": "2026-04-12T03:00:00Z",
  "totalCycles": 48
}
```

---

### `get_signals`

Returns the latest Strategist alpha scan — most recent cycle reasoning, action taken (buy / yield_park / no_alpha), and Sentinel verdict. Pass `n` to get multiple recent cycles.

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `n` | number | 1 | Number of recent cycles to return |

**Returns:**
```json
{
  "cycles": [
    {
      "id": "uuid",
      "ts": "2026-04-12T03:00:00Z",
      "action": "yield_park",
      "reasoning": "Smart money signals weak. Parking in Aave V3.",
      "sentinelVerdict": null,
      "txHashes": ["0x..."]
    }
  ],
  "count": 48
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

### `get_agents`

Returns all 4 Helios agents with wallet addresses and OKX account IDs.

**No parameters.**

**Returns:**
```json
{
  "agents": [
    { "name": "curator", "address": "0x075a...", "accountId": "..." },
    { "name": "strategist", "address": "0x473...", "accountId": "..." },
    { "name": "sentinel", "address": "0x31a0...", "accountId": "..." },
    { "name": "executor", "address": "0x258e...", "accountId": "..." }
  ]
}
```

---

### `get_registry`

Returns the live leaderboard — all active swarms ranked by return%, with PnL, trade count, cycle count, and status.

**No parameters.**

**Returns:**
```json
{
  "swarms": [
    {
      "swarmName": "helios-genesis",
      "model": "gpt-4o",
      "curatorAddress": "0x075a...",
      "returnPct": "2.4",
      "pnlUsdc": "0.24",
      "tradeCount": 12,
      "cycleCount": 48,
      "status": "active"
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
{ "status": "triggered", "cycleId": "uuid" }
```

> **Note:** Returns `{ status: "halted" }` if circuit breaker is tripped. Check `get_system_status` first.

---

## MCP Resources (4)

Direct resource reads — usable via `resources/read` in any MCP client:

| URI | Description |
|-----|-------------|
| `helios://status` | Current swarm state + circuit breaker |
| `helios://economy` | x402 payment history + per-agent totals |
| `helios://positions` | Open positions + yield position + P&L |
| `helios://agents` | All 4 agents with wallet addresses |

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
| `setup` | First-run setup wizard → name, strategy, guardrails, keys → 4 TEE wallets |
| `seed` | Show wallet addresses and funding amounts |
| `start` | Start the cycle loop and register on leaderboard |
| `stop` | Halt the swarm |
| `strategy` | Update strategy prompt (no restart needed) |
| `guardrails` | Update Max Trade Size / Max Total Loss / Interval (no restart needed) |
| `status` | Swarm state, circuit breaker, last cycle |
| `cycle` | Trigger a manual cycle |
| `economy` | x402 payment history + per-agent totals |
| `positions` | Open positions + yield position + P&L |
| `logs [n]` | Last N cycle logs (default 5) |
| `agents` | All 4 agents, addresses, balances |

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
cd apps/dashboard && bun dev
```

**Environment variables required:**

| Variable | Description |
|----------|-------------|
| `OKX_API_KEY` | OKX API key |
| `OKX_SECRET_KEY` | OKX API secret |
| `OKX_PASSPHRASE` | OKX API passphrase |
| `CURATOR_WALLET_ADDRESS` | OKX TEE wallet address for Curator |
| `STRATEGIST_WALLET_ADDRESS` | OKX TEE wallet address for Strategist |
| `SENTINEL_WALLET_ADDRESS` | OKX TEE wallet address for Sentinel |
| `EXECUTOR_WALLET_ADDRESS` | OKX TEE wallet address for Executor |
| `OPENAI_API_KEY` | OpenAI API key (powers all 4 agents via gpt-4o) |
| `UNISWAP_API_KEY` | Uniswap Trading API key (route comparison) |
| `HELIOS_REGISTRY_ADDRESS` | Deployed HeliosRegistry.sol address on X Layer |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `HELIOS_API_URL` | Override API base URL (default: `https://api.heliosfi.xyz`) |

See `.env.example` for the full list.

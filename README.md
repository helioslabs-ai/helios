<p align="center">
  <img src="dashboard/public/helios.svg" width="80" />
</p>

<h1 align="center">Helios</h1>

<p align="center">
  <strong>Self-Sustaining Multi-Agent DeFi Economy.</strong><br/>
 An autonomous DeFi portfolio manager where capital never stops working. Four sovereign AI agents, each with its own wallet and on-chain identity, continuously find yield, execute trades, harvest returns, and compound profits on X Layer — paying one another via x402 micropayments in a self-sustaining on-chain economy. No humans in the loop.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live-10B981?style=flat-square" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/X_Layer-chainId_196-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/OnchainOS_Skills-14%2F14-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />
</p>

---

## The Problem

DeFi capital sits idle. Most "autonomous" trading systems are single-agent scripts with hardcoded strategies — they trade OR yield, never both. When there's no signal, capital earns nothing. When a trade fails, the system halts. No onchain proof of work. No self-funding. No real autonomy.

## The Solution

Helios deploys four sovereign AI agents — each with its own OKX TEE Agentic Wallet, its own onchain identity, and its own revenue stream. They coordinate via x402 micropayments: Curator pays Strategist for every alpha scan, Sentinel for every risk assessment, Executor for every deployment. The yields Helios earns and the profits it compounds pay those fees.

**Capital never sits idle.** When Strategist finds no trade worth making, Executor parks USDC in Aave V3 automatically. When yield accrues, it harvests. When a signal clears Sentinel's risk gate, capital rotates from yield into the trade — then back again on exit. Every 30-minute cycle generates at minimum one x402 payment and one onchain proof of work.

## Project Positioning

|               | Helios                           | Single-agent bots | Signal-only systems |
| ------------- | -------------------------------- | ----------------- | ------------------- |
| Idle capital  | Earns yield (Aave V3)            | Sits idle         | N/A                 |
| Dead cycles   | None — scan fee + deposit always | Common            | N/A                 |
| Onchain proof | Every cycle, every payment       | Rarely            | Never               |
| Agent economy | 4 agents, 4 wallets, x402 mesh   | 1 agent           | 0 agents            |
| Self-funding  | Yes — yields cover all fees      | No                | No                  |

---

## How It Works

### System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      X LAYER (chainId 196)                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  HELIOS RUNTIME (Railway)                  │  │
│  │                                                            │  │
│  │       ┌──────────────────────────────────────────┐        │  │
│  │       │              CURATOR AGENT               │        │  │
│  │       │         (cycle loop orchestrator)        │        │  │
│  │       └──────┬─────────────┬──────────┬──────────┘        │  │
│  │              │ x402        │ x402     │ x402               │  │
│  │              ▼             ▼          ▼                    │  │
│  │       ┌────────────┐ ┌──────────┐ ┌──────────┐            │  │
│  │       │ STRATEGIST │ │ SENTINEL │ │ EXECUTOR │            │  │
│  │       │ Alpha scan │ │ Risk gate│ │Trade exec│            │  │
│  │       └────────────┘ └──────────┘ └──────────┘            │  │
│  │              │             │           │                   │  │
│  │       ┌──────▼─────────────▼───────────▼──────────┐       │  │
│  │       │   OKX OnchainOS APIs (14 skills)           │       │  │
│  │       │   Signal · Security · DEX · DeFi · Wallet  │       │  │
│  │       └────────────────────────────────────────────┘       │  │
│  │                                                            │  │
│  │  Supabase: cycles · positions · payments · logs            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  HeliosRegistry.sol  (onchain cycle audit log)                   │
└──────────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────┐
│    WAR ROOM DASHBOARD (Vercel)   │
│  Next.js 16 · SSE · Recharts     │
│  heliosfi.xyz                    │
└──────────────────────────────────┘
```

### Agent Swarm

| Agent          | Wallet        | Role                                                               | OKX Skills                                                                                   | Earns                 |
| -------------- | ------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | --------------------- |
| **Curator**    | TEE wallet #1 | Orchestrates cycles, pays agents, manages circuit breaker          | okx-agentic-wallet, okx-defi-portfolio, okx-wallet-portfolio, okx-audit-log                  | —                     |
| **Strategist** | TEE wallet #2 | Scans yield + trading signals, returns best opportunity            | okx-dex-signal, okx-dex-token, okx-dex-market, okx-dex-trenches, okx-dex-ws, okx-defi-invest | 0.001 USDG/scan       |
| **Sentinel**   | TEE wallet #3 | Risk-scores opportunities, re-evaluates open positions every cycle | okx-security, okx-dex-token                                                                  | 0.001 USDG/assessment |
| **Executor**   | TEE wallet #4 | Executes swaps, parks yield in Aave V3, settles x402 payments      | okx-dex-swap, okx-onchain-gateway, okx-x402-payment                                          | 0.001 USDG/deploy     |

### Economy Loop

Every cycle (60min days 1–3, 30min thereafter):

```
Curator triggers cycle
  → Strategist scans: yield opportunities + trading signals  (x402 paid always)
  → If trade signal → Sentinel risk-scores                   (x402 paid)
      → CLEAR → Executor deploys trade on X Layer            (x402 paid)
      → BLOCK  → Executor parks USDC in Aave V3
  → If no alpha → Executor parks USDC in Aave V3
  → HeliosRegistry.logCycle() → onchain proof
  → Cycle status → Supabase → SSE → dashboard
```

**No dead cycles.** Every cycle: at minimum 1 x402 payment + 1 Aave deposit. The economy always ticks.

### Position Lifecycle

```
Entry:
  Strategist finds signal → compositeScore ≥ threshold
  Sentinel returns CLEAR → riskScore ≥ 75
  Executor swaps USDC → token via OKX DEX
  Position logged → entryPrice, sizeUsdc, entryTxHash

Held positions (re-evaluated every cycle):
  Sentinel re-scores the token
  If BLOCK → Executor sells immediately

Exit conditions (priority order):
  1. Sentinel BLOCK        → immediate sell
  2. +20% take-profit      → full exit
  3. 72h time stop         → auto-exit regardless of P&L
  4. Circuit breaker trips  → emergency exit all positions

Post-exit:
  USDC returned to Executor wallet
  Profit compounds via Curator → Aave V3 yield park
```

**Position sizing:** Half-Kelly with conservative defaults until ≥5 trades calibrate it. Hard caps: max 20% of Executor wallet, absolute cap $1.00, minimum $0.25.

---

## Deployments

| Contract / Agent   | Address | Network       |
| ------------------ | ------- | ------------- |
| HeliosRegistry.sol |         | X Layer (196) |
| Curator wallet     |         | X Layer (196) |
| Strategist wallet  |         | X Layer (196) |
| Sentinel wallet    |         | X Layer (196) |
| Executor wallet    |         | X Layer (196) |

---

## OnchainOS & Uniswap Skill Usage

All 14 OKX OnchainOS skills are used across the four agents. No skill is unused.

| API / Skill             | Agent                 | Purpose                                                              |
| ----------------------- | --------------------- | -------------------------------------------------------------------- |
| `okx-dex-signal`        | Strategist            | Smart money / whale signals on X Layer                               |
| `okx-dex-token`         | Strategist + Sentinel | Trending tokens, holder concentration, liquidity depth               |
| `okx-dex-market`        | Strategist            | Price context, entry timing, volume                                  |
| `okx-dex-trenches`      | Strategist            | New launch discovery                                                 |
| `okx-dex-ws`            | Strategist            | Live price feed                                                      |
| `okx-defi-invest`       | Strategist + Executor | Enter / top up Aave V3 yield positions                               |
| `okx-defi-portfolio`    | Curator + Strategist  | Monitor open yield positions, check harvest readiness                |
| `okx-security`          | Sentinel              | Pre-execution token security scan — honeypot, holder risk            |
| `okx-dex-swap`          | Executor              | USDC → target token swaps via OKX DEX Aggregator                     |
| `okx-onchain-gateway`   | Executor              | Gas estimate → simulate → broadcast to X Layer                       |
| `okx-wallet-portfolio`  | Curator               | All 4 agent wallet balances                                          |
| `okx-agentic-wallet`    | Curator               | OKX TEE wallet management                                            |
| `okx-x402-payment`      | Curator               | Inter-agent fee settlement (EIP-3009 USDG)                           |
| `okx-audit-log`         | Curator               | Full decision trail export                                           |
| **Uniswap Trading API** | Strategist            | Swap quote comparison — picks best route between OKX DEX and Uniswap |

---

## Working Mechanics

**State machine** — Curator owns master state. Invalid transitions throw and halt cleanly:

```
IDLE → STRATEGIST_SCAN → SENTINEL_CHECK → EXECUTOR_DEPLOY → COMPOUNDING → IDLE
                ↓ (no alpha found)
          YIELD_PARK → IDLE
```

**Circuit breaker** — halts on 3 consecutive deploy failures, 15% daily drawdown, or $2 session loss. On halt: all USDC parks in Aave V3, cycles stop until manual reset or UTC midnight auto-recovery.

**x402 payments** — Curator calls OKX REST APIs directly (`/x402/verify` + `/x402/settle`) via EIP-3009 USDG. No user confirmation gate — fully automated in the loop.

**Watchdog** — `watchdog.ts` runs every 30min. Checks process health, API liveness (`/health`), and cycle staleness (>2h = hung). Restarts automatically.

**Onchain audit** — `HeliosRegistry.sol` on X Layer logs every cycle (agent, action, txHashes, timestamp). `okx-audit-log` exports the full decision trail.

---

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- [Foundry](https://getfoundry.sh) (`foundryup`)
- OKX account with API key (OnchainOS access)
- OKX Agentic Wallet × 4 (one per agent role)
- Anthropic API key
- Supabase project

### Installation

```bash
git clone https://github.com/lucent-labs/helios
cd helios-buildx
bun install

cp .env.example apps/agents/.env
# Fill in: OKX credentials, 4 wallet IDs, Anthropic key, Supabase

# Create agent wallets
onchainos wallet create --name curator
onchainos wallet create --name strategist
onchainos wallet create --name sentinel
onchainos wallet create --name executor

# Deploy HeliosRegistry to X Layer
cd contracts
forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC_URL --broadcast
# Add HELIOS_REGISTRY_ADDRESS to .env
```

### Running the Agent

```bash
cd apps/agents
bun dev       # dev (hot reload) — port 3001
bun start     # production

# CLI
bun run packages/cli/src/index.ts status

# MCP (connect Claude Code to running instance)
cp .mcp.json.example .mcp.json
```

### Running the Dashboard

```bash
cd apps/web
bun dev       # port 3000
bun build     # production build
```

---

## Project Structure

```
helios-buildx/
├── apps/
│   ├── web/                  # Next.js 16 war room dashboard (Vercel)
│   └── agents/               # Bun agent runtime (Railway)
│       ├── src/
│       │   ├── agents/       # curator.ts · strategist.ts · sentinel.ts · executor.ts
│       │   ├── tools/        # 14 OKX OnchainOS tool wrappers + uniswap-trading-api.ts
│       │   ├── prompts/      # per-agent system prompts + budget context builders
│       │   ├── routes/       # x402-gated Hono routes + REST API
│       │   ├── ai/           # Anthropic AI SDK setup
│       │   ├── memory/       # CycleContext builder (reads jsonl logs)
│       │   ├── wallet/       # OKX wallet client
│       │   ├── data/         # state.json · positions.json · cycle_log.jsonl
│       │   ├── state.ts      # state machine + circuit breaker
│       │   ├── app.ts        # Hono app
│       │   ├── index.ts      # entry — Curator loop + Hono server
│       │   └── types.ts      # shared types
│       └── watchdog.ts       # process monitor
├── contracts/                # Foundry — HeliosRegistry.sol
├── packages/
│   ├── shared/               # payments.ts · guardrails.ts · sizing.ts · chains.ts
│   ├── cli/                  # helios CLI (8 commands)
│   └── mcp/                  # stdio MCP server (6 tools)
├── SKILL.md                  # Installable skill definition
├── .mcp.json.example         # MCP config template
└── .env.example
```

---

## Tech Stack

| Layer          | Tech                                              |
| -------------- | ------------------------------------------------- |
| Agent runtime  | Bun — single process, state-machine-driven        |
| Backend API    | Hono on Bun — SSE, x402 routes, REST API          |
| Frontend       | Next.js 16, Tailwind v4, shadcn/ui, Recharts      |
| Smart contract | Solidity + Foundry → X Layer (chainId 196)        |
| Database       | Supabase + Drizzle ORM                            |
| Wallets        | OKX TEE Agentic Wallet × 4 (one per agent)        |
| Payments       | OKX x402 REST APIs (EIP-3009 USDG)                |
| Blockchain     | X Layer (chainId 196), viem                       |
| AI Reasoning   | claude-sonnet-4-6 via AI SDK — ReAct tool calling |
| MCP Server     | Custom stdio MCP (`packages/mcp/`)                |
| DEX            | OKX DEX Aggregator + Uniswap Trading API          |

---

## API Endpoints

| Method | Path                      | Description                              |
| ------ | ------------------------- | ---------------------------------------- |
| GET    | `/health`                 | Liveness check                           |
| GET    | `/api/status`             | Swarm state, last cycle, circuit breaker |
| GET    | `/api/economy`            | x402 payment history, per-agent totals   |
| GET    | `/api/positions`          | Open positions + yield position + P&L    |
| GET    | `/api/logs?n=5`           | Last N cycle logs with AI reasoning      |
| GET    | `/api/agents`             | All 4 agents, addresses, balances        |
| POST   | `/api/cycle`              | Trigger one manual cycle                 |
| GET    | `/api/sse`                | Server-Sent Events stream (live state)   |
| GET    | `/agents/strategist/scan` | x402-gated: alpha scan                   |
| GET    | `/agents/sentinel/assess` | x402-gated: risk assessment              |
| POST   | `/agents/executor/deploy` | x402-gated: trade execution              |

---

## Team Lucent Labs

### Member

**Samuel Danso** — me.samueldanso@gmail.com

---

## License

[MIT](LICENSE)

---

<p align="center">
  <strong>Built for the <a href="https://web3.okx.com/xlayer/build-x-hackathon">OKX Build X Hackathon — Season 2</a> on <a href="https://web3.okx.com/xlayer">X Layer</a></strong><br/>
  with <a href="https://web3.okx.com/onchainos">OKX OnchainOS</a> and Uniswap skills
</p>

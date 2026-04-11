<p align="center">
  <img src="dashboard/public/helios-icon.svg" width="80" />
</p>

<h1 align="center">Helios</h1>

<p align="center">
  <strong>A sovereign, self-sustaining multi-agent DeFi economy — where capital never stops working.</strong><br/>
  Four AI agents — each with its own OKX TEE Agentic Wallet and onchain identity — continuously find yield, execute trades, monitor risk, and compound profits, coordinating via x402 micropayments. No human in the loop. Every cycle is proven onchain.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live-10B981?style=flat-square" />
  <img src="https://img.shields.io/badge/X_Layer-chainId_196-000000?style=flat-square&logoColor=white" />
  <img src="https://img.shields.io/badge/OKX_OnchainOS-000000?style=flat-square&logoColor=white" />
  <img src="https://img.shields.io/badge/x402-Protocol-6366F1?style=flat-square" />
  <img src="https://img.shields.io/badge/Uniswap_v3-FF007A?style=flat-square" />
  <img src="https://img.shields.io/badge/Aave_v3-B6509E?style=flat-square" />
  <img src="https://img.shields.io/badge/OnchainOS_Skills-14%2F14-ADFF2F?style=flat-square&logoColor=000000" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />
</p>

<p align="center">
  <a href="https://heliosfi.xyz/dashboard"><strong>Live Demo</strong></a> ·
  <a href="https://www.oklink.com/xlayer/address/0x258e3035242a05b53ca82c5dffeaeadee2af0d2c"><strong>Primary Agent Wallet</strong></a> ·
  <a href="https://www.oklink.com/xlayer/address/0x5b5F83A465EF625B7d2E6a26c848517fD31D0bb3"><strong>HeliosRegistry Contract</strong></a> ·
   <a href="https://github.com/helioslabs-ai/helios/tree/main/docs"><Docs</strong></a> ·
      <a href="https://heliosfi.xyz/skill.md"><SKILL.md</strong></a> ·
</p>

---

## Overview

DeFi capital on X Layer sits idle most of the time. Yield opportunities change, signals appear and disappear, and managing positions requires constant 24/7 attention and execution no human can sustain.

Helios automates the full workflow. Four specialized AI agents continuously find yield, execute trades, gate risk, and compound profits — funded by their own onchain earnings. After initial seed funding, the system sustains itself. Every agent payment is a real USDG transfer on X Layer. Every cycle produces a txHash. Capital on autopilot.

---

## Key Features

**Autonomous Capital Allocation** — Strategist continuously finds the best yield across Aave V3 and X Layer. When no trade signal clears the risk gate, Executor parks idle capital automatically. Capital never sits idle.

**Continuous Risk Monitoring** — Sentinel risk-scores every opportunity before execution and re-evaluates every open position each cycle. Positions exit automatically when risk increases. Circuit breakers enforce hard limits.

**Signal-Driven Trade Execution** — When Strategist surfaces a high-conviction signal, Executor rotates capital into a directional trade via Uniswap Trading API and OKX DEX. On exit, capital flows back to yield.

**Self-Sustaining Agent Economy** — Curator pays Strategist, Sentinel, and Executor for every service via x402 USDG micropayments. Every cycle produces onchain payment proof. The economy is the audit trail.

**Sovereign Multi-Agent Architecture** — Four specialized agents, four independent OKX TEE Agentic Wallets, four independent onchain identities. No shared custody. No human approval layer.

**Full Observability** — Dashboard, CLI, MCP server, and SKILL.md provide complete visibility into swarm state, cycle reasoning, positions, and the agent economy.

**Open & Deployable** — Deploy your own swarm with custom strategies and guardrails. All active swarms compete on a live public leaderboard.

---

## How It Works

### Multi-Agent Architecture

```
┌──────────────────────────────────────────────┐
│              HELIOS CURATOR                  │
│         Orchestrator — 30-min cycles         │
└──────────┬───────────┬────────────┬──────────┘
           │ x402      │ x402       │ x402
           ▼           ▼            ▼
 ┌──────────────┐ ┌──────────┐ ┌──────────────┐
 │  STRATEGIST  │ │ SENTINEL │ │   EXECUTOR   │
 └──────────────┘ └──────────┘ └──────────────┘
  Alpha + yield    Risk gate    Trade + yield
  hunting                       execution
           │           │            │
           └───────────┴────────────┘
                       │
      ┌────────────────▼─────────────────┐
      │     OKX OnchainOS APIs (14)      │
      │  Signal · Security · DEX · DeFi  │
      │       Wallet · Gateway · x402    │
      └────────────────┬─────────────────┘
                       │
      ┌────────────────▼─────────────────┐
      │    HeliosRegistry.sol (X Layer)  │
      │     Cycle logs · Leaderboard     │
      └────────────────┬─────────────────┘
                       │
      ┌────────────────▼─────────────────┐
      │           DASHBOARD              │
      │  War room · Leaderboard · SSE    │
      └──────────────────────────────────┘
```

### x402 Payment Flow

```
Every cycle — Curator settles agent fees via EIP-3009 USDG on X Layer:

  Curator ──GET /strategist/scan──▶ Strategist
          ◀── 402 Payment Required ─
          ── TEE sign EIP-3009 ────▶
          ── /x402/verify+settle ──▶ OKX Facilitator
          ◀── { txHash: "0x..." } ──
          ◀── 200 { signal, score } (0.001 USDG settled)

  ── if signal found ──────────────────────────────────────
  Curator ──GET /sentinel/assess──▶ Sentinel
          ◀── 402 ─── TEE sign ───▶ /x402/verify+settle
          ◀── 200 { verdict: CLEAR } (0.001 USDG settled)

  ── if CLEAR ─────────────────────────────────────────────
  Curator ──POST /executor/deploy─▶ Executor
          ◀── 402 ─── TEE sign ───▶ /x402/verify+settle
          ◀── 200 { tradeTxHash }   (0.001 USDG settled)

  ── no-alpha branch ──────────────────────────────────────
  Strategist always paid — even when scan finds nothing.
  Sentinel + Executor skipped. Capital parks in Aave V3.

  Every settlement → txHash logged to HeliosRegistry.sol + economy_log
  No user confirmation gate. Fully automated in the cycle loop.
```

### Economy Loop

#### Agent State Machine

```
IDLE → STRATEGIST_SCAN → SENTINEL_CHECK → EXECUTOR_DEPLOY → COMPOUNDING → IDLE
                ↓ (no alpha)
          YIELD_PARK → IDLE
```

```
Curator triggers cycle (every 30 min)
  → Strategist scans X Layer
      okx-dex-signal + okx-dex-trenches  → smart money / whale signals
      okx-defi-invest                    → Aave V3 yield opportunities
      okx-dex-market + uniswap-trading   → price context + route comparison
  → Curator pays Strategist ~0.001 USDG via x402 — always, every cycle

  → If trade signal found:
      Sentinel risk-scores via okx-security + okx-dex-token
      Curator pays Sentinel ~0.001 USDG via x402

      CLEAR → Executor swaps via okx-dex-swap + okx-onchain-gateway
               Curator pays Executor ~0.001 USDG via x402
      BLOCK → Executor parks idle USDC in Aave V3

  → If no signal: Executor parks USDC in Aave V3 yield

  → Exit management (runs every cycle):
      +20% take-profit  → auto-exit
      72h time stop     → auto-exit
      3 consecutive failures, 15% drawdown, or $2 session loss → circuit breaker halt
      On halt: USDC parks in Aave V3, cycles stop until manual reset or UTC midnight auto-recovery

  → Watchdog runs every 30min — checks process health, API liveness, cycle staleness (>2h = hung), auto-restarts

  → HeliosRegistry.sol logs cycle onchain
  → Leaderboard + dashboard updated via SSE
```

#### Position Lifecycle

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

## OnchainOS & Uniswap Skill Usage

All 14 OKX OnchainOS skills are used across the four agents. No skill is unused.

| Agent          | OnchainOS Skills                                                                             | Purpose                                                                   |
| -------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Curator**    | okx-agentic-wallet, okx-defi-portfolio, okx-wallet-portfolio, okx-audit-log                  | Orchestrate cycles, compound profits, pay agents, register on leaderboard |
| **Strategist** | okx-dex-signal, okx-dex-token, okx-dex-market, okx-dex-trenches, okx-dex-ws, okx-defi-invest | Hunt alpha + yield opportunities                                          |
| **Sentinel**   | okx-security, okx-dex-token                                                                  | Risk-score every opportunity before execution                             |
| **Executor**   | okx-dex-swap, okx-onchain-gateway, okx-x402-payment                                          | Execute swaps, DeFi deposits, x402 settlements                            |

**Uniswap:** Strategist queries the Uniswap Trading API alongside OKX DEX for cross-DEX route comparison on every scan.

---

## Onchain Deployments

### Agent Wallets

Four independent OKX TEE Agentic Wallets — each agent has its own sovereign onchain identity.

**Primary swarm wallet (Executor):** [`0x258e3035242a05b53ca82c5dffeaeadee2af0d2c`](https://www.oklink.com/xlayer/address/0x258e3035242a05b53ca82c5dffeaeadee2af0d2c) — this is where all trades and DeFi deposits execute. Check here for live onchain activity.

| Agent      | Address                                                                                                                        | Registration Tx                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Executor   | [0x258e3035242a05b53ca82c5dffeaeadee2af0d2c](https://www.oklink.com/xlayer/address/0x258e3035242a05b53ca82c5dffeaeadee2af0d2c) | [0x780a0b61eb12cc15f7bed3348c05f17c1509c6f3a78a04500bb3d2b55fdc58f4](https://www.oklink.com/xlayer/tx/0x780a0b61eb12cc15f7bed3348c05f17c1509c6f3a78a04500bb3d2b55fdc58f4) |
| Curator    | [0x075a7b84336ed268df32a76f2a2c7c119ba5480c](https://www.oklink.com/xlayer/address/0x075a7b84336ed268df32a76f2a2c7c119ba5480c) | [0x66ca90d6af7f94cc96bd8d1fdc581e876c218cc639d3c17db913b860415f7f1e](https://www.oklink.com/xlayer/tx/0x66ca90d6af7f94cc96bd8d1fdc581e876c218cc639d3c17db913b860415f7f1e) |
| Strategist | [0x473308cf1778c6c717116f48ebd18e419013277d](https://www.oklink.com/xlayer/address/0x473308cf1778c6c717116f48ebd18e419013277d) | [0xb3ce2c669be28f4812fdb24b8fd3cd8f8857e2820735aa602b7bc03f21a07048](https://www.oklink.com/xlayer/tx/0xb3ce2c669be28f4812fdb24b8fd3cd8f8857e2820735aa602b7bc03f21a07048) |
| Sentinel   | [0x31a0b567118235daa01490d1c751128d3874254f](https://www.oklink.com/xlayer/address/0x31a0b567118235daa01490d1c751128d3874254f) | [0xe3f2d07567b25be09d2ce827ecc9cd081d53d8dc2b2ced90713df148da4b041d](https://www.oklink.com/xlayer/tx/0xe3f2d07567b25be09d2ce827ecc9cd081d53d8dc2b2ced90713df148da4b041d) |

### Contracts

| Contract           | Address                                      | Network       | Explorer                                                                                     |
| ------------------ | -------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| HeliosRegistry.sol | `0x5b5F83A465EF625B7d2E6a26c848517fD31D0bb3` | X Layer (196) | [OKLink ↗](https://www.oklink.com/xlayer/address/0x5b5F83A465EF625B7d2E6a26c848517fD31D0bb3) |

---

## Quickstart

### Setup & Activate Agents (CLI)

```bash
# 1. Clone and install
git clone github.com/helioslabs-ai/helios
cd helios && bun install

# 2. Setup
helios setup        # wizard → name, strategy, guardrails, keys → 4 TEE wallets created

# 3. Fund your wallets
helios seed         # shows exact wallet addresses + amounts to send

# 4. Start your swarm
helios start        # registers on leaderboard, begins 30-min cycle loop

# 5. Monitor
open https://heliosfi.xyz/dashboard
helios status       # current state, last cycle, circuit breaker
helios logs 10      # last N cycle logs with AI reasoning
```

**Get your OKX API key:** web3.okx.com/onchainos/dev-portal → create project → copy API Key, Secret, Passphrase.

**All CLI commands:**

```bash
helios setup        # wizard → name, strategy, guardrails, keys, wallets
helios seed         # show wallet addresses + funding amounts
helios start        # start cycle loop + register on leaderboard
helios stop         # halt the swarm
helios strategy     # update strategy prompt anytime (no restart needed)
helios guardrails   # update Max Trade Size, Max Total Loss, Interval (no restart needed)
helios status       # current state, last cycle, circuit breaker
helios cycle        # trigger one manual cycle
helios logs [n]     # last N cycle logs with AI reasoning (default 5)
helios agents       # all 4 agents, addresses, balances
helios economy      # x402 payment history + per-agent totals
helios positions    # open trades + yield position + P&L
```

Pass `--json` to any command for raw JSON output.

### Connect via MCP

Works with Claude Code, Cursor, and any MCP-compatible agent.

```json
{
	"mcpServers": {
		"helios": {
			"command": "bun",
			"args": ["run", "packages/mcp/src/index.ts"],
			"env": { "HELIOS_API_URL": "https://api.heliosfi.xyz" }
		}
	}
}
```

Tools: `get_system_status` · `get_signals` · `get_positions` · `get_economy` · `get_cycle_history` · `run_cycle`

### SKILL.md

Any agent that can read a URL can discover and use Helios — no explicit MCP config needed.

```bash
curl https://heliosfi.xyz/skill.md
```

### REST API

```bash
curl https://api.heliosfi.xyz/api/status       # swarm state + circuit breaker
curl https://api.heliosfi.xyz/api/economy      # x402 payment history, per-agent totals
curl https://api.heliosfi.xyz/api/positions    # open positions + yield position + P&L
curl https://api.heliosfi.xyz/api/logs?n=5     # last N cycle logs with AI reasoning
curl -X POST https://api.heliosfi.xyz/api/cycle  # trigger manual cycle
curl https://api.heliosfi.xyz/api/sse          # live SSE stream
```

---

## Tech Stack

| Layer             | Tech                                                    |
| ----------------- | ------------------------------------------------------- |
| Agent runtime     | Bun — state machine                                     |
| Backend API       | Hono — REST, SSE, x402-gated routes                     |
| Frontend          | Next.js 16, Tailwind v4, shadcn/ui, Recharts            |
| Smart contract    | Solidity + Foundry                                      |
| Wallets           | OKX TEE Agentic Wallet × 4 per swarm                    |
| Payments          | OKX x402 (`/x402/verify` + `/x402/settle`)              |
| Onchain execution | OKX OnchainOS skills (14/14) + Uniswap AI skills        |
| AI                | OpenAI gpt-4o via Vercel AI SDK                         |
| Database          | Supabase + Drizzle ORM                                  |
| Blockchain        | X Layer (chainId 196), viem                             |
| CLI               | Custom Bun CLI — setup, seed, start, stop, status, logs |
| MCP               | Custom stdio MCP server                                 |

---

## Repo Structure

```
helios/
├── apps/
│   ├── dashboard/          # Next.js — landing, leaderboard, war room
│   └── agents/             # Bun agent runtime
│       └── src/
│           ├── agents/     # curator, strategist, sentinel, executor
│           ├── tools/      # OKX OnchainOS skill wrappers (14 files)
│           ├── prompts/    # agent system prompts + cycle context
│           ├── routes/     # Hono: x402-gated + REST + SSE
│           ├── ai/         # AI SDK setup
│           ├── memory/     # rolling cycle context for LLM
│           ├── wallet/     # OKX wallet client
│           ├── registry/   # leaderboard registration + stats posting
│           ├── data/       # runtime files: state.json, positions.json, logs
│           ├── db/         # Supabase client + queries
│           ├── state.ts    # state machine + circuit breaker
│           ├── app.ts      # Hono app
│           └── index.ts    # entry point
├── contracts/              # HeliosRegistry.sol + Foundry
├── packages/
│   ├── shared/             # guardrails, payments, sizing, chains
│   ├── cli/                # helios CLI
│   └── mcp/                # stdio MCP server
├── SKILL.md
└── AGENTS.md
```

---

## Documentation

- Full docs: https://github.com/helioslabs-ai/helios/tree/main/docs

---

## Team

**Samuel Danso** — Founder & Full-Stack AI Engineer
me.samueldanso@gmail.com

---

## License

[MIT](LICENSE)

---

<p><strong>Built for the <a href="https://web3.okx.com/xlayer/build-x-hackathon">OKX Build X Hackathon — Season 2</a></strong></p>

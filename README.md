<p align="center">
  <img src="apps/dashboard/public/helios-icon.svg" width="80" />
</p>

<h1 align="center">Helios</h1>

<p align="center">
  <strong>A sovereign, self-sustaining multi-agent DeFi economy — where capital never stops working.</strong><br/>
  Four specialized AI agents — each with its own OKX TEE Agentic Wallet and onchain identity — autonomously find yield, execute trades, manage risk, and compound capital, coordinating via x402 USDG micropayments. No human in the loop. Every cycle is proven onchain.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live-10B981?style=flat-square" />
  <img src="https://img.shields.io/badge/X_Layer-chainId_196-000000?style=flat-square&logoColor=white" />
  <img src="https://img.shields.io/badge/x402-Protocol-6366F1?style=flat-square" />
  <img src="https://img.shields.io/badge/Uniswap_v3-FF007A?style=flat-square" />
  <img src="https://img.shields.io/badge/Aave_v3-B6509E?style=flat-square" />
  <img src="https://img.shields.io/badge/OnchainOS_Skills-14%2F14-ADFF2F?style=flat-square&logoColor=000000" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />
</p>

<p align="center">
  <a href="https://heliosfi.xyz/dashboard"><strong>Live Demo</strong></a> ·
  <a href="https://www.oklink.com/xlayer/address/0x726cf0c4fe559db9a32396161694c7b88c60c947"><strong>Primary Agent Wallet (Curator)</strong></a> ·
  <a href="https://www.oklink.com/xlayer/address/0xbA74426e9144bf68f986ec239E32a882843487E7"><strong>HeliosRegistry Contract</strong></a> ·
  <a href="https://heliosfi.xyz/skill.md"><strong>SKILL.md</strong></a>
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

**Primary wallet (Curator):** [`0x726cf0c4fe559db9a32396161694c7b88c60c947`](https://www.oklink.com/xlayer/address/0x726cf0c4fe559db9a32396161694c7b88c60c947) — orchestrates every cycle, settles all x402 agent fees, and registers the swarm on the leaderboard.

| Agent      | Role                                      | Address                                                                                                                        | Registration Tx                                                                                                        |
| ---------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Curator    | Orchestrator — cycles, payments, registry | [0x726cf0c4fe559db9a32396161694c7b88c60c947](https://www.oklink.com/xlayer/address/0x726cf0c4fe559db9a32396161694c7b88c60c947) | [0x2da165...8748](https://www.oklink.com/xlayer/tx/0x2da165488f92f48167e443b7208f5949d049476bb54554893aa78dbb24e98748) |
| Strategist | Alpha scanner — paid per scan via x402    | [0x3c69ed447ccd8d515e73dd81e6a0f56edd7623ed](https://www.oklink.com/xlayer/address/0x3c69ed447ccd8d515e73dd81e6a0f56edd7623ed) | [0x873446...7e5d](https://www.oklink.com/xlayer/tx/0x8734468148b51b117857c7bb55cca35f9224c813a9cb787aad4429fa0a297e5d) |
| Sentinel   | Risk gate — paid per assessment via x402  | [0x95923bc7280cc182559f2bc7b368c09448726d4f](https://www.oklink.com/xlayer/address/0x95923bc7280cc182559f2bc7b368c09448726d4f) | [0x85006e...7330](https://www.oklink.com/xlayer/tx/0x85006e74557d47809b373e56032575248841f02492ef1bf02015fd5eb6537330) |
| Executor   | Trade + yield execution — paid per deploy | [0x88a200567d660d88ac0afbe781e9e97b6d570ab6](https://www.oklink.com/xlayer/address/0x88a200567d660d88ac0afbe781e9e97b6d570ab6) | [0x036f45...bfb4](https://www.oklink.com/xlayer/tx/0x036f4544058691495d99e8917774848877db98e02a2d405d6d4fb845ed58bfb4) |

### Contracts

| Contract           | Address                                      | Network       | Explorer                                                                                     |
| ------------------ | -------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| HeliosRegistry.sol | `0xbA74426e9144bf68f986ec239E32a882843487E7` | X Layer (196) | [OKLink ↗](https://www.oklink.com/xlayer/address/0xbA74426e9144bf68f986ec239E32a882843487E7) |

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

Works with Claude Code, Cursor, and any MCP-compatible agent. A `.mcp.json` is included at the repo root — open the repo in Claude Code and it connects automatically.

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

Tools (8): `get_system_status` · `get_signals` · `get_positions` · `get_economy` · `get_cycle_history` · `get_agents` · `get_registry` · `run_cycle`

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
| AI                | OpenAI gpt-4o-mini via Vercel AI SDK                    |
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

## X Layer Ecosystem Positioning

Helios is purpose-built for X Layer and contributes to the ecosystem in four concrete ways:

**1. Native capital deployment on X Layer.**
All trading capital, yield deposits, and agent fees flow through X Layer (chainId 196). Every swap, every Aave V3 deposit, every x402 USDG transfer produces a real X Layer txHash. No simulations, no testnets.

**2. First multi-agent x402 economy on X Layer.**
Helios is the first system to use EIP-3009 USDG micropayments as the coordination primitive between autonomous agents on X Layer. Every 30 minutes, four sovereign agents settle fees between themselves onchain — proving the economy is alive with payment txHashes anyone can verify.

**3. HeliosRegistry.sol — a public cycle audit log.**
Deployed at [`0xbA74426e9144bf68f986ec239E32a882843487E7`](https://www.oklink.com/xlayer/address/0xbA74426e9144bf68f986ec239E32a882843487E7), this contract permanently records every cycle's decision — action taken, txHashes, agent that executed it. Any X Layer observer can audit the swarm's full history onchain without trusting Helios's backend.

**4. Deployable infrastructure for X Layer DeFi.**
Helios is not a demo. Any developer can clone the repo, run `helios setup`, fund four wallets, and have their own autonomous DeFi swarm competing on the public leaderboard within minutes. Every new swarm adds trading volume and yield activity to X Layer.

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

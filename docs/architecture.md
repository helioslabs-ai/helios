# Helios — Architecture

> An autonomous DeFi portfolio manager where capital never stops working.

Helios is a sovereign multi-agent DeFi economy on X Layer. Four AI agents continuously find yield, execute trades, harvest returns, and compound profits — keeping capital productive every minute. Each agent operates its own wallet, earning and paying each other via x402 micropayments — a self-sustaining onchain economy with no human in the loop.

Every 30 minutes, Helios proves it is alive onchain.

---

## Multi-Agent Design

```
┌──────────────────────────────────────────┐
│           HELIOS CURATOR                 │
│         (Orchestrator — cycle loop)      │
└──────┬─────────────┬──────────┬──────────┘
       │ x402        │ x402     │ x402
       ▼             ▼          ▼
  ┌───────────┐  ┌──────────┐  ┌──────────┐
  │ STRATEGIST│  │ SENTINEL │  │ EXECUTOR │
  └───────────┘  └──────────┘  └──────────┘
  Yield + signals  Risk gate     Trade exec
       │             │             │
       └─────────────┴─────────────┘
                     │
           HeliosRegistry.sol
              (X Layer chainId 196)
```

Each agent has an independent OKX TEE Agentic Wallet. No shared custody. No human in the critical path.

| Agent          | OnchainOS Skills                                                                               | Role                                               |
| -------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Curator**    | okx-agentic-wallet, okx-defi-portfolio, okx-wallet-portfolio, okx-audit-log                    | Orchestrate cycles, compound profits, pay agents   |
| **Strategist** | okx-dex-signal, okx-dex-token, okx-dex-market, okx-defi-invest, okx-defi-portfolio, okx-dex-ws, okx-dex-trenches  | Scan yield opportunities + trading signals, recommend best capital allocation    |
| **Sentinel**   | okx-security, okx-dex-token                                                                    | Risk-score opportunities, guard against bad trades |
| **Executor**   | okx-dex-swap, okx-onchain-gateway, okx-x402-payment                                            | Execute swaps onchain, settle x402 payments        |

**OnchainOS skills used: 14/14**

---

## ReAct Reasoning Pattern

Every agent decision runs through `claude-sonnet-4-6` using the AI SDK's tool calling in a ReAct loop:

```
Observe → agent receives CycleContext (last 5 cycles, open positions, wallet balances)
Reason  → Claude determines which OKX tools to call and in what order
Act     → tool calls execute (okx-dex-signal, okx-security, okx-dex-swap, etc.)
Observe → results feed back into Claude's next reasoning step
          ... repeat until decision is reached
```

No hardcoded `if score > 7 → buy`. Claude weighs multiple signals, resolves conflicts, and writes a natural-language decision summary into every cycle log entry. The `reasoning` field in `cycle_log.jsonl` is the verifiable audit trail linking AI decisions to onchain execution.

---

## State Machine

Curator owns master state. Invalid transitions throw and halt the cycle.

```
IDLE → STRATEGIST_SCAN → SENTINEL_CHECK → EXECUTOR_DEPLOY → COMPOUNDING → IDLE
                ↓ (no alpha found)
          YIELD_PARK → IDLE
```

| State              | Who acts    | What happens                                                     |
| ------------------ | ----------- | ---------------------------------------------------------------- |
| `IDLE`             | Curator     | Wait for interval timer, check circuit breaker before proceeding |
| `STRATEGIST_SCAN`  | Strategist  | Gather all OKX signals, compute composite score, return top pick |
| `SENTINEL_CHECK`   | Sentinel    | Risk-score the pick — returns CLEAR or BLOCK                     |
| `EXECUTOR_DEPLOY`  | Executor    | Swap to target token, log entry, pay agents via x402             |
| `COMPOUNDING`      | Curator     | Harvest closed position profits → reinvest or park in Aave       |
| `YIELD_PARK`       | Executor    | No alpha — deposit idle USDC into Aave V3, log no_alpha cycle    |

---

## Cycle Execution Order

Exit checks run first every cycle — manage existing positions before scanning for new ones.

```
1. checkCircuitBreaker()        ← halt if tripped
2. checkExistingPositions()     ← re-score held tokens via Sentinel
   → if BLOCK: Executor sells → USDC
   → if time stop (72h): Executor sells
   → if take-profit (+20%): Executor sells
3. pay Strategist (x402) → scan
4. if signal → pay Sentinel (x402) → assess
5. if CLEAR → preExecutionCheck() → kellySize() → pay Executor (x402) → swap
6. no-alpha: Curator → okx-defi-invest → Aave V3 deposit
7. log cycle, sync Supabase
```

---

## Cycle Frequency

| Phase              | Interval | Target txns                   |
| ------------------ | -------- | ----------------------------- |
| Days 1–3 (startup) | 1 hour   | ~72 cycles × 3 txns = ~216    |
| Days 4–9 (running) | 30 min   | ~360 cycles × 3 txns = ~1,080 |

At 30-min intervals over 9 days: 432 total cycles. Even if 80% are no-alpha (scan fee + Aave deposit = 2 txns each): **~1,000+ txns minimum**.

---

## Repo Structure

```
helios-buildx/
├── apps/
│   ├── web/                        # Next.js war room dashboard
│   └── agents/                     # Bun agent runtime (single process)
│       ├── src/
│       │   ├── agents/             # ReAct orchestration per agent role
│       │   │   ├── curator.ts      # cycle loop, orchestrates all agents
│       │   │   ├── strategist.ts   # alpha scanning ReAct agent
│       │   │   ├── sentinel.ts     # risk assessment ReAct agent
│       │   │   └── executor.ts     # trade execution ReAct agent
│       │   ├── tools/              # OKX OnchainOS API wrappers — one file per skill
│       │   │   ├── okx-dex-signal.ts
│       │   │   ├── okx-dex-trenches.ts
│       │   │   ├── okx-dex-market.ts
│       │   │   ├── okx-dex-ws.ts
│       │   │   ├── okx-dex-token.ts
│       │   │   ├── okx-security.ts
│       │   │   ├── okx-defi-invest.ts
│       │   │   ├── okx-defi-portfolio.ts
│       │   │   ├── okx-dex-swap.ts
│       │   │   ├── okx-onchain-gateway.ts
│       │   │   ├── okx-wallet-portfolio.ts
│       │   │   ├── okx-agentic-wallet.ts
│       │   │   ├── okx-audit-log.ts
│       │   │   └── okx-x402-payment.ts
│       │   ├── prompts/            # agent system prompts + cycle context builders
│       │   ├── routes/             # Hono x402-gated routes + REST API
│       │   │   ├── strategist.ts   # GET  /agents/strategist/scan
│       │   │   ├── sentinel.ts     # GET  /agents/sentinel/assess
│       │   │   ├── executor.ts     # POST /agents/executor/deploy
│       │   │   └── api.ts          # GET  /api/status /api/economy /api/cycle + SSE
│       │   ├── ai/                 # Anthropic provider + generateText wrapper
│       │   ├── memory/             # CycleContext builder — rolling last-N cycles
│       │   ├── wallet/             # OKX wallet client
│       │   ├── data/               # state.json, positions.json, cycle_log.jsonl, economy_log.jsonl
│       │   ├── state.ts            # state machine + circuit breaker
│       │   ├── app.ts              # Hono app setup + route mounting
│       │   ├── index.ts            # entry point
│       │   └── types.ts            # AgentConfig, CycleStatus, Position, CycleContext
│       └── watchdog.ts             # separate process — restarts dead agent/server
├── contracts/                      # Foundry — HeliosRegistry.sol
├── packages/
│   ├── shared/                     # payments.ts, guardrails.ts, sizing.ts, chains.ts
│   ├── cli/                        # helios CLI (commander, thin HTTP client)
│   └── mcp-server/                 # Stdio MCP server (proxy over Hono API)
├── SKILL.md
├── .mcp.json.example
├── .env.example
├── package.json                    # Bun workspaces root
└── CLAUDE.md
```

---

## Tech Stack

| Layer          | Tech                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Agent runtime  | Bun — faster startup, native TypeScript, consistent with package manager                        |
| Backend API    | Hono on Bun — native SSE (`streamSSE`), x402 routes, REST API                                  |
| Frontend       | Next.js 15, Tailwind v4, shadcn/ui, Motion, Recharts                                           |
| Smart contract | Solidity + Foundry → X Layer (chainId 196)                                                     |
| Database       | Supabase + Drizzle ORM                                                                          |
| Wallets        | OKX TEE Agentic Wallet × 4 (one per agent)                                                     |
| Payments       | OKX x402 REST APIs directly (`/x402/verify` + `/x402/settle`)                                  |
| Blockchain     | X Layer (chainId 196), viem                                                                     |
| AI Reasoning   | claude-sonnet-4-6 via AI SDK — ReAct tool calling                                              |
| MCP Server     | Custom stdio MCP server (`packages/mcp-server/`)                                               |

---

## Persistent Data

Local files written after every cycle, batch-synced to Supabase. Supabase is the SSE source for the dashboard.

```
apps/agents/src/data/
  state.json          — state machine state + circuit breaker
  positions.json      — open and closed positions
  cycle_log.jsonl     — every cycle: agents used, txHashes, reasoning, Sentinel verdict
  economy_log.jsonl   — every x402 payment: from, to, amount USDG, cycleId, txHash
```

---

## HeliosRegistry.sol

Deployed on X Layer (chainId 196). Minimal contract — keeps gas low.

- Register 4 agent identities (address → role mapping)
- Log every cycle completion (agent, action, txHashes, timestamp)
- Log no-alpha cycles (proves system always works)
- Track cumulative stats per agent
- `pause()` / `unpause()` — emergency halt
- Emit events consumed by frontend SSE feed

No funds held in the contract. HeliosRegistry is audit-only.

---

## Watchdog

`apps/agents/watchdog.ts` — separate Bun process that checks every 30 minutes:

- Is the agent process running? → restart if dead
- Is the Hono API responding on `/health`? → restart if dead
- Is the last cycle < 2h stale? → restart (hung, not crashed)

Logs to `/tmp/helios-watchdog.log`.

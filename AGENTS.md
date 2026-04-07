# AGENTS.md — Helios

You are building **Helios** — a sovereign multi-agent DeFi economy on X Layer (chainId 196). Read this before touching any code.

---

## The Four Agents

| Agent | File | Role | OKX Skills |
|-------|------|------|-----------|
| **Curator** | `apps/agents/src/agents/curator.ts` | Orchestrates all cycles. Pays the other three agents via x402. Manages the circuit breaker. | okx-agentic-wallet, okx-defi-portfolio, okx-wallet-portfolio, okx-audit-log |
| **Strategist** | `apps/agents/src/agents/strategist.ts` | Scans yield + trading signals. Returns the highest-scoring opportunity. Earns 0.001 USDG/scan. | okx-dex-signal, okx-dex-token, okx-dex-market, okx-dex-trenches, okx-dex-ws, okx-defi-invest, okx-defi-portfolio |
| **Sentinel** | `apps/agents/src/agents/sentinel.ts` | Risk-scores opportunities before Executor deploys. Re-scores open positions every cycle. Earns 0.001 USDG/assessment. | okx-security, okx-dex-token |
| **Executor** | `apps/agents/src/agents/executor.ts` | Executes swaps, parks yield in Aave V3, settles x402 payments. Earns 0.001 USDG/deploy. | okx-dex-swap, okx-onchain-gateway, okx-x402-payment |

---

## Economy Loop

```
Curator (every 30–60min)
  → x402 pay → Strategist scan
  → if trade signal → x402 pay → Sentinel assess
      CLEAR → x402 pay → Executor deploy (swap + onchain)
      BLOCK → Executor park in Aave V3
  → if no alpha → Executor park in Aave V3
  → HeliosRegistry.logCycle() → onchain proof
  → write cycle to Supabase → SSE → dashboard
```

**Circuit breaker trips on:** 3 consecutive deploy failures · 15% daily drawdown · $2 session loss.
On halt: Curator parks all USDC in Aave and stops until manual reset or UTC midnight.

---

## State Machine

```
IDLE → STRATEGIST_SCAN → SENTINEL_CHECK → EXECUTOR_DEPLOY → COMPOUNDING → IDLE
                ↓ (no alpha)
          YIELD_PARK → IDLE
```

Invalid transitions throw and halt the cycle. State lives in `apps/agents/src/data/state.json`.

---

## Import Direction — never violate

```
routes/   →  agents/   →  tools/   →  OKX APIs
agents/   →  tools/ only
tools/    never imports from agents/ or routes/
packages/shared  →  imported by all, imports nothing from apps/
```

---

## OKX Tool → Skill Map

Read the matching skill **before** writing any tool file.

| Tool file (`apps/agents/src/tools/`) | Skill | Agent |
|--------------------------------------|-------|-------|
| `okx-agentic-wallet.ts` | `okx-agentic-wallet` | Curator |
| `okx-wallet-portfolio.ts` | `okx-wallet-portfolio` | Curator, Strategist |
| `okx-defi-invest.ts` | `okx-defi-invest` | Strategist, Executor |
| `okx-defi-portfolio.ts` | `okx-defi-portfolio` | Curator, Strategist |
| `okx-dex-signal.ts` | `okx-dex-signal` | Strategist |
| `okx-dex-token.ts` | `okx-dex-token` | Strategist, Sentinel |
| `okx-dex-market.ts` | `okx-dex-market` | Strategist |
| `okx-dex-trenches.ts` | `okx-dex-trenches` | Strategist |
| `okx-dex-ws.ts` | `okx-dex-ws` | Strategist |
| `okx-security.ts` | `okx-security` | Sentinel |
| `okx-dex-swap.ts` | `okx-dex-swap` | Executor |
| `okx-onchain-gateway.ts` | `okx-onchain-gateway` | Executor |
| `okx-x402-payment.ts` | `okx-x402-payment` | Curator (via shared) |
| `okx-audit-log.ts` | `okx-audit-log` | Curator |
| `uniswap-trading-api.ts` | docs/x402-flow.md | Strategist (quote only) |

All tools use AI SDK `tool()` with zod schemas. One file per OKX skill. No mixing.

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Session entrypoint — read every session |
| `.claude/plans/spec.md` | Source of truth for architecture decisions |
| `.claude/plans/x402-flow.md` | x402 payment protocol implementation |
| `task_plan.md` | Current in-flight work — check before starting |
| `apps/agents/src/types.ts` | All shared types — AgentConfig, CycleStatus, Position, etc. |
| `apps/agents/src/state.ts` | State machine + circuit breaker |
| `apps/agents/src/agents/curator.ts` | Cycle loop orchestration |
| `packages/shared/src/payments.ts` | x402 payment client (settleX402Payment) |
| `packages/shared/src/guardrails.ts` | Circuit breaker constants |
| `packages/shared/src/sizing.ts` | Half-Kelly position sizing |
| `contracts/src/HeliosRegistry.sol` | Onchain cycle audit log |

---

## Development Commands

```bash
# Root (Bun workspaces)
bun install           # install all workspace deps
bun run check         # biome check across all packages

# apps/agents — Bun + Hono (port 3001)
cd apps/agents
bun dev               # hot reload dev server
bun start             # production

# apps/web — Next.js (port 3000)
cd apps/web
bun dev
bun build

# contracts — Foundry
cd contracts
forge build
forge test
forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC_URL --broadcast

# packages/mcp — MCP server
bun run packages/mcp/src/index.ts

# packages/cli — CLI
bun run packages/cli/src/index.ts status
```

---

## Repo Structure

```
helios-buildx/
├── apps/
│   ├── web/                  # Next.js 16 war room dashboard (Vercel)
│   └── agents/               # Bun agent runtime (Railway, port 3001)
│       ├── src/
│       │   ├── agents/       # curator · strategist · sentinel · executor
│       │   ├── tools/        # 14 OKX skill wrappers + uniswap-trading-api
│       │   ├── prompts/      # per-agent system prompts + budget builders
│       │   ├── routes/       # x402-gated Hono routes + REST API
│       │   ├── ai/           # Anthropic AI SDK (claude-sonnet-4-6)
│       │   ├── memory/       # CycleContext builder (reads jsonl logs)
│       │   ├── wallet/       # OKX wallet client
│       │   ├── data/         # state.json · positions.json · *.jsonl
│       │   ├── state.ts      # state machine + circuit breaker
│       │   ├── app.ts        # Hono setup
│       │   ├── index.ts      # entry — Curator loop + Hono server
│       │   └── types.ts      # shared types
│       └── watchdog.ts       # process monitor
├── contracts/                # Foundry — HeliosRegistry.sol
├── packages/
│   ├── shared/               # payments · guardrails · sizing · chains
│   ├── cli/                  # Commander CLI (8 commands)
│   └── mcp/                  # Stdio MCP server (6 tools)
├── SKILL.md                  # Installable skill definition
├── .mcp.json.example         # MCP config template
└── .env.example
```

---

## Environment Variables

```bash
XLAYER_RPC_URL=https://rpc.xlayer.tech
OKX_PROJECT_ID=
OKX_API_KEY=
OKX_SECRET_KEY=
OKX_PASSPHRASE=

# Agent wallets (onchainos wallet create --name <role>)
CURATOR_ACCOUNT_ID=
CURATOR_WALLET_ADDRESS=0x...
STRATEGIST_ACCOUNT_ID=
STRATEGIST_WALLET_ADDRESS=0x...
SENTINEL_ACCOUNT_ID=
SENTINEL_WALLET_ADDRESS=0x...
EXECUTOR_ACCOUNT_ID=
EXECUTOR_WALLET_ADDRESS=0x...

HELIOS_REGISTRY_ADDRESS=0x...
ANTHROPIC_API_KEY=
UNISWAP_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=

API_URL=http://localhost:3001
ENABLE_AGENTS=false
CHECK_INTERVAL_MINUTES=60
```

---

## Deployment

| Package | Host | Notes |
|---------|------|-------|
| `apps/agents` | Railway | Bun entry: `apps/agents/src/index.ts`, port 3001 |
| `apps/web` | Vercel | Connect `apps/web/` subdir, set `NEXT_PUBLIC_API_URL` |
| `contracts/` | X Layer | `forge script` — chainId 196 |

---

## Commit Format

```
<type>: <what was built or decided>

- detail

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat` `fix` `deploy` `docs` `test` `chore`

---

## Hard Rules

1. All OKX API calls go through `apps/agents/src/tools/` only — never call OKX APIs from agents directly
2. Read the matching OKX skill before writing any tool file
3. x402 payments via OKX REST APIs directly — no CLI, no user confirmation gates
4. Every agent uses AI SDK `generateText` with `maxSteps: 10` — no hardcoded logic
5. No mocks, no workarounds, no AI slop — real onchain execution only
6. Build on X Layer (chainId 196) — every txHash proves the system is alive
7. `packages/shared` imports nothing from `apps/` — it's a pure utility package

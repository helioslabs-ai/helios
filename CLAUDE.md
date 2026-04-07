# CLAUDE.md — Helios

You are **HeliosAgent** — an autonomous DeFi portfolio manager on X Layer. This is your session entrypoint. Read it every session.

---

## Session Workflow

### Start of session

1. Read `.claude/context/MEMORY.md` — pick up build state, blockers, next steps
2. Read `CLAUDE.md` (this file)
3. Read `.claude/plans/spec.md` — source of truth for architecture + decisions
4. Scan `task_plan.md` — current in-flight work
5. Tell the staff engineer: what you will build this session, and any blockers

### End of session

1. Update `MEMORY.md` — done, blockers, next session plan
2. Update `task_plan.md` — mark completed steps, set next `Current`
3. `git add -A && git commit` (see commit format below)
4. `git push`
5. Tell staff engineer: session summary, blockers, next session plan

---

## Identity

- **Project**: Helios — sovereign multi-agent DeFi economy on X Layer
- **Builder**: Staff Enginner
- **Repo**: github.com/lucent-labs/helios
- **Domain**: heliosfi.xyz
- **Deadline**: Apr 15, 23:59 UTC

---

## Build State

| Layer               | Status       | Notes                                              |
| ------------------- | ------------ | -------------------------------------------------- |
| Root monorepo       | ✅ Done      | Bun workspaces, biome, tsconfig, .env.example      |
| `apps/agents`       | ✅ Scaffolded | Hono + 4 agents + 15 tool stubs + routes + SSE    |
| `apps/web`          | ✅ Scaffolded | Next.js 16 + Tailwind v4 + shadcn                 |
| `contracts/`        | ✅ Written   | HeliosRegistry.sol — 12/12 tests pass, not deployed|
| `packages/shared`   | ✅ Done      | payments.ts, guardrails.ts, sizing.ts, chains.ts   |
| `packages/mcp`      | ✅ Done      | Stdio MCP server — 6 tools proxying Hono API       |
| `packages/cli`      | ✅ Done      | Commander CLI — 8 commands, thin HTTP client        |
| **OKX tools wired** | ⏳ Next      | 14/14 tool stubs need live OnchainOS API calls      |
| **x402 payments**   | ⏳ Next      | payments.ts stub → real OKX x402 REST calls         |
| **Contract deploy**  | ⏳ Next      | Deploy HeliosRegistry to X Layer (chainId 196)     |
| **Agentic Wallets** | ⏳ Blocked   | Need user to run `onchainos wallet create` × 4     |

---

## Development Commands

```bash
# Root (Bun workspaces)
bun install           # install all workspace deps
bun run dev           # runs all dev servers (agents :3001, web :3000)
bun run check         # biome check across all packages

# apps/agents — Bun + Hono
bun dev               # dev server :3001 (hot reload)
bun start             # production start

# apps/web — Next.js
bun dev               # dev server :3000
bun build
bun lint

# contracts — Foundry
forge build
forge test
forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC_URL --broadcast
```

---

## Key Files

| File                                     | Purpose                                                       |
| ---------------------------------------- | ------------------------------------------------------------- |
| `CLAUDE.md`                              | This file — entrypoint for every session                      |
| `.claude/plans/spec.md`                  | Product spec + architecture decisions. Source of truth.       |
| `.claude/plans/scaffold-quickstart.md`   | CLI, MCP server, SKILL.md, first-run genesis                  |
| `.claude/plans/x402-flow.md`             | x402 inter-agent payment protocol + implementation details    |
| `.claude/context/LUCENT-LABS.md`         | Team context, submission matrix, hackathon strategy           |
| `.claude/context/BuildX-Hackathon-S2.md` | Hackathon rules, prizes, judging criteria                     |
| `task_plan.md`                           | Current task tracker — step-by-step scaffold checklist        |
| `docs/`                                  | Reference docs — architecture, economy-loop, guardrails, etc. |

---

## Repo Structure

```
helios-buildx/
├── apps/
│   ├── web/                        # Next.js war room dashboard (Vercel)
│   └── agents/                     # Bun agent runtime (Railway)
│       ├── src/
│       │   ├── agents/             # curator.ts · strategist.ts · sentinel.ts · executor.ts
│       │   ├── tools/              # one file per OKX skill (14 files) + uniswap-trading-api.ts
│       │   ├── prompts/            # per-agent system prompts + cycle context builders
│       │   ├── routes/             # x402-gated Hono routes + REST API
│       │   ├── ai/                 # Anthropic provider + generateText wrapper
│       │   ├── memory/             # CycleContext builder (reads jsonl files)
│       │   ├── wallet/             # OKX wallet client
│       │   ├── data/               # state.json · positions.json · *.jsonl cycle logs
│       │   ├── state.ts            # state machine + circuit breaker
│       │   ├── app.ts              # Hono app setup
│       │   ├── index.ts            # Entry — Curator loop + Hono server
│       │   └── types.ts            # AgentConfig · CycleStatus · Position · CycleContext
│       └── watchdog.ts             # Process monitor (outside src/)
├── contracts/                      # Foundry — HeliosRegistry.sol
├── packages/
│   ├── shared/                     # payments.ts · guardrails.ts · sizing.ts · chains.ts
│   ├── cli/                        # helios CLI (commander, thin HTTP client)
│   └── mcp/                        # Stdio MCP server (proxies Hono API)
├── docs/                           # Reference docs
├── SKILL.md                        # Installable skill definition
├── .mcp.json.example               # MCP config template
├── .env.example
├── task_plan.md
└── CLAUDE.md
```

---

## Import Direction — never violate

```
routes/   →  agents/   →  tools/   →  OKX APIs
agents/   →  tools/ only
tools/    never imports from agents/ or routes/
packages/shared  →  imported by all, imports nothing from apps/
```

---

## OKX OnchainOS — Tool → Skill Map

Read the matching skill before writing any tool file.

| Tool file (`apps/agents/src/tools/`) | Skill to read first      | Agent using it          |
| ------------------------------------ | ------------------------ | ----------------------- |
| `okx-agentic-wallet.ts`              | `okx-agentic-wallet`     | Curator                 |
| `okx-wallet-portfolio.ts`            | `okx-wallet-portfolio`   | Curator, Strategist     |
| `okx-defi-invest.ts`                 | `okx-defi-invest`        | Strategist, Executor    |
| `okx-defi-portfolio.ts`              | `okx-defi-portfolio`     | Strategist, Curator     |
| `okx-dex-signal.ts`                  | `okx-dex-signal`         | Strategist              |
| `okx-dex-token.ts`                   | `okx-dex-token`          | Strategist, Sentinel    |
| `okx-dex-market.ts`                  | `okx-dex-market`         | Strategist              |
| `okx-dex-trenches.ts`                | `okx-dex-trenches`       | Strategist              |
| `okx-dex-ws.ts`                      | `okx-dex-ws`             | Strategist              |
| `okx-security.ts`                    | `okx-security`           | Sentinel                |
| `okx-dex-swap.ts`                    | `okx-dex-swap`           | Executor                |
| `okx-onchain-gateway.ts`             | `okx-onchain-gateway`    | Executor                |
| `okx-x402-payment.ts`                | `okx-x402-payment`       | Curator (via shared)    |
| `okx-audit-log.ts`                   | `okx-audit-log`          | Curator                 |
| `uniswap-trading-api.ts`             | read `docs/x402-flow.md` | Strategist (quote only) |

---

## Skills Reference

| Trigger                       | Skill                                |
| ----------------------------- | ------------------------------------ |
| Before any implementation     | `rigorous-coding`                    |
| Any OKX tool file             | see table above                      |
| x402 payment implementation   | `okx-x402-payment`                   |
| Solidity contract work        | `solidity-security` + `web3-foundry` |
| Dashboard UI components       | `shadcn` + `web3-frontend`           |
| Next.js patterns              | `vercel-react-best-practices`        |
| Wallet connection, tx UX      | `web3-privy`                         |
| New UI pages/components       | `frontend-design:frontend-design`    |
| Pre-deployment contract check | `solidity-security` + `deploy-check` |

---

## Required Env Vars

```bash
# apps/agents/.env (copy from .env.example at root)

# X Layer
XLAYER_RPC_URL=https://rpc.xlayer.tech

# OKX
OKX_PROJECT_ID=
OKX_API_KEY=
OKX_SECRET_KEY=
OKX_PASSPHRASE=

# Agent wallets (created via: onchainos wallet create --name <role>)
CURATOR_ACCOUNT_ID=
CURATOR_WALLET_ADDRESS=0x...
STRATEGIST_ACCOUNT_ID=
STRATEGIST_WALLET_ADDRESS=0x...
SENTINEL_ACCOUNT_ID=
SENTINEL_WALLET_ADDRESS=0x...
EXECUTOR_ACCOUNT_ID=
EXECUTOR_WALLET_ADDRESS=0x...

# Contracts
HELIOS_REGISTRY_ADDRESS=0x...

# AI
ANTHROPIC_API_KEY=

# Uniswap (register at developers.uniswap.org)
UNISWAP_API_KEY=

# Database
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Runtime
API_URL=http://localhost:3001
ENABLE_AGENTS=false          # set true to auto-start on boot
CHECK_INTERVAL_MINUTES=60    # 60 for days 1–3, then drop to 30
```

---

## Deployment

| Package       | Host    | Notes                                                  |
| ------------- | ------- | ------------------------------------------------------ |
| `apps/agents` | Railway | Bun entry — `apps/agents/src/index.ts`. Port 3001.     |
| `apps/web`    | Vercel  | Connect `apps/web/` subdir. Env: `NEXT_PUBLIC_API_URL` |
| `contracts/`  | X Layer | `forge script` — chainId 196, record deployed address  |

---

## Commit Format

```
<type>: <what was built or decided>

- detail

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat` `fix` `deploy` `docs` `test` `chore`

Commit after every meaningful unit. Every session ends with commit + push.

---

## Hard Rules

1. Do not re-litigate decisions in `.claude/plans/spec.md` — read and build
2. No mocks, no workarounds, no AI slop — real execution only
3. Build on X Layer ecosystem (chainId 196) — every txn proves the system is alive
4. All OKX API calls go through `apps/agents/src/tools/` only
5. x402 payments via OKX REST APIs directly — no CLI prompts in the loop
6. Complete at least 1,000 onchain txns before submission
7. Open-source on public GitHub repo
8. Every session ends with commit + push

---

## Working Style

- Direct and concise — staff engineer level
- Surface risks and tradeoffs early
- When blocked, say so immediately with what you need
- Own design decisions, not just code generation
- Economy loop is the core differentiator — protect it

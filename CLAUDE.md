# CLAUDE.md — Helios

Read `AGENTS.md` first — it is the source of truth for architecture, agents, onchain deployments, economy loop, skills, conventions, and hard rules.

**Project:** Helios — a sovereign, self-sustaining multi-agent DeFi economy on X Layer. Four specialized AI agents find yield, execute trades, monitor risk, and compound profits autonomously — coordinating via x402 USDG micropayments with no human in the loop. Every cycle is proven onchain.
**Repo:** github.com/helioslabs-ai/helios
**Domain:** heliosfi.xyz

---

## Session Workflow

### Start of session

1. Read `AGENTS.md` — architecture, agents, rules, deployments
2. Read `CLAUDE.md` (this file)
3. Read `.claude/plans/spec.md` — architecture decisions, source of truth
4. Scan `task_plan.md` — current in-flight work
5. Tell the engineer: what you will build this session and any blockers

### End of session

1. Update `task_plan.md` — mark completed steps, set next current
2. `git add -A && git commit` (see commit format in `AGENTS.md`)
3. `git push`
4. Tell engineer: session summary, blockers, next session plan

---

## Key Files

| File                                | Purpose                                               |
| ----------------------------------- | ----------------------------------------------------- |
| `AGENTS.md`                         | Source of truth — read every session                  |
| `.claude/plans/spec.md`             | Architecture decisions — do not re-litigate           |
| `task_plan.md`                      | Current task tracker — check before starting          |
| `apps/agents/src/types.ts`          | All shared types — AgentConfig, CycleStatus, Position |
| `apps/agents/src/state.ts`          | State machine + circuit breaker                       |
| `apps/agents/src/agents/curator.ts` | Cycle loop orchestration                              |
| `packages/shared/src/payments.ts`   | x402 payment client                                   |
| `packages/shared/src/guardrails.ts` | Circuit breaker constants                             |
| `packages/shared/src/sizing.ts`     | Half-Kelly position sizing                            |
| `contracts/src/HeliosRegistry.sol`  | Onchain cycle audit log                               |

---

## Repo Structure

```
helios/
├── apps/
│   ├── dashboard/        # Next.js 16 — war room, leaderboard
│   └── agents/           # Bun agent runtime (primary)
│       └── src/
│           ├── agents/   # curator · strategist · sentinel · executor
│           ├── tools/    # OKX OnchainOS wrappers (14 files)
│           ├── routes/   # Hono: x402-gated + REST + SSE
│           ├── state.ts  # state machine + circuit breaker
│           └── index.ts  # entry point
├── contracts/            # HeliosRegistry.sol + Foundry
├── packages/
│   ├── shared/           # payments · guardrails · sizing · chains
│   ├── cli/              # helios CLI
│   └── mcp/              # stdio MCP server
├── AGENTS.md
└── CLAUDE.md
```

---

## Dev Commands

```bash
bun install
bun run dev                          # agent runtime :3001 + dashboard :3000
bun run check                        # biome lint + typecheck

cd contracts && forge build && forge test
forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC_URL --broadcast
```

---

## Environment Variables

```bash
OKX_API_KEY=
OKX_SECRET_KEY=
OKX_PASSPHRASE=

CURATOR_WALLET_ADDRESS=
STRATEGIST_WALLET_ADDRESS=
SENTINEL_WALLET_ADDRESS=
EXECUTOR_WALLET_ADDRESS=

HELIOS_REGISTRY_ADDRESS=0xbA74426e9144bf68f986ec239E32a882843487E7
XLAYER_RPC_URL=https://rpc.xlayer.tech

SWARM_NAME=
SWARM_STRATEGY=
MAX_TRADE_SIZE_USD=
MAX_TOTAL_LOSS_USD=
CYCLE_INTERVAL_MINUTES=
ENABLE_AGENTS=false
API_URL=http://localhost:3001

SUPABASE_URL=
SUPABASE_ANON_KEY=
OPENAI_API_KEY=
UNISWAP_API_KEY=
```

---

## Skills Reference

| Trigger                       | Skill                                   |
| ----------------------------- | --------------------------------------- |
| Before any implementation     | `rigorous-coding`                       |
| Any OKX tool file             | see OKX Tool → Skill Map in `AGENTS.md` |
| x402 payment implementation   | `okx-x402-payment`                      |
| Solidity contract work        | `solidity-security` + `web3-foundry`    |
| Dashboard UI components       | `shadcn` + `web3-frontend`              |
| Next.js patterns              | `vercel-react-best-practices`           |
| New UI pages/components       | `frontend-design`                       |
| Pre-deployment contract check | `solidity-security` + `deploy-check`    |

---

## Working Style

- Staff engineer level — direct, concise, no hand-holding
- Surface risks and tradeoffs early
- When blocked, say so immediately with what you need
- Own design decisions, not just code generation
- Economy loop is the core differentiator — protect it
- Complete at least 1,000 onchain txns before submission
- Every session ends with commit + push

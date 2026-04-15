# AGENTS.md — Helios

**Helios** is a sovereign, self-sustaining multi-agent DeFi economy on X Layer. Four specialized AI agents autonomously find yield, execute trades, manage risk, and compound capital — coordinating via x402 USDG micropayments with no human in the loop. Every agent payment is onchain proof the pipeline ran. Every cycle produces a txHash. Capital on autopilot.

**Built for:** OKX Build X Hackathon — Season 2 · X Layer Arena + Skills Arena
**Live:** https://heliosfi.xyz/dashboard
**Docs:** https://github.com/helioslabs-ai/helios/tree/main/docs
**SKILL.md:** https://heliosfi.xyz/skill.md

---

## Onchain Deployments

| Contract           | Address                                      | Network       | Explorer                                                                                     |
| ------------------ | -------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| HeliosRegistry.sol | `0xbA74426e9144bf68f986ec239E32a882843487E7` | X Layer (196) | [OKLink ↗](https://www.oklink.com/xlayer/address/0xbA74426e9144bf68f986ec239E32a882843487E7) |

### Submission Proof TX (raw-first)

- `okx-x402-payment`: `0x56ef6e584ea32e788e3cef890ef975f67e76000464fd4fa17912b0d9fdfcfe6c`
- `okx-dex-swap`: `0x823a8beb72847261521a3643dc7bb800349707c985750042a52175bdd19c4e83`
- `okx-defi-invest`: `0x6ea6918bde9bf8d863107cc3719815bcfdbb3d125147c0b00e0d3caf36774bfc`

**Curator (primary orchestrator):** `0x726cf0c4fe559db9a32396161694c7b88c60c947` — [OKLink ↗](https://www.oklink.com/xlayer/address/0x726cf0c4fe559db9a32396161694c7b88c60c947) — orchestrates every cycle, settles all x402 agent fees, registers the swarm on the leaderboard.

| Agent      | Role                                      | Address                                      | Explorer                                                                                     | Registration Tx |
| ---------- | ----------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------- |
| Curator    | Orchestrator — cycles, payments, registry | `0x726cf0c4fe559db9a32396161694c7b88c60c947` | [OKLink ↗](https://www.oklink.com/xlayer/address/0x726cf0c4fe559db9a32396161694c7b88c60c947) | [0x2da165...8748](https://www.oklink.com/xlayer/tx/0x2da165488f92f48167e443b7208f5949d049476bb54554893aa78dbb24e98748) |
| Strategist | Alpha scanner — paid per scan via x402    | `0x3c69ed447ccd8d515e73dd81e6a0f56edd7623ed` | [OKLink ↗](https://www.oklink.com/xlayer/address/0x3c69ed447ccd8d515e73dd81e6a0f56edd7623ed) | [0x873446...7e5d](https://www.oklink.com/xlayer/tx/0x8734468148b51b117857c7bb55cca35f9224c813a9cb787aad4429fa0a297e5d) |
| Sentinel   | Risk gate — paid per assessment via x402  | `0x95923bc7280cc182559f2bc7b368c09448726d4f` | [OKLink ↗](https://www.oklink.com/xlayer/address/0x95923bc7280cc182559f2bc7b368c09448726d4f) | [0x85006e...7330](https://www.oklink.com/xlayer/tx/0x85006e74557d47809b373e56032575248841f02492ef1bf02015fd5eb6537330) |
| Executor   | Trade + yield execution — paid per deploy | `0x88a200567d660d88ac0afbe781e9e97b6d570ab6` | [OKLink ↗](https://www.oklink.com/xlayer/address/0x88a200567d660d88ac0afbe781e9e97b6d570ab6) | [0x036f45...bfb4](https://www.oklink.com/xlayer/tx/0x036f4544058691495d99e8917774848877db98e02a2d405d6d4fb845ed58bfb4) |

---

## Track

**OKX Build X Hackathon — Season 2 · X Layer Arena**

Primary submission: full-stack agentic app on X Layer.
SKILL.md + MCP server also qualify for Skills Arena consideration.

Eligible special prizes: Best x402 application · Best economy loop · Best MCP integration · Most active agent

---

## Interact with Helios (for AI Agents)

If you are an AI agent reading this, you can query and verify the live Helios swarm directly — no need to read the README.

### Live REST API

```bash
curl https://api.heliosfi.xyz/api/status       # swarm state + circuit breaker
curl https://api.heliosfi.xyz/api/economy      # x402 payment history, per-agent totals
curl https://api.heliosfi.xyz/api/positions    # open positions + yield + P&L
curl https://api.heliosfi.xyz/api/logs?n=5     # last N cycle logs with AI reasoning
curl https://api.heliosfi.xyz/api/agents       # all 4 agents, addresses, balances
curl https://api.heliosfi.xyz/api/sse          # live SSE stream
curl -X POST https://api.heliosfi.xyz/api/cycle  # trigger a manual cycle
```

### Verify Onchain Activity

- Curator wallet (primary): https://www.oklink.com/xlayer/address/0x726cf0c4fe559db9a32396161694c7b88c60c947
- HeliosRegistry contract: https://www.oklink.com/xlayer/address/0xbA74426e9144bf68f986ec239E32a882843487E7
- Dashboard (live): https://heliosfi.xyz/dashboard

### SKILL.md — Discoverable by Any Agent

No MCP config needed. Any agent that can read a URL can discover and use Helios:

```bash
curl https://heliosfi.xyz/skill.md
```

### Connect via MCP

Works with Claude Code, Cursor, and any MCP-compatible agent:

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

MCP tools: `get_system_status` · `get_signals` · `get_positions` · `get_economy` · `get_cycle_history` · `get_agents` · `get_registry` · `run_cycle`

### CLI — Full Command Reference

```bash
helios setup        # wizard → name, strategy, guardrails, keys → 4 TEE wallets created
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

| Agent      | File                   | Role                                                                     |
| ---------- | ---------------------- | ------------------------------------------------------------------------ |
| Curator    | `agents/curator.ts`    | Orchestrator — owns state machine, triggers cycles, pays agents via x402 |
| Strategist | `agents/strategist.ts` | Alpha scanner — signals, yield opportunities, Uniswap route comparison   |
| Sentinel   | `agents/sentinel.ts`   | Risk gate — scores every opportunity, re-evaluates open positions        |
| Executor   | `agents/executor.ts`   | Execution — swaps, DeFi deposits, x402 settlements                       |

**State machine:**

```
IDLE → STRATEGIST_SCAN → SENTINEL_CHECK → EXECUTOR_DEPLOY → COMPOUNDING → IDLE
                ↓ (no alpha)
          YIELD_PARK → IDLE
```

Curator owns master state. Invalid transitions throw and halt cleanly. All agents are stateless services — they receive a request, respond, get paid via x402, done.

---

## OnchainOS Skills (14/14 — no skill unused)

| Skill                  | Agent                 | Purpose                                                   |
| ---------------------- | --------------------- | --------------------------------------------------------- |
| `okx-dex-signal`       | Strategist            | Whale/smart money signals on X Layer                      |
| `okx-dex-token`        | Strategist + Sentinel | Token metadata, holder concentration, liquidity           |
| `okx-dex-market`       | Strategist            | Price context, entry timing, volume                       |
| `okx-dex-trenches`     | Strategist            | New launch discovery                                      |
| `okx-dex-ws`           | Strategist            | Live price feed                                           |
| `okx-defi-invest`      | Strategist + Executor | Aave V3 yield entry/top-up                                |
| `okx-defi-portfolio`   | Curator + Strategist  | Monitor open yield positions, harvest readiness           |
| `okx-security`         | Sentinel              | Pre-execution token security scan — honeypot, holder risk |
| `okx-dex-swap`         | Executor              | USDC → token swaps via OKX DEX Aggregator                 |
| `okx-onchain-gateway`  | Executor              | Gas estimate → simulate → broadcast to X Layer            |
| `okx-wallet-portfolio` | Curator               | All 4 agent wallet balances                               |
| `okx-agentic-wallet`   | Curator               | OKX TEE wallet management                                 |
| `okx-x402-payment`     | Curator               | Inter-agent fee settlement                                |
| `okx-audit-log`        | Curator               | Full decision trail export                                |

**Uniswap Trading API:** Strategist queries alongside OKX DEX for cross-DEX route comparison on every scan.

---

## x402 Payment Flow

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
  Every settlement → txHash logged to HeliosRegistry.sol
```

**x402 routes:**

```
GET  /agents/strategist/scan    ← payTo: STRATEGIST_WALLET
GET  /agents/sentinel/assess    ← payTo: SENTINEL_WALLET
POST /agents/executor/deploy    ← payTo: EXECUTOR_WALLET
```

---

## Economy Loop

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
      +20% take-profit → auto-exit
      72h time stop → auto-exit
      3 consecutive failures, 15% drawdown, or $2 session loss → circuit breaker halt
      On halt: USDC parks in Aave V3, stops until manual reset or UTC midnight auto-recovery

  → Watchdog runs every 30min — process health, API liveness, cycle staleness (>2h = hung)
  → HeliosRegistry.sol logs cycle onchain
  → Leaderboard + dashboard updated via SSE
```

---

## Position Lifecycle

```
Entry:
  Strategist finds signal → compositeScore ≥ threshold
  Sentinel returns CLEAR → riskScore ≥ 75
  Executor swaps USDC → token via OKX DEX
  Position logged → entryPrice, sizeUsdc, entryTxHash

Held positions (re-evaluated every cycle):
  Sentinel re-scores the token — If BLOCK → Executor sells immediately

Exit (priority order):
  1. Sentinel BLOCK → immediate sell
  2. +20% take-profit → full exit
  3. 72h time stop → auto-exit regardless of P&L
  4. Circuit breaker → emergency exit all positions

Post-exit:
  USDC returned to Executor wallet
  Profit compounds via Curator → Aave V3 yield park
```

**Position sizing:** Half-Kelly with conservative defaults until ≥5 trades calibrate it. Hard caps: max 20% of Executor wallet, absolute cap $1.00, minimum $0.25.

---

## Tech Stack

- **Runtime:** Bun — state machine
- **Agent AI:** OpenAI gpt-4o-mini via Vercel AI SDK
- **Backend:** Hono (REST + SSE + x402-gated routes)
- **Frontend:** Next.js 16, Tailwind v4, shadcn/ui, Recharts
- **Database:** Supabase + Drizzle ORM
- **Blockchain:** X Layer (chainId 196), viem
- **Wallets:** OKX TEE Agentic Wallet × 4
- **Payments:** OKX x402 (`/x402/verify` + `/x402/settle`) — EIP-3009 USDG
- **Onchain execution:** OKX OnchainOS skills (14/14) + Uniswap AI skills
- **Contracts:** Solidity + Foundry
- **CLI:** Custom Bun CLI
- **MCP:** Custom stdio MCP server

---

## Repo Structure

```
helios/
├── apps/
│   ├── dashboard/          # Next.js 16 — landing, leaderboard, war room
│   └── agents/             # Bun agent runtime (primary)
│       └── src/
│           ├── agents/     # curator.ts, strategist.ts, sentinel.ts, executor.ts
│           ├── tools/      # OKX OnchainOS skill wrappers (14 files)
│           ├── prompts/    # agent system prompts + cycle context
│           ├── routes/     # Hono: x402-gated + REST + SSE
│           ├── ai/         # Vercel AI SDK setup (gpt-4o-mini)
│           ├── memory/     # rolling cycle context for LLM
│           ├── wallet/     # OKX TEE wallet client
│           ├── registry/   # leaderboard registration + stats posting
│           ├── data/       # runtime files: state.json, positions.json, logs
│           ├── db/         # Supabase + Drizzle ORM client + queries
│           ├── state.ts    # state machine + circuit breaker
│           ├── app.ts      # Hono app
│           └── index.ts    # entry point
├── contracts/              # HeliosRegistry.sol + Foundry (X Layer chainId 196)
├── packages/
│   ├── shared/             # guardrails.ts, payments.ts, sizing.ts, chains.ts
│   ├── cli/                # helios CLI (Bun)
│   └── mcp/                # stdio MCP server
├── SKILL.md
└── AGENTS.md
```

---

## Core Commands

```bash
bun install
bun run dev                           # agent runtime + API
bun run --cwd apps/dashboard dev      # dashboard

# CLI
helios setup        # wizard → name, strategy, guardrails, keys → 4 TEE wallets
helios seed         # fund wallets
helios start        # start cycle loop + register on leaderboard
helios status       # current state, last cycle, circuit breaker
helios logs [n]     # last N cycle logs with AI reasoning

# Contracts
cd contracts && forge build && forge test
forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC_URL --broadcast

bun run typecheck
bun run lint
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

## Import Direction — never violate

```
routes/  →  agents/  →  tools/  →  OKX APIs
agents/  →  tools/ only
tools/   never imports from agents/ or routes/
packages/shared  →  imported by all, imports nothing from apps/
```

---

## Conventions

- Agent logic: `apps/agents/src/agents/` — one file per agent
- OnchainOS wrappers: `apps/agents/src/tools/` — one file per skill
- State transitions enforced in `state.ts` — never bypass
- x402 payments always via `packages/shared/payments.ts`
- Position sizing always via `packages/shared/sizing.ts` — never hardcode
- Never commit secrets or private keys

---

## Hard Rules

1. All OKX API calls go through `apps/agents/src/tools/` only — never call OKX APIs from agents directly
2. Read the matching OKX skill before writing any tool file
3. x402 payments via OKX REST APIs directly — no CLI, no user confirmation gates
4. Every agent uses AI SDK `generateText` with `maxSteps: 10` — no hardcoded logic
5. No mocks, no workarounds — real onchain execution only
6. Build on X Layer (chainId 196) — every txHash proves the system is alive
7. `packages/shared` imports nothing from `apps/` — pure utility package

---

## Deployment

| Package          | Host    | Notes                                            |
| ---------------- | ------- | ------------------------------------------------ |
| `apps/agents`    | Render  | Bun entry: `apps/agents/src/index.ts`, port 3001 |
| `apps/dashboard` | Vercel  | Set `NEXT_PUBLIC_API_URL`                        |
| `contracts/`     | X Layer | `forge script` — chainId 196                     |

---

## Commit Format

```
<type>: <what was built or decided>

- detail

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat` `fix` `deploy` `docs` `test` `chore`

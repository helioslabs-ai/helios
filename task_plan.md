# Task Plan: Phase 2 — Wire Live OKX Skills + Deploy

## Goal
All 14 OKX tool stubs wired to real OnchainOS APIs, x402 payments functional, HeliosRegistry deployed to X Layer, 4 Agentic Wallets created and funded — end-to-end cycle test passes.

## Prerequisites (user must complete)

| What | Command / Action | Status |
|---|---|---|
| 4 Agentic Wallets | `onchainos wallet create --name curator` (×4) | ❌ |
| Fund wallets | Send $4/$4/$1/$1 USDC + OKB for gas on X Layer | ❌ |
| Anthropic API key | Set `ANTHROPIC_API_KEY` in `.env` | ❌ |
| Supabase project | Create project, get URL + anon key | ❌ |

## Features / Steps

- [x] Step 3: Wire OKX auth — shared `_cli.ts` helper (spawnSync onchainos CLI)
- [x] Step 4: Wire Strategist tools (6 files) — okx-dex-signal, okx-dex-token, okx-dex-market, okx-dex-trenches, okx-defi-invest, okx-defi-portfolio
- [x] Step 5: Wire Sentinel tools — okx-security, okx-dex-token
- [x] Step 6: Wire Executor tools — okx-dex-swap, okx-onchain-gateway, okx-defi-invest
- [x] Step 7: Wire Curator tools — okx-agentic-wallet, okx-wallet-portfolio, okx-audit-log
- [x] Step 8: Wire x402 payments — `packages/shared/src/payments.ts` — settleX402 (client) + okxVerifyX402Payment + okxSettleX402Payment + buildPaymentResponse
- [x] Step 9: Wire x402-gated Hono routes — /agents/strategist/scan, /agents/sentinel/assess, /agents/executor/deploy — all fully gated
- [x] Step 10: Wire Curator cycle loop — index.ts builds AgentConfigs from env, curator.ts calls settleX402 per agent per cycle + writes economy_log.jsonl
- [x] Step 11: Wire Uniswap Trading API — uniswap-trading-api.ts wired (direct REST to trade-api.gateway.uniswap.org)
- [x] Step 12: Wire HeliosRegistry logging — registry.ts calls logCycle() via viem after each cycle (no-op if HELIOS_REGISTRY_ADDRESS not set)
- [x] Step 13 (tools/registry): tools/registry.ts — per-agent tool sets for strategist/sentinel/executor/curator
- [ ] Step 1: Deploy HeliosRegistry.sol to X Layer — `forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC_URL --broadcast` (blocked: needs funded deployer)
- [ ] Step 2: Register 4 agents on-chain — call `registerAgent()` for each wallet (blocked: wallets not created)
- [ ] Step 13: End-to-end cycle test — trigger one manual cycle, verify: scan → assess → deploy/park → x402 → registry log (blocked: wallets + env vars)

## Current
**Working on**: Phase 3 — Dashboard (apps/web) + Contract deploy
**Status**: Core agent runtime fully wired. Blocked on wallet creation + deployment for e2e test.

## Next Session
1. User: run `onchainos wallet create --name curator/strategist/sentinel/executor` × 4
2. User: fund wallets (see README.md for amounts)
3. User: fill `.env` with wallet addresses, account IDs, Anthropic key
4. Set `ENABLE_AGENTS=true` → `bun dev` → watch first cycle
5. Build war room dashboard in `apps/web`
6. Deploy HeliosRegistry.sol to X Layer

## Decisions
- `_cli.ts` shared helper uses spawnSync to call onchainos CLI — handles OKX HMAC auth internally
- x402 payments: `settleX402` probes → gets 402 → signs via onchainos CLI → replays
- Routes build agent configs from env vars directly — no shared state needed
- HeliosRegistry logging is fire-and-forget (non-fatal — won't break cycle if contract not deployed)
- ENABLE_AGENTS=false by default — manual cycle trigger via POST /api/cycle

## Errors
- (none — all 8 files biome-formatted, server boots clean)

# Task Plan: Phase 2 — Wire Live OKX Skills + Deploy

## Goal
All 14 OKX tool stubs wired to real OnchainOS APIs, x402 payments functional, HeliosRegistry deployed to X Layer, 4 Agentic Wallets created and funded — end-to-end cycle test passes.

## Prerequisites (user must complete)

| What | Command / Action | Status |
|---|---|---|
| OKX Project ID | Get from OKX Web3 developer console | ❌ |
| 4 Agentic Wallets | `onchainos wallet create --name curator` (×4) | ❌ |
| Fund wallets | Send $4/$4/$1/$1 USDC + OKB for gas on X Layer | ❌ |
| Anthropic API key | Set `ANTHROPIC_API_KEY` in `.env` | ❌ |
| Supabase project | Create project, get URL + anon key | ❌ |

## Features / Steps

- [ ] Step 1: Deploy HeliosRegistry.sol to X Layer — `forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC_URL --broadcast`
- [ ] Step 2: Register 4 agents on-chain — call `registerAgent()` for each wallet
- [ ] Step 3: Wire OKX auth headers — shared helper for HMAC signing (all tool files use this)
- [ ] Step 4: Wire Strategist tools (6 files) — okx-dex-signal, okx-dex-token, okx-dex-market, okx-dex-trenches, okx-defi-invest, okx-defi-portfolio
- [ ] Step 5: Wire Sentinel tools (2 files) — okx-security, okx-dex-token (holder analysis)
- [ ] Step 6: Wire Executor tools (3 files) — okx-dex-swap, okx-onchain-gateway, okx-defi-invest (yield park)
- [ ] Step 7: Wire Curator tools (3 files) — okx-agentic-wallet, okx-wallet-portfolio, okx-audit-log
- [ ] Step 8: Wire x402 payments — `packages/shared/src/payments.ts` → real OKX REST calls per `x402-flow.md`
- [ ] Step 9: Wire x402-gated Hono routes — strategist/sentinel/executor routes verify payment headers
- [ ] Step 10: Wire Curator cycle loop — build AgentConfigs from .env, start loop in index.ts
- [ ] Step 11: Wire Uniswap Trading API — quote endpoint for Strategist comparison
- [ ] Step 12: Wire HeliosRegistry logging — Curator calls `logCycle()` after each cycle via viem
- [ ] Step 13: End-to-end cycle test — trigger one manual cycle, verify: scan → assess → deploy/park → x402 → registry log

## Current
**Working on**: Waiting on prerequisites
**Status**: blocked — need wallet creation + env vars before wiring

## Decisions
- OKX HMAC auth helper shared across all 14 tool files (DRY)
- Wire tools per-agent group (Strategist → Sentinel → Executor → Curator) to test incrementally
- x402 payments wired separately from tool stubs — payments.ts is the single callsite
- Contract interaction via viem (already a dep in apps/agents)

## Errors
- (none yet)

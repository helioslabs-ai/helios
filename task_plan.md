# Task Plan: Phase 3 — Dashboard + Contract Deploy + First Live Cycle

## Goal
War room dashboard live, HeliosRegistry deployed, first live agent cycle running on X Layer.

## Prerequisites

| What | Status |
|---|---|
| `ANTHROPIC_API_KEY` in `.env` | ❌ missing |
| `UNISWAP_API_KEY` in `.env` | ❌ missing |
| Fund Curator wallet — USDC + OKB on X Layer | ❌ |
| Fund Executor wallet — USDC + OKB on X Layer | ❌ |
| `DEPLOYER_PRIVATE_KEY` for forge deploy | ❌ |

## Completed (Phase 2)

- [x] `_cli.ts` shared spawnSync helper
- [x] All 14 OKX tool stubs wired to onchainos CLI
- [x] `tools/registry.ts` — per-agent tool sets
- [x] `packages/shared/payments.ts` — full x402 client + server helpers
- [x] `routes/strategist.ts` — x402-gated scan route
- [x] `routes/sentinel.ts` — x402-gated assess route
- [x] `routes/executor.ts` — x402-gated deploy route
- [x] `agents/curator.ts` — settleX402 HTTP calls + economy_log.jsonl
- [x] `registry.ts` — viem logCycle() to HeliosRegistry.sol
- [x] `index.ts` — buildAgentConfigs from env + cycle loop
- [x] `routes/api.ts` — /economy, /positions, /logs, /agents, /sse
- [x] OKX Agentic Wallets × 4 created, written to .env
- [x] README Agent Onchain Identities table with OKX Explorer links
- [x] SKILL.md, AGENTS.md, DESIGN.md written
- [x] Git initialized + committed

## Phase 3 Steps

- [ ] Step 1: Deploy HeliosRegistry.sol to X Layer
  ```
  cd contracts
  forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC_URL --broadcast
  ```
  → set `HELIOS_REGISTRY_ADDRESS` in `.env`

- [ ] Step 2: Register 4 agents on-chain
  → curator calls `registerAgent()` for each wallet via viem

- [ ] Step 3: Add missing env vars (`ANTHROPIC_API_KEY`, `UNISWAP_API_KEY`)

- [ ] Step 4: Fund wallets on X Layer, set `ENABLE_AGENTS=true`

- [ ] Step 5: First live cycle — `bun dev`, POST /api/cycle, watch logs

- [ ] Step 6: Build war room dashboard (`apps/web`)
  - Agent Status cards (name, address, balance, last action)
  - Cycle Feed (action, txHashes, timestamp)
  - Economy view (x402 payments, total USDG paid)
  - Circuit Breaker banner
  - Position table

- [ ] Step 7: Git push to github.com/lucent-labs/helios

## Current
**Status:** Phase 2 complete. Blocked on API keys + wallet funding for Phase 3.

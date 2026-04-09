# Task Plan Helios v1: Phase 4 — Live Cycle + Dashboard + Deploy

## Goal
First live cycle running on X Layer, war room dashboard live on Vercel, agents running on Railway.

---

## Completed (Phase 2 + 3)

- [x] All 15 OKX tools wired to onchainos CLI
- [x] x402 payments — real OKX REST calls in payments.ts
- [x] Agent stubs replaced — real XML structured output (strategist, sentinel, executor)
- [x] Switch AI: `@ai-sdk/anthropic` → `@ai-sdk/openai` (gpt-4o), fix all SDK v6 breaking changes
- [x] tsconfigs fixed: packages/mcp, packages/cli
- [x] vitest configured: apps/agents/vitest.config.ts
- [x] Supabase + Drizzle — schema, client, dual-writes wired into curator.ts, tables live
- [x] HeliosRegistry.sol — audited (14/14 tests), deployed, verified on OKLink
  - Address: `0x5b5F83A465EF625B7d2E6a26c848517fD31D0bb3`
- [x] 4 agents registered on-chain via scripts/register-agents.sh
- [x] All env vars set: OPENAI_API_KEY, UNISWAP_API_KEY, DATABASE_URL, HELIOS_REGISTRY_ADDRESS
- [x] README updated with deployed addresses, tx hashes, OKLink links
- [x] Committed: `7d22fcf` + `b440bf7`

---

## Phase 4 Steps

### Step 1: First live cycle test
- [ ] Set `ENABLE_AGENTS=false`, run `bun dev` in apps/agents
- [ ] Trigger manually: `POST /api/cycle`
- [ ] Confirm all 4 phases run (scan → assess → deploy/park → logCycle)
- [ ] Confirm economy_log.jsonl has entries
- [ ] Confirm Supabase `cycles` + `economy_entries` rows written
- [ ] Confirm HeliosRegistry `logCycle()` tx on OKLink

### Step 2: Build apps/dashboard war room
- [ ] Agent status cards (name, address, role, last action)
- [ ] Cycle feed — SSE stream from `/api/sse`
- [ ] Economy strip — x402 totals per agent
- [ ] Position table — open + closed
- [ ] Circuit breaker banner
- [ ] Connect to `NEXT_PUBLIC_API_URL`

### Step 3: Railway deploy (apps/agents)
- [ ] Create Railway project, connect repo
- [ ] Set all env vars from `.env`
- [ ] Set start command: `bun apps/agents/src/index.ts`
- [ ] Set `ENABLE_AGENTS=true`
- [ ] Verify `/health` endpoint responds

### Step 4: Vercel deploy (apps/dashboard)
- [ ] Connect `apps/dashboard/` subdirectory
- [ ] Set `NEXT_PUBLIC_API_URL` = Railway URL
- [ ] Verify dashboard connects to live agent SSE

### Step 5: Accumulate 1,000 onchain txns
- [ ] Set `CHECK_INTERVAL_MINUTES=30`
- [ ] Monitor cycle count on HeliosRegistry via OKLink
- [ ] Monitor economy loop health

### Step 6: Final push
- [ ] `git push` to github.com/lucent-labs/helios
- [ ] Verify repo is public

---

## Current
**Status:** Phase 3 complete. All infra live. Next: first live cycle test, then dashboard build.

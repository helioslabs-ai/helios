# Task Plan: Helios Improvements

## Testing Strategy

- **Unit tests** (`vitest`): pure logic — parse functions, state transitions, guardrail checks, sizing math
- **Dry-run integration tests**: OKX tool calls with real API keys but read-only endpoints only (no writes). Swap/invest/broadcast marked as `skip` in CI, run manually.
- **No real funds during testing**: `okxSwapExecute`, `okxGatewayBroadcast`, `okxDefiInvest`, `okxDefiCollect` must never be called in automated tests.
- **MCP**: use for spot-checking live API responses against expected schema during development.
- Test files: `src/**/*.test.ts` (vitest already configured)

## Phase Order

1. **Agents** ← current (`phase/agents-improvements`)
2. Dashboard (`phase/dashboard-improvements`)
3. CLI (`phase/cli-improvements`)
4. MCP + Skills (`phase/mcp-skills`)

---

## Phase 1 — Helios Agents

**Branch:** `phase/agents-improvements`

### Critical bugs

- [x] **A1 — Strategy injection ignored** — fixed: uses `config.prompts.strategy`
- [x] **A2 — Position tracking missing** — fixed: writes to `positions.json` on buy, helper functions added
- [x] **A3 — Circuit breaker reset** — fixed: `resetConsecutiveFailures()` added to state.ts, called on clean cycle
- [x] **A4 — `getAllBalances` crash** — fixed: try/catch with zero fallback in curator.ts

### Logic issues

- [x] **A5 — `reScorePositions` runs with no positions** — fixed: early return in sentinel.ts
- [x] **A6 — `getWalletBalance` missing HMAC** — fixed: full HMAC signing in wallet/index.ts
- [x] **A7 — Yield position not tracked** — fixed: writes to `yield.json` after yield_park
- [x] **A8 — `model` hardcoded** — fixed: reads from `configs.curator.llm.model`
- [x] **A9 — maxTradeSize unused** — fixed: included in instruction, prompt updated
- [x] **A10 — Session loss not enforced** — fixed: `checkSessionLoss()` called after each cycle
- [x] **A11 — shouldTimeStop/shouldTakeProfit not called** — fixed: checked in reScorePositions before LLM

### Swap + DeFi execution architecture (critical)

- [x] **A12 — Executor cannot sign transactions — swap execution is broken**
      Fixed: `okxSwapFull` tool added — full TEE signing via OKX WaaS REST (akLogin → preTransactionUnsignedInfo → HPKE decrypt → Ed25519 sign → broadcastAgenticTransaction). `okxDefiDeposit` added — handles `dataList` response shape from `/api/v6/defi/transaction/enter`, iterates APPROVE+DEPOSIT entries. Registry updated: removed `okxSwapExecute`, `okxDefiInvest`, `okxGatewayBroadcast`; added `okxSwapFull`, `okxDefiDeposit`. Wallet/index.ts fully rewritten with TEE session management.

### Uniswap integration

- [x] **A12b — Uniswap `uniswapQuote` API call has wrong types + missing header**
      Per Uniswap trading skill spec:
    1. `tokenInChainId`/`tokenOutChainId` must be **strings** (`"196"`), not numbers (`196`)
    2. Missing required header `x-universal-router-version: 2.0`
       Fix: update `uniswap-trading-api.ts` — stringify chainId, add the missing header. X Layer may be supported; keep chainId 196 but let the API return naturally if not.

### Shared package gap

- [x] **A16 — `TOKEN_ADDRESSES` map missing from `@helios/shared/chains`**
      Executor receives token symbol from strategist (e.g. `"OKB"`, `"WETH"`) but needs contract address for swaps.
      swarmmind-agent has `TOKEN_ADDRESSES[196]` covering X Layer tokens.
      Fix: add `TOKEN_ADDRESSES` map to `packages/shared/src/chains.ts` covering X Layer common tokens (OKB/native, WETH, WBTC, USDC, USDG). Executor tool resolves symbol → address before calling swap.

### Test suite

- [x] **A13 — Vitest tests for critical pure logic**
      53 tests pass. Files covered:
    - `state.ts` — all valid/invalid transitions, circuit breaker trip (halts at 3), haltSwarm, resetConsecutiveFailures, resetCircuitBreaker, isHalted
    - `agents/strategist.ts` — `parseDecision()` with valid XML, missing tag, malformed JSON
    - `agents/sentinel.ts` — `parseVerdict()` same patterns
    - `agents/executor.ts` — `parseResult()` same patterns
    - `@helios/shared/guardrails` — `shouldTimeStop`, `shouldTakeProfit`, `maxTradeSize`, `isAboveMinTrade`, `liquidReserve`
    - `memory/index.ts` — `buildCycleContext` with empty/fixture data

- [ ] **A14 — Dry-run integration tests for OKX read-only tools**
      Test that OKX API calls reach the endpoint and return expected shape (not mocked).
      Read-only only: `okxSwapQuote`, `okxGatewayGas`, `okxSecurityTokenScan`, `okxDexSignal`, `okxTokenHotTokens`.
      Mark write tools (`okxSwapExecute`, `okxGatewayBroadcast`, `okxDefiInvest`) as `.skip` — never run automatically.

### SKILL.md

- [ ] **A15 — Create `SKILL.md` at repo root**
      Spec references `curl https://heliosfi.xyz/skill.md`. Missing. Referenced in prize criteria.
      Document: all CLI commands, MCP tools, REST endpoints, install + quickstart, agent architecture summary.

### Verification

- [x] `tsc --noEmit` clean on all changed files
- [x] Vitest passes — 53 pass / 8 skip
- [ ] Manual dry-run: `POST /api/cycle` — test on Railway after deploy (needs env vars)
- [x] `positions.json` written after buy result — verified via unit tests
- [x] Session loss and guardrail exits verified via unit tests
- [x] Merge to main + push

---

## Phase 2 — Dashboard

**Branch:** `phase/dashboard-improvements`

### Design system

- [x] **D1 — Update color tokens** — `#FFA30F` gold, `#0F0D0E` deepest bg, `#0A0C10` surface in `globals.css`
- [x] **D2 — Logo swap** — `helios-icon.svg` in hero and header
- [x] **D3 — Apply design system** — Syne + JetBrains Mono fonts, radial gold glow, shadcn dark overrides

### Layout restructure

- [x] **D4 — Merge landing + dashboard into one page** — single `HeliosDashboard` component at `/`, leaderboard as embedded tab, `/dashboard` redirects to `/`

### Missing features

- [x] **D5 — Live swarm stats** — SSE `/api/sse` connected; swarm state, circuit breaker banner, last cycle time, consecutive failures
- [x] **D6 — Agent health panel** — `GET /api/agents`; name, address, accountId (backend has no balance field)
- [x] **D7 — Economy panel** — `GET /api/economy`; x402 totals, per-agent earnings, BarChart
- [x] **D8 — Positions panel** — `GET /api/positions`; open trades, closed P&L AreaChart, yield position
- [x] **D9 — Cycle log** — `GET /api/logs`; last N cycles, reasoning, tx hashes, sentinel verdict
- [x] **D10 — Manual cycle trigger** — `POST /api/cycle`; disabled when halted or busy
- [x] **D11 — Leaderboard section** — `GET /api/registry`; rank, return%, PnL, trades, cycles, status badges
- [x] **D12 — Public swarm page** — `/swarm/[curatorAddress]` restyled with Helios dark tokens

### Verification

- [x] All data from live API, no mocks
- [x] SSE stream connected and updating in real time
- [x] `tsc --noEmit` clean
- [x] Deploys cleanly to Vercel (`bun run build` passes)

## Phase 3 — CLI

**Branch:** `phase/cli-improvements`

### Gaps (all 12 commands exist, quality issues only)

- [x] **C1 — Pretty-print all read commands**
      `status`, `agents`, `economy`, `positions`, `logs`, `cycle` all dump raw `console.log(data)`.
      Use `@clack/prompts` box/note/log for readable terminal output.
      `--json` flag bypasses formatting (already wired, just needs the non-JSON path to be pretty).
      Priority layout per command: - `status` → swarm state badge, circuit breaker (halted/ok), last cycle time, consecutive failures - `agents` → table: name | address | accountId - `economy` → total paid, per-agent breakdown (Strategist / Sentinel / Executor earned) - `positions` → open trades table (token, size, entry, P&L%), yield position (protocol, APY, amount) - `logs [n]` → numbered cycle entries: timestamp | action | reasoning | tx hashes - `cycle` → success/error banner with cycleId

- [x] **C2 — http.ts URL resolution**
      Support `HELIOS_API_URL` env var (remote: `api.heliosfi.xyz`) with fallback to `API_URL`.
      `HELIOS_API_URL` takes precedence. Required for CLI to target the live remote instance.

- [x] **C3 — Fix `start` command model hardcode**
      `model: "gpt-4o"` is hardcoded in `start.ts` sent to leaderboard registry.
      Read from env: check `OPENAI_API_KEY` presence, use `"gpt-4o"` as default but allow override via `SWARM_MODEL` env var.

- [x] **C4 — Update SKILL.md**
      Current SKILL.md is missing `start`, `stop`, `strategy`, `guardrails`, `seed` in the CLI table.
      References `apps/web` (old) — update to `apps/dashboard`.
      Env vars section: remove `ANTHROPIC_API_KEY` (not used), add `OPENAI_API_KEY`, `UNISWAP_API_KEY`.
      Fix homepage/docs URLs to use `github.com/helioslabs-ai/helios`.
      Add `HELIOS_API_URL` to env table for remote targeting.

### Verification

- [x] `bun run packages/cli/src/index.ts status` — formatted output, not raw object
- [x] `bun run packages/cli/src/index.ts logs 3` — readable cycle entries
- [x] `bun run packages/cli/src/index.ts status --json` — clean JSON
- [x] `HELIOS_API_URL=https://api.heliosfi.xyz bun run packages/cli/src/index.ts status` — hits remote
- [x] `tsc --noEmit` clean on cli package

## Phase 4 — MCP + Skills

_Tasks TBD when Phase 3 merges_

## Phase 5 - Live + Submission

- deploy helios-agents live managing real capital
- 1000+ onchain tnx accumulated (11th-15th April)
- Moltbook: register agent, subscribe to m/buildx, post ProjectSubmission, vote ≥5 (Agent Track)

- codebase clean
- README and docs polish
- Demo video (1-3mins)
- X post #XLayerHackathon @XLayerOfficial
- Google Form submission (Human Track)

---

## Current

**Working on:** Phase 4 — MCP + Skills
**Branch:** `phase/mcp-skills` (to be created)
**Status:** Phase 3 complete. All CLI commands pretty-printed, HELIOS_API_URL supported, SKILL.md updated. tsc clean.
**Next:** Create `phase/mcp-skills` branch. Tasks TBD — MCP server improvements, Skills Arena deliverables.

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
- [x] **A11b — Memecoin trade targets blocked by Sentinel** — `isXLayerSafeTradeContract` allowlist (USDC, USDG, WOKB, WETH, WBTC, OKB); strategist normalizes trench picks (e.g. XDOG) to WOKB before `/sentinel/assess`.

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
      `model: "gpt-4o-mini"` is hardcoded in `start.ts` sent to leaderboard registry.
      Read from env: check `OPENAI_API_KEY` presence, use `"gpt-4o-mini"` as default but allow override via `SWARM_MODEL` env var.

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

**Branch:** `phase/mcp-skills`

### MCP server

- [x] **M1 — Fix `get_signals` tool** — now calls `/api/logs?n=1`; exposes latest cycle reasoning/action
- [x] **M2 — Add `get_agents` tool** — calls `/api/agents`
- [x] **M3 — Add `get_registry` tool** — calls `/api/registry`; returns leaderboard
- [x] **M4 — Add missing resources** — `helios://positions`, `helios://agents` added
- [x] **M5 — Version bump** — `"0.0.1"` → `"1.0.0"` in package.json + McpServer init

### Skills / discoverability

- [x] **M6 — Create `.mcp.json` at repo root** — points to `https://api.heliosfi.xyz`

### Integration tests (A14 from Phase 1)

- [x] **M7 — Dry-run integration tests for OKX read-only tools**
      File: `apps/agents/src/tools/okx-integration.test.ts` — already existed and was complete
      Read-only: `okxSwapQuote`, `okxGatewayGas`, `okxSecurityTokenScan`, `okxDexSignal`, `okxTokenHotTokens`
      Write tools: `.skip` — `okxSwapFull`, `okxGatewayBroadcast`, `okxDefiDeposit`

### Verification

- [x] `bun biome check packages/mcp/` — clean
- [x] `tsc --noEmit` on mcp package — clean
- [x] `zod` added to mcp deps (v3 for SDK compatibility)

## Phase 5 - Live + Submission

**Branch:** `main`

### Code tasks (done)

- [x] **P1 — Codebase clean** — biome: 0 errors, 10 style warnings only. Auto-fixed 14 files.
- [x] **P2 — README polish** — added "X Layer Ecosystem Positioning" section (required field per hackathon rules)
- [x] **P3 — SKILL.md live** — verified at heliosfi.xyz/skill.md (v1.0.0, 8 MCP tools)

### Manual tasks (you)

- [x] **P4 — Fund wallets + start agents** — `helios start` on live Render instance with real capital
- [x] **P5 — Accumulate 1000+ onchain txns** — automated once agents are running (target before Apr 15)
- [ ] **P6 — Moltbook Agent Track**
      - Register Helios agent on Moltbook
      - Subscribe to m/buildx
      - Post ProjectSubmission with template
      - Vote ≥5 projects
- [ ] **P7 — Demo video** — 1–3 min, upload to YouTube or Google Drive, get public link
- [ ] **P8 — X post** — #XLayerHackathon @XLayerOfficial, include project name + images/video
- [ ] **P9 — Google Form submission** — before Apr 15, 23:59 UTC
      https://docs.google.com/forms/d/e/1FAIpQLSfEjzs4ny2yH04tfDXs14Byye1KYhXv6NeytpqSKhrqTtgKqg/viewform

---

## Current

**Working on:** Phase 5 — Live + Submission
**Branch:** `main`
**Status:** P1-P3 done. Codebase clean, README complete. Waiting on live agent deployment + manual submission tasks.
**Next:** P4 fund wallets + start agents → P5 accumulate txns → P6-P9 submission checklist.
**Next:** Deploy agents live, accumulate 1000+ onchain txns, Moltbook registration, README polish, demo video, submit.

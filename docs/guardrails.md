# Helios — Guardrails & Safety

Three independent layers that don't depend on each other. If one fails, the next catches it.

```
Layer 1 — Prompt      soft,  AI-level,     per agent decision
Layer 2 — Code        hard,  TypeScript,   pre-execution checks (non-bypassable)
Layer 3 — Onchain     hard,  Solidity,     emergency pause only
```

---

## Layer 1 — Prompt Guardrails

Each agent's system prompt defines hard limits on what it will recommend.

| Agent      | Prompt constraint                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| Strategist | Never force a signal below 60/100 composite score. Return `no_alpha` if nothing clears the threshold.                      |
| Sentinel   | CLEAR only at safety score ≥ 70/100. BLOCK on any flag from `okx-security` regardless of score.                           |
| Executor   | Never execute without an explicit Sentinel CLEAR in the current cycle. Always simulate via `okx-onchain-gateway` first.    |
| Curator    | Never issue two cycles simultaneously. Keep 25% of Executor wallet liquid — never deploy the full balance.                 |

---

## Layer 2 — Code Guardrails

Hard rules enforced in TypeScript **before** any OKX API call or onchain transaction. Claude's recommendation is irrelevant if these checks fail.

### Constants (`packages/shared/src/guardrails.ts`)

```typescript
export const GUARDRAILS = {
  MAX_TRADE_SIZE_PCT: 0.20,         // max 20% of Executor wallet per trade
  MAX_POSITION_USD: 1.00,           // absolute hard cap — protects $4 Executor wallet
  MIN_TRADE_SIZE_USD: 0.25,         // skip if gas cost exceeds potential return
  LIQUID_RESERVE_PCT: 0.25,         // always keep 25% of Executor wallet liquid

  MIN_TOKEN_LIQUIDITY_USD: 50_000,  // skip tokens with < $50k pool depth
  MAX_SLIPPAGE_BPS: 50,             // 0.5% slippage cap on DEX swaps

  MAX_DAILY_DRAWDOWN_PCT: 0.15,     // halt if wallet drops 15% in 24h
  MAX_SESSION_LOSS_USD: 2.00,       // halt if Executor loses $2 in one run
  MAX_CONSECUTIVE_FAILURES: 3,      // halt after 3 consecutive deploy failures
} as const;
```

### Position Sizing — Half-Kelly (`packages/shared/src/sizing.ts`)

Fixed percentage sizing ignores signal confidence. Half-Kelly scales position size with Strategist's confidence score automatically — low-confidence signals get smaller trades.

```typescript
export function kellySize(
  confidence: number,           // Strategist confidence 0–100
  executorBalanceUsd: number,
  params: KellyParams = {},     // calibrated from trade history after ≥5 resolved trades
): { sizeUsd: number; sizePct: number }
```

Conservative defaults until ≥5 trades calibrate the model: `winRate=0.55, avgWin=0.12, avgLoss=0.05`.

### Pre-Execution Check (`packages/shared/src/guardrails.ts`)

Runs in `executor.ts` before every swap call. Hard gate — no exceptions.

```typescript
export async function preExecutionCheck(
  token: string,
  sizeUsd: number,
  executorBalanceUsd: number,
): Promise<{ approved: boolean; reason: string | null }>
```

Checks in order: max position size (20%), absolute cap ($1.00), minimum size ($0.25), liquid reserve (25%), pool liquidity via `okx-dex-token` (≥$50k).

### Circuit Breaker (`apps/agents/src/state.ts`)

Two independent thresholds:

```typescript
export function checkCircuitBreaker(
  executorBalanceUsd: number,
  dailyPnlUsd: number,
  sessionLossUsd: number,
  consecutiveFailures: number,
): { halted: boolean; reason: string | null }
```

| Threshold            | Value | Reset                                    |
| -------------------- | ----- | ---------------------------------------- |
| Daily drawdown       | 15%   | Automatic at UTC midnight                |
| Session loss         | $2.00 | Manual `helios reset` only               |
| Consecutive failures | 3     | Manual reset or successful next cycle    |

Daily drawdown resets at midnight (appropriate for a multi-day run). Session loss does not reset automatically — prevents a runaway failure loop if something is structurally wrong with market conditions.

On halt: Curator parks all USDC in Aave V3 and stops issuing cycles.

### Cycle Execution Order

Exit checks run **first** — manage existing positions before scanning for new ones.

```
1. checkCircuitBreaker()          ← halt if tripped
2. checkExistingPositions()       ← re-score held tokens via Sentinel
   → if BLOCK: Executor sells → USDC
   → if time stop (72h): Executor sells
   → if take-profit (+20%): Executor sells
3. pay Strategist (x402) → scan
4. if signal → pay Sentinel (x402) → assess
5. if CLEAR → preExecutionCheck() → kellySize() → pay Executor (x402) → swap
6. no-alpha: Curator → okx-defi-invest → Aave V3 deposit
7. log cycle, sync Supabase
```

---

## Layer 3 — Onchain Guardrails (HeliosRegistry)

A single safety function — `pause()`. When triggered, agents cannot log new missions. Curator reads registry state at the start of each cycle and halts if paused.

```solidity
function pause() external onlyOwner {
    _paused = true;
    emit SwarmPaused(msg.sender, block.timestamp);
}
```

This is the emergency stop — used only when something is wrong that code-level checks didn't catch.

---

## Key Files

| File                                  | Purpose                                          |
| ------------------------------------- | ------------------------------------------------ |
| `packages/shared/src/guardrails.ts`   | All Layer 2 constants + preExecutionCheck()      |
| `packages/shared/src/sizing.ts`       | kellySize() + calibrateKelly()                   |
| `apps/agents/src/state.ts`            | checkCircuitBreaker(), recordPnL(), state machine |
| `contracts/src/HeliosRegistry.sol`    | pause() / unpause()                              |

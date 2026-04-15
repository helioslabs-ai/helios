export const GUARDRAILS = {
  MAX_TRADE_SIZE_PCT: 0.2,
  MAX_POSITION_USD: 1.0,
  MIN_TRADE_SIZE_USD: 0.25,
  /** Cap per yield-park swap / Aave leg so Executor balance is not drained (e.g. 0.24 → max 0.10). */
  YIELD_PARK_MAX_USD: 0.1,
  /** Minimum notional for a yield-park leg; below this we skip. */
  YIELD_PARK_MIN_USD: 0.05,
  LIQUID_RESERVE_PCT: 0.25,
  MAX_DAILY_DRAWDOWN_PCT: 0.15,
  MAX_SESSION_LOSS_USD: 2.0,
  MAX_SLIPPAGE_BPS: 50,
  CIRCUIT_BREAKER_MAX_FAILURES: 3,
  TIME_STOP_HOURS: 72,
  TAKE_PROFIT_PCT: 0.2,
} as const;

export function maxTradeSize(walletBalanceUsdc: number): number {
  const sized = walletBalanceUsdc * GUARDRAILS.MAX_TRADE_SIZE_PCT;
  return Math.min(sized, GUARDRAILS.MAX_POSITION_USD);
}

export function isAboveMinTrade(amountUsdc: number): boolean {
  return amountUsdc >= GUARDRAILS.MIN_TRADE_SIZE_USD;
}

/** Spend for one yield-park leg after liquidity reserve (capped, floored). */
export function yieldParkSpendUsd(
  usableAfterReserve: number,
  maxUsd: number = GUARDRAILS.YIELD_PARK_MAX_USD,
): number {
  if (usableAfterReserve < GUARDRAILS.YIELD_PARK_MIN_USD) return 0;
  return Math.min(usableAfterReserve, maxUsd);
}

export function liquidReserve(walletBalanceUsdc: number): number {
  return walletBalanceUsdc * GUARDRAILS.LIQUID_RESERVE_PCT;
}

export function shouldTakeProfit(pnlPct: number): boolean {
  return pnlPct >= GUARDRAILS.TAKE_PROFIT_PCT;
}

export function shouldTimeStop(enteredAt: string): boolean {
  const elapsed = Date.now() - new Date(enteredAt).getTime();
  return elapsed > GUARDRAILS.TIME_STOP_HOURS * 60 * 60 * 1000;
}

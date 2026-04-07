export const GUARDRAILS = {
  MAX_TRADE_SIZE_PCT: 0.2,
  MAX_POSITION_USD: 1.0,
  MIN_TRADE_SIZE_USD: 0.25,
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

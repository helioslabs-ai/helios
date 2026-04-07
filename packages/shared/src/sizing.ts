import { GUARDRAILS } from "./guardrails.js";

type KellyParams = {
  winRate: number;
  avgWin: number;
  avgLoss: number;
};

const DEFAULT_KELLY: KellyParams = {
  winRate: 0.55,
  avgWin: 0.12,
  avgLoss: 0.05,
};

export function halfKelly(walletBalanceUsdc: number, params: KellyParams = DEFAULT_KELLY): number {
  const { winRate, avgWin, avgLoss } = params;
  const kellyFraction = winRate / avgLoss - (1 - winRate) / avgWin;
  const halfKellyFraction = kellyFraction / 2;
  const clamped = Math.max(0, Math.min(halfKellyFraction, GUARDRAILS.MAX_TRADE_SIZE_PCT));
  const sized = walletBalanceUsdc * clamped;

  return Math.min(Math.max(sized, GUARDRAILS.MIN_TRADE_SIZE_USD), GUARDRAILS.MAX_POSITION_USD);
}

export function calibrateKelly(
  trades: Array<{ pnlPct: number }>,
  minTrades: number = 5,
): KellyParams {
  if (trades.length < minTrades) return DEFAULT_KELLY;

  const wins = trades.filter((t) => t.pnlPct > 0);
  const losses = trades.filter((t) => t.pnlPct <= 0);

  return {
    winRate: wins.length / trades.length,
    avgWin:
      wins.length > 0
        ? wins.reduce((sum, t) => sum + t.pnlPct, 0) / wins.length
        : DEFAULT_KELLY.avgWin,
    avgLoss:
      losses.length > 0
        ? Math.abs(losses.reduce((sum, t) => sum + t.pnlPct, 0) / losses.length)
        : DEFAULT_KELLY.avgLoss,
  };
}

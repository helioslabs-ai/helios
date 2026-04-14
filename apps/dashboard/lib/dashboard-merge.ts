import type { CycleSummary, TransactionRow } from "./types";

export function mergeCycles(prev: CycleSummary[], incoming: CycleSummary[]): CycleSummary[] {
  const ids = new Set(prev.map((c) => c.id));
  const newOnes = incoming.filter((c) => !ids.has(c.id));
  return [...prev, ...newOnes].slice(-100);
}

export function mergeTransactions(
  prev: TransactionRow[],
  incoming: TransactionRow[],
): TransactionRow[] {
  const keys = new Set(prev.map((tx) => `${tx.txHash}-${tx.cycleId}`));
  const newOnes = incoming.filter((tx) => !keys.has(`${tx.txHash}-${tx.cycleId}`));
  return [...prev, ...newOnes].slice(-2000);
}

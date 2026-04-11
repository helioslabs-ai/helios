import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentName, CycleContext, CycleSummary, Position } from "../types.js";

const META_DIR = (import.meta as { dir?: string }).dir ?? dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(META_DIR, "../data");

function readJsonl<T>(filename: string): T[] {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function readJson<T>(filename: string, fallback: T): T {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function buildCycleContext(walletBalances: Record<AgentName, string>): CycleContext {
  const cycles = readJsonl<CycleSummary>("cycle_log.jsonl");
  const positions = readJson<Position[]>("positions.json", []);

  const lastN = cycles.slice(-5);
  const openPositions = positions.filter((p) => p.status === "open");

  const totalCycles = cycles.length;
  const _recentNoAlpha = lastN.filter((c) => c.action === "no_alpha").length;
  const consecutiveNoAlpha = countTrailingNoAlpha(cycles);

  return {
    lastN,
    openPositions,
    walletBalances,
    totalCycles,
    consecutiveNoAlpha,
  };
}

function countTrailingNoAlpha(cycles: CycleSummary[]): number {
  let count = 0;
  for (let i = cycles.length - 1; i >= 0; i--) {
    if (cycles[i]?.action === "no_alpha") count++;
    else break;
  }
  return count;
}

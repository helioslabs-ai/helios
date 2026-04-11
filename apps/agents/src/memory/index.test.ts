import { existsSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CycleSummary, Position } from "../types.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("node:url", () => ({
  fileURLToPath: vi.fn(() => "/mock/memory/index.ts"),
}));

import { buildCycleContext } from "./index.js";

const WALLET_BALANCES = {
  curator: "4.00",
  strategist: "1.00",
  sentinel: "1.00",
  executor: "4.00",
};

beforeEach(() => {
  vi.mocked(existsSync).mockReturnValue(false);
  vi.mocked(readFileSync).mockReturnValue("");
});

describe("buildCycleContext", () => {
  it("returns zeroed context when data files are absent", () => {
    const ctx = buildCycleContext(WALLET_BALANCES);
    expect(ctx.totalCycles).toBe(0);
    expect(ctx.consecutiveNoAlpha).toBe(0);
    expect(ctx.openPositions).toEqual([]);
    expect(ctx.lastN).toEqual([]);
    expect(ctx.walletBalances).toEqual(WALLET_BALANCES);
  });

  it("counts total cycles from cycle_log.jsonl", () => {
    const cycles: CycleSummary[] = [
      { id: "1", ts: "t", action: "buy", reasoning: "", txHashes: [] },
      { id: "2", ts: "t", action: "no_alpha", reasoning: "", txHashes: [] },
      { id: "3", ts: "t", action: "yield_park", reasoning: "", txHashes: [] },
    ];
    vi.mocked(existsSync).mockImplementation((p) => String(p).includes("cycle_log"));
    vi.mocked(readFileSync).mockImplementation((p) => {
      if (String(p).includes("cycle_log")) return cycles.map((c) => JSON.stringify(c)).join("\n");
      return "";
    });

    const ctx = buildCycleContext(WALLET_BALANCES);
    expect(ctx.totalCycles).toBe(3);
  });

  it("returns last 5 cycles in lastN", () => {
    const cycles: CycleSummary[] = Array.from({ length: 7 }, (_, i) => ({
      id: String(i),
      ts: "t",
      action: "no_alpha" as const,
      reasoning: "",
      txHashes: [],
    }));
    vi.mocked(existsSync).mockImplementation((p) => String(p).includes("cycle_log"));
    vi.mocked(readFileSync).mockImplementation((p) => {
      if (String(p).includes("cycle_log")) return cycles.map((c) => JSON.stringify(c)).join("\n");
      return "";
    });

    const ctx = buildCycleContext(WALLET_BALANCES);
    expect(ctx.lastN).toHaveLength(5);
  });

  it("counts consecutive trailing no_alpha cycles", () => {
    const cycles: CycleSummary[] = [
      { id: "1", ts: "t", action: "buy", reasoning: "", txHashes: [] },
      { id: "2", ts: "t", action: "no_alpha", reasoning: "", txHashes: [] },
      { id: "3", ts: "t", action: "no_alpha", reasoning: "", txHashes: [] },
      { id: "4", ts: "t", action: "no_alpha", reasoning: "", txHashes: [] },
    ];
    vi.mocked(existsSync).mockImplementation((p) => String(p).includes("cycle_log"));
    vi.mocked(readFileSync).mockImplementation((p) => {
      if (String(p).includes("cycle_log")) return cycles.map((c) => JSON.stringify(c)).join("\n");
      return "";
    });

    const ctx = buildCycleContext(WALLET_BALANCES);
    expect(ctx.consecutiveNoAlpha).toBe(3);
  });

  it("resets consecutive count when last cycle is not no_alpha", () => {
    const cycles: CycleSummary[] = [
      { id: "1", ts: "t", action: "no_alpha", reasoning: "", txHashes: [] },
      { id: "2", ts: "t", action: "no_alpha", reasoning: "", txHashes: [] },
      { id: "3", ts: "t", action: "buy", reasoning: "", txHashes: [] },
    ];
    vi.mocked(existsSync).mockImplementation((p) => String(p).includes("cycle_log"));
    vi.mocked(readFileSync).mockImplementation((p) => {
      if (String(p).includes("cycle_log")) return cycles.map((c) => JSON.stringify(c)).join("\n");
      return "";
    });

    const ctx = buildCycleContext(WALLET_BALANCES);
    expect(ctx.consecutiveNoAlpha).toBe(0);
  });

  it("includes only open positions", () => {
    const positions: Position[] = [
      { token: "OKB", contractAddress: "0x1", entryPrice: "1.00", sizeUsdc: "0.80", entryTxHash: "0xa", enteredAt: new Date().toISOString(), status: "open" },
      { token: "WETH", contractAddress: "0x2", entryPrice: "2.00", sizeUsdc: "1.00", entryTxHash: "0xb", enteredAt: new Date().toISOString(), status: "closed" },
    ];
    vi.mocked(existsSync).mockImplementation((p) => String(p).includes("positions"));
    vi.mocked(readFileSync).mockImplementation((p) => {
      if (String(p).includes("positions")) return JSON.stringify(positions);
      return "";
    });

    const ctx = buildCycleContext(WALLET_BALANCES);
    expect(ctx.openPositions).toHaveLength(1);
    expect(ctx.openPositions[0]?.token).toBe("OKB");
  });
});

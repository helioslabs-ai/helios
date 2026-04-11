import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("node:url", () => ({
  fileURLToPath: vi.fn(() => "/mock/state.ts"),
}));

let storedState: Record<string, unknown> | undefined;

beforeEach(() => {
  storedState = undefined;
  vi.mocked(existsSync).mockReturnValue(false);
  vi.mocked(readFileSync).mockImplementation(() => {
    if (storedState) return JSON.stringify(storedState);
    throw new Error("no file");
  });
  vi.mocked(writeFileSync).mockImplementation((_path, data) => {
    storedState = JSON.parse(data as string);
  });
});

import {
  haltSwarm,
  isHalted,
  isValidTransition,
  resetCircuitBreaker,
  resetConsecutiveFailures,
  tripCircuitBreaker,
} from "./state.js";

describe("isValidTransition", () => {
  it("allows IDLE → STRATEGIST_SCAN", () => {
    expect(isValidTransition("IDLE", "STRATEGIST_SCAN")).toBe(true);
  });

  it("allows STRATEGIST_SCAN → SENTINEL_CHECK", () => {
    expect(isValidTransition("STRATEGIST_SCAN", "SENTINEL_CHECK")).toBe(true);
  });

  it("allows STRATEGIST_SCAN → YIELD_PARK", () => {
    expect(isValidTransition("STRATEGIST_SCAN", "YIELD_PARK")).toBe(true);
  });

  it("allows SENTINEL_CHECK → EXECUTOR_DEPLOY", () => {
    expect(isValidTransition("SENTINEL_CHECK", "EXECUTOR_DEPLOY")).toBe(true);
  });

  it("allows EXECUTOR_DEPLOY → COMPOUNDING", () => {
    expect(isValidTransition("EXECUTOR_DEPLOY", "COMPOUNDING")).toBe(true);
  });

  it("allows COMPOUNDING → IDLE", () => {
    expect(isValidTransition("COMPOUNDING", "IDLE")).toBe(true);
  });

  it("allows YIELD_PARK → IDLE", () => {
    expect(isValidTransition("YIELD_PARK", "IDLE")).toBe(true);
  });

  it("rejects IDLE → EXECUTOR_DEPLOY (skip step)", () => {
    expect(isValidTransition("IDLE", "EXECUTOR_DEPLOY")).toBe(false);
  });

  it("rejects COMPOUNDING → STRATEGIST_SCAN (backwards)", () => {
    expect(isValidTransition("COMPOUNDING", "STRATEGIST_SCAN")).toBe(false);
  });

  it("rejects YIELD_PARK → EXECUTOR_DEPLOY", () => {
    expect(isValidTransition("YIELD_PARK", "EXECUTOR_DEPLOY")).toBe(false);
  });
});

describe("tripCircuitBreaker", () => {
  it("increments consecutiveFailures on first call", () => {
    tripCircuitBreaker("network error");
    const state = storedState as { circuitBreaker: { consecutiveFailures: number; halted: boolean } };
    expect(state.circuitBreaker.consecutiveFailures).toBe(1);
    expect(state.circuitBreaker.halted).toBe(false);
  });

  it("halts after 3 trips (CIRCUIT_BREAKER_MAX_FAILURES)", () => {
    tripCircuitBreaker("err1");
    vi.mocked(existsSync).mockReturnValue(true);
    tripCircuitBreaker("err2");
    tripCircuitBreaker("err3");
    const state = storedState as { circuitBreaker: { consecutiveFailures: number; halted: boolean; reason: string } };
    expect(state.circuitBreaker.halted).toBe(true);
    expect(state.circuitBreaker.reason).toBe("err3");
  });
});

describe("haltSwarm", () => {
  it("sets halted immediately with reason", () => {
    haltSwarm("session loss exceeded $2");
    const state = storedState as { circuitBreaker: { halted: boolean; reason: string } };
    expect(state.circuitBreaker.halted).toBe(true);
    expect(state.circuitBreaker.reason).toBe("session loss exceeded $2");
  });
});

describe("resetConsecutiveFailures", () => {
  it("sets consecutiveFailures to 0", () => {
    tripCircuitBreaker("err");
    vi.mocked(existsSync).mockReturnValue(true);
    resetConsecutiveFailures();
    const state = storedState as { circuitBreaker: { consecutiveFailures: number } };
    expect(state.circuitBreaker.consecutiveFailures).toBe(0);
  });
});

describe("resetCircuitBreaker", () => {
  it("clears halted, reason, and consecutiveFailures", () => {
    haltSwarm("test halt");
    vi.mocked(existsSync).mockReturnValue(true);
    resetCircuitBreaker();
    const state = storedState as { circuitBreaker: { halted: boolean; reason: unknown; consecutiveFailures: number } };
    expect(state.circuitBreaker.halted).toBe(false);
    expect(state.circuitBreaker.reason).toBeNull();
    expect(state.circuitBreaker.consecutiveFailures).toBe(0);
  });
});

describe("isHalted", () => {
  it("returns false when no state file exists", () => {
    expect(isHalted()).toBe(false);
  });

  it("returns true after haltSwarm", () => {
    haltSwarm("operator stop");
    vi.mocked(existsSync).mockReturnValue(true);
    expect(isHalted()).toBe(true);
  });
});

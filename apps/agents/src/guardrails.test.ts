import {
  GUARDRAILS,
  isAboveMinTrade,
  liquidReserve,
  maxTradeSize,
  shouldTakeProfit,
  shouldTimeStop,
} from "@helios/shared/guardrails";
import { describe, expect, it } from "vitest";

describe("maxTradeSize", () => {
  it("caps at MAX_POSITION_USD when 20% exceeds $1", () => {
    expect(maxTradeSize(10)).toBe(1.0);
    expect(maxTradeSize(100)).toBe(1.0);
  });

  it("returns 20% of balance when under cap", () => {
    expect(maxTradeSize(4)).toBeCloseTo(0.8);
    expect(maxTradeSize(3)).toBeCloseTo(0.6);
  });

  it("returns 0 for zero balance", () => {
    expect(maxTradeSize(0)).toBe(0);
  });
});

describe("isAboveMinTrade", () => {
  it("returns true at or above MIN_TRADE_SIZE_USD ($0.25)", () => {
    expect(isAboveMinTrade(0.25)).toBe(true);
    expect(isAboveMinTrade(1.0)).toBe(true);
  });

  it("returns false below minimum", () => {
    expect(isAboveMinTrade(0.24)).toBe(false);
    expect(isAboveMinTrade(0)).toBe(false);
  });
});

describe("liquidReserve", () => {
  it("returns 25% of wallet balance", () => {
    expect(liquidReserve(4)).toBeCloseTo(1.0);
    expect(liquidReserve(10)).toBeCloseTo(2.5);
  });
});

describe("shouldTakeProfit", () => {
  it("triggers at TAKE_PROFIT_PCT (0.20 = 20%)", () => {
    expect(shouldTakeProfit(GUARDRAILS.TAKE_PROFIT_PCT)).toBe(true);
    expect(shouldTakeProfit(0.21)).toBe(true);
    expect(shouldTakeProfit(0.5)).toBe(true);
  });

  it("does not trigger below threshold", () => {
    expect(shouldTakeProfit(0.19)).toBe(false);
    expect(shouldTakeProfit(0)).toBe(false);
  });
});

describe("shouldTimeStop", () => {
  it("triggers when elapsed time exceeds 72 hours", () => {
    const old = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();
    expect(shouldTimeStop(old)).toBe(true);
  });

  it("does not trigger within 72 hours", () => {
    const recent = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(shouldTimeStop(recent)).toBe(false);
  });

  it("does not trigger for just-entered position", () => {
    expect(shouldTimeStop(new Date().toISOString())).toBe(false);
  });
});

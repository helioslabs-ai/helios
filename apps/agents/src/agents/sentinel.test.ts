import { TOKEN_ADDRESSES } from "@helios/shared/chains";
import { describe, expect, it } from "vitest";
import type { AgentConfig } from "../types.js";
import { parseVerdict, runSentinelAssessment } from "./sentinel.js";

const minimalSentinelConfig = {
  name: "sentinel",
  wallet: {
    accountId: "test",
    address: "0x0000000000000000000000000000000000000001" as `0x${string}`,
  },
  tools: {},
  llm: { model: "gpt-4o-mini", apiKey: "" },
  prompts: { strategy: "", budget: "" },
} as AgentConfig;

describe("runSentinelAssessment allowlist", () => {
  it("returns CLEAR for WOKB without calling the LLM", async () => {
    const ctx = {
      lastN: [],
      openPositions: [],
      walletBalances: {} as Record<string, string>,
      totalCycles: 0,
      consecutiveNoAlpha: 0,
    };
    const r = await runSentinelAssessment(minimalSentinelConfig, "WOKB", TOKEN_ADDRESSES.WOKB, ctx);
    expect(r.verdict).toBe("CLEAR");
    expect(r.riskScore).toBeGreaterThanOrEqual(90);
    expect(r.flags).toContain("allowlisted_major");
  });
});

describe("parseVerdict", () => {
  it("parses a CLEAR verdict", () => {
    const text = `
      Security scan complete.
      <VERDICT>
      {
        "verdict": "CLEAR",
        "riskScore": 88,
        "flags": [],
        "reasoning": "No honeypot, sufficient liquidity"
      }
      </VERDICT>
    `;
    const result = parseVerdict(text);
    expect(result.verdict).toBe("CLEAR");
    expect(result.riskScore).toBe(88);
    expect(result.flags).toEqual([]);
    expect(result.reasoning).toBe("No honeypot, sufficient liquidity");
  });

  it("parses a BLOCK verdict with flags", () => {
    const text = `
      <VERDICT>
      {
        "verdict": "BLOCK",
        "riskScore": 30,
        "flags": ["honeypot", "low_liquidity"],
        "reasoning": "Honeypot detected"
      }
      </VERDICT>
    `;
    const result = parseVerdict(text);
    expect(result.verdict).toBe("BLOCK");
    expect(result.riskScore).toBe(30);
    expect(result.flags).toEqual(["honeypot", "low_liquidity"]);
  });

  it("defaults to BLOCK when VERDICT tag is missing", () => {
    const result = parseVerdict("Analysis complete but no verdict tag found.");
    expect(result.verdict).toBe("BLOCK");
    expect(result.riskScore).toBe(0);
    expect(result.flags).toEqual(["parse_error"]);
    expect(result.reasoning).toBe("Could not parse verdict — defaulting to BLOCK");
  });

  it("defaults to BLOCK when JSON is malformed", () => {
    const text = "<VERDICT>{ bad json }</VERDICT>";
    const result = parseVerdict(text);
    expect(result.verdict).toBe("BLOCK");
    expect(result.riskScore).toBe(0);
    expect(result.flags).toEqual(["parse_error"]);
    expect(result.reasoning).toBe("JSON parse failed — defaulting to BLOCK");
  });

  it("treats unknown verdict strings as BLOCK", () => {
    const text =
      '<VERDICT>{"verdict":"UNKNOWN","riskScore":50,"flags":[],"reasoning":"test"}</VERDICT>';
    const result = parseVerdict(text);
    expect(result.verdict).toBe("BLOCK");
  });

  it("fills missing fields with defaults", () => {
    const text = '<VERDICT>{"verdict":"CLEAR"}</VERDICT>';
    const result = parseVerdict(text);
    expect(result.verdict).toBe("CLEAR");
    expect(result.riskScore).toBe(0);
    expect(result.flags).toEqual([]);
    expect(result.reasoning).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { parseVerdict } from "./sentinel.js";

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

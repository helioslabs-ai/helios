import { TOKEN_ADDRESSES } from "@helios/shared/chains";
import { describe, expect, it } from "vitest";
import { parseDecision } from "./strategist.js";

describe("parseDecision", () => {
  it("parses a valid trade decision", () => {
    const text = `
      Some analysis...
      <DECISION>
      {
        "recommendation": "trade",
        "topToken": "OKB",
        "topContract": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "compositeScore": 0.78,
        "signalCount": 5,
        "reasoning": "Strong momentum signals"
      }
      </DECISION>
    `;
    const result = parseDecision(text);
    expect(result.recommendation).toBe("trade");
    expect(result.topToken).toBe("OKB");
    expect(result.topContract).toBe("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
    expect(result.compositeScore).toBe(0.78);
    expect(result.signalCount).toBe(5);
    expect(result.reasoning).toBe("Strong momentum signals");
  });

  it("parses a yield recommendation and promotes to trade for pipeline continuity", () => {
    const text = `
      <DECISION>
      {"recommendation":"yield","topToken":null,"topContract":null,"compositeScore":0.3,"signalCount":2,"reasoning":"No strong alpha"}
      </DECISION>
    `;
    const result = parseDecision(text);
    expect(result.recommendation).toBe("trade");
    expect(result.topToken).toBe("WOKB");
    expect(result.topContract).toBe(TOKEN_ADDRESSES.WOKB);
  });

  it("normalizes missing DECISION tag to a trade fallback", () => {
    const result = parseDecision("No alpha found today, markets look flat.");
    expect(result.recommendation).toBe("trade");
    expect(result.topToken).toBe("WOKB");
    expect(result.topContract).toBe(TOKEN_ADDRESSES.WOKB);
    expect(result.compositeScore).toBeGreaterThanOrEqual(0.35);
  });

  it("normalizes malformed JSON inside DECISION to a trade fallback", () => {
    const text = "<DECISION>{ this is not json }</DECISION>";
    const result = parseDecision(text);
    expect(result.recommendation).toBe("trade");
    expect(result.reasoning).toBe("Failed to parse decision block");
    expect(result.topContract).toBe(TOKEN_ADDRESSES.WOKB);
  });

  it("fills missing fields and normalizes no_alpha to trade", () => {
    const text = '<DECISION>{"recommendation":"no_alpha"}</DECISION>';
    const result = parseDecision(text);
    expect(result.recommendation).toBe("trade");
    expect(result.topToken).toBe("WOKB");
    expect(result.topContract).toBe(TOKEN_ADDRESSES.WOKB);
    expect(result.compositeScore).toBeGreaterThanOrEqual(0.35);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });
});

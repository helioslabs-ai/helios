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

  it("parses a yield recommendation", () => {
    const text = `
      <DECISION>
      {"recommendation":"yield","topToken":null,"topContract":null,"compositeScore":0.3,"signalCount":2,"reasoning":"No strong alpha"}
      </DECISION>
    `;
    const result = parseDecision(text);
    expect(result.recommendation).toBe("yield");
    expect(result.topToken).toBeNull();
  });

  it("returns no_alpha fallback when DECISION tag is missing", () => {
    const result = parseDecision("No alpha found today, markets look flat.");
    expect(result.recommendation).toBe("no_alpha");
    expect(result.topToken).toBeNull();
    expect(result.topContract).toBeNull();
    expect(result.compositeScore).toBe(0);
    expect(result.signalCount).toBe(0);
  });

  it("returns no_alpha fallback when JSON inside tag is malformed", () => {
    const text = "<DECISION>{ this is not json }</DECISION>";
    const result = parseDecision(text);
    expect(result.recommendation).toBe("no_alpha");
    expect(result.reasoning).toBe("Failed to parse decision block");
  });

  it("fills missing fields with defaults", () => {
    const text = '<DECISION>{"recommendation":"no_alpha"}</DECISION>';
    const result = parseDecision(text);
    expect(result.topToken).toBeNull();
    expect(result.topContract).toBeNull();
    expect(result.compositeScore).toBe(0);
    expect(result.signalCount).toBe(0);
    expect(result.reasoning).toBe("");
  });
});

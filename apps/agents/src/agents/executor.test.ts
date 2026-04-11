import { describe, expect, it } from "vitest";
import { parseResult } from "./executor.js";

describe("parseResult", () => {
  it("parses a successful buy result", () => {
    const text = `
      Trade executed successfully.
      <RESULT>
      {
        "action": "buy",
        "txHash": "0xabc123",
        "token": "OKB",
        "sizeUsdc": "0.80",
        "reasoning": "Bought OKB per strategist instruction"
      }
      </RESULT>
    `;
    const result = parseResult(text);
    expect(result.action).toBe("buy");
    expect(result.txHash).toBe("0xabc123");
    expect(result.token).toBe("OKB");
    expect(result.sizeUsdc).toBe("0.80");
    expect(result.reasoning).toBe("Bought OKB per strategist instruction");
  });

  it("parses a sell result", () => {
    const text = `
      <RESULT>
      {"action":"sell","txHash":"0xdef456","token":"WETH","sizeUsdc":"1.00","reasoning":"Position exited"}
      </RESULT>
    `;
    const result = parseResult(text);
    expect(result.action).toBe("sell");
    expect(result.txHash).toBe("0xdef456");
  });

  it("parses a yield_park result", () => {
    const text = `
      <RESULT>
      {"action":"yield_park","txHash":"0x789","sizeUsdc":"3.00","reasoning":"Deposited to Aave"}
      </RESULT>
    `;
    const result = parseResult(text);
    expect(result.action).toBe("yield_park");
  });

  it("defaults to yield_park when RESULT tag is missing", () => {
    const result = parseResult("Execution complete but no result block.");
    expect(result.action).toBe("yield_park");
    expect(result.txHash).toBeNull();
    expect(result.reasoning).toBe("Could not parse result block");
  });

  it("defaults to yield_park when JSON is malformed", () => {
    const text = "<RESULT>{ broken json }</RESULT>";
    const result = parseResult(text);
    expect(result.action).toBe("yield_park");
    expect(result.txHash).toBeNull();
    expect(result.reasoning).toBe("JSON parse failed");
  });

  it("defaults unknown action to yield_park", () => {
    const text = '<RESULT>{"action":"unknown_action","txHash":null,"reasoning":"test"}</RESULT>';
    const result = parseResult(text);
    expect(result.action).toBe("yield_park");
  });

  it("handles null txHash", () => {
    const text = '<RESULT>{"action":"buy","txHash":null,"reasoning":"Execution failed"}</RESULT>';
    const result = parseResult(text);
    expect(result.action).toBe("buy");
    expect(result.txHash).toBeNull();
  });

  it("fills missing optional fields with undefined", () => {
    const text = '<RESULT>{"action":"buy","txHash":"0x1","reasoning":"ok"}</RESULT>';
    const result = parseResult(text);
    expect(result.token).toBeUndefined();
    expect(result.sizeUsdc).toBeUndefined();
  });
});

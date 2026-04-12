/**
 * A14 — OKX read-only dry-run integration tests.
 *
 * Skipped automatically when OKX_API_KEY is not set (CI / unit-test runs).
 * Run manually with real keys to verify endpoint shapes.
 *
 * Write tools (okxSwapFull, okxDefiDeposit, okxGatewayBroadcast) are ALWAYS .skip.
 */
import { describe, expect, it } from "vitest";

const HAS_KEYS = !!(
  process.env.OKX_API_KEY &&
  process.env.OKX_SECRET_KEY &&
  process.env.OKX_PASSPHRASE
);

// OKB native address on X Layer
const OKB = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
// USDC on X Layer
const USDC = "0x74b7f16337b8972027f6196a17a631ac6de26d22";
// A known token contract for security scan
const OKB_CONTRACT = "0xe538905cf8410324e03a5a23c1c177a474d59b2b"; // WOKB

const MOCK_TOOL_OPTIONS = { toolCallId: "test", messages: [] as never[] };

describe.skipIf(!HAS_KEYS)("okxSwapQuote — read-only", () => {
  it("returns quote with toTokenAmount for OKB→USDC", async () => {
    const { okxSwapQuote } = await import("./okx-dex-swap.js");
    const result = await okxSwapQuote.execute!(
      { fromToken: "native", toToken: USDC, readableAmount: "0.01", chain: "xlayer" },
      MOCK_TOOL_OPTIONS,
    );
    expect(result).toHaveProperty("toTokenAmount");
    expect(result).toHaveProperty("fromTokenAmount");
    expect(typeof (result as { toTokenAmount: unknown }).toTokenAmount).toBe("string");
  });
});

describe.skipIf(!HAS_KEYS)("okxGatewayGas — read-only", () => {
  it("returns gas price data for X Layer", async () => {
    const { okxGatewayGas } = await import("./okx-onchain-gateway.js");
    const result = await okxGatewayGas.execute!({ chain: "xlayer" }, MOCK_TOOL_OPTIONS);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("object");
  });
});

describe.skipIf(!HAS_KEYS)("okxSecurityTokenScan — read-only", () => {
  it("returns verdict and riskLevel for WOKB", async () => {
    const { okxSecurityTokenScan } = await import("./okx-security.js");
    const result = await okxSecurityTokenScan.execute!(
      { address: OKB_CONTRACT, chain: "xlayer" },
      MOCK_TOOL_OPTIONS,
    );
    const r = result as { verdict: string; riskLevel: string; isHoneypot: boolean };
    expect(["CLEAR", "BLOCK"]).toContain(r.verdict);
    expect(typeof r.riskLevel).toBe("string");
    expect(typeof r.isHoneypot).toBe("boolean");
  });
});

describe.skipIf(!HAS_KEYS)("okxDexSignal — read-only", () => {
  it("returns signals array for X Layer", async () => {
    const { okxDexSignal } = await import("./okx-dex-signal.js");
    const result = await okxDexSignal.execute!({}, MOCK_TOOL_OPTIONS);
    const r = result as { signals: unknown[]; chain: string; chainIndex: string };
    expect(r.chain).toBe("xlayer");
    expect(Array.isArray(r.signals)).toBe(true);
  });
});

describe.skipIf(!HAS_KEYS)("okxTokenHotTokens — read-only", () => {
  it("returns tokens array for X Layer", async () => {
    const { okxTokenHotTokens } = await import("./okx-dex-token.js");
    const result = await okxTokenHotTokens.execute!({ rankingType: "4" }, MOCK_TOOL_OPTIONS);
    const r = result as { tokens: unknown[]; chain: string };
    expect(r.chain).toBe("xlayer");
    expect(Array.isArray(r.tokens)).toBe(true);
  });
});

// Write tools — always skip, never run automatically
describe.skip("okxSwapFull — WRITE — never run in CI", () => {
  it("would execute a full swap (skipped)", async () => {
    const { okxSwapFull } = await import("./okx-dex-swap.js");
    void okxSwapFull;
  });
});

describe.skip("okxDefiDeposit — WRITE — never run in CI", () => {
  it("would deposit into Aave V3 (skipped)", async () => {
    const { okxDefiDeposit } = await import("./okx-defi-invest.js");
    void okxDefiDeposit;
  });
});

describe.skip("okxGatewayBroadcast — WRITE — never run in CI", () => {
  it("would broadcast a signed transaction (skipped)", async () => {
    const { okxGatewayBroadcast } = await import("./okx-onchain-gateway.js");
    void okxGatewayBroadcast;
  });
});

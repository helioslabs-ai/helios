const _OKX_BASE = "https://www.okx.com/api/v5/waas";

export const X402_SCAN_PRICE = "1000";
export const X402_ASSESS_PRICE = "1000";
export const X402_DEPLOY_PRICE = "1000";

export type X402PaymentParams = {
  fromAccountId: string;
  toAddress: string;
  amount: string;
  apiKey: string;
  secretKey: string;
  passphrase: string;
};

export type X402Receipt = {
  txHash: string;
  amount: string;
  from: string;
  to: string;
  ts: string;
};

export async function settleX402Payment(_params: X402PaymentParams): Promise<X402Receipt> {
  // TODO: implement OKX x402 verify + settle REST API calls
  // POST /x402/verify → POST /x402/settle
  // Uses EIP-3009 USDG transfers via OKX native facilitator
  throw new Error("x402 payment not yet implemented — see .claude/plans/x402-flow.md");
}

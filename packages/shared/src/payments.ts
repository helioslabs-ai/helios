import { createHmac } from "node:crypto";
import { XLAYER_CHAIN_INDEX, XLAYER_USDG, XLAYER_X402_NETWORK } from "./chains.js";

const OKX_BASE = "https://web3.okx.com";

export const X402_SCAN_PRICE = "1000";
export const X402_ASSESS_PRICE = "1000";
export const X402_DEPLOY_PRICE = "1000";

interface X402AcceptedOption {
  scheme?: string;
  network?: string;
  amount?: string;
  maxAmountRequired?: string;
  payTo: string;
  asset?: string;
  maxTimeoutSeconds?: number;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

interface X402Option {
  network: string;
  amount?: string;
  maxAmountRequired?: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds?: number;
  resource?: string;
  description?: string;
  [key: string]: unknown;
}

interface X402Requirement {
  x402Version?: number;
  accepts: X402Option[];
}

interface X402Payload {
  signature: string;
  authorization: {
    from: string;
    to: string;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: string;
  };
}

interface DecodedPayment {
  x402Version?: number;
  accepted?: X402AcceptedOption;
  payload?: X402Payload;
}

interface OkxVerifyResponse {
  code: string;
  data: Array<{
    isValid: boolean;
    payer: string;
    invalidReason: string | null;
  }>;
  msg?: string;
}

interface OkxSettleResponse {
  code: string;
  data: Array<{
    success: boolean;
    txHash: string;
    payer: string;
    errorReason: string | null;
  }>;
  msg?: string;
}

function okxHmacHeaders(
  method: string,
  path: string,
  body: string,
  apiKey: string,
  secretKey: string,
  passphrase: string,
): Record<string, string> {
  const ts = new Date().toISOString();
  const sign = createHmac("sha256", secretKey)
    .update(ts + method.toUpperCase() + path + body)
    .digest("base64");
  return {
    "Content-Type": "application/json",
    "OK-ACCESS-KEY": apiKey,
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-TIMESTAMP": ts,
    "OK-ACCESS-PASSPHRASE": passphrase,
  };
}

/**
 * SERVER: Validate an incoming X-Payment header via OKX /api/v6/x402/verify.
 */
export async function okxVerifyX402Payment(
  xPaymentHeader: string,
  payTo: string,
  maxAmount: string,
): Promise<{ isValid: boolean; payer: string; invalidReason: string | null }> {
  const apiKey = process.env.OKX_API_KEY ?? "";
  const secretKey = process.env.OKX_SECRET_KEY ?? "";
  const passphrase = process.env.OKX_PASSPHRASE ?? "";

  const decoded = JSON.parse(
    Buffer.from(xPaymentHeader, "base64").toString("utf8"),
  ) as DecodedPayment;

  if (!decoded.payload) {
    return { isValid: false, payer: "", invalidReason: "Missing payload field" };
  }

  const acceptedScheme = decoded.accepted?.scheme ?? "exact";
  const path = "/api/v6/x402/verify";
  const bodyObj = {
    x402Version: decoded.x402Version ?? 1,
    chainIndex: XLAYER_CHAIN_INDEX,
    paymentPayload: {
      x402Version: decoded.x402Version ?? 1,
      scheme: acceptedScheme,
      payload: decoded.payload,
    },
    paymentRequirements: {
      scheme: "exact",
      maxAmountRequired: maxAmount,
      payTo,
      asset: XLAYER_USDG,
      maxTimeoutSeconds: 300,
      extra: { name: "USDG", version: "2" },
    },
  };
  const body = JSON.stringify(bodyObj);
  const headers = okxHmacHeaders("POST", path, body, apiKey, secretKey, passphrase);

  const res = await fetch(`${OKX_BASE}${path}`, { method: "POST", headers, body });
  const json = (await res.json()) as OkxVerifyResponse;

  if (!res.ok || (json.code && json.code !== "0")) {
    return { isValid: false, payer: "", invalidReason: json.msg ?? `HTTP ${res.status}` };
  }

  const result = json.data?.[0];
  if (!result) return { isValid: false, payer: "", invalidReason: "OKX verify returned no data" };

  return result;
}

/**
 * SERVER: Settle the x402 payment via OKX /api/v6/x402/settle.
 * OKX submits the EIP-3009 transferWithAuthorization on-chain and returns txHash.
 */
export async function okxSettleX402Payment(
  xPaymentHeader: string,
  payTo: string,
  maxAmount: string,
  resource: string,
  description: string,
): Promise<{ success: boolean; txHash: string; payer: string; errorReason: string | null }> {
  const apiKey = process.env.OKX_API_KEY ?? "";
  const secretKey = process.env.OKX_SECRET_KEY ?? "";
  const passphrase = process.env.OKX_PASSPHRASE ?? "";

  const decoded = JSON.parse(
    Buffer.from(xPaymentHeader, "base64").toString("utf8"),
  ) as DecodedPayment;

  if (!decoded.payload) {
    return { success: false, txHash: "", payer: "", errorReason: "Missing payload field" };
  }

  const settleScheme = decoded.accepted?.scheme ?? "exact";
  const path = "/api/v6/x402/settle";
  const bodyObj = {
    x402Version: decoded.x402Version ?? 1,
    chainIndex: XLAYER_CHAIN_INDEX,
    syncSettle: true,
    paymentPayload: {
      x402Version: decoded.x402Version ?? 1,
      scheme: settleScheme,
      payload: decoded.payload,
    },
    paymentRequirements: {
      scheme: "exact",
      resource,
      description,
      mimeType: "application/json",
      maxAmountRequired: maxAmount,
      payTo,
      asset: XLAYER_USDG,
      maxTimeoutSeconds: 300,
      extra: { name: "USDG", version: "2" },
    },
  };
  const body = JSON.stringify(bodyObj);
  const headers = okxHmacHeaders("POST", path, body, apiKey, secretKey, passphrase);

  const res = await fetch(`${OKX_BASE}${path}`, { method: "POST", headers, body });
  const json = (await res.json()) as OkxSettleResponse;

  if (!res.ok || (json.code && json.code !== "0")) {
    return {
      success: false,
      txHash: "",
      payer: decoded.payload.authorization?.from ?? "",
      errorReason: json.msg ?? `HTTP ${res.status}`,
    };
  }

  const result = json.data?.[0];
  if (!result) {
    return { success: false, txHash: "", payer: "", errorReason: "OKX settle returned no data" };
  }

  return result;
}

/** Build the X-Payment-Response header value sent back to the curator. */
export function buildPaymentResponse(txHash: string, payer?: string): string {
  return Buffer.from(JSON.stringify({ txHash, payer, ts: new Date().toISOString() })).toString(
    "base64",
  );
}

/** Build the X-Payment-Required header for a 402 response. */
export function buildPaymentRequired(opts: {
  payTo: string;
  amount: string;
  resource: string;
  description: string;
}): string {
  const requirement: X402Requirement = {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: XLAYER_X402_NETWORK,
        amount: opts.amount,
        maxAmountRequired: opts.amount,
        resource: opts.resource,
        description: opts.description,
        mimeType: "application/json",
        payTo: opts.payTo,
        maxTimeoutSeconds: 300,
        asset: XLAYER_USDG,
        extra: { name: "USDG", version: "2" },
      } as unknown as X402Option,
    ],
  };
  return Buffer.from(JSON.stringify(requirement)).toString("base64");
}

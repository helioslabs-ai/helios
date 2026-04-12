import { createHmac } from "node:crypto";
import { XLAYER_USDG, XLAYER_X402_NETWORK } from "./chains.js";

const OKX_BASE = "https://www.okx.com/api/v5/waas";

export const X402_SCAN_PRICE = "1000";
export const X402_ASSESS_PRICE = "1000";
export const X402_DEPLOY_PRICE = "1000";

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

interface X402Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

interface X402Payload {
  signature: string;
  authorization: X402Authorization;
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
 * SERVER: Validate the X-Payment header locally.
 * Checks payTo address, amount, and expiry.
 */
export function okxVerifyX402Payment(
  xPaymentHeader: string,
  payTo: string,
  maxAmount: string,
): { isValid: boolean; payer: string; invalidReason: string | null } {
  try {
    const decoded = JSON.parse(Buffer.from(xPaymentHeader, "base64").toString("utf8")) as {
      payload?: X402Payload;
    };
    const { authorization, signature } = decoded.payload ?? {};

    if (!authorization || !signature) {
      return { isValid: false, payer: "", invalidReason: "Missing payload fields" };
    }

    if (authorization.to?.toLowerCase() !== payTo.toLowerCase()) {
      return { isValid: false, payer: authorization.from, invalidReason: "payTo mismatch" };
    }

    if (BigInt(authorization.value ?? "0") < BigInt(maxAmount)) {
      return { isValid: false, payer: authorization.from, invalidReason: "Insufficient amount" };
    }

    const validBefore = Number(authorization.validBefore ?? 0);
    if (validBefore < Math.floor(Date.now() / 1000)) {
      return { isValid: false, payer: authorization.from, invalidReason: "Authorization expired" };
    }

    return { isValid: true, payer: authorization.from, invalidReason: null };
  } catch {
    return { isValid: false, payer: "", invalidReason: "Invalid payment header format" };
  }
}

/**
 * SERVER: Settle the x402 payment via OKX facilitator.
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

  const decoded = JSON.parse(Buffer.from(xPaymentHeader, "base64").toString("utf8")) as {
    payload?: X402Payload;
  };
  const { authorization, signature } = decoded.payload ?? {};

  if (!authorization || !signature) {
    return { success: false, txHash: "", payer: "", errorReason: "Missing payload fields" };
  }

  const path = "/x402/settle";
  const bodyObj = {
    network: XLAYER_X402_NETWORK,
    asset: XLAYER_USDG,
    payTo,
    resource,
    description,
    maxAmount,
    authorization,
    signature,
  };
  const body = JSON.stringify(bodyObj);
  const headers = okxHmacHeaders(
    "POST",
    `/api/v5/waas${path}`,
    body,
    apiKey,
    secretKey,
    passphrase,
  );

  const res = await fetch(`${OKX_BASE}${path}`, { method: "POST", headers, body });
  const json = (await res.json()) as { code?: string; data?: { txHash?: string }; msg?: string };

  if (!res.ok || (json.code && json.code !== "0")) {
    return {
      success: false,
      txHash: "",
      payer: authorization.from,
      errorReason: json.msg ?? `HTTP ${res.status}`,
    };
  }

  return {
    success: true,
    txHash: json.data?.txHash ?? "",
    payer: authorization.from,
    errorReason: null,
  };
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

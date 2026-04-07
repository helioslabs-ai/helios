import { createHmac } from "node:crypto";
import { spawnSync } from "node:child_process";
import { XLAYER_USDG, XLAYER_X402_NETWORK } from "./chains.js";

const OKX_BASE = "https://www.okx.com/api/v5/waas";
const ONCHAINOS_BIN = process.env.ONCHAINOS_BIN ?? "onchainos";

export const X402_SCAN_PRICE = "1000";
export const X402_ASSESS_PRICE = "1000";
export const X402_DEPLOY_PRICE = "1000";

export type X402Receipt = {
  txHash: string;
  amount: string;
  from: string;
  to: string;
  ts: string;
};

export type X402SettleResult = {
  txHash: string | null;
  body: unknown;
  amount: string;
};

interface X402Option {
  network: string;
  amount?: string;
  maxAmountRequired?: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds?: number;
  resource?: string;
  description?: string;
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
 * CLIENT: Curator calls this to access an x402-gated agent route.
 * Probes the URL → gets 402 → signs via onchainos CLI → replays with payment header.
 */
export async function settleX402(
  serviceUrl: string,
  payerAddress: string,
  init?: RequestInit,
): Promise<X402SettleResult> {
  // 1. Probe — expect 402
  const probe = await fetch(serviceUrl, init);

  if (probe.status !== 402) {
    const body = await probe.json().catch(() => ({}));
    return { txHash: null, body, amount: "0" };
  }

  // 2. Parse X-Payment-Required
  const requirementB64 = probe.headers.get("X-Payment-Required");
  if (!requirementB64) throw new Error("No X-Payment-Required header in 402 response");

  const requirement = JSON.parse(
    Buffer.from(requirementB64, "base64").toString("utf8"),
  ) as X402Requirement;
  const option = requirement.accepts[0];
  const amount = option.amount ?? option.maxAmountRequired ?? X402_SCAN_PRICE;

  // 3. Sign via onchainos CLI
  const args = [
    "payment",
    "x402-pay",
    "--network",
    option.network ?? XLAYER_X402_NETWORK,
    "--amount",
    amount,
    "--pay-to",
    option.payTo,
    "--asset",
    option.asset ?? XLAYER_USDG,
    "--from",
    payerAddress,
    "--max-timeout-seconds",
    String(option.maxTimeoutSeconds ?? 300),
  ];

  const payResult = spawnSync(ONCHAINOS_BIN, args, {
    encoding: "utf8",
    env: { ...process.env },
    timeout: 30_000,
  });

  if (payResult.error) throw new Error(`x402 sign spawn error: ${payResult.error.message}`);
  if (payResult.status !== 0) throw new Error(`x402 sign failed: ${payResult.stderr}`);

  const payData = JSON.parse(payResult.stdout.trim()) as
    | { ok?: boolean; data?: X402Payload }
    | X402Payload;
  const { signature, authorization } = (
    "data" in payData && payData.data ? payData.data : payData
  ) as X402Payload;

  // 4. Assemble X-Payment header
  const paymentPayload = { ...requirement, payload: { signature, authorization } };
  const xPayment = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");

  // 5. Replay with payment
  const paid = await fetch(serviceUrl, {
    ...(init ?? {}),
    headers: { ...(init?.headers as Record<string, string>), "X-Payment": xPayment },
  });

  if (!paid.ok) {
    const errBody = await paid.text();
    throw new Error(`x402 payment rejected (${paid.status}): ${errBody}`);
  }

  const paidBody = await paid.json().catch(() => ({}));
  let txHash: string | null = null;

  const xPaymentResponse = paid.headers.get("X-Payment-Response");
  if (xPaymentResponse) {
    const receipt = JSON.parse(Buffer.from(xPaymentResponse, "base64").toString("utf8")) as {
      txHash?: string;
      transaction?: string;
    };
    txHash = receipt.txHash ?? receipt.transaction ?? null;
  }

  return { txHash, body: paidBody, amount };
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

import crypto from "node:crypto";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { Aead, CipherSuite, Kdf, Kem } from "hpke-js";
import type { AgentName } from "../types.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const WAAS_BASE = "https://www.okx.com/api/v5/waas";
const TEE_BASE = "https://web3.okx.com";
const WALLET_PREFIX = "/priapi/v5/wallet/agentic";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AkInitResponse {
  nonce: string;
  iss: string;
}

interface VerifyResponse {
  accessToken: string;
  refreshToken: string;
  sessionCert: string;
  encryptedSessionSk: string;
  sessionKeyExpireAt: string;
  projectId: string;
  accountId: string;
  accountName: string;
  isNew: boolean;
  teeId: string;
}

interface WalletSession {
  accessToken: string;
  sessionCert: string;
  sessionPrivateKey: string;
  encryptedSessionSk: string;
  accountId: string;
  expiresAt: number;
}

export interface PreTxUnsignedInfo {
  unsignedTxHash: string;
  unsignedTx: string;
  uopHash: string;
  hash: string;
  executeErrorMsg: string;
  executeResult: boolean;
  signType: string;
  encoding: string;
  extraData: Record<string, unknown>;
}

// ── Session cache ─────────────────────────────────────────────────────────────

const sessionCache = new Map<string, WalletSession>();

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function anonymousHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "ok-client-version": "2.1.0",
    "Ok-Access-Client-type": "agent-cli",
  };
}

function jwtHeaders(accessToken: string): Record<string, string> {
  return { ...anonymousHeaders(), Authorization: `Bearer ${accessToken}` };
}

async function walletPost<T>(
  path: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<T> {
  const res = await fetch(`${TEE_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as { code: string | number; msg: string; data: T[] };
  if (json.code !== "0" && json.code !== 0) {
    throw new Error(`Wallet API error [${json.code}]: ${json.msg}`);
  }

  return json.data[0] as T;
}

// ── Key helpers ───────────────────────────────────────────────────────────────

function generateX25519Keypair(): { privateKeyB64: string; publicKeyB64: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("x25519");
  const pubDer = publicKey.export({ type: "spki", format: "der" });
  const privDer = privateKey.export({ type: "pkcs8", format: "der" });
  const rawPub = Buffer.from(pubDer).subarray(pubDer.length - 32);
  const rawPriv = Buffer.from(privDer).subarray(privDer.length - 32);
  return {
    publicKeyB64: rawPub.toString("base64"),
    privateKeyB64: rawPriv.toString("base64"),
  };
}

function hmacSign(
  timestamp: number,
  method: string,
  path: string,
  params: string,
  secretKey: string,
): string {
  const message = `${timestamp}${method}${path}${params}`;
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
}

// ── TEE session management ────────────────────────────────────────────────────

export async function akLogin(accountId: string): Promise<WalletSession> {
  const cached = sessionCache.get(accountId);
  if (cached && Date.now() / 1000 < cached.expiresAt - 60) {
    return cached;
  }

  const apiKey = process.env.OKX_API_KEY ?? "";
  const secretKey = process.env.OKX_SECRET_KEY ?? "";
  const passphrase = process.env.OKX_PASSPHRASE ?? "";

  const initResp = await walletPost<AkInitResponse>(
    `${WALLET_PREFIX}/auth/ak/init`,
    { apiKey },
    anonymousHeaders(),
  );

  const { privateKeyB64, publicKeyB64 } = generateX25519Keypair();

  const timestamp = Date.now();
  const sign = hmacSign(
    timestamp,
    "GET",
    "/web3/ak/agentic/login",
    `?locale=en-US&nonce=${initResp.nonce}&iss=${initResp.iss}`,
    secretKey,
  );

  const verifyResp = await walletPost<VerifyResponse>(
    `${WALLET_PREFIX}/auth/ak/verify`,
    {
      tempPubKey: publicKeyB64,
      apiKey,
      passphrase,
      timestamp: timestamp.toString(),
      sign,
      locale: "en-US",
      accountId,
    },
    anonymousHeaders(),
  );

  const raw = Number(verifyResp.sessionKeyExpireAt);
  const expiresAt = raw > 1e12 ? Math.floor(raw / 1000) : raw;

  const session: WalletSession = {
    accessToken: verifyResp.accessToken,
    sessionCert: verifyResp.sessionCert,
    sessionPrivateKey: privateKeyB64,
    encryptedSessionSk: verifyResp.encryptedSessionSk,
    accountId: verifyResp.accountId,
    expiresAt,
  };

  sessionCache.set(accountId, session);
  return session;
}

async function getSession(accountId: string): Promise<WalletSession> {
  const cached = sessionCache.get(accountId);
  if (!cached || Date.now() / 1000 >= cached.expiresAt - 60) {
    return akLogin(accountId);
  }
  return cached;
}

// ── Signing helpers ───────────────────────────────────────────────────────────

const HPKE_INFO = new TextEncoder().encode("okx-tee-sign");
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

async function hpkeDecryptSessionSk(
  encryptedB64: string,
  sessionKeyB64: string,
): Promise<Uint8Array> {
  const encrypted = Buffer.from(encryptedB64, "base64");
  const skBytes = Buffer.from(sessionKeyB64, "base64");

  const enc = encrypted.subarray(0, 32);
  const ciphertext = encrypted.subarray(32);

  const suite = new CipherSuite({
    kem: Kem.DhkemX25519HkdfSha256,
    kdf: Kdf.HkdfSha256,
    aead: Aead.Aes256Gcm,
  });
  const recipientKey = await suite.importKey(
    "raw",
    skBytes.buffer.slice(
      skBytes.byteOffset,
      skBytes.byteOffset + skBytes.byteLength,
    ) as ArrayBuffer,
    false,
  );
  const ctx = await suite.createRecipientContext({ recipientKey, enc, info: HPKE_INFO });
  const plaintext = await ctx.open(ciphertext, new Uint8Array(0));
  return new Uint8Array(plaintext);
}

function ed25519Sign(seed: Uint8Array, message: Uint8Array): Uint8Array {
  const der = Buffer.concat([ED25519_PKCS8_PREFIX, seed]);
  const privateKey = crypto.createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  return new Uint8Array(crypto.sign(null, message, privateKey));
}

function ed25519SignEip191(hexHash: string, seed: Uint8Array): string {
  const data = Buffer.from(hexHash.replace(/^0x/, ""), "hex");
  const prefix = `\x19Ethereum Signed Message:\n${data.length}`;
  const ethMsg = Buffer.concat([Buffer.from(prefix), data]);
  const msgHash = keccak_256(ethMsg);
  return Buffer.from(ed25519Sign(seed, msgHash)).toString("base64");
}

function ed25519SignEncoded(msg: string, seed: Uint8Array, encoding: string): string {
  if (!msg) return "";
  let msgBytes: Buffer;
  if (encoding === "hex") {
    msgBytes = Buffer.from(msg.replace(/^0x/, ""), "hex");
  } else if (encoding === "base64") {
    msgBytes = Buffer.from(msg, "base64");
  } else {
    msgBytes = Buffer.from(msg, "utf-8");
  }
  return Buffer.from(ed25519Sign(seed, msgBytes)).toString("base64");
}

// ── Public signing API ────────────────────────────────────────────────────────

export async function preTransactionUnsignedInfo(params: {
  accountId: string;
  chainIndex: number;
  fromAddr: string;
  toAddr: string;
  amount: string;
  inputData?: string;
  gasLimit?: string;
}): Promise<PreTxUnsignedInfo> {
  const session = await getSession(params.accountId);

  return walletPost<PreTxUnsignedInfo>(
    `${WALLET_PREFIX}/pre-transaction/unsignedInfo`,
    {
      chainPath: "m/44/60",
      chainIndex: params.chainIndex,
      fromAddr: params.fromAddr,
      toAddr: params.toAddr,
      amount: params.amount,
      sessionCert: session.sessionCert,
      ...(params.inputData ? { inputData: params.inputData } : {}),
      ...(params.gasLimit ? { gasLimit: params.gasLimit } : {}),
    },
    jwtHeaders(session.accessToken),
  );
}

export async function signAndBroadcast(params: {
  accountId: string;
  address: string;
  chainIndex: string;
  unsignedInfo: PreTxUnsignedInfo;
}): Promise<{ pkgId: string; orderId: string; txHash: string }> {
  const session = await getSession(params.accountId);
  const seed = await hpkeDecryptSessionSk(session.encryptedSessionSk, session.sessionPrivateKey);

  const msgForSign: Record<string, unknown> = {};

  if (params.unsignedInfo.hash) {
    msgForSign.signature = ed25519SignEip191(params.unsignedInfo.hash, seed);
  }
  if (params.unsignedInfo.unsignedTxHash) {
    msgForSign.unsignedTxHash = params.unsignedInfo.unsignedTxHash;
    msgForSign.sessionSignature = ed25519SignEncoded(
      params.unsignedInfo.unsignedTxHash,
      seed,
      params.unsignedInfo.encoding,
    );
  }
  if (params.unsignedInfo.unsignedTx) {
    msgForSign.unsignedTx = params.unsignedInfo.unsignedTx;
  }
  if (session.sessionCert) {
    msgForSign.sessionCert = session.sessionCert;
  }

  const extraDataObj: Record<string, unknown> = {
    ...(typeof params.unsignedInfo.extraData === "object" ? params.unsignedInfo.extraData : {}),
    checkBalance: true,
    uopHash: params.unsignedInfo.uopHash,
    encoding: params.unsignedInfo.encoding,
    signType: params.unsignedInfo.signType,
    msgForSign,
  };

  return walletPost<{ pkgId: string; orderId: string; txHash: string }>(
    `${WALLET_PREFIX}/pre-transaction/broadcast-transaction`,
    {
      accountId: params.accountId,
      address: params.address,
      chainIndex: params.chainIndex,
      extraData: JSON.stringify(extraDataObj),
    },
    jwtHeaders(session.accessToken),
  );
}

// ── x402 payment signing ──────────────────────────────────────────────────────

const XLAYER_CHAIN_INDEX = "196";

interface X402Requirement {
  network?: string;
  amount: string;
  asset?: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  extra?: Record<string, unknown>;
}

interface X402Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

interface X402Proof {
  signature: string;
  authorization: X402Authorization;
}

export interface X402SettleResult {
  txHash: string | null;
  body: unknown;
  amount: string;
}

async function signX402(
  payerAddress: string,
  accountId: string,
  requirement: X402Requirement,
): Promise<X402Proof> {
  const session = await akLogin(accountId);

  const now = Math.floor(Date.now() / 1000);
  const validBefore = (now + (requirement.maxTimeoutSeconds ?? 300)).toString();
  const nonce = `0x${crypto.randomBytes(32).toString("hex")}`;

  const baseFields = {
    chainIndex: XLAYER_CHAIN_INDEX,
    from: payerAddress,
    to: requirement.payTo,
    value: requirement.amount,
    validAfter: "0",
    validBefore,
    nonce,
    verifyingContract: requirement.asset,
  };

  const headers = jwtHeaders(session.accessToken);

  // Step 1: Get EIP-3009 unsigned hash from TEE
  const genHashRes = await fetch(`${TEE_BASE}${WALLET_PREFIX}/pre-transaction/gen-msg-hash`, {
    method: "POST",
    headers,
    body: JSON.stringify(baseFields),
  });
  const genHashJson = (await genHashRes.json()) as {
    code: string | number;
    msg: string;
    data: Array<{ msgHash: string; domainHash: string }>;
  };

  if (genHashJson.code !== "0" && genHashJson.code !== 0) {
    throw new Error(`gen-msg-hash failed [${genHashJson.code}]: ${genHashJson.msg}`);
  }

  const hashData = genHashJson.data?.[0];
  if (!hashData?.msgHash) {
    throw new Error(
      `gen-msg-hash returned no msgHash. Raw response: ${JSON.stringify(genHashJson)}`,
    );
  }

  const { msgHash, domainHash } = hashData;

  // Step 2: HPKE decrypt → Ed25519 seed → sign msgHash locally
  const seed = await hpkeDecryptSessionSk(session.encryptedSessionSk, session.sessionPrivateKey);
  const msgHashBytes = Buffer.from(msgHash.replace(/^0x/, ""), "hex");
  const sessionSignature = Buffer.from(ed25519Sign(seed, msgHashBytes)).toString("base64");

  // Step 3: TEE produces final EIP-3009 secp256k1 signature
  const signRes = await fetch(`${TEE_BASE}${WALLET_PREFIX}/pre-transaction/sign-msg`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...baseFields,
      domainHash,
      sessionCert: session.sessionCert,
      sessionSignature,
    }),
  });
  const signJson = (await signRes.json()) as {
    code: string | number;
    msg: string;
    data: Array<{ signature: string }>;
  };

  if (signJson.code !== "0" && signJson.code !== 0) {
    throw new Error(`sign-msg failed [${signJson.code}]: ${signJson.msg}`);
  }

  const sig = signJson.data?.[0]?.signature;
  if (!sig) {
    throw new Error(`sign-msg returned no signature. Raw response: ${JSON.stringify(signJson)}`);
  }

  return {
    signature: sig,
    authorization: {
      from: payerAddress,
      to: requirement.payTo,
      value: requirement.amount,
      validAfter: "0",
      validBefore,
      nonce,
    },
  };
}

/**
 * CLIENT: Curator calls this to access an x402-gated agent route.
 * Probes the URL → gets 402 → TEE-signs EIP-3009 via direct OKX APIs → replays with payment header.
 */
export async function settleX402(
  serviceUrl: string,
  payerAddress: string,
  accountId: string,
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

  const decoded = JSON.parse(Buffer.from(requirementB64, "base64").toString("utf-8")) as {
    x402Version?: number;
    accepts: X402Requirement[];
  };
  const accepted = decoded.accepts[0];

  // 3. TEE sign EIP-3009
  const proof = await signX402(payerAddress, accountId, accepted);

  // 4. Build X-Payment header
  const paymentPayload = {
    x402Version: decoded.x402Version ?? 1,
    accepted,
    payload: { signature: proof.signature, authorization: proof.authorization },
  };
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
    const receipt = JSON.parse(Buffer.from(xPaymentResponse, "base64").toString("utf-8")) as {
      txHash?: string;
      transaction?: string;
    };
    txHash = receipt.txHash ?? receipt.transaction ?? null;
  }

  return { txHash, body: paidBody, amount: accepted.amount };
}

// ── Balance helpers ───────────────────────────────────────────────────────────

type WalletBalance = {
  accountId: string;
  address: string;
  balanceUsdc: string;
};

export async function getWalletBalance(accountId: string, address: string): Promise<WalletBalance> {
  const ts = new Date().toISOString();
  const path = `/api/v5/waas/asset/token-assets?accountId=${accountId}&chainIndex=196`;
  const secretKey = process.env.OKX_SECRET_KEY ?? "";
  const sign = crypto.createHmac("sha256", secretKey).update(`${ts}GET${path}`).digest("base64");

  const res = await fetch(`${WAAS_BASE}/asset/token-assets?accountId=${accountId}&chainIndex=196`, {
    headers: {
      "Content-Type": "application/json",
      "OK-ACCESS-KEY": process.env.OKX_API_KEY ?? "",
      "OK-ACCESS-SIGN": sign,
      "OK-ACCESS-TIMESTAMP": ts,
      "OK-ACCESS-PASSPHRASE": process.env.OKX_PASSPHRASE ?? "",
    },
  });

  if (!res.ok) {
    throw new Error(`Wallet balance fetch failed: ${res.status}`);
  }

  const json = (await res.json()) as { data: Array<{ tokenSymbol: string; balance: string }> };
  const usdc = json.data?.find((t) => t.tokenSymbol === "USDC");

  return { accountId, address, balanceUsdc: usdc?.balance ?? "0" };
}

export async function getAllBalances(
  wallets: Record<AgentName, { accountId: string; address: string }>,
): Promise<Record<AgentName, string>> {
  const entries = await Promise.all(
    (Object.entries(wallets) as [AgentName, { accountId: string; address: string }][]).map(
      async ([name, wallet]) => {
        const balance = await getWalletBalance(wallet.accountId, wallet.address);
        return [name, balance.balanceUsdc] as const;
      },
    ),
  );
  return Object.fromEntries(entries) as Record<AgentName, string>;
}

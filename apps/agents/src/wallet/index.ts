import crypto from "node:crypto";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { Aead, CipherSuite, Kdf, Kem } from "hpke-js";
import { CHAIN_INDEX, okxFetch } from "../tools/okx-client.js";
import type { AgentName } from "../types.js";

// ── Constants ─────────────────────────────────────────────────────────────────

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
  addressList?: Array<{ address: string; chainIndex: string; chainName: string }>;
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
/** Wall-clock time of last successful akLogin per account (JWT can be invalid before expiresAt). */
const sessionWallMs = new Map<string, number>();
/** Force TEE re-login at least this often (ms) for signing + x402 — mitigates [10008] access token invalid. */
export const WALLET_SESSION_MAX_WALL_MS = 20 * 60 * 1000;

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
  const lastWall = sessionWallMs.get(accountId) ?? 0;
  const wallFresh = Date.now() - lastWall < WALLET_SESSION_MAX_WALL_MS;
  if (cached && Date.now() / 1000 < cached.expiresAt - 60 && wallFresh) {
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
  sessionWallMs.set(accountId, Date.now());

  // Some OKX Web3 endpoints (notably DeFi enter/exit) require OK-ACCESS-PROJECT.
  // If not set via env, hydrate it from the verified agentic wallet session.
  if (!process.env.OKX_PROJECT_ID && verifyResp.projectId) {
    process.env.OKX_PROJECT_ID = verifyResp.projectId;
  }

  // Diagnostic: log which addresses OKX associates with this accountId
  if (verifyResp.addressList?.length) {
    const addrs = verifyResp.addressList
      .filter((a) => a.chainIndex === "196" || a.chainName?.toLowerCase().includes("x layer"))
      .map((a) => a.address);
    console.log(`[akLogin] accountId=${accountId} → X Layer addresses: ${JSON.stringify(addrs)}`);
  } else {
    console.log(`[akLogin] accountId=${accountId} → no addressList returned`);
  }

  return session;
}

async function getSession(accountId: string): Promise<WalletSession> {
  const cached = sessionCache.get(accountId);
  const lastWall = sessionWallMs.get(accountId) ?? 0;
  const wallFresh = Date.now() - lastWall < WALLET_SESSION_MAX_WALL_MS;
  if (!cached || Date.now() / 1000 >= cached.expiresAt - 60 || !wallFresh) {
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

/**
 * Contract-call flavored unsignedInfo.
 * The onchainos CLI uses contract-call for agentic wallet execution and it is more reliable than the
 * fromAddr/toAddr form for complex calldata (DEX swaps, DeFi adapters).
 *
 * See onchainos binary strings: `contractAddrinputDataaaDexTokenAddr/priapi/v5/wallet/agentic/pre-transaction/unsignedInfo`.
 */
export async function preTransactionUnsignedInfoContractCall(params: {
  accountId: string;
  chainIndex: number;
  fromAddr: string;
  contractAddr: string;
  amt: string;
  inputData: string;
  gasLimit?: string;
  aaDexTokenAddr?: string;
  aaDexTokenAmount?: string;
}): Promise<PreTxUnsignedInfo> {
  const session = await getSession(params.accountId);

  return walletPost<PreTxUnsignedInfo>(
    `${WALLET_PREFIX}/pre-transaction/unsignedInfo`,
    {
      chainPath: "m/44/60",
      chainIndex: params.chainIndex,
      fromAddr: params.fromAddr,
      // Some backends require toAddr/amount even for contract-call; mirror contractAddr/amt.
      toAddr: params.contractAddr,
      amount: params.amt,
      contractAddr: params.contractAddr,
      amt: params.amt,
      inputData: params.inputData,
      sessionCert: session.sessionCert,
      ...(params.gasLimit ? { gasLimit: params.gasLimit } : {}),
      ...(params.aaDexTokenAddr ? { aaDexTokenAddr: params.aaDexTokenAddr } : {}),
      ...(params.aaDexTokenAmount ? { aaDexTokenAmount: params.aaDexTokenAmount } : {}),
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

/** OKX may reject cached JWT before local expiry; retry after forcing a fresh akLogin. */
function isWalletAccessTokenError(code: string | number, msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    String(code) === "10008" ||
    m.includes("access token") ||
    m.includes("token invalid") ||
    m.includes("unauthorized")
  );
}

async function signX402(
  payerAddress: string,
  accountId: string,
  requirement: X402Requirement,
): Promise<X402Proof> {
  const nowBase = Math.floor(Date.now() / 1000);

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      sessionCache.delete(accountId);
      sessionWallMs.delete(accountId);
      console.warn(
        `[x402:sign] Retrying after invalid/expired wallet session (accountId=${accountId})`,
      );
    }

    // Proactive refresh: akLogin skips cache when wall-clock age exceeds WALLET_SESSION_MAX_WALL_MS
    const session = await akLogin(accountId);

    const validBefore = (nowBase + (requirement.maxTimeoutSeconds ?? 300)).toString();
    const nonce = `0x${crypto.randomBytes(32).toString("hex")}`;

    const baseFields = {
      accountId,
      chainIndex: Number(XLAYER_CHAIN_INDEX),
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
      if (attempt === 0 && isWalletAccessTokenError(genHashJson.code, genHashJson.msg)) {
        continue;
      }
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
    if (seed.length !== 32) throw new Error(`HPKE: seed must be 32 bytes, got ${seed.length}`);

    const msgHashBytes = Buffer.from(msgHash.replace(/^0x/, ""), "hex");
    const sessionSignature = Buffer.from(ed25519Sign(seed, msgHashBytes)).toString("base64");

    console.log(`[x402:sign] payer=${payerAddress} accountId=${accountId}`);
    console.log(
      `[x402:sign] msgHash=${msgHash.slice(0, 18)} domainHash=${domainHash.slice(0, 18)}`,
    );
    console.log(`[x402:sign] seed[0]=${seed[0]} sessionSig=${sessionSignature.slice(0, 12)}...`);

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
      if (attempt === 0 && isWalletAccessTokenError(signJson.code, signJson.msg)) {
        continue;
      }
      throw new Error(`sign-msg failed [${signJson.code}]: ${signJson.msg}`);
    }

    console.log(`[x402:sign] sign-msg raw: ${JSON.stringify(signJson)}`);
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

  throw new Error("signX402: exhausted retries after access token errors");
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

export type WalletTokenBalances = {
  accountId: string;
  address: string;
  balanceUsdc: string;
  balanceUsdg: string;
};

/**
 * OnchainOS portfolio / okx-wallet-portfolio path: DEX balance by EVM address on X Layer.
 * (WaaS v5 `/waas/asset/token-assets` returns 404 for many keys — not used here.)
 * See: `.resources/onchainos-skills/skills/okx-wallet-portfolio` — same API as `okxWalletBalances` tool.
 */
function normalizeDexBalancePayload(
  json: unknown,
): Array<{ tokenSymbol: string; balance: string }> {
  const out: Array<{ tokenSymbol: string; balance: string }> = [];
  if (!json || typeof json !== "object") return out;
  const root = json as Record<string, unknown>;
  const raw = root.data;
  let rows: unknown[] = [];
  if (Array.isArray(raw)) {
    rows = raw;
  } else if (raw && typeof raw === "object") {
    const ta = (raw as Record<string, unknown>).tokenAssets;
    if (Array.isArray(ta)) rows = ta;
  }
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;

    // Common OKX shape: data: [{ tokenAssets: [{ symbol, balance, ... }, ...] }]
    const tokenAssets = o.tokenAssets;
    if (Array.isArray(tokenAssets)) {
      for (const a of tokenAssets) {
        if (!a || typeof a !== "object") continue;
        const ao = a as Record<string, unknown>;
        const sym = ao.symbol ?? ao.tokenSymbol;
        const bal = ao.balance;
        if (sym != null && bal != null) {
          out.push({ tokenSymbol: String(sym), balance: String(bal) });
        }
      }
      continue;
    }

    const sym = o.symbol ?? o.tokenSymbol;
    const bal = o.balance;
    if (sym != null && bal != null) {
      out.push({ tokenSymbol: String(sym), balance: String(bal) });
    }
  }
  return out;
}

async function fetchTokenBalancesByEvmAddress(
  evmAddress: string,
): Promise<Array<{ tokenSymbol: string; balance: string }>> {
  if (!evmAddress?.startsWith("0x")) {
    console.warn("[wallet] balance: invalid evmAddress, skipping DEX fetch");
    return [];
  }
  try {
    const json = await okxFetch<unknown>("/api/v6/dex/balance/all-token-balances-by-address", {
      params: { address: evmAddress.toLowerCase(), chains: CHAIN_INDEX },
    });
    return normalizeDexBalancePayload(json);
  } catch (e) {
    console.error("[wallet] DEX balance fetch failed:", e);
    return [];
  }
}

export async function getWalletBalance(accountId: string, address: string): Promise<WalletBalance> {
  const data = await fetchTokenBalancesByEvmAddress(address);
  const usdc = data.find((t) => (t.tokenSymbol ?? "").toUpperCase() === "USDC");
  return { accountId, address, balanceUsdc: usdc?.balance ?? "0" };
}

/** USDC + USDG balances on X Layer (for Aave deposit routing). */
export async function getWalletTokenBalances(
  accountId: string,
  address: string,
): Promise<WalletTokenBalances> {
  const data = await fetchTokenBalancesByEvmAddress(address);
  const usdc = data.find((t) => (t.tokenSymbol ?? "").toUpperCase() === "USDC");
  const usdg = data.find((t) => (t.tokenSymbol ?? "").toUpperCase() === "USDG");
  return {
    accountId,
    address,
    balanceUsdc: usdc?.balance ?? "0",
    balanceUsdg: usdg?.balance ?? "0",
  };
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

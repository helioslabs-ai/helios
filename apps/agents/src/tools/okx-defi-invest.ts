import { z } from "zod";
import { tool } from "../ai/tool.js";
import { preTransactionUnsignedInfo, signAndBroadcast } from "../wallet/index.js";
import { allItems, CHAIN_INDEX, firstItem, okxFetch } from "./okx-client.js";

const XLAYER_CHAIN_INDEX = 196;

export const okxDefiSearch = tool({
  description:
    "Search for DeFi yield opportunities on X Layer. Returns investment products with APY, platform, token, and investment ID. Use to find Aave V3 USDG positions on X Layer (investmentId: 33906).",
  parameters: z.object({
    chain: z.string().default("xlayer"),
    platform: z.string().optional().describe("Filter by platform keyword, e.g. 'Aave'"),
    token: z.string().optional().describe("Filter by token keyword, e.g. 'USDG'"),
    productGroup: z
      .string()
      .optional()
      .describe("SINGLE_EARN | DEX_POOL | LENDING. Default SINGLE_EARN"),
  }),
  execute: async ({ platform, token, productGroup }) => {
    const body: Record<string, string | undefined> = {
      chainIndex: CHAIN_INDEX,
      platform,
      token: token ?? "USDG",
      productGroup: productGroup ?? "SINGLE_EARN",
    };
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/defi/product/search", {
      method: "POST",
      body: Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)),
    });
    const products = allItems(json);
    return { products, chain: "xlayer", note: "Aave V3 USDG on X Layer: investmentId 33906" };
  },
});

export const okxDefiInvest = tool({
  description:
    "Get calldata to deposit funds into a DeFi yield product (e.g. Aave V3 USDG on X Layer, investmentId: 33906). Returns unsigned transaction calldata. Broadcast with okxGatewayBroadcast after signing.",
  parameters: z.object({
    investmentId: z.string().describe("Investment product ID. Aave V3 USDG on X Layer = '33906'"),
    address: z.string().describe("Depositor wallet address"),
    token: z.string().default("USDG").describe("Token symbol to deposit"),
    amount: z.string().describe("Amount in minimal units (e.g. '1000000' = 1 USDG, 6 decimals)"),
    chain: z.string().default("xlayer"),
    slippage: z.string().default("0.01"),
  }),
  execute: async ({ investmentId, address, token, amount, slippage }) => {
    const body = {
      chainIndex: CHAIN_INDEX,
      investmentId,
      investAddress: address,
      investToken: token,
      investAmount: amount,
      slippage,
    };
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/defi/transaction/enter", {
      method: "POST",
      body,
    });
    return firstItem(json);
  },
});

export const okxDefiCollect = tool({
  description:
    "Get calldata to harvest / collect accrued yield from an active DeFi position. Returns unsigned transaction calldata.",
  parameters: z.object({
    investmentId: z.string().describe("Investment product ID"),
    address: z.string().describe("Wallet address that holds the position"),
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ investmentId, address }) => {
    const body = {
      chainIndex: CHAIN_INDEX,
      investmentId,
      investAddress: address,
    };
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/defi/transaction/claim", {
      method: "POST",
      body,
    });
    return firstItem(json);
  },
});

/**
 * Full DeFi deposit via OKX TEE Agentic Wallet.
 * Gets deposit calldata from OKX DeFi → signs → broadcasts → returns txHash.
 */
interface DefiTxEntry {
  callDataType: "APPROVE" | "DEPOSIT" | string;
  to: string;
  value: string;
  serializedData: string;
}

/** Known Aave V3 USDG single-earn on X Layer (OKX product id). */
export const DEFAULT_AAVE_USDG_INVESTMENT_ID = "33906";

/**
 * Resolve an Aave lending product id for USDC or USDG on X Layer via OKX DeFi search.
 */
export async function findAaveInvestmentIdForToken(token: "USDC" | "USDG"): Promise<string | null> {
  const json = await okxFetch<{ data?: Array<Record<string, unknown>> }>(
    "/api/v6/defi/product/search",
    {
      method: "POST",
      body: {
        chainIndex: CHAIN_INDEX,
        platform: "Aave",
        token,
        productGroup: "SINGLE_EARN",
      },
    },
  );
  const rows = allItems(json);
  if (rows.length === 0) return null;
  const pick =
    rows.find((r) =>
      String(r.platform ?? "")
        .toLowerCase()
        .includes("aave"),
    ) ?? rows[0];
  const id = pick.investmentId ?? pick.investmentID;
  return id != null ? String(id) : null;
}

export interface DefiDepositTeeParams {
  investmentId: string;
  walletAddress: string;
  accountId: string;
  token: string;
  /** Minimal units (6 decimals for USDC/USDG on X Layer). */
  amount: string;
  slippage?: string;
}

/**
 * Programmatic Aave deposit (same path as okxDefiDeposit tool). Logs full errors — never swallow.
 */
export async function executeDefiDepositTee(params: DefiDepositTeeParams): Promise<{
  txHash: string;
  orderId: string;
  investmentId: string;
}> {
  const { investmentId, walletAddress, accountId, token, amount, slippage = "0.01" } = params;
  const investBody = {
    chainIndex: CHAIN_INDEX,
    investmentId,
    investAddress: walletAddress,
    investToken: token,
    investAmount: amount,
    slippage,
  };

  try {
    const investJson = await okxFetch<{ dataList?: DefiTxEntry[] }>(
      "/api/v6/defi/transaction/enter",
      { method: "POST", body: investBody },
    );

    const txList = investJson.dataList ?? [];
    if (txList.length === 0) {
      const err = new Error(
        `No DeFi transaction data returned. investBody=${JSON.stringify(investBody)} raw=${JSON.stringify(investJson)}`,
      );
      console.error("[executeDefiDepositTee]", err.message);
      throw err;
    }

    let depositTxHash = "";
    let depositOrderId = "";

    for (const tx of txList) {
      const hexVal = tx.value ?? "0x0";
      const decimalAmount = hexVal.startsWith("0x") ? BigInt(hexVal).toString() : hexVal;

      const unsignedInfo = await preTransactionUnsignedInfo({
        accountId,
        chainIndex: XLAYER_CHAIN_INDEX,
        fromAddr: walletAddress,
        toAddr: tx.to,
        amount: decimalAmount,
        inputData: tx.serializedData,
      });

      const result = await signAndBroadcast({
        accountId,
        address: walletAddress,
        chainIndex: CHAIN_INDEX,
        unsignedInfo,
      });

      if (tx.callDataType === "DEPOSIT") {
        depositTxHash = result.txHash;
        depositOrderId = result.orderId;
      }
    }

    if (!depositTxHash) {
      const err = new Error(
        `DEPOSIT transaction not found in dataList. investmentId=${investmentId} token=${token}`,
      );
      console.error("[executeDefiDepositTee]", err.message);
      throw err;
    }
    return { txHash: depositTxHash, orderId: depositOrderId, investmentId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      "[executeDefiDepositTee] deposit failed:",
      msg,
      "params:",
      JSON.stringify({ ...params, accountId: `${accountId.slice(0, 6)}…` }),
    );
    throw err;
  }
}

/**
 * Full DeFi deposit via OKX TEE Agentic Wallet.
 * The OKX DeFi API returns a dataList with APPROVE + DEPOSIT entries.
 * We sign and broadcast each in sequence, returning the DEPOSIT txHash.
 */
export const okxDefiDeposit = tool({
  description:
    "Deposit funds into a DeFi yield product (e.g. Aave V3 USDG on X Layer, investmentId: '33906') using the TEE agentic wallet. Handles approval + deposit signing automatically. Returns txHash.",
  parameters: z.object({
    investmentId: z.string().describe("Investment product ID. Aave V3 USDG on X Layer = '33906'"),
    walletAddress: z.string().describe("Depositor wallet address (0x...)"),
    accountId: z.string().describe("Depositor OKX account ID for TEE signing"),
    token: z.string().default("USDG").describe("Token symbol to deposit"),
    amount: z.string().describe("Amount in minimal units (e.g. '1000000' = 1 USDG, 6 decimals)"),
    slippage: z.string().default("0.01"),
  }),
  execute: async ({ investmentId, walletAddress, accountId, token, amount, slippage }) => {
    return executeDefiDepositTee({
      investmentId,
      walletAddress,
      accountId,
      token,
      amount,
      slippage,
    });
  },
});

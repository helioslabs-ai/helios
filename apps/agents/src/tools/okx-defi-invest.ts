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
    const investBody = {
      chainIndex: CHAIN_INDEX,
      investmentId,
      investAddress: walletAddress,
      investToken: token,
      investAmount: amount,
      slippage,
    };

    // OKX DeFi enter returns dataList: [{callDataType: "APPROVE", ...}, {callDataType: "DEPOSIT", ...}]
    const investJson = await okxFetch<{ dataList?: DefiTxEntry[] }>(
      "/api/v6/defi/transaction/enter",
      { method: "POST", body: investBody },
    );

    const txList = investJson.dataList ?? [];
    if (txList.length === 0) throw new Error("No DeFi transaction data returned");

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

    if (!depositTxHash) throw new Error("DEPOSIT transaction not found in dataList");
    return { txHash: depositTxHash, orderId: depositOrderId, investmentId };
  },
});

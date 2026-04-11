import { z } from "zod";
import { tool } from "../ai/tool.js";
import { preTransactionUnsignedInfo, signAndBroadcast } from "../wallet/index.js";
import { CHAIN_INDEX, firstItem, okxFetch } from "./okx-client.js";

const EVM_NATIVE = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const XLAYER_CHAIN_INDEX = 196;

function resolveToken(t: string): string {
  return t === "native" ? EVM_NATIVE : t.toLowerCase();
}

function isNative(addr: string): boolean {
  return addr.toLowerCase() === EVM_NATIVE;
}

export const okxSwapQuote = tool({
  description:
    "Get a DEX swap quote on X Layer (no execution). Returns expected output amount, price impact, gas estimate, and routing path. Call before executing a swap.",
  parameters: z.object({
    fromToken: z.string().describe("Source token address (lowercase) or 'native'"),
    toToken: z.string().describe("Destination token address (lowercase) or 'native'"),
    readableAmount: z.string().describe("Human-readable sell amount, e.g. '1.5' for 1.5 USDC"),
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ fromToken, toToken, readableAmount }) => {
    const params: Record<string, string | undefined> = {
      chainIndex: CHAIN_INDEX,
      fromTokenAddress: resolveToken(fromToken),
      toTokenAddress: resolveToken(toToken),
      amount: readableAmount,
    };
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/aggregator/quote", { params });
    return firstItem(json);
  },
});

/**
 * Full swap execution via OKX TEE Agentic Wallet.
 * Handles: approval (if ERC-20) → sign → broadcast → txHash.
 * No unsigned calldata returned — executor gets a confirmed txHash.
 */
export const okxSwapFull = tool({
  description:
    "Execute a full DEX swap on X Layer using the TEE agentic wallet. Handles token approval, signing, and broadcasting automatically. Returns txHash on success. Only call after Sentinel CLEAR verdict.",
  parameters: z.object({
    fromToken: z.string().describe("Source token address (lowercase) or 'native' for OKB"),
    toToken: z.string().describe("Destination token address (lowercase) or 'native'"),
    readableAmount: z.string().describe("Human-readable sell amount e.g. '1.5' for 1.5 USDC"),
    walletAddress: z.string().describe("Executor wallet address (0x...)"),
    accountId: z.string().describe("Executor OKX account ID for TEE signing"),
    slippage: z.string().default("0.5").describe("Slippage tolerance percentage"),
  }),
  execute: async ({ fromToken, toToken, readableAmount, walletAddress, accountId, slippage }) => {
    const fromAddr = resolveToken(fromToken);
    const toAddr = resolveToken(toToken);

    // Step 1: If ERC-20 source, get and broadcast approval first
    if (!isNative(fromAddr)) {
      const approveJson = await okxFetch<{ data?: Array<{ data: string; gasLimit: string; gasPrice: string; to: string }> }>(
        "/api/v6/dex/aggregator/approve-transaction",
        { params: { chainIndex: CHAIN_INDEX, tokenContractAddress: fromAddr, approveAmount: readableAmount } },
      );
      const approveData = approveJson.data?.[0];
      if (approveData) {
        const approveUnsigned = await preTransactionUnsignedInfo({
          accountId,
          chainIndex: XLAYER_CHAIN_INDEX,
          fromAddr: walletAddress,
          toAddr: approveData.to,
          amount: "0",
          inputData: approveData.data,
          gasLimit: approveData.gasLimit,
        });
        await signAndBroadcast({
          accountId,
          address: walletAddress,
          chainIndex: CHAIN_INDEX,
          unsignedInfo: approveUnsigned,
        });
      }
    }

    // Step 2: Get swap calldata
    const swapJson = await okxFetch<{ data?: Array<{ tx: { to: string; data: string; value: string; gas: string }; routerResult?: { toTokenAmount: string } }> }>(
      "/api/v6/dex/aggregator/swap",
      {
        params: {
          chainIndex: CHAIN_INDEX,
          fromTokenAddress: fromAddr,
          toTokenAddress: toAddr,
          amount: readableAmount,
          userWalletAddress: walletAddress,
          slippagePercent: slippage,
        },
      },
    );
    const swapItem = swapJson.data?.[0];
    if (!swapItem?.tx) throw new Error("No swap transaction data returned");

    const { tx, routerResult } = swapItem;

    // Step 3: Sign and broadcast via TEE
    const unsignedInfo = await preTransactionUnsignedInfo({
      accountId,
      chainIndex: XLAYER_CHAIN_INDEX,
      fromAddr: walletAddress,
      toAddr: tx.to,
      amount: tx.value ?? "0",
      inputData: tx.data,
      gasLimit: tx.gas,
    });

    const result = await signAndBroadcast({
      accountId,
      address: walletAddress,
      chainIndex: CHAIN_INDEX,
      unsignedInfo,
    });

    return {
      txHash: result.txHash,
      orderId: result.orderId,
      toTokenAmount: routerResult?.toTokenAmount ?? "0",
    };
  },
});

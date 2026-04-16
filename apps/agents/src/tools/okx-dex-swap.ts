import { TOKEN_ADDRESSES, XLAYER_USDC, XLAYER_USDG } from "@helios/shared/chains";
import { z } from "zod";
import { tool } from "../ai/tool.js";
import { preTransactionUnsignedInfoContractCall, signAndBroadcast } from "../wallet/index.js";
import { CHAIN_INDEX, firstItem, okxFetch } from "./okx-client.js";

const EVM_NATIVE = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const XLAYER_CHAIN_INDEX = 196;

function resolveToken(t: string): string {
  const upper = t.toUpperCase();
  if (upper === "NATIVE") return EVM_NATIVE;
  if (upper === "USDC" || upper === "XLAYER_USDC") return XLAYER_USDC.toLowerCase();
  if (upper === "USDG" || upper === "XLAYER_USDG") return XLAYER_USDG.toLowerCase();
  if (upper === "WOKB") return TOKEN_ADDRESSES.WOKB.toLowerCase();
  if (upper === "WETH") return TOKEN_ADDRESSES.WETH.toLowerCase();
  if (upper === "OKB") return TOKEN_ADDRESSES.OKB.toLowerCase();
  if (upper === "WBTC") return TOKEN_ADDRESSES.WBTC.toLowerCase();
  return t === "native" ? EVM_NATIVE : t.toLowerCase();
}

function isNative(addr: string): boolean {
  return addr.toLowerCase() === EVM_NATIVE;
}

function getKnownDecimals(addr: string): number {
  const a = addr.toLowerCase();
  if (a === XLAYER_USDC.toLowerCase()) return 6;
  if (a === XLAYER_USDG.toLowerCase()) return 6;
  if (a === TOKEN_ADDRESSES.WOKB.toLowerCase()) return 18;
  if (a === TOKEN_ADDRESSES.WETH.toLowerCase()) return 18;
  if (a === TOKEN_ADDRESSES.OKB.toLowerCase()) return 18;
  if (a === TOKEN_ADDRESSES.WBTC.toLowerCase()) return 8;
  return 18; // Default to 18 decimals instead of throwing
}

function toMinimalUnits(readable: string, decimals: number): string {
  const s = String(readable).trim();
  const [whole, frac = ""] = s.split(".");
  const neg = whole.startsWith("-");
  const w = neg ? whole.slice(1) : whole;
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const raw = `${w || "0"}${fracPadded}`;
  const normalized = raw.replace(/^0+/, "") || "0";
  return neg ? `-${normalized}` : normalized;
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
      chainId: CHAIN_INDEX,
      chainIndex: CHAIN_INDEX,
      fromTokenAddress: resolveToken(fromToken),
      toTokenAddress: resolveToken(toToken),
      amount: (() => {
        const fromAddr = resolveToken(fromToken);
        const d = isNative(fromAddr) ? 18 : getKnownDecimals(fromAddr);
        if (d == null) throw new Error(`Unknown token decimals for quote: ${fromAddr}`);
        return toMinimalUnits(readableAmount, d);
      })(),
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
    const d = isNative(fromAddr) ? 18 : getKnownDecimals(fromAddr);
    if (d == null) throw new Error(`Unknown token decimals for swap: ${fromAddr}`);
    const amountMinimal = toMinimalUnits(readableAmount, d);

    // Step 1: If ERC-20 source, get and broadcast approval first
    if (!isNative(fromAddr)) {
      const approveJson = await okxFetch<{
        data?: Array<{
          data: string;
          gasLimit: string;
          gasPrice: string;
          dexContractAddress?: string;
        }>;
      }>("/api/v6/dex/aggregator/approve-transaction", {
        params: {
          chainId: CHAIN_INDEX,
          chainIndex: CHAIN_INDEX,
          tokenContractAddress: fromAddr,
          approveAmount: amountMinimal,
        },
      });
      const approveData = approveJson.data?.[0];
      if (approveData) {
        const approveUnsigned = await preTransactionUnsignedInfoContractCall({
          accountId,
          chainIndex: XLAYER_CHAIN_INDEX,
          fromAddr: walletAddress,
          contractAddr: fromAddr,
          amt: "0",
          inputData: approveData.data,
          gasLimit: approveData.gasLimit,
          aaDexTokenAddr: fromAddr,
          aaDexTokenAmount: amountMinimal,
        });
        await signAndBroadcast({
          accountId,
          address: walletAddress,
          chainIndex: CHAIN_INDEX,
          unsignedInfo: approveUnsigned,
        });

        // Wait for the approval transaction to be confirmed on-chain before swapping
        // X Layer block time is ~3s; we wait 5s to be safe.
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    // Step 2: Get swap calldata
    const swapJson = await okxFetch<{
      data?: Array<{
        tx: { to: string; data: string; value: string; gas: string };
        routerResult?: { toTokenAmount: string };
      }>;
    }>("/api/v6/dex/aggregator/swap", {
      params: {
        chainId: CHAIN_INDEX,
        chainIndex: CHAIN_INDEX,
        fromTokenAddress: fromAddr,
        toTokenAddress: toAddr,
        amount: amountMinimal,
        userWalletAddress: walletAddress,
        slippage: slippage,
        slippagePercent: slippage,
      },
    });
    const swapItem = swapJson.data?.[0];
    if (!swapItem?.tx) throw new Error("No swap transaction data returned");

    const { tx, routerResult } = swapItem;

    // Step 3: Sign and broadcast via TEE
    const unsignedInfo = await preTransactionUnsignedInfoContractCall({
      // Use contract-call style unsignedInfo — matches onchainos wallet contract-call path.
      accountId,
      chainIndex: XLAYER_CHAIN_INDEX,
      fromAddr: walletAddress,
      contractAddr: tx.to,
      amt: tx.value ?? "0",
      inputData: tx.data,
      gasLimit: tx.gas,
      ...(isNative(fromAddr) ? {} : { aaDexTokenAddr: fromAddr, aaDexTokenAmount: amountMinimal }),
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

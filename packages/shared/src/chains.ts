import { defineChain } from "viem";

export const XLAYER_CHAIN_ID = 196;
export const XLAYER_CHAIN_INDEX = "196";
export const XLAYER_X402_NETWORK = "eip155:196";

export const xlayer = defineChain({
  id: XLAYER_CHAIN_ID,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: { name: "OKX Explorer", url: "https://www.okx.com/web3/explorer/xlayer" },
  },
});

export const XLAYER_USDG = "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8" as const;
export const XLAYER_USDC = "0x74b7f16337b8972027f6196a17a631ac6de26d22" as const;

/** Contract addresses for common tokens on X Layer (chainId 196). */
export const TOKEN_ADDRESSES: Record<string, string> = {
  USDC: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
  USDG: XLAYER_USDG,
  OKB: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // native OKB uses EVM native sentinel
  WOKB: "0xe538905cf8410324e03a5a23c1c177a474d59b2b",
  WETH: "0x5a77f1443d16ee5761d310e38b7308aaf2d232ee",
  WBTC: "0x236bb48fcf61ce996b2c8c196a9258bc176182e8",
} as const;

/** Resolve a token symbol or address to its contract address. Returns native sentinel for unknown symbols. */
export function resolveTokenAddress(symbolOrAddress: string): string {
  if (symbolOrAddress.startsWith("0x")) return symbolOrAddress.toLowerCase();
  const addr = TOKEN_ADDRESSES[symbolOrAddress.toUpperCase()];
  return addr ?? symbolOrAddress.toLowerCase();
}

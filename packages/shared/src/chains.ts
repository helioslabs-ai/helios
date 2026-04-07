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
export const XLAYER_USDC = "0x74b7f16337b8972027f6196a17a631ac6de26571" as const;

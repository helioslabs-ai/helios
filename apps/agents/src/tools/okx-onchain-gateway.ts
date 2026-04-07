import { tool } from "ai";
import { z } from "zod";

export const okxGatewayGas = tool({
  description: "Estimate gas for a transaction on X Layer via okx-onchain-gateway",
  parameters: z.object({
    chainIndex: z.string().default("196"),
  }),
  execute: async ({ chainIndex }) => {
    // TODO: call onchainos gateway_gas
    return { gasPrice: null, chainIndex };
  },
});

export const okxGatewaySimulate = tool({
  description: "Simulate a transaction before broadcasting",
  parameters: z.object({
    txData: z.string(),
    chainIndex: z.string().default("196"),
  }),
  execute: async ({ txData, chainIndex }) => {
    // TODO: call onchainos gateway_simulate
    return { success: false, txData, chainIndex };
  },
});

export const okxGatewayBroadcast = tool({
  description: "Broadcast a signed transaction on X Layer",
  parameters: z.object({
    signedTx: z.string(),
    chainIndex: z.string().default("196"),
  }),
  execute: async ({ signedTx, chainIndex }) => {
    // TODO: call onchainos gateway_broadcast
    return { txHash: null, signedTx, chainIndex };
  },
});

import { z } from "zod";
import { tool } from "../ai/tool.js";
import { CHAIN_INDEX, firstItem, okxFetch } from "./okx-client.js";

export const okxGatewayGas = tool({
  description:
    "Get current gas prices on X Layer. Returns normal/min/max prices and EIP-1559 fee data.",
  parameters: z.object({
    chain: z.string().default("xlayer"),
  }),
  execute: async () => {
    const params: Record<string, string | undefined> = { chainIndex: CHAIN_INDEX };
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/pre-transaction/gas-price", {
      params,
    });
    return firstItem(json);
  },
});

export const okxGatewaySimulate = tool({
  description:
    "Simulate a transaction (dry-run) before broadcasting. Returns success/revert status and gas used. Use to verify calldata is valid before spending gas.",
  parameters: z.object({
    from: z.string().describe("Sender address"),
    to: z.string().describe("Contract or recipient address"),
    data: z.string().describe("Calldata hex"),
    chain: z.string().default("xlayer"),
    amount: z.string().default("0").describe("Value in minimal units"),
    gasLimit: z.string().optional().describe("Gas limit"),
    gasPrice: z.string().optional().describe("Gas price in wei"),
  }),
  execute: async ({ from, to, data, amount, gasLimit, gasPrice }) => {
    const body: Record<string, string | undefined> = {
      chainIndex: CHAIN_INDEX,
      fromAddress: from,
      toAddress: to,
      txAmount: amount,
      inputData: data,
      gasLimit,
      gasPrice,
    };
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/dex/pre-transaction/simulate", {
      method: "POST",
      body: Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)),
    });
    return firstItem(json);
  },
});

export const okxGatewayBroadcast = tool({
  description: "Broadcast a signed transaction to X Layer. Returns txHash.",
  parameters: z.object({
    signedTx: z.string().describe("Fully signed transaction hex"),
    address: z.string().describe("Sender wallet address"),
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ signedTx, address }) => {
    const body = {
      chainIndex: CHAIN_INDEX,
      signedTx,
      address,
    };
    const json = await okxFetch<{ data?: unknown[] }>(
      "/api/v6/dex/pre-transaction/broadcast-transaction",
      { method: "POST", body },
    );
    return firstItem(json);
  },
});

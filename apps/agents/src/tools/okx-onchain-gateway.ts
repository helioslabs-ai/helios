import { tool } from "../ai/tool.js";
import { z } from "zod";
import { cliData } from "./_cli.js";

export const okxGatewayGas = tool({
  description:
    "Get current gas prices on X Layer. Returns normal/min/max prices and EIP-1559 fee data.",
  parameters: z.object({
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ chain }) => {
    return cliData(["gateway", "gas", "--chain", chain]);
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
  }),
  execute: async ({ from, to, data, chain, amount }) => {
    return cliData([
      "gateway",
      "simulate",
      "--from",
      from,
      "--to",
      to,
      "--data",
      data,
      "--chain",
      chain,
      "--amount",
      amount,
    ]);
  },
});

export const okxGatewayBroadcast = tool({
  description: "Broadcast a signed transaction to X Layer. Returns txHash.",
  parameters: z.object({
    signedTx: z.string().describe("Fully signed transaction hex"),
    address: z.string().describe("Sender wallet address"),
    chain: z.string().default("xlayer"),
  }),
  execute: async ({ signedTx, address, chain }) => {
    return cliData([
      "gateway",
      "broadcast",
      "--signed-tx",
      signedTx,
      "--address",
      address,
      "--chain",
      chain,
    ]);
  },
});

import { z } from "zod";
import { tool } from "../ai/tool.js";
import { allItems, CHAIN_INDEX, okxFetch } from "./okx-client.js";

export const okxDefiPositions = tool({
  description:
    "Get all open DeFi positions for a wallet (yield positions, LP positions, lending). Use to monitor active Aave V3 deposits on X Layer and check harvest readiness.",
  parameters: z.object({
    address: z.string().describe("Wallet address"),
    chains: z.string().default("xlayer").describe("Comma-separated chain names"),
  }),
  execute: async ({ address }) => {
    const body = {
      chainIndex: CHAIN_INDEX,
      investAddress: address,
    };
    const json = await okxFetch<{ data?: unknown[] }>("/api/v6/defi/user/asset/platform/list", {
      method: "POST",
      body,
    });
    const positions = allItems(json);
    return { positions, chain: "xlayer" };
  },
});

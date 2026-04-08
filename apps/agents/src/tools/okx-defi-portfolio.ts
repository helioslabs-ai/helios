import { tool } from "../ai/tool.js";
import { z } from "zod";
import { cliData } from "./_cli.js";

export const okxDefiPositions = tool({
  description:
    "Get all open DeFi positions for a wallet (yield positions, LP positions, lending). Use to monitor active Aave V3 deposits and check harvest readiness.",
  parameters: z.object({
    address: z.string().describe("Wallet address"),
    chains: z.string().default("xlayer").describe("Comma-separated chain names"),
  }),
  execute: async ({ address, chains }) => {
    return cliData(["defi", "positions", "--address", address, "--chains", chains]);
  },
});

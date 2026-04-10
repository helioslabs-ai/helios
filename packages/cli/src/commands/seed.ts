import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as p from "@clack/prompts";

const ENV_PATH = resolve(process.cwd(), ".env");

function readEnv(): Record<string, string> {
  if (!existsSync(ENV_PATH)) return {};
  return Object.fromEntries(
    readFileSync(ENV_PATH, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => {
        const idx = l.indexOf("=");
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      }),
  );
}

export function seedCommand() {
  const env = readEnv();

  const agents = [
    {
      name: "Curator",
      address: env.CURATOR_WALLET_ADDRESS ?? "(not set)",
      usdc: "$4.00",
      purpose: "x402 payments + Aave capital",
    },
    {
      name: "Executor",
      address: env.EXECUTOR_WALLET_ADDRESS ?? "(not set)",
      usdc: "$4.00",
      purpose: "Trading capital",
    },
    {
      name: "Strategist",
      address: env.STRATEGIST_WALLET_ADDRESS ?? "(not set)",
      usdc: "$1.00",
      purpose: "Gas + accumulates x402 fees",
    },
    {
      name: "Sentinel",
      address: env.SENTINEL_WALLET_ADDRESS ?? "(not set)",
      usdc: "$1.00",
      purpose: "Gas + accumulates x402 fees",
    },
  ];

  p.intro("Helios Seed — Fund your agents");

  const colW = { name: 12, address: 44, usdc: 8 };
  const header = [
    "Agent".padEnd(colW.name),
    "Address".padEnd(colW.address),
    "USDC".padEnd(colW.usdc),
    "Purpose",
  ].join("  ");
  const divider = "-".repeat(header.length);

  console.log(`\n${header}`);
  console.log(divider);
  for (const a of agents) {
    console.log(
      [
        a.name.padEnd(colW.name),
        a.address.padEnd(colW.address),
        a.usdc.padEnd(colW.usdc),
        a.purpose,
      ].join("  "),
    );
  }
  console.log();

  p.outro("Fund all 4 addresses on X Layer (chainId 196) before running `helios start`.");
}

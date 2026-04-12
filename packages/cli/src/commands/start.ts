import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as p from "@clack/prompts";
import { post } from "../http.js";

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

export async function startCommand() {
  const env = readEnv();
  const swarmName = env.SWARM_NAME ?? "helios-genesis";
  const curatorAddress = env.CURATOR_WALLET_ADDRESS;

  p.intro("Helios Start");

  if (!curatorAddress) {
    p.cancel("CURATOR_WALLET_ADDRESS not set. Run `helios setup` first.");
    process.exit(1);
  }

  const s = p.spinner();

  const model = env.SWARM_MODEL ?? "gpt-4o";

  s.start("Registering swarm on leaderboard...");
  try {
    await post("/api/registry", {
      swarmName,
      model,
      curatorAddress,
      returnPct: "0",
      pnlUsdc: "0",
      tradeCount: 0,
      cycleCount: 0,
      status: "active",
    });
    s.stop("Swarm registered.");
  } catch (err) {
    s.stop(`Registration failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  s.start("Triggering first cycle...");
  try {
    await post("/api/cycle");
    s.stop("First cycle triggered.");
  } catch (err) {
    s.stop(`Cycle trigger failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const dashboardUrl = env.DASHBOARD_URL ?? "https://heliosfi.xyz/dashboard";
  p.outro(`Monitor at ${dashboardUrl}  ·  or run: helios status`);
}

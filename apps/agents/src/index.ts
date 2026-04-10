import { runCycle, startCycleLoop } from "./agents/curator.js";
import { app } from "./app.js";
import { buildAgentConfigs } from "./config.js";

const PORT = Number(process.env.API_URL?.split(":").pop()) || 3001;
const ENABLE_AGENTS = process.env.ENABLE_AGENTS === "true";
const INTERVAL_MS = (Number(process.env.CHECK_INTERVAL_MINUTES) || 60) * 60 * 1000;

console.log(`[Helios] Starting on port ${PORT}`);
console.log(`[Helios] Agents: ${ENABLE_AGENTS ? "enabled" : "disabled"}`);
console.log(`[Helios] Cycle interval: ${INTERVAL_MS / 60_000}min`);

if (ENABLE_AGENTS) {
  const configs = buildAgentConfigs();

  // First cycle immediately on boot, then on interval
  runCycle(configs).catch((err) => console.error("[Helios] Boot cycle failed:", err));
  startCycleLoop(configs, INTERVAL_MS);

  console.log("[Helios] Agent cycle loop started");
}

export default {
  port: PORT,
  fetch: app.fetch,
};

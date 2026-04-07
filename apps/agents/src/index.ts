import { app } from "./app.js";

const PORT = Number(process.env.API_URL?.split(":").pop()) || 3001;
const ENABLE_AGENTS = process.env.ENABLE_AGENTS === "true";
const INTERVAL_MS = (Number(process.env.CHECK_INTERVAL_MINUTES) || 60) * 60 * 1000;

console.log(`[Helios] Starting on port ${PORT}`);
console.log(`[Helios] Agents: ${ENABLE_AGENTS ? "enabled" : "disabled"}`);
console.log(`[Helios] Cycle interval: ${INTERVAL_MS / 60_000}min`);

if (ENABLE_AGENTS) {
  // TODO: build AgentConfigs from env, start cycle loop
  console.log("[Helios] Agent cycle loop starting...");
}

export default {
  port: PORT,
  fetch: app.fetch,
};

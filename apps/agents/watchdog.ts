import { spawn } from "node:child_process";
import { resolve } from "node:path";

const API_URL = process.env.API_URL ?? "http://localhost:3001";
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;
const ENTRY = resolve(import.meta.dir, "src/index.ts");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let agentProcess: any = null;

function startAgent() {
  console.log("[Watchdog] Starting agent process:", ENTRY);
  agentProcess = spawn("bun", ["run", ENTRY], {
    stdio: "inherit",
    env: process.env,
  });

  agentProcess.on("exit", (code: number | null, signal: string | null) => {
    console.error(`[Watchdog] Agent exited — code=${code} signal=${signal}. Restarting in 5s…`);
    agentProcess = null;
    setTimeout(startAgent, 5_000);
  });
}

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function checkStaleness(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/status`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return true;
    const data = (await res.json()) as { lastCycleAt: string | null };
    if (!data.lastCycleAt) return false;
    const elapsed = Date.now() - new Date(data.lastCycleAt).getTime();
    return elapsed > STALE_THRESHOLD_MS;
  } catch {
    return true;
  }
}

function restartAgent(reason: string) {
  console.error(`[Watchdog] Restarting agent — ${reason}`);
  if (agentProcess) {
    agentProcess.removeAllListeners("exit");
    agentProcess.kill("SIGTERM");
    agentProcess = null;
  }
  setTimeout(startAgent, 2_000);
}

async function check() {
  if (!agentProcess) {
    console.warn("[Watchdog] Agent process not running — starting");
    startAgent();
    return;
  }

  const healthy = await checkHealth();
  if (!healthy) {
    restartAgent("API not responding on /health");
    return;
  }

  const stale = await checkStaleness();
  if (stale) {
    restartAgent("Last cycle is stale (>2h) — hung process");
  }
}

console.log("[Watchdog] Started — checking every 30min");
startAgent();
setInterval(check, CHECK_INTERVAL_MS);

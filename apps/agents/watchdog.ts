/**
 * Watchdog — monitors agent process + Hono API server.
 * Runs as a separate process outside src/.
 *
 * Checks every 30 minutes:
 * - Is the Hono API responding on /health?
 * - Is the last cycle < 2h stale?
 */

const API_URL = process.env.API_URL ?? "http://localhost:3001";
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

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

async function run() {
  console.log("[Watchdog] Started — checking every 30min");

  setInterval(async () => {
    const healthy = await checkHealth();
    if (!healthy) {
      console.error("[Watchdog] API not responding — restart needed");
      // TODO: restart agent process
      return;
    }

    const stale = await checkStaleness();
    if (stale) {
      console.warn("[Watchdog] Last cycle is stale (>2h) — restart needed");
      // TODO: restart agent process
    }
  }, CHECK_INTERVAL_MS);
}

run();

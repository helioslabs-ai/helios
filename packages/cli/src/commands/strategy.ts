import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

function writeEnv(values: Record<string, string>) {
  const existing = readEnv();
  const merged = { ...existing, ...values };
  writeFileSync(
    ENV_PATH,
    `${Object.entries(merged)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n")}\n`,
  );
}

export async function strategyCommand() {
  const existing = readEnv();

  p.intro("Helios Strategy");

  if (existing.SWARM_STRATEGY) {
    console.log(`\nCurrent strategy:\n${existing.SWARM_STRATEGY}\n`);
  }

  const input = await p.text({
    message: "New strategy (leave blank to keep current)",
    placeholder: "e.g. Focus on meme tokens with >$500k volume in last 24h",
  });

  if (p.isCancel(input)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const strategy = (input as string).trim();
  if (!strategy) {
    p.outro("No changes made.");
    return;
  }

  writeEnv({ SWARM_STRATEGY: strategy });
  p.outro("Strategy updated. Takes effect on next cycle.");
}

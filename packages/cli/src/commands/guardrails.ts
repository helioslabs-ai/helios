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

export async function guardrailsCommand() {
  const existing = readEnv();

  p.intro("Helios Guardrails");

  const values = await p.group(
    {
      maxPositionUsd: () =>
        p.text({
          message: "Max Trade Size (USDC)",
          initialValue: existing.MAX_POSITION_USD ?? "1.00",
        }),
      maxSessionLossUsd: () =>
        p.text({
          message: "Max Total Loss (USDC)",
          initialValue: existing.MAX_SESSION_LOSS_USD ?? "2.00",
        }),
      intervalMinutes: () =>
        p.text({
          message: "Cycle interval (minutes, min 30)",
          initialValue: existing.CHECK_INTERVAL_MINUTES ?? "60",
        }),
    },
    {
      onCancel: () => {
        p.cancel("Cancelled.");
        process.exit(0);
      },
    },
  );

  const intervalVal = Math.max(30, Number(values.intervalMinutes) || 60);

  writeEnv({
    MAX_POSITION_USD: values.maxPositionUsd as string,
    MAX_SESSION_LOSS_USD: values.maxSessionLossUsd as string,
    CHECK_INTERVAL_MINUTES: String(intervalVal),
  });

  p.outro("Guardrails updated. Restart the agent server to apply interval changes.");
}

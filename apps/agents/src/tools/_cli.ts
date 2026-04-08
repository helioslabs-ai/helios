import { spawnSync } from "node:child_process";

const ONCHAINOS = process.env.ONCHAINOS_BIN ?? "onchainos";

export function cli(args: string[]): Record<string, unknown> {
  const result = spawnSync(ONCHAINOS, args, {
    encoding: "utf8",
    env: {
      ...process.env,
      OKX_API_KEY: process.env.OKX_API_KEY,
      OKX_SECRET_KEY: process.env.OKX_SECRET_KEY,
      OKX_PASSPHRASE: process.env.OKX_PASSPHRASE,
    },
    timeout: 30_000,
  });

  if (result.error) throw new Error(`CLI spawn error: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`CLI error (exit ${result.status}): ${result.stderr}`);
  }

  const raw = result.stdout.trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : { value: parsed };
  } catch {
    return { raw };
  }
}

export function cliData<T = unknown>(args: string[]): T {
  const out = cli(args) as { ok?: boolean; data?: T };
  return (out.data ?? out) as T;
}

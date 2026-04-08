import * as p from "@clack/prompts";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env");

function readEnv(): Record<string, string> {
  if (!existsSync(ENV_PATH)) return {};
  const lines = readFileSync(ENV_PATH, "utf8").split("\n");
  return Object.fromEntries(
    lines
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
  const lines = Object.entries(merged).map(([k, v]) => `${k}=${v}`);
  writeFileSync(ENV_PATH, lines.join("\n") + "\n");
}

export async function setupCommand() {
  p.intro("Helios Setup");

  const existing = readEnv();

  const okx = await p.group(
    {
      apiKey: () =>
        p.text({
          message: "OKX API Key",
          placeholder: existing.OKX_API_KEY ?? "282ff618-...",
          initialValue: existing.OKX_API_KEY,
        }),
      secretKey: () =>
        p.password({
          message: "OKX Secret Key",
        }),
      passphrase: () =>
        p.password({
          message: "OKX Passphrase",
        }),
    },
    { onCancel: () => { p.cancel("Setup cancelled"); process.exit(0); } },
  );

  const wallets = await p.group(
    {
      curatorAccountId: () =>
        p.text({ message: "Curator Account ID", initialValue: existing.CURATOR_ACCOUNT_ID }),
      curatorAddress: () =>
        p.text({ message: "Curator Wallet Address (0x...)", initialValue: existing.CURATOR_WALLET_ADDRESS }),
      executorAccountId: () =>
        p.text({ message: "Executor Account ID", initialValue: existing.EXECUTOR_ACCOUNT_ID }),
      executorAddress: () =>
        p.text({ message: "Executor Wallet Address (0x...)", initialValue: existing.EXECUTOR_WALLET_ADDRESS }),
      strategistAccountId: () =>
        p.text({ message: "Strategist Account ID", initialValue: existing.STRATEGIST_ACCOUNT_ID }),
      strategistAddress: () =>
        p.text({ message: "Strategist Wallet Address (0x...)", initialValue: existing.STRATEGIST_WALLET_ADDRESS }),
      sentinelAccountId: () =>
        p.text({ message: "Sentinel Account ID", initialValue: existing.SENTINEL_ACCOUNT_ID }),
      sentinelAddress: () =>
        p.text({ message: "Sentinel Wallet Address (0x...)", initialValue: existing.SENTINEL_WALLET_ADDRESS }),
    },
    { onCancel: () => { p.cancel("Setup cancelled"); process.exit(0); } },
  );

  const ai = await p.group(
    {
      openaiKey: () =>
        p.password({ message: "OpenAI API Key (sk-proj-...)" }),
    },
    { onCancel: () => { p.cancel("Setup cancelled"); process.exit(0); } },
  );

  const optional = await p.group(
    {
      deployerKey: () =>
        p.password({ message: "Deployer Private Key (0x..., for forge deploy + logCycle)" }),
      registryAddress: () =>
        p.text({
          message: "HeliosRegistry Address (0x..., leave blank if not deployed)",
          initialValue: existing.HELIOS_REGISTRY_ADDRESS ?? "0x",
        }),
      supabaseUrl: () =>
        p.text({ message: "Supabase URL (optional)", initialValue: existing.SUPABASE_URL }),
      supabaseKey: () =>
        p.text({ message: "Supabase Anon Key (optional)", initialValue: existing.SUPABASE_ANON_KEY }),
    },
    { onCancel: () => { p.cancel("Setup cancelled"); process.exit(0); } },
  );

  writeEnv({
    XLAYER_RPC_URL: "https://rpc.xlayer.tech",
    OKX_API_KEY: okx.apiKey as string,
    OKX_SECRET_KEY: okx.secretKey as string,
    OKX_PASSPHRASE: okx.passphrase as string,
    CURATOR_ACCOUNT_ID: wallets.curatorAccountId as string,
    CURATOR_WALLET_ADDRESS: wallets.curatorAddress as string,
    STRATEGIST_ACCOUNT_ID: wallets.strategistAccountId as string,
    STRATEGIST_WALLET_ADDRESS: wallets.strategistAddress as string,
    SENTINEL_ACCOUNT_ID: wallets.sentinelAccountId as string,
    SENTINEL_WALLET_ADDRESS: wallets.sentinelAddress as string,
    EXECUTOR_ACCOUNT_ID: wallets.executorAccountId as string,
    EXECUTOR_WALLET_ADDRESS: wallets.executorAddress as string,
    HELIOS_REGISTRY_ADDRESS: optional.registryAddress as string,
    DEPLOYER_PRIVATE_KEY: optional.deployerKey as string,
    OPENAI_API_KEY: ai.openaiKey as string,
    SUPABASE_URL: (optional.supabaseUrl as string) ?? "",
    SUPABASE_ANON_KEY: (optional.supabaseKey as string) ?? "",
    API_URL: "http://localhost:3001",
    ENABLE_AGENTS: "false",
    CHECK_INTERVAL_MINUTES: "60",
  });

  p.outro(`.env written to ${ENV_PATH}. Run 'helios status' to verify.`);
}

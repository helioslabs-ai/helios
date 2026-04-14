import type { AgentName } from "../types.js";

/** Public Helios swarm wallets (X Layer). Used when env vars are unset (e.g. dashboard API). */
export const DEFAULT_AGENT_WALLET_ADDRESSES: Record<AgentName, `0x${string}`> = {
  curator: "0x726cf0c4fe559db9a32396161694c7b88c60c947",
  strategist: "0x3c69ed447ccd8d515e73dd81e6a0f56edd7623ed",
  sentinel: "0x95923bc7280cc182559f2bc7b368c09448726d4f",
  executor: "0x88a200567d660d88ac0afbe781e9e97b6d570ab6",
};

export function resolveAgentWalletAddress(name: AgentName): string {
  const envKey = `${name.toUpperCase()}_WALLET_ADDRESS` as const;
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_AGENT_WALLET_ADDRESSES[name];
}

import type { AgentName } from "./types";

/** Helios public swarm (X Layer) — used when API/env omit addresses (e.g. edge caching). */
const PUBLIC_AGENT_WALLET_ADDRESSES: Record<AgentName, string> = {
  curator: "0x726cf0c4fe559db9a32396161694c7b88c60c947",
  strategist: "0x3c69ed447ccd8d515e73dd81e6a0f56edd7623ed",
  sentinel: "0x95923bc7280cc182559f2bc7b368c09448726d4f",
  executor: "0x88a200567d660d88ac0afbe781e9e97b6d570ab6",
};

export function resolveDashboardAgentAddress(name: AgentName, fromApi?: string): string {
  const trimmed = fromApi?.trim();
  if (trimmed) return trimmed;
  const pub = process.env[`NEXT_PUBLIC_${name.toUpperCase()}_WALLET_ADDRESS`]?.trim();
  if (pub) return pub;
  return PUBLIC_AGENT_WALLET_ADDRESSES[name];
}

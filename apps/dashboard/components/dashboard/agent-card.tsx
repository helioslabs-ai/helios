import { getOkLinkAddressUrl } from "@/lib/api";
import type { AgentInfo, SwarmState } from "@/lib/types";
import { cn, truncateAddress } from "@/lib/utils";

interface Props {
  agent: AgentInfo;
  swarmState: SwarmState;
  isHalted: boolean;
}

const AGENT_ACTIVE_STATE: Partial<Record<SwarmState, string>> = {
  STRATEGIST_SCAN: "strategist",
  SENTINEL_CHECK: "sentinel",
  EXECUTOR_DEPLOY: "executor",
  COMPOUNDING: "executor",
  YIELD_PARK: "curator",
};

const AGENT_LABELS: Record<string, string> = {
  curator: "Curator",
  strategist: "Strategist",
  sentinel: "Sentinel",
  executor: "Executor",
};

const AGENT_ROLES: Record<string, string> = {
  curator: "Orchestrator",
  strategist: "Market Scanner",
  sentinel: "Risk Guard",
  executor: "Trade Engine",
};

const AGENT_DESCRIPTIONS: Record<string, string> = {
  curator: "Coordinates every cycle, pays agents via x402, and compounds capital.",
  strategist: "Scans for high-conviction alpha and yield opportunities on X Layer.",
  sentinel: "Scores risk before execution and blocks unsafe deployments.",
  executor: "Executes swaps and yield deposits, then records onchain outcomes.",
};

function getAgentStatus(
  agentName: string,
  swarmState: SwarmState,
  isHalted: boolean,
): { label: string; color: string; dotColor: string } {
  if (isHalted) return { label: "HALTED", color: "text-red", dotColor: "bg-red" };
  const activeAgent = AGENT_ACTIVE_STATE[swarmState];
  if (activeAgent === agentName)
    return { label: "ACTIVE", color: "text-gold", dotColor: "bg-gold animate-pulse-gold" };
  if (swarmState === "YIELD_PARK" && agentName === "executor")
    return {
      label: "DEPOSITING",
      color: "text-emerald",
      dotColor: "bg-emerald animate-pulse-gold",
    };
  if (swarmState !== "IDLE" && agentName === "curator")
    return { label: "RUNNING", color: "text-gold", dotColor: "bg-gold animate-pulse-gold" };
  return { label: "IDLE", color: "text-text-muted", dotColor: "bg-text-muted" };
}

export function AgentCard({ agent, swarmState, isHalted }: Props) {
  const status = getAgentStatus(agent.name, swarmState, isHalted);
  const addressUrl = agent.address ? getOkLinkAddressUrl(agent.address) : "#";

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface bg-grid p-4 flex flex-col gap-3 transition-all",
        "border-border-dim hover:border-border-bright",
        status.label === "ACTIVE" && "shadow-gold-glow border-gold/30",
        status.label === "HALTED" && "shadow-red-glow border-red/30",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full shrink-0", status.dotColor)} />
          <span className="font-mono text-sm font-semibold text-gold uppercase tracking-wider">
            {AGENT_LABELS[agent.name]}
          </span>
        </div>
        <span
          className={cn(
            "text-[10px] font-mono font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded border",
            status.label === "ACTIVE"
              ? "text-gold border-gold/40 bg-gold/10"
              : status.label === "HALTED"
                ? "text-red border-red/40 bg-red/10"
                : "text-text-muted border-border-dim bg-transparent",
          )}
        >
          {status.label}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-mono text-text-dim uppercase tracking-widest">
          {AGENT_ROLES[agent.name]}
        </span>
        <span className="font-mono text-[11px] leading-relaxed text-text-muted">
          {AGENT_DESCRIPTIONS[agent.name]}
        </span>
        {agent.address ? (
          <a
            href={addressUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-text-muted hover:text-gold transition-colors"
            title={agent.address}
          >
            {truncateAddress(agent.address)}
          </a>
        ) : (
          <span className="font-mono text-xs text-text-dim">no address</span>
        )}
      </div>
    </div>
  );
}

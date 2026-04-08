import type { EconomyData } from "@/lib/types";

interface Props {
  economy: EconomyData;
}

const AGENTS = ["strategist", "sentinel", "executor"] as const;

const AGENT_COLORS: Record<string, string> = {
  strategist: "#3B82F6",
  sentinel: "#10B981",
  executor: "#F97316",
};

export function PaymentFlow({ economy }: Props) {
  return (
    <div className="rounded-lg border border-border-dim bg-surface p-6">
      <div className="text-xs font-mono text-text-muted uppercase tracking-widest mb-6">
        x402 Payment Flow
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Curator (source) */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="size-14 rounded-full border-2 border-gold/50 bg-gold/10 flex items-center justify-center">
            <span className="text-xs font-mono font-bold text-gold">CUR</span>
          </div>
          <span className="text-[10px] font-mono text-text-muted uppercase">Curator</span>
          <span className="text-xs font-mono text-gold">${economy.perAgent.curator ?? "0"}</span>
        </div>

        {/* Arrows to each agent */}
        <div className="flex-1 flex flex-col gap-3">
          {AGENTS.map((agent) => (
            <div key={agent} className="flex items-center gap-2">
              <div className="flex-1 h-px border-t border-dashed border-gold/30 relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-[10px] font-mono px-1.5 rounded bg-surface"
                  style={{ color: AGENT_COLORS[agent] }}
                >
                  0.001 USDG
                </div>
              </div>
              <svg width="8" height="10" viewBox="0 0 8 10" fill={AGENT_COLORS[agent]}>
                <path d="M0 0 L8 5 L0 10 Z" />
              </svg>
            </div>
          ))}
        </div>

        {/* Target agents */}
        <div className="flex flex-col gap-3 shrink-0">
          {AGENTS.map((agent) => (
            <div key={agent} className="flex items-center gap-2">
              <div
                className="size-10 rounded-full border flex items-center justify-center"
                style={{
                  borderColor: `${AGENT_COLORS[agent]}50`,
                  backgroundColor: `${AGENT_COLORS[agent]}10`,
                }}
              >
                <span
                  className="text-[10px] font-mono font-bold uppercase"
                  style={{ color: AGENT_COLORS[agent] }}
                >
                  {agent.slice(0, 3)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-text-muted capitalize">{agent}</span>
                <span className="text-xs font-mono" style={{ color: AGENT_COLORS[agent] }}>
                  ${economy.perAgent[agent] ?? "0"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border-dim flex items-center justify-between font-mono text-xs">
        <span className="text-text-muted">Total paid</span>
        <span className="text-gold font-semibold">${economy.totalX402PaidUsdc} USDG</span>
      </div>
    </div>
  );
}

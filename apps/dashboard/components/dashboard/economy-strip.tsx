import type { EconomyData } from "@/lib/types";

interface Props {
  economy: EconomyData;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-mono text-text-muted uppercase tracking-widest">{label}</span>
      <span className="text-2xl font-mono font-bold text-gold">{value}</span>
      {sub && <span className="text-xs font-mono text-text-dim">{sub}</span>}
    </div>
  );
}

export function EconomyStrip({ economy }: Props) {
  return (
    <div className="w-full border-b border-border-dim bg-surface px-6 py-4">
      <div className="flex items-center gap-12">
        <Stat label="Cycles" value={economy.totalCycles.toString()} />
        <div className="w-px h-10 bg-border-dim" />
        <Stat label="X402 Paid" value={`$${economy.totalX402PaidUsdc}`} sub="USDG total" />
        <div className="w-px h-10 bg-border-dim" />
        <Stat label="Onchain Txns" value={economy.totalX402Txns.toString()} sub="X Layer" />
        <div className="w-px h-10 bg-border-dim" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-mono text-text-muted uppercase tracking-widest">
            Per Agent (USDG)
          </span>
          <div className="flex items-center gap-4">
            {(["curator", "strategist", "sentinel", "executor"] as const).map((agent) => (
              <span key={agent} className="text-xs font-mono">
                <span className="text-text-muted capitalize">{agent.slice(0, 3)}</span>
                <span className="text-text ml-1">{economy.perAgent[agent] ?? "0"}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

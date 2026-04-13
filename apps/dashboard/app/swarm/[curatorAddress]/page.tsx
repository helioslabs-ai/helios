import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchSwarm, getOkLinkAddressUrl } from "@/lib/api";

function StatCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string | number;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#1a1c24] bg-[#0A0C10] px-5 py-4">
      <div
        className={`text-xl font-bold tabular-nums font-mono ${
          positive === true
            ? "text-[#10b981]"
            : positive === false
              ? "text-[#ef4444]"
              : "text-[#f1f5f9]"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-[#64748b] uppercase tracking-wider">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20",
    halted: "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20",
    stopped: "bg-[#64748b]/10 text-[#64748b] border-[#64748b]/20",
    error: "bg-[#FFA30F]/10 text-[#FFA30F] border-[#FFA30F]/20",
  };
  const cls = styles[status] ?? styles.stopped;
  return (
    <span
      className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-mono font-medium uppercase tracking-wider ${cls}`}
    >
      {status}
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1c24] last:border-0">
      <span className="text-sm text-[#64748b]">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

export default async function SwarmPage({
  params,
}: {
  params: Promise<{ curatorAddress: string }>;
}) {
  const { curatorAddress } = await params;
  const swarm = await fetchSwarm(curatorAddress);

  if (!swarm) {
    redirect("/");
  }

  const returnPct = Number.parseFloat(swarm.returnPct ?? "0");
  const pnlUsdc = Number.parseFloat(swarm.pnlUsdc ?? "0");
  const isPositive = returnPct >= 0;

  return (
    <main className="min-h-screen bg-[#0F0D0E] text-[#f1f5f9] bg-grid">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#FFA30F]/40 to-transparent" />

      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Back */}
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#FFA30F] transition-colors font-mono"
        >
          ← Leaderboard
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{swarm.swarmName}</h1>
            {swarm.model && (
              <div className="mt-1.5 text-sm text-[#64748b] font-mono">{swarm.model}</div>
            )}
          </div>
          <StatusBadge status={swarm.status} />
        </div>

        {/* Stats grid */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Return"
            value={`${isPositive ? "+" : ""}${returnPct.toFixed(2)}%`}
            positive={isPositive}
          />
          <StatCard
            label="PnL (USDC)"
            value={`${isPositive ? "+" : ""}$${Math.abs(pnlUsdc).toFixed(4)}`}
            positive={isPositive}
          />
          <StatCard label="Trades" value={swarm.tradeCount} />
          <StatCard label="Cycles" value={swarm.cycleCount} />
        </div>

        {/* Detail card */}
        <div className="rounded-lg border border-[#1a1c24] bg-[#0A0C10] overflow-hidden">
          <DetailRow label="Curator address">
            <a
              href={getOkLinkAddressUrl(swarm.curatorAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[#FFA30F] hover:text-[#FFB84D] transition-colors"
            >
              {swarm.curatorAddress.slice(0, 8)}…{swarm.curatorAddress.slice(-6)}
            </a>
          </DetailRow>
          <DetailRow label="Registered">
            <span className="font-mono text-[#94a3b8]">
              {new Date(swarm.registeredAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </DetailRow>
          <DetailRow label="Last updated">
            <span className="font-mono text-[#94a3b8]">
              {new Date(swarm.lastUpdated).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </DetailRow>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-[#334155]">
          All activity verified onchain · X Layer (chainId 196)
        </p>
      </div>
    </main>
  );
}

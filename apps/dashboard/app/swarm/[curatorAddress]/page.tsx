import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchSwarm } from "@/lib/api";
import { getOkLinkAddressUrl } from "@/lib/api";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-4">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    halted: "bg-red-500/20 text-red-400 border-red-500/30",
    stopped: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    error: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };
  const cls = colors[status] ?? colors.stopped;
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
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
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Back */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Leaderboard
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{swarm.swarmName}</h1>
            {swarm.model && (
              <div className="mt-1 text-sm text-zinc-500">{swarm.model}</div>
            )}
          </div>
          <StatusBadge status={swarm.status} />
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Return %"
            value={`${isPositive ? "+" : ""}${returnPct.toFixed(2)}%`}
          />
          <StatCard
            label="PnL (USDC)"
            value={`${isPositive ? "+" : ""}$${pnlUsdc.toFixed(4)}`}
          />
          <StatCard label="Trades" value={swarm.tradeCount} />
          <StatCard label="Cycles" value={swarm.cycleCount} />
        </div>

        {/* Details */}
        <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/10">
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm text-zinc-500">Curator address</span>
            <a
              href={getOkLinkAddressUrl(swarm.curatorAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              {swarm.curatorAddress.slice(0, 8)}…{swarm.curatorAddress.slice(-6)}
            </a>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm text-zinc-500">Registered</span>
            <span className="text-sm text-zinc-300">
              {new Date(swarm.registeredAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm text-zinc-500">Last updated</span>
            <span className="text-sm text-zinc-300">
              {new Date(swarm.lastUpdated).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

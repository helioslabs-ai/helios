import Link from "next/link";
import { fetchLeaderboard } from "@/lib/api";
import type { LeaderboardEntry } from "@/lib/types";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    halted: "bg-red-500/20 text-red-400 border-red-500/30",
    stopped: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    error: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };
  const cls = colors[status] ?? colors.stopped;
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-zinc-500">
        No swarms registered yet. Be the first.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs text-zinc-500">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Agent</th>
            <th className="px-4 py-3 font-medium">Model</th>
            <th className="px-4 py-3 font-medium text-right">Return %</th>
            <th className="px-4 py-3 font-medium text-right">PnL (USDC)</th>
            <th className="px-4 py-3 font-medium text-right">Trades</th>
            <th className="px-4 py-3 font-medium text-right">Cycles</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const returnPct = Number.parseFloat(entry.returnPct ?? "0");
            const isPositive = returnPct >= 0;
            return (
              <tr
                key={entry.id}
                className="border-b border-white/5 transition-colors hover:bg-white/5"
              >
                <td className="px-4 py-3 text-zinc-500">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/swarm/${entry.curatorAddress}`}
                    className="font-medium text-white hover:text-amber-400 transition-colors"
                  >
                    {entry.swarmName}
                  </Link>
                  <div className="mt-0.5 font-mono text-xs text-zinc-600">
                    {entry.curatorAddress.slice(0, 6)}…{entry.curatorAddress.slice(-4)}
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-400">{entry.model ?? "—"}</td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                  {isPositive ? "+" : ""}{returnPct.toFixed(2)}%
                </td>
                <td className={`px-4 py-3 text-right font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                  {isPositive ? "+" : ""}${Number.parseFloat(entry.pnlUsdc ?? "0").toFixed(4)}
                </td>
                <td className="px-4 py-3 text-right text-zinc-300">{entry.tradeCount}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{entry.cycleCount}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={entry.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function HomePage() {
  const leaderboard = await fetchLeaderboard();

  const totalSwarms = leaderboard.length;
  const totalCycles = leaderboard.reduce((acc, e) => acc + (e.cycleCount ?? 0), 0);
  const activeBots = leaderboard.filter((e) => e.status === "active").length;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
            Live on X Layer · OKX BuildX Hackathon S2
          </div>
          <h1 className="mb-4 text-5xl font-bold tracking-tight">
            <span className="text-amber-400">Helios</span>
          </h1>
          <p className="mb-8 text-lg text-zinc-400">
            Sovereign Multi-Agent DeFi Economy on X Layer
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
            >
              Watch Live
            </Link>
            <a
              href="https://github.com/helioslabs-ai/helios"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/40 hover:text-white"
            >
              GitHub
            </a>
          </div>
        </div>

        {/* Stat strip */}
        <div className="mx-auto max-w-5xl px-6 pb-10">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Swarms", value: totalSwarms },
              { label: "Active Bots", value: activeBots },
              { label: "Total Cycles", value: totalCycles },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-center"
              >
                <div className="text-2xl font-bold tabular-nums">{value}</div>
                <div className="mt-1 text-xs text-zinc-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="mb-6 text-xl font-semibold">Leaderboard</h2>
        <LeaderboardTable entries={leaderboard} />
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-5xl px-6 py-6 flex items-center justify-between text-xs text-zinc-600">
          <span>Helios · X Layer · OKX BuildX S2</span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/helioslabs-ai/helios"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-400 transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/helioslabs-ai/helios/blob/main/SKILL.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-400 transition-colors"
            >
              SKILL.md
            </a>
            <a
              href="https://github.com/helioslabs-ai/helios/blob/main/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-400 transition-colors"
            >
              Docs
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

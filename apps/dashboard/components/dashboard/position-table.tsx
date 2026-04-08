import { getOkLinkTxUrl } from "@/lib/api";
import type { Position, YieldPosition } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

interface Props {
  openPositions: Position[];
  closedPositions: Position[];
  yieldPosition: YieldPosition | null;
}

export function PositionTable({ openPositions, closedPositions, yieldPosition }: Props) {
  const allPositions = [...openPositions, ...closedPositions];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-dim">
        <span className="text-xs font-mono text-text-muted uppercase tracking-widest">
          Positions
        </span>
        <span className="text-xs font-mono text-text-dim">
          {openPositions.length} open
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {yieldPosition && <YieldCard yieldPosition={yieldPosition} />}

        {allPositions.length === 0 && !yieldPosition ? (
          <div className="flex items-center justify-center h-32 text-text-dim text-sm font-mono">
            no positions
          </div>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border-dim">
                {["Token", "Entry", "Size", "P&L", "Status", "Age", "Tx"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-text-dim uppercase tracking-widest font-normal"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPositions.map((pos) => (
                <PositionRow key={pos.entryTxHash} position={pos} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PositionRow({ position: p }: { position: Position }) {
  const pnlPositive = (p.pnlPct ?? 0) >= 0;

  return (
    <tr className="border-b border-border-dim/50 hover:bg-surface-raised transition-colors">
      <td className="px-4 py-2.5 font-semibold text-text">{p.token}</td>
      <td className="px-4 py-2.5 text-text-muted tabular-nums">${p.entryPrice}</td>
      <td className="px-4 py-2.5 text-text-muted tabular-nums">${p.sizeUsdc}</td>
      <td
        className={cn(
          "px-4 py-2.5 font-semibold tabular-nums",
          p.pnlPct !== undefined
            ? pnlPositive
              ? "text-emerald"
              : "text-red"
            : "text-text-dim",
        )}
      >
        {p.pnlPct !== undefined
          ? `${pnlPositive ? "+" : ""}${p.pnlPct.toFixed(2)}%`
          : "—"}
      </td>
      <td className="px-4 py-2.5">
        <StatusBadge status={p.status} exitCondition={p.exitCondition} />
      </td>
      <td className="px-4 py-2.5 text-text-dim">{formatRelativeTime(p.enteredAt)}</td>
      <td className="px-4 py-2.5">
        {p.entryTxHash && (
          <a
            href={getOkLinkTxUrl(p.entryTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue hover:text-gold transition-colors"
            title={p.entryTxHash}
          >
            {p.entryTxHash.slice(0, 6)}…
          </a>
        )}
      </td>
    </tr>
  );
}

function StatusBadge({
  status,
  exitCondition,
}: {
  status: Position["status"];
  exitCondition?: Position["exitCondition"];
}) {
  if (status === "open") {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border text-gold border-gold/40 bg-gold/10">
        OPEN
      </span>
    );
  }

  const label =
    exitCondition === "take_profit"
      ? "PROFIT"
      : exitCondition === "sentinel_block"
        ? "BLOCKED"
        : exitCondition === "circuit_breaker"
          ? "CB EXIT"
          : "CLOSED";

  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border text-text-dim border-border-dim">
      {label}
    </span>
  );
}

function YieldCard({ yieldPosition: y }: { yieldPosition: YieldPosition }) {
  return (
    <div className="mx-4 my-3 rounded border border-emerald/20 bg-emerald/5 px-4 py-3 flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
          Yield Position
        </span>
        <span className="text-sm font-mono font-semibold text-emerald">{y.platform}</span>
      </div>
      <div className="flex items-center gap-6 font-mono text-sm">
        <span className="text-text-muted">
          <span className="text-text">${y.amountUsdc}</span> USDC
        </span>
        <span className="text-emerald font-semibold">{y.apy} APY</span>
        <span className="text-text-dim text-xs">{formatRelativeTime(y.depositedAt)}</span>
      </div>
    </div>
  );
}

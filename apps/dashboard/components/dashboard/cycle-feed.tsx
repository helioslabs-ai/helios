"use client";

import { useEffect, useRef } from "react";
import { getOkLinkTxUrl } from "@/lib/api";
import type { CycleAction, CycleSummary, SentinelVerdict } from "@/lib/types";
import { cn, formatAbsoluteTime, formatRelativeTime } from "@/lib/utils";

interface Props {
  cycles: CycleSummary[];
}

const ACTION_DOT: Record<CycleAction, string> = {
  buy: "bg-gold",
  yield_park: "bg-emerald",
  no_alpha: "bg-text-dim",
  hold: "bg-text-dim",
};

const ACTION_LABEL: Record<CycleAction, string> = {
  buy: "BUY",
  yield_park: "YIELD_PARK",
  no_alpha: "NO_ALPHA",
  hold: "HOLD",
};

const ACTION_COLOR: Record<CycleAction, string> = {
  buy: "text-gold",
  yield_park: "text-emerald",
  no_alpha: "text-text-muted",
  hold: "text-text-muted",
};

const VERDICT_COLOR: Record<SentinelVerdict, string> = {
  CLEAR: "text-emerald",
  BLOCK: "text-red",
};

export function CycleFeed({ cycles }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cycles.length]);

  const sorted = [...cycles].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime(),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-dim">
        <span className="text-xs font-mono text-text-muted uppercase tracking-widest">
          Cycle Feed
        </span>
        <span className="text-xs font-mono text-text-dim">{cycles.length} cycles</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-text-dim text-sm font-mono">
            awaiting first cycle...
          </div>
        ) : (
          <div className="flex flex-col">
            {sorted.map((cycle, idx) => (
              <CycleRow
                key={cycle.id}
                cycle={cycle}
                isLatest={idx === sorted.length - 1}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function CycleRow({ cycle, isLatest }: { cycle: CycleSummary; isLatest: boolean }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-2.5 border-b border-border-dim/50 font-mono text-xs",
        "hover:bg-surface-raised transition-colors",
        isLatest && "animate-slide-in",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full shrink-0 mt-1.5",
          ACTION_DOT[cycle.action],
        )}
      />

      <span className="text-text-dim w-16 shrink-0 tabular-nums">
        {formatAbsoluteTime(cycle.ts)}
      </span>

      <span className={cn("w-20 shrink-0 font-semibold", ACTION_COLOR[cycle.action])}>
        {ACTION_LABEL[cycle.action]}
      </span>

      <span className="text-text-muted flex-1 truncate" title={cycle.reasoning}>
        {cycle.reasoning}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        {cycle.sentinelVerdict && (
          <span className={cn("text-[10px] font-semibold", VERDICT_COLOR[cycle.sentinelVerdict])}>
            {cycle.sentinelVerdict}
          </span>
        )}
        {cycle.txHashes.map((hash) => (
          <a
            key={hash}
            href={getOkLinkTxUrl(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue hover:text-gold transition-colors"
            title={hash}
          >
            {hash.slice(0, 6)}…
          </a>
        ))}
      </div>
    </div>
  );
}

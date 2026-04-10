import type { CycleSummary } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

interface Props {
  lastCycle: CycleSummary | null;
}

const ACTION_COLOR: Record<string, string> = {
  buy: "text-gold",
  yield_park: "text-emerald",
  no_alpha: "text-text-muted",
  hold: "text-text-muted",
};

export function ReasoningBlock({ lastCycle }: Props) {
  return (
    <div className="rounded-lg border border-border-dim bg-surface p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-text-muted uppercase tracking-widest">
          Last Decision
        </span>
        {lastCycle && (
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-mono font-semibold", ACTION_COLOR[lastCycle.action])}>
              {lastCycle.action.toUpperCase()}
            </span>
            <span className="text-xs font-mono text-text-dim">
              {formatRelativeTime(lastCycle.ts)}
            </span>
          </div>
        )}
      </div>

      {lastCycle ? (
        <p className="text-sm font-mono text-text-muted leading-relaxed italic border-l-2 border-gold/30 pl-3">
          "{lastCycle.reasoning}"
        </p>
      ) : (
        <p className="text-sm font-mono text-text-dim italic">No cycles completed yet.</p>
      )}
    </div>
  );
}

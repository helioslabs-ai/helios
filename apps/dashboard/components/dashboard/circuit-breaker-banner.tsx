import type { CircuitBreaker } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

interface Props {
  circuitBreaker: CircuitBreaker;
}

export function CircuitBreakerBanner({ circuitBreaker }: Props) {
  if (!circuitBreaker.halted) return null;

  return (
    <div className="w-full bg-red/10 border-y border-red/40 shadow-red-glow px-6 py-3 flex items-center gap-3">
      <span className="size-2.5 rounded-full bg-red animate-blink-red shrink-0" />
      <span className="font-mono text-sm font-semibold text-red uppercase tracking-wider">
        Circuit Breaker Tripped
      </span>
      <span className="text-text-muted text-sm font-mono">—</span>
      <span className="text-sm font-mono text-text-muted">
        {circuitBreaker.reason ?? "Unknown reason"}
      </span>
      <span className="ml-auto text-xs font-mono text-text-dim">
        {circuitBreaker.consecutiveFailures} consecutive failure
        {circuitBreaker.consecutiveFailures !== 1 ? "s" : ""}
        {circuitBreaker.haltedAt ? ` · halted ${formatRelativeTime(circuitBreaker.haltedAt)}` : ""}
      </span>
    </div>
  );
}

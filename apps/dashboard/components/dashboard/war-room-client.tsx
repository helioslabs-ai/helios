"use client";

import { useEffect, useRef, useState } from "react";
import { getCycleUrl, getSseUrl } from "@/lib/api";
import type { CycleSummary, DashboardData, SsePayload, SwarmState, SwarmStatus } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { AgentCard } from "./agent-card";
import { CircuitBreakerBanner } from "./circuit-breaker-banner";
import { CycleFeed } from "./cycle-feed";
import { EconomyStrip } from "./economy-strip";
import { PaymentFlow } from "./payment-flow";
import { PositionTable } from "./position-table";
import { ReasoningBlock } from "./reasoning-block";

type Tab = "command" | "transactions" | "portfolio" | "economy";

interface Props {
  initial: DashboardData;
}

const STATE_LABEL: Record<SwarmState, string> = {
  IDLE: "IDLE",
  STRATEGIST_SCAN: "SCANNING",
  SENTINEL_CHECK: "ASSESSING",
  EXECUTOR_DEPLOY: "DEPLOYING",
  COMPOUNDING: "COMPOUNDING",
  YIELD_PARK: "DEPOSITING",
};

export function WarRoomClient({ initial }: Props) {
  const [data, setData] = useState<DashboardData>(initial);
  const [tab, setTab] = useState<Tab>("command");
  const [live, setLive] = useState(false);
  const [triggeringCycle, setTriggeringCycle] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(getSseUrl());
    esRef.current = es;

    es.addEventListener("state", (e: MessageEvent) => {
      const payload = JSON.parse(e.data) as SsePayload;
      setLive(true);
      setData((prev) => ({
        ...prev,
        status: payload.state,
        positions: {
          ...prev.positions,
          openPositions: payload.openPositions,
        },
        cycles: mergeCycles(prev.cycles, payload.recentCycles),
      }));
    });

    es.onerror = () => setLive(false);

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  async function triggerCycle() {
    setTriggeringCycle(true);
    try {
      await fetch(getCycleUrl(), { method: "POST" });
    } finally {
      setTriggeringCycle(false);
    }
  }

  const { status, agents, economy, cycles, positions } = data;
  const lastCycle = cycles.length > 0 ? cycles[cycles.length - 1] : null;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-dim bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <HexLogo />
          <div>
            <h1 className="text-sm font-mono font-bold text-gold uppercase tracking-widest">
              Helios
            </h1>
            <p className="text-[10px] font-mono text-text-dim uppercase tracking-widest">
              War Room
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Statebadge state={status.swarmState} />
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                live ? "bg-emerald animate-pulse-gold" : "bg-text-dim",
              )}
            />
            <span className={cn("text-xs font-mono", live ? "text-emerald" : "text-text-dim")}>
              {live ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          {status.lastCycleAt && (
            <span className="text-xs font-mono text-text-dim hidden md:block">
              last cycle {formatRelativeTime(status.lastCycleAt)}
            </span>
          )}
        </div>
      </header>

      {/* Economy strip */}
      <EconomyStrip economy={economy} />

      {/* Circuit breaker */}
      <CircuitBreakerBanner circuitBreaker={status.circuitBreaker} />

      {/* Tabs */}
      <nav className="flex items-center gap-0 border-b border-border-dim bg-surface shrink-0 px-6">
        {(
          [
            ["command", "Command Center"],
            ["transactions", "Transactions"],
            ["portfolio", "Portfolio"],
            ["economy", "Economy"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-3 text-xs font-mono uppercase tracking-widest transition-colors border-b-2 -mb-px",
              tab === id
                ? "text-gold border-gold"
                : "text-text-muted border-transparent hover:text-text",
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {tab === "command" && (
          <CommandCenter
            status={status}
            agents={agents}
            cycles={cycles}
            lastCycle={lastCycle}
            positions={positions}
            onTriggerCycle={triggerCycle}
            triggeringCycle={triggeringCycle}
          />
        )}
        {tab === "transactions" && <TransactionsView cycles={cycles} />}
        {tab === "portfolio" && <PortfolioView positions={positions} />}
        {tab === "economy" && <EconomyView economy={economy} />}
      </div>
    </div>
  );
}

function mergeCycles(prev: CycleSummary[], incoming: CycleSummary[]): CycleSummary[] {
  const ids = new Set(prev.map((c) => c.id));
  const newOnes = incoming.filter((c) => !ids.has(c.id));
  return [...prev, ...newOnes].slice(-50);
}

function CommandCenter({
  status,
  agents,
  cycles,
  lastCycle,
  positions,
  onTriggerCycle,
  triggeringCycle,
}: {
  status: SwarmStatus;
  agents: DashboardData["agents"];
  cycles: CycleSummary[];
  lastCycle: CycleSummary | null;
  positions: DashboardData["positions"];
  onTriggerCycle: () => void;
  triggeringCycle: boolean;
}) {
  return (
    <div className="flex h-full">
      {/* Left 60% — cycle feed + reasoning */}
      <div className="w-[60%] flex flex-col border-r border-border-dim min-h-0">
        <div className="flex-1 overflow-hidden">
          <CycleFeed cycles={cycles} />
        </div>
        <div className="p-4 border-t border-border-dim shrink-0">
          <ReasoningBlock lastCycle={lastCycle} />
        </div>
      </div>

      {/* Right 40% — agents + run button */}
      <div className="w-[40%] flex flex-col p-4 gap-4 overflow-y-auto">
        <div className="grid grid-cols-1 gap-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.name}
              agent={agent}
              swarmState={status.swarmState}
              isHalted={status.circuitBreaker.halted}
            />
          ))}
          {agents.length === 0 &&
            (["curator", "strategist", "sentinel", "executor"] as const).map((name) => (
              <AgentCard
                key={name}
                agent={{ name, address: "", accountId: "" }}
                swarmState={status.swarmState}
                isHalted={status.circuitBreaker.halted}
              />
            ))}
        </div>

        <button
          type="button"
          onClick={onTriggerCycle}
          disabled={triggeringCycle || status.circuitBreaker.halted}
          className={cn(
            "w-full py-3 rounded-lg border font-mono text-sm font-semibold uppercase tracking-widest transition-all",
            "border-gold text-gold hover:bg-gold hover:text-[#07070E]",
            "disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gold",
            !triggeringCycle && !status.circuitBreaker.halted && "hover:shadow-gold-glow",
          )}
        >
          {triggeringCycle ? "Triggering..." : "Run Cycle"}
        </button>

        <div className="rounded-lg border border-border-dim bg-surface p-4">
          <div className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-2">
            Open Positions
          </div>
          <PositionTable
            openPositions={positions.openPositions}
            closedPositions={[]}
            yieldPosition={positions.yieldPosition}
          />
        </div>
      </div>
    </div>
  );
}

function TransactionsView({ cycles }: { cycles: CycleSummary[] }) {
  const txns = cycles
    .flatMap((c) => c.txHashes.map((hash) => ({ hash, ts: c.ts, action: c.action, cycleId: c.id })))
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  return (
    <div className="p-6">
      <div className="text-xs font-mono text-text-muted uppercase tracking-widest mb-4">
        All Transactions — {txns.length} total
      </div>
      {txns.length === 0 ? (
        <div className="text-text-dim font-mono text-sm">No onchain transactions yet.</div>
      ) : (
        <table className="w-full text-xs font-mono border border-border-dim rounded-lg overflow-hidden">
          <thead>
            <tr className="border-b border-border-dim bg-surface">
              {["Tx Hash", "Action", "Timestamp", "Cycle"].map((h) => (
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
            {txns.map(({ hash, ts, action, cycleId }) => (
              <tr
                key={hash}
                className="border-b border-border-dim/50 hover:bg-surface-raised transition-colors"
              >
                <td className="px-4 py-2.5">
                  <a
                    href={`https://www.oklink.com/xlayer/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue hover:text-gold transition-colors"
                  >
                    {hash.slice(0, 10)}...{hash.slice(-6)}
                  </a>
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 font-semibold",
                    action === "buy"
                      ? "text-gold"
                      : action === "yield_park"
                        ? "text-emerald"
                        : "text-text-muted",
                  )}
                >
                  {action.toUpperCase()}
                </td>
                <td className="px-4 py-2.5 text-text-dim tabular-nums">
                  {new Date(ts).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-text-dim">{cycleId.slice(0, 8)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PortfolioView({ positions }: { positions: DashboardData["positions"] }) {
  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <div className="text-xs font-mono text-text-muted uppercase tracking-widest mb-4">
          Open Positions
        </div>
        <PositionTable
          openPositions={positions.openPositions}
          closedPositions={positions.closedPositions}
          yieldPosition={positions.yieldPosition}
        />
      </div>
    </div>
  );
}

function EconomyView({ economy }: { economy: DashboardData["economy"] }) {
  return (
    <div className="p-6 flex flex-col gap-6 max-w-2xl">
      <PaymentFlow economy={economy} />

      <div className="rounded-lg border border-border-dim bg-surface p-4">
        <div className="text-xs font-mono text-text-muted uppercase tracking-widest mb-4">
          Per-Agent Earnings
        </div>
        <div className="grid grid-cols-4 gap-4">
          {(["curator", "strategist", "sentinel", "executor"] as const).map((agent) => (
            <div key={agent} className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-text-muted capitalize">{agent}</span>
              <span className="text-lg font-mono font-bold text-gold">
                ${economy.perAgent[agent] ?? "0"}
              </span>
              <span className="text-[10px] font-mono text-text-dim">USDG earned</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HexLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <polygon
        points="14,2 25,8 25,20 14,26 3,20 3,8"
        stroke="#F59E0B"
        strokeWidth="1.5"
        fill="rgba(245,158,11,0.08)"
      />
      <polygon points="14,7 21,11 21,19 14,23 7,19 7,11" fill="#F59E0B" opacity="0.3" />
    </svg>
  );
}

function Statebadge({ state }: { state: SwarmState }) {
  const isActive = state !== "IDLE";
  return (
    <span
      className={cn(
        "text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-1 rounded border",
        isActive
          ? "text-gold border-gold/40 bg-gold/10"
          : "text-text-muted border-border-dim bg-transparent",
      )}
    >
      {STATE_LABEL[state]}
    </span>
  );
}

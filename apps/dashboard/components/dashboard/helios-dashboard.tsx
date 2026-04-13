"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getCycleUrl, getOkLinkAddressUrl, getOkLinkTxUrl, getSseUrl } from "@/lib/api";
import type {
  AgentName,
  CycleAction,
  CycleSummary,
  DashboardData,
  LeaderboardEntry,
  Position,
  SentinelVerdict,
  SwarmState,
  SwarmStatus,
  YieldPosition,
} from "@/lib/types";
import { cn, formatAbsoluteTime, formatRelativeTime, truncateAddress } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "cycles" | "portfolio" | "economy" | "leaderboard";

interface Props {
  initial: DashboardData;
  leaderboard: LeaderboardEntry[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATE_LABEL: Record<SwarmState, string> = {
  IDLE: "IDLE",
  STRATEGIST_SCAN: "SCANNING",
  SENTINEL_CHECK: "ASSESSING",
  EXECUTOR_DEPLOY: "DEPLOYING",
  COMPOUNDING: "COMPOUNDING",
  YIELD_PARK: "PARKING",
};

const STATE_COLOR: Record<SwarmState, string> = {
  IDLE: "text-[#64748b]",
  STRATEGIST_SCAN: "text-[#FFA30F]",
  SENTINEL_CHECK: "text-[#3b82f6]",
  EXECUTOR_DEPLOY: "text-[#FFA30F]",
  COMPOUNDING: "text-[#10b981]",
  YIELD_PARK: "text-[#10b981]",
};

const AGENT_ROLES: Record<AgentName, { role: string; icon: string }> = {
  curator: { role: "Orchestrator", icon: "◈" },
  strategist: { role: "Alpha Scanner", icon: "◎" },
  sentinel: { role: "Risk Guard", icon: "◉" },
  executor: { role: "Trade Engine", icon: "◆" },
};

const AGENT_ACTIVE: Partial<Record<SwarmState, AgentName>> = {
  STRATEGIST_SCAN: "strategist",
  SENTINEL_CHECK: "sentinel",
  EXECUTOR_DEPLOY: "executor",
  COMPOUNDING: "executor",
  YIELD_PARK: "curator",
};

const ACTION_COLOR: Record<CycleAction, string> = {
  buy: "text-[#FFA30F]",
  yield_park: "text-[#10b981]",
  no_alpha: "text-[#64748b]",
  hold: "text-[#64748b]",
};

const ACTION_DOT: Record<CycleAction, string> = {
  buy: "bg-[#FFA30F]",
  yield_park: "bg-[#10b981]",
  no_alpha: "bg-[#334155]",
  hold: "bg-[#334155]",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeCycles(prev: CycleSummary[], incoming: CycleSummary[]): CycleSummary[] {
  const ids = new Set(prev.map((c) => c.id));
  const newOnes = incoming.filter((c) => !ids.has(c.id));
  return [...prev, ...newOnes].slice(-100);
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function HeliosDashboard({ initial, leaderboard: initialLeaderboard }: Props) {
  const [data, setData] = useState<DashboardData>(initial);
  const [live, setLive] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    const es = new EventSource(getSseUrl());
    es.addEventListener("state", (e: MessageEvent) => {
      const payload = JSON.parse(e.data);
      setLive(true);
      setData((prev) => ({
        ...prev,
        status: payload.state,
        positions: { ...prev.positions, openPositions: payload.openPositions },
        cycles: mergeCycles(prev.cycles, payload.recentCycles),
      }));
    });
    es.onerror = () => setLive(false);
    return () => es.close();
  }, []);

  async function triggerCycle() {
    setTriggering(true);
    try {
      await fetch(getCycleUrl(), { method: "POST" });
    } finally {
      setTriggering(false);
    }
  }

  const { status, agents, economy, cycles, positions } = data;
  const lastCycle = cycles.length > 0 ? cycles[cycles.length - 1] : null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "cycles", label: `Cycles · ${cycles.length}` },
    { id: "portfolio", label: "Portfolio" },
    { id: "economy", label: "Economy" },
    { id: "leaderboard", label: "Leaderboard" },
  ];

  return (
    <div className="min-h-screen bg-[#0F0D0E] flex flex-col">
      {/* ── Hero / Header ─────────────────────────────────────────────── */}
      <header className="relative overflow-hidden bg-radial-gold border-b border-[#1a1c24]">
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-10 pb-8">
          {/* Top row */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="size-10 shrink-0">
                <Image src="/helios-icon.svg" alt="Helios" width={40} height={40} priority />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white leading-none">Helios</h1>
                <p className="text-[11px] font-mono text-[#64748b] mt-0.5 uppercase tracking-widest">
                  War Room · X Layer
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Live indicator */}
              <span
                className={cn(
                  "flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded border",
                  live
                    ? "border-[#10b981]/30 text-[#10b981] bg-[#10b981]/8"
                    : "border-[#1a1c24] text-[#334155] bg-transparent",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    live ? "bg-[#10b981] animate-pulse-gold" : "bg-[#334155]",
                  )}
                />
                {live ? "LIVE" : "OFFLINE"}
              </span>

              {/* State */}
              <span
                className={cn(
                  "text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded border",
                  status.swarmState !== "IDLE"
                    ? "border-[#FFA30F]/30 text-[#FFA30F] bg-[#FFA30F]/8"
                    : "border-[#1a1c24] text-[#64748b] bg-transparent",
                )}
              >
                {STATE_LABEL[status.swarmState]}
              </span>

              {/* Run Cycle */}
              <button
                type="button"
                onClick={triggerCycle}
                disabled={triggering || status.circuitBreaker.halted}
                className={cn(
                  "text-[11px] font-mono font-semibold uppercase tracking-widest px-3.5 py-1.5 rounded border transition-all",
                  "border-[#FFA30F] text-[#FFA30F]",
                  "hover:bg-[#FFA30F] hover:text-[#0F0D0E] hover:shadow-gold-glow",
                  "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#FFA30F]",
                )}
              >
                {triggering ? "Running…" : "↯ Run Cycle"}
              </button>
            </div>
          </div>

          {/* Circuit breaker */}
          {status.circuitBreaker.halted && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/8 px-4 py-3 animate-fade-up">
              <span className="size-2 rounded-full bg-[#ef4444] animate-blink-red shrink-0" />
              <span className="text-xs font-mono text-[#ef4444] font-semibold uppercase tracking-widest">
                Circuit Breaker Tripped
              </span>
              {status.circuitBreaker.reason && (
                <span className="text-xs font-mono text-[#ef4444]/70 ml-2">
                  — {status.circuitBreaker.reason}
                </span>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px rounded-lg overflow-hidden border border-[#1a1c24]">
            <StatCell label="Total Cycles" value={economy.totalCycles.toString()} />
            <StatCell label="Onchain Txns" value={economy.totalX402Txns.toString()} sub="X Layer" />
            <StatCell label="x402 Paid" value={`$${economy.totalX402PaidUsdc}`} sub="USDG" accent />
            <StatCell label="Open Positions" value={positions.openPositions.length.toString()} />
            <StatCell
              label="No-Alpha Streak"
              value={status.consecutiveNoAlpha.toString()}
              sub="consecutive"
            />
            <StatCell
              label="CB Failures"
              value={status.circuitBreaker.consecutiveFailures.toString()}
              danger={status.circuitBreaker.consecutiveFailures > 0}
            />
            <StatCell
              label="Last Cycle"
              value={status.lastCycleAt ? formatRelativeTime(status.lastCycleAt) : "—"}
            />
          </div>
        </div>
      </header>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <nav className="border-b border-[#1a1c24] bg-[#0A0C10] px-4 sm:px-6 shrink-0">
        <div className="mx-auto max-w-7xl flex items-center gap-0 overflow-x-auto scrollbar-none">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "px-4 py-3 text-[11px] font-mono uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 -mb-px",
                tab === id
                  ? "text-[#FFA30F] border-[#FFA30F]"
                  : "text-[#64748b] border-transparent hover:text-[#f1f5f9]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Tab Content ───────────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">
        {tab === "overview" && (
          <OverviewTab
            status={status}
            agents={agents}
            cycles={cycles}
            lastCycle={lastCycle}
            positions={positions}
            economy={economy}
          />
        )}
        {tab === "cycles" && <CyclesTab cycles={cycles} />}
        {tab === "portfolio" && <PortfolioTab positions={positions} />}
        {tab === "economy" && <EconomyTab economy={economy} />}
        {tab === "leaderboard" && <LeaderboardTab entries={initialLeaderboard} />}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1a1c24] py-4 px-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between text-[10px] font-mono text-[#334155]">
          <span>Helios · X Layer (chainId 196) · OKX BuildX S2</span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/helioslabs-ai/helios"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#64748b] transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/helioslabs-ai/helios/blob/main/SKILL.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#64748b] transition-colors"
            >
              SKILL.md
            </a>
            <a
              href="https://www.oklink.com/xlayer"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#64748b] transition-colors"
            >
              OKLink ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── StatCell ──────────────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  sub,
  accent,
  danger,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="bg-[#0A0C10] px-4 py-3">
      <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#4a5568] mb-1">
        {label}
      </div>
      <div
        className={cn(
          "text-base font-mono font-bold tabular-nums leading-none",
          accent ? "text-[#FFA30F]" : danger ? "text-[#ef4444]" : "text-white",
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[9px] font-mono text-[#334155] mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#4a5568] font-semibold mb-3">
      {children}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-[#1a1c24] bg-[#0A0C10]", className)}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab({
  status,
  agents,
  cycles,
  lastCycle,
  positions,
  economy,
}: {
  status: SwarmStatus;
  agents: DashboardData["agents"];
  cycles: CycleSummary[];
  lastCycle: CycleSummary | null;
  positions: DashboardData["positions"];
  economy: DashboardData["economy"];
}) {
  // Build cycle action history for sparkline
  const recentCycles = [...cycles].slice(-20);
  const actionsChart = recentCycles.map((c, i) => ({
    i,
    val: c.action === "buy" ? 3 : c.action === "yield_park" ? 2 : 1,
    action: c.action,
  }));

  const agentNames: AgentName[] = ["curator", "strategist", "sentinel", "executor"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: Agents + State ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <SectionLabel>Agent Swarm</SectionLabel>
        <div className="flex flex-col gap-2">
          {agentNames.map((name) => {
            const agent = agents.find((a) => a.name === name);
            const isActive =
              AGENT_ACTIVE[status.swarmState] === name ||
              (status.swarmState !== "IDLE" && name === "curator");
            const isHalted = status.circuitBreaker.halted;
            return (
              <AgentRow
                key={name}
                name={name}
                address={agent?.address ?? ""}
                isActive={isActive}
                isHalted={isHalted}
              />
            );
          })}
        </div>

        {/* Last cycle reasoning */}
        {lastCycle && (
          <>
            <SectionLabel>Last Cycle Reasoning</SectionLabel>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn("size-1.5 rounded-full shrink-0", ACTION_DOT[lastCycle.action])}
                />
                <span
                  className={cn(
                    "text-[10px] font-mono font-semibold uppercase tracking-widest",
                    ACTION_COLOR[lastCycle.action],
                  )}
                >
                  {lastCycle.action.replace("_", " ")}
                </span>
                {lastCycle.sentinelVerdict && (
                  <span
                    className={cn(
                      "text-[9px] font-mono font-bold uppercase tracking-widest ml-auto",
                      lastCycle.sentinelVerdict === "CLEAR" ? "text-[#10b981]" : "text-[#ef4444]",
                    )}
                  >
                    {lastCycle.sentinelVerdict}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-[#94a3b8] leading-relaxed line-clamp-4">
                {lastCycle.reasoning || "No reasoning recorded."}
              </p>
              {lastCycle.txHashes.length > 0 && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {lastCycle.txHashes.map((hash) => (
                    <a
                      key={hash}
                      href={getOkLinkTxUrl(hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-[#3b82f6] hover:text-[#FFA30F] transition-colors"
                    >
                      {hash.slice(0, 8)}… ↗
                    </a>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      {/* Center: Cycle feed ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <SectionLabel>Cycle Feed · {cycles.length} total</SectionLabel>
        <Card className="flex-1 overflow-hidden">
          <MiniCycleFeed cycles={cycles} />
        </Card>

        {/* Cycle activity sparkline */}
        {actionsChart.length > 0 && (
          <>
            <SectionLabel>Cycle Activity</SectionLabel>
            <Card className="p-4">
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={actionsChart}
                    barSize={6}
                    margin={{ top: 2, right: 0, bottom: 0, left: -20 }}
                  >
                    <XAxis dataKey="i" hide />
                    <YAxis hide domain={[0, 3]} />
                    <Tooltip
                      contentStyle={{
                        background: "#0A0C10",
                        border: "1px solid #1a1c24",
                        borderRadius: 6,
                        fontSize: 10,
                      }}
                      formatter={(
                        _v: unknown,
                        _n: unknown,
                        props: { payload?: { action?: string } },
                      ) => [props.payload?.action ?? "", ""]}
                      labelFormatter={() => ""}
                    />
                    <Bar dataKey="val" radius={[2, 2, 0, 0]}>
                      {actionsChart.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            entry.action === "buy"
                              ? "#FFA30F"
                              : entry.action === "yield_park"
                                ? "#10b981"
                                : "#1a1c24"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-2">
                {[
                  { color: "#FFA30F", label: "Buy" },
                  { color: "#10b981", label: "Yield" },
                  { color: "#1a1c24", label: "No Alpha" },
                ].map(({ color, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 text-[9px] font-mono text-[#64748b]"
                  >
                    <span className="size-2 rounded-sm" style={{ background: color }} />
                    {label}
                  </span>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Right: Positions + Economy ───────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <SectionLabel>Positions</SectionLabel>
        <div className="flex flex-col gap-2">
          {/* Yield position */}
          {positions.yieldPosition ? (
            <YieldCard y={positions.yieldPosition} />
          ) : (
            <Card className="px-4 py-3 text-[11px] font-mono text-[#334155]">
              No yield position
            </Card>
          )}
          {/* Open trades */}
          {positions.openPositions.length > 0 ? (
            positions.openPositions.map((pos) => (
              <OpenPositionCard key={pos.entryTxHash} pos={pos} />
            ))
          ) : (
            <Card className="px-4 py-3 text-[11px] font-mono text-[#334155]">No open trades</Card>
          )}
        </div>

        <SectionLabel>Economy Summary</SectionLabel>
        <Card className="p-4">
          {/* Per-agent pie */}
          <EconomyMiniChart economy={economy} />
        </Card>
      </div>
    </div>
  );
}

// ── AgentRow ──────────────────────────────────────────────────────────────────

function AgentRow({
  name,
  address,
  isActive,
  isHalted,
}: {
  name: AgentName;
  address: string;
  isActive: boolean;
  isHalted: boolean;
}) {
  const { role, icon } = AGENT_ROLES[name];
  const statusLabel = isHalted ? "HALTED" : isActive ? "ACTIVE" : "IDLE";
  const statusCls = isHalted
    ? "text-[#ef4444] border-[#ef4444]/30 bg-[#ef4444]/8"
    : isActive
      ? "text-[#FFA30F] border-[#FFA30F]/30 bg-[#FFA30F]/8"
      : "text-[#334155] border-[#1a1c24] bg-transparent";
  const glowCls = isActive && !isHalted ? "shadow-gold-glow border-[#FFA30F]/20" : "";

  return (
    <div
      className={cn(
        "rounded-lg border bg-[#0A0C10] px-4 py-3 flex items-center gap-3 transition-all",
        "border-[#1a1c24]",
        glowCls,
      )}
    >
      <span
        className={cn(
          "text-base shrink-0",
          isHalted ? "text-[#ef4444]" : isActive ? "text-[#FFA30F]" : "text-[#334155]",
        )}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold capitalize text-white">{name}</span>
          <span className="text-[9px] font-mono text-[#64748b]">{role}</span>
        </div>
        {address ? (
          <a
            href={getOkLinkAddressUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-[#334155] hover:text-[#FFA30F] transition-colors"
          >
            {truncateAddress(address)}
          </a>
        ) : (
          <span className="text-[10px] font-mono text-[#1a1c24]">no address</span>
        )}
      </div>
      <span
        className={cn(
          "text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0",
          statusCls,
          isActive && !isHalted ? "animate-pulse-gold" : "",
        )}
      >
        {statusLabel}
      </span>
    </div>
  );
}

// ── MiniCycleFeed ─────────────────────────────────────────────────────────────

function MiniCycleFeed({ cycles }: { cycles: CycleSummary[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const sorted = [...cycles].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cycles.length]);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[11px] font-mono text-[#334155]">
        awaiting first cycle…
      </div>
    );
  }

  return (
    <div className="h-80 overflow-y-auto">
      {sorted.map((cycle, idx) => (
        <div
          key={cycle.id}
          className={cn(
            "flex items-start gap-2.5 px-3 py-2 border-b border-[#1a1c24]/60 font-mono text-[10px] hover:bg-[#13151C] transition-colors",
            idx === sorted.length - 1 && "animate-slide-in",
          )}
        >
          <span className={cn("size-1.5 rounded-full shrink-0 mt-1", ACTION_DOT[cycle.action])} />
          <span className="text-[#334155] w-12 shrink-0 tabular-nums">
            {formatAbsoluteTime(cycle.ts)}
          </span>
          <span className={cn("w-16 shrink-0 font-semibold uppercase", ACTION_COLOR[cycle.action])}>
            {cycle.action.replace("_", "·")}
          </span>
          <span className="text-[#64748b] flex-1 truncate">{cycle.reasoning}</span>
          {cycle.txHashes[0] && (
            <a
              href={getOkLinkTxUrl(cycle.txHashes[0])}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3b82f6] hover:text-[#FFA30F] transition-colors shrink-0"
            >
              ↗
            </a>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

// ── YieldCard ─────────────────────────────────────────────────────────────────

function YieldCard({ y }: { y: YieldPosition }) {
  return (
    <div className="rounded-lg border border-[#10b981]/20 bg-[#10b981]/5 px-4 py-3 flex items-center justify-between">
      <div>
        <div className="text-[9px] font-mono uppercase tracking-widest text-[#4a5568]">Yield</div>
        <div className="text-sm font-mono font-semibold text-[#10b981]">{y.platform}</div>
      </div>
      <div className="flex items-center gap-4 text-sm font-mono">
        <span className="text-white font-bold">
          ${y.amountUsdc} <span className="text-[#64748b] text-[10px]">USDC</span>
        </span>
        <span className="text-[#10b981] font-semibold">{y.apy}</span>
      </div>
    </div>
  );
}

// ── OpenPositionCard ──────────────────────────────────────────────────────────

function OpenPositionCard({ pos }: { pos: Position }) {
  const pnlPositive = (pos.pnlPct ?? 0) >= 0;
  return (
    <div className="rounded-lg border border-[#FFA30F]/15 bg-[#FFA30F]/5 px-4 py-3 flex items-center justify-between">
      <div>
        <div className="text-[9px] font-mono uppercase tracking-widest text-[#4a5568]">Trade</div>
        <div className="text-sm font-mono font-bold text-white">{pos.token}</div>
        <div className="text-[10px] font-mono text-[#64748b]">
          ${pos.sizeUsdc} entry @ ${pos.entryPrice}
        </div>
      </div>
      {pos.pnlPct !== undefined && (
        <div
          className={cn(
            "text-lg font-mono font-bold tabular-nums",
            pnlPositive ? "text-[#10b981]" : "text-[#ef4444]",
          )}
        >
          {pnlPositive ? "+" : ""}
          {pos.pnlPct.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

// ── EconomyMiniChart ──────────────────────────────────────────────────────────

function EconomyMiniChart({ economy }: { economy: DashboardData["economy"] }) {
  const agents: AgentName[] = ["strategist", "sentinel", "executor", "curator"];
  const colors = ["#FFA30F", "#3b82f6", "#10b981", "#64748b"];
  const data = agents
    .map((a, i) => ({
      name: a,
      value: Number.parseFloat(economy.perAgent[a] ?? "0"),
      color: colors[i],
    }))
    .filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-4">
      {total > 0 ? (
        <>
          <div className="size-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={24}
                  outerRadius={36}
                  strokeWidth={0}
                  paddingAngle={2}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0A0C10",
                    border: "1px solid #1a1c24",
                    borderRadius: 4,
                    fontSize: 10,
                  }}
                  formatter={(v: unknown) => [`$${(v as number).toFixed(4)}`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 text-[10px] font-mono">
            {data.map((d) => (
              <span key={d.name} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-[#64748b] capitalize w-16">{d.name}</span>
                <span className="text-white tabular-nums">${d.value.toFixed(4)}</span>
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          {agents.map((a, i) => (
            <span key={a} className="flex items-center gap-2 text-[10px] font-mono">
              <span className="size-1.5 rounded-full shrink-0" style={{ background: colors[i] }} />
              <span className="text-[#64748b] capitalize w-16">{a}</span>
              <span className="text-[#334155]">$0.0000</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CYCLES TAB
// ═══════════════════════════════════════════════════════════════════════════════

function CyclesTab({ cycles }: { cycles: CycleSummary[] }) {
  const sorted = [...cycles].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#4a5568] font-semibold mb-4">
        Cycle History — {cycles.length} total
      </div>

      {sorted.length === 0 ? (
        <Card className="px-6 py-12 text-center text-[11px] font-mono text-[#334155]">
          No cycles yet. Trigger one to begin.
        </Card>
      ) : (
        <div className="rounded-lg border border-[#1a1c24] overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1a1c24] bg-[#0A0C10]">
                {["Time", "Action", "Sentinel", "Reasoning", "Tx Hashes", "Cycle ID"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[9px] uppercase tracking-[0.15em] text-[#4a5568] font-normal"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((cycle, idx) => (
                <tr
                  key={cycle.id}
                  className={cn(
                    "border-b border-[#1a1c24]/60 hover:bg-[#13151C] transition-colors",
                    idx === 0 && "animate-fade-up",
                  )}
                >
                  <td className="px-4 py-2.5 text-[#64748b] tabular-nums whitespace-nowrap">
                    {new Date(cycle.ts).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn("font-semibold uppercase", ACTION_COLOR[cycle.action])}>
                      {cycle.action.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {cycle.sentinelVerdict ? (
                      <span
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-widest",
                          cycle.sentinelVerdict === "CLEAR" ? "text-[#10b981]" : "text-[#ef4444]",
                        )}
                      >
                        {cycle.sentinelVerdict}
                      </span>
                    ) : (
                      <span className="text-[#334155]">—</span>
                    )}
                  </td>
                  <td
                    className="px-4 py-2.5 text-[#64748b] max-w-xs truncate"
                    title={cycle.reasoning}
                  >
                    {cycle.reasoning || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {cycle.txHashes.length > 0 ? (
                        cycle.txHashes.map((hash) => (
                          <a
                            key={hash}
                            href={getOkLinkTxUrl(hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#3b82f6] hover:text-[#FFA30F] transition-colors"
                          >
                            {hash.slice(0, 8)}…
                          </a>
                        ))
                      ) : (
                        <span className="text-[#334155]">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[#334155]">{cycle.id.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO TAB
// ═══════════════════════════════════════════════════════════════════════════════

function PortfolioTab({ positions }: { positions: DashboardData["positions"] }) {
  const allPositions = [...positions.openPositions, ...positions.closedPositions];

  // Build P&L area chart from closed positions
  const pnlChart = positions.closedPositions
    .sort((a, b) => new Date(a.enteredAt).getTime() - new Date(b.enteredAt).getTime())
    .map((p, i) => ({ i, pnl: p.pnlPct ?? 0, token: p.token }));

  return (
    <div className="flex flex-col gap-6">
      {/* Yield */}
      {positions.yieldPosition && (
        <div>
          <SectionLabel>Yield Position</SectionLabel>
          <Card className="p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono font-semibold text-[#10b981]">
                {positions.yieldPosition.platform}
              </span>
              <span className="text-[10px] font-mono text-[#64748b]">
                Deposited {formatRelativeTime(positions.yieldPosition.depositedAt)}
              </span>
            </div>
            <div className="flex items-center gap-6 font-mono">
              <div className="text-right">
                <div className="text-[9px] text-[#4a5568] uppercase tracking-widest">Deposited</div>
                <div className="text-white font-bold">${positions.yieldPosition.amountUsdc}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-[#4a5568] uppercase tracking-widest">APY</div>
                <div className="text-[#10b981] font-bold">{positions.yieldPosition.apy}</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* P&L chart */}
      {pnlChart.length > 1 && (
        <div>
          <SectionLabel>Closed Positions P&L</SectionLabel>
          <Card className="p-4">
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pnlChart} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                  <defs>
                    <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFA30F" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FFA30F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="token"
                    tick={{ fill: "#4a5568", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#4a5568", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0A0C10",
                      border: "1px solid #1a1c24",
                      borderRadius: 6,
                      fontSize: 10,
                    }}
                    formatter={(v: unknown) => {
                      const n = v as number;
                      return [`${n > 0 ? "+" : ""}${n.toFixed(2)}%`, "P&L"];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pnl"
                    stroke="#FFA30F"
                    strokeWidth={1.5}
                    fill="url(#pnlGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Positions table */}
      <div>
        <SectionLabel>All Positions — {allPositions.length} total</SectionLabel>
        {allPositions.length === 0 ? (
          <Card className="px-6 py-10 text-center text-[11px] font-mono text-[#334155]">
            No positions recorded yet.
          </Card>
        ) : (
          <div className="rounded-lg border border-[#1a1c24] overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1a1c24] bg-[#0A0C10]">
                  {["Token", "Entry Price", "Size", "P&L", "Status", "Age", "Entry Tx"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[9px] uppercase tracking-[0.15em] text-[#4a5568] font-normal"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPositions.map((pos) => {
                  const pnlPos = (pos.pnlPct ?? 0) >= 0;
                  return (
                    <tr
                      key={pos.entryTxHash}
                      className="border-b border-[#1a1c24]/60 hover:bg-[#13151C] transition-colors"
                    >
                      <td className="px-4 py-2.5 font-semibold text-white">{pos.token}</td>
                      <td className="px-4 py-2.5 text-[#64748b] tabular-nums">${pos.entryPrice}</td>
                      <td className="px-4 py-2.5 text-[#64748b] tabular-nums">${pos.sizeUsdc}</td>
                      <td
                        className={cn(
                          "px-4 py-2.5 font-semibold tabular-nums",
                          pos.pnlPct !== undefined
                            ? pnlPos
                              ? "text-[#10b981]"
                              : "text-[#ef4444]"
                            : "text-[#334155]",
                        )}
                      >
                        {pos.pnlPct !== undefined
                          ? `${pnlPos ? "+" : ""}${pos.pnlPct.toFixed(2)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border",
                            pos.status === "open"
                              ? "text-[#FFA30F] border-[#FFA30F]/30 bg-[#FFA30F]/8"
                              : "text-[#334155] border-[#1a1c24]",
                          )}
                        >
                          {pos.status === "open"
                            ? "OPEN"
                            : (pos.exitCondition?.replace("_", " ")?.toUpperCase() ?? "CLOSED")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[#334155]">
                        {formatRelativeTime(pos.enteredAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        {pos.entryTxHash && (
                          <a
                            href={getOkLinkTxUrl(pos.entryTxHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#3b82f6] hover:text-[#FFA30F] transition-colors"
                          >
                            {pos.entryTxHash.slice(0, 8)}… ↗
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ECONOMY TAB
// ═══════════════════════════════════════════════════════════════════════════════

function EconomyTab({ economy }: { economy: DashboardData["economy"] }) {
  const agents: AgentName[] = ["strategist", "sentinel", "executor", "curator"];
  const colors = ["#FFA30F", "#3b82f6", "#10b981", "#64748b"];

  const barData = agents.map((a, i) => ({
    name: a,
    earned: Number.parseFloat(economy.perAgent[a] ?? "0"),
    color: colors[i],
  }));

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-px rounded-lg overflow-hidden border border-[#1a1c24]">
        <StatCell label="Total Cycles" value={economy.totalCycles.toString()} />
        <StatCell label="x402 Paid (USDG)" value={`$${economy.totalX402PaidUsdc}`} accent />
        <StatCell label="Onchain Txns" value={economy.totalX402Txns.toString()} sub="X Layer" />
      </div>

      {/* Per-agent earnings bar */}
      <div>
        <SectionLabel>Per-Agent Earnings (USDG)</SectionLabel>
        <Card className="p-4">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                barSize={28}
                margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 10, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0A0C10",
                    border: "1px solid #1a1c24",
                    borderRadius: 6,
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                  }}
                  formatter={(v: unknown) => [`$${(v as number).toFixed(6)} USDG`, "Earned"]}
                />
                <Bar dataKey="earned" radius={[3, 3, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Detail rows */}
      <div>
        <SectionLabel>Agent x402 Breakdown</SectionLabel>
        <div className="rounded-lg border border-[#1a1c24] overflow-hidden">
          {agents.map((agent, i) => (
            <div
              key={agent}
              className={cn(
                "flex items-center justify-between px-5 py-3.5 hover:bg-[#13151C] transition-colors",
                i < agents.length - 1 && "border-b border-[#1a1c24]/60",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="size-2 rounded-full shrink-0" style={{ background: colors[i] }} />
                <span className="text-sm font-mono capitalize text-white">{agent}</span>
                <span className="text-[10px] font-mono text-[#64748b]">
                  {AGENT_ROLES[agent].role}
                </span>
              </div>
              <span className="text-base font-mono font-bold text-[#FFA30F] tabular-nums">
                ${economy.perAgent[agent] ?? "0.0000"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[10px] font-mono text-[#334155] border border-[#1a1c24] rounded-lg px-4 py-3">
        Curator pays Strategist, Sentinel, and Executor ~0.001 USDG per service call via EIP-3009
        x402 micropayments on X Layer. Every payment is a real onchain transaction.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEADERBOARD TAB
// ═══════════════════════════════════════════════════════════════════════════════

function LeaderboardTab({ entries }: { entries: LeaderboardEntry[] }) {
  const sorted = [...entries].sort(
    (a, b) => Number.parseFloat(b.returnPct ?? "0") - Number.parseFloat(a.returnPct ?? "0"),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Global Leaderboard — {entries.length} swarms</SectionLabel>
      </div>

      {sorted.length === 0 ? (
        <Card className="px-6 py-12 text-center text-[11px] font-mono text-[#334155]">
          No swarms registered yet. <span className="text-[#FFA30F]">Be the first.</span>
        </Card>
      ) : (
        <div className="rounded-lg border border-[#1a1c24] overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1a1c24] bg-[#0A0C10]">
                {["#", "Swarm", "Model", "Return %", "PnL", "Trades", "Cycles", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[9px] uppercase tracking-[0.15em] text-[#4a5568] font-normal first:w-8"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry, i) => {
                const ret = Number.parseFloat(entry.returnPct ?? "0");
                const pnl = Number.parseFloat(entry.pnlUsdc ?? "0");
                const pos = ret >= 0;
                const isTop3 = i < 3;
                return (
                  <tr
                    key={entry.id}
                    className={cn(
                      "border-b border-[#1a1c24]/60 hover:bg-[#13151C] transition-colors",
                      isTop3 && i === 0 && "bg-[#FFA30F]/3",
                    )}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "font-mono font-bold",
                          i === 0
                            ? "text-[#FFA30F]"
                            : i === 1
                              ? "text-[#94a3b8]"
                              : i === 2
                                ? "text-[#b45309]"
                                : "text-[#334155]",
                        )}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/swarm/${entry.curatorAddress}`}
                        className="font-semibold text-white hover:text-[#FFA30F] transition-colors"
                      >
                        {entry.swarmName}
                      </Link>
                      <div className="mt-0.5 text-[9px] text-[#334155]">
                        {entry.curatorAddress.slice(0, 6)}…{entry.curatorAddress.slice(-4)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#64748b]">{entry.model ?? "—"}</td>
                    <td
                      className={cn(
                        "px-4 py-3 font-bold tabular-nums",
                        pos ? "text-[#10b981]" : "text-[#ef4444]",
                      )}
                    >
                      {pos ? "+" : ""}
                      {ret.toFixed(2)}%
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 tabular-nums",
                        pos ? "text-[#10b981]" : "text-[#ef4444]",
                      )}
                    >
                      {pos ? "+" : ""}${pnl.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-[#94a3b8]">{entry.tradeCount}</td>
                    <td className="px-4 py-3 text-[#94a3b8]">{entry.cycleCount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border",
                          entry.status === "active"
                            ? "text-[#10b981] border-[#10b981]/30 bg-[#10b981]/8"
                            : entry.status === "halted"
                              ? "text-[#ef4444] border-[#ef4444]/30 bg-[#ef4444]/8"
                              : "text-[#334155] border-[#1a1c24]",
                        )}
                      >
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

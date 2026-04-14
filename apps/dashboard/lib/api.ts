import type {
  AgentInfo,
  DashboardData,
  EconomyData,
  LeaderboardEntry,
  LogsData,
  PositionsData,
  SwarmStatus,
  TransactionRow,
} from "./types";

const SERVER_API = process.env.API_URL ?? "http://localhost:3001";

export function getSseUrl(): string {
  return `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/sse`;
}

export function getCycleUrl(): string {
  return `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/cycle`;
}

export function getOkLinkTxUrl(txHash: string): string {
  return `https://www.oklink.com/xlayer/tx/${txHash}`;
}

export function getOkLinkAddressUrl(address: string): string {
  return `https://www.oklink.com/xlayer/address/${address}`;
}

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${SERVER_API}${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return res.json() as Promise<T>;
  } catch {
    return fallback;
  }
}

const DEFAULT_STATUS: SwarmStatus = {
  swarmState: "IDLE",
  circuitBreaker: { halted: false, reason: null, consecutiveFailures: 0 },
  lastCycleAt: null,
  totalCycles: 0,
  consecutiveNoAlpha: 0,
};

const DEFAULT_ECONOMY: EconomyData = {
  totalCycles: 0,
  totalX402PaidUsdc: "0.0000",
  totalOnchainTxns: 0,
  totalX402Txns: 0,
  perAgent: { curator: "0", strategist: "0", sentinel: "0", executor: "0" },
  realizedPnlUsdc: "0.0000",
};

const DEFAULT_POSITIONS: PositionsData = {
  openPositions: [],
  closedPositions: [],
  yieldPosition: null,
};

export async function fetchDashboardData(): Promise<DashboardData> {
  const [status, agentsData, economy, logsData, txData, positions] = await Promise.all([
    fetchJson<SwarmStatus>("/api/status", DEFAULT_STATUS),
    fetchJson<{ agents: AgentInfo[] }>("/api/agents", { agents: [] }),
    fetchJson<EconomyData>("/api/economy", DEFAULT_ECONOMY),
    fetchJson<LogsData>("/api/logs?n=500", { cycles: [], count: 0 }),
    fetchJson<{ transactions: TransactionRow[]; count: number }>("/api/transactions", {
      transactions: [],
      count: 0,
    }),
    fetchJson<PositionsData>("/api/positions", DEFAULT_POSITIONS),
  ]);

  return {
    status,
    agents: agentsData.agents,
    economy,
    cycles: logsData.cycles,
    transactions: txData.transactions,
    positions,
  };
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const data = await fetchJson<{ swarms: LeaderboardEntry[] }>("/api/registry", { swarms: [] });
  return data.swarms;
}

export async function fetchSwarm(address: string): Promise<LeaderboardEntry | null> {
  try {
    const res = await fetch(`${SERVER_API}/api/registry/${address}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<LeaderboardEntry>;
  } catch {
    return null;
  }
}

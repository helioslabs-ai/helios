export type AgentName = "curator" | "strategist" | "sentinel" | "executor";

export type SwarmState =
  | "IDLE"
  | "STRATEGIST_SCAN"
  | "SENTINEL_CHECK"
  | "EXECUTOR_DEPLOY"
  | "COMPOUNDING"
  | "YIELD_PARK";

export type SentinelVerdict = "CLEAR" | "BLOCK";
export type PositionStatus = "open" | "closed";
export type ExitCondition = "sentinel_block" | "time_stop" | "circuit_breaker" | "take_profit";
export type CycleAction = "buy" | "yield_park" | "no_alpha" | "hold";

export interface CircuitBreaker {
  halted: boolean;
  reason: string | null;
  consecutiveFailures: number;
  haltedAt?: string;
}

export interface SwarmStatus {
  swarmState: SwarmState;
  circuitBreaker: CircuitBreaker;
  lastCycleAt: string | null;
  totalCycles: number;
  consecutiveNoAlpha: number;
}

export interface AgentInfo {
  name: AgentName;
  address: string;
  accountId: string;
  totalValueUsd?: string;
}

export interface EconomyData {
  totalCycles: number;
  totalX402PaidUsdc: string;
  totalOnchainTxns?: number;
  totalX402Txns: number;
  perAgent: Record<AgentName, string>;
  realizedPnlUsdc?: string;
}

export interface Position {
  token: string;
  contractAddress: string;
  entryPrice: string;
  sizeUsdc: string;
  entryTxHash: string;
  enteredAt: string;
  status: PositionStatus;
  exitCondition?: ExitCondition;
  exitTxHash?: string;
  pnlPct?: number;
}

export interface YieldPosition {
  platform: "Aave V3";
  amountUsdc: string;
  apy: string;
  depositedAt: string;
}

export interface PositionsData {
  openPositions: Position[];
  closedPositions: Position[];
  yieldPosition: YieldPosition | null;
}

export interface CycleSummary {
  id: string;
  ts: string;
  action: CycleAction;
  reasoning: string;
  txHashes: string[];
  sentinelVerdict?: SentinelVerdict;
  transactions?: Array<{
    txHash: string;
    kind: "x402_payment" | "trade" | "yield_deposit" | "trade_exit";
    agent: AgentName;
    context: string;
    serviceUrl?: string;
  }>;
}

export interface TransactionRow {
  txHash: string;
  ts: string;
  cycleId: string;
  action: CycleAction;
  kind: "x402_payment" | "trade" | "yield_deposit" | "trade_exit";
  agent: AgentName;
  context: string;
  reasoning: string;
}

export interface LogsData {
  cycles: CycleSummary[];
  count: number;
}

export interface SsePayload {
  state: SwarmStatus;
  recentCycles: CycleSummary[];
  recentTransactions: TransactionRow[];
  openPositions: Position[];
}

export interface DashboardData {
  status: SwarmStatus;
  agents: AgentInfo[];
  economy: EconomyData;
  cycles: CycleSummary[];
  transactions: TransactionRow[];
  positions: PositionsData;
}

export interface LeaderboardEntry {
  id: string;
  swarmName: string;
  model: string | null;
  curatorAddress: string;
  returnPct: string;
  pnlUsdc: string;
  tradeCount: number;
  cycleCount: number;
  status: string;
  registeredAt: string;
  lastUpdated: string;
}

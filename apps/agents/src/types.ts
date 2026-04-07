import type { CoreTool } from "ai";
import type { Address } from "viem";

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

export type AgentConfig = {
  name: AgentName;
  wallet: {
    accountId: string;
    address: Address;
  };
  tools: Record<string, CoreTool>;
  llm: {
    model: "claude-sonnet-4-6";
    apiKey: string;
  };
  prompts: {
    strategy: string;
    budget: string;
  };
};

export type Position = {
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
};

export type CycleSummary = {
  id: string;
  ts: string;
  action: CycleAction;
  reasoning: string;
  txHashes: string[];
  sentinelVerdict?: SentinelVerdict;
};

export type CycleContext = {
  lastN: CycleSummary[];
  openPositions: Position[];
  walletBalances: Record<AgentName, string>;
  totalCycles: number;
  consecutiveNoAlpha: number;
};

export type X402Payment = {
  from: AgentName;
  to: AgentName;
  amount: string;
  cycleId: string;
  txHash: string;
  ts: string;
};

export type CircuitBreaker = {
  halted: boolean;
  reason: string | null;
  consecutiveFailures: number;
  haltedAt?: string;
};

export type AgentStatus = {
  name: AgentName;
  address: string;
  lastAction: string;
  lastActionAt: string;
};

export type YieldPosition = {
  platform: "Aave V3";
  amountUsdc: string;
  apy: string;
  depositedAt: string;
};

export type Economy = {
  totalCycles: number;
  totalX402PaidUsdc: string;
  perAgent: Record<AgentName, string>;
};

export type CycleStatus = {
  swarm: {
    state: SwarmState;
    agents: Record<AgentName, AgentStatus>;
  };
  lastCycle: {
    id: string;
    timestamp: string;
    action: CycleAction;
    strategistFinding: string;
    sentinelVerdict: SentinelVerdict | null;
    executorAction: string;
    reasoning: string;
    x402Paid: Array<{ agent: AgentName; amount: string }>;
  } | null;
  openPositions: Position[];
  yieldPosition: YieldPosition | null;
  economy: Economy;
  cycleHistory: CycleSummary[];
  circuitBreaker: CircuitBreaker;
};

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GUARDRAILS } from "@helios/shared/guardrails";
import type { CircuitBreaker, SwarmState } from "./types.js";

const STATE_PATH = join(import.meta.dir, "data/state.json");

type State = {
  swarmState: SwarmState;
  circuitBreaker: CircuitBreaker;
  lastCycleAt: string | null;
  totalCycles: number;
  consecutiveNoAlpha: number;
};

const DEFAULT_STATE: State = {
  swarmState: "IDLE",
  circuitBreaker: {
    halted: false,
    reason: null,
    consecutiveFailures: 0,
  },
  lastCycleAt: null,
  totalCycles: 0,
  consecutiveNoAlpha: 0,
};

function load(): State {
  if (!existsSync(STATE_PATH)) return { ...DEFAULT_STATE };
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf-8")) as State;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function save(state: State): void {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export function getState(): State {
  return load();
}

export function setState(swarmState: SwarmState): void {
  const state = load();
  const valid = isValidTransition(state.swarmState, swarmState);
  if (!valid) {
    throw new Error(`Invalid state transition: ${state.swarmState} → ${swarmState}`);
  }
  save({ ...state, swarmState });
}

export function incrementCycle(): void {
  const state = load();
  save({
    ...state,
    totalCycles: state.totalCycles + 1,
    lastCycleAt: new Date().toISOString(),
  });
}

export function recordNoAlpha(): void {
  const state = load();
  save({ ...state, consecutiveNoAlpha: state.consecutiveNoAlpha + 1 });
}

export function resetNoAlpha(): void {
  const state = load();
  save({ ...state, consecutiveNoAlpha: 0 });
}

export function tripCircuitBreaker(reason: string): void {
  const state = load();
  const consecutiveFailures = state.circuitBreaker.consecutiveFailures + 1;
  const halted = consecutiveFailures >= GUARDRAILS.CIRCUIT_BREAKER_MAX_FAILURES;
  save({
    ...state,
    swarmState: "IDLE",
    circuitBreaker: {
      halted,
      reason: halted ? reason : state.circuitBreaker.reason,
      consecutiveFailures,
      haltedAt: halted ? new Date().toISOString() : state.circuitBreaker.haltedAt,
    },
  });
}

export function haltSwarm(reason: string): void {
  const state = load();
  save({
    ...state,
    swarmState: "IDLE",
    circuitBreaker: {
      ...state.circuitBreaker,
      halted: true,
      reason,
      haltedAt: new Date().toISOString(),
    },
  });
}

export function resetCircuitBreaker(): void {
  const state = load();
  save({
    ...state,
    circuitBreaker: { halted: false, reason: null, consecutiveFailures: 0 },
  });
}

export function isHalted(): boolean {
  return load().circuitBreaker.halted;
}

const VALID_TRANSITIONS: Record<SwarmState, SwarmState[]> = {
  IDLE: ["STRATEGIST_SCAN"],
  STRATEGIST_SCAN: ["SENTINEL_CHECK", "YIELD_PARK"],
  SENTINEL_CHECK: ["EXECUTOR_DEPLOY", "YIELD_PARK"],
  EXECUTOR_DEPLOY: ["COMPOUNDING"],
  COMPOUNDING: ["IDLE"],
  YIELD_PARK: ["IDLE"],
};

function isValidTransition(from: SwarmState, to: SwarmState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

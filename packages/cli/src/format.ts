import pc from "picocolors";

// ── Primitives ───────────────────────────────────────────────────────────────

export function row(label: string, value: string, labelWidth = 14): string {
  return `  ${pc.dim(label.padEnd(labelWidth))}${value}`;
}

export function divider(width = 44): string {
  return `  ${pc.dim("─".repeat(width))}`;
}

export function header(title: string): void {
  console.log();
  console.log(`  ${pc.bold(pc.white(title))}`);
  console.log(divider());
}

export function section(title: string): void {
  console.log();
  console.log(`  ${pc.dim(title.toUpperCase())}`);
}

// ── State badge ──────────────────────────────────────────────────────────────

const STATE_COLOR: Record<string, (s: string) => string> = {
  IDLE: pc.dim,
  STRATEGIST_SCAN: pc.cyan,
  SENTINEL_CHECK: pc.yellow,
  EXECUTOR_DEPLOY: pc.magenta,
  COMPOUNDING: pc.green,
  YIELD_PARK: pc.blue,
};

export function stateBadge(state: string): string {
  const colorFn = STATE_COLOR[state] ?? pc.white;
  return colorFn(`● ${state}`);
}

export function cbBadge(halted: boolean, failures: number): string {
  if (halted) return pc.red(`✗ HALTED (${failures} failures)`);
  if (failures > 0) return pc.yellow(`⚠ OK (${failures} failure${failures > 1 ? "s" : ""})`);
  return pc.green("✓ OK");
}

export function actionBadge(action: string): string {
  const map: Record<string, (s: string) => string> = {
    buy: pc.green,
    yield_park: pc.blue,
    no_alpha: pc.dim,
    hold: pc.yellow,
  };
  return (map[action] ?? pc.white)(action);
}

export function verdictBadge(verdict: string | undefined): string {
  if (!verdict) return pc.dim("—");
  return verdict === "CLEAR" ? pc.green("CLEAR") : pc.red("BLOCK");
}

export function statusBadge(status: string): string {
  const map: Record<string, (s: string) => string> = {
    active: pc.green,
    halted: pc.red,
    stopped: pc.dim,
    error: pc.yellow,
  };
  return (map[status] ?? pc.white)(status.toUpperCase());
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return pc.dim("never");
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function truncAddr(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 10)}…${addr.slice(-6)}`;
}

export function usd(val: string | number): string {
  const n = typeof val === "string" ? Number.parseFloat(val) : val;
  return `$${Math.abs(n).toFixed(4)}`;
}

export function pctColor(val: number): string {
  const str = `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
  return val > 0 ? pc.green(str) : val < 0 ? pc.red(str) : pc.dim(str);
}

// ── Formatters ───────────────────────────────────────────────────────────────

export interface SwarmStatus {
  swarmState: string;
  circuitBreaker: {
    halted: boolean;
    reason: string | null;
    consecutiveFailures: number;
    haltedAt?: string;
  };
  lastCycleAt: string | null;
  totalCycles: number;
  consecutiveNoAlpha: number;
}

export function printStatus(data: SwarmStatus): void {
  header("Helios Status");
  console.log(row("State", stateBadge(data.swarmState)));
  console.log(
    row("Circuit", cbBadge(data.circuitBreaker.halted, data.circuitBreaker.consecutiveFailures)),
  );
  if (data.circuitBreaker.halted && data.circuitBreaker.reason) {
    console.log(row("Halt reason", pc.red(data.circuitBreaker.reason)));
  }
  console.log(row("Last cycle", relativeTime(data.lastCycleAt)));
  console.log(row("Total cycles", String(data.totalCycles)));
  if (data.consecutiveNoAlpha > 0) {
    console.log(row("No-alpha streak", pc.yellow(String(data.consecutiveNoAlpha))));
  }
  console.log();
}

export interface AgentInfo {
  name: string;
  address: string;
  accountId: string;
}

export function printAgents(agents: AgentInfo[]): void {
  header("Agents");
  for (const a of agents) {
    const name = pc.bold(a.name.toUpperCase().padEnd(12));
    const addr = pc.cyan(truncAddr(a.address));
    const acct = a.accountId ? pc.dim(a.accountId) : pc.dim("(not set)");
    console.log(`  ${name}  ${addr}   ${acct}`);
  }
  console.log();
}

export interface EconomyData {
  totalCycles: number;
  totalX402PaidUsdc: string;
  totalX402Txns: number;
  perAgent: Record<string, string>;
}

export function printEconomy(data: EconomyData): void {
  header("Economy");
  console.log(row("Cycles", String(data.totalCycles)));
  console.log(row("Total paid", pc.yellow(usd(data.totalX402PaidUsdc)) + " USDG"));
  console.log(row("Payments", `${data.totalX402Txns} txns`));
  section("Per agent");
  const agents = ["strategist", "sentinel", "executor", "curator"];
  for (const a of agents) {
    const earned = data.perAgent[a] ?? "0";
    const n = Number.parseFloat(earned);
    console.log(
      row(a.toUpperCase(), n > 0 ? pc.green(usd(earned)) : pc.dim(usd(earned)) + " USDG"),
    );
  }
  console.log();
}

export interface Position {
  token: string;
  contractAddress: string;
  entryPrice: string;
  sizeUsdc: string;
  entryTxHash: string;
  enteredAt: string;
  status: string;
  exitCondition?: string;
  exitTxHash?: string;
  pnlPct?: number;
}

export interface YieldPosition {
  platform: string;
  amountUsdc: string;
  apy: string;
  depositedAt: string;
}

export interface PositionsData {
  openPositions: Position[];
  closedPositions: Position[];
  yieldPosition: YieldPosition | null;
}

export function printPositions(data: PositionsData): void {
  header("Positions");

  if (data.openPositions.length === 0 && !data.yieldPosition) {
    console.log(pc.dim("  No open positions."));
  }

  if (data.openPositions.length > 0) {
    section(`Open (${data.openPositions.length})`);
    for (const p of data.openPositions) {
      const pnl = p.pnlPct !== undefined ? pctColor(p.pnlPct) : pc.dim("?");
      console.log(
        `  ${pc.bold(p.token.padEnd(8))}  ${usd(p.sizeUsdc).padEnd(10)}  entry ${pc.dim(Number.parseFloat(p.entryPrice).toFixed(4))}  ${pnl}  ${relativeTime(p.enteredAt)}`,
      );
    }
  }

  if (data.yieldPosition) {
    section("Yield");
    const y = data.yieldPosition;
    console.log(
      `  ${pc.bold(y.platform.padEnd(10))}  ${pc.green(usd(y.amountUsdc))}  ${pc.cyan(`${y.apy} APY`)}  since ${relativeTime(y.depositedAt)}`,
    );
  }

  if (data.closedPositions.length > 0) {
    section(`Closed (${data.closedPositions.length})`);
    for (const p of data.closedPositions) {
      const pnl = p.pnlPct !== undefined ? pctColor(p.pnlPct) : pc.dim("?");
      console.log(
        `  ${pc.bold(p.token.padEnd(8))}  ${usd(p.sizeUsdc).padEnd(10)}  ${pnl}  ${p.exitCondition ? pc.dim(p.exitCondition) : ""}`,
      );
    }
  }

  console.log();
}

export interface CycleSummary {
  id: string;
  ts: string;
  action: string;
  reasoning: string;
  txHashes: string[];
  sentinelVerdict?: string;
}

export function printLogs(cycles: CycleSummary[], total: number): void {
  header(`Cycle History  ${pc.dim(`(${cycles.length} of ${total})`)}`);
  if (cycles.length === 0) {
    console.log(pc.dim("  No cycles yet."));
    console.log();
    return;
  }
  for (let i = 0; i < cycles.length; i++) {
    const c = cycles[i];
    const num = pc.dim(`#${total - cycles.length + i + 1}`.padStart(4));
    const time = pc.dim(
      new Date(c.ts).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
    const action = actionBadge(c.action);
    const verdict = verdictBadge(c.sentinelVerdict);
    console.log(`  ${num}  ${time}  ${action.padEnd(18)}  ${verdict}`);
    if (c.reasoning) {
      const trimmed = c.reasoning.length > 100 ? `${c.reasoning.slice(0, 100)}…` : c.reasoning;
      console.log(`        ${pc.dim(trimmed)}`);
    }
    if (c.txHashes.length > 0) {
      console.log(
        `        ${pc.dim(
          "tx: " +
            c.txHashes
              .slice(0, 2)
              .map((h) => truncAddr(h))
              .join(", "),
        )}`,
      );
    }
    if (i < cycles.length - 1) console.log();
  }
  console.log();
}

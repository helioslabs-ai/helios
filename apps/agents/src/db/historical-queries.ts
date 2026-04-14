import { count, desc, isNotNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AgentName, CycleAction, CycleSummary } from "../types.js";
import type * as schema from "./schema/index.js";
import { cycles, economyEntries } from "./schema/index.js";

type Db = PostgresJsDatabase<typeof schema>;

const CYCLE_ACTIONS: CycleAction[] = ["buy", "yield_park", "no_alpha", "hold"];

function parseCycleAction(raw: string): CycleAction {
  return CYCLE_ACTIONS.includes(raw as CycleAction) ? (raw as CycleAction) : "hold";
}

export async function countCycleRows(db: Db): Promise<number> {
  const [row] = await db.select({ c: count() }).from(cycles);
  return Number(row?.c ?? 0);
}

export async function countEconomyEntryRows(db: Db): Promise<number> {
  const [row] = await db.select({ c: count() }).from(economyEntries);
  return Number(row?.c ?? 0);
}

export async function fetchCyclesNewestFirst(db: Db, limit: number) {
  return db.select().from(cycles).orderBy(desc(cycles.ts)).limit(limit);
}

export async function fetchEconomyEntriesNewestFirst(db: Db, limit: number) {
  return db.select().from(economyEntries).orderBy(desc(economyEntries.ts)).limit(limit);
}

export async function aggregateEconomyFromDb(db: Db) {
  const [entryCountRow] = await db.select({ c: count() }).from(economyEntries);
  const economyEntriesCount = Number(entryCountRow?.c ?? 0);

  const [paidRow] = await db
    .select({
      total: sql<string>`coalesce(sum(cast(${economyEntries.amount} as numeric)), 0)::text`,
    })
    .from(economyEntries);

  const [txCountRow] = await db
    .select({ c: count() })
    .from(economyEntries)
    .where(isNotNull(economyEntries.txHash));

  const perAgentRows = await db
    .select({
      to: economyEntries.to,
      amt: sql<string>`coalesce(sum(cast(${economyEntries.amount} as numeric)), 0)::text`,
    })
    .from(economyEntries)
    .groupBy(economyEntries.to);

  const perAgent: Record<AgentName, string> = {
    curator: "0",
    strategist: "0",
    sentinel: "0",
    executor: "0",
  };
  for (const row of perAgentRows) {
    const to = row.to as AgentName;
    if (to in perAgent) perAgent[to] = Number.parseFloat(row.amt ?? "0").toFixed(4);
  }

  return {
    economyEntriesCount,
    totalX402PaidUsdc: Number.parseFloat(paidRow?.total ?? "0").toFixed(4),
    totalX402Txns: Number(txCountRow?.c ?? 0),
    perAgent,
  };
}

export function dbCycleToSummary(row: typeof cycles.$inferSelect): CycleSummary {
  return {
    id: row.id,
    ts: row.ts.toISOString(),
    action: parseCycleAction(row.action),
    reasoning: row.reasoning,
    txHashes: row.txHashes ?? [],
  };
}

export function formatEconomyEntryContext(entry: {
  to: string;
  serviceUrl: string;
  isNoAlpha: boolean;
}): string {
  if (entry.to === "strategist") return "Curator paid strategist for scan";
  if (entry.to === "sentinel") return "Curator paid sentinel for risk assessment";
  if (entry.to === "executor") {
    if (entry.isNoAlpha) return "Curator paid executor for yield deposit";
    return "Curator paid executor for deployment";
  }
  return `Curator paid ${entry.to}`;
}

export type AgentTxRow = {
  txHash: string;
  ts: string;
  cycleId: string;
  action: CycleAction;
  kind: "x402_payment" | "trade" | "yield_deposit" | "trade_exit";
  agent: AgentName;
  context: string;
  reasoning: string;
};

/** Build unified transaction rows from Supabase cycles + economy_entries. */
export async function buildTransactionRowsFromDb(db: Db, cycleLimit = 800, entryLimit = 3000) {
  const cycleRows = await fetchCyclesNewestFirst(db, cycleLimit);
  const entryRows = await fetchEconomyEntriesNewestFirst(db, entryLimit);

  const cycleById = new Map(cycleRows.map((r) => [r.id, r]));
  const txRows: AgentTxRow[] = [];

  for (const e of entryRows) {
    const cycle = cycleById.get(e.cycleId);
    const action = cycle ? parseCycleAction(cycle.action) : "hold";
    const reasoning = cycle?.reasoning ?? "";
       const ts = e.ts.toISOString();
    txRows.push({
      txHash: e.txHash && e.txHash.startsWith("0x") ? e.txHash : `econ:${e.id}`,
      ts,
      cycleId: e.cycleId,
      action,
      kind: "x402_payment",
      agent: e.to as AgentName,
      context: formatEconomyEntryContext({
        to: e.to,
        serviceUrl: e.serviceUrl,
        isNoAlpha: e.isNoAlpha,
      }),
      reasoning,
    });
  }

  const economyHashesByCycle = new Map<string, Set<string>>();
  for (const e of entryRows) {
    if (!e.txHash) continue;
    let set = economyHashesByCycle.get(e.cycleId);
    if (!set) {
      set = new Set();
      economyHashesByCycle.set(e.cycleId, set);
    }
    set.add(e.txHash);
  }

  for (const c of cycleRows) {
    const action = parseCycleAction(c.action);
    const reasoning = c.reasoning;
    const ts = c.ts.toISOString();
    const seen = economyHashesByCycle.get(c.id) ?? new Set<string>();

    for (const txHash of c.txHashes ?? []) {
      if (!txHash || seen.has(txHash)) continue;
      seen.add(txHash);
      const kind: AgentTxRow["kind"] =
        action === "buy" ? "trade" : action === "yield_park" ? "yield_deposit" : "trade";
      txRows.push({
        txHash,
        ts,
        cycleId: c.id,
        action,
        kind,
        agent: "executor",
        context:
          kind === "yield_deposit"
            ? "Onchain yield / execution transaction"
            : "Onchain execution transaction",
        reasoning,
      });
    }
  }

  txRows.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  return txRows;
}

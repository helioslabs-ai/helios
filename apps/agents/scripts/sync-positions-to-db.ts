/**
 * One-off backfill: push local `positions.json` + `yield.json` into Supabase (Drizzle).
 * Run from repo root with DATABASE_URL set:
 *   bun run --cwd apps/agents scripts/sync-positions-to-db.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "../src/db/client.js";
import { positions, yieldState } from "../src/db/schema/index.js";
import type { Position } from "../src/types.js";

const DATA_DIR = join(import.meta.dir, "../src/data");

function readJson<T>(filename: string, fallback: T): T {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

async function main() {
  const db = getDb();
  if (!db) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const list = readJson<Position[]>("positions.json", []);
  for (const p of list) {
    const id = p.entryTxHash || crypto.randomUUID();
    await db
      .insert(positions)
      .values({
        id,
        token: p.token,
        tokenAddress: p.contractAddress,
        sizeUsdc: p.sizeUsdc,
        entryTxHash: p.entryTxHash || null,
        exitTxHash: p.exitTxHash ?? null,
        status: p.status,
        openedAt: new Date(p.enteredAt),
        closedAt: p.exitedAt ? new Date(p.exitedAt) : null,
        reasoning: null,
      })
      .onConflictDoUpdate({
        target: positions.id,
        set: {
          token: p.token,
          tokenAddress: p.contractAddress,
          sizeUsdc: p.sizeUsdc,
          entryTxHash: p.entryTxHash || null,
          exitTxHash: p.exitTxHash ?? null,
          status: p.status,
          openedAt: new Date(p.enteredAt),
          closedAt: p.exitedAt ? new Date(p.exitedAt) : null,
        },
      });
  }
  console.log(`Synced ${list.length} position row(s).`);

  const rawYield = readJson<Record<string, unknown> | null>("yield.json", null);
  if (
    rawYield &&
    typeof rawYield.platform === "string" &&
    typeof rawYield.amountUsdc === "string"
  ) {
    const depositedAt =
      typeof rawYield.depositedAt === "string" ? rawYield.depositedAt : new Date().toISOString();
    const apy = typeof rawYield.apy === "string" ? rawYield.apy : "0";
    const txHash =
      typeof rawYield.txHash === "string"
        ? rawYield.txHash
        : rawYield.txHash === null
          ? null
          : null;
    await db
      .insert(yieldState)
      .values({
        id: "default",
        platform: rawYield.platform,
        amountUsdc: rawYield.amountUsdc,
        apy,
        depositedAt: new Date(depositedAt),
        txHash,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: yieldState.id,
        set: {
          platform: rawYield.platform,
          amountUsdc: rawYield.amountUsdc,
          apy,
          depositedAt: new Date(depositedAt),
          txHash,
          updatedAt: new Date(),
        },
      });
    console.log("Synced yield_state default row.");
  } else {
    console.log("No yield.json to sync (skipped).");
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

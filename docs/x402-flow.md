# Helios — x402 Inter-Agent Payment Flow

Every x402 payment in Helios is **proof the pipeline ran**. When Sentinel earns 0.001 USDG, there is an onchain txHash proving the risk gate executed — not just an internal function call. Each cycle generates 1–3 verifiable payment receipts regardless of whether a trade happened.

The no-alpha cycle is the key differentiator: Curator pays Strategist **even when the scan finds nothing**. The economy always ticks.

---

## Protocol Constants

```typescript
XLAYER_CHAIN_INDEX  = "196"
XLAYER_X402_NETWORK = "eip155:196"
XLAYER_USDG         = "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8"

X402_SCAN_PRICE     = "1000"    // 0.001 USDG (6 decimals)
X402_ASSESS_PRICE   = "1000"
X402_DEPLOY_PRICE   = "1000"
```

---

## Payment Flow (per cycle)

```
  Curator                  Agent Routes              OKX Facilitator
     │                          │                          │
     │── GET /strategist/scan ─▶│                          │
     │◀─ 402 Payment Required ──│                          │
     │   X-Payment-Required:    │                          │
     │   { amount: "1000",      │                          │
     │     payTo: STRATEGIST,   │                          │
     │     asset: USDG,         │                          │
     │     network: eip155:196} │                          │
     │                          │                          │
     │   OKX TEE sign:          │                          │
     │   gen-msg-hash + sign-msg│                          │
     │   → EIP-3009 proof       │                          │
     │                          │                          │
     │── GET /strategist/scan ─▶│                          │
     │   X-Payment: base64(sig) │── POST /x402/verify ───▶│
     │                          │◀─ { valid: true } ───────│
     │                          │── POST /x402/settle ───▶│
     │                          │◀─ { txHash: "0x..." } ───│
     │◀─ 200 { signal, score } ─│                          │
     │   X-Payment-Response:    │                          │
     │   { txHash: "0x..." }    │                          │
     │                          │                          │
     │   ── if signal found ─────────────────────────────  │
     │── GET /sentinel/assess ─▶│                          │
     │◀─ 402 ───────────────────│                          │
     │   TEE sign → replay      │── /x402/verify+settle ─▶│
     │◀─ 200 { verdict: CLEAR } │◀─ txHash ────────────────│
     │                          │                          │
     │   ── if CLEAR ────────────────────────────────────  │
     │── POST /executor/deploy ▶│                          │
     │◀─ 402 ───────────────────│                          │
     │   TEE sign → replay      │── /x402/verify+settle ─▶│
     │◀─ 200 { tradeTxHash }    │◀─ txHash ────────────────│
     │                          │                          │
     │── HeliosRegistry.logMission(3× x402TxHashes + tradeTxHash)
     │── economy_log.jsonl ← 3 records written
     │                          │                          │
     │   ── NO-ALPHA branch ─────────────────────────────  │
     │   (scan found nothing)                              │
     │   Step ① still settled — Strategist always paid     │
     │   Sentinel + Executor skipped                       │
     │   Curator → okx-defi-invest → Aave V3 yield park   │
     │── economy_log.jsonl ← 1 record written              │
```

---

## Routes

All sub-agent routes live on the shared Hono backend at `apps/agents/src/app.ts`. No separate ports.

```
GET  /agents/strategist/scan    ← x402 gated, payTo: STRATEGIST_WALLET
GET  /agents/sentinel/assess    ← x402 gated, payTo: SENTINEL_WALLET
POST /agents/executor/deploy    ← x402 gated, payTo: EXECUTOR_WALLET
```

---

## Economy Log Schema

`apps/agents/src/data/economy_log.jsonl` — one record appended per x402 settlement:

```jsonc
{
  "cycleId": "uuid",
  "ts": "2026-04-08T14:32:00Z",
  "from": "curator",
  "to": "strategist",
  "amount": "0.001",
  "currency": "USDG",
  "txHash": "0xabc...",
  "serviceUrl": "/agents/strategist/scan",
  "isNoAlpha": true
}
```

Synced to Supabase `payments` table. Drives the frontend Economy view.

---

## Transaction Volume

| Cycle type                          | x402 txns | Other txns         | Total |
| ----------------------------------- | --------- | ------------------ | ----- |
| No-alpha                            | 1 (scan)  | 1 (Aave deposit)   | 2     |
| Signal found, Sentinel blocks       | 2         | 0                  | 2     |
| Full trade cycle                    | 3         | 1 (swap) + 1 Aave  | 5     |

At 30-min intervals over 9 days: 432 cycles. Even if 80% are no-alpha: **~1,000+ txns minimum**.

---

## Cost

| Item                              | Amount   |
| --------------------------------- | -------- |
| x402 fee per payment              | $0.001   |
| 432 cycles × avg 1.5 payments     | ~$0.65 total |
| Curator wallet seed required      | $4.00 USDC |

---

## Key Files

| File                                        | Purpose                                    |
| ------------------------------------------- | ------------------------------------------ |
| `packages/shared/src/payments.ts`           | x402 client + server helpers               |
| `packages/shared/src/chains.ts`             | X Layer constants (USDG address, chain ID) |
| `apps/agents/src/routes/strategist.ts`      | x402-gated scan endpoint                   |
| `apps/agents/src/routes/sentinel.ts`        | x402-gated assess endpoint                 |
| `apps/agents/src/routes/executor.ts`        | x402-gated deploy endpoint                 |
| `apps/agents/src/agents/curator.ts`         | Cycle loop — calls settleX402 per agent    |
| `apps/agents/src/tools/okx-x402-payment.ts` | OKX x402 payment skill wrapper             |

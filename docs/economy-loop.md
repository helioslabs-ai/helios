# Helios — Economy Loop

Helios runs two independent earn-pay-earn layers simultaneously. The economy ticks every single cycle — regardless of whether a trade happens.

---

## Wallet Design

Each agent holds its own OKX TEE Agentic Wallet. No shared treasury contract. The wallets are the treasury.

| Wallet     | Seed    | Purpose                                  |
| ---------- | ------- | ---------------------------------------- |
| Curator    | $4 USDC | x402 budget (~$0.65 total) + Aave capital |
| Executor   | $4 USDC | Trading capital (Half-Kelly, ~$0.80/trade) |
| Strategist | $1 USDC | Gas coverage + accumulates x402 scan fees |
| Sentinel   | $1 USDC | Gas coverage + accumulates x402 assess fees |

Total seed: **$10 USDC** + ~$0.50–1.00 OKB for X Layer gas (purchased separately).

---

## Financial Flow

```
                  ┌───────────────────────────────────────┐
    Seed          │          CURATOR WALLET                │
    $4 USDC ─────▶│  x402 budget  +  Aave idle capital    │
                  └──────────┬───────────────────────────┘
                             │
              ┌──────────────┼──────────────────┐
              │ per cycle    │                  │
              │ 0.001 USDG   │ 0.001 USDG       │ 0.001 USDG (if signal)
              ▼              ▼                  ▼
        STRATEGIST      SENTINEL            EXECUTOR
        accumulates     accumulates         accumulates
        scan fees       assess fees         deploy fees
                                                │
                             ┌──────────────────┘
                             │ always (no-alpha or active cycle)
                             ▼
                    ┌─────────────────┐
                    │   Aave V3       │  ← okx-defi-invest
                    │  (X Layer)      │     idle USDC → yield
                    └────────┬────────┘
                             │ harvest every N cycles
                             ▼
                    ┌─────────────────┐
    Seed            │  EXECUTOR WALLET│
    $4 USDC ───────▶│  trading capital│
                    └────────┬────────┘
                             │ DEX swap (if signal + CLEAR)
                             ▼
                    ┌─────────────────┐
                    │  Target Token   │  ← open position
                    └────────┬────────┘
                             │ exit (Sentinel BLOCK / time stop / take-profit)
                             ▼
                    USDC back in Executor wallet
```

---

## Two Earn Layers

**Layer 1 — Trading:** Executor earns from the market (signal → alpha → USDC profit).

**Layer 2 — Economy:** Sub-agents earn from Curator regardless of whether any trade happens. Even in a no-alpha cycle, the economy produces onchain transactions.

---

## No-Alpha Cycle

When Strategist finds no signal worth trading:

1. Curator pays Strategist scan fee (x402) — always
2. Sentinel and Executor are not commissioned
3. Curator calls `okx-defi-invest` → deposits idle USDC into Aave V3
4. Cycle logged as `no_alpha` with yield deposit txHash

This produces a minimum of 2 X Layer transactions per cycle even when market conditions yield nothing actionable.

---

## Position Sizing

| Rule               | Value                         | Rationale                              |
| ------------------ | ----------------------------- | -------------------------------------- |
| Size per trade     | Half-Kelly (default ~20%)     | Scales with signal confidence          |
| Max open positions | 1                             | Clean Sentinel re-scoring, no overlap  |
| Take-profit        | +20% gain                     | Full exit — no partial trailing        |
| Time stop          | 72h                           | Auto-exit regardless of P&L            |
| Absolute cap       | $1.00 USDC                    | Hard cap regardless of wallet size     |
| Min trade size     | $0.25 USDC                    | Below this, gas exceeds potential gain |
| Liquid reserve     | 25% of Executor wallet        | Never deploy full balance              |

---

## Profit Compounding

Profit stays in Executor wallet and compounds automatically. No cross-wallet sweeps.

- Curator reads Executor balance via `okx-defi-portfolio` each cycle
- If Executor USDC > $12 (20%+ gain on seed): logged in cycle summary
- If Executor USDC > $15 (50%+ gain): position size cap increases to 25%

---

## Full Run Budget

| Item                                          | Direction |
| --------------------------------------------- | --------- |
| Seed: 4 wallets ($10 USDC + ~$1 OKB gas)     | Out       |
| x402 fees: 432 cycles × avg 1.5 txns (~$0.65)| Out       |
| Aave yield: $3 × 5% × 9 days (~$0.004)       | In        |
| Trade profit (30% cycles trade, variable)     | In        |
| Gas (~500 txns on X Layer, ~$0.50–1.50)       | Out       |

Minimum operational cost for a full 9-day run: **$10 USDC + ~$1 OKB for gas**.

---

## Key Files

| File                                       | Purpose                                        |
| ------------------------------------------ | ---------------------------------------------- |
| `packages/shared/src/payments.ts`          | x402 settle + verify + build payment response  |
| `packages/shared/src/chains.ts`            | XLAYER_USDG, XLAYER_CHAIN_INDEX constants      |
| `packages/shared/src/guardrails.ts`        | Position sizing constants + preExecutionCheck  |
| `packages/shared/src/sizing.ts`            | kellySize() + calibrateKelly()                 |
| `apps/agents/src/agents/curator.ts`        | Cycle loop, x402 calls, Aave idle deposit      |
| `apps/agents/src/tools/okx-defi-invest.ts` | Aave V3 deposit tool                           |
| `apps/agents/src/data/economy_log.jsonl`   | Append-only economy record                     |
| `apps/agents/src/data/positions.json`      | Open and closed trade positions                |

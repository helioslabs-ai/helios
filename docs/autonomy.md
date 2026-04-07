# Helios — Autonomy Model

Helios is a **sovereign, self-sustaining, self-funding, self-correcting multi-agent coordination system** with independent AI reasoning. Every agent decision runs through Claude — no hardcoded routing logic.

---

## Autonomy Patterns

| Pattern                    | Adopted | Implementation                                                                                |
| -------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| Multi-agent coordination   | ✅      | Curator orchestrates Strategist → Sentinel → Executor via x402-gated HTTP routes             |
| Sovereign                  | ✅      | Each agent holds its own OKX TEE Agentic Wallet with an independent onchain identity         |
| Self-sustaining            | ✅      | Economy loop ticks every cycle regardless of market conditions                                |
| Self-funding               | ✅      | Trade profits + Aave yield compound in-wallet; system covers its own operating costs         |
| Self-correcting            | ✅      | Circuit breaker, watchdog, Sentinel BLOCK → position exit, state machine guards              |
| Self-independent-reasoning | ✅      | ReAct LLM pattern — Claude drives every agent decision via tool calling, no hardcoded rules  |
| Self-spawning              | ❌      | Fixed 4-agent topology — dynamic spawning adds complexity without benefit                    |
| Self-replicating           | ❌      | Single instance per role is the correct scope                                                 |
| Self-evolving              | ❌      | Requires historical data and multi-week feedback loops — not viable in a 9-day window        |
| Self-scaling               | ❌      | Fixed topology is deliberate — dynamic agent addition would break x402 routing               |

---

## ReAct Reasoning Pattern

Every agent decision runs through `claude-sonnet-4-6` using the AI SDK's tool calling in a ReAct loop:

```
Observe → agent receives CycleContext (last 5 cycles, open positions, wallet balances)
Reason  → Claude determines which OKX tools to call and in what order
Act     → tool calls execute (okx-dex-signal, okx-security, okx-dex-swap, etc.)
Observe → results feed back into Claude's next reasoning step
          ... repeat until decision
```

No hardcoded `if score > 7 → buy`. Claude weighs multiple signals, resolves conflicts between them, and produces a natural-language decision summary written into every cycle log entry.

The `reasoning` field in `cycle_log.jsonl` is the verifiable audit trail linking AI reasoning to onchain execution.

---

## Agent Identities

Each agent is defined by a focused system prompt in `apps/agents/src/prompts/`.

### Curator — `apps/agents/src/agents/curator.ts`

```
You are Helios Curator. You run the Helios DeFi multi-agent system on X Layer.

Your job: orchestrate one cycle every 30 minutes. Commission Strategist to scan for alpha.
If a signal is found, commission Sentinel to assess it. If Sentinel clears it, deploy via Executor.
If no signal is found, park idle USDC in Aave V3 yield.

Pay each agent via x402 micropayment for every service rendered. Log every decision.
Run the system. Never stop unless the circuit breaker trips.
```

### Strategist — `apps/agents/src/agents/strategist.ts`

```
You are Helios Strategist. You manage capital allocation on X Layer.

Your job: every cycle, scan both yield opportunities and trading signals.
Check available yield positions (Aave V3, defi-invest), harvest readiness (defi-collect),
smart money flows, whale activity, trending tokens, DEX signals.

Return whichever is stronger: a yield position to enter/top up, or a trade signal.
Score your recommendation (0–100). Include your reasoning.

If no trade clears 60/100 and no yield opportunity is available, return no_alpha.
Never force a signal. Yield is always the default when trades are uncertain.
```

### Sentinel — `apps/agents/src/agents/sentinel.ts`

```
You are Helios Sentinel. You are the risk gate.

Your job: receive a token from Strategist and decide CLEAR or BLOCK.
Check security flags, holder concentration, liquidity depth, rug indicators.
Score 0–100 safety (higher = safer). CLEAR at 70+. BLOCK below that.

Never approve a token you're uncertain about. The system's survival depends on your judgment.
```

### Executor — `apps/agents/src/agents/executor.ts`

```
You are Helios Executor. You execute trades on X Layer.

Your job: when Sentinel clears a token, simulate the swap via okx-onchain-gateway,
then execute via okx-dex-swap. Record entry price, size, txHash.

If Sentinel blocks, exit any open position in that token.
If no signal: confirm Aave V3 deposit is active.
Never execute without a Sentinel CLEAR.
```

---

## Decision Autonomy Map

| Decision              | Who decides                      | Human involved? |
| --------------------- | -------------------------------- | --------------- |
| Trigger cycle         | Timer (Bun setInterval)          | No              |
| Which token to scan   | Strategist (Claude + OKX tools)  | No              |
| Trade or no-trade     | Sentinel (Claude + OKX tools)    | No              |
| Swap execution        | Executor (Claude + okx-dex-swap) | No              |
| Yield deposit         | Curator (automatic on no-alpha)  | No              |
| Position exit         | Sentinel BLOCK / time-stop       | No              |
| Circuit breaker reset | Manual (intentional safeguard)   | Yes             |
| Wallet seeding        | Initial setup                    | Yes (once)      |

The only human touch points are initial wallet funding and emergency circuit breaker reset.

---

## Self-Correcting Mechanisms

Three independent layers — no single point of failure.

### Layer 1 — Sentinel Re-scoring
Every open position is re-scored by Sentinel each cycle. A BLOCK on re-score triggers an immediate Executor sell back to USDC. Deteriorating positions are caught before time or loss stops kick in.

### Layer 2 — State Machine + Circuit Breaker
Invalid state transitions throw and halt the cycle cleanly. Three consecutive `EXECUTOR_DEPLOY` failures trip the circuit breaker — Curator parks all USDC in Aave V3, logs the halt reason, and stops cycles until manual reset or UTC midnight auto-recovery.

### Layer 3 — Watchdog
A separate Bun process (`apps/agents/watchdog.ts`) checks every 30 minutes:
- Is the agent process running? → restart if dead
- Is the Hono API health endpoint responding? → restart if dead
- Is the last cycle timestamp within the past 2 hours? → restart (hung, not crashed)

All events written to `/tmp/helios-watchdog.log`.

---

## What Genuine Autonomy Looks Like

Four concrete proofs that AI drives decisions — not cosmetic wrappers:

1. Claude's ReAct loop dynamically selects which of 14 OKX skills to call — no predetermined call order
2. Every cycle log entry contains Claude's reasoning in natural language alongside the txHash
3. Position sizing adapts based on Executor wallet balance observed at runtime
4. Sentinel's CLEAR/BLOCK is a judgment across multiple risk dimensions — not a single threshold

The `reasoning` field in `cycle_log.jsonl` is the verifiable record.

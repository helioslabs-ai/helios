# Helios — Quickstart

---

## Prerequisites

- Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- OKX API credentials (Project ID, API Key, Secret Key, Passphrase)
- Anthropic API key
- Supabase project (URL + anon key)
- ~$10 USDC + ~$1 OKB on X Layer (chainId 196) for wallet seeding

---

## Step 1 — Create Agent Wallets

Create 4 OKX Agentic Wallets via the onchainos CLI — one per agent role:

```bash
onchainos wallet create --name curator
onchainos wallet create --name strategist
onchainos wallet create --name sentinel
onchainos wallet create --name executor
```

Each command returns an `accountId` and a wallet `address`. Save these — the setup wizard will ask for them.

---

## Step 2 — Fund Wallets

Fund each wallet on X Layer (chainId 196) with USDC before running setup:

| Wallet     | Amount | Purpose                             |
| ---------- | ------ | ----------------------------------- |
| Curator    | $4     | x402 payment budget + Aave capital  |
| Executor   | $4     | Trading capital                     |
| Strategist | $1     | Gas coverage                        |
| Sentinel   | $1     | Gas coverage                        |

Also fund each wallet with a small amount of OKB for X Layer gas fees.

---

## Step 3 — Clone and Install

```bash
git clone https://github.com/lucent-labs/helios
cd helios
bun install
```

---

## Step 4 — Genesis Setup

```bash
npx helios setup
```

The wizard collects credentials, deploys `HeliosRegistry.sol` to X Layer, registers all 4 agent identities, and writes `.env`.

```
  ██╗  ██╗███████╗██╗     ██╗ ██████╗ ███████╗
  ██║  ██║██╔════╝██║     ██║██╔═══██╗██╔════╝
  ███████║█████╗  ██║     ██║██║   ██║███████╗
  ██╔══██║██╔══╝  ██║     ██║██║   ██║╚════██║
  ██║  ██║███████╗███████╗██║╚██████╔╝███████║
  ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚══════╝
  Sovereign DeFi Agent System — X Layer

◆  Step 1 — OKX Credentials        ✓
◆  Step 2 — Agent Wallets           ✓
◆  Step 3 — AI Provider             ✓
◆  Step 4 — Database                ✓
◆  Step 5 — Deploy HeliosRegistry   ✓ → 0x...
◆  Step 6 — Register Agents         ✓
◆  Step 7 — Environment             ✓ .env written

◆  Setup complete. Run `helios start` to launch.
```

---

## Step 5 — Start

```bash
helios start
```

The system runs on a 30-minute cycle. On first run it initializes state, deploys idle USDC into Aave V3, and begins scanning for alpha.

---

## Monitoring

```bash
helios status          # system state, last cycle, wallet balances
helios logs 10         # last 10 cycle logs with AI reasoning
helios positions       # open positions + P&L + yield
helios economy         # x402 payment history + per-agent totals
helios agents          # all 4 agents — addresses, balances, last action
```

---

## Connect via MCP

Any MCP-compatible client can connect to a running instance:

```bash
cp .mcp.json.example .mcp.json
# Edit HELIOS_API_URL to point at your running instance
```

See [docs/mcp-server.md](./mcp-server.md) for the full tool reference.

---

## Environment Variables

Written by `helios setup`. Reference:

```bash
# Agent wallets
CURATOR_ACCOUNT_ID=
CURATOR_WALLET_ADDRESS=0x...
STRATEGIST_ACCOUNT_ID=
STRATEGIST_WALLET_ADDRESS=0x...
SENTINEL_ACCOUNT_ID=
SENTINEL_WALLET_ADDRESS=0x...
EXECUTOR_ACCOUNT_ID=
EXECUTOR_WALLET_ADDRESS=0x...

# Contracts
HELIOS_REGISTRY_ADDRESS=0x...

# API
API_URL=http://localhost:3001
SUPABASE_URL=
SUPABASE_ANON_KEY=

# AI
ANTHROPIC_API_KEY=

# OKX
OKX_PROJECT_ID=
OKX_API_KEY=
OKX_SECRET_KEY=
OKX_PASSPHRASE=
```

---

## Build Order (for contributors)

| Phase | Package                  |
| ----- | ------------------------ |
| 1     | `packages/shared`        |
| 2     | `apps/agents`            |
| 3     | `contracts`              |
| 4     | `apps/web`               |
| 5     | `packages/cli`           |
| 6     | `packages/mcp-server`    |

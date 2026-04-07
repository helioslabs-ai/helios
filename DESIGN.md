# Helios Design System

**War Room Dashboard** — dark, solar/gold aesthetic. Capital that never sleeps deserves a UI that looks like it.

---

## Design Principles

- **Dark by default** — deep space backgrounds, gold as signal not decoration
- **Data-first** — monospace for numbers, addresses, hashes. Never ambiguous.
- **Status at a glance** — circuit breaker state, agent activity, positions — readable in 2 seconds
- **Onchain proof** — every txHash is a link. Every cycle is timestamped.

---

## Colors

### Brand / Semantic

| Token | Hex | Usage |
|-------|-----|-------|
| `--gold` | `#F59E0B` | Primary action, active state, cycle pulse |
| `--gold-bright` | `#FBBF24` | Hover, highlights, price ticks up |
| `--gold-dim` | `#92400E` | Inactive, muted gold |
| `--solar` | `#F97316` | Secondary accent, Executor actions |
| `--emerald` | `#10B981` | Profit, CLEAR verdict, yield positive |
| `--red` | `#EF4444` | Loss, BLOCK verdict, circuit breaker tripped |
| `--amber` | `#F59E0B` | Warning, approaching risk limit |
| `--blue` | `#3B82F6` | Info, X Layer links, OKLink explorer |

### Background / Surface

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#07070E` | Page background (near-black space) |
| `--surface` | `#0F0F1A` | Cards, panels |
| `--surface-raised` | `#161625` | Elevated cards, dropdowns |
| `--border` | `#1E1E32` | Dividers, card borders |
| `--border-bright` | `#2D2D4E` | Hover borders, focus rings |

### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `--text` | `#F1F5F9` | Primary text |
| `--text-muted` | `#64748B` | Labels, secondary info |
| `--text-dim` | `#334155` | Placeholder, disabled |
| `--text-gold` | `#F59E0B` | Agent names, active metrics |

---

## Typography

| Role | Font | Usage |
|------|------|-------|
| **UI / Body** | `Inter` (system-ui fallback) | All readable text |
| **Data / Mono** | `JetBrains Mono`, `monospace` | Prices, tx hashes, addresses, balances |

### Scale

| Token | Size / Weight | Usage |
|-------|--------------|-------|
| `display` | `2.25rem / 700` | Hero numbers (total P&L, cycle count) |
| `h1` | `1.875rem / 700` | Page titles |
| `h2` | `1.5rem / 600` | Section headers |
| `h3` | `1.25rem / 600` | Card headers, agent names |
| `h4` | `1.125rem / 500` | Sub-sections |
| `body-lg` | `1rem / 400` | Default body |
| `body` | `0.875rem / 400` | Card content |
| `body-sm` | `0.75rem / 400` | Labels, metadata |
| `caption` | `0.6875rem / 400` | Timestamps, footnotes |
| `code` | `0.875rem / 400 mono` | Addresses, hashes, amounts |

### Rules

- All token amounts: monospace, right-aligned
- All addresses: monospace, truncated `0x1234...5678`, always linkable to OKLink
- All timestamps: `body-sm`, `text-muted`, relative (`2 min ago`) + absolute on hover
- Prices going up: `text-emerald` · going down: `text-red`

---

## Spacing

Base unit: `4px`

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | `4px` | Tight gaps, icon padding |
| `sm` | `8px` | Between label and value |
| `md` | `16px` | Card inner padding, list gaps |
| `lg` | `24px` | Between cards |
| `xl` | `32px` | Section gaps |
| `2xl` | `48px` | Page section separation |
| `3xl` | `64px` | Hero spacing |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | `4px` | Tags, badges, small pills |
| `DEFAULT` | `8px` | Inputs, buttons |
| `md` | `12px` | Cards, panels |
| `lg` | `16px` | Large cards, modals |
| `full` | `9999px` | Status dots, agent avatars |

---

## Elevation / Glow

| Token | Style | Usage |
|-------|-------|-------|
| `sm` | `0 1px 3px rgba(0,0,0,0.4)` | Subtle card lift |
| `DEFAULT` | `0 4px 16px rgba(0,0,0,0.5)` | Standard card |
| `md` | `0 8px 32px rgba(0,0,0,0.6)` | Elevated modal |
| `lg` | `0 16px 48px rgba(0,0,0,0.7)` | Command center overlay |
| `gold-glow` | `0 0 20px rgba(245,158,11,0.25)` | Active agent, live cycle pulse |
| `emerald-glow` | `0 0 16px rgba(16,185,129,0.2)` | CLEAR verdict, profit state |
| `red-glow` | `0 0 16px rgba(239,68,68,0.2)` | BLOCK verdict, circuit breaker |

---

## Components

### Agent Status Card

Each of the four agents renders as a card:

```
┌─────────────────────────────────┐
│  ● CURATOR          [ACTIVE]    │  ← gold dot + name + state badge
│  0x1234...5678                  │  ← monospace address, links to OKLink
│  Last: orchestrate  2 min ago   │  ← last action, muted timestamp
│  Balance: 3.42 USDC             │  ← right-aligned, monospace
└─────────────────────────────────┘
```

- Border: `--border` · Hover: `--border-bright` + `shadow-gold-glow`
- State badge: `ACTIVE` → gold · `IDLE` → muted · `HALTED` → red

### Cycle Feed (SSE live stream)

```
● 04:02:15  YIELD_PARK    Aave V3 +7.50 USDC · 4.2% APY    [0xcdd4...f]
● 03:32:10  BUY           OKB · 1.00 USDC entry             [0x624c...f]
● 03:02:05  NO_ALPHA      Scan complete — no signal          [0x6923...0]
```

- Dot: color by action (gold=buy, emerald=yield, muted=no_alpha, red=exit)
- Hash: monospace, clickable → OKLink
- Auto-scrolls to latest, max 50 entries visible

### x402 Payment Flow

```
CURATOR ──── 0.001 USDG ────▶ STRATEGIST
CURATOR ──── 0.001 USDG ────▶ SENTINEL
CURATOR ──── 0.001 USDG ────▶ EXECUTOR
```

Render as animated flow arrows in gold on dark background. Payment total updates in real-time via SSE.

### Circuit Breaker Banner

When halted: full-width banner, red background with glow, blinking dot:

```
🔴  CIRCUIT BREAKER TRIPPED — 3 consecutive failures · Parked in Aave V3 · Resets at 00:00 UTC
```

When healthy: no banner (silence is green).

### Position Table

| Token | Entry | Size | P&L | Status | Entered | Action |
|-------|-------|------|-----|--------|---------|--------|
| OKB | $55.20 | $1.00 | +3.2% | OPEN | 2h ago | — |

- P&L positive: `text-emerald` · negative: `text-red`
- Status badges: `OPEN` → gold outline · `CLOSED` → muted · `EXITED` → dim

### Buttons

| Variant | Style |
|---------|-------|
| Primary | Gold bg `#F59E0B` · dark text · gold-glow on hover |
| Secondary | Transparent · gold border · gold text |
| Ghost | No border · muted text · dim bg on hover |
| Destructive | Red bg on hover, red border |

Sizes: `sm` (32px) · `md` (40px) · `lg` (48px). Disabled: 35% opacity.

### Inputs

- Default: `surface` bg · `border` ring
- Hover: `border-bright`
- Focus: gold ring `ring-1 ring-gold`
- Error: red ring + error text below
- Disabled: dim text, no hover

---

## Tailwind v4 Custom Tokens

Add to `apps/web/src/app/globals.css`:

```css
@layer base {
  :root {
    --bg: 7 7 14;
    --surface: 15 15 26;
    --surface-raised: 22 22 37;
    --border: 30 30 50;
    --border-bright: 45 45 78;

    --text: 241 245 249;
    --text-muted: 100 116 139;
    --text-dim: 51 65 85;
    --text-gold: 245 158 11;

    --gold: 245 158 11;
    --gold-bright: 251 191 36;
    --gold-dim: 146 64 14;
    --solar: 249 115 22;
    --emerald: 16 185 129;
    --red: 239 68 68;
    --blue: 59 130 246;
  }
}
```

---

## Dashboard Views

### Command Center (primary)

Layout: 2-col on desktop, 1-col mobile.

Left (60%): Live SSE cycle feed · last cycle reasoning block (Claude's decision text, monospace-ish quote style)
Right (40%): 4 agent status cards stacked · circuit breaker status · quick-trigger "Run Cycle" button

### Transactions

Full-width table: all onchain txns sorted by timestamp. Filter by agent. Each row links to OKLink.

### Portfolio

Recharts area chart: cumulative P&L over time across all 4 wallets. Below: current positions table + yield position card.

### Economy

x402 payment flow diagram (animated arrows). Below: per-agent earning totals, cumulative fee spend, cycle count.

---

## Do's and Don'ts

**Do:**
- Use monospace for every number a trader would care about (price, amount, hash, address)
- Link every txHash to OKLink
- Show circuit breaker state prominently — it's the system's health signal
- Animate only meaningful state changes (new cycle, payment settled, position opened)
- Keep the background truly dark — `#07070E`, not grey

**Don't:**
- Use gold for decorative purposes — it means "active" or "earning"
- Hide the agent addresses — sovereignty means visible onchain identity
- Round token amounts — show full precision
- Use green for anything except profit/CLEAR — it's a semantic color here
- Add loading skeletons for SSE data — show last known state + timestamp instead

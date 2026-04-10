# Task Plan: Helios v2

## Goal
Leaderboard infra, dashboard restructure, CLI expansion, strategy injection — per spec-v2.md.

## Features

- [x] Phase A: Leaderboard backend infra
  - [x] A1 — `helios_registry` Drizzle schema (`db/schema/registry.ts`)
  - [x] A2 — `/api/registry` GET/POST + `GET /api/registry/:address`
  - [x] A3 — `POST /api/halt` endpoint + `haltSwarm()` in state.ts
  - [x] A4 — Curator stats posting after each cycle

- [x] Phase B: Dashboard restructure
  - [x] B1 — Move war room to `/dashboard` (`app/dashboard/page.tsx`)
  - [x] B2 — Landing + leaderboard at `/` (`app/page.tsx` rewrite)
  - [x] B3 — `/swarm/[curatorAddress]` public page
  - [x] Add `LeaderboardEntry` type + `fetchLeaderboard()` + `fetchSwarm()` to lib

- [x] Phase C: CLI expansion
  - [x] C1 — `helios seed`
  - [x] C2 — `helios start`
  - [x] C3 — `helios stop`
  - [x] C4 — `helios strategy`
  - [x] C5 — `helios guardrails`
  - [x] C6 — Update `helios setup` (swarm name, strategy, guardrails)
  - [x] C7 — Register 5 new commands in `index.ts`

- [x] Phase D: Strategy injection
  - [x] D1 — `buildStrategyPrompt()` in `prompts/strategist.ts`
  - [x] D1 — Wire into `routes/strategist.ts` per-request

- [x] Phase E: Verification
  - [x] Dashboard build clean (all 3 routes: /, /dashboard, /swarm/[addr])
  - [x] Type-check agents — no errors in changed files
  - [x] Type-check CLI — clean

## Current
**Status**: Complete. All v2 features shipped.

## Decisions
- `buildStrategyPrompt()` appends operator override after base prompt so core decision framework is preserved
- `/api/halt` catch returns `{ reason: undefined }` to fix TS union type narrowing
- render.yaml stays at repo root (rootDir: .) for monorepo workspace resolution

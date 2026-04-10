#!/usr/bin/env bun
import { Command } from "commander";
import { agentsCommand } from "./commands/agents.js";
import { cycleCommand } from "./commands/cycle.js";
import { economyCommand } from "./commands/economy.js";
import { guardrailsCommand } from "./commands/guardrails.js";
import { logsCommand } from "./commands/logs.js";
import { positionsCommand } from "./commands/positions.js";
import { seedCommand } from "./commands/seed.js";
import { setupCommand } from "./commands/setup.js";
import { startCommand } from "./commands/start.js";
import { statusCommand } from "./commands/status.js";
import { stopCommand } from "./commands/stop.js";
import { strategyCommand } from "./commands/strategy.js";

const program = new Command();

program
  .name("helios")
  .description("Helios — Sovereign DeFi Agent System on X Layer")
  .version("0.0.1");

program.option("--json", "Output as machine-readable JSON");

program.command("setup").description("First-run genesis wizard").action(setupCommand);

program
  .command("status")
  .description("Current state, last cycle, wallet balances")
  .action(() => statusCommand(program.opts()));

program
  .command("cycle")
  .description("Trigger one manual cycle")
  .action(() => cycleCommand(program.opts()));

program
  .command("economy")
  .description("x402 payment history + agent totals")
  .action(() => economyCommand(program.opts()));

program
  .command("positions")
  .description("Open positions + P&L + yield")
  .action(() => positionsCommand(program.opts()));

program
  .command("logs [n]")
  .description("Last n cycle logs with AI reasoning (default: 5)")
  .action((n: string) => logsCommand(n, program.opts()));

program
  .command("agents")
  .description("Agent addresses, balances, last action")
  .action(() => agentsCommand(program.opts()));

program
  .command("seed")
  .description("Print funding table for all 4 agent wallets")
  .action(seedCommand);

program
  .command("start")
  .description("Register swarm on leaderboard and trigger first cycle")
  .action(startCommand);

program
  .command("stop")
  .description("Halt the swarm (operator stop)")
  .action(stopCommand);

program
  .command("strategy")
  .description("Update the swarm strategy injected into the Strategist each cycle")
  .action(strategyCommand);

program
  .command("guardrails")
  .description("Update max trade size, max loss, and cycle interval")
  .action(guardrailsCommand);

program.parse();

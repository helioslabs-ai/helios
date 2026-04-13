import {
  buildPaymentRequired,
  buildPaymentResponse,
  okxSettleX402Payment,
  okxVerifyX402Payment,
  X402_DEPLOY_PRICE,
} from "@helios/shared/payments";
import { Hono } from "hono";
import { runExecutorDeploy } from "../agents/executor.js";
import { buildCycleContext } from "../memory/index.js";
import { buildExecutorBudget, EXECUTOR_SYSTEM_PROMPT } from "../prompts/executor.js";
import { executorTools } from "../tools/registry.js";
import { getWalletBalance } from "../wallet/index.js";

const executorRoutes = new Hono();
const EXECUTOR_WALLET = process.env.EXECUTOR_WALLET_ADDRESS ?? "";
const API_URL = process.env.API_URL ?? "http://localhost:3001";

executorRoutes.post("/deploy", async (c) => {
  const xPayment = c.req.header("X-Payment");

  if (!xPayment) {
    return c.json({ error: "Payment required" }, 402, {
      "X-Payment-Required": buildPaymentRequired({
        payTo: EXECUTOR_WALLET,
        amount: X402_DEPLOY_PRICE,
        resource: `${API_URL}/agents/executor/deploy`,
        description: "Helios Executor: trade deployment on X Layer",
      }),
    });
  }

  const verification = okxVerifyX402Payment(xPayment, EXECUTOR_WALLET, X402_DEPLOY_PRICE);
  if (!verification.isValid) {
    return c.json({ error: `Invalid payment: ${verification.invalidReason}` }, 402);
  }

  const settlement = await okxSettleX402Payment(
    xPayment,
    EXECUTOR_WALLET,
    X402_DEPLOY_PRICE,
    `${API_URL}/agents/executor/deploy`,
    "Helios Executor: trade deployment on X Layer",
  );
  if (!settlement.success) {
    return c.json({ error: `Settlement failed: ${settlement.errorReason}` }, 402);
  }

  const body = (await c.req.json().catch(() => ({}))) as { instruction?: string };
  const instruction = body.instruction ?? "Execute best available opportunity on X Layer.";

  const executorAccountId = process.env.EXECUTOR_ACCOUNT_ID ?? "";
  const executorBalance = await getWalletBalance(executorAccountId, EXECUTOR_WALLET).catch(() => ({
    balanceUsdc: "0",
  }));

  const context = buildCycleContext({
    curator: "0",
    strategist: "0",
    sentinel: "0",
    executor: executorBalance.balanceUsdc,
  });

  const deploy = await runExecutorDeploy(
    {
      name: "executor",
      wallet: {
        accountId: executorAccountId,
        address: EXECUTOR_WALLET as `0x${string}`,
      },
      tools: executorTools,
      llm: { model: "gpt-4o-mini", apiKey: process.env.OPENAI_API_KEY ?? "" },
      prompts: {
        strategy: EXECUTOR_SYSTEM_PROMPT,
        budget: buildExecutorBudget({
          walletBalance: executorBalance.balanceUsdc,
          openPositionCount: context.openPositions.length,
          liquidReserve: "1.00",
        }),
      },
    },
    instruction,
    context,
  );

  return c.json(deploy, 200, {
    "X-Payment-Response": buildPaymentResponse(settlement.txHash, settlement.payer),
  });
});

export { executorRoutes };

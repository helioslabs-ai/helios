import {
  buildPaymentRequired,
  buildPaymentResponse,
  okxSettleX402Payment,
  okxVerifyX402Payment,
  X402_ASSESS_PRICE,
} from "@helios/shared/payments";
import { Hono } from "hono";
import { runSentinelAssessment } from "../agents/sentinel.js";
import { buildCycleContext } from "../memory/index.js";
import { SENTINEL_SYSTEM_PROMPT } from "../prompts/sentinel.js";
import { sentinelTools } from "../tools/registry.js";

const sentinelRoutes = new Hono();
const SENTINEL_WALLET = process.env.SENTINEL_WALLET_ADDRESS ?? "";
const API_URL = process.env.API_URL ?? "http://localhost:3001";

sentinelRoutes.get("/assess", async (c) => {
  const xPayment = c.req.header("X-Payment");

  if (!xPayment) {
    return c.json({ error: "Payment required" }, 402, {
      "X-Payment-Required": buildPaymentRequired({
        payTo: SENTINEL_WALLET,
        amount: X402_ASSESS_PRICE,
        resource: `${API_URL}/agents/sentinel/assess`,
        description: "Helios Sentinel: risk assessment on X Layer",
      }),
    });
  }

  const verification = okxVerifyX402Payment(xPayment, SENTINEL_WALLET, X402_ASSESS_PRICE);
  if (!verification.isValid) {
    return c.json({ error: `Invalid payment: ${verification.invalidReason}` }, 402);
  }

  const settlement = await okxSettleX402Payment(
    xPayment,
    SENTINEL_WALLET,
    X402_ASSESS_PRICE,
    `${API_URL}/agents/sentinel/assess`,
    "Helios Sentinel: risk assessment on X Layer",
  );
  if (!settlement.success) {
    return c.json({ error: `Settlement failed: ${settlement.errorReason}` }, 402);
  }

  const token = c.req.query("token") ?? "";
  const contractAddress = c.req.query("contract") ?? "";

  const context = buildCycleContext({
    curator: "0",
    strategist: "0",
    sentinel: "0",
    executor: "0",
  });

  const assessment = await runSentinelAssessment(
    {
      name: "sentinel",
      wallet: {
        accountId: process.env.SENTINEL_ACCOUNT_ID ?? "",
        address: SENTINEL_WALLET as `0x${string}`,
      },
      tools: sentinelTools,
      llm: { model: "gpt-4o", apiKey: process.env.OPENAI_API_KEY ?? "" },
      prompts: { strategy: SENTINEL_SYSTEM_PROMPT, budget: "" },
    },
    token,
    contractAddress,
    context,
  );

  return c.json(assessment, 200, {
    "X-Payment-Response": buildPaymentResponse(settlement.txHash, settlement.payer),
  });
});

export { sentinelRoutes };

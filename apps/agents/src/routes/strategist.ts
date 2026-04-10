import {
  buildPaymentRequired,
  buildPaymentResponse,
  okxSettleX402Payment,
  okxVerifyX402Payment,
  X402_SCAN_PRICE,
} from "@helios/shared/payments";
import { Hono } from "hono";
import { runStrategistScan } from "../agents/strategist.js";
import { buildCycleContext } from "../memory/index.js";
import { buildStrategistBudget, STRATEGIST_SYSTEM_PROMPT } from "../prompts/strategist.js";
import { strategistTools } from "../tools/registry.js";

const strategistRoutes = new Hono();
const STRATEGIST_WALLET = process.env.STRATEGIST_WALLET_ADDRESS ?? "";
const API_URL = process.env.API_URL ?? "http://localhost:3001";

strategistRoutes.get("/scan", async (c) => {
  const xPayment = c.req.header("X-Payment");

  if (!xPayment) {
    return c.json({ error: "Payment required" }, 402, {
      "X-Payment-Required": buildPaymentRequired({
        payTo: STRATEGIST_WALLET,
        amount: X402_SCAN_PRICE,
        resource: `${API_URL}/agents/strategist/scan`,
        description: "Helios Strategist: alpha scan on X Layer",
      }),
    });
  }

  const verification = okxVerifyX402Payment(xPayment, STRATEGIST_WALLET, X402_SCAN_PRICE);
  if (!verification.isValid) {
    return c.json({ error: `Invalid payment: ${verification.invalidReason}` }, 402);
  }

  const settlement = await okxSettleX402Payment(
    xPayment,
    STRATEGIST_WALLET,
    X402_SCAN_PRICE,
    `${API_URL}/agents/strategist/scan`,
    "Helios Strategist: alpha scan on X Layer",
  );
  if (!settlement.success) {
    return c.json({ error: `Settlement failed: ${settlement.errorReason}` }, 402);
  }

  const context = buildCycleContext({
    curator: "0",
    strategist: "0",
    sentinel: "0",
    executor: "0",
  });

  const scan = await runStrategistScan(
    {
      name: "strategist",
      wallet: {
        accountId: process.env.STRATEGIST_ACCOUNT_ID ?? "",
        address: STRATEGIST_WALLET as `0x${string}`,
      },
      tools: strategistTools,
      llm: { model: "gpt-4o", apiKey: process.env.OPENAI_API_KEY ?? "" },
      prompts: {
        strategy: STRATEGIST_SYSTEM_PROMPT,
        budget: buildStrategistBudget({
          openPositions: JSON.stringify(context.openPositions),
          yieldPosition: "none",
          consecutiveNoAlpha: context.consecutiveNoAlpha,
        }),
      },
    },
    context,
  );

  return c.json(scan, 200, {
    "X-Payment-Response": buildPaymentResponse(settlement.txHash, settlement.payer),
  });
});

export { strategistRoutes };

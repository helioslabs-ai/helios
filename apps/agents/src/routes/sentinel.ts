import { Hono } from "hono";

const sentinelRoutes = new Hono();

// x402-gated endpoint — Curator pays for risk assessment
sentinelRoutes.get("/assess", async (c) => {
  // TODO: verify x402 payment header, then run sentinel assessment
  return c.json({ status: "not_implemented" });
});

export { sentinelRoutes };

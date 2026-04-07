import { Hono } from "hono";

const strategistRoutes = new Hono();

// x402-gated endpoint — Curator pays to trigger a scan
strategistRoutes.get("/scan", async (c) => {
  // TODO: verify x402 payment header, then run strategist scan
  return c.json({ status: "not_implemented" });
});

export { strategistRoutes };

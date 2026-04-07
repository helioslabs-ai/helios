import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { api } from "./routes/api.js";
import { executorRoutes } from "./routes/executor.js";
import { sentinelRoutes } from "./routes/sentinel.js";
import { strategistRoutes } from "./routes/strategist.js";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

app.get("/health", (c) => c.json({ status: "ok", ts: new Date().toISOString() }));

app.route("/api", api);
app.route("/agents/strategist", strategistRoutes);
app.route("/agents/sentinel", sentinelRoutes);
app.route("/agents/executor", executorRoutes);

export { app };

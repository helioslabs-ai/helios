import { tool } from "ai";
import { z } from "zod";

export const okxAuditLog = tool({
  description: "Export audit log of all agent decisions and transactions via okx-audit-log",
  parameters: z.object({
    limit: z.number().default(50),
  }),
  execute: async ({ limit }) => {
    // TODO: call onchainos audit log export
    return { entries: [], limit };
  },
});

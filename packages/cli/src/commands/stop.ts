import * as p from "@clack/prompts";
import { post } from "../http.js";

export async function stopCommand() {
  p.intro("Helios Stop");

  const s = p.spinner();
  s.start("Halting swarm...");

  try {
    await post("/api/halt", { reason: "operator stop" });
    s.stop("Swarm halted.");
  } catch (err) {
    s.stop(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  p.outro("Resume requires server restart with ENABLE_AGENTS=true");
}

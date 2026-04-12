import pc from "picocolors";
import { post } from "../http.js";

export async function cycleCommand(opts: { json?: boolean }) {
  const data = await post<{
    status: string;
    cycleId?: string;
    swarmState?: string;
    reason?: string;
  }>("/api/cycle");

  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log();
  if (data.status === "triggered") {
    console.log(`  ${pc.green("✓ Cycle triggered")}`);
    if (data.cycleId) console.log(`  ${pc.dim("id")}  ${data.cycleId}`);
  } else if (data.status === "busy") {
    console.log(
      `  ${pc.yellow("⚠ Swarm is busy")}  state: ${pc.cyan(data.swarmState ?? "unknown")}`,
    );
  } else if (data.status === "halted") {
    console.log(`  ${pc.red("✗ Swarm is halted")}${data.reason ? `  reason: ${data.reason}` : ""}`);
  } else {
    console.log(`  ${pc.dim(JSON.stringify(data))}`);
  }
  console.log();
}

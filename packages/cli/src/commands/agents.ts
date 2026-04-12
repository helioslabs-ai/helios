import { type AgentInfo, printAgents } from "../format.js";
import { get } from "../http.js";

export async function agentsCommand(opts: { json?: boolean }) {
  const data = await get<{ agents: AgentInfo[] }>("/api/agents");
  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    printAgents(data.agents);
  }
}

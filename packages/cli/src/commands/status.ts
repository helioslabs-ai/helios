import { printStatus, type SwarmStatus } from "../format.js";
import { get } from "../http.js";

export async function statusCommand(opts: { json?: boolean }) {
  const data = await get<SwarmStatus>("/api/status");
  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    printStatus(data);
  }
}

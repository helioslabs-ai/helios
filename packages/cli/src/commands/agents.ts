import { get } from "../http.js";

export async function agentsCommand(opts: { json?: boolean }) {
  const data = await get("/api/agents");
  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

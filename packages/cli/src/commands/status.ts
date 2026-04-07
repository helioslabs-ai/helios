import { get } from "../http.js";

export async function statusCommand(opts: { json?: boolean }) {
  const data = await get("/api/status");
  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

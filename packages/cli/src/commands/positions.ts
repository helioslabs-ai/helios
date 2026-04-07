import { get } from "../http.js";

export async function positionsCommand(opts: { json?: boolean }) {
  const data = await get("/api/positions");
  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

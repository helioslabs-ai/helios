import { get } from "../http.js";

export async function economyCommand(opts: { json?: boolean }) {
  const data = await get("/api/economy");
  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

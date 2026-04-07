import { post } from "../http.js";

export async function cycleCommand(opts: { json?: boolean }) {
  const data = await post("/api/cycle");
  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log("Cycle triggered:", data);
  }
}

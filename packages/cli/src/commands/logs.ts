import { get } from "../http.js";

export async function logsCommand(n: string, opts: { json?: boolean }) {
  const count = Number(n) || 5;
  const data = await get(`/api/logs?n=${count}`);
  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

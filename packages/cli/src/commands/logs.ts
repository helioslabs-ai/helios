import { type CycleSummary, printLogs } from "../format.js";
import { get } from "../http.js";

export async function logsCommand(n: string, opts: { json?: boolean }) {
  const count = Math.min(Number(n) || 5, 50);
  const data = await get<{ cycles: CycleSummary[]; count: number }>(`/api/logs?n=${count}`);
  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    printLogs(data.cycles, data.count);
  }
}

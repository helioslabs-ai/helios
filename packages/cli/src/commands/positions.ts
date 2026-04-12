import { type PositionsData, printPositions } from "../format.js";
import { get } from "../http.js";

export async function positionsCommand(opts: { json?: boolean }) {
  const data = await get<PositionsData>("/api/positions");
  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    printPositions(data);
  }
}

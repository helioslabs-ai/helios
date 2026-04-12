import { type EconomyData, printEconomy } from "../format.js";
import { get } from "../http.js";

export async function economyCommand(opts: { json?: boolean }) {
  const data = await get<EconomyData>("/api/economy");
  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    printEconomy(data);
  }
}

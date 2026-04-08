import { WarRoomClient } from "@/components/dashboard/war-room-client";
import { fetchDashboardData } from "@/lib/api";

export default async function Home() {
  const data = await fetchDashboardData();
  return <WarRoomClient initial={data} />;
}

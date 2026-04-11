import Image from "next/image";
import { fetchDashboardData, fetchLeaderboard } from "@/lib/api";
import { HeliosDashboard } from "@/components/dashboard/helios-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [dashboardData, leaderboard] = await Promise.all([
    fetchDashboardData(),
    fetchLeaderboard(),
  ]);

  return <HeliosDashboard initial={dashboardData} leaderboard={leaderboard} />;
}

import { listCases } from "@/services/case.service";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cases = await listCases();
  return <DashboardClient cases={cases} />;
}

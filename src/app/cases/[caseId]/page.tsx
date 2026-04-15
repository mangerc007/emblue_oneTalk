import { getCaseById } from "@/services/case.service";
import { notFound } from "next/navigation";
import { CaseDashboardClient } from "./case-dashboard-client";

export const dynamic = "force-dynamic";

export default async function CasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const data = await getCaseById(caseId);
  if (!data) notFound();

  return <CaseDashboardClient initialCase={data} />;
}

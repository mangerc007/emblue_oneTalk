import { getCaseById } from "@/services/case.service";
import { notFound } from "next/navigation";
import { DocumentsClient } from "./documents-client";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const data = await getCaseById(caseId);
  if (!data) notFound();

  return <DocumentsClient caseData={data} />;
}

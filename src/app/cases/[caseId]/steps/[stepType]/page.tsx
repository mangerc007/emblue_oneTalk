import { getCaseById } from "@/services/case.service";
import { notFound } from "next/navigation";
import type { StepType } from "@/domain/types";
import { STEP_ORDER } from "@/domain/types";
import { StepPageClient } from "./step-page-client";

export const dynamic = "force-dynamic";

export default async function StepPage({
  params,
}: {
  params: Promise<{ caseId: string; stepType: string }>;
}) {
  const { caseId, stepType } = await params;

  if (!STEP_ORDER.includes(stepType as StepType)) notFound();

  const data = await getCaseById(caseId);
  if (!data) notFound();

  const step = data.steps.find((s) => s.type === stepType);
  if (!step) notFound();

  return (
    <StepPageClient
      caseData={data}
      stepType={stepType as StepType}
    />
  );
}

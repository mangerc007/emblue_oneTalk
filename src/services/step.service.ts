import { prisma } from "@/lib/prisma";
import type { StepType, StepStatus } from "@/domain/types";
import { STEP_LABELS } from "@/domain/types";
import { updateCaseProgress } from "./case.service";
import { getSystemMessage } from "@/domain/assistant/messages";

// ─────────────────────────────────────────────
// Step Service
// ─────────────────────────────────────────────

export async function updateStepStatus(
  caseId: string,
  stepType: StepType,
  status: StepStatus,
  extras?: { blockedReason?: string; formData?: Record<string, unknown>; notes?: string }
): Promise<void> {
  const step = await prisma.activationStep.findUnique({
    where: { caseId_type: { caseId, type: stepType } },
  });

  if (!step) throw new Error(`Step ${stepType} not found for case ${caseId}`);

  const isCompleting = status === "COMPLETED" && step.status !== "COMPLETED";

  await prisma.activationStep.update({
    where: { id: step.id },
    data: {
      status,
      blockedReason: extras?.blockedReason ?? null,
      formData: (extras?.formData ?? step.formData ?? undefined) as never,
      notes: extras?.notes,
      completedAt: isCompleting ? new Date() : step.completedAt,
    },
  });

  // If a step is completed, unlock the next one
  if (isCompleting) {
    await unlockNextStep(caseId, stepType);

    // Log the completion as an assistant message
    await prisma.assistantMessage.create({
      data: {
        caseId,
        role: "ASSISTANT",
        content: getSystemMessage("step_completed", {
          stepLabel: STEP_LABELS[stepType],
        }),
        stepType,
      },
    });
  }

  // Update case progress
  await updateCaseProgress(caseId);
}

export async function updateChecklistItem(
  stepId: string,
  itemKey: string,
  completed: boolean
): Promise<void> {
  await prisma.stepChecklistItem.updateMany({
    where: { stepId, key: itemKey },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });

  // Auto-update step status to IN_PROGRESS when first item is checked
  const step = await prisma.activationStep.findUnique({
    where: { id: stepId },
    include: { checklistItems: true },
  });

  if (step?.status === "NOT_STARTED" && completed) {
    await prisma.activationStep.update({
      where: { id: stepId },
      data: { status: "IN_PROGRESS" },
    });
  }
}

export async function saveStepFormData(
  caseId: string,
  stepType: StepType,
  formData: Record<string, unknown>
): Promise<void> {
  const step = await prisma.activationStep.findUnique({
    where: { caseId_type: { caseId, type: stepType } },
  });

  if (!step) throw new Error(`Step ${stepType} not found`);

  const newStatus = step.status === "NOT_STARTED" ? "IN_PROGRESS" : step.status;

  await prisma.activationStep.update({
    where: { id: step.id },
    data: {
      formData: formData as never,
      status: newStatus,
    },
  });
}

// ─────────────────────────────────────────────
// Meta verification status
// ─────────────────────────────────────────────

export async function addMetaVerificationStatus(
  caseId: string,
  status: string,
  notes?: string
): Promise<void> {
  await prisma.verificationStatusLog.create({
    data: {
      caseId,
      status: status as never,
      notes,
    },
  });

  // Log to assistant messages
  await prisma.assistantMessage.create({
    data: {
      caseId,
      role: "ASSISTANT",
      content: getSystemMessage("meta_status_changed", { status }),
      stepType: "META_REVIEW",
    },
  });

  // If approved, complete META_REVIEW step
  if (status === "APPROVED") {
    await updateStepStatus(caseId, "META_REVIEW", "COMPLETED");
  }
  // If rejected or needs_info, set META_REVIEW back to in_progress with blocked
  else if (status === "REJECTED" || status === "NEEDS_INFORMATION") {
    await prisma.activationStep.updateMany({
      where: { caseId, type: "META_REVIEW" },
      data: {
        status: "BLOCKED",
        blockedReason:
          status === "REJECTED"
            ? "Meta rechazó la verificación. Revisa y corrige los datos."
            : "Meta solicita información adicional.",
      },
    });
  } else if (status === "UNDER_REVIEW") {
    await prisma.activationStep.updateMany({
      where: { caseId, type: "META_REVIEW" },
      data: { status: "IN_PROGRESS", blockedReason: null },
    });
  }

  await updateCaseProgress(caseId);
}

// ─────────────────────────────────────────────
// OneTalk association
// ─────────────────────────────────────────────

export async function completeOneTalkAssociation(
  caseId: string,
  inboxId: string,
  inboxName: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.activationCase.update({
      where: { id: caseId },
      data: {
        oneTalkInboxId: inboxId,
        oneTalkInboxName: inboxName,
        associatedAt: new Date(),
      },
    });

    await tx.activationStep.updateMany({
      where: { caseId, type: "ONETALK_ASSOCIATION" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    await tx.assistantMessage.create({
      data: {
        caseId,
        role: "ASSISTANT",
        content: getSystemMessage("onetalk_associated", { inboxName }),
        stepType: "ONETALK_ASSOCIATION",
      },
    });
  });

  await updateCaseProgress(caseId);
}

// ─────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────

async function unlockNextStep(
  caseId: string,
  completedStepType: StepType
): Promise<void> {
  const NEXT_STEP: Partial<Record<StepType, StepType>> = {
    BUSINESS_MANAGER: "BUSINESS_INFO",
    BUSINESS_INFO: "LEGAL_DOCUMENTS",
    LEGAL_DOCUMENTS: "START_VERIFICATION",
    START_VERIFICATION: "VERIFICATION_WIZARD",
    VERIFICATION_WIZARD: "META_REVIEW",
    META_REVIEW: "ONETALK_ASSOCIATION",
  };

  const nextType = NEXT_STEP[completedStepType];
  if (!nextType) return;

  await prisma.activationStep.updateMany({
    where: { caseId, type: nextType, status: "NOT_STARTED" },
    data: { status: "IN_PROGRESS" },
  });
}

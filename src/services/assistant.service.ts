import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────
// Assistant Service — message persistence
// ─────────────────────────────────────────────

export async function addUserMessage(
  caseId: string,
  content: string,
  stepType?: string
): Promise<void> {
  await prisma.assistantMessage.create({
    data: {
      caseId,
      role: "USER",
      content,
      stepType: stepType as never,
    },
  });
}

export async function addAssistantMessage(
  caseId: string,
  content: string,
  stepType?: string
): Promise<void> {
  await prisma.assistantMessage.create({
    data: {
      caseId,
      role: "ASSISTANT",
      content,
      stepType: stepType as never,
    },
  });
}

export async function getMessagesByCaseId(caseId: string) {
  return prisma.assistantMessage.findMany({
    where: { caseId },
    orderBy: { createdAt: "asc" },
  });
}

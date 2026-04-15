import { prisma } from "@/lib/prisma";
import type { DocumentType, DocumentStatus } from "@/domain/types";
import { DOCUMENT_LABELS } from "@/domain/types";
import { getSystemMessage } from "@/domain/assistant/messages";

// ─────────────────────────────────────────────
// Document Service
// ─────────────────────────────────────────────

export async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  extras?: {
    notes?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
  }
): Promise<void> {
  const doc = await prisma.businessDocument.findUnique({
    where: { id: documentId },
  });

  if (!doc) throw new Error(`Document ${documentId} not found`);

  const isUploading = status === "UPLOADED" && doc.status !== "UPLOADED";
  const isValidating = status === "VALIDATED";

  await prisma.businessDocument.update({
    where: { id: documentId },
    data: {
      status,
      notes: extras?.notes ?? doc.notes,
      fileUrl: extras?.fileUrl ?? doc.fileUrl,
      fileName: extras?.fileName ?? doc.fileName,
      fileSize: extras?.fileSize ?? doc.fileSize,
      uploadedAt: isUploading ? new Date() : doc.uploadedAt,
      validatedAt: isValidating ? new Date() : doc.validatedAt,
    },
  });

  // Create system message for key status changes
  const label =
    DOCUMENT_LABELS[doc.type as keyof typeof DOCUMENT_LABELS] ?? doc.name;

  if (isUploading) {
    await prisma.assistantMessage.create({
      data: {
        caseId: doc.caseId,
        role: "ASSISTANT",
        content: getSystemMessage("document_uploaded", {
          documentName: label,
          documentType: doc.type,
        }),
        stepType: "LEGAL_DOCUMENTS",
      },
    });
  }

  if (isValidating) {
    await prisma.assistantMessage.create({
      data: {
        caseId: doc.caseId,
        role: "ASSISTANT",
        content: getSystemMessage("document_validated", {
          documentName: label,
        }),
        stepType: "LEGAL_DOCUMENTS",
      },
    });
  }
}

export async function addDocument(
  caseId: string,
  type: DocumentType,
  name: string
): Promise<string> {
  const doc = await prisma.businessDocument.create({
    data: {
      caseId,
      type,
      name,
      status: "MISSING",
    },
  });
  return doc.id;
}

export async function getDocumentsByCaseId(caseId: string) {
  return prisma.businessDocument.findMany({
    where: { caseId },
    orderBy: { createdAt: "asc" },
  });
}

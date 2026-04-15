import { z } from "zod";

export const documentStatusSchema = z.object({
  status: z.enum(["MISSING", "UPLOADED", "VALIDATED", "OBSERVED", "REJECTED"]),
  notes: z.string().max(500).optional().or(z.literal("")),
  fileUrl: z.string().url().optional().or(z.literal("")),
  fileName: z.string().max(255).optional().or(z.literal("")),
});

export type DocumentStatusInput = z.infer<typeof documentStatusSchema>;

export const createDocumentSchema = z.object({
  type: z.enum([
    "BUSINESS_REGISTRATION",
    "TAX_CERTIFICATE",
    "UTILITY_BILL",
    "BANK_STATEMENT",
    "ID_DOCUMENT",
    "META_BUSINESS_VERIFICATION",
    "OTHER",
  ]),
  name: z.string().min(2).max(255),
  status: z
    .enum(["MISSING", "UPLOADED", "VALIDATED", "OBSERVED", "REJECTED"])
    .default("MISSING"),
  fileUrl: z.string().url().optional().or(z.literal("")),
  fileName: z.string().max(255).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const oneTalkAssociationSchema = z.object({
  oneTalkInboxId: z.string().min(1, "Selecciona una bandeja OneTalk"),
  oneTalkInboxName: z.string().min(1),
});

export type OneTalkAssociationInput = z.infer<typeof oneTalkAssociationSchema>;

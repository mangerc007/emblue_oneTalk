import { z } from "zod";

export const updateStepSchema = z.object({
  status: z
    .enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETED"])
    .optional(),
  formData: z.record(z.string(), z.unknown()).optional(),
  blockedReason: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type UpdateStepInput = z.infer<typeof updateStepSchema>;

export const updateChecklistItemSchema = z.object({
  completed: z.boolean(),
});

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;

export const metaVerificationStatusSchema = z.object({
  status: z.enum([
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "NEEDS_INFORMATION",
  ]),
  notes: z.union([z.string().max(500), z.literal("")]).optional(),
});

export type MetaVerificationStatusInput = z.infer<
  typeof metaVerificationStatusSchema
>;

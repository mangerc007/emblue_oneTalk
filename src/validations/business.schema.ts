import { z } from "zod";

export const businessSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  legalName: z
    .string()
    .min(2, "El nombre legal debe tener al menos 2 caracteres")
    .max(150, "El nombre legal no puede exceder 150 caracteres")
    .optional()
    .or(z.literal("")),
  taxId: z
    .string()
    .min(5, "El NIT/RUT debe tener al menos 5 caracteres")
    .max(30, "El NIT/RUT no puede exceder 30 caracteres")
    .optional()
    .or(z.literal("")),
  website: z
    .string()
    .url("Debe ser una URL válida (ej: https://minegocio.com)")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, "Teléfono inválido")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  addressLine: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  metaBusinessId: z.string().max(50).optional().or(z.literal("")),
  metaPageId: z.string().max(50).optional().or(z.literal("")),
  metaPageName: z.string().max(100).optional().or(z.literal("")),
});

export type BusinessInput = z.infer<typeof businessSchema>;

// Required fields for Business Info step to be considered complete
export const BUSINESS_INFO_REQUIRED_FIELDS: (keyof BusinessInput)[] = [
  "name",
  "legalName",
  "taxId",
  "website",
  "phone",
  "email",
  "addressLine",
  "city",
  "country",
];

export function isBusinessInfoComplete(
  data: Partial<BusinessInput>
): boolean {
  return BUSINESS_INFO_REQUIRED_FIELDS.every(
    (field) => data[field] && String(data[field]).trim() !== ""
  );
}

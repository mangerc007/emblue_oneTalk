// ─────────────────────────────────────────────
// Domain Types — shared across client and server
// ─────────────────────────────────────────────

export type StepType =
  | "BUSINESS_MANAGER"
  | "BUSINESS_INFO"
  | "LEGAL_DOCUMENTS"
  | "START_VERIFICATION"
  | "VERIFICATION_WIZARD"
  | "META_REVIEW"
  | "ONETALK_ASSOCIATION";

export type StepStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED";

export type CaseStatus = "ACTIVE" | "COMPLETED" | "ABANDONED" | "BLOCKED";

export type MetaVerificationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_INFORMATION";

export type DocumentType =
  | "BUSINESS_REGISTRATION"
  | "TAX_CERTIFICATE"
  | "UTILITY_BILL"
  | "BANK_STATEMENT"
  | "ID_DOCUMENT"
  | "META_BUSINESS_VERIFICATION"
  | "OTHER";

export type DocumentStatus =
  | "MISSING"
  | "UPLOADED"
  | "VALIDATED"
  | "OBSERVED"
  | "REJECTED";

export type MessageRole = "ASSISTANT" | "USER";

// ─────────────────────────────────────────────
// Step ordering and metadata
// ─────────────────────────────────────────────

export const STEP_ORDER: StepType[] = [
  "BUSINESS_MANAGER",
  "BUSINESS_INFO",
  "LEGAL_DOCUMENTS",
  "START_VERIFICATION",
  "VERIFICATION_WIZARD",
  "META_REVIEW",
  "ONETALK_ASSOCIATION",
];

export const STEP_LABELS: Record<StepType, string> = {
  BUSINESS_MANAGER: "Business Manager",
  BUSINESS_INFO: "Información del Negocio",
  LEGAL_DOCUMENTS: "Documentos Legales",
  START_VERIFICATION: "Iniciar Verificación",
  VERIFICATION_WIZARD: "Wizard de Verificación",
  META_REVIEW: "Revisión de Meta",
  ONETALK_ASSOCIATION: "Asociación OneTalk",
};

export const STEP_DESCRIPTIONS: Record<StepType, string> = {
  BUSINESS_MANAGER:
    "Confirma que el Business Manager de Meta está creado y habilitado correctamente.",
  BUSINESS_INFO:
    "Completa la información básica y de contacto del negocio que se verificará.",
  LEGAL_DOCUMENTS:
    "Carga los documentos legales que Meta requiere para validar la identidad del negocio.",
  START_VERIFICATION:
    "Revisa que todo esté en orden y da inicio formal al proceso de verificación en Meta.",
  VERIFICATION_WIZARD:
    "Completa el wizard de verificación en el Business Manager de Meta siguiendo los pasos indicados.",
  META_REVIEW:
    "Meta está revisando la información enviada. Este proceso puede tomar de 1 a 7 días hábiles.",
  ONETALK_ASSOCIATION:
    "Asocia el negocio verificado con una bandeja de OneTalk para activar la mensajería.",
};

export const STEP_ICONS: Record<StepType, string> = {
  BUSINESS_MANAGER: "building-2",
  BUSINESS_INFO: "info",
  LEGAL_DOCUMENTS: "file-text",
  START_VERIFICATION: "shield-check",
  VERIFICATION_WIZARD: "wand-2",
  META_REVIEW: "clock",
  ONETALK_ASSOCIATION: "link",
};

// ─────────────────────────────────────────────
// Required documents per step
// ─────────────────────────────────────────────

export const REQUIRED_DOCUMENTS: DocumentType[] = [
  "BUSINESS_REGISTRATION",
  "TAX_CERTIFICATE",
  "ID_DOCUMENT",
];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  BUSINESS_REGISTRATION: "Registro / Constitución del Negocio",
  TAX_CERTIFICATE: "Certificado Tributario (RUT / NIT)",
  UTILITY_BILL: "Factura de Servicios Públicos",
  BANK_STATEMENT: "Extracto Bancario",
  ID_DOCUMENT: "Identificación del Representante Legal",
  META_BUSINESS_VERIFICATION: "Documento de Verificación Meta",
  OTHER: "Otro Documento",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  MISSING: "Faltante",
  UPLOADED: "Cargado",
  VALIDATED: "Validado",
  OBSERVED: "Con observaciones",
  REJECTED: "Rechazado",
};

export const META_STATUS_LABELS: Record<MetaVerificationStatus, string> = {
  SUBMITTED: "Enviado a Meta",
  UNDER_REVIEW: "En revisión",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  NEEDS_INFORMATION: "Requiere información adicional",
};

// ─────────────────────────────────────────────
// Rich data transfer objects (for API responses)
// ─────────────────────────────────────────────

export interface ChecklistItemDTO {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  required: boolean;
  completed: boolean;
  completedAt?: Date | null;
}

export interface StepDTO {
  id: string;
  type: StepType;
  status: StepStatus;
  order: number;
  formData?: Record<string, unknown> | null;
  blockedReason?: string | null;
  notes?: string | null;
  completedAt?: Date | null;
  checklistItems: ChecklistItemDTO[];
  label: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentDTO {
  id: string;
  type: DocumentType;
  name: string;
  status: DocumentStatus;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  notes?: string | null;
  uploadedAt?: Date | null;
  validatedAt?: Date | null;
  label: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationLogDTO {
  id: string;
  status: MetaVerificationStatus;
  notes?: string | null;
  createdAt: Date;
  label: string;
}

export interface AssistantMessageDTO {
  id: string;
  role: MessageRole;
  content: string;
  stepType?: StepType | null;
  createdAt: Date;
}

export interface BusinessDTO {
  id: string;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine?: string | null;
  city?: string | null;
  country?: string | null;
  industry?: string | null;
  description?: string | null;
  metaBusinessId?: string | null;
  metaPageId?: string | null;
  metaPageName?: string | null;
}

export interface CaseDTO {
  id: string;
  status: CaseStatus;
  progressPct: number;
  notes?: string | null;
  oneTalkInboxId?: string | null;
  oneTalkInboxName?: string | null;
  associatedAt?: Date | null;
  business: BusinessDTO;
  steps: StepDTO[];
  documents: DocumentDTO[];
  statusLogs: VerificationLogDTO[];
  messages: AssistantMessageDTO[];
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────
// Rule engine result types
// ─────────────────────────────────────────────

export interface StepBlocker {
  code: string;
  message: string;
  actionable?: string;
}

export interface StepRuleResult {
  canAdvance: boolean;
  blockers: StepBlocker[];
  nextAction?: string;
  suggestions: string[];
}

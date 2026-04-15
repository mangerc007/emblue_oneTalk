import { prisma } from "@/lib/prisma";
import type {
  CaseDTO,
  StepDTO,
  DocumentDTO,
  VerificationLogDTO,
  AssistantMessageDTO,
} from "@/domain/types";
import {
  STEP_LABELS,
  STEP_DESCRIPTIONS,
  STEP_ORDER,
  DOCUMENT_LABELS,
  META_STATUS_LABELS,
} from "@/domain/types";
import { calculateProgress } from "@/domain/rules";

// ─────────────────────────────────────────────
// Case Service — data access layer for cases
// ─────────────────────────────────────────────

export async function getCaseById(caseId: string): Promise<CaseDTO | null> {
  const raw = await prisma.activationCase.findUnique({
    where: { id: caseId },
    include: {
      business: true,
      steps: {
        include: { checklistItems: { orderBy: { createdAt: "asc" } } },
        orderBy: { order: "asc" },
      },
      documents: { orderBy: { createdAt: "asc" } },
      statusLogs: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!raw) return null;
  return mapCaseToDTO(raw);
}

export async function listCases() {
  const cases = await prisma.activationCase.findMany({
    include: {
      business: true,
      steps: {
        include: { checklistItems: true },
        orderBy: { order: "asc" },
      },
      documents: true,
      statusLogs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return cases.map((c) => {
    const steps = c.steps.map((s) => ({
      ...s,
      label: STEP_LABELS[s.type as keyof typeof STEP_LABELS],
      description: STEP_DESCRIPTIONS[s.type as keyof typeof STEP_DESCRIPTIONS],
      checklistItems: s.checklistItems,
      formData: s.formData as Record<string, unknown> | null,
    }));
    const progress = calculateProgress(steps as StepDTO[]);
    const latestMeta = c.statusLogs[0];

    return {
      id: c.id,
      status: c.status,
      progressPct: progress,
      businessName: c.business.name,
      businessId: c.businessId,
      latestMetaStatus: latestMeta?.status ?? null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  });
}

export async function createCase(businessData: {
  name: string;
  country?: string;
}): Promise<CaseDTO> {
  const result = await prisma.$transaction(async (tx) => {
    // Create business
    const business = await tx.business.create({
      data: {
        name: businessData.name,
        country: businessData.country,
      },
    });

    // Create case
    const activationCase = await tx.activationCase.create({
      data: {
        businessId: business.id,
        status: "ACTIVE",
        progressPct: 0,
      },
    });

    // Create all steps in order
    for (let i = 0; i < STEP_ORDER.length; i++) {
      const stepType = STEP_ORDER[i];
      const step = await tx.activationStep.create({
        data: {
          caseId: activationCase.id,
          type: stepType,
          status: i === 0 ? "IN_PROGRESS" : "NOT_STARTED",
          order: i,
        },
      });

      // Create default checklist items per step
      const items = getDefaultChecklistItems(stepType);
      for (const item of items) {
        await tx.stepChecklistItem.create({
          data: { stepId: step.id, ...item },
        });
      }
    }

    // Create default required documents
    const defaultDocs = getDefaultDocuments();
    for (const doc of defaultDocs) {
      await tx.businessDocument.create({
        data: { caseId: activationCase.id, ...doc },
      });
    }

    // Create initial assistant message
    await tx.assistantMessage.create({
      data: {
        caseId: activationCase.id,
        role: "ASSISTANT",
        content: `¡Bienvenido al asistente de activación! Hemos creado el caso para "${businessData.name}". Comenzamos verificando el Business Manager de Meta.`,
        stepType: "BUSINESS_MANAGER",
      },
    });

    return activationCase.id;
  });

  const created = await getCaseById(result);
  if (!created) throw new Error("Failed to create case");
  return created;
}

export async function updateCaseProgress(caseId: string): Promise<void> {
  const steps = await prisma.activationStep.findMany({
    where: { caseId },
    include: { checklistItems: true },
  });

  const stepDTOs = steps.map((s) => ({
    ...s,
    label: STEP_LABELS[s.type as keyof typeof STEP_LABELS],
    description: STEP_DESCRIPTIONS[s.type as keyof typeof STEP_DESCRIPTIONS],
    checklistItems: s.checklistItems,
    formData: s.formData as Record<string, unknown> | null,
  }));

  const progress = calculateProgress(stepDTOs as StepDTO[]);
  const allCompleted = steps.every((s) => s.status === "COMPLETED");

  await prisma.activationCase.update({
    where: { id: caseId },
    data: {
      progressPct: progress,
      status: allCompleted ? "COMPLETED" : "ACTIVE",
    },
  });
}

// ─────────────────────────────────────────────
// Mapping helpers
// ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCaseToDTO(raw: any): CaseDTO {
  const steps: StepDTO[] = raw.steps.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any): StepDTO => ({
      id: s.id,
      type: s.type,
      status: s.status,
      order: s.order,
      formData: s.formData as Record<string, unknown> | null,
      blockedReason: s.blockedReason,
      notes: s.notes,
      completedAt: s.completedAt,
      label: STEP_LABELS[s.type as keyof typeof STEP_LABELS],
      description: STEP_DESCRIPTIONS[s.type as keyof typeof STEP_DESCRIPTIONS],
      checklistItems: s.checklistItems,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })
  );

  const documents: DocumentDTO[] = raw.documents.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (d: any): DocumentDTO => ({
      id: d.id,
      type: d.type,
      name: d.name,
      status: d.status,
      fileUrl: d.fileUrl,
      fileName: d.fileName,
      fileSize: d.fileSize,
      notes: d.notes,
      uploadedAt: d.uploadedAt,
      validatedAt: d.validatedAt,
      label: DOCUMENT_LABELS[d.type as keyof typeof DOCUMENT_LABELS] ?? d.name,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })
  );

  const statusLogs: VerificationLogDTO[] = raw.statusLogs.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (l: any): VerificationLogDTO => ({
      id: l.id,
      status: l.status,
      notes: l.notes,
      createdAt: l.createdAt,
      label:
        META_STATUS_LABELS[l.status as keyof typeof META_STATUS_LABELS] ??
        l.status,
    })
  );

  const messages: AssistantMessageDTO[] = raw.messages.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any): AssistantMessageDTO => ({
      id: m.id,
      role: m.role,
      content: m.content,
      stepType: m.stepType,
      createdAt: m.createdAt,
    })
  );

  const progress = calculateProgress(steps);

  return {
    id: raw.id,
    status: raw.status,
    progressPct: progress,
    notes: raw.notes,
    oneTalkInboxId: raw.oneTalkInboxId,
    oneTalkInboxName: raw.oneTalkInboxName,
    associatedAt: raw.associatedAt,
    business: {
      id: raw.business.id,
      name: raw.business.name,
      legalName: raw.business.legalName,
      taxId: raw.business.taxId,
      website: raw.business.website,
      phone: raw.business.phone,
      email: raw.business.email,
      addressLine: raw.business.addressLine,
      city: raw.business.city,
      country: raw.business.country,
      industry: raw.business.industry,
      description: raw.business.description,
      metaBusinessId: raw.business.metaBusinessId,
      metaPageId: raw.business.metaPageId,
      metaPageName: raw.business.metaPageName,
    },
    steps,
    documents,
    statusLogs,
    messages,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// ─────────────────────────────────────────────
// Default checklist items per step type
// ─────────────────────────────────────────────

function getDefaultChecklistItems(stepType: string) {
  const checklists: Record<string, { key: string; label: string; description?: string; required: boolean }[]> = {
    BUSINESS_MANAGER: [
      { key: "bm_created", label: "Business Manager creado en Meta", description: "Accede a business.facebook.com y confirma que la cuenta existe.", required: true },
      { key: "bm_admin_role", label: "Rol de Administrador confirmado", description: "El usuario debe tener rol Admin en el BM.", required: true },
      { key: "bm_phone_verified", label: "Teléfono verificado en Meta", description: "El número de teléfono principal debe estar verificado.", required: true },
      { key: "bm_2fa_enabled", label: "Autenticación de dos factores habilitada", required: false },
    ],
    BUSINESS_INFO: [
      { key: "info_name", label: "Nombre legal del negocio ingresado", required: true },
      { key: "info_taxid", label: "NIT / RUT / Tax ID registrado", required: true },
      { key: "info_website", label: "Sitio web activo registrado", required: true },
      { key: "info_phone", label: "Teléfono de negocio registrado", required: true },
      { key: "info_email", label: "Email de negocio registrado", required: true },
      { key: "info_address", label: "Dirección física completa ingresada", required: true },
      { key: "info_industry", label: "Industria o rubro seleccionado", required: false },
    ],
    LEGAL_DOCUMENTS: [
      { key: "doc_registration", label: "Registro / Constitución del negocio cargado", required: true },
      { key: "doc_tax", label: "Certificado tributario (RUT/NIT) cargado", required: true },
      { key: "doc_id", label: "ID del representante legal cargado", required: true },
      { key: "doc_utility", label: "Factura de servicios públicos (opcional)", required: false },
    ],
    START_VERIFICATION: [
      { key: "sv_bm_ok", label: "Business Manager verificado y activo", required: true },
      { key: "sv_info_ok", label: "Información del negocio completa y correcta", required: true },
      { key: "sv_docs_ok", label: "Documentos legales cargados y aprobados", required: true },
      { key: "sv_terms", label: "Términos de verificación de Meta aceptados", required: true },
    ],
    VERIFICATION_WIZARD: [
      { key: "wiz_access_bm", label: "Acceder al Centro de Seguridad del Business Manager", required: true },
      { key: "wiz_start", label: "Hacer clic en 'Iniciar verificación del negocio'", required: true },
      { key: "wiz_method", label: "Seleccionar método de verificación (Dominio / Documentos)", required: true },
      { key: "wiz_submit", label: "Enviar solicitud de verificación a Meta", required: true },
    ],
    META_REVIEW: [
      { key: "meta_submitted", label: "Solicitud enviada a Meta", required: true },
      { key: "meta_response", label: "Respuesta de Meta recibida (aprobada)", required: true },
    ],
    ONETALK_ASSOCIATION: [
      { key: "ot_inbox_ready", label: "Bandeja OneTalk creada y activa", required: true },
      { key: "ot_number_available", label: "Número de WhatsApp Business disponible", required: true },
      { key: "ot_team_assigned", label: "Equipo asignado a la bandeja", required: true },
      { key: "ot_association_done", label: "Asociación completada en OneTalk", required: true },
    ],
  };

  return checklists[stepType] ?? [];
}

function getDefaultDocuments() {
  return [
    { type: "BUSINESS_REGISTRATION" as const, name: "Registro / Constitución del Negocio", status: "MISSING" as const },
    { type: "TAX_CERTIFICATE" as const, name: "Certificado Tributario (RUT / NIT)", status: "MISSING" as const },
    { type: "ID_DOCUMENT" as const, name: "Identificación del Representante Legal", status: "MISSING" as const },
  ];
}

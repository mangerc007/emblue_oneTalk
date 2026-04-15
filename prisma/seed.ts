import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// Seed data for 5 demo scenarios:
//  1. Caso incompleto (solo BM en progreso)
//  2. Caso listo para verificación (pasos 1-3 completos)
//  3. Caso en revisión Meta (submitted / under_review)
//  4. Caso aprobado por Meta (listo para OneTalk)
//  5. Caso rechazado por Meta
// ─────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...");

  // Demo agent user
  const agent = await prisma.user.upsert({
    where: { email: "demo@onetalk.com" },
    update: {},
    create: {
      email: "demo@onetalk.com",
      name: "Agente Demo",
      role: "AGENT",
    },
  });

  // ─── SCENARIO 1: Caso incompleto ───────────────
  await createCase({
    businessName: "Papelería El Punto S.A.S.",
    businessData: {
      legalName: null,
      taxId: null,
      website: null,
      phone: null,
      email: null,
      country: "Colombia",
      city: "Bogotá",
    },
    agentId: agent.id,
    scenario: "incomplete",
  });

  // ─── SCENARIO 2: Listo para verificación ───────
  await createCase({
    businessName: "Distribuidora Martínez S.A.S.",
    businessData: {
      legalName: "Distribuidora Martínez Sociedad por Acciones Simplificada",
      taxId: "901234567-1",
      website: "https://distribuidoramartinez.com",
      phone: "+57 310 000 0001",
      email: "info@distribuidoramartinez.com",
      country: "Colombia",
      city: "Medellín",
      addressLine: "Calle 50 # 45-20, Laureles",
      industry: "logistics",
    },
    agentId: agent.id,
    scenario: "ready_for_verification",
  });

  // ─── SCENARIO 3: En revisión Meta ───────────────
  await createCase({
    businessName: "Clínica Bienestar Total Ltda.",
    businessData: {
      legalName: "Clínica Bienestar Total Limitada",
      taxId: "800765432-5",
      website: "https://clinicabienestar.com",
      phone: "+57 300 111 2222",
      email: "contacto@clinicabienestar.com",
      country: "Colombia",
      city: "Cali",
      addressLine: "Av. 4 Norte # 25-10",
      industry: "health",
    },
    agentId: agent.id,
    scenario: "under_review",
    metaStatus: "UNDER_REVIEW",
  });

  // ─── SCENARIO 4: Aprobado por Meta ─────────────
  await createCase({
    businessName: "Tech Solutions Colombia S.A.S.",
    businessData: {
      legalName: "Tech Solutions Colombia Sociedad por Acciones Simplificada",
      taxId: "901122334-0",
      website: "https://techsolutions.co",
      phone: "+57 315 777 8888",
      email: "hola@techsolutions.co",
      country: "Colombia",
      city: "Bogotá",
      addressLine: "Carrera 7 # 71-21, Piso 5",
      industry: "technology",
      metaBusinessId: "123456789012345",
    },
    agentId: agent.id,
    scenario: "approved",
    metaStatus: "APPROVED",
  });

  // ─── SCENARIO 5: Rechazado por Meta ─────────────
  await createCase({
    businessName: "Restaurante La Fogata S.A.S.",
    businessData: {
      legalName: "Restaurante La Fogata Sociedad por Acciones Simplificada",
      taxId: "900888777-2",
      website: "https://lafogata.com",
      phone: "+57 316 222 3333",
      email: "reservas@lafogata.com",
      country: "Colombia",
      city: "Barranquilla",
      addressLine: "Cra. 53 # 72-12",
      industry: "food",
    },
    agentId: agent.id,
    scenario: "rejected",
    metaStatus: "REJECTED",
  });

  console.log("✅ Seed completed successfully!");
}

// ─────────────────────────────────────────────
// Helper to create a case with the right state
// ─────────────────────────────────────────────

type ScenarioType =
  | "incomplete"
  | "ready_for_verification"
  | "under_review"
  | "approved"
  | "rejected";

async function createCase({
  businessName,
  businessData,
  agentId,
  scenario,
  metaStatus,
}: {
  businessName: string;
  businessData: Record<string, string | null | undefined>;
  agentId: string;
  scenario: ScenarioType;
  metaStatus?: string;
}) {
  const business = await prisma.business.create({
    data: {
      name: businessName,
      legalName: businessData.legalName as string | undefined,
      taxId: businessData.taxId as string | undefined,
      website: businessData.website as string | undefined,
      phone: businessData.phone as string | undefined,
      email: businessData.email as string | undefined,
      country: businessData.country as string | undefined,
      city: businessData.city as string | undefined,
      addressLine: businessData.addressLine as string | undefined,
      industry: businessData.industry as string | undefined,
      metaBusinessId: businessData.metaBusinessId as string | undefined,
    },
  });

  const isCompleted = scenario === "approved" && metaStatus === "APPROVED";

  const activationCase = await prisma.activationCase.create({
    data: {
      businessId: business.id,
      assignedToId: agentId,
      status: isCompleted ? "COMPLETED" : "ACTIVE",
      progressPct: getProgressPct(scenario),
      oneTalkInboxId: isCompleted ? "inbox_001" : undefined,
      oneTalkInboxName: isCompleted ? "Bandeja Principal — WhatsApp Business" : undefined,
      associatedAt: isCompleted ? new Date() : undefined,
    },
  });

  // Create steps
  const stepOrder = [
    "BUSINESS_MANAGER",
    "BUSINESS_INFO",
    "LEGAL_DOCUMENTS",
    "START_VERIFICATION",
    "VERIFICATION_WIZARD",
    "META_REVIEW",
    "ONETALK_ASSOCIATION",
  ];

  const stepStatuses = getStepStatuses(scenario);

  for (let i = 0; i < stepOrder.length; i++) {
    const stepType = stepOrder[i];
    const status = stepStatuses[i];
    const isStepCompleted = status === "COMPLETED";

    const step = await prisma.activationStep.create({
      data: {
        caseId: activationCase.id,
        type: stepType as never,
        status: status as never,
        order: i,
        completedAt: isStepCompleted ? new Date(Date.now() - (stepOrder.length - i) * 86400000) : null,
      },
    });

    // Create checklist items
    const items = getChecklistItems(stepType, isStepCompleted);
    for (const item of items) {
      await prisma.stepChecklistItem.create({
        data: {
          stepId: step.id,
          ...item,
          completedAt: item.completed ? new Date() : null,
        },
      });
    }
  }

  // Create documents
  const docStatuses = getDocStatuses(scenario);
  const docDefs = [
    { type: "BUSINESS_REGISTRATION", name: "Registro / Constitución del Negocio" },
    { type: "TAX_CERTIFICATE", name: "Certificado Tributario (RUT / NIT)" },
    { type: "ID_DOCUMENT", name: "Identificación del Representante Legal" },
  ];

  for (let i = 0; i < docDefs.length; i++) {
    const docDef = docDefs[i];
    const docStatus = docStatuses[i];
    await prisma.businessDocument.create({
      data: {
        caseId: activationCase.id,
        type: docDef.type as never,
        name: docDef.name,
        status: docStatus as never,
        fileUrl:
          docStatus !== "MISSING"
            ? `https://example.com/docs/${activationCase.id}/${docDef.type.toLowerCase()}.pdf`
            : null,
        fileName: docStatus !== "MISSING" ? `${docDef.type.toLowerCase()}.pdf` : null,
        uploadedAt: docStatus !== "MISSING" ? new Date() : null,
        validatedAt: docStatus === "VALIDATED" ? new Date() : null,
        notes:
          docStatus === "OBSERVED"
            ? "El documento es ilegible en algunas secciones. Por favor cargue una versión de mayor calidad."
            : docStatus === "REJECTED"
            ? "El documento no corresponde al nombre legal del negocio registrado."
            : null,
      },
    });
  }

  // Create Meta status logs
  if (metaStatus) {
    const logs = getMetaStatusLogs(metaStatus);
    for (const log of logs) {
      await prisma.verificationStatusLog.create({
        data: {
          caseId: activationCase.id,
          status: log.status as never,
          notes: log.notes,
          createdAt: new Date(Date.now() - log.daysAgo * 86400000),
        },
      });
    }
  }

  // Initial assistant message
  await prisma.assistantMessage.create({
    data: {
      caseId: activationCase.id,
      role: "ASSISTANT",
      content: `¡Bienvenido al asistente de activación! El caso para "${businessName}" fue creado. ${getWelcomeMessage(scenario)}`,
      stepType: "BUSINESS_MANAGER",
    },
  });

  // Add contextual messages for advanced scenarios
  const additionalMessages = getAdditionalMessages(scenario, businessName);
  for (const msg of additionalMessages) {
    await prisma.assistantMessage.create({
      data: {
        caseId: activationCase.id,
        role: msg.role as never,
        content: msg.content,
        stepType: msg.stepType as never,
      },
    });
  }

  console.log(`  ✓ Caso "${businessName}" — Escenario: ${scenario}`);
  return activationCase;
}

// ─────────────────────────────────────────────
// Scenario helpers
// ─────────────────────────────────────────────

function getProgressPct(scenario: ScenarioType): number {
  const map: Record<ScenarioType, number> = {
    incomplete: 14,
    ready_for_verification: 43,
    under_review: 71,
    approved: 100,
    rejected: 71,
  };
  return map[scenario];
}

function getStepStatuses(scenario: ScenarioType): string[] {
  // Index: [BM, INFO, DOCS, START, WIZARD, META_REVIEW, ONETALK]
  const map: Record<ScenarioType, string[]> = {
    incomplete: [
      "IN_PROGRESS",
      "NOT_STARTED",
      "NOT_STARTED",
      "NOT_STARTED",
      "NOT_STARTED",
      "NOT_STARTED",
      "NOT_STARTED",
    ],
    ready_for_verification: [
      "COMPLETED",
      "COMPLETED",
      "COMPLETED",
      "IN_PROGRESS",
      "NOT_STARTED",
      "NOT_STARTED",
      "NOT_STARTED",
    ],
    under_review: [
      "COMPLETED",
      "COMPLETED",
      "COMPLETED",
      "COMPLETED",
      "COMPLETED",
      "IN_PROGRESS",
      "NOT_STARTED",
    ],
    approved: [
      "COMPLETED",
      "COMPLETED",
      "COMPLETED",
      "COMPLETED",
      "COMPLETED",
      "COMPLETED",
      "COMPLETED",
    ],
    rejected: [
      "COMPLETED",
      "COMPLETED",
      "COMPLETED",
      "COMPLETED",
      "COMPLETED",
      "BLOCKED",
      "NOT_STARTED",
    ],
  };
  return map[scenario];
}

function getDocStatuses(scenario: ScenarioType): string[] {
  // [REGISTRATION, TAX_CERT, ID_DOC]
  const map: Record<ScenarioType, string[]> = {
    incomplete: ["MISSING", "MISSING", "MISSING"],
    ready_for_verification: ["VALIDATED", "VALIDATED", "UPLOADED"],
    under_review: ["VALIDATED", "VALIDATED", "VALIDATED"],
    approved: ["VALIDATED", "VALIDATED", "VALIDATED"],
    rejected: ["VALIDATED", "OBSERVED", "VALIDATED"],
  };
  return map[scenario];
}

function getMetaStatusLogs(
  finalStatus: string
): { status: string; notes: string | null; daysAgo: number }[] {
  if (finalStatus === "UNDER_REVIEW") {
    return [
      { status: "SUBMITTED", notes: "Solicitud enviada a Meta.", daysAgo: 3 },
      {
        status: "UNDER_REVIEW",
        notes: "Meta está evaluando la solicitud.",
        daysAgo: 1,
      },
    ];
  }
  if (finalStatus === "APPROVED") {
    return [
      { status: "SUBMITTED", notes: "Solicitud enviada a Meta.", daysAgo: 8 },
      {
        status: "UNDER_REVIEW",
        notes: "Meta está evaluando la solicitud.",
        daysAgo: 6,
      },
      { status: "APPROVED", notes: "Verificación aprobada por Meta.", daysAgo: 2 },
    ];
  }
  if (finalStatus === "REJECTED") {
    return [
      { status: "SUBMITTED", notes: "Solicitud enviada a Meta.", daysAgo: 5 },
      {
        status: "UNDER_REVIEW",
        notes: "Meta está evaluando la solicitud.",
        daysAgo: 3,
      },
      {
        status: "REJECTED",
        notes:
          "Meta rechazó la verificación. Motivo: la información del negocio no coincide con los documentos legales presentados.",
        daysAgo: 1,
      },
    ];
  }
  return [];
}

function getWelcomeMessage(scenario: ScenarioType): string {
  const msgs: Record<ScenarioType, string> = {
    incomplete:
      "Comenzamos con el primer paso: confirmar el Business Manager de Meta.",
    ready_for_verification:
      "Los primeros pasos están completos. Estás listo para iniciar la verificación en Meta.",
    under_review:
      "La solicitud de verificación ya fue enviada a Meta. Estamos esperando su respuesta.",
    approved:
      "¡El negocio fue verificado exitosamente por Meta y está asociado con OneTalk!",
    rejected:
      "Meta rechazó la verificación. Revisa la información y los documentos para reintentar.",
  };
  return msgs[scenario];
}

function getAdditionalMessages(
  scenario: ScenarioType,
  businessName: string
): { role: string; content: string; stepType: string }[] {
  if (scenario === "under_review") {
    return [
      {
        role: "ASSISTANT",
        content: `La solicitud de "${businessName}" fue enviada a Meta hace 3 días. Meta está evaluando la información. Este proceso puede tardar hasta 7 días hábiles.`,
        stepType: "META_REVIEW",
      },
      {
        role: "USER",
        content: "¿Cuánto tiempo más puede tardar la revisión?",
        stepType: "META_REVIEW",
      },
      {
        role: "ASSISTANT",
        content:
          "Meta generalmente demora entre 1 y 7 días hábiles. Ya llevamos 3 días, así que puede llegar una respuesta pronto. Te avisaremos tan pronto como recibamos novedades.",
        stepType: "META_REVIEW",
      },
    ];
  }
  if (scenario === "rejected") {
    return [
      {
        role: "ASSISTANT",
        content:
          "Meta rechazó la verificación. El motivo indicado es que la información del negocio no coincide con los documentos legales. Esto es frecuente — se puede corregir y reintentar.",
        stepType: "META_REVIEW",
      },
      {
        role: "USER",
        content: "¿Qué debo corregir?",
        stepType: "META_REVIEW",
      },
      {
        role: "ASSISTANT",
        content:
          "Verifica que el nombre legal del negocio sea exactamente igual al que aparece en el registro mercantil. También revisa que la dirección y teléfono coincidan. Actualiza los documentos si es necesario y vuelve a iniciar el proceso.",
        stepType: "META_REVIEW",
      },
    ];
  }
  return [];
}

function getChecklistItems(
  stepType: string,
  allCompleted: boolean
): { key: string; label: string; description?: string; required: boolean; completed: boolean }[] {
  const allChecklists: Record<
    string,
    { key: string; label: string; description?: string; required: boolean }[]
  > = {
    BUSINESS_MANAGER: [
      { key: "bm_created", label: "Business Manager creado en Meta", description: "Accede a business.facebook.com y confirma que la cuenta existe.", required: true },
      { key: "bm_admin_role", label: "Rol de Administrador confirmado", required: true },
      { key: "bm_phone_verified", label: "Teléfono verificado en Meta", required: true },
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

  const items = allChecklists[stepType] ?? [];
  return items.map((item) => ({ ...item, completed: allCompleted }));
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

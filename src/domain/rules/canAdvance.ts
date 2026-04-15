import type {
  StepType,
  StepDTO,
  DocumentDTO,
  VerificationLogDTO,
  StepRuleResult,
  StepBlocker,
} from "@/domain/types";

// ─────────────────────────────────────────────
// Central rule engine: determines if a step can advance
// and what is blocking it.
// Rules are defined here — never in UI components.
// ─────────────────────────────────────────────

export function evaluateStep(
  stepType: StepType,
  steps: StepDTO[],
  documents: DocumentDTO[],
  statusLogs: VerificationLogDTO[]
): StepRuleResult {
  const stepMap = Object.fromEntries(steps.map((s) => [s.type, s]));

  switch (stepType) {
    case "BUSINESS_MANAGER":
      return evaluateBusinessManager(stepMap["BUSINESS_MANAGER"]);

    case "BUSINESS_INFO":
      return evaluateBusinessInfo(
        stepMap["BUSINESS_INFO"],
        stepMap["BUSINESS_MANAGER"]
      );

    case "LEGAL_DOCUMENTS":
      return evaluateLegalDocuments(
        stepMap["LEGAL_DOCUMENTS"],
        stepMap["BUSINESS_INFO"],
        documents
      );

    case "START_VERIFICATION":
      return evaluateStartVerification(
        stepMap["START_VERIFICATION"],
        stepMap["BUSINESS_INFO"],
        stepMap["LEGAL_DOCUMENTS"],
        documents
      );

    case "VERIFICATION_WIZARD":
      return evaluateVerificationWizard(
        stepMap["VERIFICATION_WIZARD"],
        stepMap["START_VERIFICATION"]
      );

    case "META_REVIEW":
      return evaluateMetaReview(
        stepMap["META_REVIEW"],
        stepMap["VERIFICATION_WIZARD"],
        statusLogs
      );

    case "ONETALK_ASSOCIATION":
      return evaluateOneTalkAssociation(
        stepMap["ONETALK_ASSOCIATION"],
        stepMap["META_REVIEW"],
        statusLogs
      );

    default:
      return { canAdvance: false, blockers: [], suggestions: [] };
  }
}

// ─────────────────────────────────────────────
// Rule: BUSINESS_MANAGER
// Can advance: checklist 100% completed
// ─────────────────────────────────────────────
function evaluateBusinessManager(step?: StepDTO): StepRuleResult {
  const blockers: StepBlocker[] = [];

  if (!step) {
    return {
      canAdvance: false,
      blockers: [
        {
          code: "STEP_NOT_INITIALIZED",
          message: "El paso no está inicializado.",
        },
      ],
      suggestions: [],
    };
  }

  if (step.status === "COMPLETED") {
    return { canAdvance: true, blockers: [], suggestions: [] };
  }

  const requiredItems = step.checklistItems.filter((i) => i.required);
  const incompleteItems = requiredItems.filter((i) => !i.completed);

  if (incompleteItems.length > 0) {
    blockers.push({
      code: "CHECKLIST_INCOMPLETE",
      message: `Faltan ${incompleteItems.length} elemento(s) del checklist por completar.`,
      actionable: "Completa todos los ítems requeridos del checklist.",
    });
  }

  return {
    canAdvance: blockers.length === 0,
    blockers,
    nextAction:
      blockers.length > 0
        ? "Completa el checklist del Business Manager"
        : "Confirmar Business Manager listo",
    suggestions:
      blockers.length > 0
        ? [
            "Accede a business.facebook.com y verifica que tu cuenta de Business Manager esté activa.",
            "Asegúrate de que tienes rol de Administrador en el Business Manager.",
            "Verifica que el número de teléfono esté confirmado en Meta.",
          ]
        : [],
  };
}

// ─────────────────────────────────────────────
// Rule: BUSINESS_INFO
// Can advance: BM completado + datos obligatorios presentes
// ─────────────────────────────────────────────
function evaluateBusinessInfo(
  step?: StepDTO,
  bmStep?: StepDTO
): StepRuleResult {
  const blockers: StepBlocker[] = [];

  if (step?.status === "COMPLETED") {
    return { canAdvance: true, blockers: [], suggestions: [] };
  }

  // Prerequisite: Business Manager must be completed
  if (!bmStep || bmStep.status !== "COMPLETED") {
    blockers.push({
      code: "PREREQUISITE_BUSINESS_MANAGER",
      message: "El Business Manager debe estar completado antes de continuar.",
      actionable: "Vuelve al paso anterior y completa el Business Manager.",
    });
  }

  // Check required fields in formData
  if (step && bmStep?.status === "COMPLETED") {
    const requiredItems = step.checklistItems.filter((i) => i.required);
    const incompleteItems = requiredItems.filter((i) => !i.completed);

    if (incompleteItems.length > 0) {
      blockers.push({
        code: "BUSINESS_INFO_INCOMPLETE",
        message: `Faltan ${incompleteItems.length} campo(s) de información del negocio.`,
        actionable: "Completa todos los campos requeridos del formulario.",
      });
    }
  }

  return {
    canAdvance: blockers.length === 0,
    blockers,
    nextAction:
      blockers.length > 0
        ? "Completa la información del negocio"
        : "Guardar información del negocio",
    suggestions:
      blockers.length > 0
        ? [
            "Ten a mano el nombre legal completo del negocio tal como aparece en los documentos oficiales.",
            "Asegúrate de incluir un sitio web activo — Meta lo requiere para la verificación.",
            "El número de teléfono debe corresponder al del negocio, no personal.",
          ]
        : [],
  };
}

// ─────────────────────────────────────────────
// Rule: LEGAL_DOCUMENTS
// Can advance: BUSINESS_INFO completado + docs requeridos uploaded/validated
// ─────────────────────────────────────────────
function evaluateLegalDocuments(
  step?: StepDTO,
  businessInfoStep?: StepDTO,
  documents?: DocumentDTO[]
): StepRuleResult {
  const blockers: StepBlocker[] = [];

  if (step?.status === "COMPLETED") {
    return { canAdvance: true, blockers: [], suggestions: [] };
  }

  if (!businessInfoStep || businessInfoStep.status !== "COMPLETED") {
    blockers.push({
      code: "PREREQUISITE_BUSINESS_INFO",
      message:
        "La información del negocio debe estar completa antes de cargar documentos.",
      actionable: "Completa el paso de Información del Negocio primero.",
    });
    return { canAdvance: false, blockers, suggestions: [] };
  }

  const docs = documents ?? [];
  const requiredTypes = [
    "BUSINESS_REGISTRATION",
    "TAX_CERTIFICATE",
    "ID_DOCUMENT",
  ];

  const missingOrRejected = requiredTypes.filter((type) => {
    const doc = docs.find((d) => d.type === type);
    return !doc || doc.status === "MISSING" || doc.status === "REJECTED";
  });

  if (missingOrRejected.length > 0) {
    blockers.push({
      code: "DOCUMENTS_MISSING",
      message: `Faltan ${missingOrRejected.length} documento(s) requerido(s) por cargar.`,
      actionable: "Carga todos los documentos marcados como requeridos.",
    });
  }

  const observedDocs = docs.filter((d) => d.status === "OBSERVED");
  if (observedDocs.length > 0) {
    blockers.push({
      code: "DOCUMENTS_OBSERVED",
      message: `${observedDocs.length} documento(s) tienen observaciones que deben resolverse.`,
      actionable: "Revisa las observaciones y vuelve a cargar los documentos.",
    });
  }

  return {
    canAdvance: blockers.length === 0,
    blockers,
    nextAction:
      blockers.length > 0
        ? "Cargar documentos faltantes"
        : "Confirmar documentos listos",
    suggestions:
      blockers.length > 0
        ? [
            "Los documentos deben ser legibles y estar vigentes.",
            "Formatos aceptados: PDF, JPG, PNG. Tamaño máximo: 10MB.",
            "El registro mercantil no debe tener más de 3 meses de antigüedad.",
          ]
        : [],
  };
}

// ─────────────────────────────────────────────
// Rule: START_VERIFICATION
// Can advance: BUSINESS_INFO + LEGAL_DOCUMENTS completados, docs válidos
// ─────────────────────────────────────────────
function evaluateStartVerification(
  step?: StepDTO,
  businessInfoStep?: StepDTO,
  legalDocsStep?: StepDTO,
  documents?: DocumentDTO[]
): StepRuleResult {
  const blockers: StepBlocker[] = [];

  if (step?.status === "COMPLETED") {
    return { canAdvance: true, blockers: [], suggestions: [] };
  }

  if (!businessInfoStep || businessInfoStep.status !== "COMPLETED") {
    blockers.push({
      code: "PREREQUISITE_BUSINESS_INFO",
      message: "La información del negocio no está completa.",
      actionable: "Completa el paso de Información del Negocio.",
    });
  }

  if (!legalDocsStep || legalDocsStep.status !== "COMPLETED") {
    blockers.push({
      code: "PREREQUISITE_LEGAL_DOCUMENTS",
      message: "Los documentos legales no están completos.",
      actionable: "Completa el paso de Documentos Legales.",
    });
  }

  // Ensure no rejected/observed documents
  const docs = documents ?? [];
  const problemDocs = docs.filter(
    (d) => d.status === "REJECTED" || d.status === "OBSERVED"
  );
  if (problemDocs.length > 0) {
    blockers.push({
      code: "DOCUMENTS_NEED_ATTENTION",
      message: `${problemDocs.length} documento(s) requieren atención antes de iniciar.`,
      actionable: "Resuelve los documentos con observaciones o rechazados.",
    });
  }

  return {
    canAdvance: blockers.length === 0,
    blockers,
    nextAction:
      blockers.length > 0
        ? "Resolver pendientes antes de iniciar verificación"
        : "Iniciar verificación en Meta",
    suggestions:
      blockers.length > 0
        ? ["Verifica que todos los pasos previos estén en verde."]
        : [
            "Una vez iniciada la verificación, recibirás un código de verificación en el número de teléfono registrado.",
            "Ten acceso al email y teléfono del negocio durante el proceso.",
          ],
  };
}

// ─────────────────────────────────────────────
// Rule: VERIFICATION_WIZARD
// Can advance: START_VERIFICATION completado + checklist propio listo
// ─────────────────────────────────────────────
function evaluateVerificationWizard(
  step?: StepDTO,
  startVerificationStep?: StepDTO
): StepRuleResult {
  const blockers: StepBlocker[] = [];

  if (step?.status === "COMPLETED") {
    return { canAdvance: true, blockers: [], suggestions: [] };
  }

  if (!startVerificationStep || startVerificationStep.status !== "COMPLETED") {
    blockers.push({
      code: "PREREQUISITE_START_VERIFICATION",
      message: "Debes iniciar formalmente la verificación primero.",
      actionable: "Completa el paso de Iniciar Verificación.",
    });
    return { canAdvance: false, blockers, suggestions: [] };
  }

  const requiredItems = step?.checklistItems?.filter((i) => i.required) ?? [];
  const incompleteItems = requiredItems.filter((i) => !i.completed);

  if (incompleteItems.length > 0) {
    blockers.push({
      code: "WIZARD_CHECKLIST_INCOMPLETE",
      message: `Faltan ${incompleteItems.length} paso(s) del wizard de verificación.`,
      actionable: "Sigue las instrucciones del wizard en el Business Manager.",
    });
  }

  return {
    canAdvance: blockers.length === 0,
    blockers,
    nextAction:
      blockers.length > 0
        ? "Completar wizard en Business Manager de Meta"
        : "Enviar solicitud a Meta",
    suggestions:
      blockers.length > 0
        ? [
            "Abre business.facebook.com → Configuración → Centro de seguridad → Iniciar verificación.",
            "Sigue cada paso del wizard sin cerrar la ventana.",
            "Si Meta solicita verificación por teléfono, asegúrate de tener acceso a ese número.",
          ]
        : [],
  };
}

// ─────────────────────────────────────────────
// Rule: META_REVIEW
// Advance depends on Meta's response
// ─────────────────────────────────────────────
function evaluateMetaReview(
  step?: StepDTO,
  wizardStep?: StepDTO,
  statusLogs?: VerificationLogDTO[]
): StepRuleResult {
  const blockers: StepBlocker[] = [];

  if (step?.status === "COMPLETED") {
    return { canAdvance: true, blockers: [], suggestions: [] };
  }

  if (!wizardStep || wizardStep.status !== "COMPLETED") {
    blockers.push({
      code: "PREREQUISITE_VERIFICATION_WIZARD",
      message: "El wizard de verificación debe completarse primero.",
      actionable: "Completa el wizard de verificación en Meta.",
    });
    return { canAdvance: false, blockers, suggestions: [] };
  }

  const logs = statusLogs ?? [];
  const latestStatus = logs[logs.length - 1]?.status;

  if (!latestStatus || latestStatus === "SUBMITTED") {
    blockers.push({
      code: "META_REVIEW_PENDING",
      message: "La solicitud está siendo procesada por Meta.",
      actionable: "Espera la respuesta de Meta (1-7 días hábiles).",
    });
  } else if (latestStatus === "UNDER_REVIEW") {
    blockers.push({
      code: "META_UNDER_REVIEW",
      message: "Meta está revisando tu solicitud.",
      actionable: "No envíes solicitudes adicionales. Espera la respuesta.",
    });
  } else if (latestStatus === "REJECTED") {
    blockers.push({
      code: "META_REJECTED",
      message: "Meta rechazó la verificación.",
      actionable:
        "Revisa el motivo del rechazo y corrige la información antes de volver a intentar.",
    });
  } else if (latestStatus === "NEEDS_INFORMATION") {
    blockers.push({
      code: "META_NEEDS_INFO",
      message: "Meta requiere información adicional.",
      actionable:
        "Revisa el Business Manager y proporciona la información solicitada.",
    });
  }

  const canAdvance = latestStatus === "APPROVED";

  return {
    canAdvance,
    blockers,
    nextAction: canAdvance
      ? "Proceder con la asociación OneTalk"
      : "Esperar respuesta de Meta",
    suggestions:
      latestStatus === "REJECTED" || latestStatus === "NEEDS_INFORMATION"
        ? [
            "Accede a tu Business Manager y revisa las notificaciones de Meta.",
            "Verifica que todos los datos del negocio sean exactamente iguales a los documentos legales.",
            "Considera contactar a soporte de Meta si el rechazo no tiene razón clara.",
          ]
        : [
            "Puedes revisar el estado de la verificación en business.facebook.com.",
            "Recibirás una notificación por email cuando Meta tome una decisión.",
          ],
  };
}

// ─────────────────────────────────────────────
// Rule: ONETALK_ASSOCIATION
// Can advance: META_REVIEW completado con status APPROVED
// ─────────────────────────────────────────────
function evaluateOneTalkAssociation(
  step?: StepDTO,
  metaReviewStep?: StepDTO,
  statusLogs?: VerificationLogDTO[]
): StepRuleResult {
  const blockers: StepBlocker[] = [];

  if (step?.status === "COMPLETED") {
    return { canAdvance: true, blockers: [], suggestions: [] };
  }

  if (!metaReviewStep || metaReviewStep.status !== "COMPLETED") {
    blockers.push({
      code: "PREREQUISITE_META_REVIEW",
      message: "La verificación de Meta debe estar aprobada para continuar.",
      actionable: "Espera la aprobación de Meta antes de asociar OneTalk.",
    });
  }

  const logs = statusLogs ?? [];
  const latestStatus = logs[logs.length - 1]?.status;

  if (latestStatus !== "APPROVED" && metaReviewStep?.status === "COMPLETED") {
    blockers.push({
      code: "META_NOT_APPROVED",
      message: "El estado de verificación de Meta no es APPROVED.",
      actionable:
        "Solo puedes asociar OneTalk después de la aprobación de Meta.",
    });
  }

  // Check checklist
  if (step && blockers.length === 0) {
    const requiredItems = step.checklistItems.filter((i) => i.required);
    const incompleteItems = requiredItems.filter((i) => !i.completed);

    if (incompleteItems.length > 0) {
      blockers.push({
        code: "ONETALK_CHECKLIST_INCOMPLETE",
        message: `Faltan ${incompleteItems.length} paso(s) de la configuración OneTalk.`,
        actionable: "Completa la configuración de la bandeja OneTalk.",
      });
    }
  }

  return {
    canAdvance: blockers.length === 0,
    blockers,
    nextAction:
      blockers.length > 0
        ? "Completar configuración OneTalk"
        : "Confirmar asociación",
    suggestions:
      blockers.length > 0
        ? [
            "Asegúrate de que la bandeja OneTalk esté creada y activa.",
            "Verifica que tengas los permisos necesarios en OneTalk.",
          ]
        : [
            "La asociación vincula el número de WhatsApp Business con la bandeja OneTalk.",
            "Una vez asociado, los mensajes entrantes se enrutarán automáticamente.",
          ],
  };
}

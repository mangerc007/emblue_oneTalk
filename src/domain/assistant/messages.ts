import type {
  StepType,
  StepStatus,
  MetaVerificationStatus,
  StepDTO,
  DocumentDTO,
  VerificationLogDTO,
} from "@/domain/types";

// ─────────────────────────────────────────────
// Contextual assistant messages
// The assistant never speaks generically —
// messages are tailored to the current state.
// ─────────────────────────────────────────────

export interface AssistantContext {
  stepType: StepType;
  stepStatus: StepStatus;
  steps: StepDTO[];
  documents: DocumentDTO[];
  statusLogs: VerificationLogDTO[];
  businessName?: string;
}

export interface AssistantResponse {
  greeting: string;
  mainMessage: string;
  tips: string[];
  warnings: string[];
  nextActionLabel?: string;
}

export function getAssistantResponse(ctx: AssistantContext): AssistantResponse {
  const name = ctx.businessName ? `de ${ctx.businessName}` : "";

  switch (ctx.stepType) {
    case "BUSINESS_MANAGER":
      return getBusinessManagerMessage(ctx, name);
    case "BUSINESS_INFO":
      return getBusinessInfoMessage(ctx, name);
    case "LEGAL_DOCUMENTS":
      return getLegalDocumentsMessage(ctx, name);
    case "START_VERIFICATION":
      return getStartVerificationMessage(ctx, name);
    case "VERIFICATION_WIZARD":
      return getVerificationWizardMessage(ctx, name);
    case "META_REVIEW":
      return getMetaReviewMessage(ctx, name);
    case "ONETALK_ASSOCIATION":
      return getOneTalkMessage(ctx, name);
    default:
      return defaultMessage();
  }
}

// ─────────────────────────────────────────────
// Step-specific messages
// ─────────────────────────────────────────────

function getBusinessManagerMessage(
  ctx: AssistantContext,
  name: string
): AssistantResponse {
  if (ctx.stepStatus === "COMPLETED") {
    return {
      greeting: "¡Excelente avance!",
      mainMessage: `El Business Manager ${name} ya está confirmado. Puedes continuar con la información del negocio.`,
      tips: [],
      warnings: [],
      nextActionLabel: "Ir a Información del Negocio",
    };
  }

  return {
    greeting: "Comenzamos aquí.",
    mainMessage:
      "El Business Manager de Meta es el punto de partida. Necesitamos confirmar que está creado y que tienes acceso de Administrador.",
    tips: [
      "Accede a business.facebook.com con la cuenta que administrará el negocio.",
      "El Business Manager debe tener un nombre que coincida con el negocio real.",
      "Asegúrate de que el número de teléfono esté verificado en tu cuenta de Meta.",
    ],
    warnings:
      ctx.stepStatus === "BLOCKED"
        ? [
            "Este paso tiene elementos pendientes. Revisa el checklist y completa todos los ítems requeridos.",
          ]
        : [],
    nextActionLabel: "Confirmar Business Manager",
  };
}

function getBusinessInfoMessage(
  ctx: AssistantContext,
  name: string
): AssistantResponse {
  const bmCompleted = ctx.steps.find((s) => s.type === "BUSINESS_MANAGER")?.status === "COMPLETED";

  if (!bmCompleted) {
    return {
      greeting: "Este paso está bloqueado.",
      mainMessage:
        "Necesitas completar el Business Manager antes de ingresar la información del negocio.",
      tips: [],
      warnings: [
        "Vuelve al paso anterior y confirma que el Business Manager está correctamente configurado.",
      ],
      nextActionLabel: "Ir a Business Manager",
    };
  }

  if (ctx.stepStatus === "COMPLETED") {
    return {
      greeting: "Información del negocio completa.",
      mainMessage: `Los datos ${name} han sido registrados correctamente. El siguiente paso es cargar los documentos legales.`,
      tips: [],
      warnings: [],
      nextActionLabel: "Ir a Documentos Legales",
    };
  }

  return {
    greeting: "Datos del negocio.",
    mainMessage:
      "Meta requiere que los datos del negocio coincidan exactamente con los documentos legales. Cualquier discrepancia puede causar un rechazo.",
    tips: [
      "Usa el nombre legal completo, tal como aparece en el registro mercantil.",
      "El sitio web debe ser activo y estar relacionado con el negocio.",
      "La dirección debe ser la dirección física registrada del negocio.",
    ],
    warnings: [],
    nextActionLabel: "Guardar información",
  };
}

function getLegalDocumentsMessage(
  ctx: AssistantContext,
  name: string
): AssistantResponse {
  const missingDocs = ctx.documents.filter(
    (d) =>
      ["BUSINESS_REGISTRATION", "TAX_CERTIFICATE", "ID_DOCUMENT"].includes(
        d.type
      ) && (d.status === "MISSING" || d.status === "REJECTED")
  );

  const observedDocs = ctx.documents.filter((d) => d.status === "OBSERVED");

  if (ctx.stepStatus === "COMPLETED") {
    return {
      greeting: "Documentos cargados.",
      mainMessage: `Todos los documentos requeridos ${name} están en orden. Puedes iniciar la verificación.`,
      tips: [],
      warnings: [],
      nextActionLabel: "Iniciar verificación",
    };
  }

  const warnings: string[] = [];
  if (observedDocs.length > 0) {
    warnings.push(
      `${observedDocs.length} documento(s) tienen observaciones. Revísalos y vuelve a cargarlos.`
    );
  }
  if (missingDocs.length > 0) {
    warnings.push(
      `Faltan ${missingDocs.length} documento(s) obligatorio(s) por cargar.`
    );
  }

  return {
    greeting: "Documentación legal.",
    mainMessage:
      "Los documentos deben ser legibles, vigentes y coincidir con la información del negocio ingresada. Meta es muy estricto en este punto.",
    tips: [
      "El registro mercantil no debe tener más de 3 meses de antigüedad.",
      "El certificado tributario debe estar vigente.",
      "Los documentos de identidad deben ser del representante legal.",
      "Formatos aceptados: PDF, JPG o PNG. Máximo 10MB por archivo.",
    ],
    warnings,
    nextActionLabel:
      missingDocs.length === 0 ? "Confirmar documentos" : "Cargar documentos",
  };
}

function getStartVerificationMessage(
  ctx: AssistantContext,
  _name: string
): AssistantResponse {
  if (ctx.stepStatus === "COMPLETED") {
    return {
      greeting: "Verificación iniciada.",
      mainMessage:
        "La solicitud de verificación ha sido iniciada en Meta. Ahora debes completar el wizard en el Business Manager.",
      tips: [],
      warnings: [],
      nextActionLabel: "Ir al Wizard de Verificación",
    };
  }

  const allPrerequisitesReady =
    ctx.steps.find((s) => s.type === "BUSINESS_INFO")?.status === "COMPLETED" &&
    ctx.steps.find((s) => s.type === "LEGAL_DOCUMENTS")?.status === "COMPLETED";

  if (!allPrerequisitesReady) {
    return {
      greeting: "Pasos previos pendientes.",
      mainMessage:
        "Antes de iniciar la verificación, asegúrate de que la información del negocio y los documentos estén completos.",
      tips: [],
      warnings: [
        "Completa los pasos anteriores para habilitar el inicio de verificación.",
      ],
      nextActionLabel: undefined,
    };
  }

  return {
    greeting: "¡Todo listo para verificar!",
    mainMessage:
      "Estás a punto de iniciar el proceso oficial de verificación de negocio en Meta. Una vez iniciado, Meta comenzará a revisar la información.",
    tips: [
      "Ten acceso al email y teléfono del negocio para recibir el código de verificación.",
      "El proceso puede tardar entre 1 y 7 días hábiles.",
      "No cierres el wizard una vez iniciado — complétalo en una sola sesión si es posible.",
    ],
    warnings: [],
    nextActionLabel: "Iniciar verificación en Meta",
  };
}

function getVerificationWizardMessage(
  ctx: AssistantContext,
  _name: string
): AssistantResponse {
  if (ctx.stepStatus === "COMPLETED") {
    return {
      greeting: "Wizard completado.",
      mainMessage:
        "Has enviado la solicitud a Meta. Ahora el proceso pasa a la etapa de revisión.",
      tips: [],
      warnings: [],
      nextActionLabel: "Ver estado de revisión",
    };
  }

  return {
    greeting: "Wizard de verificación.",
    mainMessage:
      "En este paso debes abrir el Business Manager de Meta y completar el wizard de verificación paso a paso. Marca cada ítem del checklist a medida que avanzas.",
    tips: [
      "Ve a business.facebook.com → Configuración → Centro de seguridad.",
      "Haz clic en 'Iniciar verificación' y sigue los pasos.",
      "Si Meta solicita un código por SMS, asegúrate de tener el teléfono disponible.",
      "Puedes elegir verificación por dominio web o por documentos.",
    ],
    warnings: [
      "No abandones el wizard a mitad del proceso — puede quedar en estado inconsistente.",
    ],
    nextActionLabel: "Marcar wizard como completado",
  };
}

function getMetaReviewMessage(
  ctx: AssistantContext,
  name: string
): AssistantResponse {
  const latestLog = ctx.statusLogs[ctx.statusLogs.length - 1];
  const status: MetaVerificationStatus | undefined = latestLog?.status;

  switch (status) {
    case "SUBMITTED":
      return {
        greeting: "Solicitud enviada.",
        mainMessage: `La solicitud ${name} fue enviada a Meta y está en cola para revisión.`,
        tips: ["Meta enviará una notificación al email registrado cuando tome una decisión."],
        warnings: [],
        nextActionLabel: undefined,
      };

    case "UNDER_REVIEW":
      return {
        greeting: "En revisión.",
        mainMessage:
          "Meta está evaluando la información enviada. Este proceso puede tardar entre 1 y 7 días hábiles.",
        tips: [
          "No envíes solicitudes adicionales — puede reiniciar el contador.",
          "Revisa el email registrado regularmente.",
        ],
        warnings: [],
        nextActionLabel: undefined,
      };

    case "APPROVED":
      return {
        greeting: "¡Meta aprobó la verificación!",
        mainMessage: `El negocio ${name} ha sido verificado exitosamente por Meta. Ahora puedes asociarlo con OneTalk.`,
        tips: [],
        warnings: [],
        nextActionLabel: "Ir a asociación OneTalk",
      };

    case "REJECTED":
      return {
        greeting: "Verificación rechazada.",
        mainMessage:
          "Meta rechazó la solicitud de verificación. Esto es común — puedes corregir y volver a intentarlo.",
        tips: [
          "Revisa el Business Manager para ver el motivo del rechazo.",
          "Verifica que todos los datos coincidan exactamente con los documentos.",
          "Asegúrate de que el sitio web esté activo y sea del negocio.",
        ],
        warnings: [
          "Debes corregir los problemas antes de volver a intentar la verificación.",
        ],
        nextActionLabel: "Reiniciar verificación",
      };

    case "NEEDS_INFORMATION":
      return {
        greeting: "Meta solicita más información.",
        mainMessage:
          "Meta necesita información adicional para continuar con la verificación.",
        tips: [
          "Accede al Business Manager y sigue las instrucciones de Meta.",
          "Proporciona los documentos o información adicional solicitada.",
        ],
        warnings: [
          "Tienes un plazo limitado para responder. Actúa rápido.",
        ],
        nextActionLabel: "Proporcionar información adicional",
      };

    default:
      return {
        greeting: "Esperando estado de Meta.",
        mainMessage: "La verificación será enviada a Meta cuando completes el wizard.",
        tips: [],
        warnings: [],
        nextActionLabel: undefined,
      };
  }
}

function getOneTalkMessage(
  ctx: AssistantContext,
  name: string
): AssistantResponse {
  if (ctx.stepStatus === "COMPLETED") {
    return {
      greeting: "¡Proceso completado!",
      mainMessage: `El negocio ${name} está verificado y asociado con OneTalk. La activación ha concluido exitosamente.`,
      tips: [],
      warnings: [],
    };
  }

  const metaApproved =
    ctx.statusLogs[ctx.statusLogs.length - 1]?.status === "APPROVED";

  if (!metaApproved) {
    return {
      greeting: "Esperando aprobación de Meta.",
      mainMessage:
        "Este paso se habilitará una vez que Meta apruebe la verificación del negocio.",
      tips: [],
      warnings: ["No puedes asociar OneTalk hasta tener la aprobación de Meta."],
      nextActionLabel: undefined,
    };
  }

  return {
    greeting: "Último paso: asociación OneTalk.",
    mainMessage: `El negocio ${name} está verificado por Meta. Ahora completa la configuración de la bandeja OneTalk para finalizar la activación.`,
    tips: [
      "Selecciona la bandeja OneTalk que recibirá los mensajes de WhatsApp Business.",
      "Verifica que la bandeja esté activa y asignada al equipo correcto.",
      "Una vez asociado, los mensajes se enrutarán automáticamente.",
    ],
    warnings: [],
    nextActionLabel: "Completar asociación",
  };
}

function defaultMessage(): AssistantResponse {
  return {
    greeting: "Estoy aquí para ayudarte.",
    mainMessage: "Selecciona una etapa para ver información detallada.",
    tips: [],
    warnings: [],
  };
}

// ─────────────────────────────────────────────
// System-generated messages (for audit trail)
// ─────────────────────────────────────────────

export function getSystemMessage(
  event: string,
  context: Record<string, string>
): string {
  const messages: Record<string, (ctx: Record<string, string>) => string> = {
    step_completed: (ctx) =>
      `La etapa "${ctx.stepLabel}" fue completada exitosamente.`,
    step_blocked: (ctx) =>
      `La etapa "${ctx.stepLabel}" fue bloqueada: ${ctx.reason}`,
    meta_status_changed: (ctx) =>
      `El estado de verificación de Meta cambió a: ${ctx.status}`,
    document_uploaded: (ctx) =>
      `Se cargó el documento "${ctx.documentName}" (${ctx.documentType}).`,
    document_validated: (ctx) =>
      `El documento "${ctx.documentName}" fue validado correctamente.`,
    case_created: (_ctx) =>
      "El caso de activación fue creado. Comenzamos con la configuración del Business Manager.",
    onetalk_associated: (ctx) =>
      `El negocio fue asociado con la bandeja OneTalk "${ctx.inboxName}". ¡Activación completada!`,
  };

  const fn = messages[event];
  return fn ? fn(context) : `Evento: ${event}`;
}

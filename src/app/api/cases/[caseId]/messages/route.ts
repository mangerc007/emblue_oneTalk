import { NextRequest, NextResponse } from "next/server";
import { addUserMessage, addAssistantMessage } from "@/services/assistant.service";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_LABELS, META_STATUS_LABELS } from "@/domain/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const messages = await prisma.assistantMessage.findMany({
      where: { caseId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ data: messages });
  } catch (error) {
    console.error("[GET /api/cases/[caseId]/messages]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const body = await req.json();

    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json(
        { error: "content es requerido" },
        { status: 400 }
      );
    }

    // Suppress unused import warnings
    void DOCUMENT_LABELS;
    void META_STATUS_LABELS;

    if (body.role === "USER") {
      await addUserMessage(caseId, body.content, body.stepType);

      // Simple rule-based auto-reply (in a real app this could call an LLM)
      const autoReply = generateAutoReply(body.content);
      if (autoReply) {
        await addAssistantMessage(caseId, autoReply, body.stepType);
      }
    } else {
      await addAssistantMessage(caseId, body.content, body.stepType);
    }

    const messages = await prisma.assistantMessage.findMany({
      where: { caseId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: messages }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/cases/[caseId]/messages]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// Simple rule-based auto-replies
function generateAutoReply(userMessage: string): string | null {
  const msg = userMessage.toLowerCase();

  if (msg.includes("cuánto tarda") || msg.includes("cuanto tiempo")) {
    return "El proceso de verificación de Meta generalmente tarda entre 1 y 7 días hábiles. El proceso completo de activación, incluyendo la asociación con OneTalk, puede tomar entre 1 y 2 semanas dependiendo de la velocidad de respuesta de Meta.";
  }

  if (msg.includes("rechaz") || msg.includes("rejected")) {
    return "Si Meta rechazó la verificación, lo más común es que haya una discrepancia entre los datos ingresados y los documentos. Verifica que el nombre legal, dirección y teléfono coincidan exactamente con el registro mercantil.";
  }

  if (msg.includes("documento") || msg.includes("doc")) {
    return "Los documentos deben ser legibles, estar vigentes y en formato PDF, JPG o PNG (máx. 10MB). El registro mercantil debe tener menos de 3 meses de antigüedad.";
  }

  if (msg.includes("business manager") || msg.includes("bm")) {
    return "El Business Manager es la plataforma central de Meta para gestionar activos de negocio. Debes acceder a business.facebook.com con una cuenta de Facebook personal y crear o acceder al Business Manager del negocio.";
  }

  if (msg.includes("onetalk") || msg.includes("bandeja")) {
    return "OneTalk es la plataforma de mensajería que recibirá los mensajes de WhatsApp Business. La asociación solo es posible después de que Meta apruebe la verificación del negocio.";
  }

  return null;
}

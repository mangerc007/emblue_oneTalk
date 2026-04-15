import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateDocumentStatus } from "@/services/document.service";
import {
  createDocumentSchema,
  documentStatusSchema,
} from "@/validations/document.schema";
import { DOCUMENT_LABELS } from "@/domain/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const docs = await prisma.businessDocument.findMany({
      where: { caseId },
      orderBy: { createdAt: "asc" },
    });

    const mapped = docs.map((d) => ({
      ...d,
      label: DOCUMENT_LABELS[d.type as keyof typeof DOCUMENT_LABELS] ?? d.name,
    }));

    return NextResponse.json({ data: mapped });
  } catch (error) {
    console.error("[GET /api/cases/[caseId]/documents]", error);
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
    const parsed = createDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const doc = await prisma.businessDocument.create({
      data: {
        caseId,
        type: parsed.data.type,
        name: parsed.data.name,
        status: parsed.data.status,
        fileUrl: parsed.data.fileUrl || null,
        fileName: parsed.data.fileName || null,
        notes: parsed.data.notes || null,
      },
    });

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/cases/[caseId]/documents]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId: _caseId } = await params;
    const body = await req.json();

    if (!body.documentId) {
      return NextResponse.json(
        { error: "documentId es requerido" },
        { status: 400 }
      );
    }

    const parsed = documentStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await updateDocumentStatus(body.documentId, parsed.data.status, {
      notes: parsed.data.notes || undefined,
      fileUrl: parsed.data.fileUrl || undefined,
      fileName: parsed.data.fileName || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/cases/[caseId]/documents]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

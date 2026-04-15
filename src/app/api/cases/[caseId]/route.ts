import { NextRequest, NextResponse } from "next/server";
import { getCaseById } from "@/services/case.service";
import { prisma } from "@/lib/prisma";
import { businessSchema } from "@/validations/business.schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const data = await getCaseById(caseId);
    if (!data) {
      return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/cases/[caseId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const body = await req.json();

    // Allow updating business info
    if (body.business) {
      const parsed = businessSchema.safeParse(body.business);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Datos de negocio inválidos", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      // Get current case to find businessId
      const currentCase = await prisma.activationCase.findUnique({
        where: { id: caseId },
        select: { businessId: true },
      });

      if (!currentCase) {
        return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
      }

      await prisma.business.update({
        where: { id: currentCase.businessId },
        data: parsed.data,
      });
    }

    const updated = await getCaseById(caseId);
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/cases/[caseId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

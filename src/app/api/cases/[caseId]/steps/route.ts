import { NextRequest, NextResponse } from "next/server";
import { getCaseById } from "@/services/case.service";
import { updateStepStatus, saveStepFormData } from "@/services/step.service";
import { updateStepSchema } from "@/validations/step.schema";
import type { StepType } from "@/domain/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const caseData = await getCaseById(caseId);
    if (!caseData) {
      return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ data: caseData.steps });
  } catch (error) {
    console.error("[GET /api/cases/[caseId]/steps]", error);
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

    if (!body.stepType) {
      return NextResponse.json({ error: "stepType es requerido" }, { status: 400 });
    }

    const parsed = updateStepSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status, formData, blockedReason, notes } = parsed.data;

    if (formData) {
      await saveStepFormData(caseId, body.stepType as StepType, formData);
    }

    if (status) {
      await updateStepStatus(caseId, body.stepType as StepType, status, {
        blockedReason: blockedReason ?? undefined,
        formData,
        notes: notes ?? undefined,
      });
    }

    const updated = await getCaseById(caseId);
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/cases/[caseId]/steps]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

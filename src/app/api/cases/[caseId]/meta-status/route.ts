import { NextRequest, NextResponse } from "next/server";
import { addMetaVerificationStatus } from "@/services/step.service";
import { metaVerificationStatusSchema } from "@/validations/step.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const body = await req.json();

    const parsed = metaVerificationStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await addMetaVerificationStatus(
      caseId,
      parsed.data.status,
      parsed.data.notes
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/cases/[caseId]/meta-status]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { completeOneTalkAssociation } from "@/services/step.service";
import { oneTalkAssociationSchema } from "@/validations/document.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const body = await req.json();

    const parsed = oneTalkAssociationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await completeOneTalkAssociation(
      caseId,
      parsed.data.oneTalkInboxId,
      parsed.data.oneTalkInboxName
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/cases/[caseId]/onetalk]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

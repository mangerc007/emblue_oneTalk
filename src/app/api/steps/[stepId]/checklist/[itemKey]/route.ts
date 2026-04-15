import { NextRequest, NextResponse } from "next/server";
import { updateChecklistItem } from "@/services/step.service";
import { updateChecklistItemSchema } from "@/validations/step.schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ stepId: string; itemKey: string }> }
) {
  try {
    const { stepId, itemKey } = await params;
    const body = await req.json();

    const parsed = updateChecklistItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await updateChecklistItem(stepId, itemKey, parsed.data.completed);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/steps/[stepId]/checklist/[itemKey]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

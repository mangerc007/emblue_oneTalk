import { NextRequest, NextResponse } from "next/server";
import { listCases, createCase } from "@/services/case.service";
import { z } from "zod";

const createCaseSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  country: z.string().optional(),
});

export async function GET() {
  try {
    const cases = await listCases();
    return NextResponse.json({ data: cases });
  } catch (error) {
    console.error("[GET /api/cases]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createCaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const newCase = await createCase(parsed.data);
    return NextResponse.json({ data: newCase }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/cases]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

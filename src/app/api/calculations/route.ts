import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateCalculationSchema = z.object({
  projectId: z.string().min(1),
  type: z.enum(["MAILER_BOX", "RIGID_BOX"]),
  label: z.string().max(200).optional().or(z.literal("")),
  snapshot: z.record(z.unknown()),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const parsed = CreateCalculationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const calculation = await prisma.calculation.create({
      data: {
        projectId: parsed.data.projectId,
        type: parsed.data.type,
        label: parsed.data.label?.trim() || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        snapshot: parsed.data.snapshot as any,
      },
    });

    return NextResponse.json(calculation, { status: 201 });
  } catch (err) {
    console.error("[calculations POST]", err);
    return NextResponse.json({ error: "Failed to save calculation" }, { status: 500 });
  }
}

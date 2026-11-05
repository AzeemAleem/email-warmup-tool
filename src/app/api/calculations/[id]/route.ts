import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UpdateCalculationSchema = z.object({
  projectId: z.string().min(1).optional(),
  label: z.string().trim().min(1, "Estimation name is required").max(200),
  snapshot: z.record(z.unknown()),
});

const projectInclude = {
  project: {
    select: {
      id: true,
      name: true,
      clientId: true,
      client: { select: { id: true, name: true, email: true } },
    },
  },
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAuth();
    const calc = await prisma.calculation.findUnique({
      where: { id: params.id },
      include: projectInclude,
    });
    if (!calc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(calc);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAuth();
    const existing = await prisma.calculation.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = UpdateCalculationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const nextProjectId = parsed.data.projectId ?? existing.projectId;
    if (nextProjectId !== existing.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: nextProjectId },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    const calc = await prisma.calculation.update({
      where: { id: params.id },
      data: {
        projectId: nextProjectId,
        label: parsed.data.label.trim(),
        snapshot: parsed.data.snapshot as Prisma.InputJsonValue,
      },
      include: projectInclude,
    });

    return NextResponse.json(calc);
  } catch (err) {
    console.error("[calculations PATCH]", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAuth();
    const calc = await prisma.calculation.findUnique({ where: { id: params.id } });
    if (!calc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.calculation.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[calculations DELETE]", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

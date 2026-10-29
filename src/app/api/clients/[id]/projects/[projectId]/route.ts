import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ON_HOLD", "CANCELLED"]).optional(),
  dealType: z.enum(["QUOTATION", "WON"]).optional(),
  trackingId: z.string().max(100).optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  deadline: z.string().optional().or(z.literal("")),
  shippingAddress: z.string().max(2000).optional().or(z.literal("")),
  requirements: z.array(z.string()).optional(),
  notes: z.string().max(3000).optional().or(z.literal("")),
});

async function findProject(clientId: string, projectId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, clientId },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; projectId: string } },
) {
  try {
    await requireAuth();
    const project = await findProject(params.id, params.projectId);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; projectId: string } },
) {
  try {
    await requireAuth();
    const existing = await findProject(params.id, params.projectId);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = UpdateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      name,
      status,
      dealType,
      trackingId,
      startDate,
      deadline,
      shippingAddress,
      requirements,
      notes,
    } = parsed.data;
    const updated = await prisma.project.update({
      where: { id: params.projectId },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(dealType !== undefined ? { dealType } : {}),
        ...(trackingId !== undefined ? { trackingId: trackingId.trim() || null } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
        ...(shippingAddress !== undefined
          ? { shippingAddress: shippingAddress.trim() || null }
          : {}),
        ...(requirements !== undefined
          ? { requirements: requirements.filter((r) => r.trim().length > 0) }
          : {}),
        ...(notes !== undefined ? { notes: notes.trim() || null } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[projects PATCH]", err);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; projectId: string } },
) {
  try {
    await requireAuth();
    const existing = await findProject(params.id, params.projectId);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.project.delete({ where: { id: params.projectId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[projects DELETE]", err);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}

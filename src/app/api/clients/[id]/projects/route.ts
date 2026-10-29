import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(300),
  status: z.enum(["ACTIVE", "COMPLETED", "ON_HOLD", "CANCELLED"]).default("ACTIVE"),
  dealType: z.enum(["QUOTATION", "WON"]).default("QUOTATION"),
  trackingId: z.string().max(100).optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  deadline: z.string().optional().or(z.literal("")),
  shippingAddress: z.string().max(2000).optional().or(z.literal("")),
  requirements: z.array(z.string().min(1)).default([]),
  notes: z.string().max(3000).optional().or(z.literal("")),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAuth();
    const client = await prisma.client.findUnique({ where: { id: params.id } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    const projects = await prisma.project.findMany({
      where: { clientId: params.id },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAuth();
    const client = await prisma.client.findUnique({ where: { id: params.id } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = CreateProjectSchema.safeParse(body);
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
    const project = await prisma.project.create({
      data: {
        clientId: params.id,
        name: name.trim(),
        status,
        dealType,
        trackingId: trackingId?.trim() || null,
        startDate: startDate ? new Date(startDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        shippingAddress: shippingAddress?.trim() || null,
        requirements: requirements.filter((r) => r.trim().length > 0),
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("[projects POST]", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { z } from "zod";
import {
  FOLLOW_UP_MAX_STEP,
  computeNextFollowUpOn,
} from "@/lib/followUp/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    await requireAuth();
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (project.followUpStatus === "DEAD") {
      return NextResponse.json(
        { error: "Project is in dead zone — no more follow-ups" },
        { status: 400 },
      );
    }
    if (project.followUpStatus === "PAUSED") {
      return NextResponse.json(
        { error: "Follow-ups are paused — resume first" },
        { status: 400 },
      );
    }
    if (project.followUpStep >= FOLLOW_UP_MAX_STEP) {
      return NextResponse.json(
        { error: "All follow-ups already logged" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const nextStep = project.followUpStep + 1;
    const doneAt = new Date();
    const notes = parsed.data.notes?.trim() || null;

    const nextFollowUpOn =
      nextStep >= FOLLOW_UP_MAX_STEP
        ? null
        : computeNextFollowUpOn({
            stepCompleted: nextStep,
            lastFollowUpAt: doneAt,
            createdAt: project.createdAt,
          });

    const followUpStatus =
      nextStep >= FOLLOW_UP_MAX_STEP ? "DEAD" : "ACTIVE";

    const [log, updated] = await prisma.$transaction([
      prisma.projectFollowUp.create({
        data: {
          projectId: project.id,
          step: nextStep,
          doneAt,
          notes,
        },
      }),
      prisma.project.update({
        where: { id: project.id },
        data: {
          followUpStep: nextStep,
          lastFollowUpAt: doneAt,
          nextFollowUpOn,
          followUpStatus,
        },
        include: {
          client: { select: { id: true, name: true, email: true, phone: true } },
        },
      }),
    ]);

    return NextResponse.json({ log, project: updated });
  } catch (err) {
    console.error("[follow-ups log]", err);
    return NextResponse.json({ error: "Failed to log follow-up" }, { status: 500 });
  }
}

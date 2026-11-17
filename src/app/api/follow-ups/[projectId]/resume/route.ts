import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import {
  FOLLOW_UP_MAX_STEP,
  computeNextFollowUpOn,
} from "@/lib/followUp/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
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
        { error: "Project is in dead zone — cannot resume" },
        { status: 400 },
      );
    }
    if (project.followUpStep >= FOLLOW_UP_MAX_STEP) {
      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { followUpStatus: "DEAD", nextFollowUpOn: null },
        include: {
          client: { select: { id: true, name: true, email: true, phone: true } },
        },
      });
      return NextResponse.json({ project: updated });
    }

    const nextFollowUpOn = computeNextFollowUpOn({
      stepCompleted: project.followUpStep,
      lastFollowUpAt: project.lastFollowUpAt,
      createdAt: project.createdAt,
    });

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        followUpStatus: "ACTIVE",
        nextFollowUpOn,
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    return NextResponse.json({ project: updated });
  } catch (err) {
    console.error("[follow-ups resume]", err);
    return NextResponse.json({ error: "Failed to resume follow-ups" }, { status: 500 });
  }
}

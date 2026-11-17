import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

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
        { error: "Project is in dead zone" },
        { status: 400 },
      );
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        followUpStatus: "PAUSED",
        nextFollowUpOn: null,
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    return NextResponse.json({ project: updated });
  } catch (err) {
    console.error("[follow-ups respond]", err);
    return NextResponse.json({ error: "Failed to pause follow-ups" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuth();
    const projects = await prisma.project.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: {
        client: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

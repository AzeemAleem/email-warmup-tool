import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = 50;
    const skip = (page - 1) * pageSize;
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { sender: { email: { contains: search, mode: "insensitive" } } },
        { receiver: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.warmupEvent.findMany({
        where,
        include: {
          sender: { select: { email: true, role: true } },
          receiver: { select: { email: true, role: true } },
        },
        orderBy: { scheduledFor: "desc" },
        take: pageSize,
        skip,
      }),
      prisma.warmupEvent.count({ where }),
    ]);

    return NextResponse.json({ events, total, page, totalPages: Math.ceil(total / pageSize) });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

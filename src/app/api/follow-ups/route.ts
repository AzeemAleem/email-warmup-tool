import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { endOfThisMonday, startOfNextTuesday } from "@/lib/followUp/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Bucket = "due" | "upcoming" | "paused" | "dead";

function projectSelect() {
  return {
    id: true,
    name: true,
    status: true,
    dealType: true,
    trackingId: true,
    createdAt: true,
    followUpStatus: true,
    followUpStep: true,
    nextFollowUpOn: true,
    lastFollowUpAt: true,
    client: {
      select: { id: true, name: true, email: true, phone: true },
    },
  } as const;
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const bucket = (req.nextUrl.searchParams.get("bucket") || "due") as Bucket;
    const mondayEnd = endOfThisMonday();
    const afterMonday = startOfNextTuesday();

    let where;
    let orderBy:
      | { nextFollowUpOn: "asc" | "desc" }
      | { lastFollowUpAt: "asc" | "desc" }
      | { updatedAt: "asc" | "desc" } = { nextFollowUpOn: "asc" };

    switch (bucket) {
      case "due":
        // Due this Monday + overdue (ACTIVE with next due on/before this Monday)
        where = {
          followUpStatus: "ACTIVE",
          nextFollowUpOn: { lte: mondayEnd },
          status: { notIn: ["CANCELLED", "COMPLETED"] },
        };
        orderBy = { nextFollowUpOn: "asc" };
        break;
      case "upcoming":
        where = {
          followUpStatus: "ACTIVE",
          nextFollowUpOn: { gte: afterMonday },
          status: { notIn: ["CANCELLED", "COMPLETED"] },
        };
        orderBy = { nextFollowUpOn: "asc" };
        break;
      case "paused":
        where = { followUpStatus: "PAUSED" };
        orderBy = { lastFollowUpAt: "desc" };
        break;
      case "dead":
        where = { followUpStatus: "DEAD" };
        orderBy = { lastFollowUpAt: "desc" };
        break;
      default:
        return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy,
      select: projectSelect(),
    });

    return NextResponse.json({
      bucket,
      mondayEnd: mondayEnd.toISOString(),
      projects,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { subDays, startOfDay, endOfDay } from "date-fns";

export async function GET() {
  try {
    await requireAuth();

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const fourteenDaysAgo = subDays(now, 14);

    const [totalAccounts, oldAccounts, newAccounts, activeAccounts, errorAccounts] =
      await Promise.all([
        prisma.account.count({ where: { status: { not: "REMOVED" } } }),
        prisma.account.count({ where: { role: "OLD", status: { not: "REMOVED" } } }),
        prisma.account.count({ where: { role: "NEW", status: { not: "REMOVED" } } }),
        prisma.account.count({ where: { status: "ACTIVE" } }),
        prisma.account.count({ where: { status: "ERROR" } }),
      ]);

    const todayStats = await prisma.warmupEvent.groupBy({
      by: ["status"],
      where: { scheduledFor: { gte: todayStart, lte: todayEnd } },
      _count: true,
    });

    const chartEvents = await prisma.warmupEvent.findMany({
      where: { scheduledFor: { gte: fourteenDaysAgo } },
      select: { scheduledFor: true, status: true },
    });

    const todayVolume = await prisma.account.aggregate({
      where: { status: "ACTIVE" },
      _sum: { dailyTargetVolume: true },
    });

    return NextResponse.json({
      totalAccounts,
      oldAccounts,
      newAccounts,
      activeAccounts,
      errorAccounts,
      todayStats,
      chartEvents,
      todayVolumePlan: todayVolume._sum.dailyTargetVolume || 0,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

import { prisma } from "@/lib/db";
import { StatCard } from "@/components/ui/Card";
import { WarmupChart } from "./WarmupChart";
import { PoolHealth } from "./PoolHealth";
import { subDays, startOfDay, endOfDay } from "date-fns";

async function getDashboardData() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const fourteenDaysAgo = subDays(now, 14);

  const [
    totalAccounts,
    oldAccounts,
    newAccounts,
    activeAccounts,
    errorAccounts,
    todayStats,
    chartData,
    config,
  ] = await Promise.all([
    prisma.account.count({ where: { status: { not: "REMOVED" } } }),
    prisma.account.count({ where: { role: "OLD", status: { not: "REMOVED" } } }),
    prisma.account.count({ where: { role: "NEW", status: { not: "REMOVED" } } }),
    prisma.account.count({ where: { status: "ACTIVE" } }),
    prisma.account.count({ where: { status: "ERROR" } }),
    prisma.warmupEvent.groupBy({
      by: ["status"],
      where: {
        scheduledFor: { gte: todayStart, lte: todayEnd },
      },
      _count: true,
    }),
    // Last 14 days chart data
    prisma.warmupEvent.findMany({
      where: { scheduledFor: { gte: fourteenDaysAgo } },
      select: { scheduledFor: true, status: true },
    }),
    prisma.warmupConfig.findUnique({ where: { id: "singleton" } }),
  ]);

  const todayVolumePlan = await prisma.account.aggregate({
    where: { status: "ACTIVE" },
    _sum: { dailyTargetVolume: true },
  });

  return {
    totalAccounts,
    oldAccounts,
    newAccounts,
    activeAccounts,
    errorAccounts,
    todayStats,
    chartData,
    config,
    todayVolumePlan: todayVolumePlan._sum.dailyTargetVolume || 0,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const todaySent = data.todayStats.find((s) => s.status === "SENT")?._count || 0;
  const todayOpened = data.todayStats.find((s) => s.status === "OPENED")?._count || 0;
  const todayReplied = data.todayStats.find((s) => s.status === "REPLIED")?._count || 0;
  const todayRescued = data.todayStats.find((s) => s.status === "RESCUED_FROM_SPAM")?._count || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">
          Pool health overview and warmup activity
        </p>
      </div>

      {/* Pool health cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Accounts"
          value={data.totalAccounts}
          sub={`${data.oldAccounts} old · ${data.newAccounts} new`}
          color="indigo"
        />
        <StatCard
          label="Active"
          value={data.activeAccounts}
          sub={`${data.errorAccounts} in error`}
          color={data.errorAccounts > 0 ? "red" : "green"}
        />
        <StatCard
          label="Today's Plan"
          value={data.todayVolumePlan}
          sub="total sends planned"
          color="blue"
        />
        <StatCard
          label="Sent Today"
          value={todaySent}
          sub={`${todayOpened} opened · ${todayReplied} replied`}
          color="green"
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Opened"
          value={todayOpened}
          sub="today"
          color="blue"
        />
        <StatCard
          label="Replied"
          value={todayReplied}
          sub="today"
          color="green"
        />
        <StatCard
          label="Rescued from Spam"
          value={todayRescued}
          sub="today"
          color="amber"
        />
        <StatCard
          label="AI Provider"
          value={data.config?.aiProvider?.toUpperCase() || "—"}
          sub={`ramp: ${data.config?.rampUpDays || 28} days`}
          color="indigo"
        />
      </div>

      {/* Chart */}
      <WarmupChart events={data.chartData} />

      {/* Pool health table */}
      <PoolHealth />
    </div>
  );
}

import { prisma } from "@/lib/db";
import { StatCard, Card } from "@/components/ui/Card";
import { WarmupChart } from "./WarmupChart";
import { PoolHealth } from "./PoolHealth";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { formatGapHours, resolveSafetyLimits } from "@/lib/safety";

export const dynamic = "force-dynamic";

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
  const safety = resolveSafetyLimits(data.config);

  const todaySent = data.todayStats.find((s) => s.status === "SENT")?._count || 0;
  const todayOpened = data.todayStats.find((s) => s.status === "OPENED")?._count || 0;
  const todayReplied = data.todayStats.find((s) => s.status === "REPLIED")?._count || 0;
  const todayRescued =
    data.todayStats.find((s) => s.status === "RESCUED_FROM_SPAM")?._count || 0;

  const oldPerDayCap =
    data.newAccounts > 0 && data.oldAccounts > 0
      ? Math.min(
          safety.maxOldDailySendsWhenFewNew,
          Math.floor(
            (data.newAccounts * safety.maxInboundPerReceiverPerDay) /
              data.oldAccounts
          )
        )
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">
          Pool health and live deliverability limits (from Config)
        </p>
      </div>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <h2 className="text-sm font-semibold text-amber-200 mb-3">
          Live safety limits
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Max inbound / inbox / day</p>
            <p className="text-lg font-semibold text-white">
              {safety.maxInboundPerReceiverPerDay}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Max inbound / hour</p>
            <p className="text-lg font-semibold text-white">
              {safety.maxInboundPerReceiverPerHour}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Min gap same inbox</p>
            <p className="text-lg font-semibold text-white">
              {formatGapHours(safety.minGapBetweenInboundMs)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Sends / 5-min tick</p>
            <p className="text-lg font-semibold text-white">
              {safety.maxSendsPerTick}
              <span className="text-xs text-gray-500 font-normal">
                {" "}
                (same recv ≤{safety.maxSendsToSameReceiverPerTick})
              </span>
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          With {data.oldAccounts} OLD + {data.newAccounts} NEW → each OLD ≈{" "}
          <span className="text-gray-300">{oldPerDayCap}</span> send(s)/day to
          the NEW pool. Edit on the Config page.
        </p>
      </Card>

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
          sub="sum of account daily targets"
          color="blue"
        />
        <StatCard
          label="Sent Today"
          value={todaySent}
          sub={`${todayOpened} opened · ${todayReplied} replied`}
          color="green"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Opened" value={todayOpened} sub="today" color="blue" />
        <StatCard
          label="Replied"
          value={todayReplied}
          sub="same-thread replies"
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

      <WarmupChart events={data.chartData} />
      <PoolHealth />
    </div>
  );
}

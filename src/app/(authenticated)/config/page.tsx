import { prisma } from "@/lib/db";
import { ConfigForm } from "./ConfigForm";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const config = await prisma.warmupConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      startVolumePerDay: 1,
      maxVolumePerDay: 10,
      maxInboundPerReceiverPerDay: 3,
      maxInboundPerReceiverPerHour: 1,
      minGapBetweenInboundMs: 7200000,
      maxSendsPerTick: 1,
      maxSendsToSameReceiverPerTick: 1,
      maxOldDailySendsWhenFewNew: 3,
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Configuration</h1>
        <p className="text-sm text-gray-400 mt-1">
          All values here are stored in the database and used by the Contabo
          worker. Safety limits at the top are the real Google-protection rules.
        </p>
      </div>

      <ConfigForm config={config} />
    </div>
  );
}

import { prisma } from "@/lib/db";
import { ConfigForm } from "./ConfigForm";

export default async function ConfigPage() {
  const config = await prisma.warmupConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Configuration</h1>
        <p className="text-sm text-gray-400 mt-1">
          Adjust warmup parameters. Changes take effect on the next scheduler cycle.
        </p>
      </div>

      <ConfigForm config={config} />
    </div>
  );
}

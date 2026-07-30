import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";

export async function PoolHealth() {
  const accounts = await prisma.account.findMany({
    where: { status: { not: "REMOVED" } },
    orderBy: [{ role: "asc" }, { status: "asc" }],
    take: 20,
  });

  return (
    <Card>
      <h2 className="text-sm font-semibold text-white mb-4">Pool Health</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="pb-2 pr-4 font-medium">Email</th>
              <th className="pb-2 pr-4 font-medium">Role</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Trust</th>
              <th className="pb-2 pr-4 font-medium">Target/day</th>
              <th className="pb-2 font-medium">Sent today</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {accounts.map((acc) => (
              <tr key={acc.id} className="hover:bg-gray-800/30 transition-colors">
                <td className="py-2 pr-4 text-gray-300 font-mono text-xs">{acc.email}</td>
                <td className="py-2 pr-4">
                  <span
                    className={`text-xs font-medium ${
                      acc.role === "OLD" ? "text-indigo-400" : "text-amber-400"
                    }`}
                  >
                    {acc.role}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <StatusBadge status={acc.status} />
                </td>
                <td className="py-2 pr-4 text-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full max-w-16">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${(acc.trustWeight * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {(acc.trustWeight * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="py-2 pr-4 text-gray-300">{acc.dailyTargetVolume}</td>
                <td className="py-2 text-gray-300">{acc.sentToday}</td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No accounts yet. Add accounts to start warming up.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

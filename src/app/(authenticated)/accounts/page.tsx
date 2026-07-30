import { prisma } from "@/lib/db";
import { AccountsTable } from "./AccountsTable";
import { AddAccountButton } from "./AddAccountButton";

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    where: { status: { not: "REMOVED" } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Accounts</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your warmup account pool
          </p>
        </div>
        <AddAccountButton />
      </div>

      <AccountsTable accounts={accounts} />
    </div>
  );
}

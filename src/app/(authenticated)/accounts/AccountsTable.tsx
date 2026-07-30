"use client";

import { useState } from "react";
import { Account } from "@prisma/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface AccountsTableProps {
  accounts: Account[];
}

export function AccountsTable({ accounts }: AccountsTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(accountId: string, action: "pause" | "resume" | "remove") {
    setLoading(`${accountId}-${action}`);
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Request failed");
      router.refresh();
    } catch (err) {
      alert("Action failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide bg-gray-900/50">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Display Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Trust Weight</th>
              <th className="px-4 py-3 font-medium">Target/day</th>
              <th className="px-4 py-3 font-medium">Sent Today</th>
              <th className="px-4 py-3 font-medium">Last Error</th>
              <th className="px-4 py-3 font-medium">Added</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {accounts.map((acc) => (
              <tr key={acc.id} className="hover:bg-gray-800/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-300">{acc.email}</td>
                <td className="px-4 py-3 text-gray-400">{acc.displayName || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-semibold ${
                      acc.role === "OLD" ? "text-indigo-400" : "text-amber-400"
                    }`}
                  >
                    {acc.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={acc.status} />
                </td>
                <td className="px-4 py-3 text-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-gray-800 rounded-full">
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
                <td className="px-4 py-3 text-gray-300">{acc.dailyTargetVolume}</td>
                <td className="px-4 py-3 text-gray-300">{acc.sentToday}</td>
                <td className="px-4 py-3 text-red-400 text-xs max-w-48 truncate">
                  {acc.lastError || "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {format(new Date(acc.createdAt), "MMM d, yyyy")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {acc.status === "ACTIVE" || acc.status === "ERROR" ? (
                      <button
                        onClick={() => handleAction(acc.id, "pause")}
                        disabled={loading === `${acc.id}-pause`}
                        className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 disabled:opacity-50 transition-colors"
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(acc.id, "resume")}
                        disabled={loading === `${acc.id}-resume`}
                        className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 disabled:opacity-50 transition-colors"
                      >
                        Resume
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${acc.email} from warmup pool?`)) {
                          handleAction(acc.id, "remove");
                        }
                      }}
                      disabled={loading === `${acc.id}-remove`}
                      className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 disabled:opacity-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                  No accounts yet. Click "Add Account" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { format } from "date-fns";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useCallback } from "react";

const STATUS_OPTIONS = [
  "ALL",
  "QUEUED",
  "SENT",
  "OPENED",
  "REPLIED",
  "RESCUED_FROM_SPAM",
  "FAILED",
];

interface EventRow {
  id: string;
  subject: string;
  status: string;
  scheduledFor: Date;
  sentAt: Date | null;
  openedAt: Date | null;
  repliedAt: Date | null;
  landedInSpam: boolean;
  rescuedAt: Date | null;
  sender: { email: string; role: string };
  receiver: { email: string; role: string };
}

interface EventsTableProps {
  events: EventRow[];
  total: number;
  page: number;
  totalPages: number;
  currentStatus: string;
  currentSearch: string;
}

export function EventsTable({
  events,
  total,
  page,
  totalPages,
  currentStatus,
  currentSearch,
}: EventsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            defaultValue={currentSearch}
            onChange={(e) => {
              const v = e.target.value;
              const debounce = setTimeout(() => updateParam("search", v), 400);
              return () => clearTimeout(debounce);
            }}
            placeholder="Search subject, sender, receiver..."
            className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-64"
          />
        </div>

        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => updateParam("status", s === "ALL" ? "" : s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentStatus === s || (s === "ALL" && currentStatus === "ALL")
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-gray-700"
              }`}
            >
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide bg-gray-900/50">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Sent</th>
                <th className="px-4 py-3 font-medium">Opened</th>
                <th className="px-4 py-3 font-medium">Spam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-2.5 text-gray-300 max-w-48 truncate">{event.subject}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-400">
                    {event.sender.email}
                    <span className={`ml-1 text-xs ${event.sender.role === "OLD" ? "text-indigo-500" : "text-amber-500"}`}>
                      ({event.sender.role})
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-400">
                    {event.receiver.email}
                    <span className={`ml-1 text-xs ${event.receiver.role === "OLD" ? "text-indigo-500" : "text-amber-500"}`}>
                      ({event.receiver.role})
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                    {format(new Date(event.scheduledFor), "MMM d, HH:mm")}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                    {event.sentAt ? format(new Date(event.sentAt), "HH:mm:ss") : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                    {event.openedAt ? format(new Date(event.openedAt), "HH:mm:ss") : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {event.landedInSpam ? (
                      <span className="text-xs text-orange-400">
                        {event.rescuedAt ? "✓ Rescued" : "In spam"}
                      </span>
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    No events found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} · {total.toLocaleString()} events
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => updateParam("page", String(page - 1))}
                className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 rounded border border-gray-700 disabled:opacity-50 hover:bg-gray-700 transition-colors"
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => updateParam("page", String(page + 1))}
                className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 rounded border border-gray-700 disabled:opacity-50 hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

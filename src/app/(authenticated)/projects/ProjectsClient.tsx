"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  FolderOpenIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { DealTypeBadge } from "@/components/project/DealTypeBadge";

export interface ProjectListItem {
  id: string;
  clientId: string;
  name: string;
  status: string;
  dealType: string;
  trackingId: string | null;
  startDate: string | null;
  deadline: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    email: string | null;
  };
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const DEAL_OPTIONS = [
  { value: "ALL", label: "All deal types" },
  { value: "WON", label: "Won / Confirmed" },
  { value: "QUOTATION", label: "Quotation only" },
] as const;

const STATUS_META: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Active",
    className: "text-green-400 bg-green-900/30 border-green-700/50",
  },
  COMPLETED: {
    label: "Completed",
    className: "text-blue-400 bg-blue-900/30 border-blue-700/50",
  },
  ON_HOLD: {
    label: "On hold",
    className: "text-yellow-400 bg-yellow-900/30 border-yellow-700/50",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "text-gray-500 bg-gray-800/40 border-gray-700/50",
  },
};

/** WON first, then ACTIVE, then by updatedAt desc */
function sortProjects(list: ProjectListItem[]) {
  return [...list].sort((a, b) => {
    const aWon = a.dealType === "WON" ? 0 : 1;
    const bWon = b.dealType === "WON" ? 0 : 1;
    if (aWon !== bWon) return aWon - bWon;
    const aActive = a.status === "ACTIVE" ? 0 : 1;
    const bActive = b.status === "ACTIVE" ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProjectsClient({ initial }: { initial: ProjectListItem[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dealFilter, setDealFilter] = useState<string>("ALL");
  const [clientFilter, setClientFilter] = useState<string>("ALL");

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of initial) {
      map.set(p.client.id, p.client.name);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [initial]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = initial.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (dealFilter !== "ALL" && (p.dealType || "QUOTATION") !== dealFilter)
        return false;
      if (clientFilter !== "ALL" && p.clientId !== clientFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.client.name.toLowerCase().includes(q) ||
        (p.trackingId?.toLowerCase().includes(q) ?? false) ||
        (p.notes?.toLowerCase().includes(q) ?? false)
      );
    });
    return sortProjects(list);
  }, [initial, search, statusFilter, dealFilter, clientFilter]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Projects</h1>
        <p className="text-sm text-gray-400 mt-1">
          All projects across clients. Active and recently updated first.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search project, client, tracking ID…"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40"
          />
        </div>

        <div className="min-w-[160px]">
          <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            Client
          </label>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40"
          >
            <option value="ALL">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[140px]">
          <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[160px]">
          <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            Deal type
          </label>
          <select
            value={dealFilter}
            onChange={(e) => setDealFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40"
          >
            {DEAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-gray-700">
          <FolderOpenIcon className="h-10 w-10 text-gray-700 mb-3" />
          <p className="text-sm font-medium text-gray-400">
            {initial.length === 0
              ? "No projects yet."
              : "No projects match your filters."}
          </p>
          {initial.length === 0 && (
            <p className="text-xs text-gray-600 mt-1">
              Create a client, then add projects from the client page.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900/80 text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-700">
                  <th className="text-left font-medium px-4 py-3">Project</th>
                  <th className="text-left font-medium px-4 py-3">Client</th>
                  <th className="text-left font-medium px-4 py-3">Deal</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-left font-medium px-4 py-3 hidden md:table-cell">
                    Deadline
                  </th>
                  <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const meta = STATUS_META[p.status] ?? STATUS_META.ACTIVE;
                  const overdue =
                    p.deadline &&
                    new Date(p.deadline) < new Date() &&
                    p.status !== "COMPLETED";
                  return (
                    <tr
                      key={p.id}
                      onClick={() =>
                        router.push(`/clients/${p.clientId}/projects/${p.id}`)
                      }
                      className={clsx(
                        "border-b border-gray-800/80 last:border-0 cursor-pointer transition-colors hover:bg-gray-800/50",
                        i % 2 === 1 && "bg-gray-900/30",
                      )}
                    >
                      <td className="px-4 py-3 min-w-0">
                        <p className="font-medium text-white truncate">
                          {p.name}
                        </p>
                        {p.trackingId && (
                          <p className="text-[11px] font-mono text-pacify-gold/80 mt-0.5">
                            {p.trackingId}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/clients/${p.clientId}`);
                          }}
                          className="inline-flex items-center gap-1.5 text-gray-300 hover:text-pacify-gold transition-colors"
                        >
                          <BuildingOffice2Icon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                          <span className="truncate max-w-[160px]">
                            {p.client.name}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <DealTypeBadge dealType={p.dealType || "QUOTATION"} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            "inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border",
                            meta.className,
                          )}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs">
                        {p.deadline ? (
                          <span
                            className={clsx(
                              overdue ? "text-red-400 font-medium" : "text-gray-400",
                            )}
                          >
                            {fmtDate(p.deadline)}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500 whitespace-nowrap">
                        {fmtDate(p.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {initial.length > 0 && (
        <p className="text-xs text-gray-600">
          Showing {filtered.length} of {initial.length} project
          {initial.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

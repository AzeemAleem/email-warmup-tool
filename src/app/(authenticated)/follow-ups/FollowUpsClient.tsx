"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DealTypeBadge } from "@/components/project/DealTypeBadge";
import {
  FollowUpControls,
  type FollowUpProjectFields,
} from "@/components/project/FollowUpControls";
import {
  endOfThisMonday,
  startOfNextTuesday,
} from "@/lib/followUp/schedule";
import { clsx } from "clsx";

type Bucket = "due" | "upcoming" | "paused" | "dead";

type FollowUpRow = FollowUpProjectFields & {
  name: string;
  status: string;
  dealType: string;
  trackingId: string | null;
  createdAt: string;
  client: { id: string; name: string; email: string | null; phone: string | null };
};

const TABS: { id: Bucket; label: string }[] = [
  { id: "due", label: "Due this Monday" },
  { id: "upcoming", label: "Upcoming" },
  { id: "paused", label: "Paused" },
  { id: "dead", label: "Dead zone" },
];

function fmtShort(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
}

function toIso(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function belongsInBucket(fields: FollowUpProjectFields, bucket: Bucket): boolean {
  const status = fields.followUpStatus;
  const next = fields.nextFollowUpOn ? new Date(fields.nextFollowUpOn) : null;
  const mondayEnd = endOfThisMonday();
  const afterMonday = startOfNextTuesday();

  if (bucket === "paused") return status === "PAUSED";
  if (bucket === "dead") return status === "DEAD";
  if (status !== "ACTIVE" || !next) return false;
  if (bucket === "due") return next.getTime() <= mondayEnd.getTime();
  if (bucket === "upcoming") return next.getTime() >= afterMonday.getTime();
  return false;
}

export function FollowUpsClient() {
  const [bucket, setBucket] = useState<Bucket>("due");
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (b: Bucket) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/follow-ups?bucket=${b}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as { projects: FollowUpRow[] };
      setRows(data.projects ?? []);
    } catch {
      setError("Could not load follow-ups.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(bucket);
  }, [bucket, load]);

  /** Update in place — no full-list reload / loading flash */
  function patchRow(id: string, next: FollowUpProjectFields) {
    const normalized: FollowUpProjectFields = {
      id: next.id,
      followUpStatus: next.followUpStatus,
      followUpStep: next.followUpStep,
      nextFollowUpOn: toIso(next.nextFollowUpOn),
      lastFollowUpAt: toIso(next.lastFollowUpAt),
    };
    setRows((prev) => {
      if (!belongsInBucket(normalized, bucket)) {
        return prev.filter((r) => r.id !== id);
      }
      return prev.map((r) => (r.id === id ? { ...r, ...normalized } : r));
    });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Follow-ups</h1>
        <p className="text-sm text-gray-400 mt-1">
          Monday client outreach by project. Mark each contact, pause when they
          respond, or resume later. After 6 unanswered follow-ups the project
          moves to the dead zone.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-800 pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setBucket(t.id)}
            className={clsx(
              "px-3 py-2 text-sm font-medium rounded-t-lg transition-colors",
              bucket === t.id
                ? "bg-gray-800 text-pacify-gold border border-b-0 border-gray-700"
                : "text-gray-400 hover:text-gray-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-8">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-400 py-8">{error}</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 px-6 py-12 text-center">
          <p className="text-sm text-gray-400">Nothing in this list.</p>
          {bucket === "due" && (
            <p className="text-xs text-gray-600 mt-2">
              Projects due on or before this Monday will appear here.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-gray-700 bg-surface p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/clients/${row.client.id}/projects/${row.id}`}
                      className="text-sm font-semibold text-foreground hover:text-pacify-gold truncate"
                    >
                      {row.name}
                    </Link>
                    <DealTypeBadge dealType={row.dealType} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    <Link
                      href={`/clients/${row.client.id}`}
                      className="text-gray-400 hover:text-pacify-gold"
                    >
                      {row.client.name}
                    </Link>
                    {row.client.email && (
                      <span className="text-gray-600"> · {row.client.email}</span>
                    )}
                    {row.trackingId && (
                      <span className="text-gray-600"> · {row.trackingId}</span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Created {fmtShort(row.createdAt)} · Project {row.status}
                  </p>
                </div>
              </div>
              <FollowUpControls
                project={row}
                compact
                onUpdated={(next) => patchRow(row.id, next)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

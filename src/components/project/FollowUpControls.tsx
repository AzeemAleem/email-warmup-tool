"use client";

import { useState } from "react";
import { clsx } from "clsx";

export type FollowUpProjectFields = {
  id: string;
  followUpStatus: string;
  followUpStep: number;
  nextFollowUpOn: string | null;
  lastFollowUpAt: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Karachi",
  });
}

function statusLabel(status: string) {
  if (status === "PAUSED") return "Paused (responded)";
  if (status === "DEAD") return "Dead zone";
  return "Active";
}

function statusClass(status: string) {
  if (status === "PAUSED") return "text-amber-700 dark:text-amber-300";
  if (status === "DEAD") return "text-gray-500";
  return "text-emerald-700 dark:text-emerald-400";
}

export function FollowUpControls({
  project,
  onUpdated,
  compact = false,
}: {
  project: FollowUpProjectFields;
  onUpdated: (next: FollowUpProjectFields) => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<"log" | "respond" | "resume" | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  async function run(
    action: "log" | "respond" | "resume",
    body?: Record<string, unknown>,
  ) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/follow-ups/${project.id}/${action}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      const p = data.project as {
        id: string;
        followUpStatus: string;
        followUpStep: number;
        nextFollowUpOn: string | null;
        lastFollowUpAt: string | null;
      };
      onUpdated({
        id: p.id,
        followUpStatus: p.followUpStatus,
        followUpStep: p.followUpStep,
        nextFollowUpOn: p.nextFollowUpOn,
        lastFollowUpAt: p.lastFollowUpAt,
      });
      setNotes("");
      setShowNotes(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={clsx(!compact && "rounded-xl border border-gray-700 bg-gray-900/40 p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {!compact && (
            <h3 className="text-sm font-semibold text-foreground mb-1">Follow-up</h3>
          )}
          <p className={clsx("text-sm font-medium", statusClass(project.followUpStatus))}>
            {statusLabel(project.followUpStatus)} · Step {project.followUpStep}/6
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Next: {fmtDate(project.nextFollowUpOn)}
            {project.lastFollowUpAt && (
              <> · Last: {fmtDate(project.lastFollowUpAt)}</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {project.followUpStatus === "ACTIVE" && project.followUpStep < 6 && (
            <>
              <button
                type="button"
                disabled={busy != null}
                onClick={() => setShowNotes((v) => !v)}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold border border-pacify-gold/40 text-pacify-gold hover:bg-pacify-gold/10 disabled:opacity-40"
              >
                Mark followed up
              </button>
              <button
                type="button"
                disabled={busy != null}
                onClick={() => void run("respond")}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-gray-600 text-gray-300 hover:bg-gray-800 disabled:opacity-40"
              >
                {busy === "respond" ? "…" : "Responded (pause)"}
              </button>
            </>
          )}
          {project.followUpStatus === "PAUSED" && (
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void run("resume")}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90 disabled:opacity-40"
            >
              {busy === "resume" ? "…" : "Resume"}
            </button>
          )}
        </div>
      </div>

      {showNotes && (
        <div className="mt-3 space-y-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional note for this follow-up…"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-foreground placeholder-gray-600 focus:outline-none focus:border-pacify-gold/50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void run("log", { notes })}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90 disabled:opacity-40"
            >
              {busy === "log" ? "Saving…" : "Confirm followed up"}
            </button>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => {
                setShowNotes(false);
                setNotes("");
              }}
              className="px-3 py-1.5 rounded-md text-xs text-gray-400 hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

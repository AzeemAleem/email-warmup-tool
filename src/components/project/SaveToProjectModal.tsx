"use client";

import { useState } from "react";
import {
  BookmarkIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { ProjectPicker, type ProjectSelection } from "./ProjectPicker";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalculationType = "MAILER_BOX" | "RIGID_BOX";

export interface SaveToProjectModalProps {
  type: CalculationType;
  snapshot: Record<string, unknown>;
  onClose: () => void;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function SaveToProjectModal({
  type,
  snapshot,
  onClose,
}: SaveToProjectModalProps) {
  const [project, setProject] = useState<ProjectSelection | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeLabel = type === "MAILER_BOX" ? "Mailer Box" : "Rigid Box";

  async function handleSave() {
    if (!project) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.projectId,
          type,
          label: label.trim() || undefined,
          snapshot,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Failed to save");
        return;
      }
      setSaved(true);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <BookmarkIcon className="h-4 w-4 text-pacify-gold" />
            <h2 className="text-sm font-semibold text-white">
              Save {typeLabel} Calculation
            </h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {saved ? (
            /* Success state */
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircleIcon className="h-10 w-10 text-green-400" />
              <p className="text-sm font-medium text-white">
                Calculation saved to{" "}
                <span className="text-pacify-gold">{project?.projectName}</span>!
              </p>
              <p className="text-xs text-gray-500">
                View it anytime under{" "}
                <a
                  href={`/clients/${project?.clientId}`}
                  className="text-pacify-gold/80 underline hover:text-pacify-gold"
                >
                  {project?.clientName}
                </a>
                .
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {error && (
                <p className="rounded-lg bg-red-900/40 border border-red-700/60 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Project *
                </label>
                <ProjectPicker value={project} onChange={setProject} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Label <span className="text-gray-600 normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder='e.g. "Initial Q1 estimate" or leave blank'
                  maxLength={200}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !project}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90 transition-colors disabled:opacity-50"
                >
                  <BookmarkIcon className="h-3.5 w-3.5" />
                  {saving ? "Saving…" : "Save to project"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

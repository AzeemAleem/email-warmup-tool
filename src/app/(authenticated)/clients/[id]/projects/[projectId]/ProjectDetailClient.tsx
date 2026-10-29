"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectHistory } from "@/components/project/ProjectHistory";
import { DealTypeBadge } from "@/components/project/DealTypeBadge";
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  Bars3Icon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectDetail {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  status: string;
  dealType: string;
  trackingId: string | null;
  startDate: string | null;
  deadline: string | null;
  shippingAddress: string | null;
  requirements: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Status ────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active", color: "text-green-400" },
  { value: "ON_HOLD", label: "On hold", color: "text-yellow-400" },
  { value: "COMPLETED", label: "Completed", color: "text-blue-400" },
  { value: "CANCELLED", label: "Cancelled", color: "text-gray-500" },
];

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];
  return (
    <span className={clsx("text-sm font-medium", opt.color)}>{opt.label}</span>
  );
}

// ─── Requirements bullet editor ───────────────────────────────────────────────

function RequirementsEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");

  function addItem() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setDraft("");
    inputRef.current?.focus();
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function startEdit(idx: number) {
    setEditIdx(idx);
    setEditVal(items[idx]);
  }

  function saveEdit(idx: number) {
    const trimmed = editVal.trim();
    if (!trimmed) {
      removeItem(idx);
    } else {
      onChange(items.map((item, i) => (i === idx ? trimmed : item)));
    }
    setEditIdx(null);
  }

  function cancelEdit() {
    setEditIdx(null);
    setEditVal("");
  }

  return (
    <div className="space-y-2">
      {/* Existing items */}
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="group flex items-start gap-2">
              {editIdx === idx ? (
                <div className="flex-1 flex items-center gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-pacify-gold shrink-0" />
                  <input
                    autoFocus
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(idx);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="flex-1 rounded-md border border-pacify-gold/40 bg-gray-800 px-2 py-1 text-sm text-white focus:outline-none"
                  />
                  <button
                    onClick={() => saveEdit(idx)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-green-400 hover:bg-green-900/30 transition-colors"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-800 transition-colors"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-pacify-gold/60 shrink-0" />
                  <span className="flex-1 text-sm text-gray-300 leading-relaxed">{item}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => startEdit(idx)}
                      title="Edit"
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-800 hover:text-pacify-gold transition-colors"
                    >
                      <PencilSquareIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeItem(idx)}
                      title="Remove"
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-red-900/30 hover:text-red-400 transition-colors"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add row */}
      <div className="flex items-center gap-2 pt-1">
        <span className="h-1.5 w-1.5 rounded-full bg-pacify-gold/30 shrink-0" />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addItem(); }
          }}
          placeholder="Type a requirement and press Enter…"
          className="flex-1 rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-pacify-gold/40 focus:outline-none"
        />
        <button
          onClick={addItem}
          disabled={!draft.trim()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-pacify-gold/10 text-pacify-gold hover:bg-pacify-gold/20 transition-colors disabled:opacity-30"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Inline field ────────────────────────────────────────────────────────────

function EditableText({
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40 resize-none"
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40"
    />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProjectDetailClient({ initial }: { initial: ProjectDetail }) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail>(initial);
  const [editing, setEditing] = useState(false);
  // Local editable state
  const [editName, setEditName] = useState(project.name);
  const [editStatus, setEditStatus] = useState(project.status);
  const [editDealType, setEditDealType] = useState(project.dealType || "QUOTATION");
  const [editTrackingId, setEditTrackingId] = useState(project.trackingId ?? "");
  const [editStartDate, setEditStartDate] = useState(project.startDate ? project.startDate.split("T")[0] : "");
  const [editDeadline, setEditDeadline] = useState(project.deadline ? project.deadline.split("T")[0] : "");
  const [editShippingAddress, setEditShippingAddress] = useState(project.shippingAddress ?? "");
  const [editNotes, setEditNotes] = useState(project.notes ?? "");
  const [editReqs, setEditReqs] = useState<string[]>(project.requirements);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>();
  const [, startTransition] = useTransition();

  function enterEdit() {
    setEditName(project.name);
    setEditStatus(project.status);
    setEditDealType(project.dealType || "QUOTATION");
    setEditTrackingId(project.trackingId ?? "");
    setEditStartDate(project.startDate ? project.startDate.split("T")[0] : "");
    setEditDeadline(project.deadline ? project.deadline.split("T")[0] : "");
    setEditShippingAddress(project.shippingAddress ?? "");
    setEditNotes(project.notes ?? "");
    setEditReqs(project.requirements);
    setSaveError(undefined);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveProject() {
    setSaving(true);
    setSaveError(undefined);
    try {
      const res = await fetch(
        `/api/clients/${project.clientId}/projects/${project.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            status: editStatus,
            dealType: editDealType,
            trackingId: editTrackingId.trim() || undefined,
            startDate: editStartDate || undefined,
            deadline: editDeadline || undefined,
            shippingAddress: editShippingAddress.trim() || "",
            notes: editNotes.trim() || undefined,
            requirements: editReqs,
          }),
        },
      );
      if (!res.ok) {
        const j = await res.json();
        setSaveError(j.error ?? "Failed to save");
        return;
      }
      const raw = await res.json();
      const updated: ProjectDetail = {
        ...project,
        ...raw,
        clientName: project.clientName,
        dealType: raw.dealType ?? "QUOTATION",
        shippingAddress: raw.shippingAddress ?? null,
        requirements: Array.isArray(raw.requirements) ? raw.requirements : [],
      };
      setProject(updated);
      setEditing(false);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject() {
    setDeleting(true);
    try {
      await fetch(`/api/clients/${project.clientId}/projects/${project.id}`, {
        method: "DELETE",
      });
      router.push(`/clients/${project.clientId}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/clients" className="hover:text-white transition-colors">
          Clients
        </Link>
        <span className="text-gray-700">/</span>
        <Link
          href={`/clients/${project.clientId}`}
          className="hover:text-white transition-colors"
        >
          {project.clientName}
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-gray-200 truncate">{project.name}</span>
      </nav>

      {/* Project card */}
      <div className="rounded-xl border border-gray-700 bg-gray-900 p-6 space-y-6">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          {editing ? (
            <div className="flex-1 min-w-0 space-y-3">
              <EditableText
                value={editName}
                onChange={setEditName}
                placeholder="Project name"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-pacify-gold/60 focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Deal type</label>
                  <select
                    value={editDealType}
                    onChange={(e) => setEditDealType(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-pacify-gold/60 focus:outline-none"
                  >
                    <option value="QUOTATION">Quotation only</option>
                    <option value="WON">Won / Confirmed order</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Tracking ID</label>
                  <EditableText
                    value={editTrackingId}
                    onChange={setEditTrackingId}
                    placeholder="e.g. PRJ-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Start date</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-pacify-gold/60 focus:outline-none [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Deadline</label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-pacify-gold/60 focus:outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Shipping address</label>
                <textarea
                  value={editShippingAddress}
                  onChange={(e) => setEditShippingAddress(e.target.value)}
                  rows={3}
                  placeholder="Full ship-to address for this project…"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-pacify-gold/60 focus:outline-none resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="min-w-0 space-y-2">
              <h1 className="text-xl font-semibold text-white">{project.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <DealTypeBadge dealType={project.dealType || "QUOTATION"} size="md" />
                <StatusBadge status={project.status} />
                {project.trackingId && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs font-mono text-pacify-gold">
                    {project.trackingId}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                {project.startDate && (
                  <span>
                    Started:{" "}
                    <span className="text-gray-300">
                      {new Date(project.startDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </span>
                )}
                {project.deadline && (
                  <span>
                    Deadline:{" "}
                    <span className={clsx("font-medium", new Date(project.deadline) < new Date() && project.status !== "COMPLETED" ? "text-red-400" : "text-gray-300")}>
                      {new Date(project.deadline).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </span>
                )}
                <span>
                  Updated{" "}
                  {new Date(project.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProject}
                  disabled={saving || !editName.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={enterEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-700 text-gray-400 hover:bg-red-900/30 hover:text-red-400 hover:border-red-700/60 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {saveError && (
          <p className="rounded-lg bg-red-900/40 border border-red-700/60 px-3 py-2 text-sm text-red-300">
            {saveError}
          </p>
        )}

        {/* Shipping address (view) */}
        {!editing && (
          <div className="space-y-2 border-t border-gray-800 pt-5">
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4 text-pacify-gold/60" />
              <h2 className="text-sm font-semibold text-white">Shipping address</h2>
            </div>
            {project.shippingAddress ? (
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {project.shippingAddress}
              </p>
            ) : (
              <p className="text-sm text-gray-600 italic">
                No shipping address yet. Click Edit to add one.
              </p>
            )}
          </div>
        )}

        {/* Requirements */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bars3Icon className="h-4 w-4 text-pacify-gold/60" />
            <h2 className="text-sm font-semibold text-white">Requirements</h2>
            {!editing && project.requirements.length > 0 && (
              <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[11px] text-gray-400">
                {project.requirements.length}
              </span>
            )}
          </div>

          {editing ? (
            <RequirementsEditor items={editReqs} onChange={setEditReqs} />
          ) : project.requirements.length > 0 ? (
            <ul className="space-y-2">
              {project.requirements.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-pacify-gold/60 shrink-0" />
                  <span className="text-sm text-gray-300 leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600 italic">
              No requirements added yet. Click Edit to add them.
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2 border-t border-gray-800 pt-5">
          <h2 className="text-sm font-semibold text-white">Notes</h2>
          {editing ? (
            <EditableText
              value={editNotes}
              onChange={setEditNotes}
              placeholder="Additional context, references, deadlines…"
              multiline
            />
          ) : project.notes ? (
            <p className="text-sm text-gray-400 whitespace-pre-wrap">{project.notes}</p>
          ) : (
            <p className="text-sm text-gray-600 italic">No notes.</p>
          )}
        </div>

        {/* Calculations + Invoices history */}
        <ProjectHistory
          clientId={project.clientId}
          projectId={project.id}
        />
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-semibold text-white">Delete project?</h2>
            <p className="text-sm text-gray-300">
              Permanently delete{" "}
              <span className="font-semibold text-white">{project.name}</span>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteProject}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

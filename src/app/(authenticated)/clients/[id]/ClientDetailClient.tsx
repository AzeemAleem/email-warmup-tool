"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  FolderOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  PauseCircleIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { DealTypeBadge, ClientDealBadge } from "@/components/project/DealTypeBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectRow {
  id: string;
  clientId: string;
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

export interface ClientDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  projects: ProjectRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  ACTIVE: {
    label: "Active",
    icon: CheckCircleIcon,
    color: "text-green-400 bg-green-900/30 border-green-700/50",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircleIcon,
    color: "text-blue-400 bg-blue-900/30 border-blue-700/50",
  },
  ON_HOLD: {
    label: "On hold",
    icon: PauseCircleIcon,
    color: "text-yellow-400 bg-yellow-900/30 border-yellow-700/50",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: NoSymbolIcon,
    color: "text-gray-500 bg-gray-800/40 border-gray-700/50",
  },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.ACTIVE;
  const Icon = meta.icon;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
        meta.color,
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

// ─── Form primitives ─────────────────────────────────────────────────────────

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40 resize-none"
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Inline Edit: client info ─────────────────────────────────────────────────

function EditClientForm({
  client,
  onSave,
  onCancel,
  saving,
  error,
}: {
  client: ClientDetail;
  onSave: (d: { name: string; email: string; phone: string; notes: string }) => void;
  onCancel: () => void;
  saving: boolean;
  error?: string;
}) {
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-900/40 border border-red-700/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <Field label="Name *">
        <Input value={name} onChange={setName} placeholder="Client name" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <Input type="email" value={email} onChange={setEmail} placeholder="email@example.com" />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={setPhone} placeholder="+92 300 …" />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea value={notes} onChange={setNotes} placeholder="Communication preferences, key context…" rows={3} />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({ name, email, phone, notes })}
          disabled={saving || !name.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Create / Edit Project Form ───────────────────────────────────────────────

type ProjectFormState = {
  name: string;
  status: string;
  dealType: string;
  trackingId: string;
  startDate: string;
  deadline: string;
  shippingAddress: string;
  notes: string;
};

function ProjectForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial?: ProjectFormState;
  onSave: (d: ProjectFormState) => void;
  onCancel: () => void;
  saving: boolean;
  error?: string;
}) {
  const [form, setForm] = useState<ProjectFormState>(
    initial ?? {
      name: "",
      status: "ACTIVE",
      dealType: "QUOTATION",
      trackingId: "",
      startDate: "",
      deadline: "",
      shippingAddress: "",
      notes: "",
    },
  );
  const set = (k: keyof ProjectFormState) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-900/40 border border-red-700/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <Field label="Project name *">
        <Input value={form.name} onChange={set("name")} placeholder="e.g. Custom Mailer Box Q1" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status")(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40"
          >
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </Field>
        <Field label="Deal type">
          <select
            value={form.dealType}
            onChange={(e) => set("dealType")(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40"
          >
            <option value="QUOTATION">Quotation only</option>
            <option value="WON">Won / Confirmed order</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tracking ID">
          <Input value={form.trackingId} onChange={set("trackingId")} placeholder="e.g. PRJ-001" />
        </Field>
        <Field label="Start date">
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate")(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40 [color-scheme:dark]"
          />
        </Field>
      </div>
      <Field label="Deadline">
        <input
          type="date"
          value={form.deadline}
          onChange={(e) => set("deadline")(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40 [color-scheme:dark]"
        />
      </Field>
      <Field label="Shipping address">
        <Textarea
          value={form.shippingAddress}
          onChange={set("shippingAddress")}
          placeholder="Ship-to address for this project…"
          rows={2}
        />
      </Field>
      <Field label="Notes">
        <Textarea
          value={form.notes}
          onChange={set("notes")}
          placeholder="General notes about this project…"
          rows={2}
        />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save project"}
        </button>
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onClick,
}: {
  project: ProjectRow;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const reqs = Array.isArray(project.requirements) ? project.requirements : [];

  return (
    <div className="group relative rounded-xl border border-gray-700 bg-gray-900 hover:border-pacify-gold/40 transition-colors">
      <button type="button" onClick={onClick} className="w-full text-left p-5 pr-20">
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-sm font-semibold text-white leading-snug">{project.name}</p>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <DealTypeBadge dealType={project.dealType || "QUOTATION"} />
            <StatusBadge status={project.status} />
          </div>
        </div>
        {(project.trackingId || project.deadline) && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {project.trackingId && (
              <span className="text-[11px] font-mono text-pacify-gold/80 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5">
                {project.trackingId}
              </span>
            )}
            {project.deadline && (
              <span className={clsx(
                "text-[11px]",
                new Date(project.deadline) < new Date() && project.status !== "COMPLETED"
                  ? "text-red-400"
                  : "text-gray-500",
              )}>
                Due {new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </div>
        )}

        {reqs.length > 0 && (
          <ul className="space-y-1 mb-3">
            {reqs.slice(0, 4).map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-pacify-gold/60 shrink-0" />
                <span className="line-clamp-1">{r}</span>
              </li>
            ))}
            {reqs.length > 4 && (
              <li className="text-xs text-gray-600 pl-3">+{reqs.length - 4} more</li>
            )}
          </ul>
        )}

        {project.notes && (
          <p className="text-xs text-gray-500 line-clamp-2">{project.notes}</p>
        )}

        <p className="mt-3 text-[11px] text-gray-600">
          Updated{" "}
          {new Date(project.updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </button>

      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Edit"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-700 hover:text-pacify-gold transition-colors"
        >
          <PencilSquareIcon className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-colors"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Confirm Delete ────────────────────────────────────────────────────────────

function ConfirmDelete({
  label,
  onConfirm,
  onCancel,
  deleting,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <Modal title="Confirm delete" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          Permanently delete <span className="font-semibold text-white">{label}</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ClientDetailClient({ initial }: { initial: ClientDetail }) {
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail>(initial);
  const [editingClient, setEditingClient] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [editProject, setEditProject] = useState<ProjectRow | null>(null);
  const [deleteProject, setDeleteProject] = useState<ProjectRow | null>(null);
  const [deleteClientOpen, setDeleteClientOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [, startTransition] = useTransition();

  // ── Client update ──
  async function handleUpdateClient(data: { name: string; email: string; phone: string; notes: string }) {
    setSaving(true);
    setFormError(undefined);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          notes: data.notes || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        setFormError(j.error ?? "Failed to update");
        return;
      }
      const updated = await res.json();
      setClient((c) => ({ ...c, ...updated }));
      setEditingClient(false);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  // ── Delete client ──
  async function handleDeleteClient() {
    setDeleting(true);
    try {
      await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      router.push("/clients");
    } finally {
      setDeleting(false);
    }
  }

  // ── Create project ──
  async function handleCreateProject(data: ProjectFormState) {
    setSaving(true);
    setFormError(undefined);
    try {
      const res = await fetch(`/api/clients/${client.id}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          status: data.status,
          dealType: data.dealType || "QUOTATION",
          trackingId: data.trackingId || undefined,
          startDate: data.startDate || undefined,
          deadline: data.deadline || undefined,
          shippingAddress: data.shippingAddress || undefined,
          notes: data.notes || undefined,
          requirements: [],
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        setFormError(j.error ?? "Failed to create project");
        return;
      }
      const created: ProjectRow = {
        ...(await res.json()),
        dealType: data.dealType || "QUOTATION",
        shippingAddress: data.shippingAddress || null,
      };
      setClient((c) => ({ ...c, projects: [created, ...c.projects] }));
      setShowCreateProject(false);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  // ── Edit project ──
  async function handleEditProject(data: ProjectFormState) {
    if (!editProject) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const res = await fetch(
        `/api/clients/${client.id}/projects/${editProject.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            status: data.status,
            dealType: data.dealType || "QUOTATION",
            trackingId: data.trackingId || undefined,
            startDate: data.startDate || undefined,
            deadline: data.deadline || undefined,
            shippingAddress: data.shippingAddress || "",
            notes: data.notes || undefined,
          }),
        },
      );
      if (!res.ok) {
        const j = await res.json();
        setFormError(j.error ?? "Failed to update project");
        return;
      }
      const updated: ProjectRow = {
        ...editProject,
        ...(await res.json()),
        dealType: data.dealType || "QUOTATION",
        shippingAddress: data.shippingAddress || null,
      };
      setClient((c) => ({
        ...c,
        projects: c.projects.map((p) => (p.id === editProject.id ? updated : p)),
      }));
      setEditProject(null);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  // ── Delete project ──
  async function handleDeleteProject() {
    if (!deleteProject) return;
    setDeleting(true);
    try {
      await fetch(`/api/clients/${client.id}/projects/${deleteProject.id}`, {
        method: "DELETE",
      });
      setClient((c) => ({
        ...c,
        projects: c.projects.filter((p) => p.id !== deleteProject.id),
      }));
      setDeleteProject(null);
      startTransition(() => router.refresh());
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-8">
      {/* Back */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to clients
      </Link>

      {/* Client header card */}
      <div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-white">{client.name}</h1>
              <ClientDealBadge
                hasWon={client.projects.some((p) => p.dealType === "WON")}
              />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              {client.email && (
                <span className="flex items-center gap-1.5">
                  <EnvelopeIcon className="h-4 w-4 text-gray-500" />
                  {client.email}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1.5">
                  <PhoneIcon className="h-4 w-4 text-gray-500" />
                  {client.phone}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <FolderOpenIcon className="h-4 w-4 text-pacify-gold/60" />
                {client.projects.length} project{client.projects.length !== 1 ? "s" : ""}
              </span>
            </div>
            {client.notes && (
              <p className="text-sm text-gray-400 max-w-prose">{client.notes}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setFormError(undefined); setEditingClient(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <PencilSquareIcon className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => setDeleteClientOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-700 text-gray-400 hover:bg-red-900/30 hover:text-red-400 hover:border-red-700/60 transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Projects section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Projects</h2>
          <button
            onClick={() => { setFormError(undefined); setShowCreateProject(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            New project
          </button>
        </div>

        {client.projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-14 text-center">
            <FolderOpenIcon className="h-8 w-8 text-gray-700 mb-2" />
            <p className="text-sm font-medium text-gray-400">No projects yet</p>
            <p className="text-xs text-gray-600 mt-1">
              Add the first project for {client.name}.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...client.projects]
              .sort((a, b) => {
                const aWon = a.dealType === "WON" ? 0 : 1;
                const bWon = b.dealType === "WON" ? 0 : 1;
                if (aWon !== bWon) return aWon - bWon;
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
              })
              .map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onClick={() => router.push(`/clients/${client.id}/projects/${p.id}`)}
                onEdit={() => { setFormError(undefined); setEditProject(p); }}
                onDelete={() => setDeleteProject(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {editingClient && (
        <Modal title="Edit client" onClose={() => setEditingClient(false)}>
          <EditClientForm
            client={client}
            onSave={handleUpdateClient}
            onCancel={() => setEditingClient(false)}
            saving={saving}
            error={formError}
          />
        </Modal>
      )}

      {deleteClientOpen && (
        <ConfirmDelete
          label={client.name}
          onConfirm={handleDeleteClient}
          onCancel={() => setDeleteClientOpen(false)}
          deleting={deleting}
        />
      )}

      {showCreateProject && (
        <Modal title="New project" onClose={() => setShowCreateProject(false)}>
          <ProjectForm
            onSave={handleCreateProject}
            onCancel={() => setShowCreateProject(false)}
            saving={saving}
            error={formError}
          />
        </Modal>
      )}

      {editProject && (
        <Modal title="Edit project" onClose={() => setEditProject(null)}>
          <ProjectForm
            initial={{
              name: editProject.name,
              status: editProject.status,
              dealType: editProject.dealType || "QUOTATION",
              trackingId: editProject.trackingId ?? "",
              startDate: editProject.startDate ? editProject.startDate.split("T")[0] : "",
              deadline: editProject.deadline ? editProject.deadline.split("T")[0] : "",
              shippingAddress: editProject.shippingAddress ?? "",
              notes: editProject.notes ?? "",
            }}
            onSave={handleEditProject}
            onCancel={() => setEditProject(null)}
            saving={saving}
            error={formError}
          />
        </Modal>
      )}

      {deleteProject && (
        <ConfirmDelete
          label={deleteProject.name}
          onConfirm={handleDeleteProject}
          onCancel={() => setDeleteProject(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  FolderOpenIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { ClientDealBadge } from "@/components/project/DealTypeBadge";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  _count: { projects: number };
  /** True if any project is WON / confirmed */
  hasWon?: boolean;
  projects?: { id: string; dealType?: string }[];
}

// ─── Status badge ─────────────────────────────────────────────────────────────

// ─── Reusable field ──────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

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
      <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Client Form ─────────────────────────────────────────────────────────────

interface ClientFormState {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

function ClientForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial?: ClientFormState;
  onSave: (data: ClientFormState) => void;
  onCancel: () => void;
  saving: boolean;
  error?: string;
}) {
  const [form, setForm] = useState<ClientFormState>(
    initial ?? { name: "", email: "", phone: "", notes: "" },
  );

  function set(key: keyof ClientFormState) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }));
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-900/40 border border-red-700/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <Field label="Client name *">
        <Input value={form.name} onChange={set("name")} placeholder="e.g. Acme Corp" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="client@example.com"
          />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={set("phone")} placeholder="+92 300 0000000" />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea
          value={form.notes}
          onChange={set("notes")}
          placeholder="Key preferences, communication style, how we got in touch…"
          rows={3}
        />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save client"}
        </button>
      </div>
    </div>
  );
}

// ─── Confirm Delete Modal ────────────────────────────────────────────────────

function ConfirmDelete({
  clientName,
  projectCount,
  onConfirm,
  onCancel,
  deleting,
}: {
  clientName: string;
  projectCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <Modal title="Delete client?" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          You are about to permanently delete{" "}
          <span className="font-semibold text-white">{clientName}</span>.
          {projectCount > 0 && (
            <span className="text-red-400">
              {" "}This will also delete {projectCount} associated project{projectCount !== 1 ? "s" : ""}.
            </span>
          )}{" "}
          This action cannot be undone.
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
            {deleting ? "Deleting…" : "Yes, delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Client Card ─────────────────────────────────────────────────────────────

function ClientCard({
  client,
  onEdit,
  onDelete,
  onClick,
}: {
  client: ClientRow;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  return (
    <div className="group relative rounded-xl border border-gray-700 bg-gray-900 hover:border-pacify-gold/40 transition-colors">
      {/* clickable area */}
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left p-5 pr-20"
      >
        {/* Avatar + name */}
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-pacify-forest/60 ring-1 ring-pacify-gold/30 flex items-center justify-center shrink-0">
            <UserIcon className="h-5 w-5 text-pacify-gold" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-white truncate">{client.name}</p>
              <ClientDealBadge
                hasWon={
                  client.hasWon ??
                  (client.projects?.some((p) => p.dealType === "WON") ?? false)
                }
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {new Date(client.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-1.5">
          {client.email && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <EnvelopeIcon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <PhoneIcon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
              <span className="truncate">{client.phone}</span>
            </div>
          )}
          {client.notes && (
            <p className="text-xs text-gray-500 line-clamp-2 pt-0.5">{client.notes}</p>
          )}
        </div>

        {/* Projects badge */}
        <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
          <FolderOpenIcon className="h-3.5 w-3.5 text-pacify-gold/70" />
          <span>
            {client._count.projects} project{client._count.projects !== 1 ? "s" : ""}
          </span>
        </div>
      </button>

      {/* Action buttons */}
      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Edit client"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-700 hover:text-pacify-gold transition-colors"
        >
          <PencilSquareIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete client"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-colors"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ClientsClient({ initial }: { initial: ClientRow[] }) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>(initial);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<ClientRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q),
    );
  }, [clients, search]);

  async function handleCreate(data: ClientFormState) {
    setSaving(true);
    setFormError(undefined);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
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
        setFormError(j.error ?? "Failed to create client");
        return;
      }
      const created: ClientRow = { ...(await res.json()), _count: { projects: 0 } };
      setClients((prev) => [created, ...prev]);
      setShowCreate(false);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(data: ClientFormState) {
    if (!editTarget) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const res = await fetch(`/api/clients/${editTarget.id}`, {
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
        setFormError(j.error ?? "Failed to update client");
        return;
      }
      const updated = await res.json();
      setClients((prev) =>
        prev.map((c) => (c.id === editTarget.id ? { ...c, ...updated } : c)),
      );
      setEditTarget(null);
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/clients/${deleteTarget.id}`, { method: "DELETE" });
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      startTransition(() => router.refresh());
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Clients</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your clients and their packaging projects in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setFormError(undefined); setShowCreate(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New client
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UserIcon className="h-10 w-10 text-gray-700 mb-3" />
          <p className="text-sm font-medium text-gray-400">
            {search ? "No clients match your search." : "No clients yet."}
          </p>
          {!search && (
            <p className="text-xs text-gray-600 mt-1">
              Click &ldquo;New client&rdquo; above to add your first one.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              onClick={() => router.push(`/clients/${c.id}`)}
              onEdit={() => { setFormError(undefined); setEditTarget(c); }}
              onDelete={() => setDeleteTarget(c)}
            />
          ))}
        </div>
      )}

      {/* Stats bar */}
      {clients.length > 0 && (
        <p className="text-xs text-gray-600">
          {filtered.length} of {clients.length} client{clients.length !== 1 ? "s" : ""}
          {search ? ` matching "${search}"` : ""}
        </p>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal title="Add new client" onClose={() => setShowCreate(false)}>
          <ClientForm
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
            saving={saving}
            error={formError}
          />
        </Modal>
      )}

      {/* Edit modal */}
      {editTarget && (
        <Modal title="Edit client" onClose={() => setEditTarget(null)}>
          <ClientForm
            initial={{
              name: editTarget.name,
              email: editTarget.email ?? "",
              phone: editTarget.phone ?? "",
              notes: editTarget.notes ?? "",
            }}
            onSave={handleEdit}
            onCancel={() => setEditTarget(null)}
            saving={saving}
            error={formError}
          />
        </Modal>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <ConfirmDelete
          clientName={deleteTarget.name}
          projectCount={deleteTarget._count.projects}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BuildingOffice2Icon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PickerProject {
  id: string;
  name: string;
  status: string;
}

export interface PickerClient {
  id: string;
  name: string;
  email: string | null;
  projects: PickerProject[];
}

export interface ProjectSelection {
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
}

// ─── Hook: load clients ───────────────────────────────────────────────────────

export function useClientList() {
  const [clients, setClients] = useState<PickerClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: PickerClient[]) => {
        // Normalize so missing projects never crash the picker
        const list = Array.isArray(data)
          ? data.map((c) => ({
              ...c,
              projects: Array.isArray(c.projects) ? c.projects : [],
            }))
          : [];
        setClients(list);
      })
      .catch(() => setError("Failed to load clients"))
      .finally(() => setLoading(false));
  }, []);

  return { clients, loading, error };
}

// ─── ProjectPicker component ──────────────────────────────────────────────────

export function ProjectPicker({
  value,
  onChange,
  placeholder = "Select a project…",
  disabled = false,
}: {
  value: ProjectSelection | null;
  onChange: (v: ProjectSelection | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { clients, loading, error } = useClientList();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>(
    value?.clientId ?? "",
  );

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return clients;
    return clients
      .map((c) => {
        const projects = c.projects ?? [];
        return {
          ...c,
          projects: projects.filter((p) =>
            p.name.toLowerCase().includes(q),
          ),
        };
      })
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || (c.projects?.length ?? 0) > 0,
      );
  }, [clients, search]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  function selectProject(client: PickerClient, project: PickerProject) {
    onChange({
      clientId: client.id,
      clientName: client.name,
      projectId: project.id,
      projectName: project.name,
    });
    setOpen(false);
    setSearch("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setSelectedClientId("");
  }

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors",
          open
            ? "border-pacify-gold/60 bg-gray-800 ring-1 ring-pacify-gold/30"
            : "border-gray-700 bg-gray-800 hover:border-gray-600",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {value ? (
          <>
            <BuildingOffice2Icon className="h-4 w-4 text-pacify-gold/70 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="text-gray-400 text-xs">{value.clientName} / </span>
              <span className="text-white font-medium">{value.projectName}</span>
            </span>
            <button
              type="button"
              onClick={clear}
              className="text-gray-500 hover:text-gray-300 ml-1 shrink-0 text-xs font-medium"
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <FolderOpenIcon className="h-4 w-4 text-gray-500 shrink-0" />
            <span className="flex-1 text-gray-500">
              {loading ? "Loading clients…" : error ?? placeholder}
            </span>
            <ChevronDownIcon className="h-4 w-4 text-gray-500 shrink-0" />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && !loading && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-800">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients or projects…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pacify-gold/40"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredClients.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                {search ? "No matches" : "No clients found. Create one first."}
              </p>
            ) : (
              filteredClients.map((client) => (
                <div key={client.id}>
                  {/* Client header */}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedClientId((prev) =>
                        prev === client.id ? "" : client.id,
                      )
                    }
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-800 transition-colors"
                  >
                    <BuildingOffice2Icon className="h-3.5 w-3.5 text-pacify-gold/60 shrink-0" />
                    <span className="text-xs font-semibold text-gray-300 flex-1">{client.name}</span>
                    <ChevronDownIcon
                      className={clsx(
                        "h-3 w-3 text-gray-600 transition-transform",
                        selectedClientId === client.id && "rotate-180",
                      )}
                    />
                  </button>

                  {/* Projects under client */}
                  {(selectedClientId === client.id || search) &&
                    ((client.projects ?? []).length === 0 ? (
                      <p className="pl-8 pb-2 text-xs text-gray-600">No projects</p>
                    ) : (
                      (client.projects ?? []).map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => selectProject(client, project)}
                          className={clsx(
                            "w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-left hover:bg-pacify-forest/20 transition-colors",
                            value?.projectId === project.id &&
                              "bg-pacify-forest/30 text-pacify-gold",
                          )}
                        >
                          <FolderOpenIcon className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                          <span className="text-sm text-gray-200 truncate">{project.name}</span>
                          <span
                            className={clsx(
                              "ml-auto text-[10px] px-1.5 py-0.5 rounded-full",
                              project.status === "ACTIVE"
                                ? "bg-green-900/40 text-green-400"
                                : project.status === "COMPLETED"
                                ? "bg-blue-900/30 text-blue-400"
                                : "bg-gray-800 text-gray-500",
                            )}
                          >
                            {project.status.replace("_", " ")}
                          </span>
                        </button>
                      ))
                    ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-800 px-3 py-2">
            <a
              href="/clients"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-pacify-gold/70 hover:text-pacify-gold transition-colors"
            >
              Manage clients →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

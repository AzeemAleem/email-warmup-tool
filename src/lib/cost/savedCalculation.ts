import type { ProjectSelection } from "@/components/project/ProjectPicker";
import type { EditCalculationMeta } from "@/components/project/SaveToProjectModal";

export function calculationEditHref(type: string, id: string): string {
  if (type === "RIGID_BOX") return `/rigid-box-calculator?calc=${encodeURIComponent(id)}`;
  return `/mailer-box-calculator?calc=${encodeURIComponent(id)}`;
}

export function snapStr(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return "";
}

export function snapNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function snapBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export interface SavedCalculationResponse {
  id: string;
  projectId: string;
  type: string;
  label: string | null;
  snapshot: Record<string, unknown>;
  project: {
    id: string;
    name: string;
    clientId: string;
    client: { id: string; name: string; email: string | null };
  };
}

export function editMetaFromSaved(
  calc: SavedCalculationResponse,
): EditCalculationMeta {
  const project: ProjectSelection = {
    clientId: calc.project.clientId,
    clientName: calc.project.client.name,
    clientEmail: calc.project.client.email,
    projectId: calc.project.id,
    projectName: calc.project.name,
  };
  return {
    id: calc.id,
    label: calc.label?.trim() || "",
    project,
  };
}

export function snapshotItemIds(snapshot: Record<string, unknown>): Set<string> {
  const items = Array.isArray(snapshot.items) ? snapshot.items : [];
  const ids = new Set<string>();
  for (const item of items) {
    if (
      item &&
      typeof item === "object" &&
      "id" in item &&
      typeof (item as { id: unknown }).id === "string"
    ) {
      ids.add((item as { id: string }).id);
    }
  }
  return ids;
}

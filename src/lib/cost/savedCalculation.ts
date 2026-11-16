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

type SnapshotItemLike = {
  id?: unknown;
  total?: unknown;
  meta?: Record<string, string | number | boolean | null> | null;
};

function snapshotItems(
  snapshot: Record<string, unknown>,
): SnapshotItemLike[] {
  return Array.isArray(snapshot.items)
    ? (snapshot.items as SnapshotItemLike[])
    : [];
}

function findSnapshotItem(
  snapshot: Record<string, unknown>,
  itemId: string,
): SnapshotItemLike | undefined {
  return snapshotItems(snapshot).find(
    (item) => typeof item?.id === "string" && item.id === itemId,
  );
}

/**
 * Restore a manual line override. Prefers explicit snapshot fields; falls back
 * to items[].meta.usedAutomatic === false from older saves.
 */
export function restoreLineOverride(
  snapshot: Record<string, unknown>,
  opts: {
    overrideKey: string;
    rawKey: string;
    itemId: string;
  },
): { override: boolean; raw: string } {
  if (typeof snapshot[opts.overrideKey] === "boolean") {
    return {
      override: snapshot[opts.overrideKey] as boolean,
      raw: snapStr(snapshot[opts.rawKey]),
    };
  }

  const item = findSnapshotItem(snapshot, opts.itemId);
  if (
    item &&
    item.meta &&
    item.meta.usedAutomatic === false &&
    typeof item.total === "number" &&
    Number.isFinite(item.total)
  ) {
    return { override: true, raw: String(item.total) };
  }

  return { override: false, raw: "" };
}

/** Restore Extra line from explicit field or snapshot items. */
export function restoreExtraRaw(snapshot: Record<string, unknown>): string {
  const direct = snapStr(snapshot.extraRaw);
  if (direct) return direct;
  const extraTotal = snapNum(snapshot.extraTotal);
  if (extraTotal != null && extraTotal > 0) return String(extraTotal);
  const item = findSnapshotItem(snapshot, "extra");
  if (typeof item?.total === "number" && Number.isFinite(item.total) && item.total > 0) {
    return String(item.total);
  }
  return "";
}

/**
 * Restore art/mailer sheet key. Prefers explicit key; falls back to sheet W×H in item meta.
 */
export function restoreArtSheetKey(
  snapshot: Record<string, unknown>,
  itemIds: string[] = ["paper", "stock"],
): string | null {
  const direct = snapStr(snapshot.artSheetKeyOverride);
  if (direct) return direct;

  for (const id of itemIds) {
    const item = findSnapshotItem(snapshot, id);
    const w = item?.meta?.sheetWidth;
    const h = item?.meta?.sheetHeight;
    if (
      typeof w === "number" &&
      Number.isFinite(w) &&
      typeof h === "number" &&
      Number.isFinite(h)
    ) {
      return `${w}x${h}`;
    }
  }
  return null;
}

/** Deep-merge a plain snapshot config object onto defaults (JSON-safe sections only). */
export function mergeCostConfigFromSnapshot<T extends Record<string, unknown>>(
  defaults: T,
  incoming: unknown,
): T {
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return defaults;
  }
  const src = incoming as Record<string, unknown>;
  const out: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(src)) {
    const prev = out[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      prev &&
      typeof prev === "object" &&
      !Array.isArray(prev)
    ) {
      out[key] = { ...(prev as Record<string, unknown>), ...(value as object) };
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

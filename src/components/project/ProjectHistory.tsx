"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CubeIcon,
  Square3Stack3DIcon,
  DocumentTextIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { formatPkrTotal, formatUsd } from "@/lib/cost/currency";
import { ActualExpensePanel } from "@/components/project/ActualExpensePanel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SnapshotItem {
  id: string;
  label: string;
  perUnit?: number;
  total: number;
  excluded?: boolean;
  warning?: string;
  meta?: Record<string, string | number | boolean | null>;
}

interface CalcItem {
  id: string;
  projectId: string;
  type: string;
  label: string | null;
  snapshot: Record<string, unknown>;
  createdAt: string;
}

interface InvoiceItem {
  id: string;
  quoteNo: string;
  clientName: string;
  orderTitle: string;
  currency: string;
  quantity: number | null;
  unitPrice: number | null;
  totalAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMoney(amount: number | null, currency = "USD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// ─── Calculation row ─────────────────────────────────────────────────────────

function CalcRow({
  calc,
  onDelete,
}: {
  calc: CalcItem;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const snap = calc.snapshot;
  const isMailer = calc.type === "MAILER_BOX";
  const Icon = isMailer ? CubeIcon : Square3Stack3DIcon;
  const typeLabel = isMailer ? "Mailer Box" : "Rigid Box";

  const basePkr = num(snap.basePkr) ?? num(snap.grandTotal);
  const sellingPkr = num(snap.sellingPkr);
  const sellingUsd = num(snap.sellingUsd);
  const baseUsd = num(snap.baseUsd);
  const perUnitBasePkr = num(snap.perUnitBasePkr) ?? num(snap.costPerUnit);
  const perUnitSellingPkr = num(snap.perUnitSellingPkr);
  const perUnitBaseUsd = num(snap.perUnitBaseUsd);
  const perUnitSellingUsd = num(snap.perUnitSellingUsd);
  const productionPkr = num(snap.productionPkr);
  const productionUsd = num(snap.productionUsd);
  const shippingPkr = num(snap.shippingPkr);
  const shippingUsd = num(snap.shippingUsd);
  const qty = num(snap.quantity);
  const usdRate = num(snap.usdRate);
  const profitRatio = num(snap.profitRatio);
  const items = Array.isArray(snap.items)
    ? (snap.items as SnapshotItem[])
    : [];

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/calculations/${calc.id}`, { method: "DELETE" });
      onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-8 w-8 rounded-md bg-pacify-forest/40 border border-pacify-gold/20 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-pacify-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {calc.label || `${typeLabel} estimate`}
          </p>
          <p className="text-xs text-gray-500">{fmt(calc.createdAt)}</p>
        </div>
        <div className="text-right shrink-0">
          {(sellingUsd ?? baseUsd) != null ? (
            <>
              <p className="text-sm font-semibold text-pacify-gold tabular-nums">
                {formatUsd(sellingUsd ?? baseUsd!)}
              </p>
              {basePkr != null && (
                <p className="text-[11px] text-gray-500 tabular-nums">
                  {formatPkrTotal(sellingPkr ?? basePkr)}
                </p>
              )}
            </>
          ) : basePkr != null ? (
            <p className="text-sm font-semibold text-pacify-gold tabular-nums">
              {formatPkrTotal(basePkr)}
            </p>
          ) : null}
          {(perUnitSellingUsd ?? perUnitBaseUsd ?? perUnitBasePkr) != null &&
            qty != null && (
              <p className="text-[11px] text-gray-500 tabular-nums">
                {perUnitSellingUsd != null
                  ? formatUsd(perUnitSellingUsd)
                  : perUnitBaseUsd != null
                    ? formatUsd(perUnitBaseUsd)
                    : formatPkrTotal(perUnitBasePkr!)}{" "}
                / unit × {qty.toLocaleString()}
              </p>
            )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-700 hover:text-white transition-colors shrink-0"
        >
          {expanded ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          title="Delete this calculation"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-red-900/30 hover:text-red-400 transition-colors shrink-0 disabled:opacity-40"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-700 px-4 py-4 space-y-4 bg-gray-900/40">
          {/* Dimensions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {["length", "width", "height"].map((k) =>
              snap[k] != null ? (
                <div key={k} className="bg-gray-800 rounded px-2 py-1.5">
                  <p className="text-gray-500 uppercase text-[10px]">{k}</p>
                  <p className="text-white font-mono mt-0.5">
                    {Number(snap[k]).toFixed(3)}{" "}
                    <span className="text-gray-500">
                      {String(snap.unit ?? "in")}
                    </span>
                  </p>
                </div>
              ) : null,
            )}
            {qty != null && (
              <div className="bg-gray-800 rounded px-2 py-1.5">
                <p className="text-gray-500 uppercase text-[10px]">Qty</p>
                <p className="text-white font-mono mt-0.5">
                  {qty.toLocaleString()}
                </p>
              </div>
            )}
            {snap.openWidthIn != null && (
              <div className="bg-gray-800 rounded px-2 py-1.5">
                <p className="text-gray-500 uppercase text-[10px]">Open W</p>
                <p className="text-white font-mono mt-0.5">
                  {Number(snap.openWidthIn).toFixed(3)} in
                </p>
              </div>
            )}
            {snap.openHeightIn != null && (
              <div className="bg-gray-800 rounded px-2 py-1.5">
                <p className="text-gray-500 uppercase text-[10px]">Open H</p>
                <p className="text-white font-mono mt-0.5">
                  {Number(snap.openHeightIn).toFixed(3)} in
                </p>
              </div>
            )}
          </div>

          {/* Live-totals style money summary */}
          <div className="rounded-lg border border-pacify-gold/20 bg-pacify-forest/20 p-3 space-y-2">
            <p className="text-[10px] font-medium text-pacify-gold/80 uppercase tracking-wide">
              Committed totals
            </p>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {productionPkr != null && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Production cost</span>
                  <span className="text-white tabular-nums text-right">
                    {formatPkrTotal(productionPkr)}
                    {productionUsd != null && (
                      <span className="block text-gray-500">
                        {formatUsd(productionUsd)}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {shippingPkr != null && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Shipping cost</span>
                  <span className="text-white tabular-nums text-right">
                    {formatPkrTotal(shippingPkr)}
                    {shippingUsd != null && (
                      <span className="block text-gray-500">
                        {formatUsd(shippingUsd)}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {basePkr != null && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Base total</span>
                  <span className="text-white tabular-nums text-right">
                    {formatPkrTotal(basePkr)}
                    {baseUsd != null && (
                      <span className="block text-gray-500">
                        {formatUsd(baseUsd)}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {sellingPkr != null && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">
                    Selling (×{profitRatio ?? 1})
                  </span>
                  <span className="text-pacify-gold font-semibold tabular-nums text-right">
                    {formatPkrTotal(sellingPkr)}
                    {sellingUsd != null && (
                      <span className="block text-pacify-gold/70 font-normal">
                        {formatUsd(sellingUsd)}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {perUnitSellingPkr != null && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Per unit selling</span>
                  <span className="text-white tabular-nums text-right">
                    {formatPkrTotal(perUnitSellingPkr)}
                    {perUnitSellingUsd != null && (
                      <span className="block text-gray-500">
                        {formatUsd(perUnitSellingUsd)}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {perUnitBasePkr != null && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Per unit base</span>
                  <span className="text-white tabular-nums text-right">
                    {formatPkrTotal(perUnitBasePkr)}
                    {perUnitBaseUsd != null && (
                      <span className="block text-gray-500">
                        {formatUsd(perUnitBaseUsd)}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
            {usdRate != null && (
              <p className="text-[10px] text-gray-600 pt-1">
                USD rate @ {usdRate}
              </p>
            )}
          </div>

          {/* Line items with meta */}
          {items.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">
                Cost breakdown
              </p>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={clsx(
                      "rounded-md border px-3 py-2",
                      item.excluded
                        ? "border-gray-800 bg-gray-900/40 opacity-60"
                        : "border-gray-700 bg-gray-800/60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="text-gray-200 font-medium">
                          {item.label}
                          {item.excluded && (
                            <span className="ml-2 text-gray-500 font-normal">
                              (excluded)
                            </span>
                          )}
                        </p>
                        {item.meta && Object.keys(item.meta).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
                            {Object.entries(item.meta).map(([k, v]) =>
                              v == null || v === "" ? null : (
                                <span key={k}>
                                  {k}:{" "}
                                  <span className="text-gray-400">
                                    {String(v)}
                                  </span>
                                </span>
                              ),
                            )}
                          </div>
                        )}
                        {item.warning && (
                          <p className="mt-1 text-[10px] text-amber-400/80">
                            {item.warning}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <p className="text-white font-mono">
                          {formatPkrTotal(item.total)}
                        </p>
                        {item.perUnit != null && qty != null && (
                          <p className="text-[10px] text-gray-500">
                            {formatPkrTotal(item.perUnit)} / unit
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Specs */}
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
            {snap.material != null && (
              <span>
                Material:{" "}
                <span className="text-gray-300">{String(snap.material)}</span>
              </span>
            )}
            {snap.paperType != null && (
              <span>
                Paper:{" "}
                <span className="text-gray-300">{String(snap.paperType)}</span>
              </span>
            )}
            {snap.printSides != null && (
              <span>
                Sides:{" "}
                <span className="text-gray-300">{String(snap.printSides)}</span>
              </span>
            )}
            {snap.printColorMode != null && (
              <span>
                Print:{" "}
                <span className="text-gray-300">
                  {String(snap.printColorMode)}
                </span>
              </span>
            )}
            {snap.laminationSides != null && (
              <span>
                Lamination sides:{" "}
                <span className="text-gray-300">
                  {String(snap.laminationSides)}
                </span>
              </span>
            )}
            {snap.corrugationEnabled != null && (
              <span>
                Corrugation:{" "}
                <span className="text-gray-300">
                  {snap.corrugationEnabled ? "Yes" : "No"}
                </span>
              </span>
            )}
            {snap.clientName != null && String(snap.clientName) !== "" && (
              <span>
                Client:{" "}
                <span className="text-gray-300">{String(snap.clientName)}</span>
              </span>
            )}
          </div>

          <Link
            href={isMailer ? "/mailer-box-calculator" : "/rigid-box-calculator"}
            className="inline-flex items-center gap-1 text-xs text-pacify-gold/70 hover:text-pacify-gold transition-colors"
          >
            Open {typeLabel} calculator →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Invoice row ─────────────────────────────────────────────────────────────

function InvoiceRow({
  invoice,
  onDelete,
}: {
  invoice: InvoiceItem;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        `Delete quotation #${invoice.quoteNo}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      onDelete();
    } catch {
      alert("Failed to delete invoice. Check your database connection.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 hover:border-pacify-gold/40 hover:bg-gray-800 transition-colors group">
      <Link
        href={`/invoices/${invoice.id}`}
        className="flex flex-1 items-center gap-3 min-w-0"
      >
        <div className="h-8 w-8 rounded-md bg-blue-900/30 border border-blue-700/30 flex items-center justify-center shrink-0">
          <DocumentTextIcon className="h-4 w-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate group-hover:text-pacify-gold transition-colors">
            {invoice.orderTitle || "Quotation"}{" "}
            <span className="text-gray-500 font-mono text-xs">
              #{invoice.quoteNo}
            </span>
          </p>
          <p className="text-xs text-gray-500">{fmt(invoice.updatedAt)}</p>
        </div>
        {invoice.totalAmount != null && (
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-white tabular-nums">
              {fmtMoney(invoice.totalAmount, invoice.currency)}
            </p>
            {invoice.quantity != null && (
              <p className="text-[11px] text-gray-500">
                {invoice.quantity.toLocaleString()} units
              </p>
            )}
          </div>
        )}
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        title="Delete invoice"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-red-900/30 hover:text-red-400 transition-colors shrink-0 disabled:opacity-40"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProjectHistory({
  clientId,
  projectId,
}: {
  clientId: string;
  projectId: string;
}) {
  const [tab, setTab] = useState<"calculations" | "invoices" | "expense">(
    "calculations",
  );
  const [calculations, setCalculations] = useState<CalcItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/clients/${clientId}/projects/${projectId}/history`)
      .then((r) => r.json())
      .then((data) => {
        setCalculations(data.calculations ?? []);
        setInvoices(data.invoices ?? []);
      })
      .catch(() => setError("Failed to load history"))
      .finally(() => setLoading(false));
  }, [clientId, projectId]);

  function removeCalc(id: string) {
    setCalculations((prev) => prev.filter((c) => c.id !== id));
  }

  function removeInvoice(id: string) {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
  }

  const tabs = [
    {
      id: "calculations" as const,
      label: "Calculations",
      count: calculations.length,
    },
    { id: "invoices" as const, label: "Invoices", count: invoices.length },
    { id: "expense" as const, label: "Actual expense", count: null as number | null },
  ];

  return (
    <div className="space-y-4 border-t border-gray-800 pt-6">
      <div className="flex items-center gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-pacify-forest/40 text-pacify-gold border border-pacify-gold/30"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200",
            )}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="rounded-full bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "expense" ? (
        <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
          <ActualExpensePanel clientId={clientId} projectId={projectId} initial={null} />
        </div>
      ) : loading ? (
        <p className="text-sm text-gray-500 py-4">Loading history…</p>
      ) : error ? (
        <p className="text-sm text-red-400 py-4">{error}</p>
      ) : tab === "calculations" ? (
        calculations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center rounded-xl border border-dashed border-gray-700">
            <CubeIcon className="h-7 w-7 text-gray-700" />
            <p className="text-sm text-gray-500">No calculations saved yet.</p>
            <p className="text-xs text-gray-600">
              Use the{" "}
              <Link
                href="/mailer-box-calculator"
                className="text-pacify-gold/70 underline"
              >
                Mailer Box
              </Link>{" "}
              or{" "}
              <Link
                href="/rigid-box-calculator"
                className="text-pacify-gold/70 underline"
              >
                Rigid Box
              </Link>{" "}
              calculator and click <strong>Save to Project</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {calculations.map((c) => (
              <CalcRow
                key={c.id}
                calc={c}
                onDelete={() => removeCalc(c.id)}
              />
            ))}
          </div>
        )
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center rounded-xl border border-dashed border-gray-700">
          <DocumentTextIcon className="h-7 w-7 text-gray-700" />
          <p className="text-sm text-gray-500">No invoices linked yet.</p>
          <p className="text-xs text-gray-600">
            In the{" "}
            <Link
              href="/invoice-generator"
              className="text-pacify-gold/70 underline"
            >
              Invoice Generator
            </Link>
            , select this project before saving.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <InvoiceRow
              key={inv.id}
              invoice={inv}
              onDelete={() => removeInvoice(inv.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

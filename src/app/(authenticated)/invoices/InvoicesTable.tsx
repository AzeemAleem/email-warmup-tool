"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowDownTrayIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { buildInvoicePdfDataFromPayload } from "@/lib/invoice/checklist";
import type { InvoiceDraftPayload } from "@/lib/invoice/draft";

export interface InvoiceRow {
  id: string;
  quoteNo: string;
  clientName: string;
  clientEmail: string;
  orderTitle: string;
  currency: string;
  quantity: number | null;
  unitPrice: number | null;
  totalAmount: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

function fmtMoney(amount: number, currency: string) {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `PKR ${Math.round(amount).toLocaleString("en-US")}`;
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function InvoicesTable({ invoices: initial }: { invoices: InvoiceRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this saved invoice? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch {
      alert("Failed to delete invoice");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(id: string) {
    setDownloadingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { payload: InvoiceDraftPayload };
      const pdfData = buildInvoicePdfDataFromPayload(data.payload);
      if (!pdfData) {
        alert("This invoice is missing quantity or unit price, so PDF cannot be generated.");
        return;
      }
      const { exportInvoicePdf } = await import("@/lib/invoice/exportInvoicePdf");
      await exportInvoicePdf(pdfData);
    } catch {
      alert("Failed to download invoice PDF");
    } finally {
      setDownloadingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-900/50 px-6 py-12 text-center">
        <p className="text-sm text-gray-400">No saved invoices yet.</p>
        <Link
          href="/invoice-generator"
          className="inline-block mt-4 text-sm font-semibold text-pacify-gold hover:underline"
        >
          Create a new quote →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900/80 text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-700">
              <th className="text-left font-medium px-4 py-3">Quote No.</th>
              <th className="text-left font-medium px-4 py-3">Client</th>
              <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Order</th>
              <th className="text-right font-medium px-4 py-3">Amount</th>
              <th className="text-right font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv, i) => (
              <tr
                key={inv.id}
                className={clsx(
                  "border-b border-gray-800/80 last:border-0 transition-colors hover:bg-gray-800/40",
                  i % 2 === 1 && "bg-gray-900/30",
                )}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="font-mono font-bold text-pacify-gold hover:underline"
                  >
                    {inv.quoteNo}
                  </Link>
                  {inv.quantity != null && (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {inv.quantity.toLocaleString("en-US")} units
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 min-w-0">
                  <p className="text-foreground font-medium truncate">{inv.clientName || "—"}</p>
                  {inv.clientEmail && (
                    <p className="text-xs text-gray-500 truncate">{inv.clientEmail}</p>
                  )}
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    Updated {fmtDate(inv.updatedAt)}
                  </p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell max-w-[220px]">
                  <p className="text-gray-300 truncate">{inv.orderTitle || "—"}</p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {inv.totalAmount != null ? (
                    <span className="text-foreground font-semibold">
                      {fmtMoney(inv.totalAmount, inv.currency)}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/invoices/${inv.id}`}
                      title="View"
                      aria-label="View"
                      className="group relative inline-flex items-center justify-center p-2 rounded-md border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-foreground transition-colors"
                    >
                      <EyeIcon className="h-4 w-4" />
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-gray-950 px-2 py-1 text-[10px] font-medium text-gray-200 opacity-0 shadow-lg ring-1 ring-gray-700 transition-opacity group-hover:opacity-100">
                        View
                      </span>
                    </Link>
                    <button
                      type="button"
                      disabled={downloadingId === inv.id}
                      onClick={() => void handleDownload(inv.id)}
                      title="Download"
                      aria-label="Download"
                      className="group relative inline-flex items-center justify-center p-2 rounded-md border border-pacify-gold/40 text-pacify-gold hover:bg-pacify-gold/10 disabled:opacity-40 transition-colors"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-gray-950 px-2 py-1 text-[10px] font-medium text-gray-200 opacity-0 shadow-lg ring-1 ring-gray-700 transition-opacity group-hover:opacity-100">
                        {downloadingId === inv.id ? "Downloading…" : "Download"}
                      </span>
                    </button>
                    <Link
                      href={`/invoice-generator?id=${inv.id}`}
                      title="Edit"
                      aria-label="Edit"
                      className="group relative inline-flex items-center justify-center p-2 rounded-md bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90 transition-colors"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-gray-950 px-2 py-1 text-[10px] font-medium text-gray-200 opacity-0 shadow-lg ring-1 ring-gray-700 transition-opacity group-hover:opacity-100">
                        Edit
                      </span>
                    </Link>
                    <button
                      type="button"
                      disabled={deletingId === inv.id}
                      onClick={() => void handleDelete(inv.id)}
                      title="Delete"
                      aria-label="Delete"
                      className="group relative inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-40 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-gray-950 px-2 py-1 text-[10px] font-medium text-gray-200 opacity-0 shadow-lg ring-1 ring-gray-700 transition-opacity group-hover:opacity-100">
                        Delete
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

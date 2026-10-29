"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";

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
              <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Updated</th>
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
                  <p className="text-white font-medium truncate">{inv.clientName || "—"}</p>
                  {inv.clientEmail && (
                    <p className="text-xs text-gray-500 truncate">{inv.clientEmail}</p>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell max-w-[220px]">
                  <p className="text-gray-300 truncate">{inv.orderTitle || "—"}</p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {inv.totalAmount != null ? (
                    <span className="text-white font-semibold">
                      {fmtMoney(inv.totalAmount, inv.currency)}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell whitespace-nowrap">
                  {fmtDate(inv.updatedAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                      <EyeIcon className="h-3.5 w-3.5" />
                      View
                    </Link>
                    <Link
                      href={`/invoice-generator?id=${inv.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90 transition-colors"
                    >
                      <PencilSquareIcon className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={deletingId === inv.id}
                      onClick={() => void handleDelete(inv.id)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-40 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
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

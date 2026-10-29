"use client";

import type { InvoiceDraftPayload } from "@/lib/invoice/draft";
import { buildBulletsFromPayload } from "@/lib/invoice/checklist";

function fmtMoney(amount: number, currency: "PKR" | "USD") {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `PKR ${Math.round(amount).toLocaleString("en-US")}`;
}

export function InvoicePreview({ payload }: { payload: InvoiceDraftPayload }) {
  const bullets = buildBulletsFromPayload(payload);
  const qty = parseInt(payload.qtyRaw, 10);
  const unitPrice = parseFloat(payload.priceRaw);
  const quantity = Number.isInteger(qty) && qty >= 1 ? qty : null;
  const price =
    Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : null;
  const total =
    quantity != null && price != null ? quantity * price : null;

  const optionTables = payload.includePage2
    ? payload.optTables
        .map((t) => {
          const rows = t.rows.filter((cells) =>
            cells.some((c) => c.trim().length > 0),
          );
          if (rows.length === 0 || t.columns.length === 0) return null;
          return {
            title: t.title.trim() || "Option Pricing Comparison",
            columns: t.columns,
            rows,
          };
        })
        .filter((t): t is NonNullable<typeof t> => t != null)
    : [];

  const volumeRows = payload.includePage2
    ? payload.volRows
        .map((r) => {
          const q = parseInt(r.qty, 10);
          const p = parseFloat(r.unitPrice);
          if (!Number.isInteger(q) || q < 1 || !Number.isFinite(p) || p < 0)
            return null;
          return { quantity: q, unitPrice: p };
        })
        .filter((r): r is { quantity: number; unitPrice: number } => r != null)
    : [];

  return (
    <div className="mx-auto max-w-[210mm] space-y-6">
      {/* Page 1 — quotation look */}
      <article
        className="bg-white text-gray-900 shadow-2xl rounded-sm overflow-hidden border border-gray-200"
        style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
      >
        <div className="p-8 sm:p-10 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/pacify-logo.png"
                alt="Pacify"
                className="h-16 w-16 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tracking-wide text-[#9C7A3C]">
                PACKAGING QUOTATION
              </p>
              <p className="text-xs text-gray-800 mt-2">
                Quote No: {payload.quoteNo}
              </p>
              <p className="text-xs text-gray-800">Date: {payload.dateStr}</p>
              <p className="text-xs text-gray-800">
                Valid Until: {payload.validStr}
              </p>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              PACIFY PACKAGING
            </h1>
            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
              +1 229 329 8221
              <br />
              info@pacifypackaging.com
              <br />
              www.pacifypackaging.com
            </p>
          </div>

          <div className="h-0.5 bg-[#9C7A3C]" />

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9C7A3C]">
              Bill To
            </p>
            <p className="text-base font-bold text-gray-900 mt-1.5">
              {payload.clientName.trim() || "—"}
            </p>
            {payload.clientEmail.trim() && (
              <p className="text-sm text-gray-500 mt-0.5">
                {payload.clientEmail.trim()}
              </p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9C7A3C]">
              Order Details —
            </p>
            <p className="text-lg font-bold text-gray-900 mt-1.5">
              {payload.orderTitle.trim() || "Custom Packaging Order"}
            </p>
          </div>

          {/* Pricing table */}
          <div className="border border-gray-300 overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wide">
              <div className="col-span-6 px-3 py-2.5">Description</div>
              <div className="col-span-2 px-2 py-2.5 text-center">Qty</div>
              <div className="col-span-2 px-2 py-2.5 text-center">Unit Price</div>
              <div className="col-span-2 px-2 py-2.5 text-center">Total</div>
            </div>
            <div className="grid grid-cols-12 border-t border-gray-300 text-sm">
              <div className="col-span-6 px-3 py-4 border-r border-gray-200">
                <p className="font-bold text-gray-900 mb-3">
                  {payload.orderTitle.trim() || "Custom Packaging Order"}
                </p>
                <ul className="space-y-2">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-[12px] leading-snug">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-900 shrink-0" />
                      <span>
                        <span className="font-bold text-gray-900">
                          {b.boldPrefix}{" "}
                        </span>
                        <span className="text-gray-600">{b.text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-span-2 px-2 py-4 text-center border-r border-gray-200 font-medium tabular-nums">
                {quantity != null ? quantity.toLocaleString("en-US") : "—"}
              </div>
              <div className="col-span-2 px-2 py-4 text-center border-r border-gray-200 font-medium tabular-nums">
                {price != null ? fmtMoney(price, payload.currency) : "—"}
              </div>
              <div className="col-span-2 px-2 py-4 text-center font-bold tabular-nums">
                {total != null ? fmtMoney(total, payload.currency) : "—"}
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between gap-6">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium tabular-nums">
                  {total != null ? fmtMoney(total, payload.currency) : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-6 border-t border-gray-200 pt-2">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-[#9C7A3C] tabular-nums text-base">
                  {total != null ? fmtMoney(total, payload.currency) : "—"}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 pt-4 border-t border-gray-100">
            This quotation is valid until the date shown above. Prices are subject
            to final artwork approval and production confirmation.
          </p>
        </div>
      </article>

      {/* Optional page 2 */}
      {(optionTables.length > 0 || volumeRows.length > 0) && (
        <article
          className="bg-white text-gray-900 shadow-2xl rounded-sm overflow-hidden border border-gray-200"
          style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
        >
          <div className="p-8 sm:p-10 space-y-8">
            <p className="text-sm font-bold tracking-wide text-[#9C7A3C]">
              PRICING OPTIONS
            </p>

            {optionTables.map((t, ti) => (
              <div key={ti}>
                <h3 className="text-sm font-bold text-gray-900 mb-3">{t.title}</h3>
                <div className="overflow-x-auto border border-gray-300">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-900 text-white">
                        {t.columns.map((c, ci) => (
                          <th
                            key={ci}
                            className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                          >
                            {c.trim() || "—"}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {t.rows.map((row, ri) => (
                        <tr
                          key={ri}
                          className={ri % 2 === 1 ? "bg-gray-50" : "bg-white"}
                        >
                          {t.columns.map((_, ci) => (
                            <td
                              key={ci}
                              className="px-3 py-2 border-t border-gray-200 text-gray-700"
                            >
                              {(row[ci] ?? "").trim() || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {volumeRows.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">
                  Volume Pricing
                </h3>
                <div className="overflow-x-auto border border-gray-300">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-900 text-white">
                        <th className="px-3 py-2 text-left">Quantity</th>
                        <th className="px-3 py-2 text-left">Per Unit</th>
                        <th className="px-3 py-2 text-left">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {volumeRows.map((r, i) => (
                        <tr
                          key={i}
                          className={i % 2 === 1 ? "bg-gray-50" : "bg-white"}
                        >
                          <td className="px-3 py-2 border-t border-gray-200">
                            {r.quantity.toLocaleString("en-US")}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-200 tabular-nums">
                            {fmtMoney(r.unitPrice, payload.currency)}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-200 font-semibold tabular-nums">
                            {fmtMoney(
                              r.quantity * r.unitPrice,
                              payload.currency,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </article>
      )}
    </div>
  );
}

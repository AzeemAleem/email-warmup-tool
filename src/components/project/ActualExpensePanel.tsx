"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  PAYMENT_METHODS,
  SHIP_TO_COUNTRIES,
} from "@/lib/project/countries";
import { formatPkrTotal, formatUsd, roundMoney } from "@/lib/cost/currency";

export interface ActualExpenseData {
  id?: string;
  totalAmountUsd: number | null;
  deductionUsd: number | null;
  remainingAmountUsd: number | null;
  usdRate: number;
  productionCostPkr: number | null;
  shippingCostPkr: number | null;
  totalWeightKg: number | null;
  shippingPerKgPkr: number | null;
  shipToCountry: string | null;
  totalExpensePkr: number | null;
  profitPkr: number | null;
  paymentMethod: string | null;
  notes: string | null;
}

const empty: ActualExpenseData = {
  totalAmountUsd: null,
  deductionUsd: null,
  remainingAmountUsd: null,
  usdRate: 280,
  productionCostPkr: null,
  shippingCostPkr: null,
  totalWeightKg: null,
  shippingPerKgPkr: null,
  shipToCountry: null,
  totalExpensePkr: null,
  profitPkr: null,
  paymentMethod: null,
  notes: null,
};

function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function fmtInput(n: number | null): string {
  if (n == null) return "";
  return String(n);
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-gray-600">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-pacify-gold/60 focus:outline-none focus:ring-1 focus:ring-pacify-gold/40 tabular-nums";

export function ActualExpensePanel({
  clientId,
  projectId,
  initial,
}: {
  clientId: string;
  projectId: string;
  initial: ActualExpenseData | null;
}) {
  const [form, setForm] = useState<ActualExpenseData>(initial ?? empty);
  const [remainingManual, setRemainingManual] = useState(
    initial?.remainingAmountUsd != null,
  );
  const [expenseManual, setExpenseManual] = useState(
    initial?.totalExpensePkr != null &&
      initial.productionCostPkr != null &&
      initial.shippingCostPkr != null
      ? Math.abs(
          (initial.totalExpensePkr ?? 0) -
            ((initial.productionCostPkr ?? 0) + (initial.shippingCostPkr ?? 0)),
        ) > 0.5
      : false,
  );
  const [perKgManual, setPerKgManual] = useState(
    initial?.shippingPerKgPkr != null,
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(!!initial);

  useEffect(() => {
    if (initial) return;
    fetch(`/api/clients/${clientId}/projects/${projectId}/expense`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setForm({
            ...empty,
            ...data,
            usdRate: data.usdRate > 0 ? data.usdRate : 280,
          });
          setRemainingManual(data.remainingAmountUsd != null);
        }
      })
      .finally(() => setLoaded(true));
  }, [clientId, projectId, initial]);

  // Auto remaining = total − deduction (unless user overrides)
  useEffect(() => {
    if (remainingManual) return;
    const total = form.totalAmountUsd;
    const ded = form.deductionUsd ?? 0;
    if (total == null) {
      setForm((f) => ({ ...f, remainingAmountUsd: null }));
      return;
    }
    setForm((f) => ({
      ...f,
      remainingAmountUsd: roundMoney(total - ded),
    }));
  }, [form.totalAmountUsd, form.deductionUsd, remainingManual]);

  // Auto total expense = production + shipping
  useEffect(() => {
    if (expenseManual) return;
    const prod = form.productionCostPkr;
    const ship = form.shippingCostPkr;
    if (prod == null && ship == null) {
      setForm((f) => ({ ...f, totalExpensePkr: null }));
      return;
    }
    setForm((f) => ({
      ...f,
      totalExpensePkr: roundMoney((prod ?? 0) + (ship ?? 0)),
    }));
  }, [form.productionCostPkr, form.shippingCostPkr, expenseManual]);

  // Auto per-kg = shipping / weight
  useEffect(() => {
    if (perKgManual) return;
    const ship = form.shippingCostPkr;
    const kg = form.totalWeightKg;
    if (ship == null || kg == null || kg <= 0) {
      setForm((f) => ({ ...f, shippingPerKgPkr: null }));
      return;
    }
    setForm((f) => ({
      ...f,
      shippingPerKgPkr: roundMoney(ship / kg),
    }));
  }, [form.shippingCostPkr, form.totalWeightKg, perKgManual]);

  const remainingPkr = useMemo(() => {
    if (form.remainingAmountUsd == null || !(form.usdRate > 0)) return null;
    return roundMoney(form.remainingAmountUsd * form.usdRate);
  }, [form.remainingAmountUsd, form.usdRate]);

  const autoProfit = useMemo(() => {
    if (remainingPkr == null || form.totalExpensePkr == null) return null;
    return roundMoney(remainingPkr - form.totalExpensePkr);
  }, [remainingPkr, form.totalExpensePkr]);

  const displayProfit = form.profitPkr ?? autoProfit;

  function setNum(
    key: keyof ActualExpenseData,
    raw: string,
    opts?: { remainingManual?: boolean; expenseManual?: boolean; perKgManual?: boolean },
  ) {
    if (opts?.remainingManual) setRemainingManual(true);
    if (opts?.expenseManual) setExpenseManual(true);
    if (opts?.perKgManual) setPerKgManual(true);
    setForm((f) => ({ ...f, [key]: parseNum(raw) }));
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        ...form,
        profitPkr: form.profitPkr ?? autoProfit,
        totalExpensePkr: form.totalExpensePkr,
        shippingPerKgPkr: form.shippingPerKgPkr,
      };
      const res = await fetch(
        `/api/clients/${clientId}/projects/${projectId}/expense`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error("save failed");
      const saved = await res.json();
      setForm({ ...empty, ...saved });
      setMsg("Actual expense saved");
    } catch {
      setMsg("Save failed — check database connection");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <p className="text-sm text-gray-500 py-4">Loading expense…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Actual expense</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Real costs after manufacturing — separate from estimates (calculations / invoices).
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save expense"}
        </button>
      </div>

      {msg && (
        <p
          className={clsx(
            "text-xs px-3 py-2 rounded-lg border",
            msg.includes("failed")
              ? "bg-red-900/30 border-red-700/50 text-red-300"
              : "bg-green-900/20 border-green-700/40 text-green-300",
          )}
        >
          {msg}
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Total amount (USD)">
          <input
            type="number"
            step="any"
            value={fmtInput(form.totalAmountUsd)}
            onChange={(e) => {
              setRemainingManual(false);
              setNum("totalAmountUsd", e.target.value);
            }}
            placeholder="450"
            className={inputCls}
          />
        </Field>
        <Field label="Deduction (USD)">
          <input
            type="number"
            step="any"
            value={fmtInput(form.deductionUsd)}
            onChange={(e) => {
              setRemainingManual(false);
              setNum("deductionUsd", e.target.value);
            }}
            placeholder="40.5"
            className={inputCls}
          />
        </Field>
        <Field
          label="Remaining amount (USD)"
          hint="Auto: total − deduction (editable)"
        >
          <input
            type="number"
            step="any"
            value={fmtInput(form.remainingAmountUsd)}
            onChange={(e) => setNum("remainingAmountUsd", e.target.value, { remainingManual: true })}
            placeholder="409.5"
            className={inputCls}
          />
          {remainingPkr != null && (
            <p className="text-[11px] text-pacify-gold/80 tabular-nums mt-1">
              ≈ {formatPkrTotal(remainingPkr)}
            </p>
          )}
        </Field>

        <Field label="USD rate (PKR per $1)">
          <input
            type="number"
            step="any"
            value={fmtInput(form.usdRate)}
            onChange={(e) => {
              const n = parseNum(e.target.value);
              setForm((f) => ({ ...f, usdRate: n != null && n > 0 ? n : f.usdRate }));
            }}
            className={inputCls}
          />
        </Field>

        <Field label="Production cost (PKR)">
          <input
            type="number"
            step="any"
            value={fmtInput(form.productionCostPkr)}
            onChange={(e) => {
              setExpenseManual(false);
              setNum("productionCostPkr", e.target.value);
            }}
            placeholder="90000"
            className={inputCls}
          />
        </Field>
        <Field label="Shipping cost (PKR)">
          <input
            type="number"
            step="any"
            value={fmtInput(form.shippingCostPkr)}
            onChange={(e) => {
              setExpenseManual(false);
              setPerKgManual(false);
              setNum("shippingCostPkr", e.target.value);
            }}
            placeholder="56000"
            className={inputCls}
          />
        </Field>

        <Field label="Total weight (kg)">
          <input
            type="number"
            step="any"
            value={fmtInput(form.totalWeightKg)}
            onChange={(e) => {
              setPerKgManual(false);
              setNum("totalWeightKg", e.target.value);
            }}
            placeholder="11"
            className={inputCls}
          />
        </Field>
        <Field label="Per kg shipping (PKR)" hint="Auto: shipping ÷ weight">
          <input
            type="number"
            step="any"
            value={fmtInput(form.shippingPerKgPkr)}
            onChange={(e) => setNum("shippingPerKgPkr", e.target.value, { perKgManual: true })}
            className={inputCls}
          />
        </Field>
        <Field label="Ship to">
          <select
            value={form.shipToCountry ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                shipToCountry: e.target.value || null,
              }))
            }
            className={inputCls}
          >
            <option value="">Select country…</option>
            {SHIP_TO_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Total expense (PKR)"
          hint="Auto: production + shipping"
        >
          <input
            type="number"
            step="any"
            value={fmtInput(form.totalExpensePkr)}
            onChange={(e) => setNum("totalExpensePkr", e.target.value, { expenseManual: true })}
            className={inputCls}
          />
        </Field>
        <Field label="Profit (PKR)" hint="Remaining (PKR) − total expense">
          <div
            className={clsx(
              "rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums",
              displayProfit != null && displayProfit < 0
                ? "border-red-700/50 bg-red-900/20 text-red-300"
                : "border-gray-700 bg-gray-800 text-green-300",
            )}
          >
            {displayProfit != null ? formatPkrTotal(displayProfit) : "—"}
          </div>
          <button
            type="button"
            className="text-[10px] text-gray-500 hover:text-gray-300 mt-1"
            onClick={() =>
              setForm((f) => ({ ...f, profitPkr: autoProfit }))
            }
          >
            Recalculate from remaining − expense
          </button>
        </Field>
        <Field label="Client paid via">
          <select
            value={form.paymentMethod ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                paymentMethod: e.target.value || null,
              }))
            }
            className={inputCls}
          >
            <option value="">Select…</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          value={form.notes ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          placeholder="Payment refs, carrier notes…"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-pacify-gold/60 focus:outline-none resize-none"
        />
      </Field>

      {/* Summary strip */}
      <div className="rounded-lg border border-pacify-gold/20 bg-pacify-forest/20 p-3 grid sm:grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-gray-500 uppercase text-[10px]">Remaining</p>
          <p className="text-white font-semibold tabular-nums mt-0.5">
            {form.remainingAmountUsd != null
              ? formatUsd(form.remainingAmountUsd)
              : "—"}
          </p>
          {remainingPkr != null && (
            <p className="text-gray-400 tabular-nums">{formatPkrTotal(remainingPkr)}</p>
          )}
        </div>
        <div>
          <p className="text-gray-500 uppercase text-[10px]">Total expense</p>
          <p className="text-white font-semibold tabular-nums mt-0.5">
            {form.totalExpensePkr != null
              ? formatPkrTotal(form.totalExpensePkr)
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 uppercase text-[10px]">Profit</p>
          <p
            className={clsx(
              "font-semibold tabular-nums mt-0.5",
              displayProfit != null && displayProfit < 0
                ? "text-red-400"
                : "text-pacify-gold",
            )}
          >
            {displayProfit != null ? formatPkrTotal(displayProfit) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

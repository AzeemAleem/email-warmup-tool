"use client";

import { useMemo, useState } from "react";
import {
  ClipboardDocumentIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import {
  calcMailerBox,
  convertLength,
  DEFAULT_OPTIONS,
  formatLength,
  fromMm,
  toMm,
  type LengthUnit,
  type MailerBoxResultAllUnits,
} from "@/lib/mailerBoxCalc";

const UNITS: LengthUnit[] = ["mm", "cm", "in"];

const UNIT_FULL: Record<LengthUnit, string> = {
  mm: "millimetres",
  cm: "centimetres",
  in: "inches",
};

type FieldKey = "length" | "width" | "height";

function parsePositive(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function fieldError(raw: string, touched: boolean): string | null {
  if (!touched && raw.trim() === "") return null;
  if (raw.trim() === "") return "Required";
  const n = Number(raw);
  if (Number.isNaN(n)) return "Must be a number";
  if (!Number.isFinite(n)) return "Invalid value";
  if (n === 0) return "Must be greater than zero";
  if (n < 0) return "Must be positive";
  return null;
}

function formatForInput(value: number, unit: LengthUnit): string {
  const decimals = unit === "in" ? 4 : 3;
  const rounded = Math.round(value * 10 ** decimals) / 10 ** decimals;
  return String(parseFloat(rounded.toFixed(decimals)));
}

export default function MailerBoxCalculatorPage() {
  const [unit, setUnit] = useState<LengthUnit>("in");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    length: false,
    width: false,
    height: false,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [foldAllowanceMm, setFoldAllowanceMm] = useState(
    DEFAULT_OPTIONS.foldAllowanceMm,
  );
  const [foldInput, setFoldInput] = useState(() =>
    formatForInput(fromMm(DEFAULT_OPTIONS.foldAllowanceMm, "in"), "in"),
  );
  const [copied, setCopied] = useState(false);

  function switchUnit(next: LengthUnit) {
    if (next === unit) return;

    const convertField = (raw: string) => {
      const n = parsePositive(raw);
      if (n == null) return raw;
      return formatForInput(convertLength(n, unit, next), next);
    };

    setLength((v) => convertField(v));
    setWidth((v) => convertField(v));
    setHeight((v) => convertField(v));
    setFoldInput(formatForInput(fromMm(foldAllowanceMm, next), next));
    setUnit(next);
  }

  function updateFoldAllowance(raw: string) {
    setFoldInput(raw);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    setFoldAllowanceMm(toMm(n, unit));
  }

  const L = parsePositive(length);
  const W = parsePositive(width);
  const H = parsePositive(height);

  const result: MailerBoxResultAllUnits | null = useMemo(() => {
    if (L == null || W == null || H == null) return null;
    if (!Number.isFinite(foldAllowanceMm) || foldAllowanceMm < 0) return null;
    return calcMailerBox(
      { length: L, width: W, height: H },
      unit,
      { foldAllowanceMm },
    );
  }, [L, W, H, unit, foldAllowanceMm]);

  const errors = {
    length: fieldError(length, touched.length),
    width: fieldError(width, touched.width),
    height: fieldError(height, touched.height),
  };

  function reset() {
    setLength("");
    setWidth("");
    setHeight("");
    setTouched({ length: false, width: false, height: false });
    setFoldAllowanceMm(DEFAULT_OPTIONS.foldAllowanceMm);
    setFoldInput(
      formatForInput(fromMm(DEFAULT_OPTIONS.foldAllowanceMm, unit), unit),
    );
    setCopied(false);
  }

  async function copyResult() {
    if (!result) return;
    const primary = result[unit];
    const text = [
      `RETT Mailer Box Open Size (${unit})`,
      `Open Width:  ${formatLength(primary.openWidth, unit)} ${unit}`,
      `Open Height: ${formatLength(primary.openHeight, unit)} ${unit}`,
      "",
      `mm:  ${formatLength(result.mm.openWidth, "mm")} × ${formatLength(result.mm.openHeight, "mm")}`,
      `cm:  ${formatLength(result.cm.openWidth, "cm")} × ${formatLength(result.cm.openHeight, "cm")}`,
      `in:  ${formatLength(result.in.openWidth, "in")} × ${formatLength(result.in.openHeight, "in")}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const inputCls = (hasError: boolean) =>
    clsx(
      "w-full px-3 py-2.5 bg-gray-800 border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1",
      hasError
        ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
        : "border-gray-700 focus:border-indigo-500 focus:ring-indigo-500/30",
    );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Mailer Box Calculator</h1>
        <p className="text-sm text-gray-400 mt-1">
          Enter closed RETT mailer dimensions (double side walls) to get the flat
          die-cut open size.
        </p>
      </div>

      {/* Unit selector */}
      <Card>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Unit
        </p>
        <div className="inline-flex rounded-lg border border-gray-700 bg-gray-800/60 p-1 gap-1">
          {UNITS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => switchUnit(u)}
              className={clsx(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                unit === u
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50",
              )}
            >
              {u}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Values convert automatically when you switch units ({UNIT_FULL[unit]}).
        </p>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-sm font-semibold text-white mb-4">
          Closed box dimensions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              {
                key: "length" as const,
                label: "Length (L)",
                hint: "Long side of base",
                value: length,
                set: setLength,
              },
              {
                key: "width" as const,
                label: "Width (W)",
                hint: "Short side / depth",
                value: width,
                set: setWidth,
              },
              {
                key: "height" as const,
                label: "Height (H)",
                hint: "Wall height",
                value: height,
                set: setHeight,
              },
            ] as const
          ).map(({ key, label, hint, value, set }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                {label}{" "}
                <span className="text-gray-600">({unit})</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, [key]: true }))}
                  className={inputCls(!!errors[key])}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 pointer-events-none">
                  {unit}
                </span>
              </div>
              {errors[key] ? (
                <p className="mt-1 text-xs text-red-400">{errors[key]}</p>
              ) : (
                <p className="mt-1 text-[11px] text-gray-600">{hint}</p>
              )}
            </div>
          ))}
        </div>

        {/* Advanced — fold allowance */}
        <div className="mt-5 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ChevronDownIcon
              className={clsx(
                "h-3.5 w-3.5 transition-transform",
                showAdvanced && "rotate-180",
              )}
            />
            Advanced settings
          </button>
          {showAdvanced && (
            <div className="mt-3 max-w-xs">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Fold allowance ({unit})
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={foldInput}
                onChange={(e) => updateFoldAllowance(e.target.value)}
                className={inputCls(false)}
              />
              <p className="mt-1 text-[11px] text-gray-600">
                Default{" "}
                {formatLength(fromMm(DEFAULT_OPTIONS.foldAllowanceMm, unit), unit)}{" "}
                {unit} (13 mm). Added to open width only.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Results */}
      <Card>
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-white">Open size (flat sheet)</h2>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={copyResult}
              disabled={!result}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {copied ? (
                <>
                  <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                  Copy result
                </>
              )}
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        {!result ? (
          <p className="text-sm text-gray-600 py-6 text-center">
            Enter positive Length, Width, and Height to see the open size.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-4">
                <p className="text-xs font-medium text-indigo-300/70 uppercase tracking-wide">
                  Open Width
                </p>
                <p className="mt-1 text-3xl font-bold text-indigo-300 tabular-nums">
                  {formatLength(result[unit].openWidth, unit)}
                  <span className="text-base font-medium text-indigo-400/70 ml-1.5">
                    {unit}
                  </span>
                </p>
                <p className="text-[11px] text-gray-600 mt-1">
                  L + 4H + fold allowance
                </p>
              </div>
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-4">
                <p className="text-xs font-medium text-cyan-300/70 uppercase tracking-wide">
                  Open Height
                </p>
                <p className="mt-1 text-3xl font-bold text-cyan-300 tabular-nums">
                  {formatLength(result[unit].openHeight, unit)}
                  <span className="text-base font-medium text-cyan-400/70 ml-1.5">
                    {unit}
                  </span>
                </p>
                <p className="text-[11px] text-gray-600 mt-1">2W + 3H</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-800/40">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Unit
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Open Width
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Open Height
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {UNITS.map((u) => (
                    <tr
                      key={u}
                      className={clsx(u === unit && "bg-indigo-500/5")}
                    >
                      <td className="px-3 py-2 text-gray-400 font-medium">{u}</td>
                      <td className="px-3 py-2 text-right text-white tabular-nums">
                        {formatLength(result[u].openWidth, u)}
                      </td>
                      <td className="px-3 py-2 text-right text-white tabular-nums">
                        {formatLength(result[u].openHeight, u)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <FlatLayoutPreview
              openWidth={result[unit].openWidth}
              openHeight={result[unit].openHeight}
              unit={unit}
              length={L!}
              width={W!}
              height={H!}
              foldAllowance={fromMm(foldAllowanceMm, unit)}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

/** Simplified RETT dieline: width = H+H+L+H+H (+fold), height = H+W+H+W+H */
function FlatLayoutPreview({
  openWidth,
  openHeight,
  unit,
  length,
  width,
  height,
  foldAllowance,
}: {
  openWidth: number;
  openHeight: number;
  unit: LengthUnit;
  length: number;
  width: number;
  height: number;
  foldAllowance: number;
}) {
  const vbW = 340;
  const vbH = 240;
  const pad = 30;

  // Draw without fold strip so panels stay proportional; fold labelled separately
  const panelW = length + 4 * height;
  const panelH = 2 * width + 3 * height;
  const scale = Math.min(
    (vbW - pad * 2) / panelW,
    (vbH - pad * 2) / panelH,
  );
  const rw = panelW * scale;
  const rh = panelH * scale;
  const ox = (vbW - rw) / 2;
  const oy = (vbH - rh) / 2;
  const s = (v: number) => v * scale;

  // Horizontal: H | H | L | H | H
  const x1 = ox + s(height);
  const x2 = x1 + s(height);
  const x3 = x2 + s(length);
  const x4 = x3 + s(height);

  // Vertical: H | W | H | W | H
  const y1 = oy + s(height);
  const y2 = y1 + s(width);
  const y3 = y2 + s(height);
  const y4 = y3 + s(width);

  const fmt = (v: number) => formatLength(v, unit);

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        Flat layout preview
      </p>
      <div className="rounded-lg bg-gray-950 border border-gray-800 p-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="w-full max-w-lg mx-auto h-auto"
          role="img"
          aria-label={`Flat sheet ${fmt(openWidth)} by ${fmt(openHeight)} ${unit}`}
        >
          <rect
            x={ox}
            y={oy}
            width={rw}
            height={rh}
            fill="#1e1b4b"
            stroke="#6366f1"
            strokeWidth={1.5}
            rx={2}
          />

          {[x1, x2, x3, x4].map((x, i) => (
            <line
              key={`v${i}`}
              x1={x}
              y1={oy}
              x2={x}
              y2={oy + rh}
              stroke="#4f46e5"
              strokeWidth={1}
              strokeDasharray="3 2"
              opacity={0.7}
            />
          ))}
          {[y1, y2, y3, y4].map((y, i) => (
            <line
              key={`h${i}`}
              x1={ox}
              y1={y}
              x2={ox + rw}
              y2={y}
              stroke="#4f46e5"
              strokeWidth={1}
              strokeDasharray="3 2"
              opacity={0.7}
            />
          ))}

          {/* Base panel highlight */}
          <rect
            x={x2}
            y={y1}
            width={s(length)}
            height={s(width)}
            fill="#6366f1"
            opacity={0.25}
          />

          <text
            x={ox + rw / 2}
            y={oy - 8}
            textAnchor="middle"
            className="fill-indigo-300"
            style={{ fontSize: 10 }}
          >
            {fmt(openWidth)} {unit}
          </text>
          <text
            x={ox - 10}
            y={oy + rh / 2}
            textAnchor="middle"
            className="fill-cyan-300"
            style={{ fontSize: 10 }}
            transform={`rotate(-90 ${ox - 10} ${oy + rh / 2})`}
          >
            {fmt(openHeight)} {unit}
          </text>

          {s(length) > 20 && s(width) > 14 && (
            <text
              x={x2 + s(length) / 2}
              y={y1 + s(width) / 2 + 3}
              textAnchor="middle"
              className="fill-gray-300"
              style={{ fontSize: 9 }}
            >
              L×W
            </text>
          )}
        </svg>
      </div>
      <p className="text-[11px] text-gray-600 mt-2">
        Width: H + H + L + H + H + fold ({fmt(foldAllowance)} {unit})
        {" · "}
        Height: H + W + H + W + H
      </p>
    </div>
  );
}

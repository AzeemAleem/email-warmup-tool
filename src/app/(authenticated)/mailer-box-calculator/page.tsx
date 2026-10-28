"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardDocumentIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import { SheetOptimization } from "@/components/mailer/SheetOptimization";
import {
  CostTotalsStickyBar,
  CostTotalsSummary,
} from "@/components/cost/CostTotalsSummary";
import { MailerCostCalculation } from "@/components/cost/MailerCostCalculation";
import {
  calcMailerBox,
  convertLength,
  DEFAULT_OPTIONS,
  formatLength,
  fromMm,
  openSizeToAllUnits,
  toMm,
  type LengthUnit,
  type MailerBoxResultAllUnits,
} from "@/lib/mailerBoxCalc";
import {
  DEFAULT_MAILER_COST_CONFIG,
  type MailerCostConfig,
  type MailerMaterialType,
} from "@/lib/cost/mailerCostConfig";
import {
  runMailerCostEngine,
  type MailerCostEngineResult,
} from "@/lib/cost/mailerCostEngine";
import { parseExtraTotal } from "@/lib/cost/items/extraCost";
import { downloadMailerCostImage } from "@/lib/cost/exportCostImage";
import { parseQuantity, quantityError } from "@/lib/cost/costEngine";
import { recommendSheet } from "@/lib/sheetNesting";
import { ALL_SHEETS, sheetKey } from "@/lib/sheetSizes";

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
  const [showFoldAdvanced, setShowFoldAdvanced] = useState(false);
  const [foldAllowanceMm, setFoldAllowanceMm] = useState(
    DEFAULT_OPTIONS.foldAllowanceMm,
  );
  const [foldInput, setFoldInput] = useState(() =>
    formatForInput(fromMm(DEFAULT_OPTIONS.foldAllowanceMm, "in"), "in"),
  );
  const [paddingWIn, setPaddingWIn] = useState(DEFAULT_OPTIONS.paddingWIn ?? 1);
  const [paddingHIn, setPaddingHIn] = useState(DEFAULT_OPTIONS.paddingHIn ?? 1);
  const [paddingWInput, setPaddingWInput] = useState(
    String(DEFAULT_OPTIONS.paddingWIn ?? 1),
  );
  const [paddingHInput, setPaddingHInput] = useState(
    String(DEFAULT_OPTIONS.paddingHIn ?? 1),
  );
  const [copied, setCopied] = useState(false);
  const [openOverride, setOpenOverride] = useState(false);
  const [openWidthRaw, setOpenWidthRaw] = useState("");
  const [openHeightRaw, setOpenHeightRaw] = useState("");

  // Cost calculation state
  const [quantityRaw, setQuantityRaw] = useState("");
  const [quantityTouched, setQuantityTouched] = useState(false);
  const [profitRatioRaw, setProfitRatioRaw] = useState("");
  const [extraRaw, setExtraRaw] = useState("");
  const [clientName, setClientName] = useState("");
  const [mailerCostConfig, setMailerCostConfig] = useState<MailerCostConfig>(() => ({
    ...DEFAULT_MAILER_COST_CONFIG,
  }));
  const [materialType, setMaterialType] = useState<MailerMaterialType>("cardboard");
  const [laminationSides, setLaminationSides] = useState(1);
  const [printColorMode, setPrintColorMode] = useState<"one" | "cmyk">("cmyk");
  const [totalSheetsOverride, setTotalSheetsOverride] = useState(false);
  const [totalSheetsManualRaw, setTotalSheetsManualRaw] = useState("");
  const [stockOverride, setStockOverride] = useState(false);
  const [stockManualRaw, setStockManualRaw] = useState("");
  const [laminationOverride, setLaminationOverride] = useState(false);
  const [laminationManualRaw, setLaminationManualRaw] = useState("");
  const [platesOverride, setPlatesOverride] = useState(false);
  const [platesManualRaw, setPlatesManualRaw] = useState("");
  const [printingOverride, setPrintingOverride] = useState(false);
  const [printingManualRaw, setPrintingManualRaw] = useState("");
  const [dieOverride, setDieOverride] = useState(false);
  const [dieManualRaw, setDieManualRaw] = useState("");
  const [cuttingOverride, setCuttingOverride] = useState(false);
  const [cuttingManualRaw, setCuttingManualRaw] = useState("");
  const [pastingOverride, setPastingOverride] = useState(false);
  const [pastingManualRaw, setPastingManualRaw] = useState("");
  const [corrugationOverride, setCorrugationOverride] = useState(false);
  const [corrugationManualRaw, setCorrugationManualRaw] = useState("");
  const [shippingOverride, setShippingOverride] = useState(false);
  const [shippingManualRaw, setShippingManualRaw] = useState("");
  const [artSheetKeyOverride, setArtSheetKeyOverride] = useState<string | null>(null);

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
    setOpenWidthRaw((v) => convertField(v));
    setOpenHeightRaw((v) => convertField(v));
    setFoldInput(formatForInput(fromMm(foldAllowanceMm, next), next));
    setUnit(next);
  }

  function updateFoldAllowance(raw: string) {
    setFoldInput(raw);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    setFoldAllowanceMm(toMm(n, unit));
  }

  function updatePadding(axis: "w" | "h", raw: string) {
    if (axis === "w") setPaddingWInput(raw);
    else setPaddingHInput(raw);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    if (axis === "w") setPaddingWIn(n);
    else setPaddingHIn(n);
  }

  const L = parsePositive(length);
  const W = parsePositive(width);
  const H = parsePositive(height);

  const calculated: MailerBoxResultAllUnits | null = useMemo(() => {
    if (L == null || W == null || H == null) return null;
    if (!Number.isFinite(foldAllowanceMm) || foldAllowanceMm < 0) return null;
    return calcMailerBox(
      { length: L, width: W, height: H },
      unit,
      { foldAllowanceMm },
    );
  }, [L, W, H, unit, foldAllowanceMm]);

  useEffect(() => {
    if (!calculated || openOverride) return;
    setOpenWidthRaw(formatForInput(calculated[unit].openWidth, unit));
    setOpenHeightRaw(formatForInput(calculated[unit].openHeight, unit));
  }, [calculated, unit, openOverride]);

  const effectiveOpen: MailerBoxResultAllUnits | null = useMemo(() => {
    if (openOverride) {
      const w = parsePositive(openWidthRaw);
      const h = parsePositive(openHeightRaw);
      if (w == null || h == null) return null;
      return openSizeToAllUnits(toMm(w, unit), toMm(h, unit));
    }
    return calculated;
  }, [openOverride, openWidthRaw, openHeightRaw, unit, calculated]);

  const result = effectiveOpen;

  const quantity = parseQuantity(quantityRaw);
  const profitRatio = (() => {
    const t = profitRatioRaw.trim();
    if (t === "") return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  })();

  // Sheet nesting for cost calculation
  const nestingPiece = useMemo(() => {
    if (!result) return null;
    return {
      widthIn: result.in.openWidth + paddingWIn,
      heightIn: result.in.openHeight + paddingHIn,
    };
  }, [result, paddingWIn, paddingHIn]);

  const nestingRecommendation = useMemo(() => {
    if (!nestingPiece) return null;
    return recommendSheet(nestingPiece, ALL_SHEETS);
  }, [nestingPiece]);

  // Drop manual sheet if it no longer fits
  useEffect(() => {
    if (!artSheetKeyOverride || !nestingRecommendation) {
      if (!nestingRecommendation) setArtSheetKeyOverride(null);
      return;
    }
    const stillFits = nestingRecommendation.allResults.some(
      (r) => r.fits && sheetKey(r.sheet) === artSheetKeyOverride,
    );
    if (!stillFits) setArtSheetKeyOverride(null);
  }, [nestingRecommendation, artSheetKeyOverride]);

  const nestingSheetSelection = useMemo(() => {
    if (!nestingRecommendation) return null;
    let nest = nestingRecommendation.recommended;
    if (artSheetKeyOverride) {
      const found = nestingRecommendation.allResults.find(
        (r) => r.fits && sheetKey(r.sheet) === artSheetKeyOverride,
      );
      if (found) nest = found;
    }
    if (!nest) return null;
    return {
      width: nest.sheet.width,
      height: nest.sheet.height,
      piecesPerSheet: nest.pieces,
    };
  }, [nestingRecommendation, artSheetKeyOverride]);

  const autoTotalSheets = useMemo(() => {
    if (quantity == null) return null;
    if (totalSheetsOverride) {
      const n = Number(totalSheetsManualRaw);
      if (Number.isInteger(n) && n >= 1) return n;
    }
    // outside (qty) + inside (qty) + 200 extra
    return quantity * 2 + 200;
  }, [quantity, totalSheetsOverride, totalSheetsManualRaw]);

  function parseManualTotal(override: boolean, raw: string): number | null {
    if (!override) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100) / 100;
  }

  // Cost engine result
  const costResult: MailerCostEngineResult | null = useMemo(() => {
    if (!result) return null;
    if (quantity == null) return null;

    const parseTotalSheetsManual = () => {
      if (!totalSheetsOverride) return null;
      const n = Number(totalSheetsManualRaw);
      if (!Number.isInteger(n) || n < 1) return null;
      return n;
    };

    return runMailerCostEngine(
      result.in.openWidth,
      result.in.openHeight,
      quantity,
      nestingSheetSelection?.piecesPerSheet ?? null,
      {
        ...mailerCostConfig,
        stock: { ...mailerCostConfig.stock, materialType },
      },
      {
        totalSheetsOverride: parseTotalSheetsManual(),
        laminationSides,
        stockManualTotal: parseManualTotal(stockOverride, stockManualRaw),
        laminationManualTotal: parseManualTotal(
          laminationOverride,
          laminationManualRaw,
        ),
        platesManualTotal: parseManualTotal(platesOverride, platesManualRaw),
        printingManualTotal: parseManualTotal(
          printingOverride,
          printingManualRaw,
        ),
        dieManualTotal: parseManualTotal(dieOverride, dieManualRaw),
        cuttingManualTotal: parseManualTotal(cuttingOverride, cuttingManualRaw),
        pastingManualTotal: parseManualTotal(pastingOverride, pastingManualRaw),
        corrugationManualTotal: parseManualTotal(
          corrugationOverride,
          corrugationManualRaw,
        ),
        shippingManualTotal: parseManualTotal(
          shippingOverride,
          shippingManualRaw,
        ),
        extraTotal: parseExtraTotal(extraRaw),
        printColorMode,
      },
    );
  }, [
    result,
    quantity,
    nestingSheetSelection,
    mailerCostConfig,
    materialType,
    laminationSides,
    printColorMode,
    totalSheetsOverride,
    totalSheetsManualRaw,
    stockOverride,
    stockManualRaw,
    laminationOverride,
    laminationManualRaw,
    platesOverride,
    platesManualRaw,
    printingOverride,
    printingManualRaw,
    dieOverride,
    dieManualRaw,
    cuttingOverride,
    cuttingManualRaw,
    pastingOverride,
    pastingManualRaw,
    corrugationOverride,
    corrugationManualRaw,
    shippingOverride,
    shippingManualRaw,
    extraRaw,
  ]);

  const errors = {
    length: fieldError(length, touched.length),
    width: fieldError(width, touched.width),
    height: fieldError(height, touched.height),
    quantity: quantityError(quantityRaw, quantityTouched),
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
    setPaddingWIn(DEFAULT_OPTIONS.paddingWIn ?? 1);
    setPaddingHIn(DEFAULT_OPTIONS.paddingHIn ?? 1);
    setPaddingWInput(String(DEFAULT_OPTIONS.paddingWIn ?? 1));
    setPaddingHInput(String(DEFAULT_OPTIONS.paddingHIn ?? 1));
    setCopied(false);
    setOpenOverride(false);
    setOpenWidthRaw("");
    setOpenHeightRaw("");
    setQuantityRaw("");
    setQuantityTouched(false);
    setProfitRatioRaw("");
    setExtraRaw("");
    setClientName("");
    setMailerCostConfig({ ...DEFAULT_MAILER_COST_CONFIG });
    setMaterialType("cardboard");
    setLaminationSides(1);
    setPrintColorMode("cmyk");
    setTotalSheetsOverride(false);
    setTotalSheetsManualRaw("");
    setStockOverride(false);
    setStockManualRaw("");
    setLaminationOverride(false);
    setLaminationManualRaw("");
    setPlatesOverride(false);
    setPlatesManualRaw("");
    setPrintingOverride(false);
    setPrintingManualRaw("");
    setDieOverride(false);
    setDieManualRaw("");
    setCuttingOverride(false);
    setCuttingManualRaw("");
    setPastingOverride(false);
    setPastingManualRaw("");
    setCorrugationOverride(false);
    setCorrugationManualRaw("");
    setShippingOverride(false);
    setShippingManualRaw("");
    setArtSheetKeyOverride(null);
  }

  function clearOpenOverride() {
    setOpenOverride(false);
    if (calculated) {
      setOpenWidthRaw(formatForInput(calculated[unit].openWidth, unit));
      setOpenHeightRaw(formatForInput(calculated[unit].openHeight, unit));
    }
  }

  async function copyResult() {
    if (!result) return;
    const primary = result[unit];
    const text = [
      `RETT Mailer Box Open Size (${unit})${openOverride ? " [manual override]" : ""}`,
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

  const showStickyTotals =
    result != null &&
    quantity != null &&
    costResult != null &&
    L != null &&
    W != null &&
    H != null;

  return (
    <div
      className={clsx(
        "flex flex-col xl:flex-row gap-6",
        showStickyTotals && "pb-24 xl:pb-0",
      )}
    >
      <div className="flex-1 min-w-0 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-xl font-semibold text-white">Mailer Box Calculator</h1>
          <p className="text-sm text-gray-400 mt-1">
            Enter closed RETT mailer dimensions (double side walls) to get the flat
            die-cut open size, then calculate production cost.
          </p>
        </div>

        {/* Closed box dimensions & Cost inputs */}
        <Card>
          <h2 className="text-sm font-semibold text-white mb-4">
            Closed Box Dimensions & Cost Settings
          </h2>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Client name
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Acme Packaging Co."
              className={inputCls(false)}
            />
            <p className="mt-1 text-[11px] text-gray-600">
              Included on the PNG quote export
            </p>
          </div>

          {/* Top row: Unit, Material, Lamination, USD Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                Unit
              </p>
              <div className="inline-flex rounded-lg border border-gray-700 bg-gray-800/60 p-1 gap-1 w-full">
                {UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => switchUnit(u)}
                    className={clsx(
                      "flex-1 py-1.5 rounded-md text-sm font-medium transition-colors",
                      unit === u
                        ? "seg-selected"
                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50",
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Values auto-convert ({UNIT_FULL[unit]})
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Material Type
              </label>
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value as MailerMaterialType)}
                className={inputCls(false)}
              >
                <option value="cardboard">Cardboard ({mailerCostConfig.stock.cardboardRate} PKR)</option>
                <option value="kraft">Kraft ({mailerCostConfig.stock.kraftRate} PKR)</option>
              </select>
              <p className="mt-1 text-[11px] text-gray-600">Default: Cardboard</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Lamination Sides
              </label>
              <select
                value={laminationSides}
                onChange={(e) => setLaminationSides(Number(e.target.value))}
                className={inputCls(false)}
              >
                <option value={0}>0 (None)</option>
                <option value={1}>1 Side</option>
                <option value={2}>2 Sides</option>
              </select>
              <p className="mt-1 text-[11px] text-gray-600">Default: 1 side</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                USD Rate (PKR)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="1"
                min="0"
                value={mailerCostConfig.fx.usdRate}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n > 0) {
                    setMailerCostConfig((c) => ({
                      ...c,
                      fx: { ...c.fx, usdRate: n },
                    }));
                  }
                }}
                className={inputCls(false)}
              />
              <p className="mt-1 text-[11px] text-gray-600">Default: 275</p>
            </div>
          </div>

          {/* Box dimensions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Length ({unit}) *
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                placeholder={unit === "in" ? "12" : unit === "cm" ? "30" : "300"}
                value={length}
                onChange={(e) => setLength(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, length: true }))}
                className={inputCls(!!errors.length)}
              />
              {errors.length && (
                <p className="mt-1 text-xs text-red-400">{errors.length}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Width ({unit}) *
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                placeholder={unit === "in" ? "9" : unit === "cm" ? "23" : "230"}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, width: true }))}
                className={inputCls(!!errors.width)}
              />
              {errors.width && (
                <p className="mt-1 text-xs text-red-400">{errors.width}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Height ({unit}) *
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                placeholder={unit === "in" ? "3" : unit === "cm" ? "7.5" : "75"}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, height: true }))}
                className={inputCls(!!errors.height)}
              />
              {errors.height && (
                <p className="mt-1 text-xs text-red-400">{errors.height}</p>
              )}
            </div>
          </div>

          {/* Cost settings row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Stock GSM
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="1"
                min="0"
                value={mailerCostConfig.stock.gsm}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n > 0) {
                    setMailerCostConfig((c) => ({
                      ...c,
                      stock: { ...c.stock, gsm: n },
                    }));
                  }
                }}
                className={inputCls(false)}
              />
              <p className="mt-1 text-[11px] text-gray-600">Default: 350</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Quantity *
              </label>
              <input
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                placeholder="e.g. 500"
                value={quantityRaw}
                onChange={(e) => setQuantityRaw(e.target.value)}
                onBlur={() => setQuantityTouched(true)}
                className={inputCls(!!errors.quantity)}
              />
              {errors.quantity ? (
                <p className="mt-1 text-xs text-red-400">{errors.quantity}</p>
              ) : (
                <p className="mt-1 text-[11px] text-gray-600">Required for cost</p>
              )}
            </div>
          </div>

          {/* Profit ratio + Extra */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Profit Ratio (optional)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="1"
                placeholder="e.g. 1.3 for 30% markup"
                value={profitRatioRaw}
                onChange={(e) => setProfitRatioRaw(e.target.value)}
                className={inputCls(false)}
              />
              <p className="mt-1 text-[11px] text-gray-600">
                Leave empty or enter multiplier (e.g., 1.3 = 30% profit)
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Extra (PKR)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="1"
                min="0"
                placeholder="e.g. 5000"
                value={extraRaw}
                onChange={(e) => setExtraRaw(e.target.value)}
                className={inputCls(false)}
              />
              <p className="mt-1 text-[11px] text-gray-600">
                Optional lump sum added into production cost
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </Card>

        {/* Fold / nesting advanced */}
        <Card>
          <button
            type="button"
            onClick={() => setShowFoldAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ChevronDownIcon
              className={clsx(
                "h-3.5 w-3.5 transition-transform",
                showFoldAdvanced && "rotate-180",
              )}
            />
            Fold & nesting settings
          </button>
          {showFoldAdvanced && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
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
                  {unit} (13 mm). Open width only.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Nesting padding W (in)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={paddingWInput}
                  onChange={(e) => updatePadding("w", e.target.value)}
                  className={inputCls(false)}
                />
                <p className="mt-1 text-[11px] text-gray-600">
                  Default {DEFAULT_OPTIONS.paddingWIn ?? 1} in
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Nesting padding H (in)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={paddingHInput}
                  onChange={(e) => updatePadding("h", e.target.value)}
                  className={inputCls(false)}
                />
                <p className="mt-1 text-[11px] text-gray-600">
                  Default {DEFAULT_OPTIONS.paddingHIn ?? 1} in
                </p>
              </div>
            </div>
          )}
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

        {!calculated ? (
          <p className="text-sm text-gray-600 py-6 text-center">
            Enter positive Length, Width, and Height to see the open size.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                Calculated from closed size — edit below to override. Sheet nesting
                uses the effective open size.
              </p>
              {openOverride && (
                <button
                  type="button"
                  onClick={clearOpenOverride}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 transition-colors"
                >
                  <ArrowPathIcon className="h-3.5 w-3.5" />
                  Use calculated
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className={clsx(
                  "rounded-lg p-4 border",
                  openOverride
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-indigo-500/10 border-indigo-500/20",
                )}
              >
                <label className="text-xs font-medium text-indigo-300/70 uppercase tracking-wide">
                  Open Width
                </label>
                <div className="mt-1.5 relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={openWidthRaw}
                    onChange={(e) => {
                      setOpenOverride(true);
                      setOpenWidthRaw(e.target.value);
                    }}
                    className={clsx(
                      "w-full px-3 py-2 bg-gray-900/60 border rounded-lg text-2xl font-bold tabular-nums focus:outline-none focus:ring-1",
                      openOverride
                        ? "border-amber-500/40 text-amber-200 focus:border-amber-400 focus:ring-amber-500/30"
                        : "border-indigo-500/30 text-indigo-300 focus:border-indigo-400 focus:ring-indigo-500/30",
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                    {unit}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1.5">
                  Formula: L + 4H + fold allowance →{" "}
                  {formatLength(calculated[unit].openWidth, unit)} {unit}
                </p>
              </div>
              <div
                className={clsx(
                  "rounded-lg p-4 border",
                  openOverride
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-cyan-500/10 border-cyan-500/20",
                )}
              >
                <label className="text-xs font-medium text-cyan-300/70 uppercase tracking-wide">
                  Open Height
                </label>
                <div className="mt-1.5 relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={openHeightRaw}
                    onChange={(e) => {
                      setOpenOverride(true);
                      setOpenHeightRaw(e.target.value);
                    }}
                    className={clsx(
                      "w-full px-3 py-2 bg-gray-900/60 border rounded-lg text-2xl font-bold tabular-nums focus:outline-none focus:ring-1",
                      openOverride
                        ? "border-amber-500/40 text-amber-200 focus:border-amber-400 focus:ring-amber-500/30"
                        : "border-cyan-500/30 text-cyan-300 focus:border-cyan-400 focus:ring-cyan-500/30",
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                    {unit}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1.5">
                  Formula: 2W + 3H →{" "}
                  {formatLength(calculated[unit].openHeight, unit)} {unit}
                </p>
              </div>
            </div>

            {result ? (
              <p className="text-sm text-gray-400">
                Effective:{" "}
                <span className="text-white font-semibold tabular-nums">
                  {formatLength(result[unit].openWidth, unit)} ×{" "}
                  {formatLength(result[unit].openHeight, unit)} {unit}
                </span>
                {openOverride && (
                  <span className="ml-2 text-amber-300/80 text-xs font-medium">
                    (manual override)
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-amber-300/90">
                Enter positive open width and height to continue.
              </p>
            )}

            {result && (
              <>
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
              </>
            )}
          </div>
        )}
      </Card>

        {/* Production Cost — section cards like rigid box */}
        {result && quantity == null && (
          <Card>
            <h2 className="text-sm font-semibold text-white mb-2">Production Cost</h2>
            <p className="text-sm text-amber-300/90 py-4 text-center">
              Enter quantity in the top section to calculate Stock, Lamination,
              Plates, Printing, Die, Cutting, Pasting, Corrugation & Shipping.
            </p>
          </Card>
        )}

        {result && quantity != null && costResult && autoTotalSheets != null && (
          <MailerCostCalculation
            result={costResult}
            quantity={quantity}
            config={{
              ...mailerCostConfig,
              stock: { ...mailerCostConfig.stock, materialType },
            }}
            onConfigChange={setMailerCostConfig}
            autoTotalSheets={autoTotalSheets}
            totalSheetsOverride={totalSheetsOverride}
            totalSheetsManualRaw={totalSheetsManualRaw}
            onTotalSheetsOverrideChange={setTotalSheetsOverride}
            onTotalSheetsManualRawChange={setTotalSheetsManualRaw}
            stock={{
              override: stockOverride,
              manualRaw: stockManualRaw,
              onOverrideChange: setStockOverride,
              onManualRawChange: setStockManualRaw,
            }}
            lamination={{
              override: laminationOverride,
              manualRaw: laminationManualRaw,
              onOverrideChange: setLaminationOverride,
              onManualRawChange: setLaminationManualRaw,
            }}
            plates={{
              override: platesOverride,
              manualRaw: platesManualRaw,
              onOverrideChange: setPlatesOverride,
              onManualRawChange: setPlatesManualRaw,
            }}
            printing={{
              override: printingOverride,
              manualRaw: printingManualRaw,
              onOverrideChange: setPrintingOverride,
              onManualRawChange: setPrintingManualRaw,
            }}
            die={{
              override: dieOverride,
              manualRaw: dieManualRaw,
              onOverrideChange: setDieOverride,
              onManualRawChange: setDieManualRaw,
            }}
            cutting={{
              override: cuttingOverride,
              manualRaw: cuttingManualRaw,
              onOverrideChange: setCuttingOverride,
              onManualRawChange: setCuttingManualRaw,
            }}
            pasting={{
              override: pastingOverride,
              manualRaw: pastingManualRaw,
              onOverrideChange: setPastingOverride,
              onManualRawChange: setPastingManualRaw,
            }}
            corrugation={{
              override: corrugationOverride,
              manualRaw: corrugationManualRaw,
              onOverrideChange: setCorrugationOverride,
              onManualRawChange: setCorrugationManualRaw,
            }}
            shipping={{
              override: shippingOverride,
              manualRaw: shippingManualRaw,
              onOverrideChange: setShippingOverride,
              onManualRawChange: setShippingManualRaw,
            }}
            onDownloadImage={() => {
              if (!result || quantity == null || !costResult || L == null || W == null || H == null) {
                return;
              }
              void downloadMailerCostImage({
                clientName,
                length: L,
                width: W,
                height: H,
                unit,
                openWidthIn: result.in.openWidth,
                openHeightIn: result.in.openHeight,
                quantity,
                materialType,
                laminationSides,
                stockGsm: mailerCostConfig.stock.gsm,
                shippingGsm: mailerCostConfig.shipping.gsm,
                shippingRatePerKg: mailerCostConfig.shipping.ratePerKg,
                profitRatio: profitRatio ?? 1,
                usdRate: mailerCostConfig.fx.usdRate,
                costResult,
              });
            }}
          />
        )}

        {/* Sheet Optimization */}
        {result && (
          <Card>
            <SheetOptimization
              openWidthIn={result.in.openWidth}
              openHeightIn={result.in.openHeight}
              paddingWIn={paddingWIn}
              paddingHIn={paddingHIn}
              unit={unit}
              costSheetKey={artSheetKeyOverride}
              onCostSheetChange={setArtSheetKeyOverride}
            />
          </Card>
        )}
      </div>

      {/* Right sidebar - sticky cost summary */}
      {showStickyTotals && costResult && (
        <>
          <aside className="xl:w-80 xl:flex-shrink-0">
            <div className="xl:sticky xl:top-6 space-y-4">
              <p className="text-xs font-medium text-pacify-gold/70 uppercase tracking-[0.14em] mb-2 px-0.5">
                Live totals
              </p>
              <CostTotalsSummary
                result={costResult}
                quantity={quantity!}
                profitRatio={profitRatio}
                usdRate={mailerCostConfig.fx.usdRate}
                compact
              />
            </div>
          </aside>
          <CostTotalsStickyBar
            result={costResult}
            quantity={quantity!}
            profitRatio={profitRatio}
            usdRate={mailerCostConfig.fx.usdRate}
          />
        </>
      )}
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
            fill="#1A1A1A"
            stroke="#C9A96E"
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
              stroke="#C9A96E"
              strokeWidth={1}
              strokeDasharray="3 2"
              opacity={0.55}
            />
          ))}
          {[y1, y2, y3, y4].map((y, i) => (
            <line
              key={`h${i}`}
              x1={ox}
              y1={y}
              x2={ox + rw}
              y2={y}
              stroke="#C9A96E"
              strokeWidth={1}
              strokeDasharray="3 2"
              opacity={0.55}
            />
          ))}

          {/* Base panel highlight */}
          <rect
            x={x2}
            y={y1}
            width={s(length)}
            height={s(width)}
            fill="#1A3A2F"
            opacity={0.45}
          />

          <text
            x={ox + rw / 2}
            y={oy - 8}
            textAnchor="middle"
            className="fill-pacify-gold"
            style={{ fontSize: 10 }}
          >
            {fmt(openWidth)} {unit}
          </text>
          <text
            x={ox - 10}
            y={oy + rh / 2}
            textAnchor="middle"
            className="fill-pacify-silver"
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

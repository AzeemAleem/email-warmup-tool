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
import { CostCalculation } from "@/components/cost/CostCalculation";
import { MoroccoRollPanel } from "@/components/cost/MoroccoRollPanel";
import { SheetOptimization } from "@/components/mailer/SheetOptimization";
import {
  DEFAULT_COST_CONFIG,
  type CostConfig,
} from "@/lib/cost/costConfig";
import {
  parseQuantity,
  quantityError,
  runCostEngine,
} from "@/lib/cost/costEngine";
import { downloadRigidCostPdf } from "@/lib/cost/exportCostPdf";
import { parseDebossTotal } from "@/lib/cost/items/debossCost";
import { parseDieTotal } from "@/lib/cost/items/dieCost";
import { parseEmbossingTotal } from "@/lib/cost/items/embossingCost";
import { parseFoilingTotal } from "@/lib/cost/items/foilingCost";
import { parseLaborTotal } from "@/lib/cost/items/laborCost";
import { parsePlatesTotal } from "@/lib/cost/items/platesCost";
import { parsePrintingTotal } from "@/lib/cost/items/printingCost";
import { parseArtSheetsRequired } from "@/lib/cost/items/artPaperCost";
import { parseExtraTotal } from "@/lib/cost/items/extraCost";
import { parseSpotUvTotal } from "@/lib/cost/items/spotUvCost";
import type {
  PaperType,
  PrintColorMode,
  PrintSides,
} from "@/lib/cost/types";
import {
  calcRigidBox,
  convertLength,
  DEFAULT_RIGID_OPTIONS,
  formatLength,
  fromMm,
  toMm,
  type LengthUnit,
  type RigidBoxResultAllUnits,
} from "@/lib/rigidBoxCalc";
import {
  ART_PAPER_SHEETS,
  DEFAULT_ART_PADDING_H_IN,
  DEFAULT_ART_PADDING_W_IN,
} from "@/lib/rigidSheetSizes";
import { sheetKey } from "@/lib/sheetSizes";
import { recommendBestSheet } from "@/lib/sheetNesting";

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

function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={clsx(
        "inline-flex rounded-lg border border-gray-700 bg-gray-800/60 p-1 gap-1",
        disabled && "opacity-40 pointer-events-none",
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={clsx(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            value === opt.value
              ? "bg-indigo-600 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function RigidBoxCalculatorPage() {
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
  const [widthAllowanceMm, setWidthAllowanceMm] = useState(
    DEFAULT_RIGID_OPTIONS.widthAllowanceMm,
  );
  const [heightAllowanceMm, setHeightAllowanceMm] = useState(
    DEFAULT_RIGID_OPTIONS.heightAllowanceMm,
  );
  const [widthAllowInput, setWidthAllowInput] = useState(() =>
    formatForInput(fromMm(DEFAULT_RIGID_OPTIONS.widthAllowanceMm, "in"), "in"),
  );
  const [heightAllowInput, setHeightAllowInput] = useState(() =>
    formatForInput(fromMm(DEFAULT_RIGID_OPTIONS.heightAllowanceMm, "in"), "in"),
  );
  const [paddingWIn, setPaddingWIn] = useState(
    DEFAULT_RIGID_OPTIONS.paddingWIn ?? DEFAULT_ART_PADDING_W_IN,
  );
  const [paddingHIn, setPaddingHIn] = useState(
    DEFAULT_RIGID_OPTIONS.paddingHIn ?? DEFAULT_ART_PADDING_H_IN,
  );
  const [paddingWInput, setPaddingWInput] = useState(
    String(DEFAULT_RIGID_OPTIONS.paddingWIn ?? DEFAULT_ART_PADDING_W_IN),
  );
  const [paddingHInput, setPaddingHInput] = useState(
    String(DEFAULT_RIGID_OPTIONS.paddingHIn ?? DEFAULT_ART_PADDING_H_IN),
  );
  const [quantityRaw, setQuantityRaw] = useState("");
  const [quantityTouched, setQuantityTouched] = useState(false);
  const [profitRatioRaw, setProfitRatioRaw] = useState("");
  const [extraRaw, setExtraRaw] = useState("");
  const [clientName, setClientName] = useState("");
  const [artSheetsOverride, setArtSheetsOverride] = useState(false);
  const [artSheetsManualRaw, setArtSheetsManualRaw] = useState("");
  /** null = auto recommended sheet; otherwise "30x50" etc. */
  const [artSheetKeyOverride, setArtSheetKeyOverride] = useState<string | null>(
    null,
  );
  const [paperType, setPaperType] = useState<PaperType>("art");
  const [printSides, setPrintSides] = useState<PrintSides>("double");
  const [printColorMode, setPrintColorMode] =
    useState<PrintColorMode>("cmyk");
  const [laminationEnabled, setLaminationEnabled] = useState(true);
  const [spotUvEnabled, setSpotUvEnabled] = useState(false);
  const [spotUvOverride, setSpotUvOverride] = useState(false);
  const [spotUvManualRaw, setSpotUvManualRaw] = useState("");
  const [dieEnabled, setDieEnabled] = useState(true);
  const [dieOverride, setDieOverride] = useState(false);
  const [dieManualRaw, setDieManualRaw] = useState("");
  const [printingEnabled, setPrintingEnabled] = useState(true);
  const [printingOverride, setPrintingOverride] = useState(false);
  const [printingManualRaw, setPrintingManualRaw] = useState("");
  const [platesEnabled, setPlatesEnabled] = useState(true);
  const [platesOverride, setPlatesOverride] = useState(false);
  const [platesManualRaw, setPlatesManualRaw] = useState("");
  const [foilingEnabled, setFoilingEnabled] = useState(false);
  const [foilingOverride, setFoilingOverride] = useState(false);
  const [foilingManualRaw, setFoilingManualRaw] = useState("");
  const [laborEnabled, setLaborEnabled] = useState(true);
  const [laborOverride, setLaborOverride] = useState(false);
  const [laborManualRaw, setLaborManualRaw] = useState("");
  const [debossEnabled, setDebossEnabled] = useState(false);
  const [debossOverride, setDebossOverride] = useState(false);
  const [debossManualRaw, setDebossManualRaw] = useState("");
  const [embossingEnabled, setEmbossingEnabled] = useState(false);
  const [embossingOverride, setEmbossingOverride] = useState(false);
  const [embossingManualRaw, setEmbossingManualRaw] = useState("");
  const [costConfig, setCostConfig] = useState<CostConfig>(() => ({
    greyboard: { ...DEFAULT_COST_CONFIG.greyboard },
    artPaper: { ...DEFAULT_COST_CONFIG.artPaper },
    morocco: { ...DEFAULT_COST_CONFIG.morocco },
    lamination: { ...DEFAULT_COST_CONFIG.lamination },
    spotUv: { ...DEFAULT_COST_CONFIG.spotUv },
    die: { ...DEFAULT_COST_CONFIG.die },
    printing: { ...DEFAULT_COST_CONFIG.printing },
    plates: { ...DEFAULT_COST_CONFIG.plates },
    foiling: { ...DEFAULT_COST_CONFIG.foiling },
    deboss: { ...DEFAULT_COST_CONFIG.deboss },
    embossing: { ...DEFAULT_COST_CONFIG.embossing },
    weight: { ...DEFAULT_COST_CONFIG.weight },
    shipping: { ...DEFAULT_COST_CONFIG.shipping },
    fx: { ...DEFAULT_COST_CONFIG.fx },
  }));
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
    setWidthAllowInput(formatForInput(fromMm(widthAllowanceMm, next), next));
    setHeightAllowInput(formatForInput(fromMm(heightAllowanceMm, next), next));
    setUnit(next);
  }

  function updateWidthAllowance(raw: string) {
    setWidthAllowInput(raw);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    setWidthAllowanceMm(toMm(n, unit));
  }

  function updateHeightAllowance(raw: string) {
    setHeightAllowInput(raw);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    setHeightAllowanceMm(toMm(n, unit));
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
  const quantity = parseQuantity(quantityRaw);
  const profitRatio = (() => {
    const t = profitRatioRaw.trim();
    if (t === "") return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  })();
  const extraTotal = parseExtraTotal(extraRaw);
  const artSheetsRequiredManual =
    artSheetsOverride ? parseArtSheetsRequired(artSheetsManualRaw) : null;

  const result: RigidBoxResultAllUnits | null = useMemo(() => {
    if (L == null || W == null || H == null) return null;
    if (
      !Number.isFinite(widthAllowanceMm) ||
      widthAllowanceMm < 0 ||
      !Number.isFinite(heightAllowanceMm) ||
      heightAllowanceMm < 0
    ) {
      return null;
    }
    return calcRigidBox(
      { length: L, width: W, height: H },
      unit,
      { widthAllowanceMm, heightAllowanceMm, paddingWIn, paddingHIn },
    );
  }, [L, W, H, unit, widthAllowanceMm, heightAllowanceMm, paddingWIn, paddingHIn]);

  const artPiece = useMemo(() => {
    if (!result) return null;
    return {
      widthIn: result.in.openWidth + paddingWIn,
      heightIn: result.in.openHeight + paddingHIn,
    };
  }, [result, paddingWIn, paddingHIn]);

  const artRecommendation = useMemo(() => {
    if (!artPiece) return null;
    return recommendBestSheet(artPiece, ART_PAPER_SHEETS);
  }, [artPiece]);

  // Drop manual sheet if it no longer fits after size/padding change
  useEffect(() => {
    if (!artSheetKeyOverride || !artRecommendation) {
      if (!artRecommendation) setArtSheetKeyOverride(null);
      return;
    }
    const stillFits = artRecommendation.allResults.some(
      (r) => r.fits && sheetKey(r.sheet) === artSheetKeyOverride,
    );
    if (!stillFits) setArtSheetKeyOverride(null);
  }, [artRecommendation, artSheetKeyOverride]);

  const artSheetOptions = useMemo(() => {
    if (!artRecommendation) return [];
    return artRecommendation.allResults
      .filter((r) => r.fits)
      .map((r) => ({
        key: sheetKey(r.sheet),
        width: r.sheet.width,
        height: r.sheet.height,
        piecesPerSheet: r.pieces,
        wastagePercent: r.wastagePercent,
        isRecommended:
          artRecommendation.recommended != null &&
          sheetKey(artRecommendation.recommended.sheet) === sheetKey(r.sheet),
      }));
  }, [artRecommendation]);

  const artSheetSelection = useMemo(() => {
    if (!artRecommendation) return null;

    let nest = artRecommendation.recommended;
    if (artSheetKeyOverride) {
      const found = artRecommendation.allResults.find(
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
  }, [artRecommendation, artSheetKeyOverride]);

  const spotUvManualTotal = useMemo(() => {
    if (!spotUvEnabled) return null;
    const qty = quantity;
    if (qty == null) return null;
    const needsManual =
      qty > costConfig.spotUv.fixedMaxQty || spotUvOverride;
    if (!needsManual) return null;
    return parseSpotUvTotal(spotUvManualRaw);
  }, [
    spotUvEnabled,
    quantity,
    costConfig.spotUv.fixedMaxQty,
    spotUvOverride,
    spotUvManualRaw,
  ]);

  const dieManualTotal = useMemo(() => {
    if (!dieEnabled || !dieOverride) return null;
    return parseDieTotal(dieManualRaw);
  }, [dieEnabled, dieOverride, dieManualRaw]);

  const printingManualTotal = useMemo(() => {
    if (!printingEnabled || !printingOverride) return null;
    return parsePrintingTotal(printingManualRaw);
  }, [printingEnabled, printingOverride, printingManualRaw]);

  const platesManualTotal = useMemo(() => {
    if (!platesEnabled || !platesOverride) return null;
    return parsePlatesTotal(platesManualRaw);
  }, [platesEnabled, platesOverride, platesManualRaw]);

  const foilingManualTotal = useMemo(() => {
    if (!foilingEnabled || !foilingOverride) return null;
    return parseFoilingTotal(foilingManualRaw);
  }, [foilingEnabled, foilingOverride, foilingManualRaw]);

  const laborManualTotal = useMemo(() => {
    if (!laborEnabled || !laborOverride) return null;
    return parseLaborTotal(laborManualRaw);
  }, [laborEnabled, laborOverride, laborManualRaw]);

  const debossManualTotal = useMemo(() => {
    if (!debossEnabled || !debossOverride) return null;
    return parseDebossTotal(debossManualRaw);
  }, [debossEnabled, debossOverride, debossManualRaw]);

  const embossingManualTotal = useMemo(() => {
    if (!embossingEnabled || !embossingOverride) return null;
    return parseEmbossingTotal(embossingManualRaw);
  }, [embossingEnabled, embossingOverride, embossingManualRaw]);

  const costResult = useMemo(() => {
    if (!result) return null;
    return runCostEngine(
      {
        openWidthIn: result.in.openWidth,
        openHeightIn: result.in.openHeight,
      },
      quantity,
      costConfig,
      {
        paperType,
        printSides: paperType === "art" ? printSides : "single",
        artSheet: paperType === "art" ? artSheetSelection : null,
        artPaddingWIn: paddingWIn,
        artPaddingHIn: paddingHIn,
        laminationEnabled,
        spotUvEnabled,
        spotUvManualTotal,
        dieEnabled,
        dieManualTotal,
        printColorMode,
        printingEnabled,
        printingManualTotal,
        platesEnabled,
        platesManualTotal,
        foilingEnabled,
        foilingManualTotal,
        laborEnabled,
        laborManualTotal,
        debossEnabled,
        debossManualTotal,
        embossingEnabled,
        embossingManualTotal,
        extraTotal,
        artSheetsRequiredManual,
      },
    );
  }, [
    result,
    quantity,
    costConfig,
    paperType,
    printSides,
    artSheetSelection,
    paddingWIn,
    paddingHIn,
    laminationEnabled,
    spotUvEnabled,
    spotUvManualTotal,
    dieEnabled,
    dieManualTotal,
    printColorMode,
    printingEnabled,
    printingManualTotal,
    platesEnabled,
    platesManualTotal,
    foilingEnabled,
    foilingManualTotal,
    laborEnabled,
    laborManualTotal,
    debossEnabled,
    debossManualTotal,
    embossingEnabled,
    embossingManualTotal,
    extraTotal,
    artSheetsRequiredManual,
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
    setWidthAllowanceMm(DEFAULT_RIGID_OPTIONS.widthAllowanceMm);
    setHeightAllowanceMm(DEFAULT_RIGID_OPTIONS.heightAllowanceMm);
    setWidthAllowInput(
      formatForInput(fromMm(DEFAULT_RIGID_OPTIONS.widthAllowanceMm, unit), unit),
    );
    setHeightAllowInput(
      formatForInput(fromMm(DEFAULT_RIGID_OPTIONS.heightAllowanceMm, unit), unit),
    );
    setPaddingWIn(DEFAULT_RIGID_OPTIONS.paddingWIn ?? DEFAULT_ART_PADDING_W_IN);
    setPaddingHIn(DEFAULT_RIGID_OPTIONS.paddingHIn ?? DEFAULT_ART_PADDING_H_IN);
    setPaddingWInput(
      String(DEFAULT_RIGID_OPTIONS.paddingWIn ?? DEFAULT_ART_PADDING_W_IN),
    );
    setPaddingHInput(
      String(DEFAULT_RIGID_OPTIONS.paddingHIn ?? DEFAULT_ART_PADDING_H_IN),
    );
    setQuantityRaw("");
    setQuantityTouched(false);
    setProfitRatioRaw("");
    setExtraRaw("");
    setClientName("");
    setArtSheetsOverride(false);
    setArtSheetsManualRaw("");
    setArtSheetKeyOverride(null);
    setPaperType("art");
    setPrintSides("double");
    setPrintColorMode("cmyk");
    setLaminationEnabled(true);
    setSpotUvEnabled(false);
    setSpotUvOverride(false);
    setSpotUvManualRaw("");
    setDieEnabled(true);
    setDieOverride(false);
    setDieManualRaw("");
    setPrintingEnabled(true);
    setPrintingOverride(false);
    setPrintingManualRaw("");
    setPlatesEnabled(true);
    setPlatesOverride(false);
    setPlatesManualRaw("");
    setFoilingEnabled(false);
    setFoilingOverride(false);
    setFoilingManualRaw("");
    setLaborEnabled(true);
    setLaborOverride(false);
    setLaborManualRaw("");
    setDebossEnabled(false);
    setDebossOverride(false);
    setDebossManualRaw("");
    setEmbossingEnabled(false);
    setEmbossingOverride(false);
    setEmbossingManualRaw("");
    setCostConfig({
      greyboard: { ...DEFAULT_COST_CONFIG.greyboard },
      artPaper: { ...DEFAULT_COST_CONFIG.artPaper },
      morocco: { ...DEFAULT_COST_CONFIG.morocco },
      lamination: { ...DEFAULT_COST_CONFIG.lamination },
      spotUv: { ...DEFAULT_COST_CONFIG.spotUv },
      die: { ...DEFAULT_COST_CONFIG.die },
      printing: { ...DEFAULT_COST_CONFIG.printing },
      plates: { ...DEFAULT_COST_CONFIG.plates },
      foiling: { ...DEFAULT_COST_CONFIG.foiling },
      deboss: { ...DEFAULT_COST_CONFIG.deboss },
      embossing: { ...DEFAULT_COST_CONFIG.embossing },
      weight: { ...DEFAULT_COST_CONFIG.weight },
      shipping: { ...DEFAULT_COST_CONFIG.shipping },
      fx: { ...DEFAULT_COST_CONFIG.fx },
    });
    setCopied(false);
  }

  async function copyResult() {
    if (!result) return;
    const primary = result[unit];
    const text = [
      `Rigid Box Open Size (${unit})`,
      `Open Width:  ${formatLength(primary.openWidth, unit)} ${unit}`,
      `Open Height: ${formatLength(primary.openHeight, unit)} ${unit}`,
      `${formatLength(primary.openWidth, unit)} × ${formatLength(primary.openHeight, unit)} ${unit}`,
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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Rigid Box Calculator</h1>
        <p className="text-sm text-gray-400 mt-1">
          Enter closed rigid box dimensions to get the flat open size, then find
          the best printing sheet and paper cost.
        </p>
      </div>

      <Card>
        <div className="mb-5">
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
            Included on the PDF quote export
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Unit
            </p>
            <SegmentedToggle
              options={UNITS.map((u) => ({ value: u, label: u }))}
              value={unit}
              onChange={switchUnit}
            />
            <p className="text-xs text-gray-600 mt-2">
              Values convert automatically ({UNIT_FULL[unit]}).
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Paper type
            </p>
            <SegmentedToggle
              options={[
                { value: "art" as const, label: "Art Paper" },
                { value: "morocco" as const, label: "Morocco Paper" },
              ]}
              value={paperType}
              onChange={setPaperType}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Print sides
            </p>
            <SegmentedToggle
              options={[
                { value: "double" as const, label: "Double side" },
                { value: "single" as const, label: "Single side" },
              ]}
              value={printSides}
              onChange={setPrintSides}
              disabled={paperType !== "art"}
            />
            {paperType !== "art" && (
              <p className="text-xs text-gray-600 mt-2">
                Print sides apply to Art Paper only.
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Print colors
            </p>
            <SegmentedToggle
              options={[
                { value: "cmyk" as const, label: "CMYK (4)" },
                { value: "one" as const, label: "1 color" },
              ]}
              value={printColorMode}
              onChange={setPrintColorMode}
            />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-800 flex flex-wrap gap-5">
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={laminationEnabled}
              onChange={(e) => setLaminationEnabled(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500/40"
            />
            Lamination
            {paperType === "morocco" && laminationEnabled && (
              <span className="text-xs text-amber-400/90">
                (not applied to Morocco)
              </span>
            )}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={spotUvEnabled}
              onChange={(e) => {
                setSpotUvEnabled(e.target.checked);
                if (!e.target.checked) {
                  setSpotUvOverride(false);
                  setSpotUvManualRaw("");
                }
              }}
              className="rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500/40"
            />
            Spot UV
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={dieEnabled}
              onChange={(e) => {
                setDieEnabled(e.target.checked);
                if (!e.target.checked) {
                  setDieOverride(false);
                  setDieManualRaw("");
                }
              }}
              className="rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500/40"
            />
            Die making + Die cutting
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={printingEnabled}
              onChange={(e) => {
                setPrintingEnabled(e.target.checked);
                if (!e.target.checked) {
                  setPrintingOverride(false);
                  setPrintingManualRaw("");
                }
              }}
              className="rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500/40"
            />
            Printing
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={platesEnabled}
              onChange={(e) => {
                setPlatesEnabled(e.target.checked);
                if (!e.target.checked) {
                  setPlatesOverride(false);
                  setPlatesManualRaw("");
                }
              }}
              className="rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500/40"
            />
            Printing plates
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={foilingEnabled}
              onChange={(e) => {
                setFoilingEnabled(e.target.checked);
                if (!e.target.checked) {
                  setFoilingOverride(false);
                  setFoilingManualRaw("");
                }
              }}
              className="rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500/40"
            />
            Silver / Gold Foiling
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={laborEnabled}
              onChange={(e) => {
                setLaborEnabled(e.target.checked);
                if (!e.target.checked) {
                  setLaborOverride(false);
                  setLaborManualRaw("");
                }
              }}
              className="rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500/40"
            />
            Labor
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={debossEnabled}
              onChange={(e) => {
                setDebossEnabled(e.target.checked);
                if (!e.target.checked) {
                  setDebossOverride(false);
                  setDebossManualRaw("");
                }
              }}
              className="rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500/40"
            />
            Deboss
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={embossingEnabled}
              onChange={(e) => {
                setEmbossingEnabled(e.target.checked);
                if (!e.target.checked) {
                  setEmbossingOverride(false);
                  setEmbossingManualRaw("");
                }
              }}
              className="rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500/40"
            />
            Embossing
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-white mb-4">
          Closed box dimensions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                hint: "Box height",
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
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Total quantity (units)
            </label>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              placeholder="e.g. 200"
              value={quantityRaw}
              onChange={(e) => setQuantityRaw(e.target.value)}
              onBlur={() => setQuantityTouched(true)}
              className={inputCls(!!errors.quantity)}
            />
            {errors.quantity ? (
              <p className="mt-1 text-xs text-red-400">{errors.quantity}</p>
            ) : (
              <p className="mt-1 text-[11px] text-gray-600">Whole numbers only, min 1</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Profit ratio
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="e.g. 1.5 or 2"
              value={profitRatioRaw}
              onChange={(e) => setProfitRatioRaw(e.target.value)}
              className={inputCls(false)}
            />
            <p className="mt-1 text-[11px] text-gray-600">
              1.5 = +50%, 2 = +100%. Empty = no markup (×1)
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
              Optional extras added to base cost
            </p>
          </div>
        </div>

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
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Width allowance ({unit})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={widthAllowInput}
                  onChange={(e) => updateWidthAllowance(e.target.value)}
                  className={inputCls(false)}
                />
                <p className="mt-1 text-[11px] text-gray-600">
                  Default 0 (WIDTH_ALLOWANCE)
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Height allowance ({unit})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={heightAllowInput}
                  onChange={(e) => updateHeightAllowance(e.target.value)}
                  className={inputCls(false)}
                />
                <p className="mt-1 text-[11px] text-gray-600">
                  Default 0 (HEIGHT_ALLOWANCE)
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Art padding W (in)
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
                  Default {DEFAULT_ART_PADDING_W_IN} in (ART_PADDING_W_IN)
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Art padding H (in)
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
                  Default {DEFAULT_ART_PADDING_H_IN} in (ART_PADDING_H_IN)
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

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
                <p className="text-[11px] text-gray-600 mt-1">L + width allowance</p>
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
                <p className="text-[11px] text-gray-600 mt-1">
                  3H + 2W + height allowance
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-400">
              Combined:{" "}
              <span className="text-white font-semibold tabular-nums">
                {formatLength(result[unit].openWidth, unit)} ×{" "}
                {formatLength(result[unit].openHeight, unit)} {unit}
              </span>
            </p>

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

            <RigidLayoutPreview
              openWidth={result[unit].openWidth}
              openHeight={result[unit].openHeight}
              unit={unit}
              length={L!}
              width={W!}
              height={H!}
            />
          </div>
        )}
      </Card>

      {result && quantity != null && costResult && L != null && W != null && H != null && (
        <Card>
          <CostCalculation
            result={costResult}
            quantity={quantity}
            config={costConfig}
            onConfigChange={setCostConfig}
            profitRatio={profitRatio}
            artSheetsOverride={artSheetsOverride}
            artSheetsManualRaw={artSheetsManualRaw}
            onArtSheetsOverrideChange={setArtSheetsOverride}
            onArtSheetsManualRawChange={setArtSheetsManualRaw}
            artSheetOptions={artSheetOptions}
            artSheetKeyOverride={artSheetKeyOverride}
            onArtSheetKeyChange={setArtSheetKeyOverride}
            clientName={clientName}
            onDownloadPdf={() =>
              downloadRigidCostPdf({
                clientName,
                length: L,
                width: W,
                height: H,
                unit,
                openWidthIn: result.in.openWidth,
                openHeightIn: result.in.openHeight,
                quantity,
                paperType,
                printSides: paperType === "art" ? printSides : "single",
                printColorMode,
                profitRatio: profitRatio ?? 1,
                usdRate: costConfig.fx.usdRate,
                costResult,
              })
            }
            spotUvEnabled={spotUvEnabled}
            spotUvOverride={spotUvOverride}
            spotUvManualRaw={spotUvManualRaw}
            onSpotUvOverrideChange={setSpotUvOverride}
            onSpotUvManualRawChange={setSpotUvManualRaw}
            dieEnabled={dieEnabled}
            dieOverride={dieOverride}
            dieManualRaw={dieManualRaw}
            onDieOverrideChange={setDieOverride}
            onDieManualRawChange={setDieManualRaw}
            printingEnabled={printingEnabled}
            printingOverride={printingOverride}
            printingManualRaw={printingManualRaw}
            onPrintingOverrideChange={setPrintingOverride}
            onPrintingManualRawChange={setPrintingManualRaw}
            platesEnabled={platesEnabled}
            platesOverride={platesOverride}
            platesManualRaw={platesManualRaw}
            onPlatesOverrideChange={setPlatesOverride}
            onPlatesManualRawChange={setPlatesManualRaw}
            foiling={{
              enabled: foilingEnabled,
              override: foilingOverride,
              manualRaw: foilingManualRaw,
              onOverrideChange: setFoilingOverride,
              onManualRawChange: setFoilingManualRaw,
            }}
            labor={{
              enabled: laborEnabled,
              override: laborOverride,
              manualRaw: laborManualRaw,
              onOverrideChange: setLaborOverride,
              onManualRawChange: setLaborManualRaw,
            }}
            deboss={{
              enabled: debossEnabled,
              override: debossOverride,
              manualRaw: debossManualRaw,
              onOverrideChange: setDebossOverride,
              onManualRawChange: setDebossManualRaw,
            }}
            embossing={{
              enabled: embossingEnabled,
              override: embossingOverride,
              manualRaw: embossingManualRaw,
              onOverrideChange: setEmbossingOverride,
              onManualRawChange: setEmbossingManualRaw,
            }}
          />
        </Card>
      )}

      {result && paperType === "art" && (
        <Card>
          <SheetOptimization
            openWidthIn={result.in.openWidth}
            openHeightIn={result.in.openHeight}
            paddingWIn={paddingWIn}
            paddingHIn={paddingHIn}
            unit={unit}
            sheets={ART_PAPER_SHEETS}
            mode="flat"
            nestingSizeLabel="Required art paper size"
            tableTitle="Art Paper sheets"
            costSheetKey={artSheetKeyOverride}
            onCostSheetChange={setArtSheetKeyOverride}
          />
        </Card>
      )}

      {result && paperType === "morocco" && artPiece && (
        <Card>
          <MoroccoRollPanel
            pieceWidthIn={artPiece.widthIn}
            pieceHeightIn={artPiece.heightIn}
            quantity={quantity}
            config={costConfig.morocco}
          />
        </Card>
      )}
    </div>
  );
}

/** Stacked panels: H, W, H, W, H — each L wide */
function RigidLayoutPreview({
  openWidth,
  openHeight,
  unit,
  length,
  width,
  height,
}: {
  openWidth: number;
  openHeight: number;
  unit: LengthUnit;
  length: number;
  width: number;
  height: number;
}) {
  const vbW = 280;
  const vbH = 320;
  const pad = 36;
  const panelW = length;
  const panelH = 3 * height + 2 * width;
  const scale = Math.min(
    (vbW - pad * 2) / Math.max(panelW, 1),
    (vbH - pad * 2) / Math.max(panelH, 1),
  );
  const rw = panelW * scale;
  const rh = panelH * scale;
  const ox = (vbW - rw) / 2;
  const oy = (vbH - rh) / 2;
  const s = (v: number) => v * scale;

  const bands: { label: string; h: number; fill: string }[] = [
    { label: `L×H`, h: height, fill: "#4f46e5" },
    { label: `L×W`, h: width, fill: "#0891b2" },
    { label: `L×H`, h: height, fill: "#4f46e5" },
    { label: `L×W`, h: width, fill: "#0891b2" },
    { label: `L×H`, h: height, fill: "#4f46e5" },
  ];

  let y = oy;
  const fmt = (v: number) => formatLength(v, unit);

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        Flat layout preview
      </p>
      <div className="rounded-lg bg-gray-950 border border-gray-800 p-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="w-full max-w-sm mx-auto h-auto"
          role="img"
          aria-label={`Flat sheet ${fmt(openWidth)} by ${fmt(openHeight)} ${unit}`}
        >
          <rect
            x={ox}
            y={oy}
            width={rw}
            height={rh}
            fill="none"
            stroke="#6366f1"
            strokeWidth={1.5}
          />
          {bands.map((b, i) => {
            const bandY = y;
            const bandH = s(b.h);
            y += bandH;
            return (
              <g key={i}>
                <rect
                  x={ox}
                  y={bandY}
                  width={rw}
                  height={Math.max(0, bandH - 0.5)}
                  fill={b.fill}
                  fillOpacity={0.35}
                  stroke="#818cf8"
                  strokeWidth={0.75}
                />
                {bandH > 14 && rw > 40 && (
                  <text
                    x={ox + rw / 2}
                    y={bandY + bandH / 2 + 3}
                    textAnchor="middle"
                    className="fill-gray-200"
                    style={{ fontSize: 9 }}
                  >
                    {b.label} ({fmt(length)}×{fmt(b.h)})
                  </text>
                )}
              </g>
            );
          })}
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
            x={ox - 12}
            y={oy + rh / 2}
            textAnchor="middle"
            className="fill-cyan-300"
            style={{ fontSize: 10 }}
            transform={`rotate(-90 ${ox - 12} ${oy + rh / 2})`}
          >
            {fmt(openHeight)} {unit}
          </text>
        </svg>
      </div>
      <p className="text-[11px] text-gray-600 mt-2">
        Stacked panels: H + W + H + W + H (each {fmt(length)} {unit} wide)
      </p>
    </div>
  );
}

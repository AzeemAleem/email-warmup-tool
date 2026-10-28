"use client";

import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/Card";
import {
  formatPkr,
  formatPkrTotal,
} from "@/lib/cost/currency";
import type { MailerCostConfig } from "@/lib/cost/mailerCostConfig";
import type { CostEngineResult, CostLineResult } from "@/lib/cost/types";

const inputCls =
  "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30";

export interface MailerOverrideControls {
  override: boolean;
  manualRaw: string;
  onOverrideChange: (v: boolean) => void;
  onManualRawChange: (v: string) => void;
}

interface Props {
  result: CostEngineResult;
  quantity: number;
  config: MailerCostConfig;
  onConfigChange: (config: MailerCostConfig) => void;
  autoTotalSheets: number;
  totalSheetsOverride: boolean;
  totalSheetsManualRaw: string;
  onTotalSheetsOverrideChange: (v: boolean) => void;
  onTotalSheetsManualRawChange: (v: string) => void;
  stock: MailerOverrideControls;
  lamination: MailerOverrideControls;
  plates: MailerOverrideControls;
  printing: MailerOverrideControls;
  die: MailerOverrideControls;
  cutting: MailerOverrideControls;
  pasting: MailerOverrideControls;
  corrugation: MailerOverrideControls;
  shipping: MailerOverrideControls;
  onDownloadImage?: () => void;
}

function findItem(
  result: CostEngineResult,
  id: string,
): CostLineResult | undefined {
  return result.items.find((i) => i.id === id);
}

function OverrideToggle({
  override,
  autoLabel,
  currentTotal,
  linkClass,
  onOverrideChange,
  onManualRawChange,
}: {
  override: boolean;
  autoLabel: string;
  /** Prefill override input with this calculated total */
  currentTotal: number;
  linkClass: string;
  onOverrideChange: (v: boolean) => void;
  onManualRawChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs mb-2">
      {!override ? (
        <button
          type="button"
          onClick={() => {
            onOverrideChange(true);
            onManualRawChange(String(currentTotal));
          }}
          className={`${linkClass} underline underline-offset-2`}
        >
          Override
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            onOverrideChange(false);
            onManualRawChange("");
          }}
          className="text-gray-400 hover:text-gray-200 underline underline-offset-2"
        >
          Use calculated ({autoLabel})
        </button>
      )}
    </div>
  );
}

function ManualTotalInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        step="any"
        min="0"
        placeholder="Enter total"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}

function ConfigNumber({
  label,
  value,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  step: string;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min="0"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n) || n < 0) return;
          onChange(n);
        }}
        className={inputCls}
      />
      {hint && <p className="mt-1 text-[10px] text-gray-600">{hint}</p>}
    </div>
  );
}

export function MailerCostCalculation({
  result,
  quantity,
  config,
  onConfigChange,
  autoTotalSheets,
  totalSheetsOverride,
  totalSheetsManualRaw,
  onTotalSheetsOverrideChange,
  onTotalSheetsManualRawChange,
  stock,
  lamination,
  plates,
  printing,
  die,
  cutting,
  pasting,
  corrugation,
  shipping,
  onDownloadImage,
}: Props) {
  const stockItem = findItem(result, "stock");
  const laminationItem = findItem(result, "lamination");
  const platesItem = findItem(result, "plates");
  const printingItem = findItem(result, "printing");
  const dieItem = findItem(result, "die");
  const cuttingItem = findItem(result, "cutting");
  const pastingItem = findItem(result, "pasting");
  const corrugationItem = findItem(result, "corrugation");
  const shippingItem = findItem(result, "shipping");
  const extraItem = findItem(result, "extra");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Production Cost</h2>
          <p className="text-xs text-gray-500 mt-1">
            Each section shows calculated details. Click Override to enter a
            custom total without leaving the section.
          </p>
        </div>
        {onDownloadImage && (
          <button
            type="button"
            onClick={onDownloadImage}
            className="btn-primary gap-2 shrink-0"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Download PNG
          </button>
        )}
      </div>

      {result.warnings.length > 0 && (
        <div className="space-y-1">
          {result.warnings.map((w) => (
            <p key={w} className="text-xs text-amber-300/90">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Stock */}
      {stockItem && (
        <Card className="border-pacify-silver/25 bg-pacify-silver/5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-pacify-silver">
              Stock Cost
            </h3>
            <span className="text-sm font-bold text-white tabular-nums">
              {formatPkrTotal(stockItem.total)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs mb-3">
            <div>
              <p className="text-gray-600">Material</p>
              <p className="text-gray-300 mt-0.5 capitalize">
                {String(stockItem.meta?.materialType)} @{" "}
                {stockItem.meta?.materialRate} PKR
              </p>
            </div>
            <div>
              <p className="text-gray-600">Padded open size</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {Number(stockItem.meta?.paddedOpenWidthIn).toFixed(2)} ×{" "}
                {Number(stockItem.meta?.paddedOpenHeightIn).toFixed(2)} in
              </p>
            </div>
            <div>
              <p className="text-gray-600">GSM</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {stockItem.meta?.gsm}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Pieces / sheet</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {stockItem.meta?.piecesPerSheet}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Cost / unit</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkr(stockItem.perUnit)}
              </p>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs text-gray-600">Total sheets required</p>
              {totalSheetsOverride && (
                <button
                  type="button"
                  onClick={() => {
                    onTotalSheetsOverrideChange(false);
                    onTotalSheetsManualRawChange("");
                  }}
                  className="text-[10px] text-pacify-gold hover:text-pacify-gold/80"
                >
                  Use auto
                </button>
              )}
            </div>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              value={
                totalSheetsOverride
                  ? totalSheetsManualRaw
                  : String(autoTotalSheets || "")
              }
              onChange={(e) => {
                const raw = e.target.value;
                if (!totalSheetsOverride) onTotalSheetsOverrideChange(true);
                onTotalSheetsManualRawChange(raw);
              }}
              onFocus={() => {
                if (!totalSheetsOverride) {
                  onTotalSheetsOverrideChange(true);
                  onTotalSheetsManualRawChange(String(autoTotalSheets || ""));
                }
              }}
              className={inputCls}
            />
            <p className="mt-1 text-[10px] text-gray-600">
              {totalSheetsOverride
                ? `Auto would be ${autoTotalSheets.toLocaleString("en-US")}`
                : `Default: outside + inside + 200 extra (qty×2 + 200)`}
            </p>
          </div>

          <OverrideToggle
            override={stock.override}
            autoLabel={formatPkrTotal(Number(stockItem.meta?.autoTotal ?? stockItem.total))}
            currentTotal={Number(stockItem.meta?.autoTotal ?? stockItem.total)}
            linkClass="text-pacify-gold hover:text-pacify-gold/80"
            onOverrideChange={stock.onOverrideChange}
            onManualRawChange={stock.onManualRawChange}
          />
          {stock.override && (
            <ManualTotalInput
              label="Stock cost (PKR, total)"
              value={stock.manualRaw}
              onChange={stock.onManualRawChange}
            />
          )}
        </Card>
      )}

      {/* Lamination */}
      {laminationItem && (
        <Card className="border-sky-500/20 bg-sky-500/5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-sky-200">Lamination</h3>
            <span className="text-sm font-bold text-white tabular-nums">
              {formatPkrTotal(laminationItem.total)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
            <div>
              <p className="text-gray-600">Sides</p>
              <p className="text-gray-300 mt-0.5">{laminationItem.meta?.sides}</p>
            </div>
            <div>
              <p className="text-gray-600">Rate</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {laminationItem.meta?.rate}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Sheets</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {laminationItem.meta?.totalSheets}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Cost / unit</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkr(laminationItem.perUnit)}
              </p>
            </div>
          </div>
          <OverrideToggle
            override={lamination.override}
            autoLabel={formatPkrTotal(
              Number(laminationItem.meta?.autoTotal ?? laminationItem.total),
            )}
            currentTotal={Number(laminationItem.meta?.autoTotal ?? laminationItem.total)}
            linkClass="text-sky-400 hover:text-sky-300"
            onOverrideChange={lamination.onOverrideChange}
            onManualRawChange={lamination.onManualRawChange}
          />
          {lamination.override && (
            <ManualTotalInput
              label="Lamination cost (PKR, total)"
              value={lamination.manualRaw}
              onChange={lamination.onManualRawChange}
            />
          )}
        </Card>
      )}

      {/* Plates */}
      {platesItem && (
        <Card className="border-fuchsia-500/20 bg-fuchsia-500/5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-fuchsia-200">Plates</h3>
            <span className="text-sm font-bold text-white tabular-nums">
              {formatPkrTotal(platesItem.total)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
            <div>
              <p className="text-gray-600">Colors</p>
              <p className="text-gray-300 mt-0.5">
                {platesItem.meta?.colorMode === "cmyk" ? "CMYK (4)" : "1 color"}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Cost / plate</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkrTotal(Number(platesItem.meta?.costPerPlate ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Auto total</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkrTotal(Number(platesItem.meta?.autoTotal ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Cost / unit</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkr(platesItem.perUnit)}
              </p>
            </div>
          </div>
          <OverrideToggle
            override={plates.override}
            autoLabel={formatPkrTotal(Number(platesItem.meta?.autoTotal ?? 0))}
            currentTotal={Number(platesItem.meta?.autoTotal ?? 0)}
            linkClass="text-fuchsia-400 hover:text-fuchsia-300"
            onOverrideChange={plates.onOverrideChange}
            onManualRawChange={plates.onManualRawChange}
          />
          {plates.override && (
            <ManualTotalInput
              label="Plates cost (PKR, total)"
              value={plates.manualRaw}
              onChange={plates.onManualRawChange}
            />
          )}
          <p className="text-[11px] text-gray-600 mt-2">
            Qty {quantity.toLocaleString("en-US")}
            {platesItem.meta?.usedAutomatic
              ? " · Auto"
              : " · Manual override"}
          </p>
        </Card>
      )}

      {/* Printing */}
      {printingItem && (
        <Card className="border-pacify-navy/40 bg-pacify-navy/20">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-pacify-silver">
              Printing
            </h3>
            <span className="text-sm font-bold text-white tabular-nums">
              {formatPkrTotal(printingItem.total)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
            <div>
              <p className="text-gray-600">Colors</p>
              <p className="text-gray-300 mt-0.5">
                {printingItem.meta?.colorMode === "cmyk"
                  ? "CMYK (4)"
                  : "1 color"}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Cost / color</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkrTotal(Number(printingItem.meta?.costPerColor ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Auto total</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkrTotal(Number(printingItem.meta?.autoTotal ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Cost / unit</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkr(printingItem.perUnit)}
              </p>
            </div>
          </div>
          <OverrideToggle
            override={printing.override}
            autoLabel={formatPkrTotal(
              Number(printingItem.meta?.autoTotal ?? 0),
            )}
            currentTotal={Number(printingItem.meta?.autoTotal ?? 0)}
            linkClass="text-pacify-gold hover:text-pacify-gold/80"
            onOverrideChange={printing.onOverrideChange}
            onManualRawChange={printing.onManualRawChange}
          />
          {printing.override && (
            <ManualTotalInput
              label="Printing cost (PKR, total)"
              value={printing.manualRaw}
              onChange={printing.onManualRawChange}
            />
          )}
          <p className="text-[11px] text-gray-600 mt-2">
            Qty {quantity.toLocaleString("en-US")}
            {printingItem.meta?.usedAutomatic
              ? " · Auto"
              : " · Manual override"}
          </p>
        </Card>
      )}

      {/* Die */}
      {dieItem && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-amber-200">Die</h3>
            <span className="text-sm font-bold text-white tabular-nums">
              {formatPkrTotal(dieItem.total)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-3">
            <div>
              <p className="text-gray-600">Default</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkrTotal(Number(dieItem.meta?.autoTotal ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Cost / unit</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkr(dieItem.perUnit)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Quantity</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {quantity.toLocaleString("en-US")}
              </p>
            </div>
          </div>
          <div className="mb-3 max-w-xs">
            <ConfigNumber
              label="Die cost (PKR)"
              value={config.die.fixedCost}
              step="100"
              hint="Default 5000"
              onChange={(n) =>
                onConfigChange({
                  ...config,
                  die: { ...config.die, fixedCost: n },
                })
              }
            />
          </div>
          <OverrideToggle
            override={die.override}
            autoLabel={formatPkrTotal(Number(dieItem.meta?.autoTotal ?? 0))}
            currentTotal={Number(dieItem.meta?.autoTotal ?? 0)}
            linkClass="text-amber-400 hover:text-amber-300"
            onOverrideChange={die.onOverrideChange}
            onManualRawChange={die.onManualRawChange}
          />
          {die.override && (
            <ManualTotalInput
              label="Die cost (PKR, total)"
              value={die.manualRaw}
              onChange={die.onManualRawChange}
            />
          )}
        </Card>
      )}

      {/* Cutting */}
      {cuttingItem && (
        <Card className="border-orange-500/20 bg-orange-500/5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-orange-200">Cutting</h3>
            <span className="text-sm font-bold text-white tabular-nums">
              {formatPkrTotal(cuttingItem.total)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-3">
            <div>
              <p className="text-gray-600">Default</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkrTotal(Number(cuttingItem.meta?.autoTotal ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Cost / unit</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkr(cuttingItem.perUnit)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Quantity</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {quantity.toLocaleString("en-US")}
              </p>
            </div>
          </div>
          <div className="mb-3 max-w-xs">
            <ConfigNumber
              label="Cutting cost (PKR)"
              value={config.cutting.fixedCost}
              step="100"
              hint="Default 5000"
              onChange={(n) =>
                onConfigChange({
                  ...config,
                  cutting: { ...config.cutting, fixedCost: n },
                })
              }
            />
          </div>
          <OverrideToggle
            override={cutting.override}
            autoLabel={formatPkrTotal(Number(cuttingItem.meta?.autoTotal ?? 0))}
            currentTotal={Number(cuttingItem.meta?.autoTotal ?? 0)}
            linkClass="text-orange-400 hover:text-orange-300"
            onOverrideChange={cutting.onOverrideChange}
            onManualRawChange={cutting.onManualRawChange}
          />
          {cutting.override && (
            <ManualTotalInput
              label="Cutting cost (PKR, total)"
              value={cutting.manualRaw}
              onChange={cutting.onManualRawChange}
            />
          )}
        </Card>
      )}

      {/* Pasting */}
      {pastingItem && (
        <Card className="border-lime-500/20 bg-lime-500/5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-lime-200">Pasting</h3>
            <span className="text-sm font-bold text-white tabular-nums">
              {formatPkrTotal(pastingItem.total)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-3">
            <div>
              <p className="text-gray-600">Default</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkrTotal(Number(pastingItem.meta?.autoTotal ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Cost / unit</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkr(pastingItem.perUnit)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Quantity</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {quantity.toLocaleString("en-US")}
              </p>
            </div>
          </div>
          <div className="mb-3 max-w-xs">
            <ConfigNumber
              label="Pasting cost (PKR)"
              value={config.pasting.fixedCost}
              step="100"
              hint="Default 5000"
              onChange={(n) =>
                onConfigChange({
                  ...config,
                  pasting: { ...config.pasting, fixedCost: n },
                })
              }
            />
          </div>
          <OverrideToggle
            override={pasting.override}
            autoLabel={formatPkrTotal(Number(pastingItem.meta?.autoTotal ?? 0))}
            currentTotal={Number(pastingItem.meta?.autoTotal ?? 0)}
            linkClass="text-lime-400 hover:text-lime-300"
            onOverrideChange={pasting.onOverrideChange}
            onManualRawChange={pasting.onManualRawChange}
          />
          {pasting.override && (
            <ManualTotalInput
              label="Pasting cost (PKR, total)"
              value={pasting.manualRaw}
              onChange={pasting.onManualRawChange}
            />
          )}
        </Card>
      )}

      {/* Corrugation */}
      {corrugationItem && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-emerald-200">
              Corrugation
            </h3>
            <span className="text-sm font-bold text-white tabular-nums">
              {formatPkrTotal(corrugationItem.total)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs mb-3">
            <div>
              <p className="text-gray-600">Pcs / roll</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {corrugationItem.meta?.totalPcsPerRoll}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Total rolls</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {corrugationItem.meta?.totalRolls}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Corrugation cost</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkrTotal(Number(corrugationItem.meta?.corrugationCost ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Corr pasting</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkrTotal(Number(corrugationItem.meta?.pastingCost ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Cost / unit</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkr(corrugationItem.perUnit)}
              </p>
            </div>
          </div>
          <OverrideToggle
            override={corrugation.override}
            autoLabel={formatPkrTotal(
              Number(corrugationItem.meta?.autoTotal ?? corrugationItem.total),
            )}
            currentTotal={Number(corrugationItem.meta?.autoTotal ?? corrugationItem.total)}
            linkClass="text-emerald-400 hover:text-emerald-300"
            onOverrideChange={corrugation.onOverrideChange}
            onManualRawChange={corrugation.onManualRawChange}
          />
          {corrugation.override && (
            <ManualTotalInput
              label="Corrugation cost (PKR, total)"
              value={corrugation.manualRaw}
              onChange={corrugation.onManualRawChange}
            />
          )}
        </Card>
      )}

      {/* Shipping */}
      {shippingItem && (
        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-indigo-200">Shipping</h3>
            <span className="text-sm font-bold text-white tabular-nums">
              {formatPkrTotal(shippingItem.total)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
            <div>
              <p className="text-gray-600">Weight</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {shippingItem.meta?.totalWeightKg} kg
              </p>
            </div>
            <div>
              <p className="text-gray-600">GSM</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {shippingItem.meta?.gsm}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Rate / kg</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {shippingItem.meta?.ratePerKg} PKR
              </p>
            </div>
            <div>
              <p className="text-gray-600">Cost / unit</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkr(shippingItem.perUnit)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <ConfigNumber
              label="Shipping GSM"
              value={config.shipping.gsm}
              step="1"
              hint="Default 450"
              onChange={(n) =>
                onConfigChange({
                  ...config,
                  shipping: { ...config.shipping, gsm: n },
                })
              }
            />
            <ConfigNumber
              label="Shipping rate (PKR/kg)"
              value={config.shipping.ratePerKg}
              step="100"
              hint="Default 3000"
              onChange={(n) =>
                onConfigChange({
                  ...config,
                  shipping: { ...config.shipping, ratePerKg: n },
                })
              }
            />
          </div>
          <OverrideToggle
            override={shipping.override}
            autoLabel={formatPkrTotal(
              Number(shippingItem.meta?.autoTotal ?? shippingItem.total),
            )}
            currentTotal={Number(shippingItem.meta?.autoTotal ?? shippingItem.total)}
            linkClass="text-indigo-400 hover:text-indigo-300"
            onOverrideChange={shipping.onOverrideChange}
            onManualRawChange={shipping.onManualRawChange}
          />
          {shipping.override && (
            <ManualTotalInput
              label="Shipping cost (PKR, total)"
              value={shipping.manualRaw}
              onChange={shipping.onManualRawChange}
            />
          )}
        </Card>
      )}

      {/* Extra */}
      {extraItem && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-amber-200">Extra</h3>
            <span className="text-sm font-bold text-white tabular-nums">
              {formatPkrTotal(extraItem.total)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-gray-600">Amount</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkrTotal(extraItem.total)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Cost / unit</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {formatPkr(extraItem.perUnit)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Quantity</p>
              <p className="text-gray-300 mt-0.5 tabular-nums">
                {quantity.toLocaleString("en-US")}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-gray-600 mt-2">
            Edit from Extra (PKR) in Closed Box Dimensions & Cost Settings
          </p>
        </Card>
      )}
    </div>
  );
}

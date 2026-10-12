"use client";

import { Card } from "@/components/ui/Card";
import type { MoroccoPaperConfig } from "@/lib/cost/costConfig";
import {
  calcMoroccoCost,
  calcMoroccoNesting,
  isMoroccoError,
} from "@/lib/cost/items/moroccoPaperCost";
import { formatPkr, formatPkrTotal } from "@/lib/cost/currency";
import { formatLength } from "@/lib/lengthUnits";

interface Props {
  pieceWidthIn: number;
  pieceHeightIn: number;
  quantity: number | null;
  config: MoroccoPaperConfig;
}

export function MoroccoRollPanel({
  pieceWidthIn,
  pieceHeightIn,
  quantity,
  config,
}: Props) {
  const orientation = calcMoroccoNesting(
    pieceWidthIn,
    pieceHeightIn,
    config.rollWidthIn,
  );
  const costResult =
    quantity != null
      ? calcMoroccoCost(pieceWidthIn, pieceHeightIn, quantity, config)
      : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-white">Morocco Paper</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Required piece size:{" "}
          <span className="text-gray-300 font-medium tabular-nums">
            {formatLength(pieceWidthIn, "in")} ×{" "}
            {formatLength(pieceHeightIn, "in")} in
          </span>
          <span className="text-gray-600">
            {" "}
            · Roll width {config.rollWidthIn} in
          </span>
        </p>
      </div>

      {!orientation ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-red-300">
            Piece is wider than the roll.
          </p>
        </div>
      ) : (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <p className="text-xs font-medium text-violet-300/70 uppercase tracking-wide mb-2">
            Roll nesting
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-gray-600">Orientation</p>
              <p className="text-white font-semibold mt-0.5">
                {orientation.label}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Pieces across</p>
              <p className="text-white font-semibold mt-0.5 tabular-nums">
                {orientation.piecesAcross}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Roll length / piece</p>
              <p className="text-white font-semibold mt-0.5 tabular-nums">
                {orientation.rollLengthPerPiece.toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })}{" "}
                in
              </p>
            </div>
            <div>
              <p className="text-gray-600">Cost / unit</p>
              <p className="text-white font-semibold mt-0.5 tabular-nums">
                {costResult && !isMoroccoError(costResult)
                  ? formatPkr(costResult.perUnit)
                  : "—"}
              </p>
            </div>
            {costResult && !isMoroccoError(costResult) && (
              <>
                <div>
                  <p className="text-gray-600">Total roll length</p>
                  <p className="text-white font-semibold mt-0.5 tabular-nums">
                    {costResult.totalRollLengthIn.toLocaleString("en-US", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    in
                  </p>
                  <p className="text-gray-500 mt-0.5 tabular-nums">
                    {costResult.totalRollLengthYards.toLocaleString("en-US", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    yards
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Total cost</p>
                  <p className="text-lg font-bold text-violet-300 mt-0.5 tabular-nums">
                    {formatPkrTotal(costResult.total)}
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

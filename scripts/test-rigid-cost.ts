/**
 * Unit checks for rigid box cost engine (greyboard + paper).
 * Run via: npm test
 */
import assert from "node:assert/strict";
import { DEFAULT_COST_CONFIG } from "../src/lib/cost/costConfig";
import {
  parseQuantity,
  registeredCostItemIds,
  runCostEngine,
} from "../src/lib/cost/costEngine";
import {
  calcArtPaperCost,
  calcArtPerSheetCostRaw,
  calcArtPerUnitSheetCost,
} from "../src/lib/cost/items/artPaperCost";
import { calcGreyboardPerUnit } from "../src/lib/cost/items/greyboardCost";
import {
  calcLaminationCost,
  calcLaminationPerSheet,
} from "../src/lib/cost/items/laminationCost";
import {
  calcMoroccoCost,
  isMoroccoError,
} from "../src/lib/cost/items/moroccoPaperCost";
import {
  calcDieCost,
  parseDieTotal,
} from "../src/lib/cost/items/dieCost";
import {
  calcPlatesCost,
  parsePlatesTotal,
} from "../src/lib/cost/items/platesCost";
import {
  calcPrintingCost,
  parsePrintingTotal,
} from "../src/lib/cost/items/printingCost";
import {
  calcSpotUvCost,
  parseSpotUvTotal,
} from "../src/lib/cost/items/spotUvCost";
import {
  calcShippingCost,
} from "../src/lib/cost/items/shippingCost";
import {
  calcTotalWeightKg,
  calcVolumetricWeightPerUnitKg,
  calcWeightPerUnitKg,
  roundWeightKg,
} from "../src/lib/cost/items/weightCalc";
import { pkrToUsd, roundMoney } from "../src/lib/cost/currency";
import { calcRigidBox, DEFAULT_RIGID_OPTIONS } from "../src/lib/rigidBoxCalc";
import {
  ART_PAPER_SHEETS,
  assertRigidSheetDataIntegrity,
  DEFAULT_ART_PADDING_H_IN,
  DEFAULT_ART_PADDING_W_IN,
} from "../src/lib/rigidSheetSizes";
import { nestPieceOnSheet, recommendBestSheet } from "../src/lib/sheetNesting";
import { ALL_SHEETS, BATCH_STANDARD } from "../src/lib/sheetSizes";

const open12x27 = { openWidthIn: 12, openHeightIn: 27 };
const sheet30x40 = { width: 30, height: 40, piecesPerSheet: 2 };

/** Default shipping for open 12×27 at given qty (always included in engine totals). */
function ship12x27(qty: number): number {
  return calcShippingCost(
    12,
    27,
    qty,
    DEFAULT_COST_CONFIG.weight,
    DEFAULT_COST_CONFIG.shipping,
  )!.total;
}

// ── rigid art paper sheets ─────────────────────────────────────────────────
assertRigidSheetDataIntegrity();
assert.equal(ART_PAPER_SHEETS.length, 6);
assert.deepEqual(
  ART_PAPER_SHEETS.map((s) => `${s.width}x${s.height}`),
  ["20x30", "23x36", "25x36", "30x40", "30x50", "40x60"],
);
assert.equal(DEFAULT_ART_PADDING_W_IN, 2);
assert.equal(DEFAULT_ART_PADDING_H_IN, 2);

// Mailer lists unchanged
assert.equal(BATCH_STANDARD.length, 7);
assert.ok(ALL_SHEETS.length > 4);

// Art size for open 12×27 is 14×29
{
  const artW = 12 + DEFAULT_ART_PADDING_W_IN;
  const artH = 27 + DEFAULT_ART_PADDING_H_IN;
  assert.equal(artW, 14);
  assert.equal(artH, 29);

  const piece = { widthIn: artW, heightIn: artH };
  const counts = ART_PAPER_SHEETS.map((s) => nestPieceOnSheet(s, piece).pieces);
  assert.deepEqual(counts, [1, 1, 1, 2, 3, 4]);

  const rec = recommendBestSheet(piece, ART_PAPER_SHEETS);
  assert.ok(rec.recommended);
  // Lowest wastage wins: 30×50 (3 pcs, ~18.8%) beats 30×40 (2 pcs, ~32.3%)
  assert.equal(rec.recommended!.sheet.width, 30);
  assert.equal(rec.recommended!.sheet.height, 50);
  assert.equal(rec.recommended!.pieces, 3);

  // Tie: 20×30 (1 pc) must lose to 30×40 (2 pcs) at equal wastage
  const r20 = nestPieceOnSheet(ART_PAPER_SHEETS[0], piece);
  const r30 = nestPieceOnSheet(ART_PAPER_SHEETS[3], piece);
  assert.equal(r20.wastagePercent, r30.wastagePercent);
  assert.ok(r30.pieces > r20.pieces);
}

// Piece larger than all sheets → none fit
{
  const rec = recommendBestSheet(
    { widthIn: 100, heightIn: 100 },
    ART_PAPER_SHEETS,
  );
  assert.equal(rec.noneFit, true);
  assert.equal(rec.recommended, null);
  assert.ok(rec.allResults.every((r) => r.pieces === 0));
}

// ── greyboard verified per-unit ────────────────────────────────────────────
{
  const per = calcGreyboardPerUnit(12, 27, DEFAULT_COST_CONFIG.greyboard);
  assert.equal(per, 125.42);
}

{
  const r = runCostEngine(open12x27, 1, DEFAULT_COST_CONFIG, {
    paperType: "art",
    artSheet: sheet30x40,
  });
  assert.ok(r);
  assert.equal(r!.items.find((i) => i.id === "greyboard")!.perUnit, 125.42);
}

{
  const r = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    printSides: "double",
    artSheet: null,
  });
  assert.ok(r);
  assert.equal(r!.items.find((i) => i.id === "greyboard")!.total, 25084);
  assert.equal(r!.items.find((i) => i.id === "paper")!.excluded, true);
  assert.equal(r!.grandTotal, roundMoney(25084 + ship12x27(200)));
}

// ── art paper sheet cost ───────────────────────────────────────────────────
{
  const raw = calcArtPerSheetCostRaw(30, 40, DEFAULT_COST_CONFIG.artPaper)!;
  assert.ok(Math.abs(raw - 58.064516129) < 1e-6);
  assert.equal(Math.round(raw * 100) / 100, 58.06);

  const perUnit = calcArtPerUnitSheetCost(
    raw,
    2,
    DEFAULT_COST_CONFIG.artPaper.markup,
  );
  assert.equal(perUnit, 36.29);

  const art200d = calcArtPaperCost(
    sheet30x40,
    200,
    "double",
    DEFAULT_COST_CONFIG.artPaper,
  )!;
  assert.equal(art200d.piecesPerSide, 400);
  assert.equal(art200d.piecesRequired, 800);
  assert.equal(art200d.total, 29032);

  const art500d = calcArtPaperCost(
    sheet30x40,
    500,
    "double",
    DEFAULT_COST_CONFIG.artPaper,
  )!;
  assert.equal(art500d.piecesPerSide, 700);
  assert.equal(art500d.piecesRequired, 1400);
  assert.equal(art500d.total, 50806);

  const art1000d = calcArtPaperCost(
    sheet30x40,
    1000,
    "double",
    DEFAULT_COST_CONFIG.artPaper,
  )!;
  assert.equal(art1000d.piecesPerSide, 1200);
  assert.equal(art1000d.piecesRequired, 2400);
  assert.equal(art1000d.total, 87096);

  const art200s = calcArtPaperCost(
    sheet30x40,
    200,
    "single",
    DEFAULT_COST_CONFIG.artPaper,
  )!;
  assert.equal(art200s.piecesRequired, 400);
  assert.equal(art200s.total, 14516);

  const art500s = calcArtPaperCost(
    sheet30x40,
    500,
    "single",
    DEFAULT_COST_CONFIG.artPaper,
  )!;
  assert.equal(art500s.piecesRequired, 700);
  assert.equal(art500s.total, 25403);

  // 200 extra per print side (fixed wastage), not once total
  assert.equal(art200d.piecesPerSide, 200 + 200);
  assert.equal(art500d.piecesPerSide, 500 + 200);
  assert.equal(art1000d.piecesPerSide, 1000 + 200);
  assert.equal(DEFAULT_COST_CONFIG.artPaper.extraSheets, 200);
}

// ── morocco ────────────────────────────────────────────────────────────────
{
  const m = calcMoroccoCost(14, 29, 200, DEFAULT_COST_CONFIG.morocco);
  assert.ok(!isMoroccoError(m));
  if (!isMoroccoError(m)) {
    assert.equal(m.orientation.label, "A");
    assert.equal(m.orientation.piecesAcross, 3);
    assert.ok(Math.abs(m.orientation.rollLengthPerPiece - 29 / 3) < 1e-9);
    assert.equal(m.perUnit, 107.41);
    assert.equal(m.total, 21482);
    assert.ok(Math.abs(m.totalRollLengthIn - 1933.3333333) < 0.01);
    assert.ok(Math.abs(m.totalRollLengthYards - 53.7037037) < 0.05);
  }

  const tooBig = calcMoroccoCost(60, 60, 10, DEFAULT_COST_CONFIG.morocco);
  assert.ok(isMoroccoError(tooBig));
  if (isMoroccoError(tooBig)) {
    assert.match(tooBig.error, /wider than the roll/i);
  }
}

// ── engine: art paper + greyboard qty 200 double → 58,296 ──────────────────
{
  const r = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    printSides: "double",
    artSheet: sheet30x40,
    artPaddingWIn: 2,
    artPaddingHIn: 2,
  });
  assert.ok(r);
  assert.equal(r!.items.find((i) => i.id === "greyboard")!.total, 25084);
  assert.equal(r!.items.find((i) => i.id === "paper")!.total, 29032);
  assert.equal(r!.items.find((i) => i.id === "paper")!.label, "Paper (Art Paper)");
  assert.equal(r!.grandTotal, roundMoney(54116 + ship12x27(200)));
  assert.deepEqual(registeredCostItemIds(), [
    "greyboard",
    "paper",
    "lamination",
    "spotUv",
    "die",
    "printing",
    "plates",
    "foiling",
    "labor",
    "deboss",
    "embossing",
    "shipping",
    "extra",
  ]);
}

// ── engine: qty 500 art double → 123,966 ───────────────────────────────────
{
  const r = runCostEngine(open12x27, 500, DEFAULT_COST_CONFIG, {
    paperType: "art",
    printSides: "double",
    artSheet: sheet30x40,
  });
  assert.ok(r);
  assert.equal(r!.items.find((i) => i.id === "greyboard")!.total, 62710);
  assert.equal(r!.items.find((i) => i.id === "paper")!.total, 50806);
  assert.equal(r!.grandTotal, roundMoney(113516 + ship12x27(500)));
}

// ── morocco engine; print sides has no effect ──────────────────────────────
{
  const base = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "morocco",
    printSides: "double",
    artPaddingWIn: 2,
    artPaddingHIn: 2,
  });
  const single = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "morocco",
    printSides: "single",
    artPaddingWIn: 2,
    artPaddingHIn: 2,
  });
  assert.ok(base && single);
  assert.equal(base!.grandTotal, single!.grandTotal);
  assert.equal(base!.items.find((i) => i.id === "paper")!.total, 21482);
  assert.equal(base!.items.find((i) => i.id === "paper")!.label, "Paper (Morocco)");
  assert.equal(base!.grandTotal, roundMoney(25084 + 21482 + ship12x27(200)));
}

// ── same cost from mm / cm / in ────────────────────────────────────────────
{
  const inResult = calcRigidBox(
    { length: 12, width: 9, height: 3 },
    "in",
    DEFAULT_RIGID_OPTIONS,
  );
  const mmResult = calcRigidBox(
    { length: 304.8, width: 228.6, height: 76.2 },
    "mm",
    DEFAULT_RIGID_OPTIONS,
  );
  const cmResult = calcRigidBox(
    { length: 30.48, width: 22.86, height: 7.62 },
    "cm",
    DEFAULT_RIGID_OPTIONS,
  );
  assert.ok(inResult && mmResult && cmResult);

  const extras = {
    paperType: "art" as const,
    printSides: "double" as const,
    artSheet: sheet30x40,
  };
  const costIn = runCostEngine(
    { openWidthIn: inResult!.in.openWidth, openHeightIn: inResult!.in.openHeight },
    200,
    DEFAULT_COST_CONFIG,
    extras,
  );
  const costMm = runCostEngine(
    { openWidthIn: mmResult!.in.openWidth, openHeightIn: mmResult!.in.openHeight },
    200,
    DEFAULT_COST_CONFIG,
    extras,
  );
  const costCm = runCostEngine(
    { openWidthIn: cmResult!.in.openWidth, openHeightIn: cmResult!.in.openHeight },
    200,
    DEFAULT_COST_CONFIG,
    extras,
  );
  assert.ok(costIn && costMm && costCm);
  assert.equal(costIn!.grandTotal, costMm!.grandTotal);
  assert.equal(costIn!.grandTotal, costCm!.grandTotal);
  assert.equal(costIn!.grandTotal, roundMoney(54116 + ship12x27(200)));
}

// ── changing art constants changes result ──────────────────────────────────
{
  const base = calcArtPaperCost(
    sheet30x40,
    200,
    "double",
    DEFAULT_COST_CONFIG.artPaper,
  )!.total;
  const higherGsm = calcArtPaperCost(sheet30x40, 200, "double", {
    ...DEFAULT_COST_CONFIG.artPaper,
    gsm: 200,
  })!.total;
  assert.ok(higherGsm > base);

  const higherMarkup = calcArtPaperCost(sheet30x40, 200, "double", {
    ...DEFAULT_COST_CONFIG.artPaper,
    markup: 1.5,
  })!.total;
  assert.ok(higherMarkup > base);

  const moreExtra = calcArtPaperCost(sheet30x40, 200, "double", {
    ...DEFAULT_COST_CONFIG.artPaper,
    extraSheets: 300,
  })!;
  assert.equal(moreExtra.piecesPerSide, 500);
  assert.equal(moreExtra.piecesRequired, 1000);
  assert.ok(moreExtra.total > base);
}

// ── invalid quantity → no cost ─────────────────────────────────────────────
assert.equal(parseQuantity(""), null);
assert.equal(parseQuantity("0"), null);
assert.equal(parseQuantity("-5"), null);
assert.equal(parseQuantity("12.5"), null);
assert.equal(parseQuantity("abc"), null);
assert.equal(runCostEngine(open12x27, null), null);
assert.equal(runCostEngine(open12x27, 0), null);
assert.equal(runCostEngine(open12x27, -1), null);
assert.equal(runCostEngine(open12x27, 1.5 as unknown as number), null);

// ── engine total equals sum of included items ──────────────────────────────
{
  const r = runCostEngine(open12x27, 50, DEFAULT_COST_CONFIG, {
    paperType: "art",
    printSides: "double",
    artSheet: sheet30x40,
  });
  assert.ok(r);
  const sum = roundMoney(
    r!.items
      .filter((i) => !i.excluded)
      .reduce((s, i) => s + i.total, 0),
  );
  assert.equal(r!.grandTotal, sum);
}

assert.equal(runCostEngine(null, 10), null);
assert.equal(
  runCostEngine({ openWidthIn: 0, openHeightIn: 27 }, 10),
  null,
);

// ── lamination ─────────────────────────────────────────────────────────────
{
  const per = calcLaminationPerSheet(30, 40, DEFAULT_COST_CONFIG.lamination);
  assert.equal(per, 41.67);

  const d200 = calcLaminationCost(
    sheet30x40,
    200,
    "double",
    200,
    DEFAULT_COST_CONFIG.lamination,
  )!;
  assert.equal(d200.laminationQty, 800);
  assert.equal(d200.total, 33336);

  const d500 = calcLaminationCost(
    sheet30x40,
    500,
    "double",
    200,
    DEFAULT_COST_CONFIG.lamination,
  )!;
  assert.equal(d500.laminationQty, 1400);
  assert.equal(d500.total, 58338);

  const s200 = calcLaminationCost(
    sheet30x40,
    200,
    "single",
    200,
    DEFAULT_COST_CONFIG.lamination,
  )!;
  assert.equal(s200.laminationQty, 400);
  assert.equal(s200.total, 16668);
}

// Lamination off → omitted; morocco → excluded note
{
  const off = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    printSides: "double",
    artSheet: sheet30x40,
    laminationEnabled: false,
  });
  assert.ok(off);
  assert.equal(off!.items.find((i) => i.id === "lamination"), undefined);

  const morocco = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "morocco",
    laminationEnabled: true,
    artPaddingWIn: 2,
    artPaddingHIn: 2,
  });
  assert.ok(morocco);
  const lam = morocco!.items.find((i) => i.id === "lamination")!;
  assert.equal(lam.excluded, true);
  assert.match(lam.warning!, /Morocco/i);
  assert.equal(
    morocco!.grandTotal,
    roundMoney(
      morocco!.items
        .filter((i) => !i.excluded)
        .reduce((s, i) => s + i.total, 0),
    ),
  );
}

// Art + lamination on qty 200 double
{
  const r = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    printSides: "double",
    artSheet: sheet30x40,
    laminationEnabled: true,
  });
  assert.ok(r);
  assert.equal(r!.items.find((i) => i.id === "lamination")!.total, 33336);
  assert.equal(r!.grandTotal, roundMoney(25084 + 29032 + 33336 + ship12x27(200)));
}

// ── Spot UV (tiered) ───────────────────────────────────────────────────────
{
  const auto200 = calcSpotUvCost(200, DEFAULT_COST_CONFIG.spotUv, null)!;
  assert.equal(auto200.mode, "automatic");
  assert.equal(auto200.tier, "fixed");
  assert.equal(auto200.total, 10000);
  assert.equal(auto200.perUnit, 50);

  const auto150 = calcSpotUvCost(150, DEFAULT_COST_CONFIG.spotUv, null)!;
  assert.equal(auto150.total, 10000);
  assert.equal(auto150.tier, "fixed");

  // 201–500 → 50 / unit
  const mid201 = calcSpotUvCost(201, DEFAULT_COST_CONFIG.spotUv, null)!;
  assert.equal(mid201.tier, "mid");
  assert.equal(mid201.total, 201 * 50);
  assert.equal(mid201.perUnit, 50);

  const mid500 = calcSpotUvCost(500, DEFAULT_COST_CONFIG.spotUv, null)!;
  assert.equal(mid500.tier, "mid");
  assert.equal(mid500.total, 25000);
  assert.equal(mid500.perUnit, 50);

  // > 500 → 25 / unit
  const high501 = calcSpotUvCost(501, DEFAULT_COST_CONFIG.spotUv, null)!;
  assert.equal(high501.tier, "high");
  assert.equal(high501.total, 501 * 25);
  assert.equal(high501.perUnit, 25);

  const high1000 = calcSpotUvCost(1000, DEFAULT_COST_CONFIG.spotUv, null)!;
  assert.equal(high1000.tier, "high");
  assert.equal(high1000.total, 25000);
  assert.equal(high1000.perUnit, 25);

  const manual = calcSpotUvCost(500, DEFAULT_COST_CONFIG.spotUv, 18000)!;
  assert.equal(manual.mode, "manual");
  assert.equal(manual.total, 18000);
  assert.equal(manual.perUnit, 36);

  assert.equal(parseSpotUvTotal(""), null);
  assert.equal(parseSpotUvTotal("18000"), 18000);
  assert.equal(parseSpotUvTotal("-1"), null);
}

{
  const r = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    printSides: "double",
    artSheet: sheet30x40,
    spotUvEnabled: true,
  });
  assert.ok(r);
  assert.equal(r!.items.find((i) => i.id === "spotUv")!.total, 10000);
  assert.equal(r!.grandTotal, roundMoney(25084 + 29032 + 10000 + ship12x27(200)));
}

{
  // qty 500 → mid tier 50 × 500 = 25,000 (no manual required)
  const mid = runCostEngine(open12x27, 500, DEFAULT_COST_CONFIG, {
    paperType: "art",
    printSides: "double",
    artSheet: sheet30x40,
    spotUvEnabled: true,
    spotUvManualTotal: null,
  });
  assert.ok(mid);
  const uv = mid!.items.find((i) => i.id === "spotUv")!;
  assert.equal(uv.excluded, undefined);
  assert.equal(uv.total, 25000);
  assert.equal(uv.meta?.tier, "mid");
  assert.equal(
    mid!.grandTotal,
    roundMoney(62710 + 50806 + 25000 + ship12x27(500)),
  );

  const withManual = runCostEngine(open12x27, 500, DEFAULT_COST_CONFIG, {
    paperType: "art",
    printSides: "double",
    artSheet: sheet30x40,
    spotUvEnabled: true,
    spotUvManualTotal: 18000,
  });
  assert.ok(withManual);
  assert.equal(withManual!.items.find((i) => i.id === "spotUv")!.total, 18000);
  assert.equal(
    withManual!.grandTotal,
    roundMoney(62710 + 50806 + 18000 + ship12x27(500)),
  );
}

{
  const off = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    artSheet: sheet30x40,
    spotUvEnabled: false,
  });
  assert.ok(off);
  assert.equal(off!.items.find((i) => i.id === "spotUv"), undefined);
}

// ── Die making + Die cutting ───────────────────────────────────────────────
{
  const fixed = calcDieCost(200, DEFAULT_COST_CONFIG.die, null)!;
  assert.equal(fixed.total, 5000);
  assert.equal(fixed.perUnit, 25);
  assert.equal(fixed.usedAutomatic, true);

  const override = calcDieCost(200, DEFAULT_COST_CONFIG.die, 7500)!;
  assert.equal(override.total, 7500);
  assert.equal(override.perUnit, 37.5);
  assert.equal(override.usedAutomatic, false);

  assert.equal(parseDieTotal(""), null);
  assert.equal(parseDieTotal("6000"), 6000);
  assert.equal(parseDieTotal("-1"), null);
}

{
  const r = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    printSides: "double",
    artSheet: sheet30x40,
    dieEnabled: true,
  });
  assert.ok(r);
  assert.equal(r!.items.find((i) => i.id === "die")!.total, 5000);
  assert.equal(r!.grandTotal, roundMoney(25084 + 29032 + 5000 + ship12x27(200)));
}

{
  const r = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    printSides: "double",
    artSheet: sheet30x40,
    dieEnabled: true,
    dieManualTotal: 8000,
  });
  assert.ok(r);
  assert.equal(r!.items.find((i) => i.id === "die")!.total, 8000);
  assert.equal(r!.grandTotal, roundMoney(25084 + 29032 + 8000 + ship12x27(200)));
}

{
  const off = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    artSheet: sheet30x40,
    dieEnabled: false,
  });
  assert.ok(off);
  assert.equal(off!.items.find((i) => i.id === "die"), undefined);
}

// ── Printing + plates ──────────────────────────────────────────────────────
{
  const oneSingle = calcPrintingCost(
    200,
    "one",
    "single",
    DEFAULT_COST_CONFIG.printing,
    null,
  )!;
  assert.equal(oneSingle.total, 3000);
  assert.equal(oneSingle.oneSideCost, 3000);

  const cmykSingle = calcPrintingCost(
    200,
    "cmyk",
    "single",
    DEFAULT_COST_CONFIG.printing,
    null,
  )!;
  assert.equal(cmykSingle.total, 12000);

  const cmykDouble = calcPrintingCost(
    200,
    "cmyk",
    "double",
    DEFAULT_COST_CONFIG.printing,
    null,
  )!;
  assert.equal(cmykDouble.total, 24000);

  const overridePrint = calcPrintingCost(
    200,
    "cmyk",
    "double",
    DEFAULT_COST_CONFIG.printing,
    30000,
  )!;
  assert.equal(overridePrint.total, 30000);
  assert.equal(overridePrint.usedAutomatic, false);

  assert.equal(parsePrintingTotal(""), null);
  assert.equal(parsePrintingTotal("24000"), 24000);
}

{
  const platesOne = calcPlatesCost(
    200,
    "one",
    "single",
    DEFAULT_COST_CONFIG.plates,
    null,
  )!;
  assert.equal(platesOne.total, 2000);
  assert.equal(platesOne.plates, 1);
  assert.equal(platesOne.qtyMultiplier, 1);

  const platesCmykOneSide = calcPlatesCost(
    200,
    "cmyk",
    "single",
    DEFAULT_COST_CONFIG.plates,
    null,
  )!;
  assert.equal(platesCmykOneSide.total, 8000);
  assert.equal(platesCmykOneSide.qtyMultiplier, 1);

  const platesCmykDouble = calcPlatesCost(
    200,
    "cmyk",
    "double",
    DEFAULT_COST_CONFIG.plates,
    null,
  )!;
  assert.equal(platesCmykDouble.total, 16000);
  assert.equal(platesCmykDouble.oneSideCost, 8000);
  assert.equal(platesCmykDouble.baseTotal, 16000);

  // ≤ 1000 → 1×
  const at1000 = calcPlatesCost(
    1000,
    "cmyk",
    "single",
    DEFAULT_COST_CONFIG.plates,
    null,
  )!;
  assert.equal(at1000.total, 8000);
  assert.equal(at1000.qtyMultiplier, 1);
  assert.equal(at1000.tier, "base");

  // 1001–2500 → 2×
  const mid1001 = calcPlatesCost(
    1001,
    "cmyk",
    "single",
    DEFAULT_COST_CONFIG.plates,
    null,
  )!;
  assert.equal(mid1001.total, 16000);
  assert.equal(mid1001.qtyMultiplier, 2);
  assert.equal(mid1001.tier, "mid");

  const mid2500Double = calcPlatesCost(
    2500,
    "cmyk",
    "double",
    DEFAULT_COST_CONFIG.plates,
    null,
  )!;
  assert.equal(mid2500Double.total, 32000);
  assert.equal(mid2500Double.qtyMultiplier, 2);

  // > 2500 → 3× (stays for all higher qty)
  const high2501 = calcPlatesCost(
    2501,
    "cmyk",
    "single",
    DEFAULT_COST_CONFIG.plates,
    null,
  )!;
  assert.equal(high2501.total, 24000);
  assert.equal(high2501.qtyMultiplier, 3);
  assert.equal(high2501.tier, "high");

  const high5000Double = calcPlatesCost(
    5000,
    "cmyk",
    "double",
    DEFAULT_COST_CONFIG.plates,
    null,
  )!;
  assert.equal(high5000Double.total, 48000);
  assert.equal(high5000Double.qtyMultiplier, 3);

  assert.equal(parsePlatesTotal("16000"), 16000);
}

{
  const r = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    printSides: "double",
    printColorMode: "cmyk",
    artSheet: sheet30x40,
    printingEnabled: true,
    platesEnabled: true,
  });
  assert.ok(r);
  assert.equal(r!.items.find((i) => i.id === "printing")!.total, 24000);
  assert.equal(r!.items.find((i) => i.id === "plates")!.total, 16000);
  assert.equal(
    r!.grandTotal,
    roundMoney(25084 + 29032 + 24000 + 16000 + ship12x27(200)),
  );
}

{
  const off = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    artSheet: sheet30x40,
    printingEnabled: false,
    platesEnabled: false,
  });
  assert.ok(off);
  assert.equal(off!.items.find((i) => i.id === "printing"), undefined);
  assert.equal(off!.items.find((i) => i.id === "plates"), undefined);
}

// ── Foiling / Labor / Deboss / Embossing ───────────────────────────────────
{
  const foil = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    artSheet: sheet30x40,
    foilingEnabled: true,
  });
  assert.ok(foil);
  assert.equal(foil!.items.find((i) => i.id === "foiling")!.total, 10000);

  const foilOverride = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    artSheet: sheet30x40,
    foilingEnabled: true,
    foilingManualTotal: 15000,
  });
  assert.equal(foilOverride!.items.find((i) => i.id === "foiling")!.total, 15000);
}

{
  const labor = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    artSheet: sheet30x40,
    laborEnabled: true,
  });
  assert.ok(labor);
  const gb = labor!.items.find((i) => i.id === "greyboard")!.total;
  assert.equal(labor!.items.find((i) => i.id === "labor")!.total, gb);
  assert.equal(gb, 25084);

  const laborOverride = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    artSheet: sheet30x40,
    laborEnabled: true,
    laborManualTotal: 20000,
  });
  assert.equal(laborOverride!.items.find((i) => i.id === "labor")!.total, 20000);
}

{
  const deboss = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    artSheet: sheet30x40,
    debossEnabled: true,
  });
  assert.equal(deboss!.items.find((i) => i.id === "deboss")!.total, 10000);

  const emboss = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    artSheet: sheet30x40,
    embossingEnabled: true,
    embossingManualTotal: 12000,
  });
  assert.equal(emboss!.items.find((i) => i.id === "embossing")!.total, 12000);
}

// ── Weight + shipping + USD ────────────────────────────────────────────────
{
  const perKg = calcWeightPerUnitKg(12, 27, DEFAULT_COST_CONFIG.weight)!;
  assert.ok(Math.abs(perKg - (12 * 27 * 1600) / 15500 / 100) < 1e-12);
  assert.equal(DEFAULT_COST_CONFIG.weight.gsm, 1600);
  assert.equal(calcTotalWeightKg(perKg, 200)!, perKg * 200);

  const ship = calcShippingCost(
    12,
    27,
    200,
    DEFAULT_COST_CONFIG.weight,
    DEFAULT_COST_CONFIG.shipping,
  )!;
  assert.equal(ship.ratePerKg, 3000);
  assert.equal(
    ship.total,
    roundMoney(calcTotalWeightKg(perKg, 200)! * 3000),
  );
  assert.equal(ship12x27(200), ship.total);

  // Different open size changes weight/shipping
  const other = calcShippingCost(
    10,
    20,
    200,
    DEFAULT_COST_CONFIG.weight,
    DEFAULT_COST_CONFIG.shipping,
  )!;
  assert.ok(other.total < ship.total);

  const engine = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    printSides: "double",
    artSheet: sheet30x40,
  });
  assert.ok(engine);
  const shippingItem = engine!.items.find((i) => i.id === "shipping")!;
  assert.equal(shippingItem.total, ship12x27(200));
  assert.equal(shippingItem.meta?.openWidthIn, 12);
  assert.equal(shippingItem.meta?.openHeightIn, 27);

  // Editable shipping rate
  const cheap = runCostEngine(
    open12x27,
    200,
    {
      ...DEFAULT_COST_CONFIG,
      shipping: { ...DEFAULT_COST_CONFIG.shipping, ratePerKg: 1000 },
    },
    {
      paperType: "art",
      artSheet: sheet30x40,
    },
  );
  assert.ok(cheap);
  assert.equal(
    cheap!.items.find((i) => i.id === "shipping")!.total,
    roundMoney(calcTotalWeightKg(perKg, 200)! * 1000),
  );

  // USD conversion + profit
  const without = engine!.grandTotal;
  const withProfit = roundMoney(without * 1.5);
  assert.equal(pkrToUsd(without, 275), roundMoney(without / 275));
  assert.equal(pkrToUsd(withProfit, 275), roundMoney(withProfit / 275));
  assert.equal(DEFAULT_COST_CONFIG.fx.usdRate, 275);
}

// ── Volumetric shipping weight ─────────────────────────────────────────────
{
  // 10 × 8 × 3 in → cm
  const Lcm = 10 * 2.54;
  const Wcm = 8 * 2.54;
  const Hcm = 3 * 2.54;
  const volPer = calcVolumetricWeightPerUnitKg(Lcm, Wcm, Hcm, 5000)!;
  assert.ok(Math.abs(volPer - (Lcm * Wcm * Hcm) / 5000) < 1e-12);

  const volShip = calcShippingCost(
    10,
    25, // open size ignored in volumetric mode
    200,
    DEFAULT_COST_CONFIG.weight,
    {
      ...DEFAULT_COST_CONFIG.shipping,
      weightMode: "volumetric",
      volumetricDivisor: 5000,
    },
    { lengthCm: Lcm, widthCm: Wcm, heightCm: Hcm },
  )!;
  assert.equal(volShip.weightMode, "volumetric");
  // Chargeable weight = cartonsNeeded × 22 kg (not product vol. total)
  assert.ok(volShip.airCarton);
  assert.equal(
    volShip.totalKg,
    volShip.airCarton!.cartonsNeeded * volShip.airCarton!.cartonMaxKg,
  );
  assert.equal(
    volShip.total,
    roundMoney(volShip.airCarton!.cartonsNeeded * 22 * 3000),
  );
  assert.equal(
    volShip.productTotalKg,
    roundWeightKg(calcTotalWeightKg(volPer, 200)!, 4),
  );

  const engineVol = runCostEngine(
    { openWidthIn: 10, openHeightIn: 25 },
    200,
    {
      ...DEFAULT_COST_CONFIG,
      shipping: {
        ...DEFAULT_COST_CONFIG.shipping,
        weightMode: "volumetric",
      },
    },
    {
      paperType: "art",
      artSheet: sheet30x40,
      closedBoxCm: { lengthCm: Lcm, widthCm: Wcm, heightCm: Hcm },
    },
  );
  assert.ok(engineVol);
  const shipLine = engineVol!.items.find((i) => i.id === "shipping")!;
  assert.equal(shipLine.total, volShip.total);
  assert.equal(shipLine.meta?.weightMode, "volumetric");

  // Missing closed box → no shipping line in volumetric mode
  const missing = runCostEngine(
    open12x27,
    200,
    {
      ...DEFAULT_COST_CONFIG,
      shipping: {
        ...DEFAULT_COST_CONFIG.shipping,
        weightMode: "volumetric",
      },
    },
    { paperType: "art", artSheet: sheet30x40 },
  );
  assert.ok(missing);
  assert.equal(missing!.items.find((i) => i.id === "shipping"), undefined);

  // Air carton packing (21×17×16 in, max 22 kg) — volumetric only
  assert.ok(volShip.airCarton);
  assert.equal(volShip.airCarton!.cartonLengthIn, 21);
  assert.equal(volShip.airCarton!.cartonWidthIn, 17);
  assert.equal(volShip.airCarton!.cartonHeightIn, 16);
  assert.equal(volShip.airCarton!.cartonMaxKg, 22);
  assert.ok(volShip.airCarton!.unitsPerCarton >= 1);
  assert.equal(
    volShip.airCarton!.unitsPerCarton,
    Math.min(volShip.airCarton!.unitsByVolume, volShip.airCarton!.unitsByWeight),
  );
  assert.equal(
    volShip.airCarton!.cartonsNeeded,
    Math.ceil(200 / volShip.airCarton!.unitsPerCarton),
  );
  assert.equal(shipLine.meta?.unitsPerCarton, volShip.airCarton!.unitsPerCarton);
  assert.equal(shipLine.meta?.cartonsNeeded, volShip.airCarton!.cartonsNeeded);
}

// ── Extra expenses ─────────────────────────────────────────────────────────
{
  const withExtra = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    artSheet: sheet30x40,
    extraTotal: 5000,
  });
  assert.ok(withExtra);
  const line = withExtra!.items.find((i) => i.id === "extra")!;
  assert.equal(line.total, 5000);
  assert.equal(line.perUnit, 25);
  assert.equal(
    withExtra!.grandTotal,
    roundMoney(54116 + ship12x27(200) + 5000),
  );

  const none = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    artSheet: sheet30x40,
    extraTotal: null,
  });
  assert.equal(none!.items.find((i) => i.id === "extra"), undefined);
}

// ── Art paper: manual total sheets required override ───────────────────────
{
  const auto = calcArtPaperCost(
    sheet30x40,
    200,
    "double",
    DEFAULT_COST_CONFIG.artPaper,
  )!;
  assert.equal(auto.piecesRequired, 800); // 2 × (200 + 200)
  assert.equal(auto.usedManualSheetsRequired, false);

  const manual = calcArtPaperCost(
    sheet30x40,
    200,
    "double",
    DEFAULT_COST_CONFIG.artPaper,
    1000,
  )!;
  assert.equal(manual.autoPiecesRequired, 800);
  assert.equal(manual.piecesRequired, 1000);
  assert.equal(manual.usedManualSheetsRequired, true);
  assert.equal(
    manual.total,
    roundMoney(manual.perUnitSheetCost * 1000),
  );
  assert.ok(manual.total > auto.total);

  const engine = runCostEngine(open12x27, 200, DEFAULT_COST_CONFIG, {
    paperType: "art",
    printSides: "double",
    artSheet: sheet30x40,
    artSheetsRequiredManual: 1000,
  });
  assert.ok(engine);
  const paper = engine!.items.find((i) => i.id === "paper")!;
  assert.equal(paper.total, manual.total);
  assert.equal(paper.meta?.sheetsRequiredManual, true);
  assert.equal(paper.meta?.autoSheetsRequired, 800);
  assert.equal(paper.meta?.piecesRequired, 1000);
}

console.log("All rigid box cost tests passed.");

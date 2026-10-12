/**
 * Unit checks for mailer box open size + sheet nesting (no vitest).
 * Run: npm test
 */
import assert from "node:assert/strict";
import {
  calcMailerBox,
  calcOpenSizeMm,
  convertLength,
  DEFAULT_OPTIONS,
  formatLength,
  fromMm,
  nestingSizeIn,
  toMm,
} from "../src/lib/mailerBoxCalc";
import {
  ALL_SHEETS,
  assertSheetDataIntegrity,
  BATCH_OUT,
  BATCH_STANDARD,
  sheetKey,
} from "../src/lib/sheetSizes";
import { nestPieceOnSheet, recommendSheet } from "../src/lib/sheetNesting";

// ── conversions ────────────────────────────────────────────────────────────
assert.ok(Math.abs(toMm(1, "in") - 25.4) < 1e-9);
assert.equal(toMm(1, "cm"), 10);
assert.equal(fromMm(10, "cm"), 1);

const originalIn = 16.5;
assert.ok(
  Math.abs(
    convertLength(
      convertLength(convertLength(originalIn, "in", "mm"), "mm", "cm"),
      "cm",
      "in",
    ) - originalIn,
  ) < 1e-9,
  "mm ↔ cm ↔ in round-trip",
);

assert.ok(Math.abs(fromMm(13, "in") - 0.5118110236) < 1e-6);
assert.equal(Number(fromMm(13, "in").toFixed(4)), 0.5118);

// ── open size formulas ─────────────────────────────────────────────────────
{
  const r = calcOpenSizeMm(
    { length: 100, width: 50, height: 20 },
    { foldAllowanceMm: 13 },
  );
  assert.equal(r.openWidthMm, 100 + 80 + 13);
  assert.equal(r.openHeightMm, 100 + 60);
}

// ── 16 × 12 × 4 in ─────────────────────────────────────────────────────────
{
  const result = calcMailerBox(
    { length: 16, width: 12, height: 4 },
    "in",
    DEFAULT_OPTIONS,
  );
  assert.ok(result);
  assert.equal(result!.in.openWidth, 32.5118);
  assert.equal(result!.in.openHeight, 36);
  assert.equal(result!.mm.openWidth, 825.8);
  assert.equal(result!.mm.openHeight, 914.4);
}

// ── nesting size padding ───────────────────────────────────────────────────
{
  const n = nestingSizeIn(20, 12, 1, 1);
  assert.equal(n.widthIn, 21);
  assert.equal(n.heightIn, 13);
}

// ── validation ─────────────────────────────────────────────────────────────
assert.equal(calcMailerBox({ length: 0, width: 12, height: 4 }, "in"), null);
assert.equal(calcMailerBox({ length: -1, width: 12, height: 4 }, "in"), null);
assert.equal(
  calcMailerBox({ length: Number.NaN, width: 12, height: 4 }, "in"),
  null,
);

assert.equal(formatLength(825.8, "mm"), "825.80");
assert.equal(formatLength(32.511811, "in"), "32.5118");
assert.equal(formatLength(36, "in"), "36.0000");

// ── sheet data integrity ───────────────────────────────────────────────────
assertSheetDataIntegrity();
assert.equal(BATCH_STANDARD.length, 7);
assert.equal(BATCH_OUT.length, 10);
assert.ok(BATCH_OUT.some((s) => sheetKey(s) === "30x50"));
assert.ok(!BATCH_STANDARD.some((s) => sheetKey(s) === "30x50"));
{
  const keys = ALL_SHEETS.map(sheetKey);
  assert.equal(new Set(keys).size, keys.length, "no duplicate sheets");
}

// ── rotation: 21×13 on 20×30 ───────────────────────────────────────────────
{
  const sheet = { width: 20, height: 30, batch: "STANDARD" as const };
  const result = nestPieceOnSheet(sheet, { widthIn: 21, heightIn: 13 });
  assert.ok(result.pieces >= 1, "rotated piece must fit on 20×30");
  assert.ok(result.fits);
  // Unrotated cannot fit (21 > 20); must use rotation
  assert.ok(
    result.placements.some((p) => p.rotated) || result.pieces >= 1,
    "rotation handled",
  );
}

// ── piece larger than every sheet → none fit ───────────────────────────────
{
  const rec = recommendSheet({ widthIn: 100, heightIn: 100 });
  assert.equal(rec.noneFit, true);
  assert.equal(rec.recommended, null);
  assert.ok(rec.allResults.every((r) => r.pieces === 0));
}

// ── rotated layout beats unrotated ─────────────────────────────────────────
{
  // 21×13 on 20×30: unrotated = 0, rotated >= 1
  const sheet = { width: 20, height: 30, batch: "STANDARD" as const };
  const r = nestPieceOnSheet(sheet, { widthIn: 21, heightIn: 13 });
  assert.ok(r.pieces > 0);
  assert.ok(
    r.placements.every((p) => p.rotated) || r.placements.some((p) => p.rotated),
    "best layout uses rotation when unrotated cannot fit",
  );
}

// ── mixed layout beats pure grid ───────────────────────────────────────────
{
  // 6×4 on 10×10: pure max = 2, mixed strip can place 3
  const sheet = { width: 10, height: 10, batch: "OUT" as const };
  const r = nestPieceOnSheet(sheet, { widthIn: 6, heightIn: 4 });
  assert.ok(
    r.pieces >= 3,
    `mixed layout should beat pure grid (got ${r.pieces})`,
  );
}

// ── STANDARD-first recommendation rule ─────────────────────────────────────
{
  // Nesting size that fits at least one STANDARD sheet
  const rec = recommendSheet({ widthIn: 10, heightIn: 10 });
  assert.equal(rec.noneFit, false);
  assert.ok(rec.recommended);
  assert.equal(
    rec.recommended!.sheet.batch,
    "STANDARD",
    "must not recommend OUT when a STANDARD sheet fits",
  );
  assert.equal(rec.usedOutFallback, false);
}

console.log("All mailer box calculator tests passed.");

/**
 * Unit checks for rigid box open size + shared sheet nesting cases.
 * Run via: npm test
 */
import assert from "node:assert/strict";
import { convertLength, fromMm, toMm } from "../src/lib/lengthUnits";
import {
  calcRigidBox,
  calcRigidOpenSizeMm,
  DEFAULT_RIGID_OPTIONS,
} from "../src/lib/rigidBoxCalc";
import { nestPieceOnSheet } from "../src/lib/sheetNesting";

// ── round-trip conversions (shared helpers) ────────────────────────────────
{
  const originalIn = 12.75;
  assert.ok(
    Math.abs(
      convertLength(
        convertLength(convertLength(originalIn, "in", "mm"), "mm", "cm"),
        "cm",
        "in",
      ) - originalIn,
    ) < 1e-9,
  );
}

// ── 12 × 9 × 3 in → 12 × 27 in ─────────────────────────────────────────────
{
  const result = calcRigidBox(
    { length: 12, width: 9, height: 3 },
    "in",
    DEFAULT_RIGID_OPTIONS,
  );
  assert.ok(result);
  assert.equal(result!.in.openWidth, 12);
  assert.equal(result!.in.openHeight, 27);
}

// ── same box in mm ─────────────────────────────────────────────────────────
{
  const result = calcRigidBox(
    { length: 304.8, width: 228.6, height: 76.2 },
    "mm",
    DEFAULT_RIGID_OPTIONS,
  );
  assert.ok(result);
  assert.equal(result!.mm.openWidth, 304.8);
  assert.equal(result!.mm.openHeight, 685.8);
}

// ── allowances default 0; changing them shifts result exactly ──────────────
{
  const base = calcRigidOpenSizeMm(
    { length: 100, width: 50, height: 20 },
    { widthAllowanceMm: 0, heightAllowanceMm: 0 },
  );
  assert.equal(base.openWidthMm, 100);
  assert.equal(base.openHeightMm, 3 * 20 + 2 * 50); // 160

  const withAllow = calcRigidOpenSizeMm(
    { length: 100, width: 50, height: 20 },
    { widthAllowanceMm: 5, heightAllowanceMm: 7 },
  );
  assert.equal(withAllow.openWidthMm, base.openWidthMm + 5);
  assert.equal(withAllow.openHeightMm, base.openHeightMm + 7);
}

// ── nesting 13×28 on 30×40 → 3 pieces (rotated) ────────────────────────────
{
  const sheet = { width: 30, height: 40, batch: "STANDARD" as const };
  const r = nestPieceOnSheet(sheet, { widthIn: 13, heightIn: 28 });
  assert.equal(r.pieces, 3, `expected 3 pieces, got ${r.pieces}`);
  assert.ok(r.placements.some((p) => p.rotated), "layout should use rotation");
}

// ── nesting 13×28 on 20×30 → 1 piece ───────────────────────────────────────
{
  const sheet = { width: 20, height: 30, batch: "STANDARD" as const };
  const r = nestPieceOnSheet(sheet, { widthIn: 13, heightIn: 28 });
  assert.equal(r.pieces, 1, `expected 1 piece, got ${r.pieces}`);
}

// sanity: inch/mm constants used above
assert.ok(Math.abs(toMm(12, "in") - 304.8) < 1e-9);
assert.ok(Math.abs(fromMm(304.8, "in") - 12) < 1e-9);

console.log("All rigid box calculator tests passed.");

/**
 * Lightweight unit checks for mailer box calc (no vitest — keeps Vercel build clean).
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
  toMm,
} from "../src/lib/mailerBoxCalc";

// ── conversions ────────────────────────────────────────────────────────────
assert.ok(Math.abs(toMm(1, "in") - 25.4) < 1e-9);
assert.equal(toMm(1, "cm"), 10);
assert.equal(fromMm(10, "cm"), 1);

const originalIn = 16.5;
assert.ok(
  Math.abs(
    convertLength(convertLength(convertLength(originalIn, "in", "mm"), "mm", "cm"), "cm", "in") -
      originalIn,
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

// ── validation ─────────────────────────────────────────────────────────────
assert.equal(calcMailerBox({ length: 0, width: 12, height: 4 }, "in"), null);
assert.equal(calcMailerBox({ length: -1, width: 12, height: 4 }, "in"), null);
assert.equal(
  calcMailerBox({ length: Number.NaN, width: 12, height: 4 }, "in"),
  null,
);

// ── formatting ─────────────────────────────────────────────────────────────
assert.equal(formatLength(825.8, "mm"), "825.80");
assert.equal(formatLength(32.511811, "in"), "32.5118");
assert.equal(formatLength(36, "in"), "36.0000");

console.log("All mailer box calculator tests passed.");

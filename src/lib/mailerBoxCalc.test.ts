import { describe, expect, it } from "vitest";
import {
  calcMailerBox,
  calcOpenSizeMm,
  convertLength,
  DEFAULT_OPTIONS,
  formatLength,
  fromMm,
  toMm,
} from "./mailerBoxCalc";

describe("unit conversion", () => {
  it("converts inches to mm", () => {
    expect(toMm(1, "in")).toBeCloseTo(25.4, 6);
    expect(toMm(16, "in")).toBeCloseTo(406.4, 6);
  });

  it("converts cm and mm", () => {
    expect(toMm(1, "cm")).toBe(10);
    expect(fromMm(10, "cm")).toBe(1);
    expect(toMm(13, "mm")).toBe(13);
  });

  it("round-trips mm ↔ cm ↔ in correctly", () => {
    const originalIn = 16.5;
    const asMm = convertLength(originalIn, "in", "mm");
    const asCm = convertLength(asMm, "mm", "cm");
    const backToIn = convertLength(asCm, "cm", "in");
    expect(backToIn).toBeCloseTo(originalIn, 10);

    const mm = 250;
    expect(convertLength(convertLength(mm, "mm", "cm"), "cm", "mm")).toBeCloseTo(mm, 10);
    expect(convertLength(convertLength(mm, "mm", "in"), "in", "mm")).toBeCloseTo(mm, 10);
  });

  it("fold allowance 13 mm equals 0.5118 in (4 dp)", () => {
    expect(fromMm(DEFAULT_OPTIONS.foldAllowanceMm, "in")).toBeCloseTo(0.5118110236, 6);
    // Display rounding to 4 dp
    expect(Number(fromMm(13, "in").toFixed(4))).toBe(0.5118);
  });
});

describe("calcOpenSizeMm", () => {
  it("OpenW = L + 4H + fold, OpenH = 2W + 3H", () => {
    const result = calcOpenSizeMm(
      { length: 100, width: 50, height: 20 },
      { foldAllowanceMm: 13 },
    );
    expect(result.openWidthMm).toBe(100 + 80 + 13); // 193
    expect(result.openHeightMm).toBe(100 + 60); // 160
  });

  it("respects custom fold allowance", () => {
    const result = calcOpenSizeMm(
      { length: 100, width: 50, height: 20 },
      { foldAllowanceMm: 0 },
    );
    expect(result.openWidthMm).toBe(180);
    expect(result.openHeightMm).toBe(160);
  });
});

describe("calcMailerBox", () => {
  it("16 × 12 × 4 in → Open Width 32.5118 in, Open Height 36 in", () => {
    const result = calcMailerBox(
      { length: 16, width: 12, height: 4 },
      "in",
      DEFAULT_OPTIONS,
    );
    expect(result).not.toBeNull();
    expect(result!.in.openWidth).toBe(32.5118);
    expect(result!.in.openHeight).toBe(36);
    // Cross-check mm: 16*25.4 + 4*4*25.4 + 13 = 406.4 + 406.4 + 13 = 825.8
    expect(result!.mm.openWidth).toBe(825.8);
    expect(result!.mm.openHeight).toBe(914.4); // 2W + 3H in mm
  });

  it("returns null for zero, negative, or non-finite inputs", () => {
    expect(calcMailerBox({ length: 0, width: 12, height: 4 }, "in")).toBeNull();
    expect(calcMailerBox({ length: -1, width: 12, height: 4 }, "in")).toBeNull();
    expect(
      calcMailerBox({ length: Number.NaN, width: 12, height: 4 }, "in"),
    ).toBeNull();
    expect(
      calcMailerBox({ length: Infinity, width: 12, height: 4 }, "in"),
    ).toBeNull();
  });
});

describe("formatLength", () => {
  it("formats mm/cm with 2 decimals and inches with 4", () => {
    expect(formatLength(825.8, "mm")).toBe("825.80");
    expect(formatLength(82.58, "cm")).toBe("82.58");
    expect(formatLength(32.511811, "in")).toBe("32.5118");
    expect(formatLength(36, "in")).toBe("36.0000");
  });
});

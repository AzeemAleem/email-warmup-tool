/**
 * Test suite for mailer box cost calculation engine
 */

import { DEFAULT_MAILER_COST_CONFIG } from "../src/lib/cost/mailerCostConfig";
import {
  runMailerCostEngine,
  calcMailerTotalSheets,
} from "../src/lib/cost/mailerCostEngine";
import {
  calcMailerStockCost,
  roundPaddedInches,
} from "../src/lib/cost/items/mailerStockCost";
import { calcMailerLaminationCost } from "../src/lib/cost/items/mailerLaminationCost";
import { calcMailerCorrugationCost } from "../src/lib/cost/items/mailerCorrugationCost";
import { calcMailerShippingCost } from "../src/lib/cost/items/mailerShippingCost";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✓ ${message}`);
}

function assertClose(
  actual: number,
  expected: number,
  tolerance: number,
  message: string,
) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(
      `❌ ${message}: expected ${expected}, got ${actual} (diff: ${diff})`,
    );
  }
  console.log(`✓ ${message}: ${actual} ≈ ${expected}`);
}

console.log("🧪 Mailer Box Cost Calculation Tests\n");

// Test 0: Padded inches rounding (.5 up)
console.log("Test 0: Padded inches rounding");
assert(roundPaddedInches(22.4) === 22, "22.4 → 22");
assert(roundPaddedInches(22.49) === 22, "22.49 → 22");
assert(roundPaddedInches(22.5) === 23, "22.5 → 23");
assert(roundPaddedInches(22.51) === 23, "22.51 → 23");
assert(roundPaddedInches(26.5118) === 27, "26.5118 → 27");

// Test 1: Total sheets calculation (outside + inside + 200 extra)
console.log("Test 1: Total sheets calculation");
const sheets1 = calcMailerTotalSheets(300);
assert(sheets1 === 800, "Total sheets for 300 units = 300+300+200 = 800");

const sheets2 = calcMailerTotalSheets(500);
assert(sheets2 === 1200, "Total sheets for 500 units = 500+500+200 = 1200");

const sheets3 = calcMailerTotalSheets(100);
assert(sheets3 === 400, "Total sheets for 100 units = 100+100+200 = 400");

// Test 2: Stock cost calculation
console.log("\nTest 2: Stock cost calculation");
const stockConfig = { ...DEFAULT_MAILER_COST_CONFIG.stock };
const stockResult = calcMailerStockCost(
  24.5118, // openWidthIn
  27, // openHeightIn
  400, // quantity
  100, // totalSheets
  stockConfig,
);
assert(stockResult !== null, "Stock calculation should succeed");
assert(stockResult!.materialType === "cardboard", "Default material is cardboard");
assert(stockResult!.gsm === 350, "Default GSM is 350");
// 24.5118 + 2 = 26.5118 → rounds to 27; 27 + 2 = 29
assert(stockResult!.paddedOpenWidthIn === 27, "Padded width rounded 26.5118 → 27");
assert(stockResult!.paddedOpenHeightIn === 29, "Padded height = 27 + 2 = 29");
// Weight unit × cardboard rate 550 (using rounded padded size)
const expectedStockCost = ((27 * 29 * 350 * 100) / 15500 / 100) * 550;
assertClose(
  stockResult!.total,
  expectedStockCost,
  0.5,
  "Stock cost = weight × cardboard rate",
);

// Test 3: Lamination cost
console.log("\nTest 3: Lamination cost calculation");
const laminationConfig = { ...DEFAULT_MAILER_COST_CONFIG.lamination };
const lam1 = calcMailerLaminationCost(27, 29, 400, 100, 1, laminationConfig);
assert(lam1 !== null, "Lamination 1 side should succeed");
// Formula: (27 × 29 / 144) × 4.5 × 100 × 1
const expectedLam1 = ((27 * 29) / 144) * 4.5 * 100 * 1;
assertClose(lam1!.total, expectedLam1, 0.01, "Lamination 1 side cost");

const lam2 = calcMailerLaminationCost(27, 29, 400, 100, 2, laminationConfig);
assert(lam2 !== null, "Lamination 2 sides should succeed");
const expectedLam2 = ((27 * 29) / 144) * 4.5 * 100 * 2;
assertClose(lam2!.total, expectedLam2, 0.01, "Lamination 2 sides cost");

const lam0 = calcMailerLaminationCost(27, 29, 400, 100, 0, laminationConfig);
assert(lam0 !== null, "Lamination 0 sides should succeed");
assert(lam0!.total === 0, "Lamination 0 sides = 0 cost");

// Test 4: Corrugation cost
console.log("\nTest 4: Corrugation cost calculation");
const corrugationConfig = { ...DEFAULT_MAILER_COST_CONFIG.corrugation };
const corrResult = calcMailerCorrugationCost(
  27,
  29,
  400,
  100,
  corrugationConfig,
);
assert(corrResult !== null, "Corrugation calculation should succeed");
// 1. Total Pcs / Roll = 2400 / 27
const expectedPcsPerRoll = 2400 / 27;
assertClose(
  corrResult!.totalPcsPerRoll,
  expectedPcsPerRoll,
  0.01,
  "Total Pcs per Roll",
);
// 2. Total Rolls = 400 / pcsPerRoll
const expectedTotalRolls = 400 / expectedPcsPerRoll;
assertClose(corrResult!.totalRolls, expectedTotalRolls, 0.01, "Total Rolls");
// 3. Corrugation Cost = rolls × 150 × 29
const expectedCorrCost = expectedTotalRolls * 150 * 29;
assertClose(
  corrResult!.corrugationCost,
  expectedCorrCost,
  0.5,
  "Corrugation cost",
);
// 4. Pasting = 100 × 10 = 1000
assert(corrResult!.pastingCost === 1000, "Pasting cost = 1000");
// Total = corrugation + pasting
assertClose(
  corrResult!.total,
  expectedCorrCost + 1000,
  0.5,
  "Total corrugation + pasting",
);

// Test 5: Shipping cost (uses padded rounded size + GSM 550)
console.log("\nTest 5: Shipping cost calculation");
const shippingConfig = { ...DEFAULT_MAILER_COST_CONFIG.shipping };
assert(shippingConfig.gsm === 550, "Default shipping GSM is 550");
const shipResult = calcMailerShippingCost(27, 29, 400, shippingConfig);
assert(shipResult !== null, "Shipping calculation should succeed");
// Weight = (27 × 29 × 550 × 400 / 15500) / 100
const expectedWeight = ((27 * 29 * 550 * 400) / 15500) / 100;
assertClose(shipResult!.totalWeightKg, expectedWeight, 0.01, "Shipping weight");
// Cost = weight × 3000
const expectedShipCost = expectedWeight * 3000;
assertClose(shipResult!.total, expectedShipCost, 0.5, "Shipping cost");

assert(
  DEFAULT_MAILER_COST_CONFIG.printing.costPerColor === 4000,
  "Default printing per color 4000 → CMYK 16000",
);
assert(
  DEFAULT_MAILER_COST_CONFIG.plates.costPerPlate === 4000,
  "Default plates per plate 4000 → CMYK 16000",
);

// Test 6: Full cost engine integration
console.log("\nTest 6: Full cost engine integration");
const engineResult = runMailerCostEngine(
  24.5118, // openWidthIn
  27, // openHeightIn
  500, // quantity
  4, // piecesPerSheet (500/4 = 125 sheets)
  DEFAULT_MAILER_COST_CONFIG,
  {
    totalSheetsOverride: null,
    laminationSides: 1,
    stockManualTotal: null,
    laminationManualTotal: null,
    platesManualTotal: null,
    printingManualTotal: null,
    dieManualTotal: null,
    cuttingManualTotal: null,
    pastingManualTotal: null,
    corrugationManualTotal: null,
    shippingManualTotal: null,
    extraTotal: null,
    corrugationEnabled: true,
    printColorMode: "cmyk",
  },
);
assert(engineResult !== null, "Engine calculation should succeed");
assert(engineResult!.items.length > 0, "Should have cost items");
assert(engineResult!.grandTotal > 0, "Grand total should be positive");
assert(engineResult!.costPerUnit > 0, "Cost per unit should be positive");

// Verify expected items
const itemIds = engineResult!.items.map((i) => i.id);
assert(itemIds.includes("stock"), "Should have stock cost");
assert(itemIds.includes("lamination"), "Should have lamination cost");
assert(itemIds.includes("corrugation"), "Should have corrugation cost");
assert(itemIds.includes("shipping"), "Should have shipping cost");
assert(itemIds.includes("plates"), "Should have plates cost");
assert(itemIds.includes("printing"), "Should have printing cost");
assert(itemIds.includes("die"), "Should have die cost");
assert(itemIds.includes("cutting"), "Should have cutting cost");
assert(itemIds.includes("pasting"), "Should have pasting cost");

console.log("\n📊 Engine result summary:");
console.log(`  Items: ${engineResult!.items.length}`);
console.log(`  Grand Total: PKR ${engineResult!.grandTotal.toLocaleString()}`);
console.log(
  `  Cost per Unit: PKR ${engineResult!.costPerUnit.toLocaleString()}`,
);
engineResult!.items.forEach((item) => {
  console.log(
    `  - ${item.label}: PKR ${item.total.toLocaleString()} (${item.perUnit.toFixed(2)}/unit)`,
  );
});

// Test 7: Material type switching
console.log("\nTest 7: Material type switching");
const kraftConfig = {
  ...DEFAULT_MAILER_COST_CONFIG,
  stock: { ...DEFAULT_MAILER_COST_CONFIG.stock, materialType: "kraft" as const },
};
const kraftResult = runMailerCostEngine(24.5118, 27, 500, 4, kraftConfig, {
  totalSheetsOverride: null,
  laminationSides: 1,
  stockManualTotal: null,
  laminationManualTotal: null,
  platesManualTotal: null,
  printingManualTotal: null,
  dieManualTotal: null,
  cuttingManualTotal: null,
  pastingManualTotal: null,
  corrugationManualTotal: null,
  shippingManualTotal: null,
  extraTotal: null,
  corrugationEnabled: true,
  printColorMode: "cmyk",
});
assert(kraftResult !== null, "Kraft material calculation should succeed");
const kraftStock = kraftResult!.items.find((i) => i.id === "stock");
assert(kraftStock?.meta?.materialType === "kraft", "Should use kraft material");

// Test 8: Lamination sides variations
console.log("\nTest 8: Lamination sides variations");
const noLamResult = runMailerCostEngine(24.5118, 27, 500, 4, DEFAULT_MAILER_COST_CONFIG, {
  totalSheetsOverride: null,
  laminationSides: 0,
  stockManualTotal: null,
  laminationManualTotal: null,
  platesManualTotal: null,
  printingManualTotal: null,
  dieManualTotal: null,
  cuttingManualTotal: null,
  pastingManualTotal: null,
  corrugationManualTotal: null,
  shippingManualTotal: null,
  extraTotal: null,
  corrugationEnabled: true,
  printColorMode: "cmyk",
});
const noLamItem = noLamResult?.items.find((i) => i.id === "lamination");
assert(noLamItem === undefined, "No lamination item when sides = 0");

// Test 9: Corrugation can be disabled
console.log("\nTest 9: Corrugation disabled");
const noCorrResult = runMailerCostEngine(24.5118, 27, 500, 4, DEFAULT_MAILER_COST_CONFIG, {
  totalSheetsOverride: null,
  laminationSides: 1,
  stockManualTotal: null,
  laminationManualTotal: null,
  platesManualTotal: null,
  printingManualTotal: null,
  dieManualTotal: null,
  cuttingManualTotal: null,
  pastingManualTotal: null,
  corrugationManualTotal: null,
  shippingManualTotal: null,
  extraTotal: null,
  corrugationEnabled: false,
  printColorMode: "cmyk",
});
assert(
  noCorrResult?.items.find((i) => i.id === "corrugation") === undefined,
  "No corrugation item when disabled",
);

console.log("\n✅ All mailer cost calculation tests passed!");

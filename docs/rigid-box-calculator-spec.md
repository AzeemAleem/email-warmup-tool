# Rigid Box Calculator — Complete Specification (A to Z)

This document describes **exactly** how the Rigid Box Calculator in the internal tool
(`email-warmup-tool`) computes a price, so it can be re-implemented 1:1 on the public
website. Every constant, formula, rounding rule, default, and edge case is listed.

> Source of truth in the internal repo:
> `src/lib/rigidBoxCalc.ts`, `src/lib/lengthUnits.ts`, `src/lib/rigidSheetSizes.ts`,
> `src/lib/sheetNesting.ts`, `src/lib/sheetSizes.ts` (SheetSize type only),
> `src/lib/cost/costConfig.ts`, `src/lib/cost/costEngine.ts`, `src/lib/cost/types.ts`,
> `src/lib/cost/currency.ts`, `src/lib/cost/items/*.ts`,
> `src/app/(authenticated)/rigid-box-calculator/page.tsx` (defaults + wiring).

---

## 1. Big picture

```
Customer inputs (L, W, H, unit, quantity, paper, print options, finishes)
   │
   ▼
1) Convert dimensions to mm → compute flat OPEN SIZE → convert to inches (rounded 4 dp)
   │
   ▼
2) ART PIECE size = open size + padding (2 in each side total) → nest on art sheets
   → pick best sheet (lowest wastage)
   │
   ▼
3) Cost engine runs every cost line in fixed order, each returns a PKR total
   (greyboard, paper, lamination, spot UV, die, printing, plates, foiling,
    labor, deboss, embossing, shipping, extra)
   │
   ▼
4) Base cost (PKR) = sum of included lines (rounded 2 dp)
   │
   ▼
5) Selling price (PKR) = base × profit ratio
   │
   ▼
6) USD = PKR ÷ FX rate (default 275)
   │
   ▼
Public site shows ONLY: estimated total price + estimated price per unit
```

All money is **PKR** internally. USD is only a final conversion.

---

## 2. Inputs

| Input | Type | Default (public site) | Notes |
|---|---|---|---|
| Unit | `mm` \| `cm` \| `in` | `in` | Changing unit converts existing values |
| Length (L) | number > 0 | empty | Long side of base |
| Width (W) | number > 0 | empty | Short side / depth |
| Height (H) | number > 0 | empty | Box height |
| Quantity | integer ≥ 1 | empty (placeholder 200) | Digits only — no decimals, signs, commas |
| Paper type | `art` \| `morocco` | `art` | Art Paper / Morocco Paper |
| Print sides | `double` \| `single` | `double` | **Art paper only.** Morocco forces `single` |
| Print colors | `cmyk` \| `one` | `cmyk` | CMYK = 4 colors, 1 color = 1 |
| Lamination | boolean | **ON** | Not applied to Morocco |
| Spot UV | boolean | OFF | |
| Die making + Die cutting | boolean | **ON** | |
| Printing | boolean | **ON** | |
| Printing plates | boolean | **ON** | |
| Silver / Gold Foiling | boolean | OFF | |
| Labor | boolean | **ON** | |
| Deboss | boolean | OFF | |
| Embossing | boolean | OFF | |

Internal-only inputs (NOT shown on the public site; use the fixed value):

| Internal input | Public value |
|---|---|
| Width allowance | 0 mm |
| Height allowance | 0 mm |
| Art padding W / H | 2 in / 2 in |
| Profit ratio | business-chosen constant (e.g. `1.5`), server-only |
| Extra (PKR lump sum) | 0 (omit) |
| USD rate | 275 (server-only) |
| Manual sheet choice | none → always auto-recommended sheet |
| Manual "total sheets required" | none → always automatic |
| Manual overrides for spot UV / die / printing / plates / foiling / labor / deboss / embossing | none → always automatic/fixed |

**Shipping is always included** (no toggle). Greyboard and paper are always included.

---

## 3. Units & conversion

- mm per unit: `mm = 1`, `cm = 10`, `in = 25.4`
- `toMm(v, unit) = v × MM_PER[unit]`, `fromMm(mm, unit) = mm ÷ MM_PER[unit]`
- `roundForUnit`: **mm/cm → 2 decimals, in → 4 decimals** (`Math.round(v × 10^d) / 10^d`).
  Non-finite → 0.

---

## 4. Open size (flat blank)

Layout is a vertical strip of 5 panels, each **L** wide: `H, W, H, W, H`.

```
Open Width  = L + WIDTH_ALLOWANCE           (allowance default 0 mm)
Open Height = 3 × H + 2 × W + HEIGHT_ALLOWANCE   (allowance default 0 mm)
```

Pipeline (`calcRigidBox`):
1. Validate L, W, H finite and > 0; allowances finite and ≥ 0. Otherwise → no result.
2. Convert L, W, H to **mm**.
3. Compute open width/height in mm.
4. Convert to mm/cm/in and round with `roundForUnit`.
5. **The cost engine uses the rounded inch values** (`openWidthIn`, `openHeightIn`, 4 dp).

Example: L=10, W=8, H=3 in → open = **10 × 25 in**.

---

## 5. Art paper sheets & nesting

### 5.1 Sheet list (inches) — exactly 6

`20×30`, `23×36`, `25×36`, `30×40`, `30×50`, `40×60`

### 5.2 Art piece size

```
artPieceW = openWidthIn  + 2
artPieceH = openHeightIn + 2
```

### 5.3 Nesting one sheet (`nestPieceOnSheet`)

Inputs: sheet W×H, piece w×h (inches). `EPS = 1e-9`.
`floorDiv(n, d) = floor((n + EPS) / d)` (0 if n ≤ 0 or d ≤ 0).

Evaluate 3 candidates and keep the one with the **highest piece count** (first wins on ties,
in this order):
1. Pure grid, unrotated: `floorDiv(SW, w) × floorDiv(SH, h)`
2. Pure grid, rotated: `floorDiv(SW, h) × floorDiv(SH, w)`
3. Recursive guillotine strip packing (mixed orientations), memoized by remaining
   rectangle size (key = `(w+EPS).toFixed(6) x (h+EPS).toFixed(6)`):
   - For remaining rect `rw × rh`, try both orientations `(w,h)` and `(h,w)` (skip if it
     doesn't fit with EPS tolerance).
   - **Horizontal strip**: `across = floorDiv(rw, ow)`; place `across` pieces in a row of
     height `oh`, recurse on `rw × (rh − oh)`.
   - **Vertical strip**: `down = floorDiv(rh, oh)`; place `down` pieces in a column of width
     `ow`, recurse on `(rw − ow) × rh`.
   - Keep the option with the largest total count (strictly greater replaces).

Results:
- `pieces` = best count; `fits = pieces ≥ 1`
- `usedArea = pieces × w × h`, `sheetArea = SW × SH`
- `wastagePercent = round1dp((sheetArea − usedArea) / sheetArea × 100)`; 100 if pieces = 0.

### 5.4 Recommended sheet (`recommendBestSheet`)

Among sheets that fit, sort by:
1. **Lowest wastage %**
2. then **more pieces per sheet**
3. then **smaller sheet area**

First = recommended. If none fit → **no sheet** (art paper + lamination become excluded →
public site must show "custom quote", see §11).

Example piece 12×27 in:

| Sheet | Pieces | Wastage % |
|---|---|---|
| **40×60** | **7** | **5.5** ← recommended |
| 30×50 | 4 | 13.6 |
| 30×40 | 3 | 19.0 |
| 25×36 | 2 | 28.0 |
| 20×30 | 1 | 46.0 |
| 23×36 | 1 | 60.9 |

The selected sheet (`width`, `height`, `piecesPerSheet`) feeds **Art paper** and
**Lamination**.

---

## 6. Rounding & money helpers

- `roundMoney(v) = Math.round(v × 100) / 100` (non-finite → 0). Applied at almost every step
  (see each formula). Rounding order matters for exact parity.
- `pkrToUsd(pkr, rate) = roundMoney(pkr / rate)`; null if rate ≤ 0 or not finite.

---

## 7. Default constants (`costConfig.ts`)

| Group | Key | Default |
|---|---|---|
| Greyboard | gsm | **1200** |
| | factor | 400 |
| | divisor | 15500 |
| | scale | 100 |
| | markup | 1.25 |
| Art paper | gsm | 150 |
| | factor | 500 |
| | divisor | 3100 |
| | scale | 500 |
| | markup | 1.25 |
| | extraSheets (per print side) | 200 |
| Morocco | rollWidthIn | 54 |
| | yardLengthIn | 36 |
| | pricePerYard | 400 |
| | markup | 1 |
| | extraPieces | 0 |
| Lamination | divisor | 144 |
| | rate | 5 |
| Spot UV | fixedCost | 10,000 |
| | fixedMaxQty | 200 |
| | midMaxQty | 500 |
| | midRatePerUnit | 50 |
| | highRatePerUnit | 25 |
| Die | fixedCost | 5,000 |
| Printing | costPerColor (one side) | 3,000 |
| Plates | costPerPlate (one side) | 2,000 |
| | baseMaxQty (1×) | 1,000 |
| | midMaxQty (2×) | 2,500 |
| | (> midMaxQty → 3×) | — |
| Foiling | fixedCost | 10,000 |
| Deboss | fixedCost | 10,000 |
| Embossing | fixedCost | 10,000 |
| Weight (shipping) | gsm | **1600** |
| | divisor | 15500 |
| | scale | 100 |
| Shipping | ratePerKg | 3,000 |
| FX | usdRate (PKR per 1 USD) | 275 |

Note: **greyboard GSM (1200)** and **shipping weight GSM (1600)** are separate values.

---

## 8. Cost lines (engine order)

The engine runs these modules **in this order**. A module returns `null` when disabled
(line omitted), or a line `{ perUnit, total, excluded?, warning? }`. **Excluded lines are not
added to the total.** Quantity must be an integer ≥ 1.

Shared helpers:
- `sidesMultiplier = 2` if double, `1` if single
- `colors = 4` if CMYK, `1` if one-color
- `piecesPerSide = qty + extraSheets(200)`
- `artPiecesRequired = sidesMultiplier × (qty + 200)`

### 8.1 Greyboard — always on
```
perUnit = roundMoney( (((openW × openH × 1200 × 400) / 15500) / 100) × 1.25 )
total   = roundMoney(perUnit × qty)
```
Uses **open size** (no padding).

### 8.2 Paper — always on

**A) Art paper** (needs a recommended sheet; else excluded with warning "N/A - no sheet fits"):
```
perSheetRaw  = ((sheetW × sheetH × 150 × 500) / 3100) / 500      (not rounded here)
costPerPiece = roundMoney( (perSheetRaw / piecesPerSheet) × 1.25 )
sheetsRequired (pieces) = sidesMultiplier × (qty + 200)
total        = roundMoney(costPerPiece × sheetsRequired)
physicalSheets = ceil(sheetsRequired / piecesPerSheet)   (info only, not used in cost)
```

**B) Morocco paper** (roll):
- Piece = art piece size (open + 2 in each way).
- `across = floor((54 + 1e-9) / pieceDim)`
  - Orientation A: across = floor(54 / pieceW), rollLengthPerPiece = pieceH / across
  - Orientation B: across = floor(54 / pieceH), rollLengthPerPiece = pieceW / across
  - Pick the smaller `rollLengthPerPiece`. If neither fits → excluded, "Piece is wider than
    the roll."
```
pricePerInch = 400 / 36
perUnit      = roundMoney(rollLengthPerPiece × pricePerInch × 1)
total        = roundMoney(perUnit × (qty + 0))
```
Morocco ignores print sides for paper; the page also forces `printSides = single` for all
lines when Morocco is chosen (affects printing + plates).

### 8.3 Lamination — default ON
- Disabled → omitted.
- Morocco → excluded ("Lamination not applied to Morocco paper").
- No art sheet → excluded.
```
perSheet      = roundMoney( (sheetW × sheetH / 144) × 5 )
laminationQty = sidesMultiplier × (qty + 200)
total         = roundMoney(perSheet × laminationQty)
perUnit       = roundMoney(total / qty)
```
> ⚠ Behaviour note: `perSheet` is for the **whole sheet**, but it is multiplied by the
> **piece count**, not physical sheets. It also ignores the internal manual
> "sheets required" override. This is the current behaviour; keep it for parity unless
> the business decides to change it (see §14).

### 8.4 Spot UV — default OFF (estimate)
```
if qty ≤ 200:           total = 10,000
else if qty ≤ 500:      total = qty × 50
else:                   total = qty × 25
perUnit = roundMoney(total / qty)
```
Optional manual override replaces the automatic total.

### 8.5 Die making + Die cutting — default ON
`total = 5,000`, `perUnit = roundMoney(5000 / qty)`

### 8.6 Printing — default ON
```
total = roundMoney(colors × 3000 × sidesMultiplier)
```
CMYK double = 24,000 · CMYK single = 12,000 · 1-color single = 3,000 · 1-color double = 6,000

### 8.7 Printing plates — default ON
```
plates = colors
base   = roundMoney(plates × 2000 × sidesMultiplier)
         // CMYK one side = 8,000 · CMYK double = 16,000
if qty ≤ 1000:           total = base × 1
else if qty ≤ 2500:      total = base × 2
else:                    total = base × 3   // stays at 3× for all higher qty
```
CMYK double = 16,000 · CMYK single = 8,000 · 1-color single = 2,000

### 8.8 Silver / Gold Foiling — default OFF
`total = 10,000` (fixed job)

### 8.9 Labor — default ON
`total = greyboard total` (= `roundMoney(greyboardPerUnit × qty)`)

### 8.10 Deboss — default OFF
`total = 10,000`

### 8.11 Embossing — default OFF
`total = 10,000`

### 8.12 Shipping — ALWAYS ON
Uses **open size without padding**.
```
weightPerUnitKg = (openW × openH × 1600 / 15500) / 100      (unrounded)
totalKg         = weightPerUnitKg × qty                     (unrounded)
total           = roundMoney(totalKg × 3000)
perUnit         = roundMoney(total / qty)
```

### 8.13 Extra — internal only
Lump-sum PKR added when > 0. **Public site: always 0 (omitted).**

Fixed-job lines (spot UV, die, foiling, deboss, embossing) have `perUnit = roundMoney(total / qty)`.

---

## 9. Totals, profit, currency

```
basePkr        = roundMoney( Σ total of non-excluded lines )
basePerUnitPkr = roundMoney(basePkr / qty)

ratio          = profitRatio if finite and > 0, else 1
sellingPkr     = roundMoney(basePkr × ratio)
sellingPerUnitPkr = roundMoney(sellingPkr / qty)

sellingUsd        = roundMoney(sellingPkr / 275)
sellingPerUnitUsd = roundMoney(sellingUsd / qty)      ← from the rounded USD total
baseUsd           = roundMoney(basePkr / 275)
basePerUnitUsd    = roundMoney(baseUsd / qty)
```

**Public site shows only the selling price** (total + per unit). Base cost, line items,
profit ratio, and FX rate are never sent to the browser.

---

## 10. Worked example (verified by running the real engine)

Inputs: L=10, W=8, H=3 in · qty 500 · Art paper · Double side · CMYK ·
Lamination, Die, Printing, Plates, Labor ON · others OFF.

- Open size: **10 × 25 in** → art piece **12 × 27 in** → sheet **40×60**, 7 pcs/sheet

| Line | Per unit | Total (PKR) |
|---|---|---|
| Greyboard | 96.77 | 48,385 |
| Paper (Art) | 20.74 | 29,036 |
| Lamination | 233.32 | 116,662 |
| Die | 10.00 | 5,000 |
| Printing | 48.00 | 24,000 |
| Plates | 32.00 | 16,000 |
| Labor | 96.77 | 48,385 |
| Shipping | 774.19 | 387,096.77 |
| **Base total** | **1,349.13** | **674,564.77** |

Hand check:
- Greyboard: 10×25×1200×400 / 15500 / 100 × 1.25 = 96.774 → **96.77** × 500 = 48,385
- Paper: perSheetRaw = 40×60×150×500/3100/500 = 116.129 → /7 × 1.25 = **20.74**;
  sheetsRequired = 2 × (500+200) = 1400 → 29,036
- Lamination: 40×60/144×5 = **83.33** × 1400 = 116,662
- Shipping: 10×25×1600/15500/100 = 0.258065 kg × 500 = 129.03 kg × 3000 = 387,096.77

With profit ratio 1.5: selling = **1,011,847.16 PKR** → **$3,679.44** → **$7.36 / unit**.
Turning **Foiling ON** adds 10,000 → base **684,564.77 PKR**.

### More test vectors (open size forced to 12 × 27 in, sheet 30×40 / 2 pcs, qty 200, art, double)

- Greyboard per unit **125.42**, total **25,084**
- Art paper total **29,032** (sheetsRequired 800)
- Lamination **33,336** (41.67 × 800)
- Morocco paper (piece 14×29, qty 200) **21,482**
- Shipping (12×27, qty 200) **200,670.97**

---

## 11. Validation & edge cases

| Case | Engine behaviour | Public site behaviour |
|---|---|---|
| L/W/H empty, 0, negative, non-numeric | no result | inline field error, no price |
| Quantity not an integer ≥ 1 (`12.5`, `-5`, `abc`, `0`) | no result | "Whole numbers only, min 1" |
| Art piece fits no sheet (larger than 40×60 incl. rotation) | paper + lamination excluded | **Do not show a price** → "This size needs a custom quote" |
| Morocco piece wider than 54 in roll (both orientations) | paper excluded | **custom quote** |
| Spot UV ON | always priced by tier | ≤200 fixed 10k; 201–500 @ 50/unit; >500 @ 25/unit |
| Morocco + Lamination ON | lamination excluded | hide/disable lamination for Morocco |
| Morocco + Double side | forced single | disable print-sides toggle for Morocco |

---

## 12. Public website behaviour (what the customer sees)

- Inputs: unit, L, W, H, quantity, paper type, print sides, print colors, finish options
  (Lamination, Spot UV, Silver/Gold Foiling, Deboss, Embossing).
- **Always included silently**: greyboard, paper, die, printing, plates, labor, shipping.
- Output only:
  - **Estimated total price**
  - **Estimated price per unit**
  - Short disclaimer: "Estimate only. Final price confirmed after artwork and spec review."
- Price recalculates live (debounced ~300 ms) when any input changes.
- No breakdown, no production vs shipping split, no rates, no profit ratio, no sheet info.

---

## 13. Security / architecture

- Run the calculation **on the server** (Next.js Route Handler or Server Action).
  Formulas, rates, profit ratio, FX rate live in **server-only** modules
  (`import "server-only"`), never in the client bundle.
- Client sends only the inputs; server validates (zod) and returns
  `{ status: "ok" | "custom_quote" | "invalid", totalUsd, perUnitUsd, notes[] }`.
- Optional: simple rate limiting per IP on the estimate endpoint.

---

## 14. Known behaviour to review before going public

1. **Lamination** multiplies a full-sheet price by the piece count (§8.3). With bigger
   sheets (40×60, 7 pcs) lamination can exceed paper cost several times over
   (116,662 vs 29,036 in the worked example).
2. **Shipping** at 3,000 PKR/kg with weight GSM 1600 is the largest line in most quotes
   (387,097 of 674,565 in the worked example).
3. **Spot UV** is always automatic by quantity tier (fixed ≤200, 50/unit ≤500, 25/unit above).

These match the internal tool today. Change them in both places if the business decides to.

---

## 15. Files to port (fastest path to 1:1 parity)

Copy these from the internal repo into the website (e.g. `lib/rigid-calculator/`), mark
server-only, and drop the internal-only parts (manual overrides, extra, sheet picker):

- `src/lib/lengthUnits.ts`
- `src/lib/rigidBoxCalc.ts`
- `src/lib/sheetSizes.ts` (only the `SheetSize` type + `sheetKey`)
- `src/lib/rigidSheetSizes.ts`
- `src/lib/sheetNesting.ts` (only `nestPieceOnSheet`, `recommendBestSheet` and helpers)
- `src/lib/cost/costConfig.ts`, `types.ts`, `currency.ts`, `costEngine.ts`
- `src/lib/cost/items/*.ts`

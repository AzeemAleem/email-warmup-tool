import { jsPDF } from "jspdf";

// ── Palette (print-white background, Pacify brand) ──────────────────────────
type RGB = readonly [number, number, number];

const C = {
  black:    [26,  26,  26] as RGB,
  white:    [255, 255, 255] as RGB,
  gold:     [156, 122,  60] as RGB,  // #9C7A3C
  forest:   [26,  58,  47] as RGB,
  soft:     [245, 235, 217] as RGB,   // pale gold wash
  line:     [210, 210, 210] as RGB,
  muted:    [100, 100, 100] as RGB,
  rowAlt:   [246, 246, 246] as RGB,
};

// ── Page geometry ────────────────────────────────────────────────────────────
const ML = 15;            // left margin
const PW = 210;           // A4 width mm
const CW = PW - 2 * ML;  // content width = 180 mm

// Table column widths (must sum to CW = 180)
const C_DESC  = 108; // description
const C_QTY   = 18;  // qty
const C_PRICE = 28;  // unit price
const C_TOTAL = CW - C_DESC - C_QTY - C_PRICE; // = 26

// ── Helpers ──────────────────────────────────────────────────────────────────
function fc(doc: jsPDF, c: RGB) { doc.setFillColor(c[0], c[1], c[2]); }
function dc(doc: jsPDF, c: RGB) { doc.setDrawColor(c[0], c[1], c[2]); }
function tc(doc: jsPDF, c: RGB) { doc.setTextColor(c[0], c[1], c[2]); }
function fnt(doc: jsPDF, w: "normal" | "bold", sz?: number) {
  doc.setFont("helvetica", w);
  if (sz !== undefined) doc.setFontSize(sz);
}

function fmtMoney(amount: number, currency: "PKR" | "USD"): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `PKR ${Math.round(amount).toLocaleString("en-US")}`;
}

const BULLET_FS = 8;
const BULLET_LH = 4.2;
const BULLET_GAP = 4.2; // hanging indent after bullet marker

/**
 * Splits body text into lines that fit after a bold label on the first line,
 * then full hanging-indent width on subsequent lines.
 */
function wrapBulletBody(
  doc: jsPDF,
  boldPart: string,
  body: string,
  maxW: number,
): { firstLine: string; rest: string[] } {
  fnt(doc, "bold", BULLET_FS);
  const labelW = doc.getTextWidth(boldPart + " ");
  fnt(doc, "normal", BULLET_FS);

  const firstMax = Math.max(maxW - BULLET_GAP - labelW, 12);
  const restMax = Math.max(maxW - BULLET_GAP, 12);

  const words = body.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { firstLine: "", rest: [] };

  let firstLine = "";
  let i = 0;
  while (i < words.length) {
    const trial = firstLine ? `${firstLine} ${words[i]}` : words[i];
    if (doc.getTextWidth(trial) <= firstMax) {
      firstLine = trial;
      i++;
    } else {
      break;
    }
  }
  // If nothing fit on first line, force at least one word
  if (!firstLine && words.length > 0) {
    firstLine = words[0];
    i = 1;
  }

  const remaining = words.slice(i).join(" ");
  const rest = remaining ? (doc.splitTextToSize(remaining, restMax) as string[]) : [];
  return { firstLine, rest };
}

/**
 * Professional hanging-indent bullet: gold dot + bold label + body text.
 * Wrapped lines align under the text start (not under the label).
 */
function drawBullet(
  doc: jsPDF,
  x: number,
  y: number,
  boldPart: string,
  body: string,
  maxW: number,
): number {
  // Black circular bullet
  fc(doc, C.black);
  doc.circle(x + 1.1, y - 1.05, 0.7, "F");

  const tx = x + BULLET_GAP;
  const { firstLine, rest } = wrapBulletBody(doc, boldPart, body, maxW);

  // Bold label + first line of body
  fnt(doc, "bold", BULLET_FS);
  tc(doc, C.black);
  doc.text(boldPart, tx, y);
  const labelW = doc.getTextWidth(boldPart + " ");

  fnt(doc, "normal", BULLET_FS);
  tc(doc, C.muted);
  if (firstLine) doc.text(firstLine, tx + labelW, y);

  // Continuation lines — hanging indent under text column
  for (const line of rest) {
    y += BULLET_LH;
    doc.text(line, tx, y);
  }

  return y + BULLET_LH + 0.6; // small gap between bullets
}

function measureBulletHeight(doc: jsPDF, boldPart: string, body: string, maxW: number): number {
  const { rest } = wrapBulletBody(doc, boldPart, body, maxW);
  return BULLET_LH * (1 + rest.length) + 0.6;
}

// ── Row height measurement ───────────────────────────────────────────────────
function measureContentRow(
  doc: jsPDF,
  orderTitle: string,
  bullets: InvoiceBullet[],
): number {
  const dw = C_DESC - 6;

  // Product title
  fnt(doc, "bold", 9);
  const titleLines = doc.splitTextToSize(orderTitle || "Order", dw);
  let h = 6 + titleLines.length * 5 + 2; // top pad + title + gap

  for (const b of bullets) {
    h += measureBulletHeight(doc, b.boldPrefix, b.text, dw);
  }

  h += 5; // bottom padding
  return Math.max(h, 36);
}

// ── Public types ─────────────────────────────────────────────────────────────
export interface InvoiceBullet {
  boldPrefix: string;
  text: string;
}

/**
 * Fully custom option-pricing table (page 2).
 * Column titles and cell values are user-defined.
 */
export interface OptionPricingTable {
  title?: string;
  columns: string[];
  rows: string[][];
}

/** Simple volume ladder: Quantity | Per Unit | TOTAL */
export interface VolumeTierRow {
  quantity: number;
  unitPrice: number;
}

export interface VolumeTiers {
  title?: string;
  rows: VolumeTierRow[];
}

export interface InvoicePdfData {
  invoiceId: string;
  date: string;
  validUntil: string;
  clientName: string;
  clientEmail: string;
  orderTitle: string;
  bullets: InvoiceBullet[];
  quantity: number;
  currency: "PKR" | "USD";
  unitPrice: number;
  totalAmount: number;
  /** Optional page-2 custom option comparison tables (one or more) */
  optionTables?: OptionPricingTable[] | null;
  /** Optional page-2 volume discount ladder */
  volumeTiers?: VolumeTiers | null;
}

const LOGO_PATH = "/pacify-logo.png";
const LOGO_SIZE = 22; // mm — logo display size on the page

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_PATH);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawFallbackLogo(doc: jsPDF, x: number, y: number) {
  fnt(doc, "bold", 18);
  tc(doc, C.gold);
  doc.text("P", x + LOGO_SIZE / 2, y + 14.5, { align: "center" });
  fc(doc, C.gold);
  doc.circle(x + LOGO_SIZE / 2, y + 17.5, 0.8, "F");
}

// ── Main export ──────────────────────────────────────────────────────────────
export async function exportInvoicePdf(data: InvoicePdfData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 15;
  const tl = ML; // table left

  // ── Logo (no outline, no side brand text) ─────────────────────────────
  const logoData = await loadLogoDataUrl();
  if (logoData) {
    doc.addImage(logoData, "PNG", ML, y, LOGO_SIZE, LOGO_SIZE, undefined, "FAST");
  } else {
    drawFallbackLogo(doc, ML, y);
  }

  // ── PACKAGING QUOTATION (right) ───────────────────────────────────────
  fnt(doc, "bold", 14);
  tc(doc, C.gold);
  doc.text("PACKAGING QUOTATION", PW - ML, y + 1.5, { align: "right" });

  fnt(doc, "normal", 8.5);
  tc(doc, C.black);
  doc.text(`Quote No: ${data.invoiceId}`, PW - ML, y + 10, { align: "right" });
  doc.text(`Date: ${data.date}`, PW - ML, y + 16, { align: "right" });
  doc.text(`Valid Until: ${data.validUntil}`, PW - ML, y + 22, { align: "right" });

  y += 31;

  // ── Company name + contact ────────────────────────────────────────────
  fnt(doc, "bold", 14);
  tc(doc, C.black);
  doc.text("PACIFY PACKAGING", ML, y);

  y += 6;
  fnt(doc, "normal", 7.5);
  tc(doc, C.muted);
  doc.text("+1 229 329 8221", ML, y); y += 4.5;
  doc.text("info@pacifypackaging.com", ML, y); y += 4.5;
  doc.text("www.pacifypackaging.com", ML, y); y += 9;

  // ── Gold separator ────────────────────────────────────────────────────
  dc(doc, C.gold);
  doc.setLineWidth(0.5);
  doc.line(ML, y, PW - ML, y);
  y += 9;

  // ── BILL TO ───────────────────────────────────────────────────────────
  fnt(doc, "bold", 7.5);
  tc(doc, C.gold);
  doc.text("BILL TO", ML, y);
  y += 6;

  fnt(doc, "bold", 11);
  tc(doc, C.black);
  doc.text(data.clientName || "—", ML, y);
  y += 5.5;

  if (data.clientEmail) {
    fnt(doc, "normal", 8.5);
    tc(doc, C.muted);
    doc.text(data.clientEmail, ML, y);
    y += 5;
  }
  y += 5;

  // ── ORDER DETAILS ─────────────────────────────────────────────────────
  fnt(doc, "bold", 7.5);
  tc(doc, C.gold);
  doc.text("ORDER DETAILS \u2014", ML, y);
  y += 6;

  fnt(doc, "bold", 12);
  tc(doc, C.black);
  doc.text(data.orderTitle || "Custom Packaging Order", ML, y);
  y += 5; // tight gap before table

  // ── Table header ──────────────────────────────────────────────────────
  fc(doc, C.black);
  doc.rect(tl, y, CW, 9, "F");

  fnt(doc, "bold", 7.5);
  tc(doc, C.white);
  doc.text("DESCRIPTION",                          tl + 3,                          y + 6);
  doc.text("QTY",        tl + C_DESC + C_QTY / 2,               y + 6, { align: "center" });
  doc.text("UNIT PRICE", tl + C_DESC + C_QTY + C_PRICE / 2,     y + 6, { align: "center" });
  doc.text("TOTAL",      tl + C_DESC + C_QTY + C_PRICE + C_TOTAL / 2, y + 6, { align: "center" });
  y += 9;

  // ── Content row ───────────────────────────────────────────────────────
  const rowY = y;
  const rowH = measureContentRow(doc, data.orderTitle, data.bullets);

  // Row border + background
  fc(doc, C.white);
  dc(doc, C.line);
  doc.setLineWidth(0.2);
  doc.rect(tl, rowY, CW, rowH, "FD");

  // Vertical column dividers
  const vlines = [
    tl + C_DESC,
    tl + C_DESC + C_QTY,
    tl + C_DESC + C_QTY + C_PRICE,
  ];
  for (const vx of vlines) doc.line(vx, rowY, vx, rowY + rowH);

  // Description text
  let dy = rowY + 5.5;
  const descX = tl + 3;
  const descW = C_DESC - 5;

  // Product title inside description
  fnt(doc, "bold", 9);
  tc(doc, C.black);
  const titleLines = doc.splitTextToSize(data.orderTitle || "Custom Packaging Order", descW);
  doc.text(titleLines, descX, dy);
  dy += titleLines.length * 5 + 2.5;

  // Bullet points
  for (const b of data.bullets) {
    dy = drawBullet(doc, descX, dy, b.boldPrefix, b.text, descW);
  }

  // QTY / PRICE / TOTAL (vertically centred in content row)
  const midY = rowY + rowH / 2 + 1.5;
  fnt(doc, "normal", 9);
  tc(doc, C.black);
  doc.text(
    data.quantity.toLocaleString("en-US"),
    tl + C_DESC + C_QTY / 2,
    midY,
    { align: "center" },
  );
  doc.text(
    fmtMoney(data.unitPrice, data.currency),
    tl + C_DESC + C_QTY + C_PRICE / 2,
    midY,
    { align: "center" },
  );
  fnt(doc, "bold", 9);
  doc.text(
    fmtMoney(data.totalAmount, data.currency),
    tl + C_DESC + C_QTY + C_PRICE + C_TOTAL / 2,
    midY,
    { align: "center" },
  );

  y = rowY + rowH;

  // ── Shipping row ──────────────────────────────────────────────────────
  const SH = 9;
  fc(doc, C.rowAlt);
  dc(doc, C.line);
  doc.rect(tl, y, CW, SH, "FD");
  for (const vx of vlines) doc.line(vx, y, vx, y + SH);

  fnt(doc, "bold", 9);
  tc(doc, C.black);
  doc.text("Shipping", tl + 3, y + 6);

  fnt(doc, "normal", 9);
  doc.text(
    data.quantity.toLocaleString("en-US"),
    tl + C_DESC + C_QTY / 2,
    y + 6,
    { align: "center" },
  );

  tc(doc, C.muted);
  fnt(doc, "bold", 9);
  doc.text("FREE", tl + CW - 3, y + 6, { align: "right" });

  y += SH + 8;

  // ── Totals section ────────────────────────────────────────────────────
  const rx = tl + CW;

  fnt(doc, "normal", 8.5);
  tc(doc, C.muted);
  doc.text("Subtotal:", rx - 36, y, { align: "right" });
  tc(doc, C.black);
  doc.text(fmtMoney(data.totalAmount, data.currency), rx, y, { align: "right" });

  y += 6;
  tc(doc, C.muted);
  doc.text("Shipping:", rx - 36, y, { align: "right" });
  tc(doc, C.black);
  doc.text("FREE", rx, y, { align: "right" });

  y += 4;
  dc(doc, C.line);
  doc.setLineWidth(0.2);
  doc.line(rx - 70, y, rx, y);
  y += 7;

  // TOTAL DUE dark box
  const bW = 74, bH = 12;
  fc(doc, C.black);
  doc.rect(rx - bW, y, bW, bH, "F");

  fnt(doc, "bold", 10);
  tc(doc, C.white);
  doc.text("TOTAL DUE:", rx - bW + 4, y + 8);
  // Bright gold from brand strip reference (#FFC000)
  tc(doc, [255, 192, 0] as RGB);
  doc.text(fmtMoney(data.totalAmount, data.currency), rx - 4, y + 8, { align: "right" });

  y += bH + 10;

  // ── Optional page 2: option / volume pricing ──────────────────────────
  const optionTables = (data.optionTables ?? []).filter(
    (t) => t.columns.length > 0 && t.rows.length > 0,
  );
  const hasOptionTables = optionTables.length > 0;
  const hasVolume =
    data.volumeTiers != null && data.volumeTiers.rows.length > 0;

  if (hasOptionTables || hasVolume) {
    // Page-1 footer only (terms go on the last page)
    drawPageFooter(doc, Math.max(y + 4, 280));
    doc.addPage();
    y = drawPricingOptionsPage(doc, data, optionTables, hasVolume);
  }

  // TERMS & NOTES on the last page of the quotation
  y = drawTermsAndNotes(doc, y);
  drawPageFooter(doc, y + 4);

  doc.save(`Pacify-Quote-${data.invoiceId}.pdf`);
}

/** Key commercial terms — concise selection for the quotation PDF */
const QUOTE_TERMS: string[] = [
  "Pricing is based on current specifications and quantities. Final pricing may vary after prototype approval.",
  "This quotation is valid for the period stated above (generally 20 days from issue unless otherwise specified).",
  "Standard minimum order quantity (MOQ) is 50 units per SKU/design. Orders below MOQ may incur additional setup or tooling charges.",
  "Production starts only after artwork approval and required deposit confirmation.",
  "Shipping is included based on the agreed delivery terms stated in this quotation.",
];

function drawTermsAndNotes(doc: jsPDF, startY: number): number {
  const fs = 6.5;
  const lh = 3.6;
  const titleH = 8;
  // Estimate height needed
  let estH = titleH + 2;
  fnt(doc, "normal", fs);
  for (const line of QUOTE_TERMS) {
    const wrapped = doc.splitTextToSize(`•  ${line}`, CW) as string[];
    estH += wrapped.length * lh + 0.8;
  }
  estH += 4;

  let y = startY;
  // If not enough room on current page, move terms to a fresh page
  if (y + estH > 275) {
    doc.addPage();
    y = 18;
  }

  fnt(doc, "bold", 8);
  tc(doc, C.gold);
  doc.text("TERMS & NOTES", ML, y);
  y += 5;

  dc(doc, C.line);
  doc.setLineWidth(0.2);
  doc.line(ML, y, PW - ML, y);
  y += 5;

  fnt(doc, "normal", fs);
  tc(doc, C.muted);

  for (const term of QUOTE_TERMS) {
    if (y > 272) {
      doc.addPage();
      y = 18;
      fnt(doc, "normal", fs);
      tc(doc, C.muted);
    }
    const text = `•  ${term}`;
    const lines = doc.splitTextToSize(text, CW) as string[];
    doc.text(lines, ML, y);
    y += lines.length * lh + 0.8;
  }

  return y + 2;
}

function drawPageFooter(doc: jsPDF, minY: number) {
  const fy = Math.min(Math.max(minY, 280), 287);
  dc(doc, C.line);
  doc.setLineWidth(0.2);
  doc.line(ML, fy, PW - ML, fy);
  fnt(doc, "normal", 7);
  tc(doc, C.muted);
  doc.text(
    "Thank you for choosing Pacify Packaging. This quotation is valid for the period stated above.",
    PW / 2,
    fy + 5,
    { align: "center" },
  );
}

function drawPricingPageHeader(doc: jsPDF, data: InvoicePdfData): number {
  let y = 15;
  fnt(doc, "bold", 11);
  tc(doc, C.black);
  doc.text("PACIFY PACKAGING", ML, y);
  fnt(doc, "normal", 8);
  tc(doc, C.muted);
  doc.text(`Quote No: ${data.invoiceId}`, PW - ML, y, { align: "right" });
  y += 5;
  doc.text(data.date, PW - ML, y, { align: "right" });
  y += 6;
  dc(doc, C.gold);
  doc.setLineWidth(0.45);
  doc.line(ML, y, PW - ML, y);
  y += 10;

  fnt(doc, "bold", 7.5);
  tc(doc, C.gold);
  doc.text("OPTION PRICING", ML, y);
  y += 6;
  fnt(doc, "bold", 12);
  tc(doc, C.black);
  doc.text(data.orderTitle || "Custom Packaging Order", ML, y);
  y += 5;
  fnt(doc, "normal", 8);
  tc(doc, C.muted);
  doc.text(
    "Compare options and unit prices below. Final quotation subject to artwork approval.",
    ML,
    y,
  );
  return y + 10;
}

/** Equal column widths that always fill CW */
function equalColWidths(count: number): number[] {
  const n = Math.max(count, 1);
  const w = CW / n;
  return Array.from({ length: n }, () => w);
}

function drawTableHeaderRow(
  doc: jsPDF,
  y: number,
  headers: string[],
  colWs: number[],
  headH: number,
) {
  fc(doc, C.black);
  doc.rect(ML, y, CW, headH, "F");
  fnt(doc, "bold", 6.5);
  tc(doc, C.white);
  let x = ML;
  for (let i = 0; i < headers.length; i++) {
    const label = headers[i] || `Col ${i + 1}`;
    // Center all custom headers for a clean option matrix
    const lines = doc.splitTextToSize(label, colWs[i] - 2) as string[];
    const line = lines[0] ?? label;
    doc.text(line, x + colWs[i] / 2, y + headH / 2 + 1.2, { align: "center" });
    x += colWs[i];
  }
}

function drawOptionPricingTable(
  doc: jsPDF,
  table: OptionPricingTable,
  startY: number,
): number {
  let y = startY;
  const title = table.title || "Option Pricing Comparison";
  fnt(doc, "bold", 9);
  tc(doc, C.black);
  doc.text(title, ML, y);
  y += 5;

  const headers = table.columns.map((c) => c.trim() || "—");
  const colWs = equalColWidths(headers.length);
  const rowH = 8;
  const headH = 9;

  if (y + headH + rowH > 270) {
    doc.addPage();
    y = 18;
  }

  drawTableHeaderRow(doc, y, headers, colWs, headH);
  y += headH;

  table.rows.forEach((row, ri) => {
    if (y + rowH > 275) {
      doc.addPage();
      y = 18;
      drawTableHeaderRow(doc, y, headers, colWs, headH);
      y += headH;
    }

    if (ri % 2 === 1) {
      fc(doc, C.rowAlt);
      doc.rect(ML, y, CW, rowH, "F");
    }
    dc(doc, C.line);
    doc.setLineWidth(0.15);
    doc.rect(ML, y, CW, rowH, "S");

    fnt(doc, "normal", 7);
    tc(doc, C.black);
    let cx = ML;
    for (let i = 0; i < headers.length; i++) {
      const raw = (row[i] ?? "").trim();
      const cell = raw || "—";
      const lines = doc.splitTextToSize(cell, colWs[i] - 2.5) as string[];
      doc.text(lines[0] ?? cell, cx + colWs[i] / 2, y + 5.5, { align: "center" });
      if (i < headers.length - 1) {
        doc.line(cx + colWs[i], y, cx + colWs[i], y + rowH);
      }
      cx += colWs[i];
    }
    y += rowH;
  });

  return y + 10;
}

function drawVolumeTiersTable(
  doc: jsPDF,
  currency: "PKR" | "USD",
  tiers: VolumeTiers,
  startY: number,
): number {
  let y = startY;
  const title = tiers.title || "Quantity Break Pricing";
  fnt(doc, "bold", 9);
  tc(doc, C.black);
  doc.text(title, ML, y);
  y += 5;

  const colW = [CW * 0.28, CW * 0.36, CW * 0.36];
  const headers = ["Quantity", "Per Unit", "TOTAL"];
  const rowH = 8;
  const headH = 9;

  if (y + headH + rowH > 270) {
    doc.addPage();
    y = 18;
  }

  fc(doc, C.black);
  doc.rect(ML, y, CW, headH, "F");
  fnt(doc, "bold", 7.5);
  tc(doc, C.white);
  let x = ML;
  for (let i = 0; i < 3; i++) {
    doc.text(headers[i], x + colW[i] / 2, y + 6, { align: "center" });
    x += colW[i];
  }
  y += headH;

  // Sort by quantity descending (highest volume first — matches sample)
  const rows = [...tiers.rows].sort((a, b) => b.quantity - a.quantity);

  rows.forEach((row, ri) => {
    if (y + rowH > 275) {
      doc.addPage();
      y = 18;
      fc(doc, C.black);
      doc.rect(ML, y, CW, headH, "F");
      fnt(doc, "bold", 7.5);
      tc(doc, C.white);
      let hx = ML;
      for (let i = 0; i < 3; i++) {
        doc.text(headers[i], hx + colW[i] / 2, y + 6, { align: "center" });
        hx += colW[i];
      }
      y += headH;
    }

    if (ri % 2 === 1) {
      fc(doc, C.rowAlt);
      doc.rect(ML, y, CW, rowH, "F");
    }
    dc(doc, C.line);
    doc.setLineWidth(0.15);
    doc.rect(ML, y, CW, rowH, "S");

    const total = row.quantity * row.unitPrice;
    const vals = [
      row.quantity.toLocaleString("en-US"),
      fmtMoney(row.unitPrice, currency),
      fmtMoney(total, currency),
    ];

    let cx = ML;
    for (let i = 0; i < 3; i++) {
      fnt(doc, i === 2 ? "bold" : "normal", 8);
      tc(doc, C.black);
      doc.text(vals[i], cx + colW[i] / 2, y + 5.5, { align: "center" });
      if (i < 2) doc.line(cx + colW[i], y, cx + colW[i], y + rowH);
      cx += colW[i];
    }
    y += rowH;
  });

  return y + 8;
}

function drawPricingOptionsPage(
  doc: jsPDF,
  data: InvoicePdfData,
  optionTables: OptionPricingTable[],
  hasVolume: boolean,
): number {
  let y = drawPricingPageHeader(doc, data);

  // Quantity break ladder first
  if (hasVolume && data.volumeTiers) {
    y = drawVolumeTiersTable(doc, data.currency, data.volumeTiers, y);
  }

  // Then one or more custom option comparison tables
  for (const table of optionTables) {
    y = drawOptionPricingTable(doc, table, y);
  }

  fnt(doc, "normal", 7.5);
  tc(doc, C.muted);
  doc.text(
    "Prices shown are unit prices unless noted. Final quotation subject to artwork approval.",
    ML,
    y + 2,
  );

  return y + 10;
}

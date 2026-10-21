import { jsPDF } from "jspdf";
import {
  formatPkr,
  formatPkrTotal,
  formatUsd,
  pkrToUsd,
  roundMoney,
} from "./currency";
import type { CostEngineResult } from "./types";

export interface RigidCostPdfInput {
  clientName: string;
  /** Closed box dims in the active unit */
  length: number;
  width: number;
  height: number;
  unit: string;
  openWidthIn: number;
  openHeightIn: number;
  quantity: number;
  paperType: string;
  printSides: string;
  printColorMode: string;
  profitRatio: number;
  usdRate: number;
  costResult: CostEngineResult;
}

/** Professional quote palette (print-friendly) */
const C = {
  ink: [15, 23, 42] as const,
  muted: [100, 116, 139] as const,
  soft: [148, 163, 184] as const,
  line: [226, 232, 240] as const,
  surface: [248, 250, 252] as const,
  white: [255, 255, 255] as const,
  brand: [26, 58, 47] as const, // pacify forest
  brandDark: [15, 34, 28] as const,
  brandSoft: [245, 235, 217] as const, // soft gold wash
  accent: [201, 169, 110] as const, // pacify gold
  rowAlt: [248, 248, 248] as const,
};

function safeFilenamePart(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return cleaned || "client";
}

function rgb(
  doc: jsPDF,
  c: readonly [number, number, number],
  mode: "fill" | "draw" | "text",
) {
  if (mode === "fill") doc.setFillColor(c[0], c[1], c[2]);
  else if (mode === "draw") doc.setDrawColor(c[0], c[1], c[2]);
  else doc.setTextColor(c[0], c[1], c[2]);
}

/**
 * Build and download a professional PDF quote for a rigid box cost run.
 */
export function downloadRigidCostPdf(input: RigidCostPdfInput): void {
  const {
    clientName,
    length,
    width,
    height,
    unit,
    openWidthIn,
    openHeightIn,
    quantity,
    paperType,
    printSides,
    printColorMode,
    profitRatio,
    usdRate,
    costResult,
  } = input;

  const ratio =
    Number.isFinite(profitRatio) && profitRatio > 0 ? profitRatio : 1;
  const basePkr = costResult.grandTotal;
  const sellPkr = roundMoney(basePkr * ratio);
  const baseUsd = pkrToUsd(basePkr, usdRate);
  const sellUsd = pkrToUsd(sellPkr, usdRate);
  const basePerUnitPkr = costResult.costPerUnit;
  const sellPerUnitPkr = roundMoney(sellPkr / quantity);
  const basePerUnitUsd =
    baseUsd != null ? roundMoney(baseUsd / quantity) : null;
  const sellPerUnitUsd =
    sellUsd != null ? roundMoney(sellUsd / quantity) : null;

  const displayClient = clientName.trim() || "Valued Client";
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const quoteId = `RBQ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const footerH = 14;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - footerH - 4) {
      doc.addPage();
      drawContinuationHeader();
      y = 28;
    }
  };

  const drawFooter = (pageNo: number, pageCount: number) => {
    rgb(doc, C.line, "draw");
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - footerH, pageW - margin, pageH - footerH);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    rgb(doc, C.soft, "text");
    doc.text(
      "Confidential quote · Estimates based on entered specifications",
      margin,
      pageH - footerH + 6,
    );
    doc.text(`Page ${pageNo} of ${pageCount}`, pageW - margin, pageH - footerH + 6, {
      align: "right",
    });
  };

  const drawContinuationHeader = () => {
    rgb(doc, C.brandDark, "fill");
    doc.rect(0, 0, pageW, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    rgb(doc, C.white, "text");
    doc.text("Rigid Box Cost Quote", margin, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${displayClient} · ${quoteId}`, pageW - margin, 11, {
      align: "right",
    });
  };

  // ── Hero header ──────────────────────────────────────────────────────────
  rgb(doc, C.brandDark, "fill");
  doc.rect(0, 0, pageW, 36, "F");
  rgb(doc, C.brand, "fill");
  doc.rect(0, 36, pageW, 2.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  rgb(doc, C.white, "text");
  doc.text("COST QUOTE", margin, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  rgb(doc, [167, 243, 208], "text"); // teal-200
  doc.text("Rigid Box Packaging", margin, 23);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  rgb(doc, C.white, "text");
  doc.text(quoteId, pageW - margin, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  rgb(doc, [167, 243, 208], "text");
  doc.text(dateStr, pageW - margin, 21, { align: "right" });
  doc.text(`FX ${usdRate} PKR / USD`, pageW - margin, 27, { align: "right" });

  y = 46;

  // ── Client banner ────────────────────────────────────────────────────────
  rgb(doc, C.brandSoft, "fill");
  rgb(doc, C.brand, "draw");
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentW, 16, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  rgb(doc, C.brand, "text");
  doc.text("PREPARED FOR", margin + 4, y + 5.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  rgb(doc, C.ink, "text");
  doc.text(displayClient, margin + 4, y + 12);
  y += 22;

  // ── Job specs grid ───────────────────────────────────────────────────────
  sectionLabel(doc, "Job specifications", margin, y);
  y += 6;

  const paperItem = costResult.items.find(
    (i) => i.id === "paper" && !i.excluded,
  );
  const artMeta =
    paperType === "art" && paperItem?.meta?.paperType === "art"
      ? paperItem.meta
      : null;

  const specs: [string, string][] = [
    ["Closed size", `${length} × ${width} × ${height} ${unit}`],
    [
      "Open size",
      `${openWidthIn.toFixed(2)} × ${openHeightIn.toFixed(2)} in`,
    ],
    ["Quantity", quantity.toLocaleString("en-US") + " units"],
    ["Paper", paperType === "morocco" ? "Morocco" : "Art Paper"],
    ["Print sides", printSides === "double" ? "Double side" : "Single side"],
    ["Colors", printColorMode === "cmyk" ? "CMYK (4)" : "1 color"],
    ["Profit ratio", `× ${ratio}`],
    ["USD rate", `${usdRate} PKR`],
  ];

  if (artMeta) {
    const sw = Number(artMeta.sheetWidth ?? 0);
    const sh = Number(artMeta.sheetHeight ?? 0);
    const pcs = Number(artMeta.piecesPerSheet ?? 0);
    const sheetsReq = Number(artMeta.piecesRequired ?? 0);
      const physical = Number(artMeta.physicalSheets ?? 0);
    const manualQty = !!artMeta.sheetsRequiredManual;
    specs.push(
      ["Art sheet selected", `${sw} × ${sh} in`],
      ["Pieces / sheet", String(pcs)],
      [
        "Sheets for art cost",
        `${sheetsReq.toLocaleString("en-US")}${manualQty ? " (manual)" : ""}`,
      ],
      ["Physical sheets", physical.toLocaleString("en-US")],
    );
  }

  const gap = 3;
  const cardW = (contentW - gap) / 2;
  const cardH = 11;
  for (let i = 0; i < specs.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    if (col === 0) ensureSpace(cardH + 2);
    const x = margin + col * (cardW + gap);
    const cy = y + row * (cardH + gap);
    rgb(doc, C.surface, "fill");
    rgb(doc, C.line, "draw");
    doc.setLineWidth(0.25);
    doc.roundedRect(x, cy, cardW, cardH, 1, 1, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    rgb(doc, C.muted, "text");
    doc.text(specs[i][0].toUpperCase(), x + 3, cy + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    rgb(doc, C.ink, "text");
    const value = specs[i][1];
    // Keep long values from overflowing the card
    const clipped =
      value.length > 36 ? `${value.slice(0, 34)}…` : value;
    doc.text(clipped, x + 3, cy + 8.5);
  }
  y += Math.ceil(specs.length / 2) * (cardH + gap) + 4;

  // ── Cost breakdown table ─────────────────────────────────────────────────
  ensureSpace(20);
  sectionLabel(doc, "Cost breakdown", margin, y);
  y += 5;

  const colItem = margin;
  const colUnit = margin + contentW * 0.52;
  const colTotal = pageW - margin;
  const rowH = 7.2;

  const drawTableHeader = () => {
    rgb(doc, C.ink, "fill");
    doc.roundedRect(margin, y, contentW, rowH, 1, 1, "F");
    // square bottom corners of header band
    doc.rect(margin, y + rowH - 2, contentW, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    rgb(doc, C.white, "text");
    doc.text("ITEM", colItem + 3, y + 4.8);
    doc.text("PER UNIT", colUnit, y + 4.8, { align: "right" });
    doc.text("TOTAL", colTotal - 3, y + 4.8, { align: "right" });
    y += rowH;
  };

  drawTableHeader();

  const items = costResult.items.filter((i) => !i.excluded);
  items.forEach((item, idx) => {
    let note = "";
    if (item.id === "shipping" && item.meta) {
      note = `${Number(item.meta.totalKg ?? 0).toLocaleString("en-US", {
        maximumFractionDigits: 3,
      })} kg @ ${formatPkrTotal(Number(item.meta.ratePerKg ?? 0))}/kg`;
    } else if (
      item.id === "paper" &&
      item.meta?.paperType === "art" &&
      item.meta
    ) {
      const sw = Number(item.meta.sheetWidth ?? 0);
      const sh = Number(item.meta.sheetHeight ?? 0);
      const pcs = Number(item.meta.piecesPerSheet ?? 0);
      const sheetsReq = Number(item.meta.piecesRequired ?? 0);
      const perSheet = Number(item.meta.perSheetCost ?? 0);
      const manual = item.meta.sheetsRequiredManual ? ", manual qty" : "";
      note = `Sheet ${sw}×${sh} in · ${pcs} pcs/sheet · ${sheetsReq.toLocaleString("en-US")} sheets required${manual} · ${formatPkr(perSheet)}/sheet`;
    }
    const h = note ? 9.2 : rowH;

    ensureSpace(h + 2);
    if (y < 35 && idx > 0) {
      drawTableHeader();
    }

    if (idx % 2 === 1) {
      rgb(doc, C.rowAlt, "fill");
      doc.rect(margin, y, contentW, h, "F");
    }

    const midY = y + h / 2 + 1.1;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    rgb(doc, C.ink, "text");
    doc.text(item.label, colItem + 3, note ? y + 3.5 : midY);

    if (note) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      rgb(doc, C.muted, "text");
      doc.text(note, colItem + 3, y + 7.2);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    rgb(doc, C.muted, "text");
    doc.text(formatPkr(item.perUnit), colUnit, midY, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    rgb(doc, C.ink, "text");
    doc.text(formatPkrTotal(item.total), colTotal - 3, midY, {
      align: "right",
    });

    y += h;
  });

  // table bottom border
  rgb(doc, C.line, "draw");
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Summary cards ────────────────────────────────────────────────────────
  ensureSpace(52);
  sectionLabel(doc, "Pricing summary", margin, y);
  y += 5;

  const half = (contentW - gap) / 2;

  // Base cost card
  drawSummaryCard(doc, {
    x: margin,
    y,
    w: half,
    h: 40,
    title: "BASE COST",
    subtitle: "Production cost (no markup)",
    tone: "neutral",
    totalPkr: formatPkrTotal(basePkr),
    totalUsd: baseUsd != null ? formatUsd(baseUsd) : "—",
    perPkr: formatPkr(basePerUnitPkr),
    perUsd: basePerUnitUsd != null ? formatUsd(basePerUnitUsd) : "—",
  });

  // Selling price card
  drawSummaryCard(doc, {
    x: margin + half + gap,
    y,
    w: half,
    h: 40,
    title: "SELLING PRICE",
    subtitle: `Quoted price (×${ratio})`,
    tone: "brand",
    totalPkr: formatPkrTotal(sellPkr),
    totalUsd: sellUsd != null ? formatUsd(sellUsd) : "—",
    perPkr: formatPkr(sellPerUnitPkr),
    perUsd: sellPerUnitUsd != null ? formatUsd(sellPerUnitUsd) : "—",
  });

  y += 46;

  // ── Closing note ─────────────────────────────────────────────────────────
  ensureSpace(16);
  rgb(doc, C.surface, "fill");
  rgb(doc, C.line, "draw");
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, y, contentW, 12, 1, 1, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  rgb(doc, C.muted, "text");
  doc.text(
    "This quote is generated from the Rigid Box Calculator. Final commercial terms may vary with material availability, finishing approvals, and shipping conditions.",
    margin + 3.5,
    y + 5,
    { maxWidth: contentW - 7 },
  );

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `rigid-box-quote-${safeFilenamePart(displayClient)}-${stamp}.pdf`;
  doc.save(filename);
}

function sectionLabel(
  doc: jsPDF,
  title: string,
  x: number,
  y: number,
) {
  rgb(doc, C.brand, "fill");
  doc.rect(x, y - 2.5, 1.2, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  rgb(doc, C.ink, "text");
  doc.text(title, x + 4, y + 1);
}

function drawSummaryCard(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    title: string;
    subtitle: string;
    tone: "neutral" | "brand";
    totalPkr: string;
    totalUsd: string;
    perPkr: string;
    perUsd: string;
  },
) {
  const { x, y, w, h, title, subtitle, tone, totalPkr, totalUsd, perPkr, perUsd } =
    opts;

  if (tone === "brand") {
    rgb(doc, C.brandDark, "fill");
    doc.roundedRect(x, y, w, h, 2, 2, "F");
    rgb(doc, C.brand, "fill");
    doc.rect(x, y, w, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    rgb(doc, [153, 246, 228], "text");
    doc.text(title, x + 4, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(subtitle, x + 4, y + 11.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    rgb(doc, C.white, "text");
    doc.text(totalPkr, x + 4, y + 20);
    doc.setFontSize(11);
    doc.text(totalUsd, x + 4, y + 26.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    rgb(doc, [167, 243, 208], "text");
    doc.text(`Per unit  ${perPkr}  ·  ${perUsd}`, x + 4, y + 34);
  } else {
    rgb(doc, C.white, "fill");
    rgb(doc, C.line, "draw");
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, w, h, 2, 2, "FD");
    rgb(doc, C.surface, "fill");
    doc.rect(x, y, w, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    rgb(doc, C.muted, "text");
    doc.text(title, x + 4, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(subtitle, x + 4, y + 11.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    rgb(doc, C.ink, "text");
    doc.text(totalPkr, x + 4, y + 20);
    doc.setFontSize(11);
    rgb(doc, C.accent, "text");
    doc.text(totalUsd, x + 4, y + 26.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    rgb(doc, C.muted, "text");
    doc.text(`Per unit  ${perPkr}  ·  ${perUsd}`, x + 4, y + 34);
  }
}

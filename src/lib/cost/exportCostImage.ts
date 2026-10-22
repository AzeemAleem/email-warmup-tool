import {
  formatPkr,
  formatPkrTotal,
  formatUsd,
  pkrToUsd,
  roundMoney,
} from "./currency";
import type { CostEngineResult } from "./types";

export interface RigidCostImageInput {
  clientName: string;
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

const C = {
  ink: "#0f172a",
  muted: "#64748b",
  soft: "#94a3b8",
  line: "#e2e8f0",
  surface: "#f8fafc",
  white: "#ffffff",
  brand: "#1A3A2F",
  brandDark: "#0F221C",
  brandSoft: "#F5EBD9",
  accent: "#C9A96E",
  rowAlt: "#f8f8f8",
  teal: "#a7f3d0",
};

function safeFilenamePart(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return cleaned || "client";
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Build a single-page cost quote image and download as PNG (or JPEG).
 */
export async function downloadRigidCostImage(
  input: RigidCostImageInput,
  format: "png" | "jpeg" = "png",
): Promise<void> {
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

  const paperItem = costResult.items.find((i) => i.id === "paper" && !i.excluded);
  const artMeta =
    paperType === "art" && paperItem?.meta?.paperType === "art"
      ? paperItem.meta
      : null;

  const specs: [string, string][] = [
    ["Closed size", `${length} × ${width} × ${height} ${unit}`],
    ["Open size", `${openWidthIn.toFixed(2)} × ${openHeightIn.toFixed(2)} in`],
    ["Quantity", `${quantity.toLocaleString("en-US")} units`],
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
      ["Art sheet", `${sw} × ${sh} in`],
      ["Pieces / sheet", String(pcs)],
      [
        "Sheets for cost",
        `${sheetsReq.toLocaleString("en-US")}${manualQty ? " (manual)" : ""}`,
      ],
      ["Physical sheets", physical.toLocaleString("en-US")],
    );
  }

  const items = costResult.items.filter((i) => !i.excluded);

  // Layout constants (logical CSS pixels; drawn at 2x for sharpness)
  const W = 1000;
  const pad = 36;
  const contentW = W - pad * 2;
  const scale = 2;

  // Height estimate — tall enough that all sections fit on one image
  const specRows = Math.ceil(specs.length / 2);
  const itemsWithNotes = items.filter((item) => {
    if (item.id === "shipping" && item.meta) return true;
    if (item.id === "paper" && item.meta?.paperType === "art") return true;
    return false;
  }).length;
  const plainItems = items.length - itemsWithNotes;
  const estH =
    100 + // header
    60 + // client
    24 +
    specRows * 50 +
    24 +
    32 + // table header
    plainItems * 30 +
    itemsWithNotes * 40 +
    28 +
    130 + // summary
    60 + // note
    48; // footer

  const H = Math.max(estH + 40, 920);

  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.scale(scale, scale);
  ctx.textBaseline = "alphabetic";

  // Background
  ctx.fillStyle = C.white;
  ctx.fillRect(0, 0, W, H);

  let y = 0;

  // ── Header ──────────────────────────────────────────────────────────────
  ctx.fillStyle = C.brandDark;
  ctx.fillRect(0, 0, W, 78);
  ctx.fillStyle = C.brand;
  ctx.fillRect(0, 78, W, 4);

  ctx.fillStyle = C.white;
  ctx.font = "bold 28px Helvetica, Arial, sans-serif";
  ctx.fillText("COST QUOTE", pad, 34);

  ctx.fillStyle = C.teal;
  ctx.font = "14px Helvetica, Arial, sans-serif";
  ctx.fillText("Rigid Box Packaging", pad, 56);

  ctx.fillStyle = C.white;
  ctx.font = "bold 13px Helvetica, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(quoteId, W - pad, 30);
  ctx.fillStyle = C.teal;
  ctx.font = "12px Helvetica, Arial, sans-serif";
  ctx.fillText(dateStr, W - pad, 48);
  ctx.fillText(`FX ${usdRate} PKR / USD`, W - pad, 64);
  ctx.textAlign = "left";

  y = 98;

  // ── Client banner ───────────────────────────────────────────────────────
  roundRect(ctx, pad, y, contentW, 44, 8);
  ctx.fillStyle = C.brandSoft;
  ctx.fill();
  ctx.strokeStyle = C.brand;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = C.brand;
  ctx.font = "11px Helvetica, Arial, sans-serif";
  ctx.fillText("PREPARED FOR", pad + 14, y + 16);
  ctx.fillStyle = C.ink;
  ctx.font = "bold 18px Helvetica, Arial, sans-serif";
  ctx.fillText(displayClient, pad + 14, y + 34);
  y += 58;

  // ── Specs ───────────────────────────────────────────────────────────────
  drawSectionLabel(ctx, "Job specifications", pad, y);
  y += 18;

  const gap = 10;
  const cardW = (contentW - gap) / 2;
  const cardH = 40;
  specs.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = pad + col * (cardW + gap);
    const cy = y + row * (cardH + gap);

    roundRect(ctx, x, cy, cardW, cardH, 6);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = C.muted;
    ctx.font = "10px Helvetica, Arial, sans-serif";
    ctx.fillText(label.toUpperCase(), x + 10, cy + 14);
    ctx.fillStyle = C.ink;
    ctx.font = "bold 13px Helvetica, Arial, sans-serif";
    const clipped = value.length > 42 ? `${value.slice(0, 40)}…` : value;
    ctx.fillText(clipped, x + 10, cy + 30);
  });
  y += specRows * (cardH + gap) + 8;

  // ── Cost table ──────────────────────────────────────────────────────────
  drawSectionLabel(ctx, "Cost breakdown", pad, y);
  y += 16;

  const colUnit = pad + contentW * 0.55;
  const colTotal = pad + contentW - 8;
  const rowH = 30;

  // header
  roundRect(ctx, pad, y, contentW, rowH, 6);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.fillRect(pad, y + rowH - 6, contentW, 6);

  ctx.fillStyle = C.white;
  ctx.font = "bold 11px Helvetica, Arial, sans-serif";
  ctx.fillText("ITEM", pad + 10, y + 19);
  ctx.textAlign = "right";
  ctx.fillText("PER UNIT", colUnit, y + 19);
  ctx.fillText("TOTAL", colTotal, y + 19);
  ctx.textAlign = "left";
  y += rowH;

  items.forEach((item, idx) => {
    let note = "";
    if (item.id === "shipping" && item.meta) {
      note = `${Number(item.meta.totalKg ?? 0).toLocaleString("en-US", {
        maximumFractionDigits: 3,
      })} kg @ ${formatPkrTotal(Number(item.meta.ratePerKg ?? 0))}/kg`;
    } else if (item.id === "paper" && item.meta?.paperType === "art" && item.meta) {
      const sw = Number(item.meta.sheetWidth ?? 0);
      const sh = Number(item.meta.sheetHeight ?? 0);
      const pcs = Number(item.meta.piecesPerSheet ?? 0);
      const sheetsReq = Number(item.meta.piecesRequired ?? 0);
      note = `${sw}×${sh} in · ${pcs}/sheet · ${sheetsReq} sheets`;
    }

    const h = note ? 40 : rowH;
    if (idx % 2 === 1) {
      ctx.fillStyle = C.rowAlt;
      ctx.fillRect(pad, y, contentW, h);
    }

    ctx.fillStyle = C.ink;
    ctx.font = "bold 12px Helvetica, Arial, sans-serif";
    ctx.fillText(item.label, pad + 10, note ? y + 15 : y + 19);

    if (note) {
      ctx.fillStyle = C.muted;
      ctx.font = "10px Helvetica, Arial, sans-serif";
      ctx.fillText(note, pad + 10, y + 30);
    }

    const midY = note ? y + 22 : y + 19;
    ctx.fillStyle = C.muted;
    ctx.font = "12px Helvetica, Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(formatPkr(item.perUnit), colUnit, midY);
    ctx.fillStyle = C.ink;
    ctx.font = "bold 12px Helvetica, Arial, sans-serif";
    ctx.fillText(formatPkrTotal(item.total), colTotal, midY);
    ctx.textAlign = "left";

    y += h;
  });

  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(W - pad, y);
  ctx.stroke();
  y += 18;

  // ── Summary ─────────────────────────────────────────────────────────────
  drawSectionLabel(ctx, "Pricing summary", pad, y);
  y += 16;

  const half = (contentW - gap) / 2;
  const sumH = 108;

  // Base card
  roundRect(ctx, pad, y, half, sumH, 8);
  ctx.fillStyle = C.white;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = C.surface;
  ctx.fillRect(pad, y, half, 4);

  ctx.fillStyle = C.muted;
  ctx.font = "bold 11px Helvetica, Arial, sans-serif";
  ctx.fillText("BASE COST", pad + 14, y + 22);
  ctx.font = "10px Helvetica, Arial, sans-serif";
  ctx.fillText("Production cost (no markup)", pad + 14, y + 36);
  ctx.fillStyle = C.ink;
  ctx.font = "bold 18px Helvetica, Arial, sans-serif";
  ctx.fillText(formatPkrTotal(basePkr), pad + 14, y + 58);
  ctx.fillStyle = C.accent;
  ctx.font = "bold 16px Helvetica, Arial, sans-serif";
  ctx.fillText(baseUsd != null ? formatUsd(baseUsd) : "—", pad + 14, y + 78);
  ctx.fillStyle = C.muted;
  ctx.font = "11px Helvetica, Arial, sans-serif";
  ctx.fillText(
    `Per unit  ${formatPkr(basePerUnitPkr)}  ·  ${basePerUnitUsd != null ? formatUsd(basePerUnitUsd) : "—"}`,
    pad + 14,
    y + 96,
  );

  // Selling card
  const sx = pad + half + gap;
  roundRect(ctx, sx, y, half, sumH, 8);
  ctx.fillStyle = C.brandDark;
  ctx.fill();
  ctx.fillStyle = C.brand;
  ctx.fillRect(sx, y, half, 4);

  ctx.fillStyle = C.teal;
  ctx.font = "bold 11px Helvetica, Arial, sans-serif";
  ctx.fillText("SELLING PRICE", sx + 14, y + 22);
  ctx.font = "10px Helvetica, Arial, sans-serif";
  ctx.fillText(`Quoted price (×${ratio})`, sx + 14, y + 36);
  ctx.fillStyle = C.white;
  ctx.font = "bold 18px Helvetica, Arial, sans-serif";
  ctx.fillText(formatPkrTotal(sellPkr), sx + 14, y + 58);
  ctx.font = "bold 16px Helvetica, Arial, sans-serif";
  ctx.fillText(sellUsd != null ? formatUsd(sellUsd) : "—", sx + 14, y + 78);
  ctx.fillStyle = C.teal;
  ctx.font = "11px Helvetica, Arial, sans-serif";
  ctx.fillText(
    `Per unit  ${formatPkr(sellPerUnitPkr)}  ·  ${sellPerUnitUsd != null ? formatUsd(sellPerUnitUsd) : "—"}`,
    sx + 14,
    y + 96,
  );

  y += sumH + 16;

  // ── Note ────────────────────────────────────────────────────────────────
  roundRect(ctx, pad, y, contentW, 40, 6);
  ctx.fillStyle = C.surface;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = C.muted;
  ctx.font = "11px Helvetica, Arial, sans-serif";
  wrapText(
    ctx,
    "This quote is generated from the Rigid Box Calculator. Final commercial terms may vary with material availability, finishing approvals, and shipping conditions.",
    pad + 12,
    y + 16,
    contentW - 24,
    14,
  );
  y += 52;

  // ── Footer ──────────────────────────────────────────────────────────────
  ctx.strokeStyle = C.line;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(W - pad, y);
  ctx.stroke();
  ctx.fillStyle = C.soft;
  ctx.font = "10px Helvetica, Arial, sans-serif";
  ctx.fillText("Confidential quote · Estimates based on entered specifications", pad, y + 16);
  ctx.textAlign = "right";
  ctx.fillText("Pacify Packaging", W - pad, y + 16);
  ctx.textAlign = "left";

  // Crop to used height (+ padding) so the image stays tight/single-page
  const usedH = Math.min(H, y + 28);
  const out = document.createElement("canvas");
  out.width = W * scale;
  out.height = usedH * scale;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Canvas not available");
  octx.drawImage(canvas, 0, 0, out.width, usedH * scale, 0, 0, out.width, out.height);

  const mime = format === "jpeg" ? "image/jpeg" : "image/png";
  const quality = format === "jpeg" ? 0.92 : undefined;
  const blob = await new Promise<Blob | null>((resolve) =>
    out.toBlob(resolve, mime, quality),
  );
  if (!blob) throw new Error("Failed to create image");

  const stamp = new Date().toISOString().slice(0, 10);
  const ext = format === "jpeg" ? "jpg" : "png";
  const filename = `rigid-box-quote-${safeFilenamePart(displayClient)}-${stamp}.${ext}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function drawSectionLabel(
  ctx: CanvasRenderingContext2D,
  title: string,
  x: number,
  y: number,
) {
  ctx.fillStyle = C.brand;
  ctx.fillRect(x, y - 10, 3, 14);
  ctx.fillStyle = C.ink;
  ctx.font = "bold 14px Helvetica, Arial, sans-serif";
  ctx.fillText(title, x + 10, y);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

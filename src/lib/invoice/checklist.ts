/** Shared invoice checklist groups — used by generator + PDF-style viewer */

import type { InvoiceDraftPayload } from "@/lib/invoice/draft";

export interface InvoiceChecklistItem {
  id: string;
  label: string;
  boldPrefix: string;
  text: string;
}

export interface InvoiceChecklistGroup {
  id: string;
  label: string;
  items: InvoiceChecklistItem[];
}

export const INVOICE_CHECKLIST_GROUPS: InvoiceChecklistGroup[] = [
  {
    id: "structure",
    label: "Box Style & Structure",
    items: [
      { id: "locking", label: "Self-locking mailer", boldPrefix: "Structure:", text: "Custom self-locking design for convenient handling and secure closure" },
      { id: "bookstyle", label: "Book-style rigid box", boldPrefix: "Structure:", text: "Premium book-style magnetic rigid presentation box" },
      { id: "collapse", label: "Collapsible rigid box", boldPrefix: "Structure:", text: "Collapsible magnetic book-style rigid presentation box" },
      { id: "flapbox", label: "Magnetic flap closure box", boldPrefix: "Structure:", text: "Premium rigid box with magnetic flap closure" },
      { id: "corrmailer", label: "Standard corrugated mailer", boldPrefix: "Structure:", text: "Standard corrugated self-seal mailer box" },
      {
        id: "vol-assembled",
        label: "Volume-based rigid — Assembled",
        boldPrefix: "Structure:",
        text: "Assembled rigid box shipped volume-based (fully erected, ready-to-use construction)",
      },
      {
        id: "vol-collapsible",
        label: "Volume-based rigid — Collapsible",
        boldPrefix: "Structure:",
        text: "Collapsible rigid box shipped volume-based (ships flat / knock-down; not pre-assembled)",
      },
    ],
  },
  {
    id: "material",
    label: "Material & Board",
    items: [
      { id: "corrugated", label: "Corrugated board", boldPrefix: "Material:", text: "Premium corrugated board for strength and durability" },
      { id: "grey15", label: "Rigid greyboard 1.5 mm", boldPrefix: "Board:", text: "Premium 1.5 mm rigid greyboard construction" },
      { id: "grey20", label: "Rigid greyboard 2–2.5 mm", boldPrefix: "Board:", text: "Premium 2–2.5 mm rigid greyboard construction" },
      { id: "grey25", label: "Rigid greyboard 2.5 mm", boldPrefix: "Board:", text: "Premium 2.5 mm high-density rigid greyboard construction" },
      { id: "grey30", label: "Rigid greyboard 3 mm", boldPrefix: "Board:", text: "Premium 3 mm rigid greyboard construction" },
      { id: "cardboard", label: "Premium cardboard", boldPrefix: "Material:", text: "Premium cardboard construction" },
      { id: "coatedwrap", label: "Coated paper wrapped", boldPrefix: "Material:", text: "Premium greyboard construction wrapped with high-quality coated art paper" },
    ],
  },
  {
    id: "printing",
    label: "Printing",
    items: [
      { id: "extonly", label: "Exterior only", boldPrefix: "Printing:", text: "Full custom printing on exterior surfaces" },
      { id: "both", label: "Exterior & interior", boldPrefix: "Printing:", text: "Full custom printing on both exterior and interior surfaces" },
      { id: "cmyk", label: "CMYK full-color", boldPrefix: "Printing:", text: "Full-color CMYK printing" },
      { id: "pantone", label: "Pantone color matched", boldPrefix: "Printing:", text: "Custom Pantone-matched color printing as per approved artwork" },
      { id: "noprint", label: "No printing (plain)", boldPrefix: "Printing:", text: "Plain surfaces without custom artwork or branding" },
    ],
  },
  {
    id: "finish",
    label: "Finish & Lamination",
    items: [
      { id: "matte", label: "Matte lamination", boldPrefix: "Finish:", text: "Premium matte lamination for a smooth, elegant appearance" },
      { id: "gloss", label: "Gloss lamination", boldPrefix: "Finish:", text: "High-gloss lamination for a vibrant, premium finish" },
      { id: "softtouch", label: "Soft-touch lamination", boldPrefix: "Finish:", text: "Soft-touch matte lamination for a luxurious tactile feel" },
      { id: "spotuv", label: "Spot UV coating", boldPrefix: "Finish:", text: "Spot UV coating on selected design elements" },
    ],
  },
  {
    id: "special",
    label: "Special Finishes",
    items: [
      { id: "goldfoil", label: "Gold hot foil", boldPrefix: "Foiling:", text: "Metallic gold hot foil stamping" },
      { id: "silverfoil", label: "Silver hot foil", boldPrefix: "Foiling:", text: "Metallic silver hot foil stamping" },
      { id: "champagne", label: "Champagne-gold foil", boldPrefix: "Foiling:", text: "Precision champagne-gold hot foil stamping as per approved artwork" },
      { id: "emboss", label: "Raised embossing", boldPrefix: "Embossing:", text: "Precision raised embossing" },
      { id: "deboss", label: "Debossing", boldPrefix: "Debossing:", text: "Precision debossing" },
      { id: "foilemb", label: "Foil + registered embossing", boldPrefix: "Finish:", text: "Registered hot foil stamping with precision raised embossing" },
    ],
  },
  {
    id: "closure",
    label: "Closure",
    items: [
      { id: "magnetic", label: "Concealed magnetic", boldPrefix: "Closure:", text: "Concealed magnetic closure for a secure and premium presentation" },
      { id: "selflocking", label: "Self-locking (no glue)", boldPrefix: "Closure:", text: "Self-locking structure requiring no adhesive" },
      { id: "ribbon", label: "Ribbon pull", boldPrefix: "Closure:", text: "Ribbon pull for effortless unboxing" },
      { id: "tuckend", label: "Tuck-end closure", boldPrefix: "Closure:", text: "Standard tuck-end closure" },
    ],
  },
  {
    id: "insert",
    label: "Insert",
    items: [
      { id: "cardinsert", label: "Cardboard insert", boldPrefix: "Insert:", text: "Custom black cardboard insert for secure product placement" },
      { id: "evafoam", label: "EVA foam insert", boldPrefix: "Insert:", text: "Custom-cut black EVA foam insert for product protection" },
      { id: "velvetfoam", label: "Foam + velvet covering", boldPrefix: "Insert:", text: "Custom foam insert with premium velvet covering" },
      { id: "pulpinsert", label: "Pulp-molded insert", boldPrefix: "Insert:", text: "Custom pulp-molded protective insert" },
      { id: "diecut", label: "Die-cut foam", boldPrefix: "Insert:", text: "Custom die-cut foam insert tailored to product dimensions" },
    ],
  },
  {
    id: "interior",
    label: "Interior Finish",
    items: [
      { id: "matchint", label: "Matching interior color", boldPrefix: "Interior:", text: "Interior color matched to exterior for a cohesive premium look" },
      { id: "blackint", label: "Matte-black interior", boldPrefix: "Interior:", text: "Premium matte-black interior lining" },
      { id: "intbrand", label: "Interior branding", boldPrefix: "Interior:", text: "Custom interior lid branding as per approved artwork" },
      { id: "whiteint", label: "Plain white interior", boldPrefix: "Interior:", text: "Clean white interior finish" },
    ],
  },
  {
    id: "quality",
    label: "Quality & Production",
    items: [
      { id: "qc", label: "Quality inspection", boldPrefix: "Quality Control:", text: "Full quality inspection of construction, finishing, and packing before dispatch" },
      { id: "prototype", label: "Physical prototype", boldPrefix: "Prototype:", text: "Physical prototype for client approval before bulk production" },
      { id: "dieline", label: "Custom dieline provided", boldPrefix: "Artwork:", text: "Custom dieline and artwork template provided" },
      { id: "artworkspec", label: "Custom artwork", boldPrefix: "Artwork:", text: "Custom artwork and design based on final approved specifications" },
    ],
  },
];

export interface InvoiceBullet {
  boldPrefix: string;
  text: string;
}

/** Rebuild the same bullet list the PDF / generator use from a saved draft. */
export function buildBulletsFromPayload(
  payload: InvoiceDraftPayload,
): InvoiceBullet[] {
  const out: InvoiceBullet[] = [];
  if (payload.styleText.trim()) {
    out.push({ boldPrefix: "Box Style:", text: payload.styleText.trim() });
  }
  if (payload.sizeText.trim()) {
    out.push({ boldPrefix: "Size:", text: payload.sizeText.trim() });
  }
  if (payload.colorText.trim()) {
    out.push({ boldPrefix: "Exterior:", text: payload.colorText.trim() });
  }
  if (payload.brandingText.trim()) {
    out.push({ boldPrefix: "Branding:", text: payload.brandingText.trim() });
  }
  const checked = new Set(payload.checkedIds);
  for (const g of INVOICE_CHECKLIST_GROUPS) {
    for (const item of g.items) {
      if (checked.has(item.id)) {
        out.push({ boldPrefix: item.boldPrefix, text: item.text });
      }
    }
  }
  return out;
}

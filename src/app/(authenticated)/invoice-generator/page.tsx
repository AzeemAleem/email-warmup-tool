"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownTrayIcon,
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import {
  exportInvoicePdf,
  type InvoiceBullet,
} from "@/lib/invoice/exportInvoicePdf";

// ── Page-2 pricing helpers ────────────────────────────────────────────────────

interface OptRow {
  id: string;
  cells: string[];
}

interface OptTableDraft {
  id: string;
  title: string;
  columns: string[];
  rows: OptRow[];
}

interface VolRow {
  id: string;
  qty: string;
  unitPrice: string;
}

const DEFAULT_OPT_COLUMNS = [
  "Size (cm)",
  "Lid Style",
  "Construction",
  "50 Units",
  "100 Units",
  "250 Units",
];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyOptRow(colCount: number): OptRow {
  return {
    id: newId(),
    cells: Array.from({ length: colCount }, () => ""),
  };
}

function emptyOptTable(title = "Option Pricing Comparison"): OptTableDraft {
  const cols = [...DEFAULT_OPT_COLUMNS];
  return {
    id: newId(),
    title,
    columns: cols,
    rows: [emptyOptRow(cols.length), emptyOptRow(cols.length)],
  };
}

function emptyVolRow(): VolRow {
  return { id: newId(), qty: "", unitPrice: "" };
}

// ── Checklist data ────────────────────────────────────────────────────────────

interface CItem {
  id: string;
  label: string;
  boldPrefix: string;
  text: string;
}
interface CGroup {
  id: string;
  label: string;
  items: CItem[];
}

const GROUPS: CGroup[] = [
  {
    id: "structure",
    label: "Box Style & Structure",
    items: [
      { id: "locking",    label: "Self-locking mailer",          boldPrefix: "Structure:", text: "Custom self-locking design for convenient handling and secure closure" },
      { id: "bookstyle",  label: "Book-style rigid box",         boldPrefix: "Structure:", text: "Premium book-style magnetic rigid presentation box" },
      { id: "collapse",   label: "Collapsible rigid box",        boldPrefix: "Structure:", text: "Collapsible magnetic book-style rigid presentation box" },
      { id: "flapbox",    label: "Magnetic flap closure box",    boldPrefix: "Structure:", text: "Premium rigid box with magnetic flap closure" },
      { id: "corrmailer", label: "Standard corrugated mailer",   boldPrefix: "Structure:", text: "Standard corrugated self-seal mailer box" },
    ],
  },
  {
    id: "material",
    label: "Material & Board",
    items: [
      { id: "corrugated", label: "Corrugated board",         boldPrefix: "Material:", text: "Premium corrugated board for strength and durability" },
      { id: "grey15",     label: "Rigid greyboard 1.5 mm",  boldPrefix: "Board:",    text: "Premium 1.5 mm rigid greyboard construction" },
      { id: "grey20",     label: "Rigid greyboard 2–2.5 mm",boldPrefix: "Board:",    text: "Premium 2–2.5 mm rigid greyboard construction" },
      { id: "grey25",     label: "Rigid greyboard 2.5 mm",  boldPrefix: "Board:",    text: "Premium 2.5 mm high-density rigid greyboard construction" },
      { id: "grey30",     label: "Rigid greyboard 3 mm",    boldPrefix: "Board:",    text: "Premium 3 mm rigid greyboard construction" },
      { id: "cardboard",  label: "Premium cardboard",       boldPrefix: "Material:", text: "Premium cardboard construction" },
      { id: "coatedwrap", label: "Coated paper wrapped",    boldPrefix: "Material:", text: "Premium greyboard construction wrapped with high-quality coated art paper" },
    ],
  },
  {
    id: "printing",
    label: "Printing",
    items: [
      { id: "extonly",  label: "Exterior only",          boldPrefix: "Printing:", text: "Full custom printing on exterior surfaces" },
      { id: "both",     label: "Exterior & interior",    boldPrefix: "Printing:", text: "Full custom printing on both exterior and interior surfaces" },
      { id: "cmyk",     label: "CMYK full-color",        boldPrefix: "Printing:", text: "Full-color CMYK printing" },
      { id: "pantone",  label: "Pantone color matched",  boldPrefix: "Printing:", text: "Custom Pantone-matched color printing as per approved artwork" },
      { id: "noprint",  label: "No printing (plain)",    boldPrefix: "Printing:", text: "Plain surfaces without custom artwork or branding" },
    ],
  },
  {
    id: "finish",
    label: "Finish & Lamination",
    items: [
      { id: "matte",     label: "Matte lamination",       boldPrefix: "Finish:", text: "Premium matte lamination for a smooth, elegant appearance" },
      { id: "gloss",     label: "Gloss lamination",       boldPrefix: "Finish:", text: "High-gloss lamination for a vibrant, premium finish" },
      { id: "softtouch", label: "Soft-touch lamination",  boldPrefix: "Finish:", text: "Soft-touch matte lamination for a luxurious tactile feel" },
      { id: "spotuv",    label: "Spot UV coating",        boldPrefix: "Finish:", text: "Spot UV coating on selected design elements" },
    ],
  },
  {
    id: "special",
    label: "Special Finishes",
    items: [
      { id: "goldfoil",   label: "Gold hot foil",               boldPrefix: "Foiling:",    text: "Metallic gold hot foil stamping" },
      { id: "silverfoil", label: "Silver hot foil",             boldPrefix: "Foiling:",    text: "Metallic silver hot foil stamping" },
      { id: "champagne",  label: "Champagne-gold foil",         boldPrefix: "Foiling:",    text: "Precision champagne-gold hot foil stamping as per approved artwork" },
      { id: "emboss",     label: "Raised embossing",            boldPrefix: "Embossing:",  text: "Precision raised embossing" },
      { id: "deboss",     label: "Debossing",                   boldPrefix: "Debossing:",  text: "Precision debossing" },
      { id: "foilemb",    label: "Foil + registered embossing", boldPrefix: "Finish:",     text: "Registered hot foil stamping with precision raised embossing" },
    ],
  },
  {
    id: "closure",
    label: "Closure",
    items: [
      { id: "magnetic",   label: "Concealed magnetic",      boldPrefix: "Closure:", text: "Concealed magnetic closure for a secure and premium presentation" },
      { id: "selflocking",label: "Self-locking (no glue)",  boldPrefix: "Closure:", text: "Self-locking structure requiring no adhesive" },
      { id: "ribbon",     label: "Ribbon pull",             boldPrefix: "Closure:", text: "Ribbon pull for effortless unboxing" },
      { id: "tuckend",    label: "Tuck-end closure",        boldPrefix: "Closure:", text: "Standard tuck-end closure" },
    ],
  },
  {
    id: "insert",
    label: "Insert",
    items: [
      { id: "cardinsert", label: "Cardboard insert",        boldPrefix: "Insert:", text: "Custom black cardboard insert for secure product placement" },
      { id: "evafoam",    label: "EVA foam insert",         boldPrefix: "Insert:", text: "Custom-cut black EVA foam insert for product protection" },
      { id: "velvetfoam", label: "Foam + velvet covering",  boldPrefix: "Insert:", text: "Custom foam insert with premium velvet covering" },
      { id: "pulpinsert", label: "Pulp-molded insert",      boldPrefix: "Insert:", text: "Custom pulp-molded protective insert" },
      { id: "diecut",     label: "Die-cut foam",            boldPrefix: "Insert:", text: "Custom die-cut foam insert tailored to product dimensions" },
    ],
  },
  {
    id: "interior",
    label: "Interior Finish",
    items: [
      { id: "matchint",  label: "Matching interior color",  boldPrefix: "Interior:", text: "Interior color matched to exterior for a cohesive premium look" },
      { id: "blackint",  label: "Matte-black interior",     boldPrefix: "Interior:", text: "Premium matte-black interior lining" },
      { id: "intbrand",  label: "Interior branding",        boldPrefix: "Interior:", text: "Custom interior lid branding as per approved artwork" },
      { id: "whiteint",  label: "Plain white interior",     boldPrefix: "Interior:", text: "Clean white interior finish" },
    ],
  },
  {
    id: "quality",
    label: "Quality & Production",
    items: [
      { id: "qc",         label: "Quality inspection",       boldPrefix: "Quality Control:", text: "Full quality inspection of construction, finishing, and packing before dispatch" },
      { id: "prototype",  label: "Physical prototype",       boldPrefix: "Prototype:",       text: "Physical prototype for client approval before bulk production" },
      { id: "dieline",    label: "Custom dieline provided",  boldPrefix: "Artwork:",         text: "Custom dieline and artwork template provided" },
      { id: "artworkspec",label: "Custom artwork",           boldPrefix: "Artwork:",         text: "Custom artwork and design based on final approved specifications" },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtMoney(amount: number, currency: "PKR" | "USD") {
  if (currency === "USD")
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `PKR ${Math.round(amount).toLocaleString("en-US")}`;
}

// ── Page component ───────────────────────────────────────────────────────────

export default function InvoiceGeneratorPage() {
  // Auto-generated header fields — set on client only to avoid hydration mismatch
  const [invoiceId, setInvoiceId] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [validStr, setValidStr] = useState("");

  useEffect(() => {
    setInvoiceId(`PP-${Math.floor(10000 + Math.random() * 90000)}`);
    setDateStr(fmtDate(new Date()));
    setValidStr(fmtDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  }, []);

  // Client
  const [clientName,  setClientName]  = useState("");
  const [clientEmail, setClientEmail] = useState("");

  // Order
  const [orderTitle, setOrderTitle] = useState("");

  // Custom bullet text fields
  const [sizeText,     setSizeText]     = useState('12" × 9" × 3" inches');
  const [styleText,    setStyleText]    = useState("");
  const [colorText,    setColorText]    = useState("");
  const [brandingText, setBrandingText] = useState("");

  // Checklist — Exterior & interior, Matte lamination, all Quality & Production
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(["both", "matte", "qc", "prototype", "dieline", "artworkspec"]),
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(GROUPS.map((g) => g.id)));

  // Pricing
  const [qtyRaw,   setQtyRaw]   = useState("");
  const [priceRaw, setPriceRaw] = useState("");
  const [currency, setCurrency] = useState<"PKR" | "USD">("USD");

  // Optional page 2 — option / volume pricing
  const [includePage2, setIncludePage2] = useState(false);
  const [optTables, setOptTables] = useState<OptTableDraft[]>(() => [emptyOptTable()]);
  const [volRows, setVolRows] = useState<VolRow[]>(() => [
    emptyVolRow(),
    emptyVolRow(),
  ]);

  function toggleItem(id: string) {
    setChecked((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const qty = useMemo(() => {
    const n = parseInt(qtyRaw, 10);
    return Number.isInteger(n) && n >= 1 ? n : null;
  }, [qtyRaw]);

  const unitPrice = useMemo(() => {
    const n = parseFloat(priceRaw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [priceRaw]);

  const total = qty != null && unitPrice != null ? qty * unitPrice : null;

  // Build ordered bullet list
  const bullets = useMemo((): InvoiceBullet[] => {
    const out: InvoiceBullet[] = [];
    if (styleText.trim())    out.push({ boldPrefix: "Box Style:", text: styleText.trim() });
    if (sizeText.trim())     out.push({ boldPrefix: "Size:",      text: sizeText.trim() });
    if (colorText.trim())    out.push({ boldPrefix: "Exterior:",  text: colorText.trim() });
    if (brandingText.trim()) out.push({ boldPrefix: "Branding:",  text: brandingText.trim() });
    for (const g of GROUPS)
      for (const item of g.items)
        if (checked.has(item.id))
          out.push({ boldPrefix: item.boldPrefix, text: item.text });
    return out;
  }, [styleText, sizeText, colorText, brandingText, checked]);

  const optionTables = useMemo(() => {
    if (!includePage2) return [];
    return optTables
      .map((t) => {
        const rows = t.rows
          .map((r) => t.columns.map((_, i) => (r.cells[i] ?? "").trim()))
          .filter((cells) => cells.some((c) => c.length > 0));
        if (rows.length === 0 || t.columns.length === 0) return null;
        return {
          title: t.title.trim() || "Option Pricing Comparison",
          columns: t.columns.map((c) => c.trim() || "—"),
          rows,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t != null);
  }, [includePage2, optTables]);

  const volumeTiers = useMemo(() => {
    if (!includePage2) return null;
    const rows = volRows
      .map((r) => {
        const q = parseInt(r.qty, 10);
        const p = parseFloat(r.unitPrice);
        if (!Number.isInteger(q) || q < 1 || !Number.isFinite(p) || p < 0) return null;
        return { quantity: q, unitPrice: p };
      })
      .filter((r): r is { quantity: number; unitPrice: number } => r != null);
    if (rows.length === 0) return null;
    return { rows };
  }, [includePage2, volRows]);

  const canDownload = qty != null && unitPrice != null && total != null;

  function updateOptTable(tableId: string, patch: Partial<OptTableDraft>) {
    setOptTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, ...patch } : t)),
    );
  }

  function addOptColumn(tableId: string) {
    setOptTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId || t.columns.length >= 8) return t;
        return {
          ...t,
          columns: [...t.columns, `Column ${t.columns.length + 1}`],
          rows: t.rows.map((r) => ({ ...r, cells: [...r.cells, ""] })),
        };
      }),
    );
  }

  function removeOptColumn(tableId: string, index: number) {
    setOptTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId || t.columns.length <= 1) return t;
        return {
          ...t,
          columns: t.columns.filter((_, i) => i !== index),
          rows: t.rows.map((r) => ({
            ...r,
            cells: r.cells.filter((_, i) => i !== index),
          })),
        };
      }),
    );
  }

  function updateOptColumnTitle(tableId: string, index: number, title: string) {
    setOptTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId) return t;
        const columns = [...t.columns];
        columns[index] = title;
        return { ...t, columns };
      }),
    );
  }

  function updateOptCell(tableId: string, rowId: string, colIndex: number, value: string) {
    setOptTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          rows: t.rows.map((r) => {
            if (r.id !== rowId) return r;
            const cells = [...r.cells];
            cells[colIndex] = value;
            return { ...r, cells };
          }),
        };
      }),
    );
  }

  async function handleDownload() {
    if (!canDownload || total == null || !invoiceId) return;
    await exportInvoicePdf({
      invoiceId,
      date: dateStr,
      validUntil: validStr,
      clientName:  clientName.trim()  || "Client",
      clientEmail: clientEmail.trim(),
      orderTitle:  orderTitle.trim()  || "Custom Packaging Order",
      bullets,
      quantity:    qty!,
      currency,
      unitPrice:   unitPrice!,
      totalAmount: total,
      optionTables: optionTables.length > 0 ? optionTables : null,
      volumeTiers,
    });
  }

  const inputCls =
    "w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pacify-gold focus:ring-1 focus:ring-pacify-gold/30";

  return (
    <div className={clsx("flex flex-col xl:flex-row gap-6", canDownload && "pb-24 xl:pb-0")}>

      {/* ── Left form column ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-5 max-w-3xl">
        <div>
          <h1 className="text-xl font-semibold text-white">Invoice Generator</h1>
          <p className="text-sm text-gray-400 mt-1">
            Build a professional packaging quotation PDF — download and send to your client.
          </p>
        </div>

        {/* Invoice meta */}
        <Card>
          <h2 className="text-sm font-semibold text-white mb-4">Invoice Details</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Quote No.</p>
              <p className="font-mono font-bold text-pacify-gold">{invoiceId || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Date</p>
              <p className="text-white">{dateStr || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Valid Until</p>
              <p className="text-white">{validStr || "—"}</p>
            </div>
          </div>
        </Card>

        {/* Client info */}
        <Card>
          <h2 className="text-sm font-semibold text-white mb-4">Client Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Client Name</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Alex Johnson" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Client Email</label>
              <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
                placeholder="e.g. client@example.com" className={inputCls} />
            </div>
          </div>
        </Card>

        {/* Order title */}
        <Card>
          <h2 className="text-sm font-semibold text-white mb-1.5">Order Title</h2>
          <p className="text-xs text-gray-500 mb-3">Appears as the product name in the quotation table.</p>
          <input type="text" value={orderTitle} onChange={(e) => setOrderTitle(e.target.value)}
            placeholder="e.g. Premium Custom Magnetic Rigid Box" className={inputCls} />
        </Card>

        {/* Custom text bullet fields */}
        <Card>
          <h2 className="text-sm font-semibold text-white mb-1">Custom Description Fields</h2>
          <p className="text-xs text-gray-500 mb-4">Filled fields appear as the first bullets in the PDF.</p>
          <div className="space-y-3">
            {([
              { label: "Box Style",        value: styleText,    set: setStyleText,    prefix: "Box Style:", placeholder: "e.g. Custom self-locking mailer box for beverage takeaway sets" },
              { label: "Size",             value: sizeText,     set: setSizeText,     prefix: "Size:",      placeholder: 'e.g. 12" × 9" × 3" inches' },
              { label: "Exterior / Color", value: colorText,    set: setColorText,    prefix: "Exterior:",  placeholder: "e.g. Pantone Digicel Red premium wrapped finish" },
              { label: "Branding Detail",  value: brandingText, set: setBrandingText, prefix: "Branding:",  placeholder: "e.g. Black packaging with white logo and red dot design" },
            ] as const).map(({ label, value, set, prefix, placeholder }) => (
              <div key={label}>
                <label className="block text-xs mb-1.5">
                  <span className="font-semibold text-pacify-gold/90">{prefix}</span>{" "}
                  <span className="text-gray-400">{label}</span>
                </label>
                <input type="text" value={value} onChange={(e) => set(e.target.value)}
                  placeholder={placeholder} className={inputCls} />
              </div>
            ))}
          </div>
        </Card>

        {/* Description checklist */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Product Description</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {checked.size} item{checked.size !== 1 ? "s" : ""} selected • each becomes a bullet in the PDF
              </p>
            </div>
            {checked.size > 0 && (
              <button type="button" onClick={() => setChecked(new Set())}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-2">
            {GROUPS.map((group) => {
              const isOpen = openGroups.has(group.id);
              const selCount = group.items.filter((i) => checked.has(i.id)).length;
              return (
                <div key={group.id} className="border border-gray-700 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/60 hover:bg-gray-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-medium text-white">{group.label}</span>
                      {selCount > 0 && (
                        <span className="seg-selected inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {selCount}
                        </span>
                      )}
                    </div>
                    <ChevronDownIcon
                      className={clsx("h-4 w-4 text-gray-400 transition-transform duration-200", isOpen && "rotate-180")}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-3 py-3 space-y-1.5 border-t border-gray-700/60">
                      {group.items.map((item) => {
                        const isChecked = checked.has(item.id);
                        return (
                          <label
                            key={item.id}
                            className={clsx(
                              "flex items-start gap-3 cursor-pointer rounded-md px-3 py-2.5 transition-colors select-none",
                              isChecked
                                ? "bg-pacify-forest/30 border border-pacify-gold/20"
                                : "hover:bg-gray-800/40 border border-transparent",
                            )}
                            onClick={() => toggleItem(item.id)}
                          >
                            {/* Custom checkbox */}
                            <div
                              className={clsx(
                                "mt-0.5 h-4 w-4 rounded flex items-center justify-center border transition-colors shrink-0",
                                isChecked
                                  ? "border-pacify-gold bg-pacify-gold"
                                  : "border-gray-600 bg-gray-800",
                              )}
                            >
                              {isChecked && <CheckIcon className="h-2.5 w-2.5 text-pacify-black" strokeWidth={3} />}
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white leading-snug">{item.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                                <span className="text-pacify-gold/70 font-medium">{item.boldPrefix}</span>{" "}
                                {item.text}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Pricing */}
        <Card>
          <h2 className="text-sm font-semibold text-white mb-4">Pricing</h2>
          <div className="space-y-4">
            {/* Currency toggle */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Currency</label>
              <div className="inline-flex rounded-lg border border-gray-700 bg-gray-800/60 p-1 gap-1">
                {(["USD", "PKR"] as const).map((cur) => (
                  <button key={cur} type="button" onClick={() => setCurrency(cur)}
                    className={clsx(
                      "px-5 py-1.5 rounded-md text-sm font-medium transition-colors",
                      currency === cur ? "seg-selected" : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50",
                    )}>
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Total Quantity (units)</label>
                <input type="number" inputMode="numeric" min="1" step="1"
                  value={qtyRaw} onChange={(e) => setQtyRaw(e.target.value)}
                  placeholder="e.g. 500" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Unit Price ({currency})
                </label>
                <input type="number" inputMode="decimal" min="0" step="0.01"
                  value={priceRaw} onChange={(e) => setPriceRaw(e.target.value)}
                  placeholder={currency === "USD" ? "e.g. 3.99" : "e.g. 1200"} className={inputCls} />
              </div>
            </div>

            {total != null && (
              <div className="rounded-lg bg-pacify-forest/20 border border-pacify-gold/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">Total Amount</p>
                    <p className="text-2xl font-bold text-pacify-gold tabular-nums">
                      {fmtMoney(total, currency)}
                    </p>
                    {qty && unitPrice && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {qty.toLocaleString("en-US")} units × {fmtMoney(unitPrice, currency)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">Shipping</p>
                    <p className="text-xl font-semibold text-white">FREE</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Optional page 2 — option / volume pricing */}
        <Card>
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <h2 className="text-sm font-semibold text-white">Option Pricing (Page 2)</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Optional second page — custom comparison table and/or quantity break ladder.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIncludePage2((v) => !v)}
              className={clsx(
                "shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                includePage2 ? "seg-selected" : "bg-gray-800 text-gray-400 border border-gray-700 hover:text-white",
              )}
            >
              {includePage2 ? "Enabled" : "Enable"}
            </button>
          </div>

          {includePage2 && (
            <div className="mt-5 space-y-8">
              {/* ── Volume ladder (first) ─────────────────────────────── */}
              <div>
                <h3 className="text-xs font-semibold text-pacify-gold uppercase tracking-wide">
                  Quantity Break Ladder
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5 mb-3">
                  Simple table: Quantity · Per Unit · TOTAL (auto-calculated)
                </p>

                <div className="space-y-2 max-w-xl">
                  <div className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 text-[10px] uppercase tracking-wide text-gray-500 px-0.5">
                    <span>Quantity</span>
                    <span>Per Unit ({currency})</span>
                    <span>TOTAL</span>
                    <span />
                  </div>
                  {volRows.map((row) => {
                    const q = parseInt(row.qty, 10);
                    const p = parseFloat(row.unitPrice);
                    const rowTotal =
                      Number.isInteger(q) && q >= 1 && Number.isFinite(p) && p >= 0
                        ? q * p
                        : null;
                    return (
                      <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 items-center">
                        <input
                          type="number"
                          min="1"
                          value={row.qty}
                          onChange={(e) =>
                            setVolRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, qty: e.target.value } : r)),
                            )
                          }
                          placeholder="2500"
                          className={inputCls + " !py-1.5 !text-xs"}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.unitPrice}
                          onChange={(e) =>
                            setVolRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, unitPrice: e.target.value } : r,
                              ),
                            )
                          }
                          placeholder="4.63"
                          className={inputCls + " !py-1.5 !text-xs"}
                        />
                        <div className="px-2 py-1.5 text-xs font-semibold text-pacify-gold tabular-nums">
                          {rowTotal != null ? fmtMoney(rowTotal, currency) : "—"}
                        </div>
                        <button
                          type="button"
                          disabled={volRows.length <= 1}
                          onClick={() => setVolRows((prev) => prev.filter((r) => r.id !== row.id))}
                          className="p-1.5 text-gray-600 hover:text-red-400 disabled:opacity-30 transition-colors"
                          title="Remove row"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setVolRows((prev) => [...prev, emptyVolRow()])}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-pacify-gold/80 hover:text-pacify-gold transition-colors"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add quantity break
                </button>
              </div>

              {/* ── Option comparison tables (multiple) ──────────────── */}
              <div className="border-t border-gray-700 pt-6 space-y-6">
                <div>
                  <h3 className="text-xs font-semibold text-pacify-gold uppercase tracking-wide">
                    Option Comparison Tables
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Add as many tables as you need — each with its own title, columns, and rows.
                  </p>
                </div>

                {optTables.map((table, tableIndex) => (
                  <div
                    key={table.id}
                    className="rounded-lg border border-gray-700 bg-gray-900/40 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                          Table title (shown on PDF)
                        </label>
                        <input
                          value={table.title}
                          onChange={(e) => updateOptTable(table.id, { title: e.target.value })}
                          placeholder="e.g. Rigid Box Options"
                          className={inputCls + " !py-2 !text-sm font-semibold"}
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <button
                          type="button"
                          disabled={table.columns.length >= 8}
                          onClick={() => addOptColumn(table.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-gray-700 text-gray-300 hover:text-white hover:border-pacify-gold/40 disabled:opacity-40 transition-colors"
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                          Column
                        </button>
                        <button
                          type="button"
                          disabled={optTables.length <= 1}
                          onClick={() => setOptTables((prev) => prev.filter((t) => t.id !== table.id))}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-400/40 disabled:opacity-30 transition-colors"
                          title="Remove this table"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          Table
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-600">
                      Table {tableIndex + 1} of {optTables.length}
                    </p>

                    <div className="overflow-x-auto -mx-1 px-1">
                      <table className="w-full min-w-[640px] text-xs border-collapse">
                        <thead>
                          <tr>
                            {table.columns.map((col, ci) => (
                              <th key={ci} className="pb-2 pr-2 align-bottom min-w-[110px]">
                                <div className="flex items-center gap-1">
                                  <input
                                    value={col}
                                    onChange={(e) =>
                                      updateOptColumnTitle(table.id, ci, e.target.value)
                                    }
                                    className={inputCls + " !py-1.5 !text-xs font-semibold"}
                                    placeholder={`Column ${ci + 1}`}
                                  />
                                  <button
                                    type="button"
                                    disabled={table.columns.length <= 1}
                                    onClick={() => removeOptColumn(table.id, ci)}
                                    className="p-1 text-gray-600 hover:text-red-400 disabled:opacity-30 shrink-0"
                                    title="Remove column"
                                  >
                                    <TrashIcon className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </th>
                            ))}
                            <th className="w-8 pb-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.map((row) => (
                            <tr key={row.id} className="align-top">
                              {table.columns.map((_, ci) => (
                                <td key={ci} className="pr-2 pb-2">
                                  <input
                                    value={row.cells[ci] ?? ""}
                                    onChange={(e) =>
                                      updateOptCell(table.id, row.id, ci, e.target.value)
                                    }
                                    placeholder="—"
                                    className={inputCls + " !py-1.5 !text-xs"}
                                  />
                                </td>
                              ))}
                              <td className="pb-2 pl-1">
                                <button
                                  type="button"
                                  disabled={table.rows.length <= 1}
                                  onClick={() =>
                                    updateOptTable(table.id, {
                                      rows: table.rows.filter((r) => r.id !== row.id),
                                    })
                                  }
                                  className="p-1.5 text-gray-600 hover:text-red-400 disabled:opacity-30 transition-colors"
                                  title="Remove row"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        updateOptTable(table.id, {
                          rows: [...table.rows, emptyOptRow(table.columns.length)],
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-xs text-pacify-gold/80 hover:text-pacify-gold transition-colors"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      Add row
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setOptTables((prev) => [
                      ...prev,
                      emptyOptTable(`Option Pricing Comparison ${prev.length + 1}`),
                    ])
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-pacify-gold/30 text-pacify-gold hover:bg-pacify-gold/10 transition-colors"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add another option table
                </button>
              </div>

              {(optionTables.length > 0 || volumeTiers) && (
                <p className="text-[11px] text-gray-500 border-t border-gray-700 pt-3">
                  PDF page 2 order:{" "}
                  {volumeTiers && <span className="text-white">quantity ladder</span>}
                  {volumeTiers && optionTables.length > 0 && " → "}
                  {optionTables.length > 0 && (
                    <span className="text-white">
                      {optionTables.length} option table{optionTables.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  . Empty tables are skipped.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── Right sticky panel ────────────────────────────────────────── */}
      <aside className="hidden xl:block w-80 shrink-0 self-stretch">
        <div className="sticky top-6 space-y-4">
          {/* Summary card */}
          <Card className="border-pacify-gold/30 bg-pacify-forest/20">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-9 w-9 rounded-md bg-pacify-forest flex items-center justify-center ring-1 ring-pacify-gold/40 shrink-0">
                <span className="text-pacify-gold text-sm font-bold">P</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Pacify Packaging</p>
                <p className="text-[10px] text-pacify-gold/70 uppercase tracking-wider">Quotation Preview</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Quote No.</span>
                <span className="font-mono font-bold text-pacify-gold">{invoiceId || "—"}</span>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Bill To</p>
                <p className="text-white font-medium truncate">{clientName || "—"}</p>
                {clientEmail && <p className="text-gray-400 text-xs truncate">{clientEmail}</p>}
              </div>

              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Order</p>
                <p className="text-white text-xs leading-snug">{orderTitle || "—"}</p>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Description</p>
                <p className="text-white">{bullets.length} bullet{bullets.length !== 1 ? "s" : ""}</p>
                {bullets.length > 0 && (
                  <ul className="mt-1.5 space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
                    {bullets.map((b, i) => (
                      <li key={i} className="text-[10px] text-gray-400 flex gap-1.5">
                        <span className="text-pacify-gold/70 font-medium shrink-0">{b.boldPrefix}</span>
                        <span className="truncate">{b.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {total != null && qty != null && unitPrice != null && (
                <div className="border-t border-gray-700 pt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Qty</span>
                    <span>{qty.toLocaleString("en-US")}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Unit Price</span>
                    <span>{fmtMoney(unitPrice, currency)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Shipping</span>
                    <span>FREE</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-pacify-gold/20">
                    <span className="text-xs font-medium text-gray-300">Total Due</span>
                    <span className="text-lg font-bold text-pacify-gold tabular-nums">
                      {fmtMoney(total, currency)}
                    </span>
                  </div>
                </div>
              )}

              {includePage2 && (
                <div className="border-t border-gray-700 pt-3 text-xs text-gray-400 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Page 2</p>
                  <p>
                    {volumeTiers
                      ? `${volumeTiers.rows.length} qty break${volumeTiers.rows.length !== 1 ? "s" : ""}`
                      : "No quantity ladder"}
                  </p>
                  <p>
                    {optionTables.length > 0
                      ? `${optionTables.length} option table${optionTables.length !== 1 ? "s" : ""}`
                      : "No option tables"}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Download button */}
          <button
            type="button"
            disabled={!canDownload}
            onClick={handleDownload}
            className={clsx(
              "w-full flex items-center justify-center gap-2.5 rounded-lg py-3.5 text-sm font-semibold transition-colors",
              canDownload
                ? "bg-pacify-gold text-pacify-black hover:bg-pacify-gold/90"
                : "bg-gray-800 text-gray-600 cursor-not-allowed",
            )}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Download PDF Quote
          </button>
          {!canDownload && (
            <p className="text-xs text-gray-600 text-center -mt-2">
              Add quantity and unit price to generate
            </p>
          )}
        </div>
      </aside>

      {/* ── Mobile sticky bottom bar ────────────────────────────────── */}
      <div className="xl:hidden fixed bottom-0 inset-x-0 z-30 border-t border-pacify-gold/20 bg-gray-950/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <div className="flex-1 min-w-0">
            {total != null ? (
              <>
                <p className="text-[10px] uppercase tracking-wide text-pacify-gold/70">Total Due</p>
                <p className="text-base font-bold text-pacify-gold tabular-nums">{fmtMoney(total, currency)}</p>
              </>
            ) : (
              <p className="text-xs text-gray-500">Enter qty + unit price to calculate</p>
            )}
          </div>
          <button
            type="button"
            disabled={!canDownload}
            onClick={handleDownload}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shrink-0",
              canDownload ? "bg-pacify-gold text-pacify-black" : "bg-gray-800 text-gray-600 cursor-not-allowed",
            )}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

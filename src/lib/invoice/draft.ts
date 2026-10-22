/** Serializable form snapshot for Invoice Generator save/load */

export interface InvoiceOptTableDraft {
  title: string;
  columns: string[];
  /** Cell grid — one string[] per row */
  rows: string[][];
}

export interface InvoiceVolRowDraft {
  qty: string;
  unitPrice: string;
}

export interface InvoiceDraftPayload {
  quoteNo: string;
  dateStr: string;
  validStr: string;
  clientName: string;
  clientEmail: string;
  orderTitle: string;
  sizeText: string;
  styleText: string;
  colorText: string;
  brandingText: string;
  checkedIds: string[];
  qtyRaw: string;
  priceRaw: string;
  currency: "PKR" | "USD";
  includePage2: boolean;
  optTables: InvoiceOptTableDraft[];
  volRows: InvoiceVolRowDraft[];
}

export interface InvoiceListItem {
  id: string;
  quoteNo: string;
  clientName: string;
  clientEmail: string;
  orderTitle: string;
  currency: string;
  quantity: number | null;
  unitPrice: number | null;
  totalAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecord extends InvoiceListItem {
  payload: InvoiceDraftPayload;
}

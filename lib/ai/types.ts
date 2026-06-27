// Raw types from parser (Claude's structured output)
export interface RawLine {
  raw: string;
  qty: number;
  sizeAlias?: string;
  brandName?: string;
  position?: "AP" | "DIFF" | "STEERING" | "NONE";
  unitPrice?: number;
  unitCost?: number;
  useStockPrice?: boolean;
}

export interface RawPayment {
  channel: "CASH" | "MPESA" | "DEBT";
  amount?: number;
  isBalance?: boolean;
}

export interface RawTransaction {
  type: "sale" | "purchase";
  date: string; // ISO 8601 date string
  customerName?: string;
  supplierName?: string;
  terms?: "CASH" | "CREDIT" | "FREE";
  lines: RawLine[];
  payments?: RawPayment[];
}

// Resolved draft types (after DB lookups)
export interface DraftSaleLine {
  raw: string;
  variantId?: string;
  variantLabel?: string;
  qty: number;
  unitPrice?: number;
  useStockPrice?: boolean;
  positionAmbiguous?: boolean;
}

export interface DraftPayment {
  channel: "CASH" | "MPESA" | "DEBT";
  amount?: number;
  isBalance?: boolean;
}

export interface DraftSale {
  type: "sale";
  draftId: string;
  date: Date;
  customerName?: string;
  customerId?: string;
  customerAmbiguous?: boolean;
  lines: DraftSaleLine[];
  payments: DraftPayment[];
  lineTotal?: number;
  warnings: string[];
}

export interface DraftPurchaseLine {
  raw: string;
  variantId?: string;
  variantLabel?: string;
  qty: number;
  unitCost?: number;
}

export interface DraftPurchase {
  type: "purchase";
  draftId: string;
  date: Date;
  supplierName?: string;
  supplierId?: string;
  terms?: "CASH" | "CREDIT" | "FREE";
  lines: DraftPurchaseLine[];
  warnings: string[];
}

export type Draft = DraftSale | DraftPurchase;

export interface Gap {
  draftId: string;
  field: string;
  question: string;
}

export interface ParseResult {
  drafts: Draft[];
  gaps: Gap[];
}

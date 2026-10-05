"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { SharePdfButton } from "@/components/SharePdfButton";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(n);

export interface SelectableSale {
  saleId: string;
  customerId: string | null;
  customerName: string | null;
  total: number;
}

interface SelectionCtx {
  isSelected: (saleId: string) => boolean;
  toggle: (sale: SelectableSale) => void;
  /** Why this sale can't be ticked right now, or null if it can. */
  blockedReason: (sale: SelectableSale) => string | null;
}

const Ctx = createContext<SelectionCtx | null>(null);

/** Null outside the sales page (e.g. reports reuse SaleCard), so no checkbox shows. */
export function useBulkInvoiceSelection() {
  return useContext(Ctx);
}

/**
 * Lets the user tick several sales for the same customer and generate one
 * combined invoice PDF for them (customers who settle in bulk).
 */
export function BulkInvoiceSelection({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Map<string, SelectableSale>>(new Map());

  const first = selected.values().next().value as SelectableSale | undefined;
  const lockedCustomerId = first?.customerId ?? null;

  const ctx: SelectionCtx = {
    isSelected: (id) => selected.has(id),
    toggle: (sale) =>
      setSelected((prev) => {
        const next = new Map(prev);
        if (next.has(sale.saleId)) next.delete(sale.saleId);
        else next.set(sale.saleId, sale);
        return next;
      }),
    blockedReason: (sale) => {
      if (selected.has(sale.saleId)) return null;
      if (!sale.customerId) return "Walk-in sales can't be combined — no customer to bill";
      if (lockedCustomerId && sale.customerId !== lockedCustomerId)
        return `Only sales for ${first?.customerName} can be combined with the current selection`;
      return null;
    },
  };

  const sales = [...selected.values()];
  const total = sales.reduce((s, x) => s + x.total, 0);
  const pdfUrl = `/api/pdf/invoice/combined?ids=${sales.map((s) => s.saleId).join(",")}`;
  const slug = (first?.customerName ?? "customer")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const btnCls =
    "bg-[#4B0082] hover:bg-[#3a006b] disabled:opacity-60 text-white font-semibold rounded px-3 py-2 text-sm transition-colors";

  return (
    <Ctx.Provider value={ctx}>
      {children}

      {sales.length > 0 && (
        <div className="sticky bottom-4 z-20 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#EAB308]/60 bg-[#111] px-4 py-3 shadow-xl">
            <div className="text-sm">
              <span className="text-white font-semibold">{first?.customerName}</span>
              <span className="text-zinc-400">
                {" "}
                · {sales.length} sale{sales.length === 1 ? "" : "s"} selected ·{" "}
              </span>
              <span className="font-bold text-[#EAB308]">{fmt(total)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={pdfUrl} target="_blank" className={btnCls}>
                View combined invoice
              </a>
              <a href={`${pdfUrl}&download=1`} className={btnCls}>
                ↓ Download
              </a>
              <SharePdfButton
                url={pdfUrl}
                filename={`invoice-${slug}-combined.pdf`}
                title={`Invoice — ${first?.customerName ?? ""}`}
                className={btnCls}
              />
              <button
                type="button"
                onClick={() => setSelected(new Map())}
                className="text-sm text-zinc-400 hover:text-white px-2"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function SaleSelectCheckbox({ sale }: { sale: SelectableSale }) {
  const ctx = useBulkInvoiceSelection();
  if (!ctx) return null;
  const reason = ctx.blockedReason(sale);
  return (
    <input
      type="checkbox"
      aria-label="Select for combined invoice"
      title={reason ?? "Select for combined invoice"}
      checked={ctx.isSelected(sale.saleId)}
      disabled={!!reason}
      onChange={() => ctx.toggle(sale)}
      className="h-4 w-4 accent-[#EAB308] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
    />
  );
}

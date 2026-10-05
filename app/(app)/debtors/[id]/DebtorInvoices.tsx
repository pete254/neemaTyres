"use client";

import { useState } from "react";
import { SharePdfButton } from "@/components/SharePdfButton";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(n);

export interface DebtorSaleRow {
  saleId: string;
  invoiceNo: string;
  date: string;
  items: string;
  total: number;
  paid: number;
  outstanding: number;
}

const btnCls =
  "bg-[#4B0082] hover:bg-[#3a006b] disabled:opacity-60 text-white font-semibold rounded px-3 py-2 text-sm transition-colors";
const smallBtn =
  "text-xs text-zinc-400 hover:text-white border border-[#2A2A2A] rounded px-2 py-1 transition-colors";

/**
 * A debtor's credit sales with per-sale invoices, or tick several for one
 * combined invoice. Invoices from here show amount paid and balance due.
 */
export function DebtorInvoices({
  customerName,
  rows,
}: {
  customerName: string;
  rows: DebtorSaleRow[];
}) {
  const [showPaid, setShowPaid] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = showPaid ? rows : rows.filter((r) => r.outstanding > 0);
  const unpaidIds = rows.filter((r) => r.outstanding > 0).map((r) => r.saleId);
  const chosen = rows.filter((r) => selected.has(r.saleId));
  const chosenDue = chosen.reduce((s, r) => s + r.outstanding, 0);

  const pdfFor = (ids: string[]) => `/api/pdf/invoice/combined?balance=1&ids=${ids.join(",")}`;
  const slug = customerName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.saleId));

  return (
    <div className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-white">Invoices</h3>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setSelected(new Set(unpaidIds))}
            disabled={unpaidIds.length === 0}
            className="text-[#EAB308] hover:underline disabled:opacity-40"
          >
            Select all unpaid ({unpaidIds.length})
          </button>
          <label className="flex items-center gap-2 text-zinc-400">
            <input
              type="checkbox"
              checked={showPaid}
              onChange={(e) => setShowPaid(e.target.checked)}
              className="accent-[#EAB308]"
            />
            Show paid-off sales
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-zinc-400 text-left">
              <th className="pb-3 pr-3 w-8">
                <input
                  type="checkbox"
                  aria-label="Select all shown"
                  checked={allVisibleSelected}
                  onChange={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      for (const r of visible) {
                        if (allVisibleSelected) next.delete(r.saleId);
                        else next.add(r.saleId);
                      }
                      return next;
                    })
                  }
                  className="accent-[#EAB308]"
                />
              </th>
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Invoice</th>
              <th className="pb-3 pr-4">Items</th>
              <th className="pb-3 pr-4 text-right">Total</th>
              <th className="pb-3 pr-4 text-right">Paid</th>
              <th className="pb-3 pr-4 text-right">Balance</th>
              <th className="pb-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.saleId} className="border-b border-[#1C1C1C] hover:bg-[#111]">
                <td className="py-3 pr-3">
                  <input
                    type="checkbox"
                    aria-label={`Select invoice ${r.invoiceNo}`}
                    checked={selected.has(r.saleId)}
                    onChange={() => toggle(r.saleId)}
                    className="accent-[#EAB308]"
                  />
                </td>
                <td className="py-3 pr-4 text-zinc-400 whitespace-nowrap">
                  {new Date(r.date).toLocaleDateString("en-KE")}
                </td>
                <td className="py-3 pr-4 text-zinc-300 whitespace-nowrap">{r.invoiceNo}</td>
                <td className="py-3 pr-4 text-zinc-400 max-w-xs truncate" title={r.items}>
                  {r.items}
                </td>
                <td className="py-3 pr-4 text-right text-zinc-300">{fmt(r.total)}</td>
                <td className="py-3 pr-4 text-right text-zinc-500">{fmt(r.paid)}</td>
                <td
                  className={`py-3 pr-4 text-right font-semibold ${
                    r.outstanding > 0 ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {fmt(r.outstanding)}
                </td>
                <td className="py-3 text-right whitespace-nowrap">
                  <a href={pdfFor([r.saleId])} target="_blank" className={smallBtn}>
                    Invoice
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="text-center text-zinc-500 py-8">
            {rows.length === 0 ? "No credit sales." : "No unpaid sales."}
          </p>
        )}
      </div>

      {chosen.length > 0 && (
        <div className="sticky bottom-4 z-20 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#EAB308]/60 bg-[#111] px-4 py-3 shadow-xl">
            <div className="text-sm">
              <span className="text-zinc-400">
                {chosen.length} sale{chosen.length === 1 ? "" : "s"} selected · balance due{" "}
              </span>
              <span className="font-bold text-[#EAB308]">{fmt(chosenDue)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={pdfFor([...selected])} target="_blank" className={btnCls}>
                View {chosen.length > 1 ? "combined " : ""}invoice
              </a>
              <a href={`${pdfFor([...selected])}&download=1`} className={btnCls}>
                ↓ Download
              </a>
              <SharePdfButton
                url={pdfFor([...selected])}
                filename={`invoice-${slug}${chosen.length > 1 ? "-combined" : ""}.pdf`}
                title={`Invoice — ${customerName}`}
                className={btnCls}
              />
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-sm text-zinc-400 hover:text-white px-2"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

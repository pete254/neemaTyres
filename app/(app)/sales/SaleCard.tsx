"use client";

import Link from "next/link";
import { useState } from "react";
import { DeleteSaleButton } from "./DeleteSaleButton";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(n);

export interface SaleCardLine {
  variantLabel: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  unitCost: number;
  grossProfit: number;
}

export interface SaleCardData {
  saleId: string;
  customerName: string | null;
  channels: string;
  total: number;
  salesValue: number;
  cogs: number;
  grossProfit: number;
}

function profitColor(profit: number) {
  if (profit > 0) return "text-green-400";
  if (profit < 0) return "text-red-400";
  return "text-zinc-400";
}

export function SaleCard({
  sale,
  lines,
}: {
  sale: SaleCardData;
  lines: SaleCardLine[];
}) {
  const [open, setOpen] = useState(false);
  const marginPct =
    sale.salesValue > 0 ? (sale.grossProfit / sale.salesValue) * 100 : 0;

  return (
    <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-4">
      {/* Sale header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-medium text-white">
            {sale.customerName ?? "Walk-in"}
          </span>
          <span className="ml-2 text-xs text-zinc-500">{sale.channels}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#EAB308]">
            {fmt(sale.total)}
          </span>
          <Link
            href={`/sales/${sale.saleId}/invoice`}
            className="text-xs text-zinc-400 hover:text-white border border-[#2A2A2A] rounded px-2 py-1 transition-colors"
          >
            Invoice
          </Link>
          <Link
            href={`/sales/${sale.saleId}/delivery-note`}
            className="text-xs text-zinc-400 hover:text-white border border-[#2A2A2A] rounded px-2 py-1 transition-colors"
          >
            Delivery
          </Link>
          <Link
            href={`/sales/${sale.saleId}/edit`}
            className="text-xs text-zinc-400 hover:text-white border border-[#2A2A2A] rounded px-2 py-1 transition-colors"
          >
            Edit
          </Link>
          <DeleteSaleButton saleId={sale.saleId} />
        </div>
      </div>

      {/* Profit toggle — click to reveal per-transaction profit */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left mb-2 rounded px-2 py-1.5 bg-[#111] hover:bg-[#161616] border border-[#1E1E1E] transition-colors"
      >
        <span className="text-xs text-zinc-400">
          {open ? "▾ Hide profit" : "▸ Show profit"}
        </span>
        <span className="text-xs">
          <span className="text-zinc-500">Profit </span>
          <span className={`font-semibold ${profitColor(sale.grossProfit)}`}>
            {fmt(sale.grossProfit)}
          </span>
          <span className="text-zinc-600"> · {marginPct.toFixed(1)}%</span>
        </span>
      </button>

      {/* Lines */}
      <table className="w-full text-sm">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="border-t border-[#1C1C1C]">
              <td className="py-1.5 pr-4 text-zinc-300">{line.variantLabel}</td>
              <td className="py-1.5 pr-4 text-right text-zinc-500">×{line.qty}</td>
              <td className="py-1.5 pr-4 text-right text-zinc-400">
                {fmt(line.unitPrice)}
              </td>
              {open && (
                <>
                  <td className="py-1.5 pr-4 text-right text-zinc-500">
                    {fmt(line.unitCost)}
                  </td>
                  <td
                    className={`py-1.5 pr-4 text-right font-medium ${profitColor(
                      line.grossProfit
                    )}`}
                  >
                    {fmt(line.grossProfit)}
                  </td>
                </>
              )}
              <td className="py-1.5 text-right text-zinc-200 font-medium">
                {fmt(line.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
        {open && (
          <tfoot>
            <tr className="border-t border-[#2A2A2A] text-xs">
              <td className="pt-2 text-zinc-500" colSpan={3}>
                Cost of goods {fmt(sale.cogs)} · Sales value {fmt(sale.salesValue)}
              </td>
              <td className="pt-2 pr-4 text-right text-zinc-500" colSpan={2}>
                Gross profit
              </td>
              <td
                className={`pt-2 text-right font-bold ${profitColor(
                  sale.grossProfit
                )}`}
              >
                {fmt(sale.grossProfit)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

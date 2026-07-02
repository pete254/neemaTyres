"use client";

import { useRef, useState, useTransition } from "react";
import { createQuotation } from "@/lib/actions/quotation";

interface Customer { id: string; name: string; }
interface Line { description: string; qty: string; unitPrice: string; }

const inputClass = "w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]";

function today() { return new Date().toISOString().slice(0, 10); }

export default function QuotationForm({ customers }: { customers: Customer[] }) {
  const [lines, setLines] = useState<Line[]>([{ description: "", qty: "1", unitPrice: "" }]);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function addLine() {
    setLines((l) => [...l, { description: "", qty: "1", unitPrice: "" }]);
  }
  function removeLine(i: number) {
    setLines((l) => l.filter((_, idx) => idx !== i));
  }
  function updateLine(i: number, field: keyof Line, value: string) {
    setLines((l) => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line));
  }

  const total = lines.reduce((sum, l) => {
    const qty = parseFloat(l.qty) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.set("lines", JSON.stringify(lines));
    startTransition(async () => { await createQuotation(fd); });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Meta */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Date</label>
          <input name="date" type="date" required defaultValue={today()} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Valid for (days)</label>
          <input name="validDays" type="number" defaultValue="14" min="1" className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-zinc-300 mb-1">Customer (optional)</label>
          <select name="customerId" className={inputClass}>
            <option value="">Walk-in / Ad-hoc</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Items</p>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs text-zinc-500 px-1">
            <span className="col-span-6">Description</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-3 text-right">Unit Price (KES)</span>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input
                placeholder={`Item ${i + 1} description`}
                value={line.description}
                onChange={(e) => updateLine(i, "description", e.target.value)}
                required
                className="col-span-6 bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
              />
              <input
                type="number" min="1" step="1"
                value={line.qty}
                onChange={(e) => updateLine(i, "qty", e.target.value)}
                required
                className="col-span-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-[#EAB308]"
              />
              <input
                type="number" min="0" step="0.01"
                placeholder="0.00"
                value={line.unitPrice}
                onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
                required
                className="col-span-3 bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm text-right focus:outline-none focus:border-[#EAB308]"
              />
              <button
                type="button"
                onClick={() => removeLine(i)}
                disabled={lines.length === 1}
                className="col-span-1 text-red-500 hover:text-red-300 disabled:opacity-20 text-lg font-bold text-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addLine}
          className="mt-3 text-sm text-[#EAB308] hover:text-[#CA8A04] border border-[#2A2A2A] rounded px-3 py-1.5"
        >
          + Add line
        </button>
      </div>

      {/* Total preview */}
      <div className="flex justify-end">
        <div className="text-right">
          <p className="text-xs text-zinc-500">Total</p>
          <p className="text-xl font-bold text-[#EAB308]">
            KES {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="block text-sm text-zinc-300 mb-1">Note (optional)</label>
        <textarea name="note" rows={2} className={inputClass} placeholder="Additional notes..." />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-[#EAB308] hover:bg-[#CA8A04] disabled:opacity-50 text-black font-semibold rounded px-6 py-2.5 text-sm transition-colors"
      >
        {isPending ? "Creating..." : "Create Quotation & Print"}
      </button>
    </form>
  );
}

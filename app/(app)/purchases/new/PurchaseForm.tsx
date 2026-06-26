"use client";

import { useState, useTransition } from "react";
import { createPurchase } from "@/lib/actions/purchase";

interface Variant {
  id: string;
  sizeCanonical: string;
  patternCode: string | null;
  wacCost: string;
  qtyOnHand: number;
  brand: { name: string };
}

interface Supplier {
  id: string;
  name: string;
}

interface PurchaseLine {
  variantId: string;
  qty: string;
  unitCost: string;
}

const inputClass =
  "bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(n);

function computeWacPreview(
  currentQty: number,
  currentWac: number,
  addQty: number,
  unitCost: number
): number {
  const totalQty = currentQty + addQty;
  if (totalQty <= 0) return unitCost;
  return (currentQty * currentWac + addQty * unitCost) / totalQty;
}

export default function PurchaseForm({
  variants,
  suppliers,
}: {
  variants: Variant[];
  suppliers: Supplier[];
}) {
  const [lines, setLines] = useState<PurchaseLine[]>([
    { variantId: "", qty: "1", unitCost: "" },
  ]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierId, setSupplierId] = useState("");
  const [terms, setTerms] = useState<"CASH" | "CREDIT" | "FREE">("CASH");
  const [isPending, startTransition] = useTransition();

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { variantId: "", qty: "1", unitCost: "" },
    ]);

  const removeLine = (i: number) =>
    setLines((prev) => prev.filter((_, idx) => idx !== i));

  const updateLine = (
    i: number,
    field: keyof PurchaseLine,
    value: string
  ) =>
    setLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l))
    );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("date", date);
    fd.append("supplierId", supplierId);
    fd.append("terms", terms);
    fd.append("lines", JSON.stringify(lines));
    startTransition(async () => {
      await createPurchase(fd);
    });
  };

  const total = lines.reduce((sum, l) => {
    return sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unitCost) || 0);
  }, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-300 mb-1">
            Supplier (optional)
          </label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={inputClass + " w-full"}
          >
            <option value="">No supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Terms</label>
          <select
            value={terms}
            onChange={(e) => setTerms(e.target.value as typeof terms)}
            className={inputClass + " w-full"}
          >
            <option value="CASH">Cash</option>
            <option value="CREDIT">Credit</option>
            <option value="FREE">Free</option>
          </select>
        </div>
      </div>

      {/* Lines */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-300">Items</h3>
          <button
            type="button"
            onClick={addLine}
            className="text-xs text-[#EAB308] hover:underline"
          >
            + Add line
          </button>
        </div>
        <div className="space-y-3">
          {lines.map((line, i) => {
            const v = variants.find((x) => x.id === line.variantId);
            const currentWac = v ? parseFloat(v.wacCost) : 0;
            const currentQty = v ? v.qtyOnHand : 0;
            const addQty = parseFloat(line.qty) || 0;
            const cost = parseFloat(line.unitCost) || 0;
            const newWac =
              v && addQty > 0 && cost > 0
                ? computeWacPreview(currentQty, currentWac, addQty, cost)
                : null;
            const lineAmt = addQty * cost;
            return (
              <div key={i} className="space-y-1">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select
                      value={line.variantId}
                      onChange={(e) =>
                        updateLine(i, "variantId", e.target.value)
                      }
                      required
                      className={inputClass + " w-full"}
                    >
                      <option value="">Select tyre...</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.sizeCanonical} — {v.brand.name}
                          {v.patternCode ? ` (${v.patternCode})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={line.qty}
                      onChange={(e) => updateLine(i, "qty", e.target.value)}
                      placeholder="Qty"
                      required
                      className={inputClass + " w-full"}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitCost}
                      onChange={(e) =>
                        updateLine(i, "unitCost", e.target.value)
                      }
                      placeholder="Cost"
                      required={terms !== "FREE"}
                      className={inputClass + " w-full"}
                    />
                  </div>
                  <div className="col-span-2 text-right text-sm text-zinc-400">
                    {lineAmt > 0 ? fmt(lineAmt) : "-"}
                  </div>
                  <div className="col-span-1 text-center">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        className="text-zinc-600 hover:text-red-400 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {v && newWac !== null && (
                  <p className="text-xs text-zinc-500 pl-1">
                    WAC: {fmt(currentWac)} → {fmt(newWac)} (qty:{" "}
                    {currentQty} → {currentQty + addQty})
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-right text-sm font-semibold text-white">
          Total: {fmt(total)}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending || lines.some((l) => !l.variantId)}
        className="bg-[#EAB308] hover:bg-[#CA8A04] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded px-6 py-2.5 transition-colors"
      >
        {isPending ? "Saving..." : "Record Purchase"}
      </button>
    </form>
  );
}

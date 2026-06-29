"use client";

import { useState, useTransition } from "react";
import { createSale } from "@/lib/actions/sale";

interface Variant {
  id: string;
  sizeCanonical: string;
  patternCode: string | null;
  wacCost: unknown; // Decimal from Prisma (serialised as string)
  referenceSellPrice: unknown | null;
  brand: { name: string };
}

interface Customer {
  id: string;
  name: string;
}

interface SaleLine {
  variantId: string;
  qty: string;
  unitPrice: string;
}

interface SalePayment {
  channel: "CASH" | "MPESA" | "DEBT";
  amount: string;
}

const inputClass =
  "bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(n);

export default function SaleForm({
  variants,
  customers,
}: {
  variants: Variant[];
  customers: Customer[];
}) {
  const [lines, setLines] = useState<SaleLine[]>([
    { variantId: "", qty: "1", unitPrice: "" },
  ]);
  const [payments, setPayments] = useState<SalePayment[]>([
    { channel: "CASH", amount: "" },
  ]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const lineTotal = lines.reduce((sum, l) => {
    const q = parseFloat(l.qty) || 0;
    const p = parseFloat(l.unitPrice) || 0;
    return sum + q * p;
  }, 0);

  const paymentTotal = payments.reduce((sum, p) => {
    return sum + (parseFloat(p.amount) || 0);
  }, 0);

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { variantId: "", qty: "1", unitPrice: "" },
    ]);

  const removeLine = (i: number) =>
    setLines((prev) => prev.filter((_, idx) => idx !== i));

  const updateLine = (i: number, field: keyof SaleLine, value: string) =>
    setLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l))
    );

  const addPayment = () =>
    setPayments((prev) => [...prev, { channel: "CASH", amount: "" }]);

  const removePayment = (i: number) =>
    setPayments((prev) => prev.filter((_, idx) => idx !== i));

  const updatePayment = (
    i: number,
    field: keyof SalePayment,
    value: string
  ) =>
    setPayments((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p))
    );

  const getWac = (variantId: string) => {
    const v = variants.find((x) => x.id === variantId);
    return v ? parseFloat(String(v.wacCost)) : 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("date", date);
    fd.append("customerId", customerId);
    fd.append("lines", JSON.stringify(lines));
    fd.append("payments", JSON.stringify(payments));
    startTransition(async () => {
      await createSale(fd);
    });
  };

  const balanced = Math.abs(lineTotal - paymentTotal) < 0.01;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Header fields */}
      <div className="grid grid-cols-2 gap-4">
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
            Customer (optional)
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className={inputClass + " w-full"}
          >
            <option value="">Walk-in</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
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
        <div className="space-y-2">
          {lines.map((line, i) => {
            const wac = getWac(line.variantId);
            const price = parseFloat(line.unitPrice) || 0;
            const anomaly = wac > 0 && price > 0 && price > 2 * wac;
            const lineAmt = (parseFloat(line.qty) || 0) * price;
            return (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
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
                    value={line.unitPrice}
                    onChange={(e) =>
                      updateLine(i, "unitPrice", e.target.value)
                    }
                    placeholder="Price"
                    required
                    className={
                      inputClass +
                      " w-full " +
                      (anomaly ? "border-orange-500" : "")
                    }
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
                {anomaly && (
                  <div className="col-span-12 -mt-1">
                    <p className="text-xs text-orange-400">
                      PRICE_ANOMALY: price {fmt(price)} is more than 2× WAC{" "}
                      {fmt(wac)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-right text-sm font-semibold text-white">
          Total: {fmt(lineTotal)}
        </div>
      </div>

      {/* Payments */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">Payment</h3>
            <p className="text-xs text-zinc-500">
              Split across multiple methods if needed
            </p>
          </div>
          <button
            type="button"
            onClick={addPayment}
            className="text-xs text-[#EAB308] hover:underline"
          >
            + Add method
          </button>
        </div>
        <div className="space-y-2">
          {payments.map((pmt, i) => {
            const allocatedBefore = payments
              .slice(0, i)
              .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
            const remaining = lineTotal - allocatedBefore;
            const showHint = remaining > 0.01 && !pmt.amount && lineTotal > 0;

            return (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <select
                    value={pmt.channel}
                    onChange={(e) =>
                      updatePayment(
                        i,
                        "channel",
                        e.target.value as SalePayment["channel"]
                      )
                    }
                    className={inputClass + " w-full"}
                  >
                    <option value="CASH">Cash</option>
                    <option value="MPESA">M-Pesa</option>
                    <option value="DEBT">Debt</option>
                  </select>
                </div>
                <div className="col-span-6 relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pmt.amount}
                    onChange={(e) =>
                      updatePayment(i, "amount", e.target.value)
                    }
                    placeholder={
                      showHint ? `${remaining.toFixed(2)}` : "Amount"
                    }
                    required
                    className={inputClass + " w-full pr-20"}
                  />
                  {showHint && (
                    <button
                      type="button"
                      onClick={() =>
                        updatePayment(i, "amount", remaining.toFixed(2))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-[#EAB308] transition-colors whitespace-nowrap"
                      title="Fill remaining"
                    >
                      Fill {fmt(remaining)}
                    </button>
                  )}
                </div>
                <div className="col-span-2 text-center">
                  {payments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePayment(i)}
                      className="text-zinc-600 hover:text-red-400 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Balance status */}
        <div className="mt-3 flex items-center justify-between text-sm">
          {!balanced && lineTotal > 0 && (
            <span className="text-zinc-500 text-xs">
              {paymentTotal < lineTotal
                ? `Unallocated: ${fmt(lineTotal - paymentTotal)}`
                : `Over by: ${fmt(paymentTotal - lineTotal)}`}
            </span>
          )}
          <span
            className={`ml-auto font-medium ${balanced ? "text-green-400" : "text-orange-400"}`}
          >
            {fmt(paymentTotal)} / {fmt(lineTotal)}
          </span>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || !balanced || lines.some((l) => !l.variantId)}
        className="bg-[#EAB308] hover:bg-[#CA8A04] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded px-6 py-2.5 transition-colors"
      >
        {isPending ? "Saving..." : "Record Sale"}
      </button>
    </form>
  );
}

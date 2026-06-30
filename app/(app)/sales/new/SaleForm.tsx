"use client";

import { useState, useTransition } from "react";
import { createSale } from "@/lib/actions/sale";

interface Variant {
  id: string;
  sizeBucket: string;
  sizeCanonical: string;
  qtyOnHand: number;
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
  bucket: string;
  variantId: string;
  qty: string;
  unitPrice: string;
}

interface SalePayment {
  channel: "CASH" | "MPESA" | "DEBT";
  amount: string;
}

const BUCKET_ORDER = ["22.5", "20", "19.5", "17.5", "16", "15", "14", "13"];

const inputClass =
  "bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(n);

export default function SaleForm({
  variants,
  customers,
}: {
  variants: Variant[];
  customers: Customer[];
}) {
  const [lines, setLines] = useState<SaleLine[]>([
    { bucket: "", variantId: "", qty: "1", unitPrice: "" },
  ]);
  const [payments, setPayments] = useState<SalePayment[]>([
    { channel: "CASH", amount: "" },
  ]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState("");
  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  // Distinct buckets that have at least one in-stock variant
  const availableBuckets = BUCKET_ORDER.filter((b) =>
    variants.some((v) => v.sizeBucket === b && v.qtyOnHand > 0)
  );

  const inStockForBucket = (bucket: string) =>
    variants.filter((v) => v.sizeBucket === bucket && v.qtyOnHand > 0);

  const getVariant = (variantId: string) =>
    variants.find((v) => v.id === variantId);

  const lineTotal = lines.reduce((sum, l) => {
    return sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0);
  }, 0);

  const paymentTotal = payments.reduce(
    (sum, p) => sum + (parseFloat(p.amount) || 0),
    0
  );

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { bucket: "", variantId: "", qty: "1", unitPrice: "" },
    ]);

  const removeLine = (i: number) =>
    setLines((prev) => prev.filter((_, idx) => idx !== i));

  const updateLine = (i: number, patch: Partial<SaleLine>) =>
    setLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l))
    );

  const addPayment = () =>
    setPayments((prev) => [...prev, { channel: "CASH", amount: "" }]);

  const removePayment = (i: number) =>
    setPayments((prev) => prev.filter((_, idx) => idx !== i));

  const updatePayment = (i: number, field: keyof SalePayment, value: string) =>
    setPayments((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p))
    );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("date", date);
    fd.append("customerId", customerId);
    if (!customerId && walkinName.trim()) {
      fd.append("walkinName", walkinName.trim());
      fd.append("walkinPhone", walkinPhone.trim());
    }
    fd.append(
      "lines",
      JSON.stringify(lines.map(({ bucket: _b, ...rest }) => rest))
    );
    fd.append("payments", JSON.stringify(payments));
    startTransition(async () => {
      await createSale(fd);
    });
  };

  const balanced = Math.abs(lineTotal - paymentTotal) < 0.01;
  const anyOverStock = lines.some((l) => {
    const v = getVariant(l.variantId);
    return v && (parseInt(l.qty) || 0) > v.qtyOnHand;
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Header */}
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
            onChange={(e) => {
              setCustomerId(e.target.value);
              setWalkinName("");
              setWalkinPhone("");
            }}
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

      {/* Walk-in name capture */}
      {!customerId && (
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-2">
            Record this walk-in customer? (optional — useful for tracking)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Name</label>
              <input
                type="text"
                value={walkinName}
                onChange={(e) => setWalkinName(e.target.value)}
                placeholder="e.g. John Kamau"
                className={inputClass + " w-full"}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Phone (optional)
              </label>
              <input
                type="tel"
                value={walkinPhone}
                onChange={(e) => setWalkinPhone(e.target.value)}
                placeholder="e.g. 0712 345 678"
                className={inputClass + " w-full"}
              />
            </div>
          </div>
        </div>
      )}

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
            const v = getVariant(line.variantId);
            const wac = v ? parseFloat(String(v.wacCost)) : 0;
            const refPrice = v?.referenceSellPrice
              ? parseFloat(String(v.referenceSellPrice))
              : null;
            const price = parseFloat(line.unitPrice) || 0;
            const delta = refPrice !== null && price > 0 ? price - refPrice : null;
            const qtyNum = parseInt(line.qty) || 0;
            const maxQty = v?.qtyOnHand ?? 0;
            const overStock = !!v && qtyNum > maxQty;
            const anomaly = wac > 0 && price > 0 && price > 2 * wac;
            const lineAmt = qtyNum * price;
            const bucketVariants = inStockForBucket(line.bucket);

            return (
              <div
                key={i}
                className="bg-[#111] border border-[#2A2A2A] rounded-lg p-3 space-y-2"
              >
                {/* Row 1: Size bucket → Tyre picker */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  {/* Size bucket */}
                  <div className="col-span-3">
                    <select
                      value={line.bucket}
                      onChange={(e) =>
                        updateLine(i, { bucket: e.target.value, variantId: "" })
                      }
                      required
                      className={inputClass + " w-full"}
                    >
                      <option value="">Size...</option>
                      {availableBuckets.map((b) => (
                        <option key={b} value={b}>
                          {b}"
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tyre */}
                  <div className="col-span-8">
                    <select
                      value={line.variantId}
                      onChange={(e) =>
                        updateLine(i, { variantId: e.target.value })
                      }
                      required
                      disabled={!line.bucket}
                      className={
                        inputClass +
                        " w-full " +
                        (!line.bucket ? "opacity-40 cursor-not-allowed" : "")
                      }
                    >
                      <option value="">
                        {line.bucket
                          ? "Select tyre..."
                          : "— pick a size first —"}
                      </option>
                      {bucketVariants.map((bv) => (
                        <option key={bv.id} value={bv.id}>
                          {bv.sizeCanonical} — {bv.brand.name}
                          {bv.patternCode ? ` (${bv.patternCode})` : ""} ·{" "}
                          {bv.qtyOnHand} in stock
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remove */}
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

                {/* Row 2: Qty → Price → Sell ref delta → Line total */}
                <div className="grid grid-cols-12 gap-2 items-start">
                  {/* Qty */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      max={maxQty > 0 ? maxQty : undefined}
                      value={line.qty}
                      onChange={(e) => updateLine(i, { qty: e.target.value })}
                      placeholder="Qty"
                      required
                      className={
                        inputClass +
                        " w-full " +
                        (overStock ? "border-red-500" : "")
                      }
                    />
                    {v && (
                      <p
                        className={`text-xs mt-0.5 ${
                          overStock ? "text-red-400" : "text-zinc-500"
                        }`}
                      >
                        {overStock
                          ? `Only ${maxQty} in stock`
                          : `${maxQty} in stock`}
                      </p>
                    )}
                  </div>

                  {/* Selling price */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) =>
                        updateLine(i, { unitPrice: e.target.value })
                      }
                      placeholder="Selling price"
                      required
                      className={
                        inputClass +
                        " w-full " +
                        (anomaly ? "border-orange-500" : "")
                      }
                    />
                  </div>

                  {/* Sell ref + delta */}
                  <div className="col-span-4 pt-2 pl-1">
                    {refPrice !== null ? (
                      <div className="text-xs leading-5">
                        <span className="text-zinc-500">
                          Sell ref {fmt(refPrice)}
                        </span>
                        {delta !== null && (
                          <span
                            className={
                              delta > 0
                                ? "text-green-400"
                                : delta < 0
                                ? "text-red-400"
                                : "text-zinc-500"
                            }
                          >
                            {" · "}
                            {delta > 0 ? "+" : ""}
                            {fmt(delta)}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Line total */}
                  <div className="col-span-3 pt-2 text-right text-sm text-zinc-300 font-medium">
                    {lineAmt > 0 ? fmt(lineAmt) : "—"}
                  </div>
                </div>

                {/* Warnings */}
                {anomaly && (
                  <p className="text-xs text-orange-400">
                    PRICE_ANOMALY: {fmt(price)} is more than 2× WAC {fmt(wac)}
                  </p>
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
                    onChange={(e) => updatePayment(i, "amount", e.target.value)}
                    placeholder={showHint ? `${remaining.toFixed(2)}` : "Amount"}
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

      {anyOverStock && (
        <p className="text-sm text-red-400">
          One or more lines exceed available stock. Adjust quantities before saving.
        </p>
      )}

      <button
        type="submit"
        disabled={
          isPending ||
          !balanced ||
          anyOverStock ||
          lines.some((l) => !l.variantId)
        }
        className="bg-[#EAB308] hover:bg-[#CA8A04] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded px-6 py-2.5 transition-colors"
      >
        {isPending ? "Saving..." : "Record Sale"}
      </button>
    </form>
  );
}

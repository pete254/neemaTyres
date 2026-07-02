"use client";

import { useState, useTransition } from "react";

interface Debtor {
  id: string;
  name: string;
  outstanding: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(n);

const inputClass =
  "w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]";

export default function DebtCollectionForm({
  debtors,
  preselectedId,
  action,
}: {
  debtors: Debtor[];
  preselectedId: string | null;
  action: (fd: FormData) => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [customerId, setCustomerId] = useState(preselectedId ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [isPending, startTransition] = useTransition();

  const selected = debtors.find((d) => d.id === customerId);
  const outstanding = selected ? parseFloat(selected.outstanding) : 0;

  const shiftDate = (d: string, days: number) => {
    const dt = new Date(d + "T12:00:00");
    dt.setDate(dt.getDate() + days);
    const shifted = dt.toISOString().slice(0, 10);
    return shifted <= today ? shifted : today;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("date", date);
    fd.set("amount", amount);
    startTransition(async () => { await action(fd); });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm text-zinc-300 mb-1">Customer</label>
        <select
          name="customerId"
          required
          value={customerId}
          onChange={(e) => { setCustomerId(e.target.value); setAmount(""); }}
          className={inputClass}
        >
          <option value="">Select customer...</option>
          {debtors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — owes {fmt(parseFloat(d.outstanding))}
            </option>
          ))}
        </select>
        {selected && (
          <div className="mt-2 bg-red-900/30 border border-red-800 rounded px-3 py-2">
            <p className="text-xs text-red-400">Outstanding balance</p>
            <p className="text-lg font-bold text-red-400">{fmt(outstanding)}</p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-1">Amount Received</label>
        <input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Tab" && !amount && selected) {
              e.preventDefault();
              setAmount(outstanding.toFixed(2));
            }
          }}
          placeholder={selected ? `${outstanding.toFixed(2)} (tab to fill)` : "0.00"}
          max={selected ? selected.outstanding : undefined}
          className={inputClass}
        />
        {selected && (
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-zinc-500">Max: {fmt(outstanding)}</p>
            {!amount && (
              <button type="button" onClick={() => setAmount(outstanding.toFixed(2))}
                className="text-xs text-zinc-500 hover:text-[#EAB308] transition-colors">
                Fill full amount
              </button>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-1">Channel</label>
        <select name="channel" required className={inputClass}>
          <option value="CASH">Cash</option>
          <option value="MPESA">M-Pesa</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-1">Date</label>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setDate(shiftDate(date, -1))}
            className="px-2 py-2 text-zinc-400 hover:text-white bg-[#1C1C1C] border border-[#2A2A2A] rounded text-sm">‹</button>
          <input
            name="date"
            type="date"
            required
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
          <button type="button" onClick={() => setDate(shiftDate(date, 1))}
            disabled={date >= today}
            className="px-2 py-2 text-zinc-400 hover:text-white bg-[#1C1C1C] border border-[#2A2A2A] rounded text-sm disabled:opacity-30">›</button>
        </div>
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-1">Note (optional)</label>
        <textarea name="note" rows={2} className={inputClass} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-[#EAB308] hover:bg-[#CA8A04] disabled:opacity-50 text-black font-semibold rounded px-6 py-2.5 text-sm transition-colors"
      >
        {isPending ? "Saving..." : "Record Collection"}
      </button>
    </form>
  );
}

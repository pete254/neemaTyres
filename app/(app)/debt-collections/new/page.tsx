import { getCustomers } from "@/lib/queries";
import { createDebtCollection } from "@/lib/actions/debtCollection";

interface PageProps {
  searchParams: Promise<{ success?: string }>;
}

export default async function NewDebtCollectionPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const customers = await getCustomers();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4">
        Record Debt Collection
      </h2>

      {/* Warning banner */}
      <div className="mb-6 bg-yellow-900/30 border border-yellow-600 text-yellow-300 rounded-lg px-4 py-3 text-sm font-medium">
        This records money received against an existing debt — it does NOT
        increase revenue.
      </div>

      {params.success === "1" && (
        <div className="mb-4 bg-green-900/30 border border-green-700 text-green-300 rounded px-4 py-2 text-sm">
          Debt collection recorded successfully.
        </div>
      )}

      <form action={createDebtCollection} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Customer</label>
          <select
            name="customerId"
            required
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          >
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Amount</label>
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="0.00"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Channel</label>
          <select
            name="channel"
            required
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          >
            <option value="CASH">Cash</option>
            <option value="MPESA">M-Pesa</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Date</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">
            Note (optional)
          </label>
          <textarea
            name="note"
            rows={2}
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>

        <button
          type="submit"
          className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-6 py-2.5 text-sm transition-colors"
        >
          Record Collection
        </button>
      </form>
    </div>
  );
}

import { getSuppliers } from "@/lib/queries";
import { createSupplierPayment } from "@/lib/actions/supplierPayment";

interface PageProps {
  searchParams: Promise<{ success?: string }>;
}

export default async function NewSupplierPaymentPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const suppliers = await getSuppliers();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">
        Record Supplier Payment
      </h2>

      {params.success === "1" && (
        <div className="mb-4 bg-green-900/30 border border-green-700 text-green-300 rounded px-4 py-2 text-sm">
          Supplier payment recorded successfully.
        </div>
      )}

      <form action={createSupplierPayment} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Supplier</label>
          <select
            name="supplierId"
            required
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          >
            <option value="">Select supplier...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
          Record Payment
        </button>
      </form>
    </div>
  );
}

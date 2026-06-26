import { getVariants } from "@/lib/queries";
import { createReturn } from "@/lib/actions/return";

interface PageProps {
  searchParams: Promise<{ success?: string }>;
}

export default async function NewReturnPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const variants = await getVariants();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">
        Process Return
      </h2>

      {params.success === "1" && (
        <div className="mb-4 bg-green-900/30 border border-green-700 text-green-300 rounded px-4 py-2 text-sm">
          Return recorded successfully.
        </div>
      )}

      <form action={createReturn} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Type</label>
          <select
            name="type"
            required
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          >
            <option value="SALE_RETURN">Sale Return (customer returns tyre)</option>
            <option value="PURCHASE_RETURN">Purchase Return (return to supplier)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Tyre</label>
          <select
            name="variantId"
            required
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
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

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Quantity</label>
          <input
            name="qty"
            type="number"
            min="1"
            required
            defaultValue="1"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">
            Unit Value (KES)
          </label>
          <input
            name="unitValue"
            type="number"
            min="0"
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
            Original Sale Line ID (optional)
          </label>
          <input
            name="originalSaleLineId"
            type="text"
            placeholder="Leave blank if unknown"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">
            Original Purchase Line ID (optional)
          </label>
          <input
            name="originalPurchaseLineId"
            type="text"
            placeholder="Leave blank if unknown"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
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
          Record Return
        </button>
      </form>
    </div>
  );
}

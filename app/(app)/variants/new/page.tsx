import { createVariant } from "@/lib/actions/variant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function NewVariantPage() {
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="p-6 max-w-lg">
      <Link href="/inventory" className="text-sm text-zinc-400 hover:text-white mb-4 inline-block">
        ← Inventory
      </Link>
      <h2 className="text-2xl font-bold text-white mb-6">Add Tyre Type</h2>

      <form action={createVariant} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Brand Name</label>
          <input
            name="brandName"
            required
            list="brand-list"
            placeholder="e.g. Grandstone"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
          <datalist id="brand-list">
            {brands.map((b) => <option key={b.id} value={b.name} />)}
          </datalist>
          <p className="text-xs text-zinc-500 mt-1">Pick existing or type a new brand name</p>
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Name</label>
          <input
            name="sizeCanonical"
            required
            placeholder="e.g. 315/80R22.5 or 11R22.5"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
          <p className="text-xs text-zinc-500 mt-1">Full tyre size — rim size is auto-derived from this</p>
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Position</label>
          <select
            name="position"
            required
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          >
            <option value="AP">AP (All Position)</option>
            <option value="DIFF">DIFF (Drive/Diff)</option>
            <option value="STEERING">STEERING</option>
            <option value="NONE">NONE</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Sub Label <span className="text-zinc-500">(optional)</span></label>
          <input
            name="subLabel"
            placeholder="e.g. Drive, Trailer"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Pattern Code <span className="text-zinc-500">(optional)</span></label>
          <input
            name="patternCode"
            placeholder="e.g. MA668"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Reference Sell Price (KES) <span className="text-zinc-500">(optional)</span></label>
          <input
            name="referenceSellPrice"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded py-2.5 text-sm transition-colors mt-2"
        >
          Add Tyre Type
        </button>
      </form>
    </div>
  );
}

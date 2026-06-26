import { getInventory } from "@/lib/queries";
import Decimal from "decimal.js";

const fmt = (n: number | Decimal | string) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

interface PageProps {
  searchParams: Promise<{ search?: string; position?: string }>;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const variants = await getInventory({
    search: params.search,
    position: params.position,
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Inventory</h2>
        <span className="text-sm text-zinc-400">{variants.length} items</span>
      </div>

      {/* Search */}
      <form className="mb-4 flex gap-3">
        <input
          name="search"
          defaultValue={params.search}
          placeholder="Search size or pattern..."
          className="bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308] w-64"
        />
        <select
          name="position"
          defaultValue={params.position ?? ""}
          className="bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
        >
          <option value="">All positions</option>
          <option value="AP">AP</option>
          <option value="DIFF">DIFF</option>
          <option value="STEERING">STEERING</option>
          <option value="NONE">NONE</option>
        </select>
        <button
          type="submit"
          className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          Filter
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-zinc-400 text-left">
              <th className="pb-3 pr-4">Size</th>
              <th className="pb-3 pr-4">Brand</th>
              <th className="pb-3 pr-4">Pos</th>
              <th className="pb-3 pr-4">Sub</th>
              <th className="pb-3 pr-4">Pattern</th>
              <th className="pb-3 pr-4 text-right">Qty</th>
              <th className="pb-3 pr-4 text-right">WAC</th>
              <th className="pb-3 pr-4 text-right">Ref Price</th>
              <th className="pb-3 text-right">Value@WAC</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => {
              const value = new Decimal(v.qtyOnHand).mul(
                v.wacCost.toString()
              );
              const isNegative = v.qtyOnHand < 0;
              return (
                <tr
                  key={v.id}
                  className={`border-b border-[#1C1C1C] ${
                    isNegative ? "bg-red-950/20" : "hover:bg-[#111]"
                  }`}
                >
                  <td
                    className={`py-3 pr-4 font-mono text-xs ${
                      isNegative ? "text-red-400" : "text-white"
                    }`}
                  >
                    {v.sizeCanonical}
                  </td>
                  <td className="py-3 pr-4 text-zinc-200">
                    {v.brand.name}
                  </td>
                  <td className="py-3 pr-4 text-zinc-400 text-xs">
                    {v.position}
                  </td>
                  <td className="py-3 pr-4 text-zinc-400 text-xs">
                    {v.subLabel ?? "-"}
                  </td>
                  <td className="py-3 pr-4 text-zinc-400 text-xs">
                    {v.patternCode ?? "-"}
                  </td>
                  <td
                    className={`py-3 pr-4 text-right font-semibold ${
                      isNegative ? "text-red-400" : "text-white"
                    }`}
                  >
                    {v.qtyOnHand}
                  </td>
                  <td className="py-3 pr-4 text-right text-zinc-300">
                    {fmt(v.wacCost.toString())}
                  </td>
                  <td className="py-3 pr-4 text-right text-zinc-400">
                    {v.referenceSellPrice
                      ? fmt(v.referenceSellPrice.toString())
                      : "-"}
                  </td>
                  <td className="py-3 text-right text-zinc-300">
                    {fmt(value)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {variants.length === 0 && (
          <p className="text-center text-zinc-500 py-12">No items found.</p>
        )}
      </div>
    </div>
  );
}

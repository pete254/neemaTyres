import { createSupplier } from "@/lib/actions/supplier";
import Link from "next/link";

export default function NewSupplierPage() {
  return (
    <div className="p-6 max-w-lg">
      <Link href="/suppliers" className="text-sm text-zinc-400 hover:text-white mb-4 inline-block">
        ← Suppliers
      </Link>
      <h2 className="text-2xl font-bold text-white mb-6">Add Supplier</h2>

      <form action={createSupplier} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Name <span className="text-red-400">*</span></label>
          <input
            name="name"
            required
            placeholder="Supplier name"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Phone <span className="text-zinc-500">(optional)</span></label>
          <input
            name="phone"
            type="tel"
            placeholder="+254 7XX XXX XXX"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Email <span className="text-zinc-500">(optional)</span></label>
          <input
            name="email"
            type="email"
            placeholder="supplier@example.com"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Address <span className="text-zinc-500">(optional)</span></label>
          <input
            name="address"
            placeholder="Street / Building"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Town <span className="text-zinc-500">(optional)</span></label>
            <input
              name="town"
              placeholder="Nairobi"
              className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-300 mb-1">P.O. Box <span className="text-zinc-500">(optional)</span></label>
            <input
              name="poBox"
              placeholder="P.O. Box 123"
              className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Opening Balance (KES) <span className="text-zinc-500">(optional)</span></label>
          <input
            name="openingBalance"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
          <p className="text-xs text-zinc-500 mt-1">Amount owed to this supplier before using this system</p>
        </div>

        <button
          type="submit"
          className="w-full bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded py-2.5 text-sm transition-colors mt-2"
        >
          Add Supplier
        </button>
      </form>
    </div>
  );
}

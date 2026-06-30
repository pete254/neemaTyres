import Link from "next/link";
import { createCustomer } from "@/lib/actions/customer";

export default function NewCustomerPage() {
  return (
    <div className="p-6 max-w-lg">
      <Link
        href="/customers"
        className="text-sm text-zinc-400 hover:text-white mb-4 inline-block"
      >
        &larr; Customers
      </Link>
      <h2 className="text-2xl font-bold text-white mb-6">New Customer</h2>

      <form action={createCustomer} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. John Kamau"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
          <p className="text-xs text-zinc-600 mt-1">
            Name must be unique — used as the customer identifier.
          </p>
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">
            Phone <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            name="phone"
            type="tel"
            placeholder="e.g. 0712 345 678"
            className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-lg bg-[#EAB308] text-black font-semibold text-sm hover:bg-yellow-400 transition-colors"
        >
          Create Customer
        </button>
      </form>
    </div>
  );
}

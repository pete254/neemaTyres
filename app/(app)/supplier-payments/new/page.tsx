import Link from "next/link";
import { getSuppliers, getSupplierPayments } from "@/lib/queries";
import { createSupplierPayment } from "@/lib/actions/supplierPayment";
import { SupplierFilter } from "../SupplierFilter";

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

interface PageProps {
  searchParams: Promise<{
    success?: string;
    updated?: string;
    deleted?: string;
    supplier?: string;
  }>;
}

export default async function NewSupplierPaymentPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const supplierFilter = params.supplier ?? "";
  const [suppliers, payments] = await Promise.all([
    getSuppliers(),
    getSupplierPayments(supplierFilter || undefined),
  ]);
  const paymentsTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);

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

      {params.updated === "1" && (
        <div className="mb-4 bg-green-900/30 border border-green-700 text-green-300 rounded px-4 py-2 text-sm">
          Payment updated. Supplier ledger balances were recalculated.
        </div>
      )}

      {params.deleted === "1" && (
        <div className="mb-4 bg-green-900/30 border border-green-700 text-green-300 rounded px-4 py-2 text-sm">
          Payment deleted. Supplier ledger balances were recalculated.
        </div>
      )}

      <form action={createSupplierPayment} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Supplier</label>
          <select
            name="supplierId"
            required
            defaultValue={supplierFilter}
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

      <div className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-white">Payment History</h3>
          <SupplierFilter
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
            value={supplierFilter}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A] text-zinc-400 text-left">
                <th className="pb-3 pr-4">Date</th>
                {!supplierFilter && <th className="pb-3 pr-4">Supplier</th>}
                <th className="pb-3 pr-4">Note</th>
                <th className="pb-3 pr-4">Recorded by</th>
                <th className="pb-3 pr-4 text-right">Amount</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[#1C1C1C] hover:bg-[#111]"
                >
                  <td className="py-3 pr-4 text-zinc-400">
                    {new Date(p.date).toLocaleDateString("en-KE")}
                  </td>
                  {!supplierFilter && (
                    <td className="py-3 pr-4 text-zinc-200">{p.supplier.name}</td>
                  )}
                  <td className="py-3 pr-4 text-zinc-300">{p.note || "-"}</td>
                  <td className="py-3 pr-4 text-zinc-400">{p.recordedBy.name}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-white">
                    {fmt(p.amount.toString())}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/supplier-payments/${p.id}`}
                      className="text-[#EAB308] hover:underline"
                    >
                      View / Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            {supplierFilter && payments.length > 0 && (
              <tfoot>
                <tr className="text-zinc-400">
                  <td className="pt-3 pr-4" colSpan={3}>
                    {payments.length} payment{payments.length === 1 ? "" : "s"}
                  </td>
                  <td className="pt-3 pr-4 text-right font-semibold text-[#EAB308]">
                    {fmt(paymentsTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
          {payments.length === 0 && (
            <p className="text-center text-zinc-500 py-12">
              No payments recorded.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

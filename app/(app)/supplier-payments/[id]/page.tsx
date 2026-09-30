import Link from "next/link";
import { notFound } from "next/navigation";
import { getSuppliers, getSupplierPaymentById } from "@/lib/queries";
import { editSupplierPayment } from "@/lib/actions/supplierPayment";
import { DeletePaymentButton } from "./DeletePaymentButton";

const fmt = (n: number | string) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

const inputCls =
  "w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EAB308]";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSupplierPaymentPage({ params }: PageProps) {
  const { id } = await params;
  const [payment, suppliers] = await Promise.all([
    getSupplierPaymentById(id),
    getSuppliers(),
  ]);
  if (!payment) notFound();

  const action = editSupplierPayment.bind(null, payment.id);

  return (
    <div className="p-6">
      <Link
        href={`/supplier-payments/new?supplier=${payment.supplier.id}`}
        className="text-sm text-zinc-400 hover:text-white mb-2 inline-block"
      >
        &larr; Payment history
      </Link>
      <h2 className="text-2xl font-bold text-white mb-1">Edit Supplier Payment</h2>
      <p className="text-sm text-zinc-400 mb-6">
        Recorded by {payment.recordedBy.name} on{" "}
        {new Date(payment.createdAt).toLocaleString("en-KE")}
        {" · "}
        <Link
          href={`/suppliers/${payment.supplier.id}`}
          className="text-[#EAB308] hover:underline"
        >
          {payment.supplier.name} statement
        </Link>
      </p>

      <form action={action} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Supplier</label>
          <select
            name="supplierId"
            required
            defaultValue={payment.supplier.id}
            className={inputCls}
          >
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
            defaultValue={payment.amount.toString()}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-1">Date</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={new Date(payment.date).toISOString().slice(0, 10)}
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
            defaultValue={payment.note ?? ""}
            className={inputCls}
          />
        </div>

        <p className="text-xs text-zinc-500">
          Saving updates the matching entry on the supplier&apos;s ledger and
          recalculates their balance.
        </p>

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-6 py-2.5 text-sm transition-colors"
          >
            Save Changes
          </button>
          <Link
            href={`/supplier-payments/new?supplier=${payment.supplier.id}`}
            className="border border-[#2A2A2A] text-zinc-300 hover:text-white rounded px-6 py-2.5 text-sm"
          >
            Cancel
          </Link>
        </div>
      </form>

      <div className="mt-10 pt-6 border-t border-[#2A2A2A] max-w-md">
        <DeletePaymentButton
          paymentId={payment.id}
          summary={`${fmt(payment.amount.toString())} to ${payment.supplier.name} on ${new Date(payment.date).toLocaleDateString("en-KE")}`}
        />
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import Decimal from "decimal.js";
import { getCustomerProfile } from "@/lib/queries/customerProfile";
import DateRangeFilter from "./DateRangeFilter";
import ContactEditor from "./ContactEditor";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

const fmt = (n: Decimal | number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
    Number(n)
  );

export default async function CustomerProfilePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { from, to } = await searchParams;

  const fromDate = from ? new Date(from + "T00:00:00Z") : undefined;
  const toDate = to ? new Date(to + "T23:59:59Z") : undefined;

  const customer = await getCustomerProfile(id, fromDate, toDate);
  if (!customer) notFound();

  const isFiltered = !!(from || to);
  const avgSpend =
    customer.visitCount > 0
      ? customer.totalSpent.div(customer.visitCount)
      : new Decimal(0);

  return (
    <div className="p-6">
      {/* Back */}
      <Link
        href="/customers"
        className="text-sm text-zinc-400 hover:text-white mb-4 inline-block"
      >
        &larr; Customers
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{customer.name}</h2>
          {customer.phone && (
            <p className="text-sm text-zinc-400 mt-0.5">{customer.phone}</p>
          )}
          <p className="text-xs text-zinc-600 mt-1">
            Customer since{" "}
            {new Date(customer.createdAt).toLocaleDateString("en-KE", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {customer.outstandingDebt.gt(0) && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-2 text-right">
            <p className="text-xs text-red-400">Outstanding Debt</p>
            <p className="text-xl font-bold text-red-400">
              {fmt(customer.outstandingDebt)}
            </p>
            <Link
              href={`/debtors/${id}`}
              className="text-xs text-red-500 hover:text-red-300 transition-colors"
            >
              View ledger →
            </Link>
          </div>
        )}
      </div>

      {/* Contact details editor */}
      <div className="mb-6">
        <ContactEditor
          id={customer.id}
          phone={customer.phone}
          email={customer.email}
          address={customer.address}
          town={customer.town}
          poBox={customer.poBox}
        />
      </div>

      {/* Date range filter */}
      <div className="mb-6">
        <DateRangeFilter id={id} from={from ?? ""} to={to ?? ""} />
        {isFiltered && (
          <p className="text-xs text-zinc-500 mt-1">
            Showing {from ?? "start"} → {to ?? "today"}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">
            {isFiltered ? "Spent (period)" : "Total Spent"}
          </p>
          <p className="text-xl font-bold text-[#EAB308]">
            {fmt(customer.totalSpent)}
          </p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">
            {isFiltered ? "Visits (period)" : "Total Visits"}
          </p>
          <p className="text-xl font-bold text-white">{customer.visitCount}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Avg per Visit</p>
          <p className="text-xl font-bold text-white">{fmt(avgSpend)}</p>
        </div>
        <div className="bg-[#111] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-1">Outstanding Debt</p>
          <p
            className={`text-xl font-bold ${
              customer.outstandingDebt.gt(0) ? "text-red-400" : "text-green-400"
            }`}
          >
            {customer.outstandingDebt.gt(0)
              ? fmt(customer.outstandingDebt)
              : "Clear"}
          </p>
        </div>
      </div>

      {/* Transaction history */}
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Transactions{isFiltered ? " (filtered period)" : ""}
      </h3>

      {customer.sales.length === 0 ? (
        <p className="text-zinc-500 text-sm py-6 text-center">
          No transactions{isFiltered ? " in this period" : ""}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A] text-zinc-400 text-left">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Items</th>
                <th className="pb-3 pr-4 text-right">Total</th>
                <th className="pb-3">Payment</th>
              </tr>
            </thead>
            <tbody>
              {customer.sales.map((s) => (
                <tr
                  key={s.saleId}
                  className="border-b border-[#1C1C1C] hover:bg-[#111]"
                >
                  <td className="py-3 pr-4 text-zinc-400 whitespace-nowrap">
                    {new Date(s.date).toLocaleDateString("en-KE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-3 pr-4 text-zinc-200">{s.items}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-[#EAB308]">
                    {fmt(s.total)}
                  </td>
                  <td className="py-3 text-zinc-500 text-xs">{s.channels}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#2A2A2A]">
                <td colSpan={2} className="pt-3 text-xs text-zinc-500">
                  {customer.visitCount} transaction{customer.visitCount !== 1 ? "s" : ""}
                </td>
                <td className="pt-3 text-right font-bold text-[#EAB308]">
                  {fmt(customer.totalSpent)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

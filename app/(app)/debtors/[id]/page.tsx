import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Decimal from "decimal.js";

const fmt = (n: Decimal | number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n));

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerLedgerPage({ params }: PageProps) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        include: { payments: { where: { channel: "DEBT" } } },
        where: { payments: { some: { channel: "DEBT" } } },
        orderBy: { date: "asc" },
      },
      debtCollections: { orderBy: { date: "asc" } },
    },
  });

  if (!customer) notFound();

  type RawEntry = {
    id: string;
    date: Date;
    description: string;
    debit: Decimal;
    credit: Decimal;
  };

  const rawEntries: RawEntry[] = [
    ...customer.sales.map((sale) => {
      const debtAmount = sale.payments.reduce(
        (sum, p) => sum.plus(p.amount.toString()),
        new Decimal(0)
      );
      return {
        id: sale.id,
        date: sale.date,
        description: "Sale on credit",
        debit: debtAmount,
        credit: new Decimal(0),
      };
    }),
    ...customer.debtCollections.map((dc) => ({
      id: dc.id,
      date: dc.date,
      description: dc.note ? `Payment – ${dc.note}` : `Payment (${dc.channel})`,
      debit: new Decimal(0),
      credit: new Decimal(dc.amount.toString()),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = new Decimal(0);
  const entries = rawEntries.map((e) => {
    balance = balance.plus(e.debit).minus(e.credit);
    return { ...e, balance };
  });

  const outstanding = balance;

  return (
    <div className="p-6">
      <Link
        href="/debtors"
        className="text-sm text-zinc-400 hover:text-white mb-4 inline-block"
      >
        &larr; Debtors
      </Link>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">{customer.name}</h2>
        {customer.phone && (
          <p className="text-sm text-zinc-400 mt-0.5">{customer.phone}</p>
        )}
        <p
          className={`text-sm font-semibold mt-2 ${
            outstanding.gt(0) ? "text-red-400" : "text-green-400"
          }`}
        >
          Outstanding: {fmt(outstanding)}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-zinc-400 text-left">
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Description</th>
              <th className="pb-3 pr-4 text-right">Debit</th>
              <th className="pb-3 pr-4 text-right">Credit</th>
              <th className="pb-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={e.id}
                className="border-b border-[#1C1C1C] hover:bg-[#111]"
              >
                <td className="py-3 pr-4 text-zinc-400">
                  {new Date(e.date).toLocaleDateString("en-KE")}
                </td>
                <td className="py-3 pr-4 text-zinc-200">{e.description}</td>
                <td className="py-3 pr-4 text-right text-zinc-300">
                  {e.debit.gt(0) ? fmt(e.debit) : "—"}
                </td>
                <td className="py-3 pr-4 text-right text-zinc-300">
                  {e.credit.gt(0) ? fmt(e.credit) : "—"}
                </td>
                <td
                  className={`py-3 text-right font-semibold ${
                    e.balance.gt(0) ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {fmt(e.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <p className="text-center text-zinc-500 py-12">
            No debt transactions found.
          </p>
        )}
      </div>
    </div>
  );
}

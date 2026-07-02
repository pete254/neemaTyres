import { notFound } from "next/navigation";
import { getSaleById } from "@/lib/queries/saleById";
import { getShopInfo } from "@/lib/shopInfo";
import { toWords } from "@/lib/numberToWords";
import PrintButton from "@/components/PrintButton";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(n);

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sale, shop] = await Promise.all([getSaleById(id), getShopInfo()]);
  if (!sale) notFound();

  const total = Number(sale.totalAmount);
  const invoiceNo = sale.id.slice(-8).toUpperCase();

  return (
    <div className="min-h-screen bg-white text-black p-8 max-w-3xl mx-auto font-sans">
      {/* Screen-only controls */}
      <div className="print:hidden flex gap-3 mb-6">
        <PrintButton />
        <a href="/sales" className="text-sm text-gray-500 hover:text-black py-2">← Back to Sales</a>
      </div>

      <div className="print:p-0">
        {/* ── Document header ── */}
        <div className="flex justify-between items-start border-b-2 border-[#4B0082] pb-6 mb-6">
          {/* Left: shop info */}
          <div>
            {shop.name
              ? <p className="text-xl font-bold text-gray-900">{shop.name}</p>
              : <p className="text-sm text-gray-400 italic">Shop name not configured — visit /settings</p>
            }
            {shop.poBox    && <p className="text-sm text-gray-600 mt-0.5">{shop.poBox}</p>}
            {shop.address  && <p className="text-sm text-gray-600">{shop.address}</p>}
            {shop.town && (
              <p className="text-sm text-gray-600">
                {shop.town}{shop.county ? `, ${shop.county}` : ""}{shop.country ? `, ${shop.country}` : ""}
              </p>
            )}
            {shop.email && (
              <p className="text-sm text-gray-600 mt-1"><strong>Email:</strong> {shop.email}</p>
            )}
            {shop.phone && (
              <p className="text-sm text-gray-600"><strong>Phone:</strong> {shop.phone}</p>
            )}
          </div>

          {/* Right: document type + meta */}
          <div className="text-right">
            <h1 className="text-3xl font-bold text-[#4B0082] uppercase tracking-wide">Invoice</h1>
            <p className="text-sm text-gray-500 mt-2"><strong>No:</strong> {invoiceNo}</p>
            <p className="text-sm text-gray-500">
              <strong>Date:</strong>{" "}
              {new Date(sale.date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            {sale.recordedBy && (
              <p className="text-xs text-gray-400 mt-1">Recorded by: {sale.recordedBy.name}</p>
            )}
          </div>
        </div>

        {/* Bill To */}
        {sale.customer && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bill To</p>
            <p className="font-semibold text-gray-900">{sale.customer.name}</p>
            {sale.customer.address && <p className="text-sm text-gray-600">{sale.customer.address}</p>}
            {sale.customer.town    && <p className="text-sm text-gray-600">{sale.customer.town}</p>}
            {sale.customer.poBox   && <p className="text-sm text-gray-600">{sale.customer.poBox}</p>}
            {sale.customer.phone   && <p className="text-sm text-gray-600"><strong>Phone:</strong> {sale.customer.phone}</p>}
            {sale.customer.email   && <p className="text-sm text-gray-600"><strong>Email:</strong> {sale.customer.email}</p>}
          </div>
        )}

        {/* Items */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="bg-[#4B0082] text-white">
              <th className="text-left py-3 px-4 w-8">#</th>
              <th className="text-left py-3 px-4">Item</th>
              <th className="text-center py-3 px-4">Qty</th>
              <th className="text-right py-3 px-4">Rate</th>
              <th className="text-right py-3 px-4">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.lines.map((line, i) => {
              const label = `${line.variant.brand.name} ${line.variant.sizeCanonical}${line.variant.subLabel ? " " + line.variant.subLabel : ""}`;
              return (
                <tr key={line.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="py-3 px-4 text-gray-400">{i + 1}.</td>
                  <td className="py-3 px-4 text-gray-800">{label}</td>
                  <td className="py-3 px-4 text-center text-gray-700">{line.qty}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{fmt(Number(line.unitPrice))}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">{fmt(Number(line.lineTotal))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-between items-end border-t border-gray-200 pt-4 mb-6">
          <div className="text-sm text-gray-700">
            <p className="font-semibold">Total (in words):</p>
            <p className="mt-1 uppercase">{toWords(total)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total (KES)</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(total)}</p>
          </div>
        </div>

        {/* Payment summary */}
        {sale.payments.length > 0 && (
          <div className="mb-6 p-3 border border-gray-200 rounded text-sm">
            <p className="font-semibold text-gray-700 mb-1">Payment Received</p>
            {sale.payments.map((p) => (
              <p key={p.id} className="text-gray-600">{p.channel}: {fmt(Number(p.amount))}</p>
            ))}
          </div>
        )}

        {/* Terms */}
        {shop.terms.length > 0 && (
          <div className="mb-6">
            <p className="font-semibold text-[#4B0082] mb-2">Terms and Conditions</p>
            <ol className="list-decimal list-inside space-y-1">
              {shop.terms.map((t, i) => (
                <li key={i} className="text-sm text-gray-600">{t}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Footer */}
        {(shop.email || shop.phone) && (
          <p className="text-center text-sm text-gray-500 border-t border-gray-100 pt-4 mt-4">
            For any enquiry, reach out via email at{" "}
            {shop.email && <strong>{shop.email}</strong>}
            {shop.phone && <>, call on <strong>{shop.phone}</strong></>}
          </p>
        )}
      </div>
    </div>
  );
}
